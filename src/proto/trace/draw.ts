// `?trace=1` on a `?proto=` page (docs/research/playtest-telemetry.md, rec 7): the last sitting of this prototype (of
// the playing variant if it has one) drawn back in the world. Its path is a ribbon on the ground coloured by what you
// were doing, failure marks are short poles with a coloured head, idle spots are see-through rings sized by how long
// you stood, and where it ended is a tall white pole. Loaded by the prototype bar; such a page records no sitting of its
// own (src/proto/trace/record.ts). Local and cosmetic: never synced.
import * as THREE from 'three/webgpu';
import { onStart } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { groundHeight } from '../../island/terrain.ts';
import { SEA } from '../../constants.ts';
import { ACTIVITY_COLORS, cardFor, markColor, sittings, urlParam, type Sitting } from '../../../protos/store.ts';

const WIDTH = 0.35; // m, the ribbon
const LIFT = 0.12; // m above the ground
const JUMP = 40; // m between two samples that breaks the ribbon (a respawn or a variant's teleport)
const STEP = 1; // m: long segments are cut into pieces this long so the ribbon follows the ground

const surface = (x: number, z: number) => Math.max(groundHeight(x, z), SEA) + LIFT;

function ribbon(s: Sitting) {
  const pos: number[] = [],
    col: number[] = [],
    idx: number[] = [];
  const c = new THREE.Color();
  let open = false; // the last pushed pair continues the strip
  const pair = (x: number, z: number, nx: number, nz: number, a: number) => {
    c.set(ACTIVITY_COLORS[a] ?? '#ffffff');
    const y = surface(x, z);
    pos.push(x + nx * WIDTH, y, z + nz * WIDTH, x - nx * WIDTH, y, z - nz * WIDTH);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    const n = pos.length / 3;
    if (open) idx.push(n - 4, n - 3, n - 2, n - 3, n - 1, n - 2);
    open = true;
  };
  const p = s.p;
  for (let i = 4; i < p.length; i += 4) {
    const ax = p[i - 3],
      az = p[i - 2],
      bx = p[i + 1],
      bz = p[i + 2];
    const len = Math.hypot(bx - ax, bz - az);
    if (len > JUMP) {
      open = false;
      continue;
    }
    if (len < 0.01) continue;
    const nx = -(bz - az) / len / 2,
      nz = (bx - ax) / len / 2;
    const a = p[i + 3];
    const pieces = Math.ceil(len / STEP);
    for (let k = open ? 1 : 0; k <= pieces; k++)
      pair(ax + ((bx - ax) * k) / pieces, az + ((bz - az) * k) / pieces, nx, nz, a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  return new THREE.Mesh(geo, mat);
}

function pole(x: number, z: number, color: string, h: number, head: number) {
  const g = new THREE.Group();
  const y = surface(x, z) - LIFT;
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, h, 6),
    new THREE.MeshBasicNodeMaterial({ color: '#f4f1e6' }),
  );
  stick.position.set(x, y + h / 2, z);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(head, 12, 8), new THREE.MeshBasicNodeMaterial({ color }));
  ball.position.set(x, y + h, z);
  g.add(stick, ball);
  return g;
}

// An idle spot: a see-through ring fence round where you stood, so it shows on a slope too.
function ring(x: number, z: number, r: number) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.7, 28, 1, true),
    new THREE.MeshBasicNodeMaterial({
      color: ACTIVITY_COLORS[5],
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  m.position.set(x, surface(x, z) + 0.2, z);
  return m;
}

const card = cardFor(location.search);
if (card) {
  const v = new URLSearchParams(location.search).get('v') ?? urlParam(card, 'v') ?? '';
  const all = sittings(card.id);
  const last = all.filter((s) => s.v === v).at(-1) ?? all.at(-1);
  if (!last) console.info(`[trace] no sittings of ${card.id} yet`);
  else
    onStart(() => {
      const g = new THREE.Group();
      g.name = 'proto-trace';
      g.add(ribbon(last));
      for (let i = 0; i < last.idle.length; i += 4)
        g.add(ring(last.idle[i + 1], last.idle[i + 2], Math.min(3, 0.6 + Math.sqrt(last.idle[i + 3]) * 0.35)));
      for (const m of last.marks) if (m.k !== 'verb') g.add(pole(m.x, m.z, markColor(m.k), 1.8, 0.3));
      if (last.end) g.add(pole(last.end.x, last.end.z, '#ffffff', 3, 0.35));
      scene.add(g);
      console.info(
        `[trace] ${card.id}: drew the sitting of ${new Date(last.id).toLocaleString()} (${last.p.length / 4} s)`,
      );
    });
}
