// The haul playtest kit (docs/playtest-kits/haul.md): with `?proto=haul` this loads src/debug/haul-kit.ts in its own
// chunk, a live tuning panel for the haul loop (Local feel numbers, and in a `proto-` room the room-wide lockstep
// ones). Without the flag nothing loads. It also hands the host check for tuning (env.protoRoom: is this a `proto-`
// room) to validate, for the rare tab that hosts; the server sets its own (src/world/rules/tune.ts).
// Serves DESIGN.md 1 (toys before chores: tune the haul until carrying a load of wood is fun with no goal).
import { setEnv } from '../world/sync.ts';
import { getRoomId } from '../netplay/net.ts';
import { isProtoRoom } from '../sim/tune.ts';

setEnv({ protoRoom: isProtoRoom(getRoomId()) });
if (new URLSearchParams(location.search).get('proto') === 'haul') {
  import('../debug/haul-kit.ts');
  import('../proto/haul/index.ts'); // pickup feel, and with &v=barrow or &v=toss another way to move logs
}
