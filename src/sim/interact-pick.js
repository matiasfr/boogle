// The interact pick: which of the things in reach the one interact button (E, pad B, the touch action button, a click
// with empty hands) acts on. Local logic, not shared state; it lives here so it can be unit-tested, and it still passes
// the determinism lint (Math.sqrt only).
//
//   pickInteract(targets, px, pz, fx, fz)   the target to act on, or null
//     targets   [{ at: { x, z }, r?, run? | blocked? }]; null entries are skipped
//     px, pz    where you stand; fx, fz: the unit direction you look along the ground
//
// Runnable targets (with `run`) come first: a blocked one ("Hotbar full") wins only when nothing runnable is in reach, so
// the button does something whenever it can, and the greyed reason still shows when it cannot. Within each group the
// lowest score wins: the distance, minus `r` (to measure to the edge of something big), minus up to FACING for a target
// straight ahead (a nudge toward where you look). Ties go to the earlier target.

export const FACING = 0.6; // metres closer a target straight ahead counts as, against one beside you

function interactScore(t, px, pz, fx, fz) {
  const dx = t.at.x - px,
    dz = t.at.z - pz;
  const d = Math.sqrt(dx * dx + dz * dz);
  return d - (t.r ?? 0) - (d > 0 ? (FACING * (dx * fx + dz * fz)) / d : 0);
}

export function pickInteract(targets, px, pz, fx, fz) {
  let best = null,
    bestRuns = false,
    bestScore = Infinity;
  for (const t of targets) {
    if (!t) continue;
    const runs = !!t.run;
    if (bestRuns && !runs) continue;
    const score = interactScore(t, px, pz, fx, fz);
    if (score < bestScore || (runs && !bestRuns)) {
      best = t;
      bestRuns = runs;
      bestScore = score;
    }
  }
  return best;
}
