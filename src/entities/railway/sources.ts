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
import { PLAYER_R, reducedMotion } from '../../constants.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { bindCargoDrop } from '../../player/cargo-drop.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { frameOf, fitOf, slotAt, shownOf, SHOWN } from '../../render/haul-bundle.ts';
import { createRecoveryRack } from './supply-view.ts';
import { createLineCargo } from './line-cargo.ts';
import { LINE1_HARDWOODS } from '../../sim/railway-line-layout.ts';

type AvatarData = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } };
const visualFrame = (avatar: THREE.Object3D | null) => {
  const data = avatar?.userData as AvatarData | undefined;
  return data?.loadFit?.frame ?? data?.inner ?? null;
};
const inner = () => (me.avatar?.userData as AvatarData | undefined)?.inner;
const sourceIndex = new Map(RAILWAY_SOURCES.map((source, index) => [source[0], index]));

export async function createRailwaySources(adapter: RailwayAdapter, owner: OwnedView) {
  const [
    { TREE_SOURCES },
    { safeTreeFall },
    { H, addStatic },
    { flat },
    pieces,
    { TUNE, GREAT },
    sounds,
    look,
    { applyFloatingChopPose, CHOP_CONTACT, CHOP_DURATION },
    { sparkleAxe },
  ] = await Promise.all([
    import('../../proto/place/tree-sources.ts'),
    import('../../proto/place/tree-catalog.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/flat.ts'),
    import('../../proto/place/pieces.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/minis/common.ts'),
    import('../../proto/place/look.ts'),
    import('../../proto/place/chop-motion.ts'),
    import('../../proto/place/axe-sparkle.ts'),
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
  let state = adapter.inspect();
  const hardwoodIndex = new Map<number, number>(LINE1_HARDWOODS.map((source, i) => [source[0], i]));
  const trees: TreePose[] = TREE_SOURCES.map((source) => ({
    ...source,
    cleared: source.hardwood ? false : source.cleared,
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
  const models = createTreeView(
    trees,
    root,
    H,
    { flat, tree: look.treeMaterial },
    () => state.beam?.state !== 'standing',
    GREAT.strokes,
  );
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
    () => state.beam?.state !== 'standing',
    (body) => owner.removeBody(body),
  );
  const axes = createAxes(flat);
  const axe = axes.root;
  axe.visible = false;
  const swing = {
    t: 99,
    target: null as TreePose | null,
    rock: null as number | null,
    hit: true,
    response: 'bite' as 'bite' | 'full' | 'rebound',
    contact: new THREE.Vector3(), // world bark/rock point the floating axe aims at
  };
  // The cut's own radius and height (place-tree-view's notch), facing whoever swings.
  function barkContact(tree: TreePose, from: { x: number; z: number }, out: THREE.Vector3) {
    const yaw = Math.atan2(from.x - tree.x, from.z - tree.z),
      r = (tree.hardwood ? 0.7 : 0.4) * tree.size;
    return out.set(tree.x + Math.sin(yaw) * r, tree.y + 1.1, tree.z + Math.cos(yaw) * r);
  }
  function rockContact(rock: THREE.Vector3, from: { x: number; z: number }, out: THREE.Vector3) {
    const dx = from.x - rock.x,
      dz = from.z - rock.z,
      d = Math.hypot(dx, dz) || 1;
    return out.set(rock.x + (dx / d) * 0.4, rock.y - 0.2, rock.z + (dz / d) * 0.4);
  }
  const at = new THREE.Vector3(),
    target = new THREE.Vector3(),
    rotation = new THREE.Quaternion();
  // A partner's accepted stroke shows their floating axe from the contact beat, in step with the chips. Local only.
  const partnerAxes = new Map<
    string,
    { axes: ReturnType<typeof createAxes>; t: number; contact: THREE.Vector3; aimed: boolean }
  >();
  function partnerSwing(event: RailwayAccepted) {
    const pid = event.pid;
    let partner = partnerAxes.get(pid);
    if (!partner) {
      partner = { axes: createAxes(flat), t: 99, contact: new THREE.Vector3(), aimed: false };
      partner.axes.root.visible = false;
      partnerAxes.set(pid, partner);
    }
    partner.t = CHOP_CONTACT;
    const from = [...remotes.values()].find((remote) => remote.pid === pid)?.avatar?.position;
    const tree =
      event.op === 'rail.chop' ? trees[event.id] : event.op === 'rail.beamChop' ? trees.find((t) => t.great) : null;
    const rock = event.op === 'rail.mine' ? cargo.rocks.find((row) => row.id === event.id) : null;
    partner.aimed = !!from && !!(tree || rock);
    if (from && tree) barkContact(tree, from, partner.contact);
    else if (from && rock) rockContact(rock.at, from, partner.contact);
  }
  function dropPartnerAxe(pid: string) {
    const partner = partnerAxes.get(pid)!;
    partner.axes.root.removeFromParent();
    partner.axes.root.traverse((part) => {
      if (part instanceof THREE.Mesh) part.geometry.dispose();
    });
    partnerAxes.delete(pid);
  }
  function updatePartnerAxes(dt: number) {
    for (const [pid, partner] of partnerAxes) {
      const peer = [...remotes.values()].find((remote) => remote.pid === pid);
      const frame = peer?.entered ? visualFrame(peer.avatar) : null;
      if (!frame) {
        dropPartnerAxe(pid);
        continue;
      }
      partner.t += dt;
      if (partner.t > CHOP_DURATION + 0.5 && !partner.axes.root.visible) continue;
      partner.axes.setTier(state.axe, state.awake >= 0 && !['asleep', 'waking'].includes(state.phase));
      const wasVisible = partner.axes.root.visible;
      applyFloatingChopPose(frame, partner.axes.root, partner.t, 'bite', frame, partner.aimed ? partner.contact : null);
      sparkleAxe(partner.axes.root, wasVisible, reducedMotion, emit, readableIntensity(), dt);
    }
  }
  let alive = true;
  let harvestFlights: (() => boolean)[] = [];
  let landed = 0;
  const cargo = await createLineCargo(adapter, owner, (id) => {
    if (swing.t < TUNE.swingS || !me.body) return;
    swing.t = 0;
    swing.target = null;
    swing.rock = id;
    swing.hit = false;
    swing.response = 'bite';
    const rock = cargo.rocks.find((row) => row.id === id)!;
    me.yaw = Math.atan2(-(rock.x - me.body.position.x), -(rock.z - me.body.position.z));
    rockContact(rock.at, me.body.position, swing.contact);
  });
  const stonePiles = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.2),
    flat('#b0ab9d'),
    128 * RAILWAY_T1.carry,
  );
  owner.add(stonePiles);
  const stoneMatrix = new THREE.Object3D();
  const piles = pieces.logStackMesh(128 * RAILWAY_T1.carry, owner);
  const pileFlights: { id: number; active: () => boolean }[] = [];
  const pilePoint = new THREE.Vector3();

  function pileHeight(pile: { y?: number }) {
    if (pile.y === undefined) throw new Error('Verified playable railway pile has no height');
    return pile.y / 100;
  }

  function drawPiles() {
    for (let k = pileFlights.length - 1; k >= 0; k--) if (!pileFlights[k]!.active()) pileFlights.splice(k, 1);
    let count = 0,
      stoneCount = 0;
    for (const pile of state.piles) {
      const inFlight = pileFlights.filter((flight) => flight.id === pile.id).length;
      at.set(pile.x / 100, pileHeight(pile), pile.z / 100);
      for (let k = 0; k < pile.n - inFlight; k++) {
        if (pile.kind === 1) {
          stoneMatrix.position.set(at.x + ((k % 3) - 1) * 0.32, at.y + 0.2 + Math.floor(k / 3) * 0.25, at.z);
          stoneMatrix.rotation.set(k, k * 2, 0);
          stoneMatrix.updateMatrix();
          stonePiles.setMatrixAt(stoneCount++, stoneMatrix.matrix);
        } else pieces.setStackLog(piles, count++, pieces.stackSlot(k, 3, at, 0, pilePoint), 0);
      }
    }
    piles.count = count;
    piles.instanceMatrix.needsUpdate = true;
    stonePiles.count = stoneCount;
    stonePiles.instanceMatrix.needsUpdate = true;
    rack.setStock(state.rack, state.stoneRack);
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
      tree.ceiling = tree.great
        ? 0
        : tree.hardwood || (k !== undefined && state.upgrades[k])
          ? 15
          : RAILWAY_T1.sourceYield;
      tree.issued = k === undefined ? 0 : tree.ceiling - state.sources[k]!;
      tree.fall = k !== undefined && state.sources[k] === 0 ? 1 : -1;
      // A stable Local pose is reconstructed, never another harvest. The same safety query serves legacy trees.
      tree.fallYaw = k === undefined ? 0 : (state.falls?.yaw[k!] ?? 0);
      tree.collapsed = k === undefined ? false : (state.falls?.collapsed[k!] ?? false);
      const h = hardwoodIndex.get(tree.index);
      if (h !== undefined) {
        tree.work = state.hardwoodWork[h] ?? 0;
        tree.issued = 15 - (state.hardwood[h] ?? 15);
        tree.fall = tree.issued >= 15 ? 1 : -1;
      }
      if (tree.great && state.beam) {
        tree.work = state.beam.work;
        tree.fall = state.beam.state === 'standing' ? -1 : 1;
      }
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
    swing.rock = null;
    swing.hit = false;
    swing.response = 'bite';
    me.yaw = Math.atan2(-(tree.x - me.body.position.x), -(tree.z - me.body.position.z));
    barkContact(tree, me.body.position, swing.contact);
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
    if (
      (event.op === 'rail.chop' || event.op === 'rail.mine' || event.op === 'rail.beamChop') &&
      event.pid !== state.pid
    )
      partnerSwing(event);
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
          event.kind === 1 ? 'stone' : 'log',
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
      const kind =
        event.op === 'rail.take' ? (before.piles.find((pile) => pile.id === event.id)?.kind ?? 0) : (event.kind ?? 0);
      if (event.op === 'rail.take') {
        const pile = before.piles.find((old) => old.id === event.id);
        if (!pile) return;
        at.set(pile.x / 100, pileHeight(pile) + 0.3, pile.z / 100);
      } else at.copy(kind === 1 ? rack.stoneAt : rack.logBase);
      for (let k = 0; k < event.accepted; k++) {
        const flight = pieces.send(
          kind === 1 ? 'stone' : 'log',
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
    if (event.op === 'rail.mine') {
      const rock = cargo.rocks.find((row) => row.id === event.id);
      if (!rock) return;
      at.copy(rock.at);
      pieces.chips(at.x, at.y, at.z, 9);
      placeSound('treeBite', rock.x, rock.z);
      for (let i = 0; i < event.accepted; i++)
        pieces.send(
          'stone',
          at,
          at,
          {
            dur: TUNE.flyS,
            apex: 1.1,
            aim: (to) => {
              if (bundleOrigin(event.pid, state.accounts.find((a) => a.pid === event.pid)?.stone ?? 0, target))
                to.copy(target);
            },
            land: () => sounds.pop(3, 0.4),
          },
          owner,
        );
      return;
    }
    if (event.op === 'rail.beamChop') {
      const tree = trees.find((t) => t.great)!;
      tree.work = state.beam?.work ?? 0;
      tree.shake = 1;
      tree.hitAt = performance.now();
      pieces.chips(tree.x, tree.y + 1, tree.z, 12);
      placeSound('treeBite', tree.x, tree.z);
      if (state.beam?.state !== 'standing' && tree.fall < 0) {
        tree.fall = 0;
        tree.fallYaw = Math.PI / 2;
      }
      models.pose(tree, tree.hitAt);
      solid(tree);
      return;
    }
    if (event.op !== 'rail.chop') return;
    const tree = trees[event.id],
      k = sourceIndex.get(event.id);
    const h = hardwoodIndex.get(event.id);
    if (!tree || (k === undefined && h === undefined)) return;
    tree.work = h === undefined ? state.work[k!]! : state.hardwoodWork[h]!;
    tree.growth = k === undefined ? 0 : state.growth[k]!;
    tree.ceiling = h !== undefined || state.upgrades[k!] ? 15 : RAILWAY_T1.sourceYield;
    tree.issued = h === undefined ? tree.ceiling - state.sources[k!]! : 15 - state.hardwood[h]!;
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
    if ((h === undefined ? state.sources[k!] === 0 : state.hardwood[h] === 0) && tree.fall < 0) {
      tree.fallYaw = state.falls?.yaw[k!] ?? 0;
      tree.collapsed = state.falls?.collapsed[k!] ?? false;
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
      stone: current.stoneCarry,
      big: current.beam?.state === 'held' && current.beam.holder === current.pid ? ('beam' as const) : null,
      capacity: RAILWAY_T1.carry,
      incoming: 0,
      reserved: current.reservations.incoming,
      flyingLogs: Math.min(current.carry, harvestFlights.length),
      attention: swing.response === 'full' && swing.t < 0.55,
    };
  };
  const offAccepted = adapter.onAccepted(accepted);
  const offReset = adapter.onReset(reconstruct);
  reconstruct();
  function dropOne() {
    state = adapter.inspect();
    if (cargo.drop()) return true;
    if (!state.ready || (state.availableCarry <= 0 && state.stoneCarry <= 0) || !me.body) return false;
    const kind = state.availableCarry > 0 ? 0 : 1;
    const p = me.body.interpolatedPosition;
    let x = p.x - Math.sin(me.yaw) * 1.4,
      z = p.z - Math.cos(me.yaw) * 1.4;
    const feet = p.y - PLAYER_R,
      ground = H(x, z);
    let y = Math.abs(ground - feet) < 1.5 ? ground : feet;
    const pile = state.piles.find(
      (pile) =>
        (pile.kind ?? 0) === kind &&
        pile.n < RAILWAY_T1.carry &&
        Math.hypot(pile.x / 100 - x, pile.z / 100 - z) < 2.2 &&
        Math.abs(pileHeight(pile) - y) < 1,
    );
    if (pile) {
      x = pile.x / 100;
      y = pileHeight(pile);
      z = pile.z / 100;
    }
    return adapter.drop(Math.round(x * 100) || 0, Math.round(y * 100) || 0, Math.round(z * 100) || 0, 1, kind);
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
      tree.ceiling = state.upgrades[k] ? 15 : RAILWAY_T1.sourceYield;
      tree.issued = tree.ceiling - state.sources[k]!;
      tree.fall = state.sources[k] === 0 ? 1 : -1;
      tree.fallYaw = state.falls?.yaw[k!] ?? 0;
      tree.collapsed = state.falls?.collapsed[k!] ?? false;
      tree.shake = 0;
      models.pose(tree, now);
      solid(tree);
    }
    cargo.update();
    axes.setTier(state.axe, state.awake >= 0 && !['asleep', 'waking'].includes(state.phase));
    const frame = visualFrame(me.avatar);
    if (frame && axe.parent !== frame) frame.add(axe);
    swing.t += dt;
    const c = TUNE.contactS;
    if (!swing.hit && swing.t >= c) {
      swing.hit = true;
      if (swing.rock !== null) {
        if (!adapter.mine(swing.rock)) swing.response = 'full';
      } else if (swing.target && swing.target.fall < 0) {
        if (swing.target.great) {
          if (!adapter.beamChop()) {
            swing.response = 'rebound';
            placeSound('treeRebound', swing.target.x, swing.target.z);
          }
        } else if (swing.target.hardwood && !state.axe) {
          swing.response = 'rebound';
          placeSound('treeRebound', swing.target.x, swing.target.z);
        } else if (state.freeCarry === 0) {
          swing.response = 'full';
          if (me.body) placeSound('bagFull', me.body.position.x, me.body.position.z);
        } else if (me.body) {
          const tree = swing.target,
            p = me.body.position;
          const fall = safeTreeFall(tree.x, tree.z, tree.size, Math.atan2(tree.x - p.x, tree.z - p.z), false);
          adapter.chop(tree.index, fall.yaw, fall.collapsed);
        }
      }
    }
    const body = inner();
    if (body) {
      const wasVisible = axe.visible;
      applyFloatingChopPose(body, axe, swing.t, swing.response, frame ?? body, swing.contact);
      sparkleAxe(axe, wasVisible, reducedMotion, emit, readableIntensity(), dt);
    }
    updatePartnerAxes(dt);
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
          (sourceIndex.has(tree.index) || hardwoodIndex.has(tree.index) || tree.great) &&
          !(state.beam?.state === 'held' && state.beam.holder === state.pid) &&
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
    if (state.stoneRack > 0 && Math.hypot(p.x - rackAt.x, p.z - rackAt.z) <= 2.8)
      result.push({
        id: 'railway-recovery-stone',
        verb: 'Pick up',
        at: rack.stoneAt,
        run: () => void adapter.rackTake(1),
        ...(state.freeCarry <= 0 ? { blocked: 'Your back is full' } : {}),
      });
    result.push(...cargo.targets());
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
    for (const pid of [...partnerAxes.keys()]) dropPartnerAxe(pid);
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
    prePhysics: cargo.prePhysics,
    targets,
    dispose,
    bundleOrigin,
    inspect: () =>
      trees
        .filter((tree) => sourceIndex.has(tree.index) || hardwoodIndex.has(tree.index) || tree.great)
        .map((tree) => ({
          id: tree.index,
          x: tree.x,
          y: tree.y,
          z: tree.z,
          cleared: tree.cleared,
          work: tree.work,
          remaining: tree.great
            ? 0
            : tree.hardwood
              ? (state.hardwood[hardwoodIndex.get(tree.index)!] ?? 15)
              : state.sources[sourceIndex.get(tree.index)!]!,
          falling: tree.fall,
          growth: tree.growth ?? 0,
        })),
  };
}
