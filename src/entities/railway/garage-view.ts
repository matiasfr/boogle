// The train garage's world half (docs/brainstorms/engine-garage.md, first build, view only): the works copy of the
// engine on the Roundhouse table, the longer boiler as a ghost, the jib and its two little guys, the lever post that
// opens it, the camera, and the install moment ("Try it": hold to lift, release to lower, finish to drop and clank).
// Local to this tab: nothing is sent, saved or shown to anyone else. The screen half is src/features/garage.ts; railway
// state comes in through garage-state.ts's `roomFacts` only.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { camConstraints, camForward } from '../../player/player.ts';
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

type Geo = { table: { x: number; z: number }; y: number; post: { x: number; z: number }; ground: number };

const BEARING = { camera: 15, jib: 105, post: 60 } as const;
const rad = (d: number) => (d * Math.PI) / 180;
const polar = (c: { x: number; z: number }, bearing: number, r: number) => ({
  x: c.x + Math.sin(rad(bearing)) * r,
  z: c.z - Math.cos(rad(bearing)) * r,
});
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

export async function createGarageView(owner: OwnedView, geo: Geo) {
  const [kit, spec, cars, carKit, look] = await Promise.all([
    import('./engine-kit.ts'),
    import('./engine.ts'),
    import('./cars.ts'),
    import('./car-kit.ts'),
    import('../../place/look.ts'),
  ]);
  const { ENGINE_WHEELS, ENGINE_BOILER, ENGINE } = spec;
  const { TRAILER, TRAIN_OFFSETS } = cars;
  const tableTop = geo.y + 0.02;
  const centre = new THREE.Vector3(geo.table.x, tableTop, geo.table.z);

  // ---------------------------------------------------------------- the post that opens it (always there)
  const iron = new THREE.MeshStandardNodeMaterial({ color: '#3b3f45', roughness: 0.6, metalness: 0.4 });
  const brass = new THREE.MeshStandardNodeMaterial({ color: '#d9a23a', roughness: 0.45, metalness: 0.5 });
  const post = new THREE.Group();
  const postBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.2), iron);
  postBody.position.y = 0.575;
  const postKnob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), brass);
  postKnob.position.y = 1.3;
  const postFoot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), iron);
  postFoot.position.y = 0.06;
  post.add(postBody, postKnob, postFoot);
  post.position.set(geo.post.x, geo.ground, geo.post.z);
  for (const m of [postBody, postKnob, postFoot]) m.castShadow = true;
  owner.add(post);

  // ---------------------------------------------------------------- the works copy of the engine
  const root = new THREE.Group();
  root.visible = false;
  owner.add(root);
  const rig = new THREE.Group(); // turns with the table
  rig.position.copy(centre);
  root.add(rig);
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

  const jibAt = polar(centre, BEARING.jib, 5.6);
  const stand = polar(centre, BEARING.jib, 3.9);
  const standPos = new THREE.Vector3(stand.x, geo.ground + 0.85, stand.z);
  const trestle = new THREE.Group();
  for (const dz of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.15), iron);
    leg.position.set(0, 0.25, dz);
    leg.castShadow = true;
    trestle.add(leg);
  }
  trestle.position.set(stand.x, geo.ground, stand.z);
  trestle.rotation.y = rad(BEARING.jib);
  root.add(trestle);
  const jib = new THREE.Group();
  const jibPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.4, 0.24), iron);
  jibPost.position.y = 1.7;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 5.8), brass); // along +z, pivoting at the post
  arm.position.set(0, 3.3, 2.7);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), iron);
  crank.position.set(0.3, 1.2, 0);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), iron);
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), iron);
  jib.add(jibPost, arm, crank);
  jib.position.set(jibAt.x, geo.ground, jibAt.z);
  const armPivot = new THREE.Group();
  armPivot.position.set(jibAt.x, geo.ground, jibAt.z);
  armPivot.add(arm);
  root.add(jib, armPivot, trolley, chain);
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
  const guyBase = [polar(centre, BEARING.jib + 18, 5.2), polar(centre, BEARING.jib - 14, 4.4)];
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
    skipped = false;
  const engineWorld = new THREE.Vector3();
  const baseYaw = (() => {
    const c = CAMS.engine.pos,
      phi = Math.atan2(c[0], c[2]);
    return Math.PI - rad(BEARING.camera) - phi;
  })();
  rig.rotation.y = baseYaw;

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
  const seatP = new THREE.Vector3();
  function placePart(lift: number, drop = 0) {
    // From the stand, up and over, to hanging 0.6 m above the seat (`drop` lowers it the last 0.6 m).
    seatP.copy(seatPos()).setY(tableTop);
    const u = smooth(clamp01(lift));
    partGroup.position.lerpVectors(standPos.clone().setY(standPos.y - 0.85 + 0.25), seatP, u);
    partGroup.position.y += Math.sin(u * Math.PI) * 0.9 + u * MOMENT.hang - drop * MOMENT.hang;
    partGroup.rotation.y = THREE.MathUtils.lerp(rad(BEARING.jib) + Math.PI / 2, baseYaw + turnYaw, u);
    partGroup.rotation.z = u < 1 ? Math.sin(u * 9) * 0.015 * (holding ? clamp01((lift - 0.66) * 3) : 0) : 0;
  }
  function placeJib() {
    const p = partGroup.position;
    armPivot.rotation.y = Math.atan2(p.x - jibAt.x, p.z - jibAt.z);
    const d = Math.hypot(p.x - jibAt.x, p.z - jibAt.z);
    trolley.position.set(
      jibAt.x + Math.sin(armPivot.rotation.y) * d,
      geo.ground + 3.1,
      jibAt.z + Math.cos(armPivot.rotation.y) * d,
    );
    const top = trolley.position.y - 0.08,
      bottom = p.y + 0.95;
    chain.scale.y = Math.max(0.1, top - bottom);
    chain.position.set(trolley.position.x, bottom + chain.scale.y / 2, trolley.position.z);
    chain.visible = trolley.visible = partGroup.visible || open;
    crank.rotation.x = ring * 18;
  }

  // ---------------------------------------------------------------- the camera
  const camPos = new THREE.Vector3(),
    camAt = new THREE.Vector3(),
    fwd = new THREE.Vector3();
  const camFrame = new THREE.Matrix4();
  const constraint: (typeof camConstraints)[number] = (look, pos) => {
    if (openT <= 0) return false;
    const c = CAMS[cat];
    camFrame.makeRotationY(baseYaw).setPosition(centre.x, centre.y, centre.z);
    // The train frame of the camera: shifted so the 8.5 m train is centred as it is on the table.
    camPos.set(c.pos[0], c.pos[1], c.pos[2] - shift).applyMatrix4(camFrame);
    camAt.set(c.at[0], c.at[1], c.at[2] - shift).applyMatrix4(camFrame);
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
    uiSound('pop');
    thump(stand.x, stand.z);
  }
  function enterRest() {
    phase = 'rest';
    ms = 0;
    setLong(true);
    ghost.visible = false;
    partGroup.visible = false;
    for (const b of bolts) b.visible = true;
    bolts.forEach((b) => b.scale.setScalar(1));
    spinRate = speedMs(BOILERS.long.speed);
    ring = 0;
    rig.rotation.y = baseYaw + turnYaw;
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
    spinRate = speedMs(BOILERS.boiler.speed);
    clank(stand.x, stand.z);
  }
  function stepMoment(dt: number) {
    if (stopLeft > 0) {
      stopLeft = Math.max(0, stopLeft - dt);
      return;
    }
    const before = ms;
    ms += dt * 1000;
    const at = (t: number) => before < t && ms >= t;
    const c = ms;
    // c+0..180 hangs 6 cm up; 180..320 the drop.
    if (c < MOMENT.hit) {
      const drop = clamp01((c - MOMENT.quiet) / MOMENT.drop);
      placePart(1, drop * drop);
      partGroup.position.y += c < MOMENT.quiet ? 0.06 * smooth(c / 120) : 0;
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
        uiSound('count', 1);
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
    if (at(MOMENT.whistle)) {
      steamPuff(14, 2.6);
      const p = seatPos();
      soundAt(p, (x, z) => whistle(x, z));
      showTurn = reducedMotion ? -1 : 0;
    }
    if (c >= MOMENT.rest) enterRest();
  }

  // ---------------------------------------------------------------- the frame
  let lastOpen = false;
  function update(dt: number, room: RoomFacts) {
    facts = room;
    if (open && (!room.boilerFitted || room.tableBusy)) close();
    openT = clamp01(openT + ((open ? 1 : -1) * dt) / (open ? 0.6 : 0.4));
    root.visible = openT > 0;
    if (openT <= 0) {
      lastOpen = false;
      return;
    }
    if (!lastOpen) {
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
          partGroup.visible = false;
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
    const turns = CAMS[cat].turns && phase !== 'holding' && phase !== 'moment' && !reducedMotion;
    if (showTurn >= 0) {
      showTurn += dt / 2.2;
      turnYaw = smooth(clamp01(showTurn)) * TAU;
      if (showTurn >= 1) {
        showTurn = -1;
        turnYaw = 0;
      }
    } else if (turns) turnYaw = (turnYaw + dt * rad(6)) % TAU;
    else if (!CAMS[cat].turns && phase === 'idle') turnYaw -= turnYaw * Math.min(1, dt * 3);
    rig.rotation.y = baseYaw + turnYaw;

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
    const target = sel === 'long' && phase === 'idle' ? speedMs(BOILERS.long.speed) : spinRate;
    const rate = phase === 'moment' || phase === 'rest' || phase === 'undo' ? spinRate : target;
    const k = answered || phase === 'rest' ? Math.min(1, (phase === 'moment' ? ms - MOMENT.answer : 600) / 600) : 1;
    const shown = THREE.MathUtils.lerp(speedMs(BOILERS.boiler.speed), rate, phase === 'moment' ? k : 1);
    wheelAngle += dt * shown * 0.12;
    for (const w of wheels) w.rotation.x = wheelAngle;
    rods.position.y = ENGINE_WHEELS.throw * Math.cos(wheelAngle);
    rods.position.z = ENGINE_WHEELS.throw * Math.sin(wheelAngle);
    chuffAt -= dt;
    if (chuffAt <= 0 && phase !== 'moment') {
      chuffAt = 1 / (shown * 0.1);
      const p = seatPos();
      if (open) {
        soundAt(p, (x, z) => chuff(x, z, 0));
        steamPuff(2, 1.2);
      }
    }
    // The ghost arrives sliding along the way the part goes on, then breathes.
    const want = sel === 'long' && !trying && (phase === 'idle' || phase === 'holding' || phase === 'undo');
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
    if (phase === 'moment' && !hit && stopLeft <= 0) {
      /* the lift hangs until the drop */
    }
    // The white flash is the join: 60 ms on the part only.
    flash.visible = phase === 'moment' && ms < MOMENT.hit && ms > MOMENT.hit - 40;
    placeJib();
    if (!open && openT < 0.02) {
      setLong(false);
      trying = false;
    }
  }

  function close() {
    if (!open) return;
    open = false;
    holding = false;
    inputState.held = false;
    if (phase !== 'idle') {
      phase = 'idle';
      trying = false;
      setLong(false);
      partGroup.visible = false;
      for (const b of bolts) b.visible = false;
      spinRate = speedMs(BOILERS.boiler.speed);
    }
    ring = 0;
  }

  const api = {
    isOpen: () => open,
    open() {
      if (open || !facts.boilerFitted || facts.tableBusy) return;
      open = true;
      cat = 'engine';
      sel = 'boiler';
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
        canSkip: phase === 'moment' && ms >= MOMENT.skipFrom,
        tapped,
        facts,
      };
    },
    choose(c: CatId, p?: PartId) {
      if (phase !== 'idle' && phase !== 'holding') return;
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
      // The hit has happened; the numbers snap and the whistle still blows.
      soundAt(seatPos(), (x, z) => whistle(x, z));
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
    inspect: () => ({ ...api.snap(), turnYaw, openT, chimney: chimney().toArray() }),
    dispose() {
      const k = camConstraints.indexOf(constraint);
      if (k >= 0) camConstraints.splice(k, 1);
      if (garage.api === api) garage.api = null;
    },
  };
}
