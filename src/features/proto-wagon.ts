// The placeholder wagon prototype (docs/plans/find-the-fun.md steps 2-3): behind ?proto=wagon, a greybox steam wagon
// you can ride runs the laid sections (src/proto/wagon/, in its own chunk). Without the flag nothing loads and the game
// is unchanged. Its Lay and Reset buttons need a `proto-` room. Serves DESIGN.md 1 (Toys before chores).
import { getRoomId } from '../netplay/net.ts';
import { isProtoRoom } from '../sim/tune.ts';
import { protoOn } from '../proto/flags.ts';

if (protoOn('wagon')) void import('../proto/wagon/index.ts').then((m) => m.wagonPanel(isProtoRoom(getRoomId())));
