// The owned Local source/carry view. Only the adapter can request a transfer; poses and flights never spend material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
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
import { commitPieces } from '../../render/haul-pieces.ts';
import { createRecoveryRack } from './supply-view.ts';
import { createLineCargo } from './line-cargo.ts';
import { loadOf, setDown, useGround } from './back-down.ts';
import { createGreatTreeDress } from './great-tree-view.ts';
import { LINE1_HARDWOODS } from '../../sim/railway-line-layout.ts';
import { worksPreview } from './works-flag.ts';
import {
  account as accountRow,
  beam as beamRow,
  hardwood as hardwoodRow,
  pile as pileRow,
  rail as railRow,
  tree as treeRow,
} from '../../sim/railway-rows.ts';
import { activeStation, carryMax } from '../../sim/railway-queries.ts';
import { Pile } from '../../sim/railway-components.ts';
import { railPhase } from '../../sim/railway-queries-line1.ts';
import { insideSplitRock } from './works-shape.ts';

type AvatarData = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } };
const visualFrame = (avatar: THREE.Object3D | null) => {
  const data = avatar?.userData as AvatarData | undefined;
  return data?.loadFit?.frame ?? data?.inner ?? null;
};
const inner = () => (me.avatar?.userData as AvatarData | undefined)?.inner;
const sourceIndex = new Map(RAILWAY_SOURCES.map((source, index) => [source[0], index]));
const works = worksPreview();

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
    import('../../place/tree-sources.ts'),
    import('../../place/tree-catalog.ts'),
    import('../../place/land.ts'),
    import('../../render/flat.ts'),
    import('../../place/pieces.ts'),
    import('../../place/layout.ts'),
    import('../../render/fanfare.ts'),
    import('../../place/look.ts'),
    import('./chop-motion.ts'),
    import('../../render/axe-sparkle.ts'),
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
  // ready, stalled, growth and freeCarry have no read yet (reported in M10 b): they stay on the session's inspection.
  let session = adapter.inspect();
  const world = () => adapter.read.world();
  // One tick and one phase for a whole frame (update, targets): the facade's tick is live, and railPhase is not cheap.
  let framePhase: ReturnType<typeof railPhase> | null = null;
  const beginFrame = () => (framePhase = null);
  const phase = () => (framePhase ??= railPhase(world(), adapter.read.tick(), adapter.read.tick()));
  const awakeNow = () => railRow(world()).awake >= 0 && phase() !== 'asleep' && phase() !== 'waking';
  const beamStanding = () => beamRow(world()).state === 'standing';
  const heldBeam = () => beamRow(world()).state === 'held' && beamRow(world()).holder === adapter.read.pid;
  const carriedOf = (pid: string) => accountRow(world(), pid);
  /** The piles by id, as copies (a pile's id is its entity id; rows are replaced, so none is kept). */
  type PileNow = { id: number; x: number; y: number; z: number; n: number; kind: number; age: number };
  const listPiles = () => {
    const out: PileNow[] = [];
    world().each([Pile], (id, p) => out.push({ id, x: p.x, y: p.y, z: p.z, n: p.n, kind: p.kind, age: p.age }));
    return out;
  };
  const hardwoodIndex = new Map<number, number>(LINE1_HARDWOODS.map((source, i) => [source[0], i]));
  const trees: TreePose[] = TREE_SOURCES.map((source) => ({
    ...source,
    cleared: source.hardwood ? false : source.cleared || (works && insideSplitRock(source)),
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
  // The trees a stroke can be asked of (the line's sources, its hardwoods and the great tree), in tree order.
  const choppable = trees.filter((tree) => sourceIndex.has(tree.index) || hardwoodIndex.has(tree.index) || tree.great);
  const models = createTreeView(
    trees,
    root,
    H,
    { flat, tree: look.treeMaterial },
    () => !beamStanding(),
    GREAT.strokes,
  );
  const greatTree = trees.find((tree) => tree.great);
  const dress = greatTree ? createGreatTreeDress(root, greatTree, flat) : null;
  if (dress) owner.cleanup(dress.dispose);
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
    () => !beamStanding(),
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
      partner.axes.setTier(railRow(world()).axe, awakeNow());
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
  // Like the log and rail piles: never culled. Its bounds were computed once, at the first frame with no stones, and a
  // pile then showed only while the world origin was in view (6 November playtest).
  stonePiles.frustumCulled = false;
  owner.add(stonePiles);
  // Loose rails lie flat, side by side.
  const railPiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1, 0.12, 3),
    flat('#4c5058', 0.6),
    128 * RAILWAY_T1.carry,
  );
  railPiles.castShadow = true;
  railPiles.frustumCulled = false;
  railPiles.count = 0;
  owner.add(railPiles);
  const stoneMatrix = new THREE.Object3D();
  const piles = pieces.logStackMesh(128 * RAILWAY_T1.carry, owner);
  const pileFlights: { id: number; active: () => boolean; request: number }[] = []; // request: your own predicted drop
  const pilePoint = new THREE.Vector3();

  function pileHeight(pile: { y?: number }) {
    if (pile.y === undefined) throw new Error('Verified playable railway pile has no height');
    return pile.y / 100;
  }

  // The pile batches are rewritten (and uploaded) only when what they show changed: the piles read (the adapter keeps
  // the same array while every pile is equal), a flight into a pile landing or being re-keyed, or the racks.
  const drawnPiles: number[] = []; // id, x, y, z, n, kind, age of each pile as last drawn (values, never rows)
  let drawnRack = -1,
    drawnStoneRack = -1,
    pilesDirty = true;
  /** Whether the piles differ from what was drawn, compared in place (no allocation but the visit's closure). */
  function pilesChanged() {
    let i = 0,
      changed = false;
    world().each([Pile], (id, p) => {
      const o = i++ * 7;
      if (!changed)
        changed =
          drawnPiles[o] !== id ||
          drawnPiles[o + 1] !== p.x ||
          drawnPiles[o + 2] !== p.y ||
          drawnPiles[o + 3] !== p.z ||
          drawnPiles[o + 4] !== p.n ||
          drawnPiles[o + 5] !== p.kind ||
          drawnPiles[o + 6] !== p.age;
    });
    return changed || i * 7 !== drawnPiles.length;
  }
  function drawPiles(force = true) {
    for (let k = pileFlights.length - 1; k >= 0; k--)
      if (!pileFlights[k]!.active()) {
        pileFlights.splice(k, 1);
        pilesDirty = true;
      }
    const { rack: rackLogs, stoneRack } = railRow(world());
    if (!force && !pilesDirty && !pilesChanged()) {
      if (drawnRack !== rackLogs || drawnStoneRack !== stoneRack) {
        rack.setStock(rackLogs, stoneRack);
        drawnRack = rackLogs;
        drawnStoneRack = stoneRack;
      }
      return;
    }
    pilesDirty = false;
    const now = listPiles();
    drawnPiles.length = 0;
    for (const p of now) drawnPiles.push(p.id, p.x, p.y, p.z, p.n, p.kind, p.age);
    drawnRack = rackLogs;
    drawnStoneRack = stoneRack;
    let count = 0,
      stoneCount = 0,
      railCount = 0;
    for (const pile of now) {
      if (pile.kind === 3) continue; // footings draw themselves (footing-view.ts)
      let inFlight = 0;
      for (const flight of pileFlights) if (flight.id === pile.id) inFlight++;
      at.set(pile.x / 100, pileHeight(pile), pile.z / 100);
      for (let k = 0; k < pile.n - inFlight; k++) {
        if (pile.kind === 2) {
          stoneMatrix.position.set(at.x + ((k % 4) - 1.5) * 0.22, at.y + 0.06 + Math.floor(k / 4) * 0.13, at.z);
          stoneMatrix.rotation.set(0, 0, 0);
          stoneMatrix.updateMatrix();
          railPiles.setMatrixAt(railCount++, stoneMatrix.matrix);
        } else if (pile.kind === 1) {
          stoneMatrix.position.set(at.x + ((k % 3) - 1) * 0.32, at.y + 0.2 + Math.floor(k / 3) * 0.25, at.z);
          stoneMatrix.rotation.set(k, k * 2, 0);
          stoneMatrix.updateMatrix();
          stonePiles.setMatrixAt(stoneCount++, stoneMatrix.matrix);
        } else pieces.setStackLog(piles, count++, pieces.stackSlot(k, 3, at, 0, pilePoint), 0);
      }
    }
    // commitPieces also shows the batch: logStackMesh starts hidden, so setting only `count` left every pile undrawn.
    commitPieces(piles, count);
    stonePiles.count = stoneCount;
    stonePiles.instanceMatrix.needsUpdate = true;
    railPiles.count = railCount;
    railPiles.instanceMatrix.needsUpdate = true;
    rack.setStock(rackLogs, stoneRack);
  }

  function reconstruct() {
    session = adapter.inspect();
    harvestFlights = [];
    pileFlights.length = 0;
    swing.t = 99;
    for (const tree of trees) fromState(tree);
    drawPiles();
  }
  // A tree's stable pose from the state it reads (no harvest, no effect).
  function fromState(tree: TreePose) {
    const k = sourceIndex.get(tree.index);
    const row = k === undefined ? undefined : treeRow(world(), k);
    tree.work = row ? row.work : 0;
    tree.growth = k === undefined ? 0 : session.growth[k]!;
    tree.ceiling = tree.great ? 0 : tree.hardwood || row?.big ? 15 : RAILWAY_T1.sourceYield;
    tree.issued = row ? tree.ceiling - row.left : 0;
    tree.fall = row && row.left === 0 ? 1 : -1;
    // A stable Local pose is reconstructed, never another harvest. The same safety query serves legacy trees.
    tree.fallYaw = row ? row.yaw : 0;
    tree.collapsed = row ? row.fell : false;
    const h = hardwoodIndex.get(tree.index);
    if (h !== undefined) {
      const hard = hardwoodRow(world(), h);
      tree.work = hard.work;
      tree.issued = 15 - hard.left;
      tree.fall = tree.issued >= 15 ? 1 : -1;
    }
    if (tree.great) {
      const beam = beamRow(world());
      tree.work = beam.work;
      tree.fall = beam.state === 'standing' ? -1 : 1;
    }
    tree.shake = 0;
    models.pose(tree, 0);
    solid(tree);
  }

  function start(tree: TreePose) {
    if (!me.body || !session.ready || swing.t < TUNE.swingS || tree.fall >= 0) return;
    swing.t = 0;
    swing.target = tree;
    swing.rock = null;
    swing.hit = false;
    swing.response = 'bite';
    me.yaw = Math.atan2(-(tree.x - me.body.position.x), -(tree.z - me.body.position.z));
    barkContact(tree, me.body.position, swing.contact);
  }

  function bundleOrigin(pid: string, count: number, out: THREE.Vector3) {
    if (pid === adapter.read.pid) return myBundleNext(count, out, rotation);
    const remote = [...remotes.values()].find((peer) => peer.pid === pid);
    if (!remote?.avatar || !remote.entered) return false;
    remote.avatar.updateWorldMatrix(true, false);
    frameOf(remote.avatar).localToWorld(slotAt(Math.min(SHOWN, shownOf(count + 1)) - 1, fitOf(remote.avatar), out));
    return true;
  }

  function accepted(event: RailwayAccepted) {
    if (!alive) return;
    session = adapter.inspect();
    if (
      (event.op === 'rail.chop' || event.op === 'rail.mine' || event.op === 'rail.beamChop') &&
      event.pid !== adapter.read.pid
    )
      partnerSwing(event);
    if ((event.op === 'rail.drop' || event.op === 'rail.take') && event.kind === 3) return; // footing-view.ts
    if (event.op === 'rail.drop') {
      // The event names its pile and the count right after it: a second drop in the same packet still flies.
      const pile = event.pile === undefined ? undefined : pileRow(world(), event.pile);
      if (!pile) return;
      const carry = event.carried ?? 0;
      at.set(pile.x / 100, pileHeight(pile) + 0.2, pile.z / 100);
      for (let k = 0; k < event.accepted; k++) {
        if (!bundleOrigin(event.pid, carry + event.accepted - k - 1, target)) target.copy(at);
        const flight = pieces.send(
          event.kind === 1 ? 'stone' : event.kind === 2 ? 'rail' : 'log',
          target,
          at,
          { dur: 0.28, apex: 0.5, land: () => sounds.knock(0.35, 0.7) },
          owner,
        );
        pileFlights.push({ id: event.pile!, active: flight, request: event.predicted ? event.request : -1 });
      }
      drawPiles();
      return;
    }
    if (event.op === 'rail.take' || event.op === 'rail.rackTake') {
      const kind = event.kind ?? 0;
      if (event.op === 'rail.take') {
        // The pile may be gone by the end of the packet: the event carries where it stood and what it kept.
        if (event.px === undefined || event.pz === undefined) return;
        at.set(event.px / 100, pileHeight({ y: event.py }) + 0.3, event.pz / 100);
      } else at.copy(kind === 1 ? rack.stoneAt : rack.logBase);
      // Pieces a correction already flies to this player from someone's back do not also leave the pile.
      for (let k = 0; k < event.accepted - (event.returned ?? 0); k++) {
        const flight = pieces.send(
          kind === 1 ? 'stone' : kind === 2 ? 'rail' : 'log',
          at,
          at,
          {
            dur: 0.3,
            apex: 0.9,
            aim: (to) => {
              const carry = event.carried ?? carriedOf(event.pid)?.carry ?? 0;
              if (bundleOrigin(event.pid, carry, target)) to.copy(target);
            },
            land: () => sounds.pop(3, 0.4),
          },
          owner,
        );
        if (event.pid === adapter.read.pid) harvestFlights.push(flight);
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
      for (let i = 0; i < event.accepted - (event.returned ?? 0); i++)
        pieces.send(
          'stone',
          at,
          at,
          {
            dur: TUNE.flyS,
            apex: 1.1,
            aim: (to) => {
              const stone = event.carried ?? carriedOf(event.pid)?.stone ?? 0;
              if (bundleOrigin(event.pid, stone, target)) to.copy(target);
            },
            land: () => sounds.pop(3, 0.4),
          },
          owner,
        );
      return;
    }
    if (event.op === 'rail.beamChop') {
      const tree = trees.find((t) => t.great)!;
      tree.work = beamRow(world()).work;
      tree.shake = 1;
      tree.hitAt = performance.now();
      pieces.chips(tree.x, tree.y + 1, tree.z, 12);
      placeSound('treeBite', tree.x, tree.z);
      if (!beamStanding() && tree.fall < 0) {
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
    tree.work = h === undefined ? treeRow(world(), k!).work : hardwoodRow(world(), h).work;
    tree.growth = k === undefined ? 0 : session.growth[k]!;
    tree.ceiling = h !== undefined || treeRow(world(), k!).big ? 15 : RAILWAY_T1.sourceYield;
    tree.issued = h === undefined ? tree.ceiling - treeRow(world(), k!).left : 15 - hardwoodRow(world(), h).left;
    const local = event.pid === adapter.read.pid;
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
    for (let k = 0; k < event.accepted - (event.returned ?? 0); k++) {
      const flight = pieces.send(
        'log',
        at,
        at,
        {
          dur: TUNE.flyS + k * 0.03,
          apex: 1.1 + k * 0.15,
          aim: (to) => {
            const count = event.carried ?? carriedOf(event.pid)?.carry ?? 0;
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
    if ((h === undefined ? treeRow(world(), k!).left === 0 : hardwoodRow(world(), h).left === 0) && tree.fall < 0) {
      tree.fallYaw = k === undefined ? 0 : treeRow(world(), k).yaw;
      tree.collapsed = k === undefined ? false : treeRow(world(), k).fell;
      tree.fall = 0;
      if (tree.body) owner.removeBody(tree.body);
      tree.body = null;
      thump(tree.x, tree.z);
      landed = 0;
    }
    models.pose(tree, tree.hitAt);
  }

  // A predicted action that gave pieces back (replication R1b; Local presentation): they lift off your back and arc to
  // whoever got them, or to where they really are; a pile you dropped onto shrinks while they come back to you; a
  // reversed tree eases back up with a shake. Arcs are capped: a piece farther than CORRECTION_ARC just goes.
  const CORRECTION_ARC = 6;
  const backAt = new THREE.Vector3(),
    homeAt = new THREE.Vector3();
  function corrected(c: RailwayCorrection) {
    if (!alive) return;
    session = adapter.inspect();
    const e = c.event;
    const k = 'kind' in e ? e.kind : undefined;
    if (k === 3) return; // a footing goes back by state (footing-view.ts)
    const kind = e.op === 'rail.mine' || k === 1 ? 'stone' : k === 2 ? 'rail' : 'log';
    const mine = carriedOf(adapter.read.pid);
    const held = (kind === 'stone' ? mine?.stone : kind === 'rail' ? mine?.rails : mine?.carry) ?? 0;
    let home: THREE.Vector3 | null = null;
    if (e.op === 'rail.chop') {
      const tree = trees[e.id];
      if (!tree) return;
      fromState(tree);
      tree.shake = 1;
      tree.hitAt = performance.now();
      models.pose(tree, tree.hitAt);
      home = homeAt.set(tree.x, tree.y + 1.1, tree.z);
    } else if (e.op === 'rail.mine') home = cargo.rocks.find((row) => row.id === e.id)?.at ?? null;
    else if (e.op === 'rail.rackTake') home = kind === 'stone' ? rack.stoneAt : rack.logBase;
    else if ((e.op === 'rail.take' || e.op === 'rail.drop') && e.px !== undefined && e.pz !== undefined)
      home = homeAt.set(e.px / 100, pileHeight({ y: e.py ?? 0 }) + 0.3, e.pz / 100);
    if (!home) return;
    placeSound('treeRebound', home.x, home.z);
    drawPiles();
    for (let k = 0; k < c.lost; k++) {
      if (e.op === 'rail.drop') {
        // Off the pile, back onto your back.
        if (!bundleOrigin(adapter.read.pid, held - c.lost + k, backAt) || backAt.distanceTo(home) > CORRECTION_ARC)
          continue;
        pieces.send(kind, home, backAt, { dur: 0.3, apex: 0.8, land: () => sounds.pop(3, 0.4) }, owner);
        continue;
      }
      // Off your back, to whoever got it or back where it came from.
      if (!bundleOrigin(adapter.read.pid, held + c.lost - k - 1, backAt) || backAt.distanceTo(home) > CORRECTION_ARC)
        continue;
      const winner = c.winner;
      pieces.send(
        kind,
        backAt,
        home,
        {
          dur: 0.3,
          apex: 0.8,
          aim: winner
            ? (to) => {
                const a = carriedOf(winner);
                const count = (kind === 'stone' ? a?.stone : kind === 'rail' ? a?.rails : a?.carry) ?? 0;
                if (bundleOrigin(winner, count, target)) to.copy(target);
              }
            : undefined,
          land: () => sounds.knock(0.3, 0.6),
        },
        owner,
      );
    }
  }

  const previous = { ...backSeam };
  const count = () => carriedOf(adapter.read.pid)?.carry ?? 0;
  backSeam.flyIns = false;
  backSeam.count = count;
  backSeam.remote = (peer) => {
    const pid = remotes.get(peer)?.pid;
    return (pid ? carriedOf(pid) : undefined)?.carry ?? 0;
  };
  backSeam.pack = () => railRow(world()).pack;
  backSeam.carry = () => {
    const mine = carriedOf(adapter.read.pid);
    const logs = mine?.carry ?? 0;
    harvestFlights = harvestFlights.filter((flight) => flight());
    return {
      logs,
      rails: mine?.rails ?? 0,
      stone: mine?.stone ?? 0,
      big: heldBeam() ? ('beam' as const) : null,
      capacity: carryMax(world()),
      flyingLogs: Math.min(logs, harvestFlights.length),
      attention: swing.response === 'full' && swing.t < 0.55,
    };
  };
  const offAccepted = adapter.onAccepted(accepted);
  const offCorrected = adapter.onCorrected(corrected);
  // Your drop landed in another pile than it was shown in (its server id, or a new pile for a merge): its pieces still
  // in flight count against that one.
  const offRemap = adapter.onRemap((request, id) => {
    for (const flight of pileFlights)
      if (flight.request === request) {
        flight.id = id;
        pilesDirty = true;
      }
  });
  // After a lost connection or a resync only what changed meanwhile is re-posed; swings and flights carry on.
  const offReset = adapter.onReset((soft) => {
    if (!soft) return reconstruct();
    session = adapter.inspect();
    for (const tree of trees) {
      const k = sourceIndex.get(tree.index),
        h = hardwoodIndex.get(tree.index);
      const left =
        k !== undefined ? treeRow(world(), k).left : h !== undefined ? hardwoodRow(world(), h).left : undefined;
      if (left !== undefined && tree.issued !== tree.ceiling - left) fromState(tree);
    }
    drawPiles();
  });
  reconstruct();
  function dropOne() {
    session = adapter.inspect();
    if (cargo.drop()) return true;
    const mine = carriedOf(adapter.read.pid);
    if (mine?.foot && me.body) {
      // The footing on your back comes down in front of you: the same control, the pile's kind 3.
      const p = me.body.interpolatedPosition;
      const x = p.x - Math.sin(me.yaw) * 1.6,
        z = p.z - Math.cos(me.yaw) * 1.6;
      const feet = p.y - PLAYER_R,
        ground = H(x, z);
      const y = Math.abs(ground - feet) < 1.5 ? ground : feet;
      void adapter.drop(Math.round(x * 100) || 0, Math.round(y * 100) || 0, Math.round(z * 100) || 0, 1, 3);
      return true;
    }
    // Your own pending actions are already in the predicted rows, so these are the counts themselves.
    const [carry, stone, rails] = [mine?.carry ?? 0, mine?.stone ?? 0, mine?.rails ?? 0];
    if (!session.ready || (carry <= 0 && stone <= 0 && rails <= 0) || !me.body) return false;
    const kind = carry > 0 ? 0 : stone > 0 ? 1 : 2;
    const p = me.body.interpolatedPosition;
    let x = p.x - Math.sin(me.yaw) * 1.4,
      z = p.z - Math.cos(me.yaw) * 1.4;
    const feet = p.y - PLAYER_R,
      ground = H(x, z);
    let y = Math.abs(ground - feet) < 1.5 ? ground : feet;
    const pile = listPiles().find(
      (pile) =>
        pile.kind === kind &&
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
  useGround(H);
  // Hold Drop puts the whole back down as piles by your feet (back-down.ts); a tap is dropOne's single piece.
  const offDrop = bindCargoDrop(dropOne, {
    all: () => setDown(adapter),
    more: () => {
      const s = adapter.inspect();
      return !s.foot && loadOf(s).reduce((a, b) => a + b, 0) > 1;
    },
  });

  /** A stroke the rule would not take yet answers "not yet" you can see with the sound off: the axe kicks back (the
   * rebound pose), pale grit sparks off the bark toward you with a small puff, and the trunk gives a slight shudder.
   * Nothing is sent and no notch is cut. */
  function bounceOff(tree: TreePose) {
    swing.response = 'rebound';
    placeSound('treeRebound', tree.x, tree.z);
    const p = me.body?.position;
    const yaw = p ? Math.atan2(p.x - tree.x, p.z - tree.z) : 0;
    const r = (tree.hardwood ? 0.8 : 0.42) * tree.size;
    const x = tree.x + Math.sin(yaw) * r,
      z = tree.z + Math.cos(yaw) * r,
      y = tree.y + 1.1;
    pieces.chips(x, y, z, 7, tree.y, yaw, true, 0.55);
    pieces.dustRing(x, y - 0.5, z, 5, 0.7, 0.16);
    tree.shake = 0.35;
    tree.hitAt = performance.now();
    models.pose(tree, tree.hitAt);
  }
  function update(dt: number, now: number) {
    beginFrame();
    session = adapter.inspect();
    // Stages change only after a verified host event. No local clock can grow or harvest a source.
    for (const tree of trees) {
      const k = sourceIndex.get(tree.index);
      if (k === undefined || tree.growth === session.growth[k]) continue;
      const row = treeRow(world(), k);
      tree.growth = session.growth[k]!;
      tree.work = row.work;
      tree.ceiling = row.big ? 15 : RAILWAY_T1.sourceYield;
      tree.issued = tree.ceiling - row.left;
      tree.fall = row.left === 0 ? 1 : -1;
      tree.fallYaw = row.yaw;
      tree.collapsed = row.fell;
      tree.shake = 0;
      models.pose(tree, now);
      solid(tree);
    }
    cargo.update();
    dress?.update(activeStation(world()) === 2 && beamStanding());
    axes.setTier(railRow(world()).axe, awakeNow());
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
          if (!adapter.beamChop()) bounceOff(swing.target);
        } else if (swing.target.hardwood && !railRow(world()).axe) bounceOff(swing.target);
        else if (session.freeCarry === 0) {
          swing.response = 'full';
          if (me.body) placeSound('bagFull', me.body.position.x, me.body.position.z);
        } else if (me.body) {
          const tree = swing.target,
            p = me.body.position;
          const fall = safeTreeFall(tree.x, tree.z, tree.size, Math.atan2(tree.x - p.x, tree.z - p.z), false);
          // The stroke's result plays now from the prediction; one the rule would not take yet bounces off.
          if (!adapter.chop(tree.index, fall.yaw, fall.collapsed)) bounceOff(tree);
        }
      }
    }
    const body = inner();
    if (body) {
      const wasVisible = axe.visible;
      // The stall cue (R1b): a stroke the server has not answered after a second hangs at the bite, wobbling, until
      // it does. Nothing is undone meanwhile.
      const stalled = session.stalled === 'rail.chop' || session.stalled === 'rail.mine';
      applyFloatingChopPose(body, axe, stalled ? c + 0.05 : swing.t, swing.response, frame ?? body, swing.contact);
      if (stalled && !reducedMotion) axe.rotation.z += 0.12 * Math.sin(now / 70);
      sparkleAxe(axe, wasVisible, reducedMotion, emit, readableIntensity(), dt);
    }
    updatePartnerAxes(dt);
    drawPiles(false);
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
    beginFrame();
    if (!alive || !session.ready || !me.body) return NO_TARGETS;
    const p = me.body.interpolatedPosition;
    const result: Interactable[] = [];
    const held = heldBeam();
    if (!held && phase() !== 'asleep' && phase() !== 'waking')
      for (const tree of choppable) {
        if (tree.cleared || tree.fall >= 0) continue;
        const dx = p.x - tree.x,
          dz = p.z - tree.z;
        // A box test first: few of the hundreds of trees are ever within reach.
        if (dx > 3.2 || dx < -3.2 || dz > 3.2 || dz < -3.2 || Math.hypot(dx, dz) > 3.2) continue;
        result.push({
          id: `place-tree${tree.index}`,
          verb: 'Chop',
          at: tree.at,
          click: true,
          run: () => start(tree),
        });
      }
    for (const pile of listPiles()) {
      if (pile.kind === 3) continue;
      if (Math.hypot(p.x - pile.x / 100, p.z - pile.z / 100) > 2.8 || Math.abs(p.y - PLAYER_R - pileHeight(pile)) > 2)
        continue;
      const point = new THREE.Vector3(pile.x / 100, pileHeight(pile) + 1.4, pile.z / 100);
      result.push(
        session.freeCarry <= 0
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
    if (railRow(world()).rack > 0 && Math.hypot(p.x - rackAt.x, p.z - rackAt.z) <= 2.8)
      result.push(
        session.freeCarry <= 0
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
    if (railRow(world()).stoneRack > 0 && Math.hypot(p.x - rackAt.x, p.z - rackAt.z) <= 2.8)
      result.push({
        id: 'railway-recovery-stone',
        verb: 'Pick up',
        at: rack.stoneAt,
        run: () => void adapter.rackTake(1),
        ...(session.freeCarry <= 0 ? { blocked: 'Your back is full' } : {}),
      });
    result.push(...cargo.targets());
    return result;
  }

  function dispose() {
    if (!alive) return;
    alive = false;
    offDrop();
    offAccepted();
    offCorrected();
    offRemap();
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
    lateUpdate: cargo.lateUpdate,
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
              ? hardwoodRow(world(), hardwoodIndex.get(tree.index)!).left
              : treeRow(world(), sourceIndex.get(tree.index)!).left,
          falling: tree.fall,
          growth: tree.growth ?? 0,
        })),
  };
}
