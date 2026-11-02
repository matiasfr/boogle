// Log sources (src/world/rules/sources.ts): a palm that still holds logs shows a small bundle at its foot; E on the
// bundle ("Take logs") sends them flying onto your stack. The bundle is the thing you take from, not the palm: no
// shaking. Placeholder visuals (0.1).
// Serves DESIGN.md 1 (toys before chores: logs lie there to take) and 9 (sources refill as the railway grows, so there
// is always more for the next visitor). Lockstep charges, Local view.
import { land, rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { onFrame, onStart } from '../loop.ts';
import { trees } from '../render/props.ts';
import { CELL, HALF } from '../constants.ts';
import { onApplied, submitEdit } from '../world/sync.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../player/hands.ts';
import { me } from '../player/player.ts';
import { haulHooks } from '../player/haul-variant.ts';
import { net } from '../netplay/net.ts';
import { cellX, cellZ, groundHeight } from '../island/terrain.ts';
import { pieceMesh, pieceColor, heapMatrix, commitPieces, fly } from '../render/haul-pieces.ts';
import { FULL, type Cell } from '../sim/sources.ts';
import { materialOf } from '../sim/materials.ts';

// The home palm cells: where the wood age's log bundles lie (src/world/rules/sources.ts reads them). Filled before the
// first world tick, so every client builds the same list.
onStart(() => {
  const cells = land.layout.trees;
  for (const t of trees.slice(0, 64))
    cells.push({ i: Math.round((t.x + HALF) / CELL), j: Math.round((HALF - t.z) / CELL) });
  const handle = (window as unknown as { boogle?: Record<string, unknown> }).boogle;
  if (handle) handle.land = land; // debug handle
});

const PER_CHARGE = 2; // pieces drawn per charge left
const mesh = pieceMesh(64 * FULL * PER_CHARGE);
const m4 = new THREE.Matrix4();
const at = new THREE.Vector3();
const spot = (p: Cell, out: THREE.Vector3) => {
  const x = cellX(p.i) + 0.9,
    z = cellZ(p.j) + 0.4;
  return out.set(x, groundHeight(x, z), z);
};

const REACH_LOGS = 2.2; // metres from a bundle
const pending = new Map<number, number>(); // source id -> when you pressed, so a double press sends one edit
onApplied((e: { op: string; p: string; id: number }, tick: number, r: { n?: number } | null) => {
  if (e.op === 'src.take') pending.delete(e.id);
  if (e.op === 'src.take' && r?.n && e.p === (net.room?.selfId ?? 'local') && !haulHooks.moved(e.id)) {
    const p = rules.sources.list()[e.id];
    if (p) fly(spot(p, at), r.n, true);
  }
});

// "Take logs": one target per bundle in reach that still holds a charge (the interact button, no new key).
const bundleAt = new THREE.Vector3();
registerInteractable(() => {
  if (!me.body) return NO_TARGETS;
  const pos = me.body.interpolatedPosition;
  const now = performance.now();
  const list = rules.sources.list();
  let out: Interactable[] | null = null; // made only when a bundle is in reach: asked every frame
  for (let id = 0; id < list.length; id++) {
    if (haulHooks.moved(id)) continue; // a haul variant draws and takes this one elsewhere (the wave's sandbar)
    const p = list[id];
    const dx = cellX(p.i) + 0.9 - pos.x, // spot()'s x, z: the ground height only for a bundle in reach
      dz = cellZ(p.j) + 0.4 - pos.z;
    if (dx * dx + dz * dz >= REACH_LOGS * REACH_LOGS) continue;
    if (rules.sources.charges(id) <= 0 || now - (pending.get(id) ?? -1e9) < 1500) continue;
    spot(p, bundleAt);
    const t = { id: `logs${id}`, verb: 'Take logs', at: new THREE.Vector3(bundleAt.x, bundleAt.y + 0.5, bundleAt.z) };
    const blocked = haulHooks.takeBlocked(bundleAt.x, bundleAt.z); // a haul variant's rule (the barrow must be near)
    (out ??= []).push(
      blocked
        ? { ...t, blocked }
        : {
            ...t,
            run: () => {
              if (submitEdit({ op: 'src.take', i: p.i, j: p.j, id })) pending.set(id, performance.now());
            },
          },
    );
  }
  return out ?? NO_TARGETS;
});

let drawn = -1; // sources.rev last drawn (it changes on takes, refills, the trickle and loads)
onFrame(
  () => {
    if (rules.sources.sources.rev === drawn) return;
    drawn = rules.sources.sources.rev;
    const k = materialOf(rules.sites.age());
    let c = 0;
    rules.sources.list().forEach((p, id) => {
      if (haulHooks.moved(id)) return;
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
