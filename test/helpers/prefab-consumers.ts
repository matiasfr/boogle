// Startup-only imports: evaluating a page module must not acquire or call its legacy constructor API.
import '../../src/entities/town/workshop-kit.ts';
import '../../src/entities/town/shop.ts';
// The existing owner imports curio through view.ts; no new legacy constructor consumer.
import '../../src/entities/town/index.ts';
import '../../src/entities/town/museum.ts';
import { ROOM_CAM } from '../../src/entities/town/rooms.ts';
import '../../src/entities/town/house.ts';
import '../../src/entities/route-greybox/boxes.ts';
import '../../src/entities/route-greybox/leg2-draw.ts';
import '../../src/prefab/instantiate.ts';
import '../../src/entities/railway/halt-kit.ts';

export const roomCamera = ROOM_CAM;
