// The track machine and the railway it lays (src/world/rules/sites.ts, "Machine runs" in docs/game-design/haul.md).
// The machine parks at the open section's start; once a run starts it warms up (rapid chuffs, a shudder), crawls the
// section dropping sleepers one by one off its front (each thumps down with dust; every other one a rail clanks) and
// whistles at the end. You can ride its deck (a platform, src/physics/platforms.ts). On the push run (?proto=lay&v=push)
// it lays only while someone walks into its back: this tab sends site.push every PUSH_TICKS ticks while you do.
// Serves DESIGN.md 1 (Toys before chores: construction you can watch, ride and shove) and 10 (Slapstick over precision).
// Lockstep sites (read only, plus site.push), Local view, sounds and platform.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { submitEdit } from '../world/sync.ts';
import { sharedSeconds } from '../netplay/shared-time.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { me } from '../player/player.ts';
import { ROUTE } from '../sim/route.ts';
import { PUSH_RUN_KIND, PUSH_TICKS } from '../sim/scripted-run.ts';
import { pieceMesh, pieceColor, commitPieces } from '../render/haul-pieces.ts';
import { emit } from '../render/particles.ts';
import { chuff, thump, clank, whistle } from '../render/machine-sfx.ts';
import { angleLerp } from '../math.ts';
import { BODY, addBody, createBody, physicsReady, stepAlpha, type Body } from '../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../physics/physics.ts';
import { registerPlatform, platformById, carry, yawOf, type Platform } from '../physics/platforms.ts';

const { sites } = rules.sites;
const TUNE = {
  step: 0.6, // m between sleepers
  fall: 0.2, // s a sleeper takes to drop off the front
  drop: 0.7, // m it drops from
  chuffEvery: 0.32, // m travelled per chuff while laying
  follow: 9, // 1/s: how fast the drawn machine catches up with the run (smooths the push run's steps)
  pushMs: PUSH_TICKS * 100, // a push every PUSH_TICKS ticks while you walk into its back
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
const railGeo = new THREE.BoxGeometry(0.08, 0.08, 1);
const railMeshes = ROUTE.map(() =>
  [-0.45, 0.45].map((off) => {
    const m = new THREE.Mesh(railGeo, railMat);
    m.visible = false;
    m.castShadow = true;
    scene.add(m);
    return { m, off };
  }),
);
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e3 = new THREE.Euler(),
  at = new THREE.Vector3(),
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
let squash = 0; // the machine's bump when a sleeper lands, decays

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
  let c = 0;
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
    for (const { m, off } of railMeshes[s]) {
      m.visible = railTo > 0.05;
      if (!m.visible) continue;
      along(s, railTo / 2);
      m.position.set(at.x + Math.cos(yaw) * off, at.y + 0.16, at.z - Math.sin(yaw) * off);
      m.rotation.set(0, yaw, 0);
      m.scale.set(1, 1, Math.max(0.01, railTo));
    }
  }
  commitPieces(sleepers, c);
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
  squash = 1;
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
const wood = new THREE.MeshStandardNodeMaterial({ color: '#9a6b3f', roughness: 0.9, flatShading: true });
const paint = new THREE.MeshStandardNodeMaterial({ color: '#c8473a', roughness: 0.6, flatShading: true });
const iron = new THREE.MeshStandardNodeMaterial({ color: '#34353b', roughness: 0.5, metalness: 0.5 });
const brass = new THREE.MeshStandardNodeMaterial({ color: '#d9a441', roughness: 0.35, metalness: 0.8 });
const root = new THREE.Group(); // placed at the body
const look = new THREE.Group(); // shudders and squashes inside it
root.add(look);
scene.add(root);
function part(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent = look) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
part(new THREE.BoxGeometry(M.hx * 2, M.hy * 2, M.hz * 2), wood, 0, 0, 0); // deck
const wheels: THREE.Mesh[] = [];
const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.14, 12).rotateZ(Math.PI / 2);
for (const z of [-1.05, 0, 1.05]) for (const x of [-0.86, 0.86]) wheels.push(part(wheelGeo, iron, x, -0.25, z));
const boiler = part(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 14).rotateX(Math.PI / 2), paint, 0, 0.6, -0.75);
part(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 14).rotateX(Math.PI / 2), brass, 0, 0.6, -0.15); // a brass band
const funnel = part(new THREE.CylinderGeometry(0.2, 0.13, 0.65, 10), iron, 0, 1.3, -1.05);
part(new THREE.CylinderGeometry(0.27, 0.2, 0.12, 10), iron, 0, 1.66, -1.05); // its flared lip
part(new THREE.BoxGeometry(1.5, 0.08, 0.08), brass, 0, 0.45, -M.hz - 0.12); // the push bar, across the back
for (const x of [-0.6, 0.6]) part(new THREE.BoxGeometry(0.06, 0.3, 0.16), iron, x, 0.3, -M.hz - 0.04);
const chute = part(new THREE.BoxGeometry(1.2, 0.05, 0.6), wood, 0, -0.05, M.hz + 0.22); // the sleeper chute, in front
chute.rotation.x = 0.5;
const load = pieceMesh(4); // sleepers waiting on the deck by the chute
const FUNNEL_TOP = new THREE.Vector3(0, 1.75, -1.05);

// The push prompt: a sign over the machine while the push run waits for a shove.
const sign = (() => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(40, 26, 12, 0.78)';
  g.beginPath();
  g.roundRect(4, 4, 248, 88, 22);
  g.fill();
  g.fillStyle = '#fff7e8';
  g.font = '800 46px Figtree, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Push me!', 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.6, 1);
  s.position.set(0, 2.4, -M.hz);
  s.renderOrder = 10;
  s.visible = false;
  root.add(s);
  return s;
})();

// Where the machine should be (`at`: its centre, metres along the section): parked a little way up the open section,
// clear of the laid line; warming up, it backs onto the railhead; laying, its front is just behind the laid head (d).
// Once the whole route is laid it sinks out of sight. Push runs read whole ticks (their clock stands still between
// pushes); the others the smooth shared time. Where the ?proto=wagon train stands at the end of the line its loco
// overhangs the railhead by about 5 m, so the drawn machine keeps its back bar CLEAR m ahead of the loco's nose
// (`clearOfWagon`) and drops back to its spot as the train pulls away: Local, the run's timing is unchanged.
const PARK = M.hz + 1.6,
  START = M.front - M.hz,
  CLEAR = 0.5;
let loco: Platform | null = null;
function clearOfWagon(s: number, at: number): number {
  loco ??= platformById('wagon:car0'); // src/proto/wagon/: car 0 is the loco, at the train's outbound end
  if (!loco || loco.body.position.y < -20) return at; // no wagon, or none on the line yet (parked under the island)
  const { fx, fz } = LINES[s];
  const rx = loco.body.position.x - ROUTE[s].x,
    rz = loco.body.position.z - ROUTE[s].z;
  if (Math.abs(rx * fz - rz * fx) > 4) return at; // off this line
  const nose = rx * fx + rz * fz + loco.hz + 0.2; // its buffer beam
  if (nose > 6.5) return at; // a faked laid count (the wagon panel's +) runs it over the open section: let it by
  return Math.max(at, nose + CLEAR + M.hz + 0.12); // the push bar sits 0.12 m behind the deck
}
const goal = { s: 0, d: 0, at: PARK, x: 0, y: 0, z: 0, yaw: 0, running: false, name: '', gone: false };
function laidAt(s: number, tick: number): number {
  const x = sites.list[s];
  if (rules.sites.isDone(s)) return LINES[s].len;
  if (!x || x.t0 < 0) return 0;
  const script = rules.sites.script();
  const r = rules.sites.run(s, Math.floor(tick));
  if (r.name === 'warm' || r.phase < 0) return 0;
  if (r.name !== 'lay') return LINES[s].len;
  const t = rules.sites.kind() === PUSH_RUN_KIND ? Math.floor(tick) : tick;
  return LINES[s].len * Math.min(1, Math.max(0, (t - x.t0 - script[0].len) / script[1].len));
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
  goal.at = !r ? PARK : r.name === 'warm' ? PARK + ((START - PARK) * r.progress) / 1000 : goal.d + START;
  if (!goal.gone) goal.at = clearOfWagon(s, goal.at);
  const c = along(s, goal.at);
  goal.x = c.x;
  goal.z = c.z;
  goal.y = c.y + M.lift - (goal.gone ? 4 : 0);
  goal.yaw = LINES[s].yaw;
}

// The drawn pose chases the goal; the body follows the drawn pose (a kinematic platform, so riders are carried).
const pose = { x: 0, y: 0, z: 0, yaw: 0, ready: false };
let body: Body | null = null,
  platform: Platform | null = null,
  prevYaw = 0;
function move(dt: number) {
  const b = body!;
  prevYaw = yawOf(b.quaternion);
  b.velocity.set((pose.x - b.position.x) / dt, (pose.y - b.position.y) / dt, (pose.z - b.position.z) / dt);
  b.angularVelocity.set(0, (angleLerp(prevYaw, pose.yaw, 1) - prevYaw) / dt, 0);
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
  prevYaw = pose.yaw;
  platform = { body, hx: M.hx, hz: M.hz, top: M.hy, move };
  registerPlatform(platform);
});

// ---------------------------------------------------------------- pushing (the push run)
let lastPush = -1e9,
  pushing = false;
function push(now: number): void {
  pushing = false;
  const b = me.body;
  if (!b || !me.entered || !body || rules.sites.kind() !== PUSH_RUN_KIND || goal.name !== 'lay') return;
  if (carry.on && carry.on.body === body) return; // riding it doesn't push it
  const fx = Math.sin(pose.yaw),
    fz = Math.cos(pose.yaw);
  const rx = b.position.x - pose.x,
    rz = b.position.z - pose.z;
  const along = rx * fx + rz * fz,
    side = rx * fz - rz * fx;
  if (along > -M.hz + 0.3 || along < -M.hz - 1.3 || Math.abs(side) > M.hx + 0.5) return;
  if (me.wish.x * fx + me.wish.z * fz < 0.4) return; // walking into it, not standing about
  pushing = true;
  if (now - lastPush < TUNE.pushMs) return;
  lastPush = now;
  submitEdit({ op: 'site.push', i: 0, j: 0, s: sites.open });
  squash = Math.max(squash, 0.6); // a heave
  for (let j = 0; j < 4; j++)
    emit({
      x: b.position.x + (Math.random() - 0.5) * 0.4,
      y: b.position.y - 0.4,
      z: b.position.z + (Math.random() - 0.5) * 0.4,
      vx: -fx * 1.5 + (Math.random() - 0.5),
      vy: 0.5 + Math.random() * 0.6,
      vz: -fz * 1.5 + (Math.random() - 0.5),
      life: 0.5,
      size: 0.12,
      color: DUST,
      alpha: 0.7,
      gravity: 1,
      drag: 3,
      grow: [0.7, 2],
      fade: 0.6,
    });
}

// ---------------------------------------------------------------- the frame
let lastName = '',
  travelled = 0,
  sinceChuff = 0,
  stillFor = 0,
  lastD = 0,
  lastNow = 0;
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
    if (Math.hypot(goal.x - pose.x, goal.z - pose.z) > 6) Object.assign(pose, { x: goal.x, y: goal.y, z: goal.z });
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
      root.rotation.y = angleLerp(prevYaw, yawOf(body.quaternion), stepAlpha());
    }
    for (const w of wheels) w.rotation.x += moved / 0.25;
    root.visible = !goal.gone;

    // phases: warm shudders and chuffs fast; lay chuffs by distance (a push run waiting puffs idly); whistle steams
    if (goal.name !== lastName) {
      if (goal.name === 'warm') puff(1);
      if (goal.name === 'whistle') {
        puffAt.copy(FUNNEL_TOP);
        look.localToWorld(puffAt);
        whistle(puffAt.x, puffAt.z);
      }
      lastName = goal.name;
    }
    sinceChuff += dt;
    travelled += moved;
    const shudder = goal.name === 'warm' ? 0.035 : goal.name === 'lay' ? 0.01 : 0;
    look.position.set((Math.random() - 0.5) * shudder, (Math.random() - 0.5) * shudder, 0);
    let heavy = -1;
    if (goal.name === 'warm' && sinceChuff > 0.22) heavy = 0.8;
    else if (goal.name === 'lay' && travelled > TUNE.chuffEvery)
      heavy = rules.sites.kind() === PUSH_RUN_KIND ? 0.6 : 0.2;
    else if (goal.name === 'lay' && sinceChuff > 1.6) heavy = 0;
    if (heavy >= 0) {
      puff(heavy);
      sinceChuff = travelled = 0;
    }
    if (goal.name === 'whistle' && sinceChuff > 0.05) {
      sinceChuff = 0;
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
    squash = Math.max(0, squash - dt * 7);
    look.scale.set(1 + squash * 0.04, 1 - squash * 0.07, 1 + squash * 0.03);
    funnel.scale.set(1 + squash * 0.1, 1 + squash * 0.15, 1 + squash * 0.1);
    boiler.scale.set(1 + squash * 0.03, 1 + squash * 0.03, 1);

    // the sleepers waiting by the chute: fewer as the section fills
    const left = goal.running ? Math.ceil(4 * (1 - goal.d / LINES[goal.s].len)) : 4;
    for (let j = 0; j < left; j++) {
      at.set(0, M.hy + 0.08 + j * 0.13, M.hz - 0.35);
      look.localToWorld(at);
      q.setFromEuler(e3.set(0, root.rotation.y + Math.PI / 2, 0));
      load.setMatrixAt(j, m4.compose(at, q, sleeperScale));
      load.setColorAt(j, pieceColor(0));
    }
    commitPieces(load, left);

    // the push run: the sign while it waits, and this tab's pushes
    push(now);
    const d = goal.d;
    stillFor = Math.abs(d - lastD) > 1e-4 ? 0 : stillFor + (now - lastNow) / 1000;
    lastD = d;
    lastNow = now;
    sign.visible = rules.sites.kind() === PUSH_RUN_KIND && goal.name === 'lay' && stillFor > 0.8 && !pushing;
    sign.position.y = 2.4 + Math.sin(now / 180) * 0.06;
  },
  { phase: 'update', order: 35 },
);

// For the look evals: where the machine is, whether this tab is pushing.
export const trackMachine = { pose, goal, isPushing: () => pushing, platform: () => platform };
