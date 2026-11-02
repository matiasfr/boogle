// The track machine and the railway it lays (src/world/rules/sites.ts, "Machine runs" in docs/game-design/haul.md).
// The machine parks at the open section's start; once a run starts it warms up (rapid chuffs, a shudder), crawls the
// section dropping sleepers one by one off its front (each thumps down with dust; every other one a rail clanks) and
// whistles at the end. You can ride its deck (a platform, src/physics/platforms.ts).
// Serves DESIGN.md 1 (Toys before chores: construction you can watch and ride) and 10 (Slapstick over precision).
// Lockstep sites (read only), Local view, sounds and platform.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { attribute, positionLocal, uniform } from 'three/tsl';
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { sharedSeconds } from '../netplay/shared-time.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { ROUTE } from '../sim/route.ts';
import { MACHINE_RUN } from '../sim/scripted-run.ts';
import { pieceMesh, pieceColor, commitPieces } from '../render/haul-pieces.ts';
import { emit } from '../render/particles.ts';
import { addPart, mergeParts } from '../render/props.ts';
import { chuff, thump, clank, whistle } from '../render/machine-sfx.ts';
import { angleLerp } from '../math.ts';
import { BODY, addBody, createBody, physicsReady, stepAlpha, type Body } from '../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../physics/physics.ts';
import { registerPlatform, platformById, yawOf, type Platform } from '../physics/platforms.ts';

const { sites } = rules.sites;
const TUNE = {
  step: 0.6, // m between sleepers
  fall: 0.2, // s a sleeper takes to drop off the front
  drop: 0.7, // m it drops from
  chuffEvery: 0.32, // m travelled per chuff while laying
  follow: 9, // 1/s: how fast the drawn machine catches up with the run
};
// The machine: a deck you can ride (hx, hz: half size; top above the body's centre), the boiler and funnel at the back,
// the sleeper chute at the front. It rides on the track it lays: its front is `front` m past the laid head (behind it),
// so each sleeper drops off the chute just ahead of its wheels.
const M = { hx: 0.8, hz: 1.5, hy: 0.15, lift: 0.5, front: -0.55 };

// ---------------------------------------------------------------- the railway
const LINES = ROUTE.map((sec) => {
  const dx = sec.to[0] - sec.x,
    dz = sec.to[1] - sec.z;
  const len = Math.hypot(dx, dz);
  return { len, yaw: Math.atan2(dx, dz), fx: dx / len, fz: dz / len, n: Math.floor(len / TUNE.step) };
});
const sleepers = pieceMesh(LINES.reduce((t, l) => t + l.n, 0));
const railMat = new THREE.MeshStandardNodeMaterial({ color: '#5c5f66', roughness: 0.45, metalness: 0.7 });
// Every section's two rails in one instanced draw (and one shadow draw), only the laid ones shown.
const RAIL_OFF = [-0.45, 0.45];
const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 1), railMat, ROUTE.length * 2);
rails.count = 0;
rails.visible = false;
rails.frustumCulled = false;
rails.castShadow = true;
scene.add(rails);
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e3 = new THREE.Euler(),
  at = new THREE.Vector3(),
  railScale = new THREE.Vector3(),
  sleeperScale = new THREE.Vector3(2.2, 0.8, 1.4);
// A point d metres along section s (past either end: straight on), on the ground.
function along(s: number, d: number, out = at): THREE.Vector3 {
  const a = ROUTE[s],
    l = LINES[s];
  const x = a.x + l.fx * d,
    z = a.z + l.fz * d;
  return out.set(x, groundHeight(x, z), z);
}

// When each sleeper of the running section dropped (performance.now ms); 0 = it was down before we looked.
const dropAt: number[][] = ROUTE.map(() => []);
const landed: boolean[][] = ROUTE.map(() => []);
// The frame's changing numbers live on one object, not in module `let`s: V8 boxes a double stored in a module
// variable (a fresh HeapNumber each write) but updates an object's double field in place.
const st = {
  squash: 0, // the machine's bump when a sleeper lands, decays
  spin: 0, // the wheels' turn
  prevYaw: 0, // the body's yaw before this physics step
  travelled: 0, // m since the last chuff
  sinceChuff: 0, // s since the last chuff
};

// Redrawn only while something changes: a laid length moves, or a sleeper is still falling or bouncing (until settled,
// performance.now ms). An idle railway costs a comparison per section a frame.
const SETTLE_MS = (TUNE.fall + 0.15) * 1000 + 50;
const laidWas = ROUTE.map(() => -1);
let settled = 0;
function drawRailway(tick: number, now: number, live: boolean): void {
  let moved = false;
  for (let s = 0; s < ROUTE.length; s++) {
    const d = s === goal.s && goal.running ? goal.d : laidAt(s, tick);
    if (d !== laidWas[s]) moved = true;
    laidWas[s] = d;
  }
  if (!moved && now > settled) return;
  let c = 0,
    r = 0;
  for (let s = 0; s < ROUTE.length; s++) {
    const { len, yaw, n } = LINES[s];
    const d = Math.min(len, laidWas[s]);
    const shown = Math.max(0, Math.min(n, Math.floor(d / TUNE.step + 0.5)));
    const drops = dropAt[s];
    // new sleepers: a few at once are the machine laying them (animate); many are a load or a late join (just there)
    const fresh = shown - drops.length;
    for (let k = drops.length; k < shown; k++) {
      drops.push(live && fresh <= 3 ? now : 0);
      landed[s].push(!(live && fresh <= 3));
      if (live && fresh <= 3) settled = now + SETTLE_MS;
    }
    if (drops.length > shown) drops.length = landed[s].length = shown;
    for (let k = 0; k < shown; k++) {
      along(s, (k + 0.5) * TUNE.step);
      const t = drops[k] ? (now - drops[k]) / 1000 : 1;
      let tilt = 0;
      if (t < TUNE.fall) {
        const f = t / TUNE.fall;
        at.y += TUNE.drop * (1 - f * f);
        tilt = (1 - f) * 0.5;
      } else if (!landed[s][k]) {
        landed[s][k] = true;
        land(s, k);
      } else if (t < TUNE.fall + 0.15) at.y += Math.sin(((t - TUNE.fall) / 0.15) * Math.PI) * 0.04; // a little bounce
      at.y += 0.06;
      q.setFromEuler(e3.set(tilt, yaw, 0, 'YXZ'));
      sleepers.setMatrixAt(c, m4.compose(at, q, sleeperScale));
      sleepers.setColorAt(c++, pieceColor(0));
    }
    // rails reach the last landed sleeper
    let railTo = 0;
    for (let k = shown - 1; k >= 0; k--)
      if (landed[s][k]) {
        railTo = (k + 1) * TUNE.step;
        break;
      }
    railTo = Math.min(len, d >= len - 0.01 ? len : railTo);
    if (railTo <= 0.05) continue;
    q.setFromEuler(e3.set(0, yaw, 0));
    railScale.set(1, 1, railTo);
    for (let k = 0; k < 2; k++) {
      const off = RAIL_OFF[k];
      along(s, railTo / 2);
      at.set(at.x + Math.cos(yaw) * off, at.y + 0.16, at.z - Math.sin(yaw) * off);
      rails.setMatrixAt(r++, m4.compose(at, q, railScale));
    }
  }
  commitPieces(sleepers, c);
  rails.count = r;
  rails.visible = r > 0;
  rails.instanceMatrix.needsUpdate = true;
}

const DUST = new THREE.Color('#cdb48c'),
  SMOKE = new THREE.Color('#d9d6d0'),
  SOOT = new THREE.Color('#77736e'),
  SPARK = new THREE.Color('#ffb347').multiplyScalar(3),
  STEAM = new THREE.Color('#ffffff').multiplyScalar(1.4);
// A sleeper hits the ground: a thump, a ring of dust, the machine bumps; every other one a rail clanks down on it.
function land(s: number, k: number): void {
  const p = along(s, (k + 0.5) * TUNE.step);
  thump(p.x, p.z);
  st.squash = 1;
  const { fx, fz } = LINES[s];
  for (let j = 0; j < 14; j++) {
    const a = (j / 14) * Math.PI * 2 + Math.random() * 0.3;
    const sp = 1.2 + Math.random() * 1.4;
    const ox = Math.cos(a),
      oz = Math.sin(a);
    emit({
      x: p.x + ox * 0.5 * Math.abs(fz) + oz * 0.2,
      y: p.y + 0.08,
      z: p.z + oz * 0.5 * Math.abs(fx) + ox * 0.2,
      vx: ox * sp,
      vy: 0.4 + Math.random() * 0.9,
      vz: oz * sp,
      life: 0.7 + Math.random() * 0.5,
      size: 0.24 + Math.random() * 0.2,
      color: DUST,
      alpha: 0.9,
      gravity: 1.2,
      drag: 3.5,
      grow: [0.7, 2.4],
      fade: 0.6,
    });
  }
  if (k % 2) {
    clank(p.x, p.z);
    for (const side of [-0.45, 0.45])
      for (let j = 0; j < 3; j++)
        emit({
          x: p.x + fz * side,
          y: p.y + 0.2,
          z: p.z - fx * side,
          vx: (Math.random() - 0.5) * 3,
          vy: 1.5 + Math.random() * 1.5,
          vz: (Math.random() - 0.5) * 3,
          life: 0.25 + Math.random() * 0.15,
          size: 0.05,
          color: SPARK,
          gravity: 9,
          shrink: 0.5,
        });
  }
}

// ---------------------------------------------------------------- the machine
// Three draws (and three shadow draws): every part that doesn't move is one mesh, its finishes (colour, roughness,
// metalness) per vertex and the boiler's and funnel's squash in its vertex shader; the six wheels are one instanced
// mesh; the sleepers waiting on the deck another (the shared piece mesh).
type Finish = { color: string; rough: number; metal: number; flat: boolean };
const WOOD: Finish = { color: '#9a6b3f', rough: 0.9, metal: 0, flat: true };
const PAINT: Finish = { color: '#c8473a', rough: 0.6, metal: 0, flat: true };
const IRON: Finish = { color: '#34353b', rough: 0.5, metal: 0.5, flat: false };
const BRASS: Finish = { color: '#d9a441', rough: 0.35, metal: 0.8, flat: false };
const root = new THREE.Group(); // placed at the body
const look = new THREE.Group(); // shudders and squashes inside it
root.add(look);
scene.add(root);

const squashU = uniform(0); // the bump when a sleeper lands; the boiler and funnel swell with it
const parts: THREE.BufferGeometry[] = [],
  extras: { n: number; f: Finish; x: number; y: number; z: number; gain: number[] }[] = [];
const NO_SQUASH = [0, 0, 0];
// A part at (x, y, z), tipped rx about x; `gain`: how much it swells about its centre per unit of squash.
function part(geo: THREE.BufferGeometry, f: Finish, x: number, y: number, z: number, rx = 0, gain = NO_SQUASH) {
  let g = geo;
  if (f.flat) {
    g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals(); // non-indexed: face normals, the flat-shaded look
  }
  addPart(parts, g, m4.makeRotationX(rx).setPosition(x, y, z), f.color);
  extras.push({ n: parts[parts.length - 1].attributes.position.count, f, x, y, z, gain });
}
part(new THREE.BoxGeometry(M.hx * 2, M.hy * 2, M.hz * 2), WOOD, 0, 0, 0); // deck
part(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 14).rotateX(Math.PI / 2), PAINT, 0, 0.6, -0.75, 0, [0.03, 0.03, 0]); // boiler
part(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 14).rotateX(Math.PI / 2), BRASS, 0, 0.6, -0.15); // a brass band
part(new THREE.CylinderGeometry(0.2, 0.13, 0.65, 10), IRON, 0, 1.3, -1.05, 0, [0.1, 0.15, 0.1]); // funnel
part(new THREE.CylinderGeometry(0.27, 0.2, 0.12, 10), IRON, 0, 1.66, -1.05); // its flared lip
part(new THREE.BoxGeometry(1.5, 0.08, 0.08), BRASS, 0, 0.45, -M.hz - 0.12); // the push bar, across the back
for (const x of [-0.6, 0.6]) part(new THREE.BoxGeometry(0.06, 0.3, 0.16), IRON, x, 0.3, -M.hz - 0.04);
part(new THREE.BoxGeometry(1.2, 0.05, 0.6), WOOD, 0, -0.05, M.hz + 0.22, 0.5); // the sleeper chute, in front
const bodyGeo = mergeParts(parts);
{
  const total = bodyGeo.attributes.position.count;
  const rm = new Float32Array(total * 2),
    pivot = new Float32Array(total * 3),
    gain = new Float32Array(total * 3);
  let v = 0;
  for (const { n, f, x, y, z, gain: g } of extras)
    for (let k = 0; k < n; k++, v++) {
      rm.set([f.rough, f.metal], v * 2);
      pivot.set([x, y, z], v * 3);
      gain.set(g, v * 3);
    }
  bodyGeo.setAttribute('rm', new THREE.BufferAttribute(rm, 2));
  bodyGeo.setAttribute('pivot', new THREE.BufferAttribute(pivot, 3));
  bodyGeo.setAttribute('gain', new THREE.BufferAttribute(gain, 3));
  bodyGeo.computeBoundingSphere();
}
const bodyMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true });
const rmA = attribute('rm', 'vec2'),
  pivotA = attribute('pivot', 'vec3');
bodyMat.roughnessNode = rmA.x;
bodyMat.metalnessNode = rmA.y;
bodyMat.positionNode = pivotA.add(positionLocal.sub(pivotA).mul(attribute('gain', 'vec3').mul(squashU).add(1)));
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.castShadow = bodyMesh.receiveShadow = true;
look.add(bodyMesh);

const WHEELS = [-1.05, 0, 1.05].flatMap((z) => [-0.86, 0.86].map((x) => new THREE.Vector3(x, -0.25, z)));
const iron = new THREE.MeshStandardNodeMaterial({ color: IRON.color, roughness: IRON.rough, metalness: IRON.metal });
const wheels = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.25, 0.25, 0.14, 12).rotateZ(Math.PI / 2),
  iron,
  WHEELS.length,
);
wheels.castShadow = wheels.receiveShadow = true;
look.add(wheels);
const ONE = new THREE.Vector3(1, 1, 1);
function spinWheels(): void {
  q.setFromEuler(e3.set(st.spin, 0, 0));
  for (let k = 0; k < WHEELS.length; k++) wheels.setMatrixAt(k, m4.compose(WHEELS[k], q, ONE));
  wheels.instanceMatrix.needsUpdate = true;
}
spinWheels();
wheels.computeBoundingSphere(); // spinning in place keeps it

// Sleepers waiting on the deck by the chute, in the machine's frame: fewer as the section fills.
const load = pieceMesh(4);
look.add(load);
for (let j = 0; j < 4; j++) {
  q.setFromEuler(e3.set(0, Math.PI / 2, 0));
  load.setMatrixAt(j, m4.compose(at.set(0, M.hy + 0.08 + j * 0.13, M.hz - 0.35), q, sleeperScale));
  load.setColorAt(j, pieceColor(0));
}
let loadShown = -1;
const FUNNEL_TOP = new THREE.Vector3(0, 1.75, -1.05);

// Where the machine should be (`at`: its centre, metres along the section): parked on the railhead, its front at the
// open section's start (START); laying, its front is just behind the laid head (d). A run ends with it on the next
// section's railhead, so it never moves between runs: parking it anywhere else made it lunge there the moment a
// section was laid, throwing anyone riding its deck. Once the whole route is laid it sinks out of sight. It reads the
// smooth shared time. Where the ?proto=wagon train stands at the end of the line its loco
// overhangs the railhead by about 5 m, so the drawn machine keeps its back bar CLEAR m ahead of the loco's nose
// (`clearOfWagon`) and drops back to its spot as the train pulls away: Local, the run's timing is unchanged. A faked
// laid count (the wagon panel's +, `?laid=N`) runs the train on over the open section: the machine sinks into the
// ground out of its way (`goal.sunk`; it is solid, and would sweep riders off the decks) until the train is back off it.
const START = M.front - M.hz,
  CLEAR = 0.5;
let loco: Platform | null = null,
  lookups = 0;
function clearOfWagon(s: number, at: number): number {
  // src/proto/wagon/: car 0 is the loco, at the train's outbound end (looked for twice a second until it turns up)
  if (!loco && lookups++ % 30 === 0) loco = platformById('wagon:car0');
  if (!loco || loco.body.position.y < -20) return at; // no wagon, or none on the line yet (parked under the island)
  const { fx, fz } = LINES[s];
  const rx = loco.body.position.x - ROUTE[s].x,
    rz = loco.body.position.z - ROUTE[s].z;
  if (Math.abs(rx * fz - rz * fx) > 4) return at; // off this line
  const nose = rx * fx + rz * fz + loco.hz + 0.2; // its buffer beam
  goal.sunk = nose > 6.5; // a faked laid count runs it on over the open section: sink where the nose passed us
  return Math.max(at, Math.min(nose, 6.5) + CLEAR + M.hz + 0.12); // the push bar sits 0.12 m behind the deck
}
const goal = { s: 0, d: 0, at: START, x: 0, y: 0, z: 0, yaw: 0, running: false, name: '', gone: false, sunk: false };
function laidAt(s: number, tick: number): number {
  const x = sites.list[s];
  if (rules.sites.isDone(s)) return LINES[s].len;
  if (!x || x.t0 < 0) return 0;
  const r = rules.sites.run(s, Math.floor(tick));
  if (r.name === 'warm' || r.phase < 0) return 0;
  if (r.name !== 'lay') return LINES[s].len;
  return LINES[s].len * Math.min(1, Math.max(0, (tick - x.t0 - MACHINE_RUN[0].len) / MACHINE_RUN[1].len));
}
function aim(tick: number): void {
  const open = sites.open;
  const s = Math.min(open, ROUTE.length - 1);
  goal.s = s;
  goal.d = open >= ROUTE.length ? LINES[s].len : laidAt(s, tick);
  goal.running = open < ROUTE.length && sites.list[open].t0 >= 0;
  const r = goal.running ? rules.sites.run(open, Math.floor(tick)) : null;
  goal.name = r?.name ?? '';
  goal.gone = open >= ROUTE.length;
  goal.at = goal.d + START; // laid length 0 while parked or warming up
  goal.sunk = false;
  if (!goal.gone) goal.at = clearOfWagon(s, goal.at);
  const c = along(s, goal.at);
  goal.x = c.x;
  goal.z = c.z;
  goal.y = c.y + M.lift - (goal.gone || goal.sunk ? 4 : 0);
  goal.yaw = LINES[s].yaw;
}

// The drawn pose chases the goal; the body follows the drawn pose (a kinematic platform, so riders are carried).
const pose = { x: 0, y: 0, z: 0, yaw: 0, ready: false };
let body: Body | null = null,
  platform: Platform | null = null;
function move(dt: number) {
  const b = body!;
  st.prevYaw = yawOf(b.quaternion);
  b.velocity.set((pose.x - b.position.x) / dt, (pose.y - b.position.y) / dt, (pose.z - b.position.z) / dt);
  b.angularVelocity.set(0, (angleLerp(st.prevYaw, pose.yaw, 1) - st.prevYaw) / dt, 0);
}
void physicsReady.then(() => {
  aim(sharedSeconds() * 10);
  Object.assign(pose, { x: goal.x, y: goal.y, z: goal.z, yaw: goal.yaw, ready: true });
  body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: pose.x, y: pose.y, z: pose.z },
    rotation: { x: 0, y: Math.sin(pose.yaw / 2), z: 0, w: Math.cos(pose.yaw / 2) },
    shapes: [
      { kind: 'box', hx: M.hx, hy: M.hy, hz: M.hz },
      { kind: 'box', hx: 0.45, hy: 0.45, hz: 0.65, offset: { x: 0, y: 0.6, z: -0.75 } }, // the boiler
      // the back: a flat wall from the wheels to the push bar, so a pusher leans on it instead of climbing the deck
      { kind: 'box', hx: M.hx, hy: 0.45, hz: 0.08, offset: { x: 0, y: 0.15, z: -M.hz - 0.04 } },
    ],
  });
  addBody(body);
  st.prevYaw = pose.yaw;
  platform = { body, hx: M.hx, hz: M.hz, top: M.hy, move };
  registerPlatform(platform);
});

// ---------------------------------------------------------------- the frame
let lastName = '';
const puffAt = new THREE.Vector3();
function puff(heavy: number): void {
  puffAt.copy(FUNNEL_TOP);
  look.localToWorld(puffAt);
  chuff(puffAt.x, puffAt.z, heavy);
  for (let j = 0; j < 3 + heavy * 3; j++)
    emit({
      x: puffAt.x + (Math.random() - 0.5) * 0.15,
      y: puffAt.y,
      z: puffAt.z + (Math.random() - 0.5) * 0.15,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 1.6 + Math.random() * 1.2 + heavy,
      vz: (Math.random() - 0.5) * 0.6,
      life: 1.1 + Math.random() * 0.6,
      size: 0.22 + heavy * 0.1,
      color: heavy > 0.5 ? SOOT : SMOKE,
      alpha: 0.75,
      gravity: -0.3,
      drag: 1.2,
      grow: [0.6, 3.2],
      fade: 0.7,
    });
}

onFrame(
  ({ now, dt }: { now: number; dt: number }) => {
    const tick = sharedSeconds() * 10; // shared time in ticks (TICK_MS = 100)
    aim(tick);
    const live = goal.running && goal.name === 'lay';
    drawRailway(tick, now, live);
    if (!pose.ready) return;
    // chase the goal; a big jump (a load, a reset) snaps
    const k = 1 - Math.exp(-dt * TUNE.follow);
    if (Math.hypot(goal.x - pose.x, goal.z - pose.z) > 6) {
      pose.x = goal.x;
      pose.y = goal.y;
      pose.z = goal.z;
    }
    const px = pose.x,
      pz = pose.z;
    pose.x += (goal.x - pose.x) * k;
    pose.y += (goal.y - pose.y) * k;
    pose.z += (goal.z - pose.z) * k;
    pose.yaw = angleLerp(pose.yaw, goal.yaw, k);
    const moved = Math.hypot(pose.x - px, pose.z - pz);
    if (body) {
      const ip = body.interpolatedPosition;
      root.position.set(ip.x, ip.y, ip.z);
      root.rotation.y = angleLerp(st.prevYaw, yawOf(body.quaternion), stepAlpha());
    }
    if (moved > 0) {
      st.spin = (st.spin + moved / 0.25) % (Math.PI * 2);
      spinWheels();
    }
    root.visible = !goal.gone;

    // phases: warm shudders and chuffs fast; lay chuffs by distance; whistle steams
    if (goal.name !== lastName) {
      if (goal.name === 'warm') puff(1);
      if (goal.name === 'whistle') {
        puffAt.copy(FUNNEL_TOP);
        look.localToWorld(puffAt);
        whistle(puffAt.x, puffAt.z);
      }
      lastName = goal.name;
    }
    st.sinceChuff += dt;
    st.travelled += moved;
    const shudder = goal.name === 'warm' ? 0.035 : goal.name === 'lay' ? 0.01 : 0;
    if (shudder) look.position.set((Math.random() - 0.5) * shudder, (Math.random() - 0.5) * shudder, 0);
    else if (look.position.x || look.position.y) look.position.set(0, 0, 0);
    let heavy = -1;
    if (goal.name === 'warm' && st.sinceChuff > 0.22) heavy = 0.8;
    else if (goal.name === 'lay' && st.travelled > TUNE.chuffEvery) heavy = 0.2;
    else if (goal.name === 'lay' && st.sinceChuff > 1.6) heavy = 0;
    if (heavy >= 0) {
      puff(heavy);
      st.sinceChuff = st.travelled = 0;
    }
    if (goal.name === 'whistle' && st.sinceChuff > 0.05) {
      st.sinceChuff = 0;
      puffAt.copy(FUNNEL_TOP);
      look.localToWorld(puffAt);
      emit({
        x: puffAt.x,
        y: puffAt.y + 0.1,
        z: puffAt.z,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 5 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 0.8,
        life: 0.9,
        size: 0.2,
        color: STEAM,
        alpha: 0.8,
        drag: 2,
        grow: [0.5, 3.5],
        fade: 0.6,
      });
    }
    if (st.squash > 0 || squashU.value !== 0) {
      st.squash = Math.max(0, st.squash - dt * 7);
      look.scale.set(1 + st.squash * 0.04, 1 - st.squash * 0.07, 1 + st.squash * 0.03);
      squashU.value = st.squash; // a uniform's value is a boxed field: written only while it bumps
    }

    // the sleepers waiting by the chute: fewer as the section fills
    const left = goal.running ? Math.ceil(4 * (1 - goal.d / LINES[goal.s].len)) : 4;
    if (left !== loadShown) commitPieces(load, (loadShown = left));
  },
  { phase: 'update', order: 35 },
);

// For the look evals: where the machine is.
export const trackMachine = { pose, goal, platform: () => platform };
