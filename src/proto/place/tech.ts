// Ancient technology in ?proto=place: the three devices, the slabs across the line, the rings up Needle Bell, and what's hidden on
// paths you've already walked. "Abilities are ancient technology you find"; "Abilities replace curios" (boogle-2.md, The shape of
// the game). Connecting a line gets you to where a device is; you still go and take it. Where and how much: ./tech-layout.ts. The
// moves themselves: ./moves.ts. Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything), 11 (Show, don't tell).
//
//   The first path crosses the gorge beside a pillar you saw from the bridge below: the second jump.
//   Line 2 crosses the stem beside another, up a ledge you can only get onto with that jump: the hook shot.
//   Gate 1, the quarry: a slab across the line, its chain up to a lever on a ledge. Same jump.
//   Gate 2, the rim: dark posts lead to Needle Bell's summit switch. The next construction job reaches the glider at Far Head.
//
// Everything here is shared through `job.tech` and `job.gate` (./job.ts, the `job` slice), so the save and the co-op snapshot read it;
// `coop.tech` says it the moment it happens. What's in the secret boxes is yours (`personalSlice('secretFinds')`). No words but the
// devices' names: the shafts, rings, chain and posts say the rest.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { removeBody, type Body, type Shape } from '../../physics/engine.ts';
import { me } from '../../player/player.ts';
import { NO_TARGETS, registerInteractable, type Interactable } from '../../player/hands.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { camera, scene } from '../../render/scene.ts';
import { getAudio } from '../../render/audio.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { readableGlow, readableUnlit } from '../../render/readable-unlit.ts';
import { protoCount } from '../count.ts';
import { playMark } from '../mark.ts';
import { knock, pop } from '../minis/common.ts';
import { flat } from '../flat.ts';
import { after, barrage, pullOut, shakeView } from './celebrate.ts';
import { coop, coopWire } from './coop.ts';
import { deliver, dropChest, giftState, merged, prizeHooks, type GiftId } from './gifts.ts';
import { H, addStatic, addStatics } from './land.ts';
import { job, personalSlice, save } from './job.ts';
import { ORIGIN, toWorld, lineAt } from './layout.ts';
import { L1, L2 } from './lines.ts';
import { dustRing } from './pieces.ts';
import { gateHere, snapHooks } from './run.ts';
import { RINGS, cancelPull, fireHook, move, resetMoves, syncControls, toggleGlide, whyNot } from './moves.ts';
import { flashCanopy } from './moves-view.ts';
import { gettingItem, rememberGot, youGot } from './got.ts';
import {
  DEVICES,
  FINDERS,
  GATES,
  GLIDE_RAMP,
  JUMP_COURSE,
  JUMP_RECOVERY,
  LEVER,
  PADS,
  PILLARS,
  POSTS,
  SECRETS,
  SEA_SWITCH,
  padById,
  type GateId,
  type Pad,
  type Secret,
  type SecretId,
  type TechId,
} from './tech-layout.ts';

const TEAL = '#39e6c6',
  TEAL_DIM = '#1a5a52',
  STONE = '#917b5e',
  STONE2 = '#b6a080',
  BRASS = '#c79a3e';
const glow = readableGlow(
  new THREE.MeshStandardNodeMaterial({
    color: TEAL,
    emissive: TEAL,
    emissiveIntensity: 1.8,
    roughness: 0.3,
  }),
);
const dark = new THREE.MeshStandardNodeMaterial({ color: '#2a2e30', roughness: 0.7 });
const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
const ox = ORIGIN.x;
const v = new THREE.Vector3();

// ---------------------------------------------------------------- the pads, the pillars and the rock
// Pale landing cap, warm stone body and four brass corner keys. One merged mesh, the same solid footprint.
function stonePad(hx: number, hz: number, thick: number) {
  const parts: Parameters<typeof merged>[0] = [
    ['b', 0, -0.08, 0, hx * 2, thick - 0.16, hz * 2, STONE],
    ['b', 0, thick / 2 - 0.08, 0, hx * 2, 0.16, hz * 2, '#c6b28d'],
    ['b', 0, -thick / 2 + 0.06, 0, hx * 2 + 0.04, 0.12, hz * 2 + 0.04, '#6f604b'],
  ];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) parts.push(['b', sx * (hx - 0.34), -0.02, sz * hz, 0.18, thick - 0.24, 0.045, BRASS]);
  return new THREE.Mesh(merged(parts), partMat);
}
function buildPads() {
  const pads: (Pad & { pitch?: number })[] = [
    ...PADS,
    ...JUMP_RECOVERY.slabs.map((p, i): Pad => ({ ...p, id: `jump-catch-${i}`, top: JUMP_RECOVERY.top, look: 'stone' })),
    ...[JUMP_RECOVERY.ramp, GLIDE_RAMP].map((ramp, i): Pad & { pitch: number } => ({
      ...ramp,
      id: i ? 'glide-ramp' : 'jump-return',
      top: (ramp.high + ramp.low) / 2,
      hz: Math.hypot(ramp.hz, (ramp.high - ramp.low) / 2),
      pitch: Math.atan2(ramp.high - ramp.low, ramp.hz * 2),
      look: 'stone',
    })),
  ];
  for (const p of pads) {
    const thick = p.look === 'float' ? 0.9 : p.look === 'wood' ? 0.4 : 1.2;
    const m =
      p.look === 'wood'
        ? new THREE.Mesh(new THREE.BoxGeometry(p.hx * 2, thick, p.hz * 2), flat('#8a6238', 0.9))
        : stonePad(p.hx, p.hz, thick);
    m.position.set(p.x + ox, p.top - thick / 2, p.z);
    if (p.pitch) {
      m.rotation.x = p.pitch;
      // Keep the rotated top face, not the slab's centre, on the authored ramp endpoints.
      m.position.y = p.top - (Math.cos(p.pitch) * thick) / 2;
      m.position.z -= (Math.sin(p.pitch) * thick) / 2;
    }
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    if (p.ring) {
      // In tiles, each thin enough that the camera arm (src/player/camera-arm.ts) doesn't pull in for it. Looking up at the next ring
      // from a small slab otherwise puts the lens under its edge and your own back fills the screen.
      const shapes: Shape[] = [];
      const nx = Math.ceil(p.hx / 0.75),
        nz = Math.ceil(p.hz / 0.75);
      const hx = p.hx / nx,
        hz = p.hz / nz;
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++)
          shapes.push({
            kind: 'box',
            hx,
            hy: thick / 2,
            hz,
            offset: { x: p.x + ox - p.hx + hx * (i * 2 + 1), y: p.top - thick / 2, z: p.z - p.hz + hz * (j * 2 + 1) },
          });
      addStatics(shapes, { x: 0, y: 0, z: 0 });
    } else addStatic({ kind: 'box', hx: p.hx, hy: thick / 2, hz: p.hz }, m.position, m.quaternion);
    // The slabs that hang in the air: a line of light round the underside, so you can tell they're the old things, from far.
    if (p.look === 'float') {
      const under = new THREE.Mesh(new THREE.BoxGeometry(p.hx * 0.7, 0.1, p.hz * 0.7), glow);
      under.position.set(p.x + ox, p.top - thick - 0.04, p.z);
      scene.add(under);
    }
  }
  // Solid all the way down: what looks solid is solid.
  const apron = padById('apron'),
    lookout = padById('lookout'),
    loft = padById('loft'),
    balcony = padById('balcony'),
    stack = padById('stack');
  for (const b of [...JUMP_COURSE.slice(1), apron, lookout, loft]) {
    const base = JUMP_COURSE.includes(b) ? JUMP_RECOVERY.top : H(b.x + ox, b.z) - 0.5;
    const h = b.top - 1.2 - base;
    if (h <= 0) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.hx * 2 - 0.1, h, b.hz * 2 - 0.1), flat(STONE, 0.9));
    m.position.set(b.x + ox, base + h / 2, b.z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    addStatic({ kind: 'box', hx: b.hx - 0.05, hy: h / 2, hz: b.hz - 0.05 }, { x: b.x + ox, y: base + h / 2, z: b.z });
  }
  // The balcony's column and the sea stack.
  const column = (x: number, z: number, top: number, r0: number, r1: number) => {
    const base = Math.min(H(x + ox, z) - 0.5, top - 1);
    const h = top - base;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 7), flat(STONE, 0.9));
    m.position.set(x + ox, base + h / 2, z);
    m.castShadow = true;
    scene.add(m);
    addStatic({ kind: 'cylinder', rTop: r1, rBottom: r0, h, segments: 7 }, { x: x + ox, y: base + h / 2, z });
  };
  column(balcony.x, balcony.z, balcony.top - 0.4, 1.3, 1.1);
  column(stack.x, stack.z, stack.top - 1.2, 5.4, 3.4);
  for (const q of PILLARS) {
    column(q.x, q.z, q.top - 1.2, q.r + 1.4, q.r - 0.4);
    // A stone lip reaching for where the trestle will go: it was always meant to meet something.
    if (q.lipTo) {
      const dx = q.lipTo.x - q.x,
        dz = q.lipTo.z - q.z;
      const len = Math.hypot(dx, dz);
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, len), flat(STONE2, 0.9));
      // Its inner end overlaps the pillar: a small step keeps their top faces out of the same plane.
      m.position.set(q.x + dx / 2 + ox, q.top - 0.29, q.z + dz / 2);
      m.rotation.y = Math.atan2(dx, dz);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      addStatic(
        { kind: 'box', hx: 1.2, hy: 0.25, hz: len / 2 },
        { x: m.position.x, y: m.position.y, z: m.position.z },
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, m.rotation.y),
      );
    }
  }
}

// ---------------------------------------------------------------- the rings
// One shape everywhere: you learn it once, and it means the same at the river and at the top of the tower. It stands on a little
// stone post, so it's plainly somewhere, and it's there before you can use it.
const RING_N = RINGS.length;
const ringGeo = new THREE.TorusGeometry(0.55, 0.09, 8, 22);
const ringMesh = new THREE.InstancedMesh(
  ringGeo,
  new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.4 }),
  RING_N,
);
ringMesh.frustumCulled = false;
const ringDim = new THREE.Color(BRASS),
  ringNear = new THREE.Color(TEAL),
  ringHot = new THREE.Color('#d6fff5'),
  ringColor = new THREE.Color();
const ringPose = new THREE.Object3D();
const ringHalo = new THREE.Mesh(
  new THREE.TorusGeometry(0.95, 0.045, 6, 28),
  readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#e8fffa', transparent: true, opacity: 0.95 })),
);
ringHalo.visible = false;
function buildRings() {
  scene.add(ringMesh, ringHalo);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.22), flat(STONE, 0.9), RING_N);
  RINGS.forEach((r, k) => {
    ringPose.position.set(r.at.x, (r.at.y - 0.55 + r.pad.top) / 2, r.at.z);
    ringPose.scale.set(1, r.at.y - 0.55 - r.pad.top, 1);
    ringPose.rotation.set(0, 0, 0);
    ringPose.updateMatrix();
    posts.setMatrixAt(k, ringPose.matrix);
    ringPose.scale.set(1, 1, 1);
    addStatic(
      { kind: 'box', hx: 0.11, hy: (r.at.y - 0.55 - r.pad.top) / 2, hz: 0.11 },
      { x: r.at.x, y: ringPose.position.y, z: r.at.z },
    );
  });
  posts.castShadow = true;
  posts.frustumCulled = false;
  scene.add(posts);
}
const camAt = new THREE.Vector3();
function updateRings(now: number) {
  camera.getWorldPosition(camAt);
  RINGS.forEach((r, k) => {
    ringPose.position.copy(r.at);
    ringPose.lookAt(camAt);
    const hot = move.pick === r || move.pull?.ring === r,
      near = move.range.has(r);
    ringPose.scale.setScalar(hot ? 1.18 + Math.sin(now * 0.012) * 0.05 : near ? 1.05 : 0.92);
    ringPose.updateMatrix();
    ringMesh.setMatrixAt(k, ringPose.matrix);
    ringMesh.setColorAt(
      k,
      ringColor
        .copy(hot ? ringHot : near ? ringNear : job.tech.hook ? ringNear : ringDim)
        .multiplyScalar(hot ? 1.6 : near ? 1.2 : 0.75),
    );
  });
  ringMesh.instanceMatrix.needsUpdate = true;
  if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
  const pick = move.pull?.ring ?? move.pick;
  ringHalo.visible = !!pick;
  if (pick) {
    ringHalo.position.copy(pick.at);
    ringHalo.lookAt(camAt);
    ringHalo.scale.setScalar(1 + Math.sin(now * 0.01) * 0.06);
  }
}

// ---------------------------------------------------------------- the devices
// Three of the same family: an old stone drum with a ring of light turning round it and a faint teal shaft you can see across
// the place. Not gold and not orange: those are boxes and the next job. Taking one ends something.
type Device = {
  id: TechId;
  group: THREE.Group;
  ring: THREE.Mesh;
  ring2: THREE.Mesh;
  core: THREE.Mesh;
  shaft: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  t: number; // the show: seconds in, -1 not begun
};
const shaftMat = readableUnlit(
  new THREE.MeshBasicNodeMaterial({
    color: TEAL,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
const DRUM = merged([
  ['c', 0, 0.35, 0, 0.72, 0.7, 0.72, '#55524a'],
  ['c', 0, 0.78, 0, 0.56, 0.16, 0.56, '#6d6a60'],
  ['c', 0, 0.9, 0, 0.5, 0.06, 0.5, BRASS],
]);
const devices = {} as Record<TechId, Device>;
function buildDevices() {
  for (const id of Object.keys(DEVICES) as TechId[]) {
    const d = DEVICES[id];
    const group = new THREE.Group();
    group.position.set(d.x + ox, d.y, d.z);
    const drum = new THREE.Mesh(DRUM, partMat);
    drum.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 26), glow);
    ring.position.y = 1.45;
    ring.rotation.x = Math.PI / 2;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 22), glow);
    ring2.position.y = 1.45;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), glow);
    core.position.y = 1.45;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, id === 'glide' ? 50 : 70, 6), shaftMat);
    shaft.position.y = (id === 'glide' ? 25 : 35) + 1.4;
    group.add(drum, ring, ring2, core, shaft);
    scene.add(group);
    addStatic(
      { kind: 'cylinder', rTop: 0.6, rBottom: 0.72, h: 0.9, segments: 8 },
      { x: d.x + ox, y: d.y + 0.45, z: d.z },
    );
    devices[id] = { id, group, ring, ring2, core, shaft, x: d.x + ox, y: d.y, z: d.z, t: -1 };
  }
}
const NAMES: Record<TechId, string> = { jump: 'A second jump', hook: 'The hook shot', glide: 'The glider' };
const LINES: Record<TechId, string> = {
  jump: 'Jump again in the air.',
  hook: 'Pull yourself to a ring.',
  glide: 'Open it in the air.',
};
// What you wear for each, to hold up when you take it: rings for the ankles, a spool for the forearm, a folded wing.
const WORN_SHAPE: Record<TechId, Parameters<typeof merged>[0]> = {
  jump: [
    ['t', -0.3, 0, 0, 0.32, 0.32, 0.32, TEAL],
    ['t', 0.3, 0, 0, 0.32, 0.32, 0.32, TEAL],
  ],
  hook: [
    ['c', 0, 0, 0, 0.26, 0.5, 0.26, BRASS],
    ['c', 0, 0, 0, 0.3, 0.12, 0.3, TEAL],
    ['k', 0, 0.42, 0, 0.12, 0.34, 0.12, TEAL],
  ],
  glide: [
    ['b', 0, 0, 0, 1.4, 0.05, 0.5, TEAL, 0, 0.12],
    ['b', 0, -0.06, 0, 1.3, 0.06, 0.06, BRASS],
  ],
};
const tealColor = new THREE.Color(TEAL),
  white = new THREE.Color('#f2fffb');
function chord(rootHz: number, vol: number) {
  const au = getAudio();
  if (!au) return;
  const { ctx, out } = au;
  const t0 = ctx.currentTime + 0.01;
  // Not the fanfare: an old bell, struck, with long overtones.
  [1, 2.01, 2.76, 4.07].forEach((m, k) => {
    const o = ctx.createOscillator();
    o.frequency.value = rootHz * m;
    const g = ctx.createGain();
    const peak = (vol * 0.28) / (k + 1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4 / (k + 1));
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 2.6);
  });
}
function swirl(d: Device, n: number) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      r = 1.2 + Math.random() * 1.8;
    emit({
      x: d.x + Math.cos(a) * r,
      y: d.y + 1 + Math.random() * 2,
      z: d.z + Math.sin(a) * r,
      vx: -Math.cos(a) * r * 1.4,
      vy: 1.5 + Math.random() * 2,
      vz: -Math.sin(a) * r * 1.4,
      life: 0.7 + Math.random() * 0.5,
      size: 0.1 + Math.random() * 0.09,
      color: k % 3 ? tealColor : white,
      drag: 1,
      shrink: 0.4,
    });
  }
}
/** Someone took a device. `here`: it was you, so the show and the lesson are yours; a partner gets the news where they stand. */
function gainTech(id: TechId, here: boolean) {
  if (job.tech[id]) return;
  job.tech[id] = true;
  const d = devices[id];
  d.t = 0;
  playMark('ability gained', { what: id });
  protoCount('abilities');
  syncControls();
  if (here) {
    coop.tech(id);
    placeSound(id === 'jump' ? 'pickupJump' : id === 'hook' ? 'pickupHook' : 'pickupGlider', d.x, d.z);
    shakeView(id === 'glide' ? 0.22 : 0.12);
    const b = d;
    barrage(b.x, b.y, b.z, id === 'glide' ? 12 : 6, 0.3, 26, 1.8);
    youGot({
      key: id,
      name: NAMES[id],
      line: LINES[id],
      model: new THREE.Mesh(merged(WORN_SHAPE[id]), partMat),
      from: new THREE.Vector3(b.x, b.y + 1.45, b.z),
      done: () => {
        if (id === 'hook') after(0.3, demoHook);
      },
    });
    if (id === 'glide') flashCanopy(2.6);
  } else {
    showPeerTech(id);
  }
  save();
}
function showPeerTech(id: TechId) {
  youGot({ key: id, name: NAMES[id], model: new THREE.Mesh(merged(WORN_SHAPE[id]), partMat) });
}
coopWire.techChanged = (before, quiet) => {
  for (const id of ['jump', 'hook', 'glide'] as const) {
    if (quiet && job.tech[id]) rememberGot(id);
    else if (!before[id] && job.tech[id]) showPeerTech(id);
  }
};
/** And across to the first slab, the first time: the ring tells you the rest. */
function demoHook() {
  const r = RINGS.find((q) => q.pad.id === 't0');
  if (r) fireHook(r);
}
function updateDevices(dt: number, now: number) {
  for (const d of Object.values(devices)) {
    const owned = job.tech[d.id];
    const spin = d.t >= 0 && d.t < 2 ? 14 * (1 - d.t / 2) + 1 : owned ? 0 : 1;
    d.ring.rotation.z += dt * spin;
    d.ring2.rotation.y += dt * spin * 1.4;
    d.core.rotation.y += dt * (owned ? 0 : 1.2);
    d.core.position.y = 1.45 + (owned ? 0 : Math.sin(now * 0.002) * 0.06);
    d.shaft.visible = !owned;
    if (d.t >= 0) {
      d.t += dt;
      if (d.t < 1.4 && Math.random() < dt * 60) swirl(d, 2);
      const s = d.t < 1.2 ? 1 + d.t * 0.4 : Math.max(0.01, 1.48 - (d.t - 1.2) * 2.4);
      d.ring.scale.setScalar(s);
      d.ring2.scale.setScalar(s);
      d.core.scale.setScalar(s);
      if (s <= 0.02) {
        d.t = -1;
        d.ring.visible = d.ring2.visible = d.core.visible = false;
      }
    } else {
      d.ring.visible = d.ring2.visible = d.core.visible = !owned;
      d.ring.scale.setScalar(1);
      d.ring2.scale.setScalar(1);
      d.core.scale.setScalar(1);
    }
  }
}

// ---------------------------------------------------------------- the gates
type Gate = { id: GateId; slab: THREE.Group; body: Body | null; t: number; y0: number; drop: number };
const gates = {} as Record<GateId, Gate>;
const SLAB = { w: 6.4, h: 5.4, d: 0.9, pillar: 1.1 };
const gateQ = (yaw: number) => new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
function buildGates() {
  for (const id of Object.keys(GATES) as GateId[]) {
    const g = GATES[id];
    const x = g.x + ox;
    // Two stone jambs, and the slab between them. It doesn't stop you walking round: it stops the machine, and you can see that.
    const frame = new THREE.Group();
    frame.position.set(x, g.y, g.z);
    frame.rotation.y = g.yaw;
    if (id === 'quarry') {
      // Prepared earth follows the authored route on both sides, without granting any track.
      const formation = new THREE.Group();
      formation.rotation.y = -g.yaw;
      const vertices: number[] = [];
      const p = { x: 0, z: 0, ux: 0, uz: 1 };
      const edge = (s: number, side: number) => {
        lineAt(L2.spec.line, s, p);
        const wx = p.x + ox + p.uz * side,
          wz = p.z - p.ux * side;
        return [wx - x, H(wx, wz) + 0.045 - g.y, wz - g.z];
      };
      for (let s = g.s - 20; s < g.s + 20; s += 2) {
        const a = edge(s, -2),
          b = edge(s, 2),
          c = edge(s + 2, -2),
          d = edge(s + 2, 2);
        vertices.push(...a, ...b, ...c, ...b, ...d, ...c);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.computeVertexNormals();
      const earth = new THREE.Mesh(geo, flat('#806546').clone());
      earth.material.side = THREE.DoubleSide;
      earth.receiveShadow = true;
      formation.add(earth);
      for (const offset of [-16, -8, 8, 16])
        for (const side of [-2.3, 2.3]) {
          const at = edge(g.s + offset, side);
          const stake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), flat('#f5cf84'));
          stake.position.set(at[0]!, at[1]! + 0.65, at[2]!);
          stake.castShadow = true;
          formation.add(stake);
        }
      frame.add(formation);
      buildChestStands(frame);
    }
    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(SLAB.pillar, SLAB.h + 0.8, SLAB.pillar), flat(STONE, 0.9));
      jamb.position.set((side * (SLAB.w + SLAB.pillar)) / 2, (SLAB.h + 0.8) / 2, 0);
      jamb.castShadow = true;
      frame.add(jamb);
      const q = gateQ(frame.rotation.y);
      const cx = x + Math.cos(frame.rotation.y) * jamb.position.x,
        cz = g.z - Math.sin(frame.rotation.y) * jamb.position.x;
      addStatic(
        { kind: 'box', hx: SLAB.pillar / 2, hy: (SLAB.h + 0.8) / 2, hz: SLAB.pillar / 2 },
        { x: cx, y: g.y + (SLAB.h + 0.8) / 2, z: cz },
        q,
      );
    }
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(SLAB.w + SLAB.pillar * 2, 0.5, SLAB.pillar + 0.3),
      flat(STONE2, 0.9),
    );
    lintel.position.set(0, SLAB.h + 1.05, 0);
    lintel.castShadow = true;
    frame.add(lintel);
    scene.add(frame);
    const slab = new THREE.Group();
    slab.position.copy(frame.position);
    slab.rotation.copy(frame.rotation);
    // Two weathered leaves, recessed joints and a locked circular seal. Merge the relief into the face:
    // this costs the same draw as the old blank box, and the faint stone fill keeps its shaded side readable.
    const stoneParts: Parameters<typeof merged>[0] = [['b', 0, SLAB.h / 2, 0, SLAB.w, SLAB.h, SLAB.d, '#726e60']];
    for (const side of [-1, 1]) {
      const z = side * (SLAB.d / 2 + 0.045);
      for (const leaf of [-1, 1]) {
        for (let course = 0; course < 3; course++)
          stoneParts.push([
            'b',
            leaf * 1.58,
            0.88 + course * 1.78,
            z,
            3.08,
            1.7,
            0.12,
            course % 2 ? '#aaa18c' : '#928b78',
          ]);
        stoneParts.push(['b', leaf * 2.75, 2.7, z + side * 0.08, 0.2, 4.8, 0.16, '#b5ac92']);
      }
      stoneParts.push(
        ['t', 0, SLAB.h / 2, z + side * 0.14, 0.65, 0.16, 0.65, BRASS, Math.PI / 2],
        ['b', 0, SLAB.h / 2, z + side * 0.18, 0.28, 1.1, 0.16, TEAL_DIM],
      );
    }
    const face = new THREE.Mesh(
      merged(stoneParts),
      new THREE.MeshStandardNodeMaterial({
        vertexColors: true,
        roughness: 0.95,
        emissive: '#686354',
        emissiveIntensity: 0.18,
      }),
    );
    face.castShadow = true;
    slab.add(face);
    // A dead seam of the same light, on both faces: you've seen that colour on a device.
    for (const side of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(SLAB.w * 0.7, 0.14, 0.03), dark);
      seam.position.set(0, SLAB.h / 2, side * (SLAB.d / 2 + 0.01));
      seam.name = 'seam';
      slab.add(seam);
    }
    scene.add(slab);
    gates[id] = { id, slab, body: null, t: -1, y0: g.y, drop: SLAB.h + 0.6 };
    placeSlab(gates[id]);
  }
  buildChain();
}
function placeSlab(g: Gate) {
  const down = job.gate[g.id];
  const spec = GATES[g.id];
  if (down && g.body) {
    removeBody(g.body);
    g.body = null;
  }
  if (!down && !g.body) {
    g.body = addStatic(
      { kind: 'box', hx: SLAB.w / 2, hy: SLAB.h / 2, hz: SLAB.d / 2 },
      { x: spec.x + ox, y: spec.y + SLAB.h / 2, z: spec.z },
      gateQ(spec.yaw),
    );
  }
  if (g.t < 0) g.slab.position.y = down ? g.y0 - g.drop : g.y0;
}
let seaCameraPending = false;
function openGate(id: GateId, here: boolean) {
  if (job.gate[id]) return;
  job.gate[id] = true;
  const g = gates[id];
  playMark('gate opened', { gate: id });
  protoCount('gates');
  if (here) coop.tech(id);
  const spec = GATES[id];
  const drop = () => {
    g.t = 0;
    placeSlab(g);
    thump(spec.x + ox, spec.z);
    whistle(spec.x + ox, spec.z);
    shakeView(0.14);
    dustRing(spec.x + ox, spec.y + 0.4, spec.z, 16, 5, 0.5);
    clank(spec.x + ox, spec.z);
  };
  if (id === 'sea') {
    // Light down the posts, one by one, from the tower to the slab; then it falls.
    litT = 0;
    if (here) seaCameraPending = true;
    after(POSTS.length * POST_GAP + 0.4, drop);
  } else drop();
  save();
}
/** Coop: a partner took a device or let a slab down. */
coopWire.tech = (what) => {
  if (what === 'jump' || what === 'hook' || what === 'glide') gainTech(what, false);
  else if (what === 'quarry' || what === 'sea') openGate(what, false);
};
function updateGates(dt: number) {
  for (const g of Object.values(gates)) {
    if (g.t < 0) continue;
    g.t += dt;
    const u = Math.min(1, g.t / 1.5);
    g.slab.position.y = g.y0 - g.drop * (u * u * (3 - 2 * u));
    if (u >= 1) g.t = -1;
  }
  lever.rotation.z += ((job.gate.quarry ? -0.85 : 0.75) - lever.rotation.z) * Math.min(1, dt * 10);
  const handle = seaSwitch.children[0];
  if (handle) handle.rotation.z = job.gate.sea ? -0.7 : 0.7;
}

// ---------------------------------------------------------------- gate 1: the chain, the winch, the lever
const lever = new THREE.Group();
const seaSwitch = new THREE.Mesh(DRUM, partMat);
const chainLink = new THREE.TorusGeometry(0.1, 0.03, 5, 8);
function buildChain() {
  const g = GATES.quarry;
  const a = new THREE.Vector3(g.x + ox, g.y + SLAB.h + 1.25, g.z),
    b = new THREE.Vector3(LEVER.x + ox + 0.8, LEVER.y + 1, LEVER.z - 0.6);
  const n = Math.round(a.distanceTo(b) / 0.2);
  const links = new THREE.InstancedMesh(chainLink, flat('#3a3530', 0.8), n);
  const o = new THREE.Object3D();
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    o.position.lerpVectors(a, b, t);
    o.position.y -= Math.sin(t * Math.PI) * 0.55; // it hangs a little
    o.lookAt(b);
    o.rotateZ(k % 2 ? Math.PI / 2 : 0);
    o.updateMatrix();
    links.setMatrixAt(k, o.matrix);
  }
  links.castShadow = true;
  links.frustumCulled = false;
  scene.add(links);
  const winch = new THREE.Mesh(
    merged([
      ['c', 0, 0.7, 0, 0.42, 1, 0.42, '#6b5a3a', 0, Math.PI / 2],
      ['b', -0.6, 0.35, 0, 0.12, 0.7, 0.8, '#4e4c46'],
      ['b', 0.6, 0.35, 0, 0.12, 0.7, 0.8, '#4e4c46'],
    ]),
    partMat,
  );
  winch.position.set(LEVER.x + ox + 0.8, LEVER.y, LEVER.z - 0.6);
  winch.castShadow = true;
  scene.add(winch);
  lever.position.set(LEVER.x + ox - 0.5, LEVER.y + 0.15, LEVER.z + 0.3);
  const arm = new THREE.Mesh(
    merged([
      ['b', 0, 0.6, 0, 0.12, 1.3, 0.12, BRASS],
      ['s', 0, 1.3, 0, 0.17, 0.17, 0.17, '#d8392b'],
    ]),
    partMat,
  );
  arm.castShadow = true;
  lever.add(arm);
  lever.rotation.z = 0.75;
  scene.add(lever);
  // What the ledge is for, from the ground: a teal band round its top edge, the device's colour, and scuffs where someone got up.
  const ap = padById('apron');
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(ap.hx * 2 + 0.06, 0.12, ap.hz * 2 + 0.06),
    readableGlow(new THREE.MeshStandardNodeMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 0.9 })),
  );
  band.position.set(ap.x + ox, ap.top - 0.1, ap.z);
  scene.add(band);
}

// ---------------------------------------------------------------- gate 2: the posts
const POST_GAP = 0.2;
let litT = -1;
const postLamps = new THREE.InstancedMesh(
  new THREE.OctahedronGeometry(0.22),
  new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.3 }),
  POSTS.length,
);
const postDark = new THREE.Color(TEAL_DIM),
  postLit = new THREE.Color(TEAL).multiplyScalar(2.2);
function buildPosts() {
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), flat('#403f3a', 0.9), POSTS.length);
  const o = new THREE.Object3D();
  POSTS.forEach((p, k) => {
    const x = p.x + ox,
      y = H(x, p.z);
    o.position.set(x, y + 1.3, p.z);
    o.rotation.y = k * 0.9;
    o.updateMatrix();
    posts.setMatrixAt(k, o.matrix);
    o.position.set(x, y + 2.9, p.z);
    o.updateMatrix();
    postLamps.setMatrixAt(k, o.matrix);
    postLamps.setColorAt(k, postDark);
    addStatic({ kind: 'box', hx: 0.25, hy: 1.3, hz: 0.25 }, { x, y: y + 1.3, z: p.z });
  });
  posts.castShadow = true;
  posts.frustumCulled = postLamps.frustumCulled = false;
  scene.add(posts, postLamps);
}
function drawLamps(dt: number) {
  if (litT < 0) return;
  litT += dt;
  const on = litT / POST_GAP;
  for (let k = 0; k < POSTS.length; k++) {
    // From the tower's end first.
    const idx = POSTS.length - 1 - k;
    if (on >= k) postLamps.setColorAt(idx, postLit);
    else postLamps.setColorAt(idx, postDark);
    if (Math.floor(on) === k && Math.floor(on - dt / POST_GAP) !== k) {
      const q = POSTS[idx]!;
      if (!reducedMotion) dustRing(q.x + ox, H(q.x + ox, q.z) + 2.9, q.z, 4, 1, 0.2);
      pop(Math.min(7, Math.floor(k / 2)), 0.4);
    }
  }
  if (postLamps.instanceColor) postLamps.instanceColor.needsUpdate = true;
  if (on > POSTS.length + 1) litT = -1;
}
function snapLampsTo(on: boolean) {
  litT = -1;
  for (let k = 0; k < POSTS.length; k++) postLamps.setColorAt(k, on ? postLit : postDark);
  if (postLamps.instanceColor) postLamps.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------- what's hidden
const found = new Set<SecretId>();
const hubbed = new Set<SecretId>();
const passed = (s: Secret) =>
  s.after === 'hook'
    ? job.tech.hook
    : s.after === 'glide'
      ? job.tech.glide
      : s.after === 'trains'
        ? job.rung.trains
        : job.ended;
const yOf = (s: Secret) => (s.y === null ? H(s.x + ox, s.z) : s.y);
const hubSlot = (k: number) => {
  // In a row in front of the finders' bay, on the village's side of the path.
  const row = k % 2;
  return { x: toWorld(FINDERS.x + 1.5 + row * 1.1), z: FINDERS.z - 2.4 + (k >> 1) * 1.15 };
};
function putFinds() {
  const waiting = giftState.crates();
  for (const s of SECRETS) {
    if (found.has(s.id)) continue;
    const x = s.x + ox;
    if (!waiting.some((c) => c.content === s.gift && Math.hypot(c.x - x, c.z - s.z) < 1))
      deliver(x, yOf(s), s.z, null, s.gift as GiftId);
    if (hubbed.has(s.id) && !waiting.some((c) => c.content === s.gift && Math.hypot(c.x - x, c.z - s.z) >= 1)) {
      const q = hubSlot(SECRETS.indexOf(s));
      deliver(q.x, H(q.x, q.z), q.z, null, s.gift as GiftId);
    }
  }
}
function buildChestStands(root: THREE.Group) {
  for (const s of SECRETS.filter((s) => s.area === 'tower')) {
    const x = s.x + ox,
      y = yOf(s) - 0.5;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1, 1.2), flat(STONE2));
    stand.position.set(x, y, s.z);
    stand.castShadow = stand.receiveShadow = true;
    stand.position.sub(root.position).applyQuaternion(root.quaternion.clone().invert());
    stand.quaternion.copy(root.quaternion).invert();
    root.add(stand);
    addStatic({ kind: 'box', hx: 0.85, hy: 0.5, hz: 0.6 }, { x, y, z: s.z });
  }
}
function updateMissed() {
  for (const s of SECRETS) {
    if (found.has(s.id) || hubbed.has(s.id) || !passed(s)) continue;
    hubbed.add(s.id);
    const q = hubSlot(SECRETS.indexOf(s));
    deliver(q.x, H(q.x, q.z), q.z, null, s.gift as GiftId);
    playMark('secret at the hub', { id: s.id });
  }
}
prizeHooks.found = (id) => {
  const s = SECRETS.find((q) => q.gift === id);
  if (!s) return;
  found.add(s.id);
  // Whichever you opened, the other one's gone: it's one thing, in two places.
  dropChest(id);
  playMark('secret found', { id: s.id, area: s.area, how: s.how, hub: hubbed.has(s.id) });
  protoCount('secrets');
  chord(330, 0.45);
  save();
};
personalSlice('secretFinds', {
  get: () => ({ found: [...found], hubbed: [...hubbed] }),
  set: (j) => {
    const q = (j ?? {}) as { found?: unknown; hubbed?: unknown };
    found.clear();
    hubbed.clear();
    const known = (x: unknown): x is SecretId => SECRETS.some((s) => s.id === x);
    if (Array.isArray(q.found)) for (const x of q.found) if (known(x)) found.add(x);
    if (Array.isArray(q.hubbed)) for (const x of q.hubbed) if (known(x)) hubbed.add(x);
  },
});

// ---------------------------------------------------------------- the clues: on paths you've walked, what makes you look twice
function buildClues() {
  const prop = (parts: Parameters<typeof merged>[0], x: number, y: number, z: number, yaw = 0, solid = false) => {
    const m = new THREE.Mesh(merged(parts), partMat);
    m.position.set(x + ox, y, z);
    m.rotation.y = yaw;
    m.castShadow = true;
    scene.add(m);
    if (solid) addStatic({ kind: 'box', hx: 0.15, hy: 1.2, hz: 0.15 }, { x: x + ox, y: y + 1.2, z });
    return m;
  };
  // The yard sits behind the cottage: laundry and its optional gift invite a detour,
  // leaving the shore-to-town approach clear. The fence keeps its opening on the east.
  const gy = H(-127.5 + ox, 25.5);
  prop(
    [
      ['b', 0, 1.1, 0, 0.12, 2.2, 0.12, '#7f5630'],
      ['b', 3.2, 2.05, -0.8, 6.6, 0.03, 0.03, '#e8e0d0'],
      ['b', 1.4, 1.65, -0.4, 0.7, 0.75, 0.04, '#d8392b'],
      ['b', 2.6, 1.7, -0.7, 0.55, 0.65, 0.04, '#3f6fb0'],
      ['b', 4.0, 1.68, -1.0, 0.6, 0.7, 0.04, '#f2e6c8'],
    ],
    -130,
    gy,
    22,
    0.25,
    true,
  );
  const fence: [number, number, number, number][] = [
    [-130.6, 26, 0.14, 8],
    [-127.5, 30.2, 6.2, 0.14],
  ];
  for (const [x, z, hx, hz] of fence) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(hx, 1, hz), flat('#8a6238', 0.9));
    m.position.set(x + ox, gy + 0.5, z);
    m.castShadow = true;
    scene.add(m);
    addStatic({ kind: 'box', hx: hx / 2, hy: 0.5, hz: hz / 2 }, { x: x + ox, y: gy + 0.5, z });
  }
  // The lookout: a scarf caught on a dead branch, over the shelf you'd pass under.
  const lk = padById('lookout');
  prop(
    [
      ['c', 0, 1.8, 0, 0.13, 3.6, 0.13, '#5c4530'],
      ['b', 0.5, 3.1, 0, 1.1, 0.07, 0.07, '#5c4530'],
      ['b', 0.9, 2.6, 0, 0.14, 0.95, 0.03, '#5f8f3e'],
    ],
    lk.x - 1.6,
    lk.top,
    lk.z + 1.6,
    0.6,
  );
  // The bell: a little bell under a bracket on the bank, under the trestle. You hear it as you cross the footbridge.
  const by = H(-36.4 + ox, -78);
  prop(
    [
      ['b', 0, 1.2, 0, 0.14, 2.4, 0.14, '#6e4c2a'],
      ['b', 0.4, 2.3, 0, 0.9, 0.1, 0.1, '#6e4c2a'],
      ['k', 0.75, 2.02, 0, 0.17, 0.34, 0.17, BRASS],
    ],
    -38.4,
    by,
    -76.5,
    0.8,
    true,
  );
  bellAt.set(-36.4 + ox, by + 1, -78);
  // The nook's crate and hook ring explain the side trip. Its old red cloth read as a meaningless course flag.
  // The loft: a yellow hard hat's worth of colour up on the rock, and a boot-scuffed ring post.
  const lf = padById('loft');
  prop([['b', 0, 0.3, 0, 0.6, 0.6, 0.6, '#f2c81a']], lf.x + 1.5, lf.top, lf.z + 1.8, 0.3);
  // The balcony: a canopy-shaped weather vane, seen from the first steps of the game.
  const bc = padById('balcony');
  prop(
    [
      ['b', 0, 2, 0, 0.1, 4, 0.1, '#3a302c'],
      ['s', 0, 4.1, 0, 1.2, 0.3, 0.46, '#2fb7a0'],
      ['b', 0, 3.8, 0, 2.4, 0.06, 0.06, BRASS],
    ],
    bc.x - 2,
    bc.top,
    bc.z - 2,
    0.5,
    true,
  );
  // The stack: a bright flag, off the side of the sea trestle.
  const st = padById('stack');
  prop(
    [
      ['b', 0, 2, 0, 0.1, 4, 0.1, '#3a302c'],
      ['b', 0.7, 3.6, 0, 1.3, 0.8, 0.04, '#f0752c'],
    ],
    st.x + 2,
    st.top,
    st.z - 2,
    1,
  );
}
// A quiet bell now and then, near where it hangs: the only thing telling you to look under the bridge.
const bellAt = new THREE.Vector3();
let bellT = 3;
function updateBell(dt: number) {
  const b = me.body;
  if (!b || found.has('bell')) return;
  const d = Math.hypot(b.position.x - bellAt.x, b.position.y - bellAt.y, b.position.z - bellAt.z);
  if (d > 34) return;
  bellT -= dt;
  if (bellT > 0) return;
  bellT = 3.5 + Math.random() * 2;
  chord(880, 0.18 * (1 - d / 40));
}

// ---------------------------------------------------------------- Interact
const at = new THREE.Vector3(),
  at2 = new THREE.Vector3();
registerInteractable(() => {
  const b = me.body;
  if (!b) return NO_TARGETS;
  const p = b.interpolatedPosition;
  let out: Interactable[] | null = null;
  for (const id of Object.keys(DEVICES) as TechId[]) {
    if (job.tech[id]) continue;
    if (id === 'glide' && !L2.open) continue;
    const d = devices[id];
    if (Math.hypot(p.x - d.x, p.z - d.z) > 3 || Math.abs(p.y - d.y) > 2.2) continue;
    (out ??= []).push({
      id: `place-${id}`,
      verb: 'Take it',
      at: at.set(d.x, d.y + 2.2, d.z),
      run: () => gainTech(id, true),
    });
  }
  if (!job.gate.quarry) {
    const x = LEVER.x + ox,
      z = LEVER.z;
    if (Math.hypot(p.x - x, p.z - z) < 3 && p.y > LEVER.y - 0.2)
      (out ??= []).push({
        id: 'place-lever',
        verb: 'Pull',
        at: at2.set(x - 0.5, LEVER.y + 1.7, z + 0.3),
        run: () => {
          knock(0.5, 1);
          openGate('quarry', true);
        },
      });
  }
  if (
    !job.gate.sea &&
    Math.hypot(p.x - SEA_SWITCH.x - ox, p.z - SEA_SWITCH.z) < 3 &&
    Math.abs(p.y - SEA_SWITCH.y) < 2.2
  ) {
    (out ??= []).push({
      id: 'place-sea-switch',
      verb: 'Pull',
      at: new THREE.Vector3(SEA_SWITCH.x + ox, SEA_SWITCH.y + 1.7, SEA_SWITCH.z),
      run: () => openGate('sea', true),
    });
  }
  return out ?? NO_TARGETS;
});

/** Keep the telemetry label empty while the next move or gate takes precedence over the job. */
export function hasTechGoal() {
  if (L1.open && !job.tech.jump) return true;
  if (L2.stage >= 2 && !job.tech.hook) return true;
  const gate = gateHere();
  return gate === 'quarry' || gate === 'sea';
}

// ---------------------------------------------------------------- the frame, and putting it all right
export function updateTech(dt: number, now: number) {
  // Unlock/save/broadcast immediately; only this player's camera waits for every reward card to be dismissed.
  if (seaCameraPending && !gettingItem()) {
    seaCameraPending = false;
    const from = padById('summit'),
      spec = GATES.sea;
    pullOut(
      v.set(from.x + ox - 12, from.top + 14, from.z + 22).clone(),
      v.set(from.x + ox - 4, from.top + 18, from.z + 26).clone(),
      v.set(spec.x + ox, spec.y + 4, spec.z).clone(),
      4.4,
    );
  }
  updateRings(now);
  updateDevices(dt, now);
  updateGates(dt);
  drawLamps(dt);
  updateBell(dt);
  updateMissed();
  // Fallen off the top with no glider and nothing wrong: `Back up the path` (./verbs.ts) handles it.
}
export function snapTech() {
  resetMoves();
  syncControls();
  for (const g of Object.values(gates)) {
    g.t = -1;
    placeSlab(g);
  }
  snapLampsTo(job.gate.sea);
  for (const id of Object.keys(devices) as TechId[]) devices[id].t = -1;
  putFinds();
}
snapHooks.push(snapTech);
export function resetFinds() {
  seaCameraPending = false;
  found.clear();
  hubbed.clear();
  move.jumps = move.pulls = move.flights = move.opened = 0;
}
export function buildTech() {
  buildPads();
  buildRings();
  buildDevices();
  seaSwitch.position.set(SEA_SWITCH.x + ox, SEA_SWITCH.y, SEA_SWITCH.z);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), glow);
  handle.position.y = 1.4;
  handle.rotation.z = 0.7;
  seaSwitch.add(handle);
  seaSwitch.castShadow = true;
  scene.add(seaSwitch);
  addStatic(
    { kind: 'cylinder', rTop: 0.6, rBottom: 0.72, h: 0.9, segments: 8 },
    { x: seaSwitch.position.x, y: SEA_SWITCH.y + 0.45, z: SEA_SWITCH.z },
  );
  buildPosts();
  buildGates();
  buildClues();
}
// For the evals, on `window.__place.tech`.
export const techApi = {
  RINGS,
  DEVICES,
  SECRETS,
  LEVER,
  SEA_SWITCH,
  GATES,
  PADS,
  JUMP_COURSE,
  JUMP_RECOVERY,
  move,
  found,
  hubbed,
  fireHook,
  cancelPull,
  toggleGlide,
  whyNot,
  devices,
  take: (id: TechId) => gainTech(id, true),
  open: (id: GateId) => openGate(id, true),
};
