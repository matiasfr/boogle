// Log sources (src/world/rules/sources.ts): a palm that still holds logs shows a small bundle at its foot; shaking it
// (the palm's Shake, src/adapters/gifts.js) sends them flying onto your stack. Placeholder visuals (0.1).
// Serves DESIGN.md 1 (toys before chores: the shake you already play with also gathers) and 9 (sources refill as the
// railway grows, so there is always more for the next visitor). Lockstep charges, Local view.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.js';
import { onApplied } from '../world/sync.ts';
import { net } from '../netplay/net.js';
import { cellX, cellZ, groundHeight } from '../adapters/terrain.js';
import { pieceMesh, pieceColor, heapMatrix, commitPieces, fly } from '../render/haul-pieces.ts';
import { FULL, type Cell } from '../sim/sources.ts';
import { materialOf } from '../sim/materials.ts';

const PER_CHARGE = 2; // pieces drawn per charge left
const mesh = pieceMesh(64 * FULL * PER_CHARGE);
const m4 = new THREE.Matrix4();
const at = new THREE.Vector3();
const spot = (p: Cell, out: THREE.Vector3) => {
  const x = cellX(p.i) + 0.9,
    z = cellZ(p.j) + 0.4;
  return out.set(x, groundHeight(x, z), z);
};

onApplied((e: { op: string; p: string; id: number }, tick: number, r: { n?: number } | null) => {
  if (e.op === 'src.take' && r?.n && e.p === (net.room?.selfId ?? 'local')) {
    const p = rules.sources.list()[e.id];
    if (p) fly(spot(p, at), r.n);
  }
});

let drawn = -1; // sources.rev last drawn (it changes on takes, refills, the trickle and loads)
onFrame(
  () => {
    if (rules.sources.sources.rev === drawn) return;
    drawn = rules.sources.sources.rev;
    const k = materialOf(rules.sites.age());
    let c = 0;
    rules.sources.list().forEach((p, id) => {
      spot(p, at);
      for (let m = 0; m < rules.sources.charges(id) * PER_CHARGE && c < mesh.instanceMatrix.count; m++) {
        mesh.setMatrixAt(c, heapMatrix(m, id, at.x, at.y, at.z, m4));
        mesh.setColorAt(c++, pieceColor(k));
      }
    });
    commitPieces(mesh, c);
  },
  { phase: 'update', order: 36 },
);
