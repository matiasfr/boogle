// The railway places a returning visitor before the cover lifts and their first pose is published.
// A recent spot takes priority. With no spot, arrival can wait briefly for a friend's halt.
// Serves DESIGN.md 8 (Enjoyable alone and together).
import { holdCover } from '../boot/cover-hold.ts';
import { getRoomId, holdPresencePose } from '../netplay/net.ts';
import { returnKey, returnSettle, storedReturn } from '../place/return-settle.ts';
import { haltLandings, returnCandidates } from '../place/return-spot.ts';
import { returnArea } from '../entities/route-greybox/state.ts';
import { localStore } from '../place/return-tuning.ts';
import { fallsIn, isFirstVisit } from '../player/arrival.ts';
import { replacedStage } from '../boot/world-reset.ts';
import { identity } from '../player/identity.ts';
import { pageQuery, productionRailway } from '../proto/flags.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';

if (productionRailway) {
  const spot =
    !fallsIn() && storedReturn(localStore(), returnKey(railwayRoomId(getRoomId()), identity.pid), Date.now()).spot;
  returnSettle.source(() => !!spot || (!isFirstVisit() && !replacedStage));
  if (spot && spot.ride?.halt) {
    const first = returnCandidates(spot, haltLandings())[0];
    if (first?.halt === spot.ride.halt) returnArea.platform = first;
  }
  // `returncover=0` (a harness flag, like `intro=`) lets the cover lift on time, to look at the late placement's fade.
  if (pageQuery().get('returncover') !== '0') holdCover(() => returnSettle.pending());
  holdPresencePose(() => returnSettle.pending());
}
