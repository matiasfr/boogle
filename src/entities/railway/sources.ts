// The owned Local source/carry view. Only the adapter can request a transfer; poses and flights never spend material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../sim/railway-layout.ts';
import { RECOVERY_RACK } from '../../sim/railway-supply.ts';
import {
  createTreeView,
  createTreeSolids,
  createAxes,
  shedTreeCrown,
  type TreePose,
} from '../../render/place-tree-view.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { me } from '../../player/player.ts';
import { backSeam, myBundleNext } from '../../player/haul-back.ts';
import { remotes } from '../../netplay/net.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { thump } from '../../render/machine-sfx.ts';
import { PLAYER_R } from '../../constants.ts';
import { bindCargoDrop } from '../../player/cargo-drop.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { frameOf, fitOf, slotAt, shownOf, SHOWN } from '../../render/haul-bundle.ts';
import { createRecoveryRack } from './supply-view.ts';

type AvatarData = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } };
const visualFrame = (avatar: THREE.Object3D | null) => {
  const data = avatar?.userData as AvatarData | undefined;
  return data?.loadFit?.frame ?? data?.inner ?? null;
};
const inner = () => (me.avatar?.userData as AvatarData | undefined)?.inner;
const sourceIndex = new Map(RAILWAY_SOURCES.map((source, index) => [source[0], index]));

export async function createRailwaySources(adapter: RailwayAdapter, owner: OwnedView) {
  const [{ TREE_SOURCES }, { safeTreeFall }, { H, addStatic }, { flat }, pieces, { TUNE, GREAT }, sounds, look] =
    await Promise.all([
      import('../../proto/place/tree-sources.ts'),
      import('../../proto/place/tree-catalog.ts'),
      import('../../proto/place/land.ts'),
      import('../../proto/flat.ts'),
      import('../../proto/place/pieces.ts'),
      import('../../proto/place/layout.ts'),
      import('../../proto/minis/common.ts'),
      import('../../proto/place/look.ts'),
    ]);
  if (!owner.alive) throw new Error('Railway sources mounted after disposal');
  const rackAt = new THREE.Vector3(
    RECOVERY_RACK.x / 100,
    H(RECOVERY_RACK.x / 100, RECOVERY_RACK.z / 100),
    RECOVERY_RACK.z / 100,
  );
  const rack = await createRecoveryRack(owner, rackAt, (vertices, indices, position) => {
    addStatic({ kind: 'trimesh', vertices, indices }, position, undefined, undefined, owner);
  });
  const root = new THREE.Group();
  owner.root.add(root);
  const trees: TreePose[] = TREE_SOURCES.map((source) => ({
    ...source,
    work: 0,
    issued: 0,
    ceiling: source.great ? 0 : source.hardwood ? 15 : 10,
    revision: 0,
    collapsed: false,
    scuff: false,
    hitAt: 0,
    cutYaw: 0,
    strokes: 0,
    shake: 0,
    fall: -1,
    fallYaw: 0,
    at: new THREE.Vector3(source.x, source.y + 1.7, source.z),
    body: null,
    stump: null,
  }));
  const models = createTreeView(trees, root, H, flat, () => false, GREAT.strokes);
  if (look.LOOK.contact)
    for (const tree of trees)
      if (!tree.cleared)
        look.addBlob(
          tree.x,
          tree.y,
          tree.z,
          tree.size * (tree.hardwood ? 0.9 : 0.5),
          tree.size * (tree.hardwood ? 0.9 : 0.5),
          0,
          owner,
        );
  const solid = createTreeSolids(
    trees,
    H,
    (shape, position, rotation) => addStatic(shape, position, rotation, undefined, owner),
    () => me.body,
    () => false,
    (body) => owner.removeBody(body),
  );
  const { axes, picks } = createAxes(flat);
  const axe = new THREE.Group();
  axe.add(...axes);
  axes[1]!.visible = false;
  axe.position.set(0.42, 0.72, -0.2);
  axe.visible = false;
  const swing = { t: 99, target: null as TreePose | null, hit: true, full: false };
  const at = new THREE.Vector3(),
    target = new THREE.Vector3(),
    rotation = new THREE.Quaternion();
  let alive = true;
  let state = adapter.inspect();
  let harvestFlights: (() => boolean)[] = [];
  let landed = 0;
  const piles = pieces.logStackMesh(128 * RAILWAY_T1.carry, owner);
  const pileFlights: { id: number; active: () => boolean }[] = [];
  const pilePoint = new THREE.Vector3();

  function pileHeight(pile: { y?: number }) {
    if (pile.y === undefined) throw new Error('Verified playable railway pile has no height');
    return pile.y / 100;
  }

  function drawPiles() {
    for (let k = pileFlights.length - 1; k >= 0; k--) if (!pileFlights[k]!.active()) pileFlights.splice(k, 1);
    let count = 0;
    for (const pile of state.piles) {
      const inFlight = pileFlights.filter((flight) => flight.id === pile.id).length;
      at.set(pile.x / 100, pileHeight(pile), pile.z / 100);
      for (let k = 0; k < pile.n - inFlight; k++)
        pieces.setStackLog(piles, count++, pieces.stackSlot(k, 3, at, 0, pilePoint), 0);
    }
    piles.count = count;
    piles.instanceMatrix.needsUpdate = true;
    rack.setStock(state.rack);
  }

  function reconstruct() {
    state = adapter.inspect();
    harvestFlights = [];
    pileFlights.length = 0;
    swing.t = 99;
    for (const tree of trees) {
      const k = sourceIndex.get(tree.index);
      tree.work = k === undefined ? 0 : state.work[k]!;
      tree.growth = k === undefined ? 0 : state.growth[k]!;
      tree.issued = k === undefined ? 0 : RAILWAY_T1.sourceYield - state.sources[k]!;
      tree.fall = k !== undefined && state.sources[k] === 0 ? 1 : -1;
      // A stable Local pose is reconstructed, never another harvest. The same safety query serves legacy trees.
      tree.fallYaw = k === undefined ? 0 : (state.falls?.yaw[k] ?? 0);
      tree.collapsed = k === undefined ? false : (state.falls?.collapsed[k] ?? false);
      tree.shake = 0;
      models.pose(tree, 0);
      solid(tree);
    }
    drawPiles();
  }

  function start(tree: TreePose) {
    if (!me.body || !state.ready || swing.t < TUNE.swingS || tree.fall >= 0) return;
    swing.t = 0;
    swing.target = tree;
    swing.hit = false;
    swing.full = false;
    me.yaw = Math.atan2(-(tree.x - me.body.position.x), -(tree.z - me.body.position.z));
    const body = inner();
    if (body) body.rotation.x = 0.28;
  }

  function bundleOrigin(pid: string, count: number, out: THREE.Vector3) {
    if (pid === state.pid) return myBundleNext(count, out, rotation);
    const remote = [...remotes.values()].find((peer) => peer.pid === pid);
    if (!remote?.avatar || !remote.entered) return false;
    remote.avatar.updateWorldMatrix(true, false);
    frameOf(remote.avatar).localToWorld(slotAt(Math.min(SHOWN, shownOf(count + 1)) - 1, fitOf(remote.avatar), out));
    return true;
  }

  function accepted(event: RailwayAccepted) {
    if (!alive) return;
    const before = state;
    state = adapter.inspect();
    if (event.op === 'rail.drop') {
      const pile = state.piles.find(
        (pile) =>
          pile.x === event.x &&
          pile.z === event.z &&
          pile.y === event.y &&
          pile.n > (before.piles.find((old) => old.id === pile.id)?.n ?? 0),
      );
      if (!pile) return;
      const carry = state.accounts.find((account) => account.pid === event.pid)?.carry ?? 0;
      at.set(pile.x / 100, pileHeight(pile) + 0.2, pile.z / 100);
      for (let k = 0; k < event.accepted; k++) {
        if (!bundleOrigin(event.pid, carry + event.accepted - k - 1, target)) target.copy(at);
        const flight = pieces.send(
          'log',
          target,
          at,
          { dur: 0.28, apex: 0.5, land: () => sounds.knock(0.35, 0.7) },
          owner,
        );
        pileFlights.push({ id: pile.id, active: flight });
      }
      drawPiles();
      return;
    }
    if (event.op === 'rail.take' || event.op === 'rail.rackTake') {
      if (event.op === 'rail.take') {
        const pile = before.piles.find((old) => old.id === event.id);
        if (!pile) return;
        at.set(pile.x / 100, pileHeight(pile) + 0.3, pile.z / 100);
      } else at.copy(rack.logBase);
      for (let k = 0; k < event.accepted; k++) {
        const flight = pieces.send(
          'log',
          at,
          at,
          {
            dur: 0.3,
            apex: 0.9,
            aim: (to) => {
              const carry = state.accounts.find((account) => account.pid === event.pid)?.carry ?? 0;
              if (bundleOrigin(event.pid, carry, target)) to.copy(target);
            },
            land: () => sounds.pop(3, 0.4),
          },
          owner,
        );
        if (event.pid === state.pid) harvestFlights.push(flight);
      }
      drawPiles();
      return;
    }
    if (event.op !== 'rail.chop') return;
    const tree = trees[event.id],
      k = sourceIndex.get(event.id);
    if (!tree || k === undefined) return;
    tree.work = state.work[k]!;
    tree.growth = state.growth[k]!;
    tree.issued = RAILWAY_T1.sourceYield - state.sources[k]!;
    const local = event.pid === state.pid;
    const player = local
      ? me.body?.position
      : [...remotes.values()].find((peer) => peer.pid === event.pid)?.avatar?.position;
    const dx = tree.x - (player?.x ?? tree.x),
      dz = tree.z - (player?.z ?? tree.z),
      d = Math.hypot(dx, dz) || 1;
    at.set(tree.x - (dx / d) * 0.4, tree.y + 1.1, tree.z - (dz / d) * 0.4);
    tree.cutYaw = Math.atan2(-dx, -dz);
    tree.shake = 1;
    tree.hitAt = performance.now();
    if (tree.cleared) return;
    placeSound('treeBite', tree.x, tree.z);
    pieces.chips(at.x, at.y, at.z, 9);
    const body = inner();
    if (local && body) body.rotation.x = -0.5;
    for (let k = 0; k < event.accepted; k++) {
      const flight = pieces.send(
        'log',
        at,
        at,
        {
          dur: TUNE.flyS + k * 0.03,
          apex: 1.1 + k * 0.15,
          aim: (to) => {
            const count = state.accounts.find((account) => account.pid === event.pid)?.carry ?? 0;
            if (bundleOrigin(event.pid, count, target)) to.copy(target);
          },
          land: () => {
            if (local) sounds.pop(Math.min(7, landed++ % 8), 0.5);
          },
        },
        owner,
      );
      if (local) harvestFlights.push(flight);
    }
    if (state.sources[k] === 0 && tree.fall < 0) {
      tree.fallYaw = state.falls?.yaw[k] ?? 0;
      tree.collapsed = state.falls?.collapsed[k] ?? false;
      tree.fall = 0;
      if (tree.body) owner.removeBody(tree.body);
      tree.body = null;
      thump(tree.x, tree.z);
      landed = 0;
    }
    models.pose(tree, tree.hitAt);
  }

  const previous = { ...backSeam };
  const count = () => adapter.inspect().carry;
  backSeam.flyIns = false;
  backSeam.count = count;
  backSeam.remote = (peer) => {
    const pid = remotes.get(peer)?.pid;
    return adapter.inspect().accounts.find((account) => account.pid === pid)?.carry ?? 0;
  };
  backSeam.carry = () => {
    const current = adapter.inspect();
    harvestFlights = harvestFlights.filter((flight) => flight());
    return {
      logs: current.carry,
      rails: 0,
      stone: 0,
      big: null,
      capacity: RAILWAY_T1.carry,
      incoming: 0,
      reserved: current.reservations.incoming,
      flyingLogs: Math.min(current.carry, harvestFlights.length),
      attention: swing.full && swing.t < 0.55,
    };
  };
  const offAccepted = adapter.onAccepted(accepted);
  const offReset = adapter.onReset(reconstruct);
  reconstruct();
  function dropOne() {
    state = adapter.inspect();
    if (!state.ready || state.availableCarry <= 0 || !me.body) return false;
    const p = me.body.interpolatedPosition;
    let x = p.x - Math.sin(me.yaw) * 1.4,
      z = p.z - Math.cos(me.yaw) * 1.4;
    const feet = p.y - PLAYER_R,
      ground = H(x, z);
    let y = Math.abs(ground - feet) < 1.5 ? ground : feet;
    const pile = state.piles.find(
      (pile) =>
        pile.n < RAILWAY_T1.carry &&
        Math.hypot(pile.x / 100 - x, pile.z / 100 - z) < 2.2 &&
        Math.abs(pileHeight(pile) - y) < 1,
    );
    if (pile) {
      x = pile.x / 100;
      y = pileHeight(pile);
      z = pile.z / 100;
    }
    return adapter.drop(Math.round(x * 100) || 0, Math.round(y * 100) || 0, Math.round(z * 100) || 0);
  }
  const offDrop = bindCargoDrop(dropOne);

  function update(dt: number, now: number) {
    state = adapter.inspect();
    // Stages change only after a verified host event. No local clock can grow or harvest a source.
    for (const tree of trees) {
      const k = sourceIndex.get(tree.index);
      if (k === undefined || tree.growth === state.growth[k]) continue;
      tree.growth = state.growth[k]!;
      tree.work = state.work[k]!;
      tree.issued = RAILWAY_T1.sourceYield - state.sources[k]!;
      tree.fall = state.sources[k] === 0 ? 1 : -1;
      tree.fallYaw = state.falls?.yaw[k] ?? 0;
      tree.collapsed = state.falls?.collapsed[k] ?? false;
      tree.shake = 0;
      models.pose(tree, now);
      solid(tree);
    }
    const frame = visualFrame(me.avatar);
    if (frame && axe.parent !== frame) frame.add(axe);
    for (const pick of picks) pick.visible = state.awake >= 0 && !['asleep', 'waking'].includes(state.phase);
    swing.t += dt;
    const c = TUNE.contactS;
    axe.visible = swing.t < 0.9;
    axe.rotation.z = 0;
    if (swing.t < c) axe.rotation.x = 1.5 + (-1.35 - 1.5) * (swing.t / c);
    else if (swing.full && swing.t < 0.55) {
      const u = Math.sin(Math.min(1, (swing.t - c) / 0.49) * Math.PI);
      axe.rotation.x = 0.2 + u * 2.2;
      axe.rotation.z = -u * 0.9;
      const body = inner();
      if (body) body.rotation.x = u * 0.16;
    } else if (swing.t < c + 0.035) axe.rotation.x = -1.35;
    else if (swing.t < 0.3) axe.rotation.x = -1.35 + 1.55 * ((swing.t - c - 0.035) / (0.3 - c - 0.035));
    else axe.rotation.x = 0.2;
    if (!swing.hit && swing.t >= c) {
      swing.hit = true;
      if (swing.target && swing.target.fall < 0) {
        if (state.freeCarry === 0) {
          swing.full = true;
          if (me.body) placeSound('bagFull', me.body.position.x, me.body.position.z);
        } else if (me.body) {
          const tree = swing.target,
            p = me.body.position;
          const fall = safeTreeFall(tree.x, tree.z, tree.size, Math.atan2(tree.x - p.x, tree.z - p.z), false);
          adapter.chop(tree.index, fall.yaw, fall.collapsed);
        }
      }
    }
    drawPiles();
    for (const tree of trees) {
      if (tree.shake > 0) {
        tree.shake = Math.max(0, tree.shake - dt * 3.2);
        models.pose(tree, now);
      }
      if (tree.fall >= 0 && tree.fall < 0.8) {
        tree.fall += dt;
        if (tree.fall >= 0.75) {
          tree.fall = 1;
          thump(tree.x, tree.z);
          pieces.dustRing(
            tree.x + Math.sin(tree.fallYaw) * (tree.collapsed ? 0 : 5),
            tree.y + 0.2,
            tree.z + Math.cos(tree.fallYaw) * (tree.collapsed ? 0 : 5),
            16,
            3.4,
            0.6,
          );
          solid(tree);
          shedTreeCrown(tree);
        }
        models.pose(tree, now);
      }
    }
  }

  function targets(): Interactable[] {
    if (!alive || !state.ready || !me.body) return NO_TARGETS;
    const p = me.body.interpolatedPosition;
    const result: Interactable[] = trees
      .filter(
        (tree) =>
          sourceIndex.has(tree.index) &&
          !['asleep', 'waking'].includes(state.phase) &&
          !tree.cleared &&
          tree.fall < 0 &&
          Math.hypot(p.x - tree.x, p.z - tree.z) <= 3.2,
      )
      .map((tree) => ({
        id: `place-tree${tree.index}`,
        verb: 'Chop',
        at: tree.at,
        click: true,
        run: () => start(tree),
      }));
    for (const pile of state.piles) {
      if (Math.hypot(p.x - pile.x / 100, p.z - pile.z / 100) > 2.8 || Math.abs(p.y - PLAYER_R - pileHeight(pile)) > 2)
        continue;
      const point = new THREE.Vector3(pile.x / 100, pileHeight(pile) + 1.4, pile.z / 100);
      result.push(
        state.freeCarry <= 0
          ? { id: `place-pile${pile.id}`, verb: 'Pick up', at: point, blocked: 'Your back is full' }
          : {
              id: `place-pile${pile.id}`,
              verb: 'Pick up',
              at: point,
              run: () => {
                adapter.take(pile.id);
              },
            },
      );
    }
    if (state.rack > 0 && Math.hypot(p.x - rackAt.x, p.z - rackAt.z) <= 2.8)
      result.push(
        state.freeCarry <= 0
          ? { id: 'railway-recovery-rack', verb: 'Pick up', at: rack.logBase, blocked: 'Your back is full' }
          : {
              id: 'railway-recovery-rack',
              verb: 'Pick up',
              at: rack.logBase,
              run: () => {
                adapter.rackTake();
              },
            },
      );
    return result;
  }

  function dispose() {
    if (!alive) return;
    alive = false;
    offDrop();
    offAccepted();
    offReset();
    if (backSeam.count === count) Object.assign(backSeam, previous);
    axe.removeFromParent();
    axe.traverse((part) => {
      if (part instanceof THREE.Mesh) part.geometry.dispose();
    });
    models.dispose();
    root.removeFromParent();
    for (const tree of trees) {
      if (tree.body) owner.removeBody(tree.body);
      if (tree.stump) owner.removeBody(tree.stump);
    }
  }
  owner.cleanup(dispose);
  return {
    update,
    targets,
    dispose,
    bundleOrigin,
    inspect: () =>
      trees
        .filter((tree) => sourceIndex.has(tree.index))
        .map((tree) => ({
          id: tree.index,
          x: tree.x,
          y: tree.y,
          z: tree.z,
          cleared: tree.cleared,
          work: tree.work,
          remaining: 10 - tree.issued,
          falling: tree.fall,
          growth: tree.growth ?? 0,
        })),
  };
}
