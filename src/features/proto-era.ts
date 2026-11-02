// The greybox era swap prototype (docs/plans/find-the-fun.md step 4): behind ?proto=era, opening day and the block
// swap load from src/proto/era/ in their own chunk. Without the flag nothing loads and the game is unchanged. The
// shortcut button needs a `proto-` room: the host's env.protoRoom comes from src/features/proto-haul.ts (tabs) and
// server/src/host/world-host.ts (the server). Serves DESIGN.md 7 (Telegraph everything).
import { getRoomId } from '../netplay/net.ts';
import { isProtoRoom } from '../sim/tune.ts';
import { protoOn } from '../proto/flags.ts';

if (protoOn('era')) void import('../proto/era/index.ts').then((m) => m.shortcutButton(isProtoRoom(getRoomId())));
