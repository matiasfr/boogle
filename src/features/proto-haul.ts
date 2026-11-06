// Hands the host check for tuning (env.protoRoom: is this a `proto-` room) to validate, for the rare tab that hosts; the
// server sets its own (src/world/rules/tune.ts).
import { setEnv } from '../world/sync.ts';
import { getRoomId } from '../netplay/net.ts';
import { isProtoRoom } from '../sim/tune.ts';

setEnv({ protoRoom: isProtoRoom(getRoomId()) });
