// The train garage's world half (docs/brainstorms/engine-garage.md, first build; docs/plans/garage-install-moment.md,
// G2; view only): the works copy of the engine standing on the Roundhouse table once the footing wagon has coupled and
// the deck is at rest, wearing the room's fit; the longer boiler waiting on its stand when steel is home, and as a
// ghost; the jib and its two little guys; the lever post that opens it; the camera; and the install moment ("Try it":
// hold to lift, release to lower, finish to drop and clank).
// Local to this tab: nothing is sent, saved or shown to anyone else. The screen half is src/features/garage.ts; railway
// state comes in through garage-state.ts's `roomFacts` only, and where things stand through garage-geo.ts's row.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import { camConstraints, camForward, me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { reducedMotion } from '../../constants.ts';
import { clank, thump, chuff, whistle, cordPull } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import {
  BOILERS,
  MOMENT,
  SIZES,
  liftOf,
  speedMs,
  type CatId,
  type PartId,
  type Phase,
  type RoomFacts,
} from './garage-data.ts';
import { garage, type GarageSnap } from './garage-state.ts';
import { polarAt, STAND_LEGS, type GarageGeo } from './garage-geo.ts';

/** The table's centre and rail height, the post (the row's, placed by the caller), and the ground the post, jib, stand
 * and crew stand on. */
type Geo = { table: { x: number; z: number }; y: number; post: { x: number; z: number }; ground: number };
type Deps = {
  /** The bridge's yaw while the deck is at rest (no shunt on it, not turning), else null. Read every frame. */
  restYaw(): number | null;
  /** Sends `rail.install` on the fit this tab saw; false when it could not be sent. A sent install is not an
   * installed boiler: nothing drops until `accepted(true)`. */
  install(rev: number): boolean;
  /** A hold at this garage's post is inside the server's reach for the install. */
  installHere: boolean;
  /** The railway session is live (a lost connection ends a waiting install). */
  online(): boolean;
};

const rad = (d: number) => (d * Math.PI) / 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** The deck turns the copy to and from the garage's pose at this rate: a quarter turn a second. */
const DECK_RATE = Math.PI / 2;
/** The stand's legs: their height, and half their spacing along the part. */
const LEG = { h: 0.5 } as const;
/** The jib's arm swings between its park and the part at this rate (about 2 s for the swing), and keeps up with a
 * part on the hook at the faster one. */
const ARM_RATE = { swing: 1.5, follow: 9 } as const;
/** Around the copy's boxes a player counts as in the way (their body's radius and a little). */
const CLEAR = 0.55;
/** A part hanging for the server's answer rises this far over the designed hang, clear of the boiler that is on. */
const HANG_CLEAR = 0.9;
/** The install's whistle carries across the room, quiet at distance (metres; machine sounds reach 45). */
const WHISTLE_HEAR = 400;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const backOut = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const TAU = Math.PI * 2;

/** A camera per category, in the train's own frame (nose +z, centre of the 8.5 m train on the table's centre). */
const CAMS: Record<CatId, { pos: [number, number, number]; at: [number, number, number]; turns: boolean }> = {
  engine: { pos: [7.2, 2.7, 8.0], at: [-0.4, 1.1, 0.4], turns: true },
  cars: { pos: [3.6, 2.3, -5.6], at: [0, 1.0, -1.4], turns: false },
  cargo: { pos: [4.2, 2.8, -7.0], at: [0, 0.9, -2.4], turns: false },
  looks: { pos: [8.4, 2.2, 1.0], at: [0, 1.2, 0.2], turns: true },
  whistle: { pos: [2.6, 2.8, 3.6], at: [0, 2.0, 1.4], turns: true },
};

/** A phone held upright: the panel takes the top of the screen and the rail and parts the bottom, leaving a band in
 * the middle a third of the screen high, and the view is narrow. Each shot has its own portrait row: further back,
 * aimed at its subject so it sits in that band, and standing on the train's open side (the engine shot's), since a
 * landscape row pulled straight back lands in whatever stands behind the table. The whistle's is its landscape row
 * pulled back along its own line. */
const PORTRAIT: Partial<Record<CatId, (typeof CAMS)[CatId]>> = {
  engine: { pos: [13.2, 4.2, 11.2], at: [0, 2.0, 4.4], turns: true },
  cars: { pos: [11.3, 3.8, 6.4], at: [0, 1.5, -0.2], turns: false },
  cargo: { pos: [11.3, 3.8, 5.0], at: [0, 1.3, -1.6], turns: false },
  looks: { pos: [16, 5, 8.1], at: [0, 1.9, 2.3], turns: true },
};
const PORTRAIT_BACK = 1.8;
const portrait = () => typeof innerHeight === 'number' && innerHeight > innerWidth * 1.15;
function camOf(cat: CatId): (typeof CAMS)[CatId] {
  const c = CAMS[cat];
  if (!portrait()) return c;
  const own = PORTRAIT[cat];
  if (own) return own;
  const at: [number, number, number] = [c.at[0], c.at[1] + 0.6, c.at[2]];
  return {
    pos: [0, 1, 2].map((k) => at[k]! + (c.pos[k]! - c.at[k]!) * PORTRAIT_BACK) as [number, number, number],
    at,
    turns: c.turns,
  };
}

export async function createGarageView(owner: OwnedView, geo: Geo, row: GarageGeo, deps: Deps) {
  const [kit, spec, cars, carKit, look, { addStatic }] = await Promise.all([
    import('./engine-kit.ts'),
    import('./engine.ts'),
    import('./cars.ts'),
    import('./car-kit.ts'),
    import('../../place/look.ts'),
    import('../../place/land.ts'),
  ]);
  const { ENGINE_WHEELS, ENGINE_BOILER, ENGINE, ENGINE_LONG_AHEAD } = spec;
  const { TRAILER, TRAIN_OFFSETS } = cars;
  const tableTop = geo.y + 0.02;
  const centre = new THREE.Vector3(geo.table.x, tableTop, geo.table.z);

  // ---------------------------------------------------------------- the post that opens it (always there)
  const iron = new THREE.MeshStandardNodeMaterial({ color: '#3b3f45', roughness: 0.6, metalness: 0.4 });
  const brass = new THREE.MeshStandardNodeMaterial({ color: '#d9a23a', roughness: 0.45, metalness: 0.5 });
  const post = new THREE.Group();
  const postBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.2), iron);
  postBody.position.y = 0.575;
  // The knob says where the install stands: brass, orange while steel waits, green once the longer boiler is on.
  const knobMat = brass.clone();
  let knobShown = '';
  const postKnob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), knobMat);
  postKnob.position.y = 1.3;
  const postFoot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), iron);
  postFoot.position.y = 0.06;
  post.add(postBody, postKnob, postFoot);
  post.position.set(geo.post.x, geo.ground, geo.post.z);
  for (const m of [postBody, postKnob, postFoot]) m.castShadow = true;
  owner.add(post);

  // ---------------------------------------------------------------- the works copy of the engine
  const root = new THREE.Group();
  owner.add(root);
  const rig = new THREE.Group(); // turns with the table
  rig.position.copy(centre);
  rig.visible = false;
  root.add(rig);
  /** The jib and the stand: there whenever the copy is. */
  const furniture = new THREE.Group();
  furniture.visible = false;
  root.add(furniture);
  const shift = (TRAIN_OFFSETS[0]! + ENGINE.hz - TRAILER.hz) / 2; // centres engine and first car on the table
  const train = new THREE.Group();
  train.position.z = -shift;
  rig.add(train);
  const engine = new THREE.Group();
  engine.position.z = TRAIN_OFFSETS[0]!;
  train.add(engine);
  const part = (name: Parameters<typeof kit.enginePart>[0], rust = true) => kit.enginePart(name, rust);
  const shortSet = [part('engine_body'), part('engine_boiler', false), part('engine_lashing', false)];
  const longSet = [part('engine_body_long'), part('engine_boiler_long', false), part('engine_lashing_long', false)];
  const rods = part('engine_rods');
  rods.position.y = ENGINE_WHEELS.throw;
  engine.add(...shortSet, ...longSet, rods, part('engine_stool'), kit.engineDoor(1), kit.engineDoor(-1));
  for (const m of longSet) m.visible = false;
  // The drivers: iron discs with a spoke so the turn reads (the train view's are a shared batch we leave alone).
  const wheelMat = new THREE.MeshStandardNodeMaterial({ color: '#2c2e34', roughness: 0.55, metalness: 0.5 });
  const spokeMat = new THREE.MeshStandardNodeMaterial({ color: '#8d7a55', roughness: 0.5, metalness: 0.4 });
  const wheels: THREE.Group[] = [];
  const addWheel = (parent: THREE.Object3D, x: number, y: number, z: number, r: number) => {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 20).rotateZ(Math.PI / 2), wheelMat);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, r * 1.7, 0.1), spokeMat);
    spoke.position.x = Math.sign(x) * 0.02;
    g.add(disc, spoke);
    g.position.set(x, y, z);
    disc.castShadow = true;
    parent.add(g);
    return g;
  };
  for (const sx of [-0.5, 0.5])
    for (const sz of [-1, 1])
      wheels.push(addWheel(engine, sx, ENGINE_WHEELS.r + 0.15, sz * ENGINE_WHEELS.z, ENGINE_WHEELS.r));
  // The first car: the passenger flatbed and its bench, coupled behind.
  const flat = new THREE.Group();
  train.add(flat);
  const deckMat = look.paint({ color: '#9a7b55', rough: 0.8 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 3.2), deckMat);
  deck.position.y = TRAILER.top - 0.1;
  deck.castShadow = deck.receiveShadow = true;
  flat.add(deck, carKit.passengerCar(false));
  for (const sx of [-0.8, 0.8]) for (const sz of [-1, 1]) addWheel(flat, sx * 1.0, 0.37, sz * 1.1, 0.22);
  // Ghost of the longer boiler: the real nodes, translucent.
  const ghostMat = new THREE.MeshStandardNodeMaterial({
    color: '#ffc21a',
    emissive: '#ffb000',
    emissiveIntensity: 0.9,
    roughness: 0.5,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 8,
  });
  const ghost = new THREE.Group();
  for (const m of longSet) {
    const g = new THREE.Mesh(m.geometry, ghostMat);
    g.renderOrder = 2;
    ghost.add(g);
  }
  ghost.visible = false;
  engine.add(ghost);

  // ---------------------------------------------------------------- the part on its stand, the jib and the guys
  const partGroup = new THREE.Group(); // lives in the root's frame, not the rig's: the table does not turn it
  partGroup.visible = false;
  const lifted = [longSet[1]!, longSet[2]!].map((m) => {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.castShadow = true;
    partGroup.add(c);
    return c;
  });
  root.add(partGroup);
  const flashMat = new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });
  const flash = new THREE.Group();
  for (const m of lifted) flash.add(new THREE.Mesh(m.geometry, flashMat));
  flash.visible = false;
  partGroup.add(flash);

  const jibAt = polarAt(centre, row.jib);
  const stand = polarAt(centre, row.stand);
  // The part on its stand. Along the radius it lies nose to the table with its middle over the stand's; along the rim
  // (the first build's) it lies as that build laid it.
  const radial = row.standAlong === 'radius';
  const standYaw = radial ? -rad(row.stand.bearing) : rad(row.stand.bearing) + Math.PI / 2;
  /** The barrel's middle along the part's own z (its origin is the engine's): where the hook takes it. */
  const hookMid = (ENGINE_BOILER.zBack + ENGINE_BOILER.zFront + ENGINE_LONG_AHEAD) / 2;
  const partMid = radial ? hookMid : 0;
  /** Where the part's own origin (the engine's, on the rail) rests so the barrel lies on the legs. */
  const standRest = new THREE.Vector3(
    stand.x - Math.sin(standYaw) * partMid,
    geo.ground + LEG.h - (ENGINE_BOILER.y - ENGINE_BOILER.r),
    stand.z - Math.cos(standYaw) * partMid,
  );
  const trestle = new THREE.Group();
  // The trestle's own +z points at the table for a radial stand: a leg at `r` from the centre is `stand.r - r` along it.
  for (const dz of radial ? STAND_LEGS.at.map((r) => row.stand.r - r) : [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(radial ? STAND_LEGS.half * 2 : 0.4, LEG.h, 0.15), iron);
    leg.position.set(0, LEG.h / 2, dz);
    leg.castShadow = true;
    trestle.add(leg);
  }
  if (radial) {
    // A rail along each side joins the two legs, so the stand reads as a trestle when the part has left it.
    const [inner, outer] = STAND_LEGS.at.map((r) => row.stand.r - r) as [number, number];
    for (const x of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, inner - outer + 0.5), iron);
      rail.position.set(x * (STAND_LEGS.half - 0.05), LEG.h - 0.05, (inner + outer) / 2);
      rail.castShadow = true;
      trestle.add(rail);
    }
  }
  trestle.position.set(stand.x, geo.ground, stand.z);
  trestle.rotation.y = radial ? standYaw : rad(row.stand.bearing);
  furniture.add(trestle);
  const jib = new THREE.Group();
  const jibPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, row.mast, 0.24), iron);
  jibPost.position.y = row.mast / 2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, row.arm), brass); // along +z, pivoting at the post
  arm.position.set(0, row.mast - 0.1, row.arm / 2 - 0.2);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), iron);
  crank.position.set(0.3, 1.2, 0);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), iron);
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), iron);
  jib.add(jibPost, arm, crank);
  jib.position.set(jibAt.x, geo.ground, jibAt.z);
  const armPivot = new THREE.Group();
  armPivot.position.set(jibAt.x, geo.ground, jibAt.z);
  armPivot.add(arm);
  furniture.add(jib, armPivot, trolley, chain);
  jib.remove(arm);
  arm.castShadow = jibPost.castShadow = true;

  const guys = [0, 1].map((i) => {
    const g = new THREE.Group();
    const bodyM = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.17, 0.35, 4, 8),
      new THREE.MeshStandardNodeMaterial({ color: i ? '#4f8fd0' : '#e8a53a', roughness: 0.7 }),
    );
    bodyM.position.y = 0.45;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 10, 8),
      new THREE.MeshStandardNodeMaterial({ color: '#f2d3b0', roughness: 0.8 }),
    );
    head.position.y = 0.92;
    bodyM.castShadow = head.castShadow = true;
    g.add(bodyM, head);
    root.add(g);
    return g;
  });
  const guyBase = row.crew.map((p) => polarAt(centre, p));
  guys.forEach((g, i) => g.position.set(guyBase[i]!.x, geo.ground, guyBase[i]!.z));

  const bolts = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), brass);
    const z = THREE.MathUtils.lerp(ENGINE_BOILER.zBack + 0.5, ENGINE_BOILER.zFront - 0.5, i / 3);
    m.position.set(i % 2 ? 0.2 : -0.2, ENGINE_BOILER.top + 0.05, z);
    m.visible = false;
    engine.add(m);
    return m;
  });

  // ---------------------------------------------------------------- state
  let open = false,
    openT = 0, // 0..1: the camera's weight and the works copy's presence
    cat: CatId = 'engine',
    sel: PartId = 'boiler',
    phase: Phase = 'idle',
    ring = 0,
    holding = false,
    ms = 0,
    trying = false,
    tapped = 0,
    holdAt = 0,
    stopLeft = 0, // s of hit-stop left
    shake = 0,
    ghostT = 1,
    turnYaw = 0,
    showTurn = -1,
    wheelAngle = 0,
    spinRate = speedMs(BOILERS.boiler.speed),
    chuffAt = 0,
    clickAt = 0,
    answered = false,
    hit = false,
    facts: RoomFacts = {
      boilerFitted: false,
      wagonCoupled: false,
      tableBusy: false,
      steelHome: false,
      longFitted: false,
      boilerRev: 0,
    },
    skipped = false,
    // A real install (docs/plans/garage-install-moment.md, G3): `real` from the commit to its end, `waiting` while the
    // part hangs for the server's answer, `sinceCommit` the wall time the answer has taken (ms).
    real = false,
    waiting = false,
    sinceCommit = 0,
    hangUp = 0, // m the waiting part has risen over the designed hang
    // Whose moment (G4): `mine` is this tab's own hold; a moment that is not is someone's accepted install, watched in
    // the garage or in the world, with no camera or input taken. `brief` ends it after the steam.
    mine = false,
    brief = false,
    restored = false;
  /** The Longer boiler can go on for real from this post now. */
  const canInstall = () =>
    deps.installHere && facts.steelHome && !facts.longFitted && !facts.tableBusy && facts.boilerFitted;
  // The copy on the table. It stands along the bridge (`deps.restYaw`, read each frame, never assumed), nose to
  // whichever end turns the deck least to the garage's pose (the engine shot's camera on the row's bearing, the
  // engine on the screen's left). `yaw` is the rig's; the bridge is drawn at `deckYaw()`.
  let shown = false,
    snapNext = true, // the next appearance is a restore's or a first frame's: no puff, no toot
    side: 1 | -1 = 1,
    flip = 0,
    restPose = 0,
    yaw = 0,
    settled = false;
  const engineWorld = new THREE.Vector3();
  /** The camera's angle off the nose in the engine shot (its place in the train's frame, the train centred). */
  const camPhi = Math.atan2(CAMS.engine.pos[0], CAMS.engine.pos[2] - shift);
  /** The rig's yaw that puts the engine shot's camera on the row's bearing, seen from `s`'s side. */
  const camYaw = (s: number) => Math.PI - rad(row.camBearing) - s * camPhi;
  const baseYaw = () => camYaw(side);
  function pickPose(rest: number) {
    let best = Infinity;
    // One side only: the engine shot puts the engine on the screen's left, clear of the panel on the right. Seen from
    // the other side it stands under the panel (looked at in G3's capture), so only the nose is picked.
    for (const s of [1] as const)
      for (const f of [0, Math.PI]) {
        const d = Math.abs(wrap(rest + f - camYaw(s)));
        if (d < best - 1e-6) {
          best = d;
          side = s;
          flip = f;
        }
      }
    restPose = rest + flip;
  }
  // One static box per vehicle, at the rest pose: it does not turn with the table (design review, call 23), and each
  // is added only once this tab's player is clear of it, so nobody is pushed or trapped.
  const solids: { body: Body | null; key: string }[] = [
    { body: null, key: '' },
    { body: null, key: '' },
  ];
  const boxQ = new THREE.Quaternion(),
    UP = new THREE.Vector3(0, 1, 0);
  function solid() {
    const long = shown && facts.longFitted ? ENGINE_LONG_AHEAD : 0;
    const want = [
      { z: TRAIN_OFFSETS[0]! - shift + long / 2, hx: ENGINE.hx, hz: ENGINE.hz + long / 2, top: ENGINE_BOILER.top },
      { z: -shift, hx: TRAILER.hx, hz: TRAILER.hz, top: TRAILER.top + 0.1 },
    ];
    const sin = Math.sin(restPose),
      cos = Math.cos(restPose);
    const pos = me.body?.position;
    solids.forEach((s, i) => {
      const w = want[i]!;
      const key = shown ? `${restPose.toFixed(4)} ${w.hz}` : '';
      if (s.body && s.key !== key) {
        owner.removeBody(s.body);
        s.body = null;
      }
      if (!key || s.body) return;
      if (pos) {
        const dx = pos.x - centre.x,
          dz = pos.z - centre.z;
        const lx = dx * cos - dz * sin,
          lz = dx * sin + dz * cos - w.z;
        if (Math.abs(lx) < w.hx + CLEAR && Math.abs(lz) < w.hz + CLEAR && pos.y < tableTop + w.top + 1.2) return;
      }
      s.body = addStatic(
        { kind: 'box', hx: w.hx, hy: w.top / 2, hz: w.hz },
        { x: centre.x + sin * w.z, y: tableTop + w.top / 2, z: centre.z + cos * w.z },
        boxQ.setFromAxisAngle(UP, restPose).clone(),
        undefined,
        owner,
      );
      s.key = key;
    });
  }

  const soundAt = (p: { x: number; z: number }, fn: (x: number, z: number) => void) => fn(p.x, p.z);
  const seatPos = () => engine.getWorldPosition(engineWorld);
  const steam = new THREE.Color('#e9eef2'),
    spark = new THREE.Color('#ffd27a');
  const chimney = () =>
    engine.localToWorld(new THREE.Vector3(0, ENGINE_BOILER.chimney.y + (longOn() ? 0.17 : 0), ENGINE_BOILER.chimney.z));
  const longOn = () => longSet[0]!.visible;
  function steamPuff(n: number, up = 1.6) {
    const c = chimney();
    for (let i = 0; i < n; i++)
      emit({
        x: c.x,
        y: c.y,
        z: c.z,
        vx: (Math.random() - 0.5) * 0.4,
        vy: up * (0.6 + Math.random() * 0.6),
        vz: (Math.random() - 0.5) * 0.4,
        life: 1.2,
        size: 0.3,
        color: steam,
        alpha: 0.75,
        grow: [1, 2.6],
        fade: 0.6,
        shape: 'dust',
      });
  }
  function sparks(at: THREE.Vector3, n: number) {
    for (let i = 0; i < n; i++)
      emit({
        x: at.x,
        y: at.y,
        z: at.z,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 2.5,
        vz: (Math.random() - 0.5) * 3,
        life: 0.7,
        size: 0.07,
        color: spark,
        intensity: 1.8,
        alpha: 0.95,
        gravity: 6,
        shrink: 0.5,
        fade: 0.4,
        shape: 'glint',
      });
  }

  const setLong = (on: boolean) => {
    shortSet.forEach((m) => (m.visible = !on));
    longSet.forEach((m) => (m.visible = on));
  };
  /** Outside a Try it the copy wears exactly the rows: the room's boiler, bolted when it is the longer one. */
  function wearRows() {
    setLong(facts.longFitted);
    for (const b of bolts) {
      b.visible = facts.longFitted;
      b.scale.setScalar(1);
    }
  }
  /** The engine's cruise in the garage, by the room's fit. */
  const today = () => speedMs(BOILERS[facts.longFitted ? 'long' : 'boiler'].speed);
  /** The copy's first appearance on a live tick (design review, call 22): behind one steam puff, with a toot. */
  function arrive() {
    for (let i = 0; i < 26; i++) {
      const along = (Math.random() - 0.5) * 8,
        across = (Math.random() - 0.5) * 2;
      emit({
        x: centre.x + Math.sin(restPose) * along + Math.cos(restPose) * across,
        y: tableTop + 0.4 + Math.random() * 2.2,
        z: centre.z + Math.cos(restPose) * along - Math.sin(restPose) * across,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.5 + Math.random() * 0.9,
        vz: (Math.random() - 0.5) * 0.8,
        life: 1.5,
        size: 0.7,
        color: steam,
        alpha: 0.85,
        grow: [1, 2.8],
        fade: 0.6,
        shape: 'dust',
      });
    }
    whistle(centre.x, centre.z);
  }
  const seatP = new THREE.Vector3();
  function placePart(lift: number, drop = 0) {
    // From the stand, up and over, to hanging 0.6 m above the seat (`drop` lowers it the last 0.6 m).
    seatP.copy(seatPos()).setY(tableTop);
    const u = smooth(clamp01(lift));
    partGroup.position.lerpVectors(standRest, seatP, u);
    partGroup.position.y += Math.sin(u * Math.PI) * 0.9 + u * MOMENT.hang - drop * MOMENT.hang;
    partGroup.rotation.y = standYaw + wrap(yaw - standYaw) * u;
    partGroup.rotation.z = u < 1 ? Math.sin(u * 9) * 0.015 * (holding ? clamp01((lift - 0.66) * 3) : 0) : 0;
  }
  /** The arm's yaw when parked (design ruling on G2, R3): swung off the table along the row's bearing. */
  const parkYaw = Math.PI - rad(row.park);
  let armYaw = parkYaw,
    armIn = false;
  function placeJib(dt: number, snap: boolean) {
    // The hook takes the barrel at its middle, on top. The arm points at it only while a part is in sight (waiting on
    // the stand, or on the hook through an install) and for the moment's show-off; otherwise it is parked.
    const held = partGroup.visible;
    const p = held ? partGroup.position : standRest,
      at = held ? partGroup.rotation.y : standYaw;
    const hx = p.x + Math.sin(at) * hookMid,
      hz = p.z + Math.cos(at) * hookMid;
    const pointing = held || phase === 'moment' || phase === 'rest' || phase === 'undo';
    // Swinging in on a live tick is the telegraph that there is something to install: a pull on the cord and a clank.
    if (pointing && !armIn && !snap && shown && phase === 'idle') {
      cordPull(jibAt.x, jibAt.z);
      clank(jibAt.x, jibAt.z);
    }
    armIn = pointing;
    const aim = pointing ? Math.atan2(hx - jibAt.x, hz - jibAt.z) : parkYaw;
    const d = wrap(aim - armYaw),
      step = (phase === 'idle' ? ARM_RATE.swing : ARM_RATE.follow) * dt;
    armYaw = snap || reducedMotion || Math.abs(d) <= step ? aim : armYaw + Math.sign(d) * step;
    armPivot.rotation.y = armYaw;
    trolley.position.set(hx, geo.ground + row.mast - 0.3, hz);
    const top = trolley.position.y - 0.08,
      bottom = p.y + ENGINE_BOILER.top;
    chain.scale.y = Math.max(0.1, top - bottom);
    chain.position.set(hx, bottom + chain.scale.y / 2, hz);
    // The trolley and chain show once the arm is over the hook.
    trolley.visible = chain.visible = held && Math.abs(wrap(aim - armYaw)) < 0.05;
    crank.rotation.x = ring * 18;
  }

  // ---------------------------------------------------------------- the camera
  const camPos = new THREE.Vector3(),
    camAt = new THREE.Vector3(),
    fwd = new THREE.Vector3();
  const camFrame = new THREE.Matrix4();
  const constraint: (typeof camConstraints)[number] = (look, pos) => {
    if (openT <= 0) return false;
    const c = camOf(cat);
    camFrame.makeRotationY(baseYaw()).setPosition(centre.x, centre.y, centre.z);
    // The train frame of the camera: shifted so the 8.5 m train is centred as it is on the table, and mirrored to the
    // side the rest pose was picked for.
    camPos.set(c.pos[0] * side, c.pos[1], c.pos[2] - shift).applyMatrix4(camFrame);
    camAt.set(c.at[0] * side, c.at[1], c.at[2] - shift).applyMatrix4(camFrame);
    // A push-in with the hold: 8% by the end of the ring.
    const push = reducedMotion ? 0 : (holding || phase === 'holding' ? ring : 0) * 0.08;
    camPos.lerp(camAt, push);
    if (shake > 0.001 && !reducedMotion) {
      const s = shake * shake * 0.3;
      camPos.x += (Math.random() - 0.5) * s;
      camPos.y += (Math.random() - 0.5) * s;
    }
    const w = smooth(openT);
    camForward(fwd);
    pos.lerp(camPos, w);
    camAt.lerp(look.clone().addScaledVector(fwd, 8), 1 - w);
    look.copy(camAt).addScaledVector(fwd, -8);
    return true;
  };
  camConstraints.unshift(constraint);

  // ---------------------------------------------------------------- the moment
  const size = SIZES.large;
  function commit() {
    phase = 'moment';
    ms = 0;
    ring = 1;
    holding = false;
    hit = answered = false;
    skipped = false;
    trying = true;
    mine = true;
    brief = false;
    uiSound('pop');
    thump(stand.x, stand.z);
    // Where the server can judge it the hold is the install: sent now, and the part hangs until the answer.
    real = canInstall();
    waiting = real;
    sinceCommit = 0;
    hangUp = 0;
    if (real && !deps.install(facts.boilerRev)) deny();
  }
  /** No answer, a refusal or a lost connection: the part lowers to its stand and the hold can be made again at once. */
  function deny() {
    if (!real || !waiting) return;
    real = waiting = trying = false;
    phase = 'holding'; // the ring drains and the part goes back down the way it came up
    holding = false;
    ring = 1;
    uiSound('deny');
  }
  /** Someone's install was accepted and it is not this tab's running hold (G4): whatever this tab was trying is
   * dropped, the part lifts off its stand in `MOMENT.catchUp` and the same moment plays, in the garage or out in the
   * world, with nothing taken. A tab whose own install lost the race already has the part over the seat: it drops
   * from there. Only ever called from an accepted event. */
  function watch(short: boolean) {
    if (!shown) return;
    const hanging = phase === 'moment' && real && waiting;
    holding = false;
    trying = true;
    real = true;
    waiting = false;
    mine = false;
    brief = short;
    hit = answered = skipped = false;
    stopLeft = 0;
    sinceCommit = 0;
    showTurn = -1;
    ring = 0;
    setLong(false);
    for (const b of bolts) b.visible = false;
    spinRate = speedMs(BOILERS.boiler.speed);
    phase = 'moment';
    partGroup.visible = true;
    if (hanging) ms = Math.min(ms, MOMENT.quiet - 0.001);
    else {
      ms = -MOMENT.catchUp;
      hangUp = 0;
      placePart(0);
      thump(stand.x, stand.z);
    }
  }
  /** A real install's end: the rows already say fitted, so the copy just wears them. No rest, no undo. */
  function finish() {
    real = waiting = trying = mine = brief = false;
    phase = 'idle';
    ms = 0;
    ring = 0;
    ghost.visible = false;
    partGroup.visible = false;
    spinRate = today();
    wearRows();
  }
  function enterRest() {
    if (real) return finish();
    phase = 'rest';
    ms = 0;
    setLong(true);
    ghost.visible = false;
    partGroup.visible = false;
    for (const b of bolts) b.visible = true;
    bolts.forEach((b) => b.scale.setScalar(1));
    spinRate = speedMs(BOILERS.long.speed);
    ring = 0;
    showTurn = -1;
  }
  function startUndo() {
    phase = 'undo';
    ms = 0;
    trying = false;
    setLong(false);
    ghostT = 0;
    partGroup.visible = true;
    placePart(1, 0);
    spinRate = today();
    clank(stand.x, stand.z);
  }
  function stepMoment(dt: number) {
    if (stopLeft > 0) {
      stopLeft = Math.max(0, stopLeft - dt);
      return;
    }
    if (ms < 0) {
      // Someone else's install: the catch-up lift, stand to seat.
      ms = Math.min(0, ms + dt * 1000);
      placePart(1 + ms / MOMENT.catchUp);
      return;
    }
    const before = ms;
    ms += dt * 1000;
    // A real install drops only with the server's answer and with the engine back at the opening pose (a hold that
    // began with the table turned: the deck is bringing it home).
    const offPose = real && !hit && Math.abs(wrap(turnYaw)) > 0.02;
    if (waiting || offPose) {
      // The clock runs through the designed quiet and holds at its end: an answer inside 180 ms costs nothing.
      if (waiting) sinceCommit += dt * 1000;
      if (waiting && (sinceCommit >= MOMENT.answerBy || !deps.online())) return deny();
      if (ms >= MOMENT.quiet) {
        ms = MOMENT.quiet - 0.001;
        // Held, not frozen: it rises clear of the boiler that is on (hanging at the designed 0.6 m it sits in the
        // old barrel and reads as fitted) and sways slowly on the hook.
        hangUp = Math.min(HANG_CLEAR, hangUp + dt * 3);
        placePart(1, 0);
        partGroup.position.y += 0.06 + hangUp;
        if (!reducedMotion) partGroup.rotation.z = Math.sin(sinceCommit / 260) * 0.035;
        return;
      }
    }
    hangUp = Math.max(0, hangUp - dt * 9);
    const at = (t: number) => before < t && ms >= t;
    const c = ms;
    // c+0..180 hangs 6 cm up; 180..320 the drop.
    if (c < MOMENT.hit) {
      const drop = clamp01((c - MOMENT.quiet) / MOMENT.drop);
      placePart(1, drop * drop);
      partGroup.position.y += (c < MOMENT.quiet ? 0.06 * smooth(c / 120) : 0) + hangUp;
      if (at(MOMENT.quiet)) cordPull(stand.x, stand.z);
    }
    if (at(MOMENT.hit)) {
      hit = true;
      setLong(true);
      ghost.visible = false;
      partGroup.visible = false;
      flash.visible = false;
      stopLeft = reducedMotion ? 0 : size.hitStop / 1000;
      shake = size.shake;
      const p = seatPos();
      soundAt(p, clank);
      soundAt(p, thump);
      sparks(p.clone().setY(tableTop + 1.7), 14);
      dustRing(p.x, tableTop + 0.05, p.z, 10, 3.2, 0.3);
      for (const g of guys) g.userData.hop = 1;
    }
    for (let i = 0; i < 4; i++) {
      const t = MOMENT.bolts + i * MOMENT.boltEvery;
      if (at(t)) {
        bolts[i]!.visible = true;
        if (open) uiSound('count', 1);
        sparks(engine.localToWorld(bolts[i]!.position.clone()), 3);
      }
    }
    if (at(MOMENT.answer)) {
      answered = true;
      steamPuff(10, 2.2);
      const p = seatPos();
      soundAt(p, (x, z) => chuff(x, z, 1));
      spinRate = speedMs(BOILERS.long.speed);
    }
    if (brief && c >= MOMENT.briefEnd) return finish();
    if (at(MOMENT.whistle)) {
      steamPuff(14, 2.6);
      // The whistle and the table's full turn are the real install's; a Try it has neither (decided, 10 November).
      if (real) {
        const p = seatPos();
        soundAt(p, (x, z) => whistle(x, z, WHISTLE_HEAR));
        showTurn = reducedMotion ? -1 : 0;
      }
    }
    if (c >= MOMENT.rest) enterRest();
  }

  // ---------------------------------------------------------------- the frame
  let lastOpen = false;
  function update(dt: number, room: RoomFacts) {
    facts = room;
    // The copy stands from the wagon's coupling (a line-2 train row carries `wagon`), and only once the deck is at
    // rest: the coupling can land while the shunter is still backing over the table.
    const rest = deps.restYaw();
    const snapped = snapNext;
    if (!room.wagonCoupled) shown = false;
    else if (!shown && rest !== null) {
      shown = true;
      pickPose(rest);
      yaw = restPose;
      if (!snapNext) arrive();
    }
    if (shown && rest !== null && !open && openT <= 0) {
      pickPose(rest);
      if (snapNext || reducedMotion) yaw = restPose;
    }
    snapNext = false;
    if (restored) {
      // A restore, a rejoin or a refill in the middle of an install: the rows decide. Fitted, the copy wears it and
      // the garage stays open; not fitted, the part is back on its stand and the hold can be made again.
      restored = false;
      if (real) {
        // Fitted, a show-off turn already running finishes rather than snapping home.
        if (!room.longFitted) showTurn = -1;
        finish();
      }
    }
    solid();
    if (open && (!room.boilerFitted || room.tableBusy || !shown)) close();
    openT = clamp01(openT + ((open ? 1 : -1) * dt) / (open ? 0.6 : 0.4));
    rig.visible = furniture.visible = shown;
    const knob = room.longFitted ? '#58b368' : room.steelHome ? '#e8742c' : '#d9a23a';
    if (knob !== knobShown) knobMat.color.set((knobShown = knob));
    if (phase === 'idle' && !trying) {
      wearRows();
      // Steel is home and the boiler is not on: the part lies on its stand, for everyone at the table.
      partGroup.visible = shown && room.steelHome && !room.longFitted;
      if (partGroup.visible) placePart(0);
    }
    if (openT <= 0) lastOpen = false;
    else if (!lastOpen) {
      lastOpen = true;
      ghostT = 0;
    }
    if (open && phase !== 'idle' && phase !== 'holding') inputState.held = true;
    shake = Math.max(0, shake - (dt / 0.4) * 0.35);

    // The hold: the ring is the crank.
    if (phase === 'holding' || (phase === 'idle' && holding)) {
      const need = size.hold / 1000;
      if (holding) {
        if (phase === 'idle') {
          phase = 'holding';
          partGroup.visible = true;
          ghost.visible = true;
          uiSound('thunk');
        }
        ring = Math.min(1, ring + dt / need);
        clickAt -= dt;
        if (clickAt <= 0) {
          clickAt = 1 / (6 + 8 * ring);
          cordPull(stand.x, stand.z);
        }
        if (ring >= 1) commit();
      } else {
        ring = Math.max(0, ring - dt / (MOMENT.drain / 1000));
        if (ring <= 0) {
          phase = 'idle';
          // Back on its stand if it waits there (no frame without it), else gone.
          partGroup.visible = shown && room.steelHome && !room.longFitted;
          if (partGroup.visible) placePart(0);
          thump(stand.x, stand.z);
        }
      }
      if (phase === 'holding') placePart(liftOf(ring));
    }
    if (phase === 'moment') stepMoment(dt);
    else if (phase === 'rest') {
      ms += dt * 1000;
      if (ms >= MOMENT.tryRest) startUndo();
    } else if (phase === 'undo') {
      ms += dt * 1000;
      const u = clamp01(ms / MOMENT.undo);
      bolts.forEach((b, i) => (b.visible = u < (4 - i) / 5));
      if (u < 0.5) placePart(1 - u * 2);
      else placePart(0);
      if (u >= 1) {
        phase = 'idle';
        partGroup.visible = false;
        ghost.visible = sel === 'long';
      }
    }

    // The table: it turns slowly; stops with a hold; a full show-off turn after the whistle.
    // With the Longer boiler chosen and ready to install the engine stays at the opening pose, where the install is
    // in clear view left of the panel: no idle turn, and a table already turned comes home (through the hold too).
    const poised = real || (sel === 'long' && canInstall());
    const turns = open && CAMS[cat].turns && phase !== 'holding' && phase !== 'moment' && !reducedMotion && !poised;
    if (showTurn >= 0) {
      showTurn += dt / 2.2;
      turnYaw = smooth(clamp01(showTurn)) * TAU;
      if (showTurn >= 1) {
        showTurn = -1;
        turnYaw = 0;
      }
    } else if (turns) turnYaw = (turnYaw + dt * rad(6)) % TAU;
    else if (poised && open) {
      const home = wrap(turnYaw);
      turnYaw = Math.abs(home) <= DECK_RATE * dt || reducedMotion ? 0 : home - Math.sign(home) * DECK_RATE * dt;
    } else if (!CAMS[cat].turns && phase === 'idle') turnYaw -= turnYaw * Math.min(1, dt * 3);
    if (!open && showTurn < 0) turnYaw = 0;
    // The deck carries the copy to the garage's pose and back at the table's own rate; once there it follows exactly.
    // With the garage shut the show-off turn of someone's install still turns it, about its rest.
    const target = (open ? baseYaw() : restPose) + turnYaw;
    const d = wrap(target - yaw),
      step = DECK_RATE * dt;
    if ((open && settled) || (!open && showTurn >= 0) || reducedMotion || Math.abs(d) <= step) {
      yaw = target;
      settled = open;
    } else yaw += Math.sign(d) * step;
    rig.rotation.y = yaw;

    // Squash and settle after the hit.
    let sy = 1,
      sxz = 1;
    if (phase === 'moment' && hit) {
      const u = clamp01((ms - MOMENT.hit) / 330);
      const k = Math.sin(u * Math.PI * 1.6) * (1 - u);
      sy = 1 - 0.06 * Math.sin(u * Math.PI) + 0.02 * k * (u > 0.5 ? 1 : 0);
      sxz = 1 + 0.03 * Math.sin(u * Math.PI);
    }
    engine.scale.set(sxz, sy, sxz);
    engine.rotation.z =
      answered && phase === 'moment'
        ? Math.sin((ms - MOMENT.answer) / 28) * 0.026 * Math.max(0, 1 - (ms - MOMENT.answer) / 300)
        : 0;

    // Wheels and chuff at the rate of the part in view: the chosen upgrade's, or today's.
    const preview = sel === 'long' && phase === 'idle' ? speedMs(BOILERS.long.speed) : spinRate;
    const rate = phase === 'moment' || phase === 'rest' || phase === 'undo' ? spinRate : Math.max(preview, today());
    const k = answered || phase === 'rest' ? Math.min(1, (phase === 'moment' ? ms - MOMENT.answer : 600) / 600) : 1;
    // Through a moment the wheels run up from the standard boiler's rate (the rows may already say fitted).
    const spin =
      phase === 'moment'
        ? THREE.MathUtils.lerp(speedMs(BOILERS.boiler.speed), rate, answered ? k : 0)
        : THREE.MathUtils.lerp(today(), rate, 1);
    // The wheels run only in the garage: closed, the copy stands still on the bridge rails.
    wheelAngle += dt * spin * 0.12 * (openT > 0 || phase === 'moment' ? 1 : 0);
    for (const w of wheels) w.rotation.x = wheelAngle;
    rods.position.y = ENGINE_WHEELS.throw * Math.cos(wheelAngle);
    rods.position.z = ENGINE_WHEELS.throw * Math.sin(wheelAngle);
    chuffAt -= dt;
    if (chuffAt <= 0 && phase !== 'moment') {
      chuffAt = 1 / (spin * 0.1);
      const p = seatPos();
      if (open) {
        soundAt(p, (x, z) => chuff(x, z, 0));
        steamPuff(2, 1.2);
      }
    }
    // The ghost arrives sliding along the way the part goes on, then breathes.
    const want =
      openT > 0 &&
      sel === 'long' &&
      (!facts.longFitted || (real && !hit)) &&
      // The seat's ghost stays under a part that hangs for the server's answer: it is not on yet.
      ((!trying && (phase === 'idle' || phase === 'holding' || phase === 'undo')) || (real && !hit));
    ghost.visible = want;
    if (want) {
      ghostT = Math.min(1, ghostT + dt / 0.22);
      ghost.position.y = (1 - backOut(ghostT)) * 0.4;
      ghostMat.opacity =
        (0.45 + 0.1 * Math.sin(performance.now() / 320)) *
        clamp01(ghostT * 2) *
        (phase === 'holding' ? 1 + ring * 0.4 : 1);
      const steel = !facts.boilerFitted;
      ghostMat.color.set(steel ? '#d8d0b0' : '#ffc21a');
    }
    // The guys: crouch at the press, hop at the hit, wave in the show-off.
    guys.forEach((g, i) => {
      g.visible = shown && (facts.steelHome || openT > 0);
      const target = phase === 'holding' ? 0.9 : 1;
      g.scale.y += (target - g.scale.y) * Math.min(1, dt * 14);
      const hop = (g.userData.hop as number | undefined) ?? 0;
      g.position.y = geo.ground + (hop > 0 ? Math.sin((1 - hop) * Math.PI) * 0.45 : 0);
      if (hop > 0) g.userData.hop = Math.max(0, hop - dt / 0.5);
      const toward = Math.atan2(
        partGroup.visible ? partGroup.position.x - g.position.x : centre.x - g.position.x,
        (partGroup.visible ? partGroup.position.z : centre.z) - g.position.z,
      );
      g.rotation.y = toward;
      if (i === 0 && showTurn >= 0.5) g.rotation.z = Math.sin(performance.now() / 120) * 0.2;
      else g.rotation.z = 0;
    });
    // The bolts pop in (to 1.2 and back).
    if (phase === 'moment')
      bolts.forEach((b, i) => {
        const t = ms - (MOMENT.bolts + i * MOMENT.boltEvery);
        b.scale.setScalar(t < 0 ? 0.01 : 1 + 0.2 * Math.sin(clamp01(t / 180) * Math.PI));
      });
    // The white flash is the join: 60 ms on the part only.
    flash.visible = phase === 'moment' && ms < MOMENT.hit && ms > MOMENT.hit - 40;
    placeJib(dt, snapped);
  }

  function close() {
    if (!open) return;
    open = false;
    holding = false;
    inputState.held = false;
    // Someone else's install plays on in the world when this tab leaves the garage.
    if (phase === 'moment' && real && !mine) return;
    if (phase !== 'idle') {
      phase = 'idle';
      partGroup.visible = false;
    }
    trying = real = waiting = mine = brief = false;
    wearRows();
    spinRate = today();
    ring = 0;
  }

  const api = {
    isOpen: () => open,
    open() {
      if (open || !shown || !facts.boilerFitted || facts.tableBusy) return;
      open = true;
      settled = false;
      spinRate = today();
      cat = 'engine';
      // It opens on the part you came to install when there is one.
      sel = canInstall() ? 'long' : 'boiler';
      if (sel === 'long') ghostT = 0;
      inputState.held = true;
      document.exitPointerLock?.();
    },
    close,
    snap(): GarageSnap {
      return {
        open,
        cat,
        sel,
        phase,
        ring,
        ms,
        trying,
        held: holding,
        mine,
        real,
        waiting,
        canInstall: canInstall(),
        canSkip: phase === 'moment' && mine && ms >= MOMENT.skipFrom,
        tapped,
        facts,
      };
    },
    choose(c: CatId, p?: PartId) {
      // Your own moment holds the rail; someone else's install, watched from here, does not.
      if (phase !== 'idle' && phase !== 'holding' && !(phase === 'moment' && !mine)) return;
      if (c !== cat) uiSound('tick');
      else if (p !== sel) uiSound('tick');
      cat = c;
      if (p) sel = p;
      if (p === 'long') ghostT = 0;
      holding = false;
    },
    holdStart() {
      if (!open || sel !== 'long' || facts.longFitted || trying || (phase !== 'idle' && phase !== 'holding')) return;
      holdAt = performance.now();
      holding = true;
      if (phase === 'idle') clickAt = 0;
    },
    holdEnd() {
      if (!holding) return;
      holding = false;
      if (performance.now() - holdAt < 150) tapped = performance.now();
    },
    skip() {
      if (phase !== 'moment' || ms < MOMENT.skipFrom || skipped) return;
      skipped = true;
      // The hit has happened; the numbers snap and a real install's whistle still blows.
      if (real) soundAt(seatPos(), (x, z) => whistle(x, z));
      showTurn = -1;
      enterRest();
      ms = 0;
    },
    hear() {
      soundAt(seatPos(), (x, z) => whistle(x, z));
      steamPuff(8, 2.4);
    },
  };
  garage.api = api;
  return {
    update,
    post: geo.post,
    open: api.open,
    isOpen: api.isOpen,
    /** The works copy stands on the table (the garage can open). */
    standing: () => shown,
    /** The bridge's yaw while the garage has turned the deck off its rest (open, or on its way back), else null. */
    deckYaw: () => (shown && Math.abs(wrap(yaw - restPose)) > 1e-4 ? yaw - flip : null),
    /** The server accepted `rail.install`. `mine`: this tab's own hold, so the hanging part drops and the moment
     * runs on. Anyone else's (and this tab's own, should it land after its hang gave up) just shows in the rows for
     * now: everyone else's moment is the plan's G4. Never called from a restore, a rejoin or a late join. */
    accepted(own: boolean) {
      // This tab's hold, still hanging: it drops. Anyone else's install, or this tab's own landing after its hang
      // gave up (the brief version): watched.
      if (own && mine && real && waiting) waiting = false;
      else watch(own);
    },
    /** The server refused this tab's install. */
    denied: deny,
    /** A restore, a rejoin or a refill: rows only, no effect. The copy, stand, bolts and knob snap; an install in
     * the air is settled by the rows on the next frame. The garage stays open. */
    restore() {
      restored = true;
      snapNext = true;
    },
    inspect: () => ({
      ...api.snap(),
      turnYaw,
      openT,
      chimney: chimney().toArray(),
      copy: { shown, yaw, restPose, side, solid: solids.filter((s) => s.body).length, long: longOn() },
      partOnStand: partGroup.visible && phase === 'idle',
      /** Which boilers are drawn: the lifted part (and where), the copy's short set, its long set, the ghost. */
      drawn: {
        part: partGroup.visible ? partGroup.position.toArray().map((v) => Math.round(v * 100) / 100) : null,
        short: shortSet[1]!.visible,
        long: longSet[1]!.visible,
        ghost: ghost.visible,
      },
      cam: camPos.toArray(),
    }),
    dispose() {
      const k = camConstraints.indexOf(constraint);
      if (k >= 0) camConstraints.splice(k, 1);
      if (garage.api === api) garage.api = null;
    },
  };
}
