// The lighthouse: a striped tower on the hill in the middle of the island, with a spiral staircase round the outside up
// to a gallery deck.
// At dusk the lamp comes on and two beams sweep the sea (on the shared clock, so everyone sees the same sweep).
//
// The stair is a smooth helical ramp for physics (no step bumps) with treads drawn on top; railings on the outer
// edge and round the deck keep people from falling off (mostly). The top of the deck is open where the stair arrives.
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { uniform, vec4, pow, uv } from 'three/tsl';
import { scene, camera } from '../../render/scene.ts';
import { groundMat, GROUP } from '../../physics/physics.ts';
import { createBody, addBody } from '../../physics/engine.ts';
import { addPart, mergeParts } from '../../render/props.ts';
import { onStart, onFrame } from '../../loop.ts';
import { skyNow } from '../../render/sky.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { addLightSource } from '../../render/lights.ts';
import { reducedMotion } from '../../constants.ts';
import site, { PAD_Y } from './site.js';
import { freezeStatic } from '../../render/instances.ts';

const CX = site.x,
  CZ = site.z;
const PLINTH_H = 0.3,
  PLINTH_R = 3.7;
const BASE_Y = PAD_Y + PLINTH_H; // tower foot, stair start
const TOWER_H = 18;
const R_BOT = 2.6,
  R_TOP = 2.0;
export const DECK_Y = BASE_Y + TOWER_H; // walkable top of the gallery deck
const DECK_R = 3.65;
// Where the frisbee waits (src/adapters/gifts.js perches it): mid-deck, just past the top of the stair, which arrives at angle 0.
export const FRISBEE_SPOT = { x: CX + 1.9, y: DECK_Y, z: CZ + 2.0 };
const STAIR_W = 1.3;
const TURNS = 2.5;
const START_A = Math.PI; // the stair's foot faces inland (west)
const SEGS = 90; // physics ramp segments
const GAP = (2.3 / (TOWER_H / TURNS)) * Math.PI * 2; // deck left open above the last stretch of stair (head room)
const RAIL_FROM = 0.035; // the first bit of stair has no railing, so it's easy to step on from the side
const END_A = START_A + TURNS * Math.PI * 2;

const towerR = (y) => R_BOT + (R_TOP - R_BOT) * THREE.MathUtils.clamp((y - BASE_Y) / TOWER_H, 0, 1);
const stairY = (u) => BASE_Y + u * TOWER_H;
const stairA = (u) => START_A + u * TURNS * Math.PI * 2;
const at = (a, r, y) => new THREE.Vector3(CX + Math.cos(a) * r, y, CZ + Math.sin(a) * r);

const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  s = new THREE.Vector3();
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = (rt, rb, h, n = 20) => new THREE.CylinderGeometry(rt, rb, h, n);

// A box spanning from p to q (centre line), w wide (horizontal, perpendicular), t thick (vertical-ish).
function boxBetween(p0, p1, w, t) {
  const mid = p0.clone().add(p1).multiplyScalar(0.5);
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const upv = new THREE.Vector3().crossVectors(dir, side).normalize(); // right-handed basis (side, upv, dir)
  const basis = new THREE.Matrix4().makeBasis(side, upv, dir);
  return { mid, quat: new THREE.Quaternion().setFromRotationMatrix(basis), size: new THREE.Vector3(w, t, len) };
}

// A collider box for boxBetween's result, relative to the stair body at (CX, BASE_Y, CZ).
function addColliderBox(shapes, b) {
  shapes.push({
    kind: 'box',
    hx: b.size.x / 2,
    hy: b.size.y / 2,
    hz: b.size.z / 2,
    offset: { x: b.mid.x - CX, y: b.mid.y - BASE_Y, z: b.mid.z - CZ },
    rotation: { x: b.quat.x, y: b.quat.y, z: b.quat.z, w: b.quat.w },
  });
}

let beams = null,
  lamp = null,
  glass = null,
  halo = null;
const night = () => THREE.MathUtils.smoothstep(1 - (skyNow.day ?? 1), 0.25, 0.6);

function build() {
  const parts = [];
  const put = (geo, pos, color, quat, scale) => {
    m.compose(pos, quat ?? q.identity(), scale ?? s.set(1, 1, 1));
    addPart(parts, geo, m, color);
  };

  // Plinth, striped tower, a door and a few windows.
  put(
    cyl(PLINTH_R, PLINTH_R + 0.2, PLINTH_H + 0.6, 10),
    new THREE.Vector3(CX, PAD_Y + (PLINTH_H - 0.6) / 2, CZ),
    '#a19b90',
  );
  const bands = 6;
  for (let k = 0; k < bands; k++) {
    const y0 = BASE_Y + (k / bands) * TOWER_H,
      y1 = BASE_Y + ((k + 1) / bands) * TOWER_H;
    put(
      cyl(towerR(y1), towerR(y0), y1 - y0, 22),
      new THREE.Vector3(CX, (y0 + y1) / 2, CZ),
      k % 2 ? '#d64b3c' : '#f3efe6',
    );
  }
  const doorA = START_A + 0.55;
  put(
    box,
    at(doorA, R_BOT - 0.05, BASE_Y + 1.05),
    '#4d3423',
    q.setFromEuler(new THREE.Euler(0, -doorA, 0)),
    s.set(0.25, 2.1, 1.1),
  );
  for (let k = 0; k < 5; k++) {
    const y = BASE_Y + 3.5 + k * 3.1,
      a = START_A + 1.7 + k * 2.4;
    put(box, at(a, towerR(y) - 0.04, y), '#25303b', q.setFromEuler(new THREE.Euler(0, -a, 0)), s.set(0.2, 0.9, 0.55));
  }

  // Gallery deck: the tower's cap plus a ring, open over the top of the stair.
  // Cap sits a hair above the tower top and the ring so their top faces don't z-fight.
  put(cyl(R_TOP + 0.15, R_TOP + 0.15, 0.4, 24), new THREE.Vector3(CX, DECK_Y - 0.18, CZ), '#5b6168');
  const ringN = 40;
  const deckStart = END_A % (Math.PI * 2),
    deckSpan = Math.PI * 2 - GAP;
  for (let k = 0; k < ringN; k++) {
    const a0 = deckStart + (k / ringN) * deckSpan,
      a1 = deckStart + ((k + 1) / ringN) * deckSpan;
    const am = (a0 + a1) / 2,
      rm = (R_TOP + 0.1 + DECK_R + 0.05) / 2; // starts just under the cap's rim, not across it
    const chord = 2 * DECK_R * Math.sin((a1 - a0) / 2) * 1.05;
    put(
      box,
      at(am, rm, DECK_Y - 0.15),
      '#5b6168',
      q.setFromEuler(new THREE.Euler(0, -am, 0)),
      s.set(DECK_R - R_TOP - 0.05, 0.3, chord),
    );
    if (k % 2 === 0) put(box, at(a0, DECK_R - 0.08, DECK_Y + 0.55), '#2d3035', q.identity(), s.set(0.07, 1.1, 0.07));
  }
  const deckRail = new THREE.TorusGeometry(DECK_R - 0.08, 0.05, 6, 48, deckSpan);
  put(
    deckRail,
    new THREE.Vector3(CX, DECK_Y + 1.1, CZ),
    '#2d3035',
    q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, deckStart)),
  );

  // Lantern room roof and finial (the glass is its own transparent mesh).
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put(box, at(a, 1.38, DECK_Y + 1.25), '#2d3035', q.identity(), s.set(0.08, 2.5, 0.08));
  }
  put(new THREE.ConeGeometry(1.85, 1.5, 16), new THREE.Vector3(CX, DECK_Y + 3.2, CZ), '#c84436');
  put(new THREE.SphereGeometry(0.22, 10, 6), new THREE.Vector3(CX, DECK_Y + 4.05, CZ), '#2d3035');

  // The spiral stair: treads, outer posts and a handrail; a smooth ramp and a low wall for physics.
  const stairShapes = [];
  const treadN = Math.round(TOWER_H / 0.2);
  for (let k = 0; k < treadN; k++) {
    const u = (k + 0.5) / treadN,
      y = stairY(u),
      a = stairA(u);
    const rin = towerR(y) + 0.03,
      rm = rin + STAIR_W / 2;
    const arc = (TURNS * Math.PI * 2 * rm) / treadN;
    put(
      box,
      at(a, rm, y - 0.06),
      k % 2 ? '#7d8186' : '#8a8e93',
      q.setFromEuler(new THREE.Euler(0, -a, 0)),
      s.set(STAIR_W, 0.12, arc * 1.15),
    );
    if (k % 3 === 0 && u > RAIL_FROM)
      put(box, at(a, rin + STAIR_W - 0.06, y + 0.5), '#2d3035', q.identity(), s.set(0.06, 1.0, 0.06));
  }
  const railPts = [];
  for (let k = 0; k <= 120; k++) {
    const u = RAIL_FROM + (k / 120) * (1 - RAIL_FROM),
      y = stairY(u);
    railPts.push(at(stairA(u), towerR(y) + 0.03 + STAIR_W - 0.06, y + 1.0));
  }
  addPart(parts, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 240, 0.05, 5), m.identity(), '#2d3035');

  for (let k = 0; k < SEGS; k++) {
    const u0 = k / SEGS,
      u1 = (k + 1) / SEGS;
    const r0 = towerR(stairY(u0)) + 0.03 + STAIR_W / 2,
      r1 = towerR(stairY(u1)) + 0.03 + STAIR_W / 2;
    const p0 = at(stairA(u0), r0, stairY(u0) - 0.14),
      p1 = at(stairA(u1), r1, stairY(u1) - 0.14);
    const ramp = boxBetween(p0, p1, STAIR_W, 0.28);
    ramp.size.z *= 1.12; // overlap so there are no seams to catch on
    addColliderBox(stairShapes, ramp);
    const w0 = at(stairA(u0), r0 + STAIR_W / 2 + 0.05, stairY(u0) + 0.5),
      w1 = at(stairA(u1), r1 + STAIR_W / 2 + 0.05, stairY(u1) + 0.5);
    const wall = boxBetween(w0, w1, 0.1, 1.2);
    wall.size.z *= 1.1;
    if (u0 >= RAIL_FROM) addColliderBox(stairShapes, wall);
  }
  // Deck ring and its railing, the tower, the lantern room, the plinth.
  for (let k = 0; k < 24; k++) {
    const a0 = deckStart + (k / 24) * deckSpan,
      a1 = deckStart + ((k + 1) / 24) * deckSpan;
    const pa = at(a0, (R_TOP + DECK_R) / 2, DECK_Y - 0.15),
      pb = at(a1, (R_TOP + DECK_R) / 2, DECK_Y - 0.15);
    const seg = boxBetween(pa, pb, DECK_R - R_TOP + 0.2, 0.3);
    seg.size.z *= 1.15;
    addColliderBox(stairShapes, seg);
    const ra = at(a0, DECK_R, DECK_Y + 0.6),
      rb = at(a1, DECK_R, DECK_Y + 0.6);
    const rail = boxBetween(ra, rb, 0.1, 1.2);
    rail.size.z *= 1.1;
    addColliderBox(stairShapes, rail);
  }
  addBody(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position: { x: CX, y: BASE_Y, z: CZ },
      shapes: stairShapes,
    }),
  );
  addBody(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position: { x: CX, y: BASE_Y + TOWER_H / 2, z: CZ },
      shapes: [
        { kind: 'cylinder', rTop: R_TOP, rBottom: R_BOT, h: TOWER_H, segments: 16 },
        {
          kind: 'cylinder',
          rTop: 1.45,
          rBottom: 1.45,
          h: 3,
          segments: 12,
          offset: { x: 0, y: TOWER_H / 2 + 1.5, z: 0 },
        },
        {
          kind: 'cylinder',
          rTop: PLINTH_R,
          rBottom: PLINTH_R,
          h: PLINTH_H + 0.6,
          segments: 10,
          offset: { x: 0, y: -TOWER_H / 2 - 0.45, z: 0 },
        },
      ],
    }),
  );

  const statics = new THREE.Mesh(
    mergeParts(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }),
  );
  statics.castShadow = statics.receiveShadow = true;
  scene.add(statics);
  freezeStatic(statics); // never moves: no per-frame matrix work

  // Lantern glass, lamp, beams, halo.
  glass = new THREE.Mesh(
    cyl(1.4, 1.4, 2.4, 16),
    new THREE.MeshStandardMaterial({
      color: '#cfe9ff',
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      emissive: '#ffd27a',
      emissiveIntensity: 0,
      depthWrite: false,
    }),
  );
  glass.position.set(CX, DECK_Y + 1.25, CZ);
  scene.add(glass);
  lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), new THREE.MeshBasicMaterial({ color: '#7a6a4a' }));
  lamp.position.set(CX, DECK_Y + 1.3, CZ);
  scene.add(lamp);

  const uOn = uniform(0);
  const beamMat = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  // uv().y: 1 at the lamp, 0 at the far end. Warm lamp colour.
  const warm = new THREE.Color().setRGB(1, 0.9, 0.6, THREE.SRGBColorSpace);
  beamMat.colorNode = vec4(warm.r, warm.g, warm.b, pow(uv().y, 1.6).mul(uOn).mul(0.42));
  beams = new THREE.Group();
  for (const dir of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 70, 20, 1, true), beamMat);
    cone.rotation.z = (dir * Math.PI) / 2; // lie it down along x
    cone.position.x = dir * 35; // apex at the lamp, widening out to sea
    cone.frustumCulled = false;
    beams.add(cone);
  }
  beams.position.copy(lamp.position);
  beams.userData.on = uOn;
  scene.add(beams);

  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.25, 'rgba(255,210,120,0.55)');
  grad.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    }),
  );
  halo.position.copy(lamp.position);
  halo.scale.setScalar(7);
  scene.add(halo);

  addLightSource({ position: lamp.position.clone(), color: '#ffd9a0', intensity: 90, distance: 26, on: night });
}

const lampOff = new THREE.Color('#7a6a4a'),
  lampOn = new THREE.Color('#fff2c8'),
  toCam = new THREE.Vector3(),
  beamDir = new THREE.Vector3();
function update() {
  if (!beams) return;
  const n = night();
  beams.visible = halo.visible = n > 0.01;
  lamp.material.color.copy(lampOff).lerp(lampOn, n);
  glass.material.emissiveIntensity = n * 0.9;
  if (n <= 0.01) return;
  const a = reducedMotion ? 0.3 : sharedSeconds() * 0.55;
  beams.rotation.y = a;
  beams.userData.on.value = n;
  // The halo flares when a beam swings round to face you.
  toCam.subVectors(camera.position, lamp.position).setY(0).normalize();
  beamDir.set(Math.cos(a), 0, -Math.sin(a));
  const face = Math.abs(toCam.dot(beamDir));
  halo.material.opacity = n * (0.55 + 0.45 * Math.pow(face, 24));
  halo.scale.setScalar(6 + 10 * Math.pow(face, 24));
}

onStart(build);
onFrame(update);
