// Ground piles in the game: each pile (src/world/rules/piles.ts) drawn as a little heap of pieces, and walk-over
// pickup. Placeholder visuals (0.1 groundwork). Walking into a pile takes it; the host decides who got it.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onApplied, submitEdit } from '../world/sync.ts';
import { cellX, cellZ, groundHeight } from './terrain.ts';
import { me } from '../player/player.ts';
import { pieceMesh, pieceColor, heapMatrix, commitPieces, fly } from '../render/haul-pieces.ts';
import { PLAYER_R } from '../constants.ts';
import type { Pile } from '../sim/piles.ts';

export const piles = rules.piles.piles;
const SHOWN = 12; // pieces drawn per pile, whatever its count
const PICK_R = 1.3; // metres from a pile's centre that walk over it (the default; the host doesn't check reach)
const PICK_DY = 1.6;
const mesh = pieceMesh(160 * SHOWN);
const m4 = new THREE.Matrix4();
const spots = new Map(); // pile id -> world position (a pile never moves)
const spotOf = (p: Pile) => {
  let at = spots.get(p.id);
  if (!at) {
    const x = cellX(p.i),
      z = cellZ(p.j);
    spots.set(p.id, (at = new THREE.Vector3(x, groundHeight(x, z), z)));
  }
  return at;
};

// Taken a moment ago: hidden while its pieces fly to you, shown again if the host refused.
const pending = new Map(); // pile id -> ms submitted
let shown = 0; // bumped whenever `pending` changes
const unpend = (id: number) => pending.delete(id) && shown++;
let expireAt = 0; // updatePiles' now, for expire (a pending.forEach callback, so no closure per frame)
const expire = (t: number, id: number) => {
  if (expireAt - t > 1500) unpend(id);
};
onApplied((e: { op: string; id: number }) => e.op === 'pile.take' && unpend(e.id));
let drawnRev = -1, // the piles.rev and `shown` last drawn
  drawnShown = -1;
function redraw() {
  let n = 0;
  for (const p of piles.list) {
    if (pending.has(p.id)) continue;
    const at = spotOf(p);
    for (let m = 0; m < Math.min(p.n, SHOWN) && n < mesh.instanceMatrix.count; m++) {
      mesh.setMatrixAt(n, heapMatrix(m, p.id, at.x, at.y, at.z, m4));
      mesh.setColorAt(n++, pieceColor(p.k));
    }
  }
  commitPieces(mesh, n);
  for (const id of spots.keys()) if (!piles.list.some((p) => p.id === id)) spots.delete(id);
}

// Walk-over pickup: one pile.take per pile you touch, retried after a while if the host never applied it. `want(p)`
// says how many to ask for (0: leave it), so you never ask for a kind you can't carry; `reach` how far from a pile's
// centre counts (a Local dial). The pieces fly to your back as the take is sent, before the host answers.
export function updatePiles(now: number, want = (p: Pile) => p.n, reach = PICK_R): void {
  expireAt = now;
  pending.forEach(expire);
  if (me.entered && me.body) {
    const pos = me.body.position;
    for (const p of piles.list) {
      if (pending.has(p.id)) continue;
      const at = spotOf(p);
      const dx = at.x - pos.x,
        dz = at.z - pos.z;
      if (Math.abs(pos.y - PLAYER_R - at.y) > PICK_DY || dx * dx + dz * dz > reach * reach) continue;
      const n = want(p);
      if (n > 0 && submitEdit({ op: 'pile.take', i: p.i, j: p.j, id: p.id, n })) {
        pending.set(p.id, now);
        shown++;
        fly(at, Math.min(n, p.n));
      }
    }
  }
  if (piles.rev !== drawnRev || shown !== drawnShown) {
    drawnRev = piles.rev;
    drawnShown = shown;
    redraw();
  }
}
