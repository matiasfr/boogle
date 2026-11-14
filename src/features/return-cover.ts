// Nobody sees a recent return being placed (docs/plans/resume-where-you-were.md, step 5; docs/game-design/first-run.md,
// "Returning visit"): with a remembered spot inside the return window, the loading screen stays up until the body
// stands there (src/boot/cover-hold.ts, at most 10 s in src/main.ts), and this tab publishes no pose until then, so a
// friend sees you appear in place and never at Home first. Local: reads this browser's own record; sends nothing new.
// Serves DESIGN.md 8 (Enjoyable alone and together).
import { holdCover } from '../boot/cover-hold.ts';
import { getRoomId, holdPresencePose } from '../netplay/net.ts';
import { returnKey, returnSettle, storedReturn } from '../place/return-settle.ts';
import { fallsIn } from '../player/arrival.ts';
import { identity } from '../player/identity.ts';
import { pageQuery, productionRailway } from '../proto/flags.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';

if (productionRailway) {
  returnSettle.source(
    () =>
      !fallsIn() && !!storedReturn(localStorage, returnKey(railwayRoomId(getRoomId()), identity.pid), Date.now()).spot,
  );
  // `returncover=0` (a harness flag, like `intro=`) lets the cover lift on time, to look at the late placement's fade.
  if (pageQuery().get('returncover') !== '0') holdCover(() => returnSettle.pending());
  holdPresencePose(() => returnSettle.pending());
}
