// The hook walk (SERVICE_ROUTES.hook, route v2, solid from Q2) is a walk: a player walking its centreline never meets a
// ledge. Its decks are drawn and made solid by src/entities/railway/line2-view.ts: per segment a 3 m wide, 0.35 m thick
// box, its top through the segment's two points, 0.2 m past each end, yawed then pitched, never rolled. Since
// cffcedd7 (generic-lines step 2) the walk turns back by about 117 degrees at its fourth point while still rising, so the
// next deck's inner half lay over the rising deck up to 0.73 m proud: a ledge across the walk that stopped a walker
// (railway-b4-bot `railFrom=sea`, "walked the hook walkway", stuck at 988.95, 22.20, 14.76). The walk is now level for
// its last 3 m before that turn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOOK_FLUSH, SERVICE_ROUTES, SERVICE_WIDTH } from '../src/place/tech-layout.ts';
import { PLAYER_R } from '../src/constants.ts';

const THICK = 0.35,
  OVER = 0.2; // line2-view: `length + 0.4`
// A corner edge a walker still rides over. Before cffcedd7 the walk's corners stood up to 0.22 m proud and the bot walked
// it; since then the turn at point 4 stands 0.73 m proud.
const LEDGE = 0.3;

type P = { x: number; y: number; z: number };
const points: P[] = SERVICE_ROUTES.hook.map((p, i) => ({
  ...p,
  y: p.y + (i < HOOK_FLUSH.points ? HOOK_FLUSH.top : 0),
}));
const decks = points.slice(1).map((b, i) => {
  const a = points[i]!;
  const run = Math.hypot(b.x - a.x, b.z - a.z);
  const ux = (b.x - a.x) / run,
    uz = (b.z - a.z) / run,
    slope = (b.y - a.y) / run,
    over = OVER / Math.hypot(1, slope); // 0.2 m along the pitched deck, measured flat
  return {
    i: i + 1,
    // The deck's top and its underside straight above (x, z), or null off its footprint.
    at(x: number, z: number) {
      const t = (x - a.x) * ux + (z - a.z) * uz,
        w = -(x - a.x) * uz + (z - a.z) * ux;
      if (t < -over || t > run + over || Math.abs(w) > SERVICE_WIDTH / 2) return null;
      const top = a.y + slope * t;
      return { top, under: top - THICK * Math.hypot(1, slope) };
    },
  };
});

test('the hook walk has no ledge across its centreline', () => {
  const ledges: string[] = [];
  for (let k = 0; k < decks.length; k++) {
    const a = points[k]!,
      b = points[k + 1]!,
      n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1);
    for (let j = 0; j <= n; j++) {
      const x = a.x + ((b.x - a.x) * j) / n,
        z = a.z + ((b.z - a.z) * j) / n;
      const feet = decks[k]!.at(x, z)!.top;
      // Anything inside the walker's footprint that stands proud of where its feet are, and is not overhead.
      for (const d of decks)
        for (let r = 0; r < 8; r++) {
          const s = d.at(x + PLAYER_R * Math.cos((r * Math.PI) / 4), z + PLAYER_R * Math.sin((r * Math.PI) / 4));
          if (s && s.top - feet > LEDGE && s.under < feet + 2 * PLAYER_R) {
            ledges.push(
              `deck ${d.i} stands ${(s.top - feet).toFixed(2)} m above deck ${k + 1} at (${x.toFixed(2)}, ${z.toFixed(2)})`,
            );
            break;
          }
        }
    }
  }
  assert.deepEqual(ledges.slice(0, 3), [], `${ledges.length} centreline samples meet a ledge`);
});
