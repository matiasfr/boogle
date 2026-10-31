// Log sources (src/world/rules/sources.js): a palm that still holds logs shows a small bundle at its foot; shaking it
// (the palm's Shake, src/adapters/gifts.js) sends them flying onto your stack. Placeholder visuals (0.1).
// Serves DESIGN.md 1 (toys before chores: the shake you already play with also gathers) and 9 (sources refill as the
// railway grows, so there is always more for the next visitor). Lockstep charges, Local view.
import { rules, land } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.js';
import { onApplied, onSnapshot } from '../world/sync.js';
import { net } from '../netplay/net.js';
import { cellX, cellZ, groundHeight } from '../adapters/terrain.js';
import { pieceMesh, pieceColor, heapMatrix, fly } from '../render/haul-pieces.js';
import { sourcesOf, FULL } from '../sim/sources.js';
import { materialOf } from '../sim/materials.js';

const PER_CHARGE = 2; // pieces drawn per charge left
const mesh = pieceMesh(64 * FULL * PER_CHARGE);
const m4 = new THREE.Matrix4();
const at = new THREE.Vector3();
const spot = (p, out) => {
  const x = cellX(p.i) + 0.9,
    z = cellZ(p.j) + 0.4;
  return out.set(x, groundHeight(x, z), z);
};

let dirty = true;
onApplied((e, tick, r) => {
  if (e.op === 'src.take' || e.op.startsWith('site.')) dirty = true;
  if (e.op === 'src.take' && r?.n && e.p === (net.room?.selfId ?? 'local')) {
    const p = sourcesOf(rules.sites.age(), land.layout)[e.id];
    if (p) fly(spot(p, at), r.n);
  }
});
onSnapshot(() => (dirty = true));

let lastCharges = '';
onFrame(
  () => {
    const t = rules.sources.sources.c.join(); // a trickle refill changes charges without an edit
    if (!dirty && t === lastCharges) return;
    dirty = false;
    lastCharges = t;
    const list = sourcesOf(rules.sites.age(), land.layout);
    const k = materialOf(rules.sites.age());
    let c = 0;
    list.forEach((p, id) => {
      spot(p, at);
      for (let m = 0; m < rules.sources.charges(id) * PER_CHARGE && c < mesh.instanceMatrix.count; m++) {
        mesh.setMatrixAt(c, heapMatrix(m, id, at.x, at.y, at.z, m4));
        mesh.setColorAt(c++, pieceColor(k));
      }
    });
    mesh.count = c;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  },
  { phase: 'update', order: 36 },
);
