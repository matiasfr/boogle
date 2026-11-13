// Work sites (src/world/rules/sites.ts): one per section of the preset railway, from the court toward the lighthouse.
// Each has a Track ring and a Helper ring; walk into one carrying the age's material and your stack pours in, a few
// pieces at a time. Sleepers pile up in the Track ring as it fills, the helper hut goes up as the Helper ring fills
// (src/features/hut-build.ts), and the plaque lists who brought what (credit only: nobody is listed for not pouring). Placeholder visuals (0.1).
// Serves DESIGN.md 4 (cooperation is automatic: everyone's pours land in the same ring) and 6 (communal world,
// personal rewards: the section is everyone's, the plaque line and your tier are yours). Lockstep sites, Local view.
// A credited pour turns the plaque's changed rows over like a departures board, with a little puff and a soft clack you
// hear near it, at most once every FLIP_GAP_MS while you keep pouring (docs/research/ui-patterns.md, rec 5: shared news
// in the world first). The rings' signs and the plaque are painted boards on posts standing at the site
// (src/render/sign-board.ts; owner, 9 November: signs in the world before hovering text), not labels in the air. One
// entity: every section's rings, signs, plaque and stacked sleepers, in one group.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../entity/entity.ts';
import { onApplied, submitEdit, world } from '../world/sync.ts';
import { registerInteractable, NO_TARGETS } from '../player/hands.ts';
import { groundHeight } from '../island/terrain.ts';
import { me } from '../player/player.ts';
import { identity } from '../player/identity.ts';
import { ROUTE, TRACK, HELPER, RING_R, ringAt } from '../sim/route.ts';
import { haulFeel } from '../player/haul-feel.ts';
import { materialOf, MATERIALS } from '../sim/materials.ts';
import { protoOn } from '../proto/flags.ts';
import { pieceMesh, pieceColor, commitPieces } from '../render/haul-pieces.ts';
import type { Site } from '../sim/sites.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { uiSound } from '../ui/ui-sound.ts';
import { emit } from '../render/particles.ts';
import { readableUnlit } from '../render/readable-unlit.ts';
import { signBoard, type SignBoard } from '../render/sign-board.ts';

const SLEEPERS = 12; // drawn in a full Track ring
const { sites } = rules.sites;
const costOf = rules.sites.cost; // the room's ring costs (tuned in playtest rooms)
const NO_HELPER = protoOn('net'); // ?proto=net: the rail replaces the Helper ring, so it isn't there to see or fill

// Colour is the second signal, so each ring also has a shape (docs/research/ui-patterns.md, rec 4): Track is dashed
// like a row of sleepers, Helper is a double line.
const arc = (r0: number, r1: number, a0 = 0, da = Math.PI * 2) => new THREE.RingGeometry(r0, r1, 40, 1, a0, da);
const DASHES = 14;
const DASH = (0.6 * Math.PI * 2) / DASHES;
const ringGeos = [
  mergeGeometries(
    Array.from({ length: DASHES }, (_, i) => arc(RING_R - 0.32, RING_R, (i / DASHES) * Math.PI * 2, DASH)),
  ),
  mergeGeometries([arc(RING_R - 0.12, RING_R), arc(RING_R - 0.36, RING_R - 0.26)]),
].map((g) => g.rotateX(-Math.PI / 2));
const ringMat = [
  readableUnlit(
    new THREE.MeshBasicNodeMaterial({ color: '#f0c070', transparent: true, opacity: 0.85, depthWrite: false }),
  ),
  readableUnlit(
    new THREE.MeshBasicNodeMaterial({ color: '#8fe0a0', transparent: true, opacity: 0.85, depthWrite: false }),
  ),
];
const doneMat = readableUnlit(
  new THREE.MeshBasicNodeMaterial({
    color: '#9aa3ad',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }),
);
const sleepers = pieceMesh(ROUTE.length * SLEEPERS);

type Label = SignBoard & { text: string };
/** A board `w` m wide on its post (`foot` m to its bottom), its canvas 512 px wide; the caller places it. */
function label(w: number, h: number, foot: number): Label {
  return { ...signBoard(undefined, { w, h, px: 512, foot, posts: 'one', wood: '#6b4a2b' }), text: '' };
}
// A plaque row turning over: what it said before, and when it starts (staggered down the plaque).
type Flap = { old: string; at: number };
const FLAP_MS = 320; // one row's flip
function paint(l: Label, lines: string[], bg = '#3a2816', flaps?: Map<number, Flap>, now = 0): void {
  const text = lines.join('\n');
  if (text === l.text && !flaps?.size) return;
  l.text = text;
  const { g, cw, ch } = l;
  g.fillStyle = bg;
  g.fillRect(0, 0, cw, ch);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = (ch - 16) / lines.length;
  lines.forEach((t: string, k: number) => {
    const y = 8 + lh * (k + 0.5);
    const f = flaps?.get(k);
    // p: 0 → 1 over the flip; the old text folds away to the row's midline, the new one unfolds from it
    const p = f ? Math.min(1, Math.max(0, (now - f.at) / FLAP_MS)) : 1;
    if (f && p >= 1) flaps!.delete(k);
    if (f) {
      g.fillStyle = `rgba(255, 201, 61, ${0.4 * (1 - p * p)})`; // --sun, fading as it settles
      g.beginPath();
      if (g.roundRect) g.roundRect(14, y - lh / 2 + 2, cw - 28, lh - 4, 10);
      else g.rect(14, y - lh / 2 + 2, cw - 28, lh - 4);
      g.fill();
    }
    g.fillStyle = '#fff7e8';
    g.font = `${k ? 600 : 800} ${Math.round(lh * 0.62)}px Figtree, system-ui, sans-serif`;
    const sy = Math.max(0.04, Math.abs(Math.cos(Math.PI * p)));
    g.save();
    g.translate(cw / 2, y);
    g.scale(1, sy);
    g.fillText(f && p < 0.5 ? f.old : t, 0, 0, cw - 24);
    g.restore();
  });
  l.painted();
}

const site = new THREE.Group();
site.userData.worldLabels = true; // the soapbox hides them while you drive
site.add(sleepers);
const views = ROUTE.map((sec, s) => {
  const v = {
    rings: [] as THREE.Mesh[],
    ringLabels: [] as Label[],
    plaque: label(2.2, 1.1, 1.3),
  };
  for (const ring of [TRACK, HELPER]) {
    const p = ringAt(s, ring);
    const y = groundHeight(p.x, p.z) + 0.06;
    const mesh = new THREE.Mesh(ringGeos[ring], ringMat[ring]);
    mesh.position.set(p.x, y, p.z);
    site.add(mesh);
    v.rings.push(mesh);
    // The ring's sign: a low board on a stake at the ring's rim, on the side away from the plaque.
    const l = label(1.6, 0.4, 0.7);
    const sz = p.z + RING_R + 0.3;
    l.mesh.position.set(p.x, groundHeight(p.x, sz), sz);
    site.add(l.mesh);
    v.ringLabels.push(l);
    if (NO_HELPER && ring === HELPER) mesh.visible = l.mesh.visible = false;
  }
  // The plaque stands off the line (beside the Helper ring, just past it), so the wagon runs clear of it.
  const px = sec.x + 2.6,
    pz = sec.z - 2.4;
  v.plaque.mesh.position.set(px, groundHeight(px, pz), pz);
  site.add(v.plaque.mesh);
  return v;
});

let names = 0; // bumped by who.set: the plaques print roster names
onApplied((e: { op: string }) => e.op === 'who.set' && names++);

// Sites whose plaque just gained points (a credited pour), each plaque's rows mid-flip, and when each last flipped. A
// pour lands every haulFeel.pourMs (300 ms), so flipping on every one would clatter: pours in between just repaint the
// numbers.
const FLIP_GAP_MS = 1200;
const credited = new Set<number>();
const flaps = views.map(() => new Map<number, Flap>());
const lastFlip = views.map(() => -1e9);
const plaqueLines: string[][] = views.map(() => []);
const PUFF = new THREE.Color('#ffe7a8');
onApplied((e: { op: string; s: number }, _tick: number, r: { pts?: number } | null) => {
  if (e.op === 'site.stock' && r?.pts) credited.add(e.s);
});
export const flapping = (s: number): boolean => (flaps[s]?.size ?? 0) > 0; // for dev/scenarios/ui-kit.ts
// Turn over the plaque rows that changed, with a puff over the board and a clack as loud as you are near.
function flipPlaque(s: number, before: string[], after: string[], now: number): void {
  if (now - lastFlip[s]! < FLIP_GAP_MS) return;
  let n = 0;
  for (let k = 1; k < after.length; k++) {
    if (after[k] !== before[k]) flaps[s]!.set(k, { old: before[k] ?? '', at: now + 70 * n++ });
  }
  if (!n) return;
  lastFlip[s] = now;
  const sp = views[s]!.plaque.mesh.position;
  for (let q = 0; q < 8; q++) {
    const a = (q / 8) * Math.PI * 2 + Math.random() * 0.5;
    emit({
      x: sp.x + Math.cos(a) * 0.9,
      y: sp.y + 2.45, // over the board's top
      z: sp.z + Math.sin(a) * 0.3,
      vx: Math.cos(a) * 0.5,
      vy: 0.6 + Math.random() * 0.5,
      vz: Math.sin(a) * 0.5,
      life: 0.5 + Math.random() * 0.3,
      size: 0.1 + Math.random() * 0.08,
      color: PUFF,
      gravity: -0.2,
      drag: 2.5,
      grow: [0.6, 1.6],
      shrink: 1 / 3,
    });
  }
  const p = me.body?.position;
  const d = p ? Math.hypot(p.x - sp.x, p.z - sp.z) : 99;
  uiSound('flap', Math.max(0, 1 - d / 28));
}

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  one = new THREE.Vector3(1, 1, 1),
  up = new THREE.Vector3(0, 1, 0),
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
    const v = views[s]!;
    const open = s === sites.open;
    const k = materialOf(ROUTE[s]!.age);
    for (const ring of [TRACK, HELPER]) {
      v.rings[ring]!.material = open ? ringMat[ring]! : doneMat;
      paint(v.ringLabels[ring]!, [ring === TRACK ? 'Track' : 'Helper hut', ringLine(x, s, ring, k)]);
    }
    // sleepers stacked in the Track ring as it fills
    const p = ringAt(s, TRACK);
    // (the pile goes down as the machine lays the section)
    const left = x.t0 >= 0 ? 1 - rules.sites.run(s, world.tick).total / 1000 : 1;
    const shown = rules.sites.isDone(s) ? 0 : Math.round((SLEEPERS * x.stock[TRACK] * left) / costOf(s, TRACK));
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
    const lines = [`Section ${s + 1}`, ...(rows.length ? rows : ['—'])];
    if (credited.delete(s) && plaqueLines[s]!.length) flipPlaque(s, plaqueLines[s]!, lines, performance.now());
    plaqueLines[s] = lines;
    paint(v.plaque, lines, undefined, flaps[s], performance.now());
  });
  commitPieces(sleepers, c);
}

// Start the machine: an Interact target at the open site's sign once its Track ring holds a whole section.
registerInteractable(() => {
  const s = sites.open;
  if (!me.entered || !me.body || s >= ROUTE.length || !rules.sites.canRun(s)) return NO_TARGETS;
  const p = ringAt(s, TRACK);
  const pos = me.body.position;
  if (Math.hypot(pos.x - p.x, pos.z - p.z) > RING_R + 1.2) return NO_TARGETS;
  const where = new THREE.Vector3(p.x, groundHeight(p.x, p.z) + 1.2, p.z);
  return [
    { id: `run${s}`, verb: 'Start the machine', at: where, run: () => submitEdit({ op: 'site.run', i: 0, j: 0, s }) },
  ];
});

// Pouring: standing in a ring of the open site with the right material pours a little every haulFeel.pourMs.
let lastPour = -1e9;
function pour(now: number): void {
  if (!me.entered || !me.body || !identity.pid || now - lastPour < haulFeel.pourMs) return;
  const s = sites.open;
  if (s >= ROUTE.length || rules.stacks.kind(identity.pid) !== materialOf(ROUTE[s]!.age)) return;
  const pos = me.body.position;
  for (const ring of [TRACK, HELPER]) {
    const p = ringAt(s, ring);
    if (NO_HELPER && ring === HELPER) continue;
    if (Math.hypot(pos.x - p.x, pos.z - p.z) > RING_R || rules.sites.room(s, ring) <= 0) continue;
    const n = Math.min(haulFeel.pourN, rules.stacks.count(identity.pid));
    lastPour = now;
    submitEdit({ op: 'site.stock', i: 0, j: 0, s, ring, n });
    return;
  }
}

let drawnRev = -1,
  drawnNames = -1,
  drawnTune = -1,
  drawnRun: number | null = null;
defineKind('work-sites', { update: 34 });
spawn({
  kind: 'work-sites',
  mesh: site,
  update({ now }) {
    // Redraw on any change to the sites (pours, freight, runs, loads) or a rename. The machine and the railway it lays
    // are src/features/track-machine.ts.
    const open = sites.list[sites.open];
    const run = (open?.t0 ?? -1) >= 0 ? rules.sites.run(sites.open, world.tick).total >> 5 : -1; // a running pile shrinks
    const tuneRev = rules.tune.tune.rev;
    if (sites.rev !== drawnRev || names !== drawnNames || tuneRev !== drawnTune || run !== drawnRun) redraw();
    drawnRev = sites.rev;
    drawnNames = names;
    drawnTune = tuneRev;
    drawnRun = run;
    // plaque rows mid-flip
    for (let s = 0; s < flaps.length; s++) {
      const f = flaps[s]!;
      if (f.size) paint(views[s]!.plaque, plaqueLines[s]!, undefined, f, now);
    }
    pour(now);
  },
});
