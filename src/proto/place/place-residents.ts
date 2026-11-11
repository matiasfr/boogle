// ?proto=place's residents (./residents.ts) and shore worker (./shore-worker.ts), mounted once on ./place-rooms.ts's
// never-disposed owner, so ./town-life.ts and ./shop.ts share one instance. Their memory is Place's 'town' personal slice,
// as before. The live game mounts its own in src/entities/town/. Goes with Place in place-retirement D1.
import { registerInteractable } from '../../player/hands.ts';
import { pullOn } from './celebrate.ts';
import { showing } from './gifts.ts';
import { newestFact } from './growth.ts';
import { personalSlice } from './job.ts';
import { placeRooms, placeRoomsOwner } from './place-rooms.ts';
import { createResidents } from '../../entities/town/residents.ts';
import { createShoreWorker } from './shore-worker.ts';

export const placeResidents = createResidents(
  placeRoomsOwner,
  placeRooms,
  { newest: newestFact, hush: () => showing() || pullOn() },
  // Place saves the whole job on its own schedule (./job.ts), through the slice below.
  { load: () => null, save: () => {} },
);
export const shoreWorker = createShoreWorker(placeResidents);
personalSlice('town', {
  get: () => ({ ...placeResidents.seen(), ...shoreWorker.seen }),
  set: (v) => {
    placeResidents.restore(v);
    shoreWorker.restore((v ?? {}) as Record<string, unknown>);
  },
});
registerInteractable(() => {
  const a = placeResidents.targets(),
    b = shoreWorker.targets();
  return !b.length ? a : !a.length ? b : [...a, ...b];
});
