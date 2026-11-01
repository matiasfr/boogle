// The construction prototype (docs/plans/find-the-fun.md; "construction you can watch"): behind ?proto=build, the
// helper hut goes up piece by piece as its Helper ring fills, from src/proto/build/ in its own chunk. Without the flag
// nothing loads and the game is unchanged. The solo Pour and Reset buttons need a `proto-` room (env.protoRoom, from
// src/features/haul-kit.ts and the server). Serves DESIGN.md 7 (Telegraph everything) and 9 (Leave something for the
// next visitor).
import { getRoomId } from '../netplay/net.ts';
import { isProtoRoom } from '../sim/tune.ts';

if (new URLSearchParams(location.search).get('proto') === 'build')
  void import('../proto/build/index.ts').then((m) => m.shortcutButtons(isProtoRoom(getRoomId())));
