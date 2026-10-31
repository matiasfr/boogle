// Work sites (src/world/rules/sites.js): one per section of the preset railway, from the court toward the lighthouse.
// Each has a Track ring and a Helper ring; walk into one carrying the age's material and your stack pours in, a few
// pieces at a time. Sleepers pile up in the Track ring as it fills, a hut frame rises once the Helper ring is full, and
// the plaque lists who brought what (credit only: nobody is listed for not pouring). Placeholder visuals (0.1).
// Serves DESIGN.md 4 (cooperation is automatic: everyone's pours land in the same ring) and 6 (communal world,
// personal rewards: the section is everyone's, the plaque line and your tier are yours). Lockstep sites, Local view.
import { rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.js';
import { scene } from '../render/scene.js';
import { onApplied, onSnapshot, submitEdit } from '../world/sync.js';
import { groundHeight } from '../adapters/terrain.js';
import { me } from '../player/player.js';
import { identity } from '../player/identity.js';
import { ROUTE, TRACK, HELPER, RING_R, ringAt, costOf } from '../sim/route.js';
import { materialOf, MATERIALS } from '../sim/materials.js';
import { pieceMesh, pieceColor } from '../render/haul-pieces.js';

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

function label(w = 512, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.renderOrder = 10;
  return { c, g: c.getContext('2d'), tex, sprite, text: '' };
}
function paint(l, lines, bg = 'rgba(40, 26, 12, 0.72)') {
  const text = lines.join('\n');
  if (text === l.text) return;
  l.text = text;
  const { g, c } = l;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect?.(4, 4, c.width - 8, c.height - 8, 18);
  g.fill();
  g.fillStyle = '#fff7e8';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = (c.height - 16) / lines.length;
  lines.forEach((t, k) => {
    g.font = `${k ? 600 : 800} ${Math.round(lh * 0.62)}px Figtree, system-ui, sans-serif`;
    g.fillText(t, c.width / 2, 8 + lh * (k + 0.5), c.width - 24);
  });
  l.tex.needsUpdate = true;
}

const views = ROUTE.map((sec, s) => {
  const v = { rings: [], ringLabels: [], hut: null, plaque: label(512, 256), at: new THREE.Vector3() };
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
  v.hut = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), hutMat);
  v.hut.position.set(h.x + 1.9, groundHeight(h.x + 1.9, h.z) + 0.6, h.z);
  v.hut.visible = false;
  scene.add(v.hut);
  return v;
});

let dirty = true;
onApplied((e) => (e.op.startsWith('site.') || e.op === 'who.set') && (dirty = true)); // pours, runs, names
onSnapshot(() => (dirty = true));

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  one = new THREE.Vector3(1, 1, 1),
  at = new THREE.Vector3();
function redraw() {
  dirty = false;
  let c = 0;
  sites.list.forEach((x, s) => {
    const v = views[s];
    const open = s === sites.open;
    const k = materialOf(ROUTE[s].age);
    for (const ring of [TRACK, HELPER]) {
      v.rings[ring].material = open ? ringMat[ring] : doneMat;
      const what = ring === TRACK ? 'Track' : 'Helper hut';
      const full = ring === HELPER && x.helpers;
      const line = x.done
        ? 'laid'
        : full
          ? 'built'
          : `${x.stock[ring]} / ${costOf(s, ring)} ${MATERIALS[k]}${open ? '' : ' · later'}`;
      paint(v.ringLabels[ring], [what, line]);
    }
    v.hut.visible = x.helpers > 0;
    // sleepers stacked in the Track ring as it fills
    const p = ringAt(s, TRACK);
    const shown = x.done ? 0 : Math.round((SLEEPERS * x.stock[TRACK]) / costOf(s, TRACK));
    for (let m = 0; m < shown; m++) {
      at.set(p.x + ((m % 3) - 1) * 0.5, groundHeight(p.x, p.z) + 0.12 + Math.floor(m / 3) * 0.2, p.z);
      q.setFromAxisAngle(at.clone().set(0, 1, 0), Math.PI / 2 + (Math.floor(m / 3) % 2) * 0.1);
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
  sleepers.count = c;
  sleepers.instanceMatrix.needsUpdate = true;
  if (sleepers.instanceColor) sleepers.instanceColor.needsUpdate = true;
}

// Pouring: standing in a ring of the open site with the right material pours a little every POUR_EVERY_MS.
let lastPour = -1e9;
function pour(now) {
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

onFrame(
  ({ now }) => {
    if (dirty) redraw();
    pour(now);
  },
  { phase: 'update', order: 34 },
);
