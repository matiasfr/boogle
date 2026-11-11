// The `Railway` read model of a world, for the differential tests' old side alone (M8's queries, M8b's check corpus,
// M10's and M11's proofs): src/world/railway-predict.ts's `railwayOf` until M12 moved the client onto worlds. It links
// nothing to anything. M12b deletes it with the read model and those tests.
import type { World } from '../../src/ecs/index.ts';
import type { Railway } from '../../src/sim/railway.ts';
import { railwayView } from '../../src/sim/railway-read-model.ts';

export const railwayOf = (w: World): Railway => railwayView(w);
