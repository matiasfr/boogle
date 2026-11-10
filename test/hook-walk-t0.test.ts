// Review of generic-lines step 2: t0 (firstpull's secret) must need the hook. place-level checks it only from p2's pad,
// but the hook walk's last three points stand at the pad's height, 7.5 m out from the pillar towards t0, and turn solid
// with Q2 (line2Routes), the same moment the hook can be taken. Moving p2 to s 89.5, 11 m out brought that raised walk
// within two jumps of t0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PADS, PILLARS, SERVICE_ROUTES } from '../src/proto/place/tech-layout.ts';

// dev/economy/place-level.ts: two jumps' rise and walking reach.
const TWO_JUMPS = 3.03,
  TWO_REACH = 8;

test("t0 is out of two jumps' reach from the hook walk's raised end, not only from p2's pad", () => {
  const t0 = PADS.find((p) => p.id === 't0')!;
  const p2 = PILLARS.find((p) => p.id === 'p2')!;
  const r = Math.max(t0.hx, t0.hz);
  for (const q of SERVICE_ROUTES.hook) {
    if (Math.abs(q.y - p2.top) > 0.05) continue; // the stretch at the pad's height
    // Measured from the walk's centreline, as place-level measures decks (its stone is 3 m wide, so this is generous).
    const gap = Math.hypot(q.x - t0.x, q.z - t0.z) - r;
    const rise = t0.top - q.y;
    assert.ok(
      !(rise <= TWO_JUMPS && gap <= TWO_REACH),
      `two jumps reach t0 from the hook walk at (${q.x.toFixed(1)}, ${q.z.toFixed(1)}): ${gap.toFixed(2)} m, rise ${rise.toFixed(2)} m`,
    );
  }
});
