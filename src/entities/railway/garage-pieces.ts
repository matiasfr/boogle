import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { paint } from '../../place/look.ts';
import { polarAt, STAND_LEGS, type GarageGeo } from './garage-geo.ts';
import * as kit from './engine-kit.ts';
import { ENGINE_WHEELS, ENGINE_BOILER, ENGINE, ENGINE_LONG_AHEAD } from './engine.ts';
import { TRAILER, consistOf, offsetOf } from './cars.ts';
import { passengerCar } from './car-kit.ts';

/** The table's centre and rail height, the post (the row's, placed by the caller), and the ground the post, jib, stand
 * and crew stand on. */
export type Geo = { table: { x: number; z: number }; y: number; post: { x: number; z: number }; ground: number };

const rad = (d: number) => (d * Math.PI) / 180;
const LEG = { h: 0.5 } as const;

/** The runtime meshes at both tables. The mount owns their lifetime and chooses which fittings to show. */
export function createGaragePieces(owner: OwnedView, geo: Geo, row: GarageGeo) {
  const displayConsist = consistOf({ line: -1, wagon: true, steel: true });
  const displayOffset = (role: Parameters<typeof offsetOf>[1]) => offsetOf(displayConsist, role);
  const steelOffsets = [false, true].map((wagon) => offsetOf(consistOf({ line: -1, wagon, steel: true }), 'steel'));
  /** Where Strong's kit flatbed rides behind the kit car (garage step 4). */
  const flatbedOffset = offsetOf(consistOf({ line: -1, wagon: false, steel: false, strong: true }), 'cargo');
  const tableTop = geo.y + 0.02;
  const centre = new THREE.Vector3(geo.table.x, tableTop, geo.table.z);

  // ---------------------------------------------------------------- the post that opens it (always there)
  const iron = new THREE.MeshStandardNodeMaterial({ color: '#3b3f45', roughness: 0.6, metalness: 0.4 });
  const brass = new THREE.MeshStandardNodeMaterial({ color: '#d9a23a', roughness: 0.45, metalness: 0.5 });
  const post = new THREE.Group();
  const postBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.2), iron);
  postBody.name = 'garage-post-body';
  postBody.position.y = 0.575;
  // The knob says where the install stands: brass, orange while a part waits, green once fitted.
  const knobMat = brass.clone();
  const postKnob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), knobMat);
  postKnob.position.y = 1.3;
  const postFoot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), iron);
  postFoot.name = 'garage-post-foot';
  postFoot.position.y = 0.06;
  post.add(postBody, postKnob, postFoot);
  post.position.set(geo.post.x, geo.ground, geo.post.z);
  post.rotation.y = -rad(row.turn);
  for (const m of [postBody, postKnob, postFoot]) m.castShadow = true;
  owner.add(post);

  // ---------------------------------------------------------------- the works copy of the engine
  const root = new THREE.Group();
  const rig = new THREE.Group(); // turns with the table
  rig.position.copy(centre);
  rig.visible = false;
  root.add(rig);
  /** The jib and the stand: there whenever the copy is. */
  const furniture = new THREE.Group();
  furniture.visible = false;
  root.add(furniture);
  const shift = (displayOffset('engine') + ENGINE.hz - TRAILER.hz) / 2; // centres engine and first car on the table
  const train = new THREE.Group();
  train.position.z = -shift;
  rig.add(train);
  const engine = new THREE.Group();
  engine.position.z = displayOffset('engine');
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
  const deckMat = paint({ color: '#9a7b55', rough: 0.8 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 3.2), deckMat);
  deck.position.y = TRAILER.top - 0.1;
  deck.castShadow = deck.receiveShadow = true;
  flat.add(deck, passengerCar(false));
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
  owner.cleanup(() => {
    for (const material of [iron, brass, knobMat, wheelMat, spokeMat, ghostMat]) material.dispose();
  });
  for (const m of longSet) {
    const g = new THREE.Mesh(m.geometry, ghostMat);
    g.renderOrder = 2;
    ghost.add(g);
  }
  ghost.visible = false;
  engine.add(ghost);

  // The blast pipe lowers through the existing chimney. These copies share one geometry and the garage's brass.
  const pipeGeo = new THREE.CylinderGeometry(0.19, 0.14, 0.7, 16, 1, true).translate(
    0,
    ENGINE_BOILER.chimney.y - 0.1,
    ENGINE_BOILER.chimney.z,
  );
  const pipe = new THREE.Mesh(pipeGeo, brass);
  pipe.castShadow = true;
  engine.add(pipe);
  const pipeGhost = new THREE.Mesh(pipeGeo, ghostMat);
  ghost.add(pipeGhost);

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
  const pipeStandRest = new THREE.Vector3(
    stand.x - Math.sin(standYaw) * ENGINE_BOILER.chimney.z,
    geo.ground + LEG.h - (ENGINE_BOILER.chimney.y - 0.45),
    stand.z - Math.cos(standYaw) * ENGINE_BOILER.chimney.z,
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
  const pipeStand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.8), iron);
  pipeStand.position.set(stand.x, geo.ground + LEG.h - 0.05, stand.z);
  pipeStand.rotation.y = standYaw;
  furniture.add(pipeStand);
  const jib = new THREE.Group();
  const jibPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, row.mast, 0.24), iron);
  jibPost.position.y = row.mast / 2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, row.arm), brass); // along +z, pivoting at the post
  arm.position.set(0, row.mast - 0.1, row.arm / 2 - 0.2);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), iron);
  crank.name = 'jib-crank';
  crank.position.set(0.3, 1.2, 0);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), iron);
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), iron);
  jib.add(jibPost, arm, crank);
  jib.position.set(jibAt.x, geo.ground, jibAt.z);
  jib.rotation.y = post.rotation.y;
  const armPivot = new THREE.Group();
  armPivot.position.set(jibAt.x, geo.ground, jibAt.z);
  armPivot.add(arm);
  furniture.add(jib, armPivot, trolley, chain);
  jib.remove(arm);
  arm.castShadow = jibPost.castShadow = true;

  const bolts = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), brass);
    const z = THREE.MathUtils.lerp(ENGINE_BOILER.zBack + 0.5, ENGINE_BOILER.zFront - 0.5, i / 3);
    m.position.set(i % 2 ? 0.2 : -0.2, ENGINE_BOILER.top + 0.05, z);
    m.visible = false;
    engine.add(m);
    return m;
  });

  const setLong = (on: boolean) => {
    shortSet.forEach((m) => (m.visible = !on));
    longSet.forEach((m) => (m.visible = on));
  };
  owner.add(root);
  return {
    displayOffset,
    steelOffsets,
    flatbedOffset,
    tableTop,
    centre,
    brass,
    knobMat,
    root,
    rig,
    furniture,
    shift,
    train,
    engine,
    shortSet,
    longSet,
    rods,
    wheels,
    ghostMat,
    ghost,
    pipeGeo,
    pipe,
    pipeGhost,
    jibAt,
    standYaw,
    hookMid,
    standRest,
    pipeStandRest,
    pipeStand,
    crank,
    trolley,
    chain,
    armPivot,
    bolts,
    stand,
    setLong,
    wearFit(long: boolean, blast: boolean) {
      setLong(long);
      pipe.visible = blast;
      for (const bolt of bolts) {
        bolt.visible = long;
        bolt.scale.setScalar(1);
      }
    },
  };
}
