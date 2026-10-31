// Work sites (src/world/rules/sites.ts): one per section of the preset railway, from the court toward the lighthouse.
// Each has a Track ring and a Helper ring; walk into one carrying the age's material and your stack pours in, a few
// pieces at a time. Sleepers pile up in the Track ring as it fills, a hut frame rises once the Helper ring is full, and
// the plaque lists who brought what (credit only: nobody is listed for not pouring). Placeholder visuals (0.1).
// Serves DESIGN.md 4 (cooperation is automatic: everyone's pours land in the same ring) and 6 (communal world,
// personal rewards: the section is everyone's, the plaque line and your tier are yours). Lockstep sites, Local view.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.js';
import { scene } from '../render/scene.js';
import { onApplied, submitEdit } from '../world/sync.ts';
import { sharedSeconds } from '../netplay/shared-time.ts';
import { registerInteractable } from '../player/hands.js';
import { groundHeight } from '../adapters/terrain.js';
import { me } from '../player/player.js';
import { identity } from '../player/identity.ts';
import { ROUTE, TRACK, HELPER, RING_R, ringAt, costOf } from '../sim/route.ts';
import { materialOf, MATERIALS } from '../sim/materials.ts';
import { pieceMesh, pieceColor, commitPieces } from '../render/haul-pieces.ts';
import { MACHINE_RUN } from '../sim/scripted-run.ts';
import type { Site } from '../sim/sites.ts';

const POUR_EVERY_MS = 300; // one site.stock this often while you stand in a ring
const POUR_N = 2; // pieces per pour
const SLEEPERS = 12; // drawn in a full Track ring
const { sites } = rules.sites;

const ringGeo = new THREE.RingGeometry(RING_R - 0.18, RING_R, 40).rotateX(-Math.PI / 2);
const ringMat = [
  new THREE.MeshBasicNodeMaterial({ color: '#f0c070', transparent: true, opacity: 0.85, depthWrite: false }),
  new THREE.MeshBasicNodeMaterial({ color: '#8fe0a0', transparent: true, opacity: 0.85, depthWrite: false }),
];
const doneMat = new THREE.MeshBasicNodeMaterial({
  color: '#9aa3ad',
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
});
const sleepers = pieceMesh(ROUTE.length * SLEEPERS);
const hutMat = new THREE.MeshStandardNodeMaterial({ color: '#b08454', roughness: 0.9, flatShading: true });
const postMat = new THREE.MeshStandardNodeMaterial({ color: '#6b4a2b', roughness: 0.9 });

type Label = {
  c: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  sprite: THREE.Sprite;
  text: string;
};
function label(w = 512, h = 128): Label {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.renderOrder = 10;
  const g = c.getContext('2d');
  if (!g) throw new Error('work-sites: no 2D canvas');
  return { c, g, tex, sprite, text: '' };
}
function paint(l: Label, lines: string[], bg = 'rgba(40, 26, 12, 0.72)'): void {
  const text = lines.join('\n');
  if (text === l.text) return;
  l.text = text;
  const { g, c } = l;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = bg;
  g.beginPath();
  if (g.roundRect) g.roundRect(4, 4, c.width - 8, c.height - 8, 18);
  else g.rect(4, 4, c.width - 8, c.height - 8);
  g.fill();
  g.fillStyle = '#fff7e8';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = (c.height - 16) / lines.length;
  lines.forEach((t: string, k: number) => {
    g.font = `${k ? 600 : 800} ${Math.round(lh * 0.62)}px Figtree, system-ui, sans-serif`;
    g.fillText(t, c.width / 2, 8 + lh * (k + 0.5), c.width - 24);
  });
  l.tex.needsUpdate = true;
}

const views = ROUTE.map((sec, s) => {
  const v = {
    rings: [] as THREE.Mesh[],
    ringLabels: [] as Label[],
    hut: new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), hutMat),
    plaque: label(512, 256),
  };
  for (const ring of [TRACK, HELPER]) {
    const p = ringAt(s, ring);
    const y = groundHeight(p.x, p.z) + 0.06;
    const mesh = new THREE.Mesh(ringGeo, ringMat[ring]);
    mesh.position.set(p.x, y, p.z);
    scene.add(mesh);
    v.rings.push(mesh);
    const l = label();
    l.sprite.scale.set(2.4, 0.6, 1);
    l.sprite.position.set(p.x, y + 1.6, p.z);
    scene.add(l.sprite);
    v.ringLabels.push(l);
  }
  const y = groundHeight(sec.x, sec.z);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), postMat);
  post.position.set(sec.x, y + 0.8, sec.z - 1.2);
  scene.add(post);
  v.plaque.sprite.scale.set(2.6, 1.3, 1);
  v.plaque.sprite.position.set(sec.x, y + 2.2, sec.z - 1.2);
  scene.add(v.plaque.sprite);
  const h = ringAt(s, HELPER);
  v.hut.position.set(h.x + 1.9, groundHeight(h.x + 1.9, h.z) + 0.6, h.z);
  v.hut.visible = false;
  scene.add(v.hut);
  return v;
});

let names = 0; // bumped by who.set: the plaques print roster names
onApplied((e: { op: string }) => e.op === 'who.set' && names++);

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  one = new THREE.Vector3(1, 1, 1),
  up = new THREE.Vector3(0, 1, 0),
  sleeperScale = new THREE.Vector3(2.2, 0.8, 1.4),
  at = new THREE.Vector3();

// A ring's second label line.
function ringLine(x: Site, s: number, ring: number, k: number): string {
  if (rules.sites.isDone(s)) return 'laid';
  if (ring === TRACK && x.t0 >= 0) return 'laying track…';
  if (ring === HELPER && x.helpers) return 'built';
  return `${x.stock[ring]} / ${costOf(s, ring)} ${MATERIALS[k]}${s === sites.open ? '' : ' · later'}`;
}
function redraw() {
  let c = 0;
  sites.list.forEach((x, s) => {
    const v = views[s];
    const open = s === sites.open;
    const k = materialOf(ROUTE[s].age);
    for (const ring of [TRACK, HELPER]) {
      v.rings[ring].material = open ? ringMat[ring] : doneMat;
      paint(v.ringLabels[ring], [ring === TRACK ? 'Track' : 'Helper hut', ringLine(x, s, ring, k)]);
    }
    v.hut.visible = x.helpers > 0;
    // sleepers stacked in the Track ring as it fills
    const p = ringAt(s, TRACK);
    const shown = rules.sites.isDone(s) ? 0 : Math.round((SLEEPERS * x.stock[TRACK]) / costOf(s, TRACK));
    for (let m = 0; m < shown; m++) {
      at.set(p.x + ((m % 3) - 1) * 0.5, groundHeight(p.x, p.z) + 0.12 + Math.floor(m / 3) * 0.2, p.z);
      q.setFromAxisAngle(up, Math.PI / 2 + (Math.floor(m / 3) % 2) * 0.1);
      sleepers.setMatrixAt(c, m4.compose(at, q, one));
      sleepers.setColorAt(c++, pieceColor(k));
    }
    // the plaque: everyone who brought something, most first (names from the roster)
    const rows = x.plaque
      .filter((r) => r[1] > 0)
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 4)
      .map((r) => `${rules.roster.nameOf(r[0]) || '?'}  ${r[1]}`);
    paint(v.plaque, [`Section ${s + 1}`, ...(rows.length ? rows : ['—'])]);
  });
  commitPieces(sleepers, c);
}

// The railway: two rails and sleepers along each laid section, and along the running one up to the machine.
const RAIL_STEP = 1.1; // metres between sleepers
const rails = pieceMesh(ROUTE.length * 40);
const railMat = new THREE.MeshStandardNodeMaterial({ color: '#5c5f66', roughness: 0.5, metalness: 0.6 });
const railGeo = new THREE.BoxGeometry(0.08, 0.08, 1);
const railMeshes = ROUTE.map(() =>
  [-0.45, 0.45].map((off) => {
    const m = new THREE.Mesh(railGeo, railMat);
    m.visible = false;
    scene.add(m);
    return { m, off };
  }),
);
// The machine: a placeholder track layer (a box with a funnel) that crawls the section during its run.
const machine = new THREE.Group();
machine.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2), hutMat));
const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 10), postMat);
funnel.position.set(0, 0.75, -0.6);
machine.add(funnel);
machine.visible = false;
scene.add(machine);

// Each section's length and heading, fixed.
const LINES = ROUTE.map((sec) => ({
  len: Math.hypot(sec.to[0] - sec.x, sec.to[1] - sec.z),
  yaw: Math.atan2(sec.to[0] - sec.x, sec.to[1] - sec.z),
}));
const lerp2 = (s: number, u: number) => {
  const a = ROUTE[s],
    [bx, bz] = a.to;
  const x = a.x + (bx - a.x) * u,
    z = a.z + (bz - a.z) * u;
  return at.set(x, groundHeight(x, z), z);
};
const WARM = MACHINE_RUN[0].len,
  LAY = MACHINE_RUN[1].len; // 'lay'
// How far along section s the track is laid, 0..1, at shared time `tick` (fractional).
function laid(s: number, tick: number): number {
  const x = sites.list[s];
  if (rules.sites.isDone(s)) return 1;
  if (x.t0 < 0) return 0;
  const r = rules.sites.run(s, Math.floor(tick));
  if (r.name === 'warm' || r.phase < 0) return 0;
  if (r.name !== 'lay') return 1;
  return Math.min(1, (tick - x.t0 - WARM) / LAY); // smoothed between ticks
}
function drawRailway(tick: number): void {
  let c = 0;
  machine.visible = false;
  ROUTE.forEach((sec, s) => {
    const u = laid(s, tick);
    const { len, yaw } = LINES[s];
    for (let d = 0; d < len * u && c < rails.instanceMatrix.count; d += RAIL_STEP) {
      lerp2(s, d / len);
      at.y += 0.06;
      q.setFromAxisAngle(up, yaw);
      rails.setMatrixAt(c, m4.compose(at, q, sleeperScale));
      rails.setColorAt(c++, pieceColor(0));
    }
    for (const { m, off } of railMeshes[s]) {
      m.visible = u > 0;
      if (!m.visible) continue;
      const mid = lerp2(s, u / 2);
      m.position.set(mid.x + Math.cos(yaw) * off, mid.y + 0.16, mid.z - Math.sin(yaw) * off);
      m.rotation.set(0, yaw, 0);
      m.scale.set(1, 1, Math.max(0.01, len * u));
    }
    if (s === sites.open && sites.list[s]?.t0 >= 0) {
      machine.visible = true;
      lerp2(s, u);
      machine.position.set(at.x, at.y + 0.5, at.z);
      machine.rotation.y = yaw;
    }
  });
  commitPieces(rails, c);
}

// Start the machine: an Interact target at the open site's sign once its Track ring holds a whole section.
registerInteractable(() => {
  const s = sites.open;
  if (!me.entered || !me.body || s >= ROUTE.length || !rules.sites.canRun(s)) return [];
  const p = ringAt(s, TRACK);
  const pos = me.body.position;
  if (Math.hypot(pos.x - p.x, pos.z - p.z) > RING_R + 1.2) return [];
  const where = new THREE.Vector3(p.x, groundHeight(p.x, p.z) + 1.2, p.z);
  return [
    { id: `run${s}`, verb: 'Start the machine', at: where, run: () => submitEdit({ op: 'site.run', i: 0, j: 0, s }) },
  ];
});

// Pouring: standing in a ring of the open site with the right material pours a little every POUR_EVERY_MS.
let lastPour = -1e9;
function pour(now: number): void {
  if (!me.entered || !me.body || !identity.pid || now - lastPour < POUR_EVERY_MS) return;
  const s = sites.open;
  if (s >= ROUTE.length || rules.stacks.kind(identity.pid) !== materialOf(ROUTE[s].age)) return;
  const pos = me.body.position;
  for (const ring of [TRACK, HELPER]) {
    const p = ringAt(s, ring);
    if (Math.hypot(pos.x - p.x, pos.z - p.z) > RING_R || rules.sites.room(s, ring) <= 0) continue;
    const n = Math.min(POUR_N, rules.stacks.count(identity.pid));
    lastPour = now;
    submitEdit({ op: 'site.stock', i: 0, j: 0, s, ring, n });
    return;
  }
}

let drawn = '';
onFrame(
  ({ now }: { now: number }) => {
    // Redraw on any change to the sites (pours, freight, runs, loads) or a rename; the railway every frame only while
    // a machine runs.
    const key = `${sites.rev}/${names}`;
    const running = sites.list[sites.open]?.t0 >= 0;
    if (key !== drawn || running) drawRailway(sharedSeconds() * 10); // shared time in ticks (TICK_MS = 100)
    if (key !== drawn) redraw();
    drawn = key;
    pour(now);
  },
  { phase: 'update', order: 34 },
);
