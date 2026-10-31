// Ground piles in the game: each pile (src/world/rules/piles.js) drawn as a little heap of pieces, and walk-over
// pickup. Placeholder visuals (0.1 groundwork). Walking into a pile takes it; the host decides who got it.
import { rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onApplied, onSnapshot, submitEdit } from '../world/sync.js';
import { cellX, cellZ, groundHeight } from './terrain.js';
import { me } from '../player/player.js';
import { pieceMesh, pieceColor, heapMatrix, fly } from '../render/haul-pieces.js';
import { PLAYER_R } from '../constants.js';

export const piles = rules.piles.piles;
const SHOWN = 12; // pieces drawn per pile, whatever its count
const PICK_R = 1.3; // metres from a pile's centre that walk over it
const PICK_DY = 1.6;
const mesh = pieceMesh(160 * SHOWN);
const m4 = new THREE.Matrix4();
let dirty = true;
onApplied((e) => {
  if (e.op.startsWith('pile.') || e.op.startsWith('src.') || e.op.startsWith('site.')) dirty = true;
});
onSnapshot(() => (dirty = true));
export const markPilesDirty = () => (dirty = true);

export const pilePos = (p, out) => {
  const x = cellX(p.i),
    z = cellZ(p.j);
  return out.set(x, groundHeight(x, z), z);
};

const at = new THREE.Vector3();
function redraw() {
  dirty = false;
  let n = 0;
  for (const p of piles.list) {
    if (pending.has(p.id)) continue; // taken a moment ago: its pieces are flying to you
    pilePos(p, at);
    for (let m = 0; m < Math.min(p.n, SHOWN) && n < mesh.instanceMatrix.count; m++) {
      mesh.setMatrixAt(n, heapMatrix(m, p.id, at.x, at.y, at.z, m4));
      mesh.setColorAt(n++, pieceColor(p.k));
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// Walk-over pickup: one pile.take per pile you touch, retried after a while if the host never applied it. `want(p)`
// says how many to ask for (0: leave it), so you never ask for a kind you can't carry. The pieces fly to your back as
// the take is sent, before the host answers.
const pending = new Map(); // pile id -> ms submitted
onApplied((e) => e.op === 'pile.take' && pending.delete(e.id) && (dirty = true));
export function updatePiles(now, want = (p) => p.n) {
  if (dirty) redraw();
  if (!me.entered || !me.body) return;
  const pos = me.body.position;
  for (const p of piles.list) {
    if (pending.has(p.id)) continue;
    pilePos(p, at);
    if (Math.abs(pos.y - PLAYER_R - at.y) > PICK_DY || Math.hypot(at.x - pos.x, at.z - pos.z) > PICK_R) continue;
    const n = want(p);
    if (n > 0 && submitEdit({ op: 'pile.take', i: p.i, j: p.j, id: p.id, n })) {
      pending.set(p.id, now);
      dirty = true;
      fly(at, Math.min(n, p.n));
    }
  }
  for (const [id, t] of pending) if (now - t > 1500 && pending.delete(id)) dirty = true; // refused: show it again
}
