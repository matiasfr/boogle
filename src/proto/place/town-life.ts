// The town you can go into (docs/plans/round-4.md, step 6), wired together: ./rooms.ts the buildings and the indoor camera,
// ./house.ts, ./shop.ts and ./museum.ts what's in them, ./residents.ts who's there and what they notice, ./town-lines.ts every word.
// An optional side activity: nothing here gates the job (DESIGN.md 3). The house stands from the start, and the shop and the
// museum rise when the first path opens, so you've got money to be priced out of and something to see in miniature when you walk
// home across your bridge. They read shared state, so two people see the same buildings; everything else indoors is Local.
import { camConstraints } from '../../player/player.ts';
import { registerInteractable } from '../../player/hands.ts';
import { placeWardrobe } from './gifts.ts';
import { youGot } from './got.ts';
import { hasFact } from './growth.ts';
import { createHouse } from './house.ts';
import { L1, lines, machine } from './lines.ts';
import { createMuseum, type MuseumEnv } from './museum.ts';
import { placeResidents, shoreWorker } from './place-residents.ts';
import {
  indoorCamera,
  indoors,
  placeRooms,
  placeRoomsOwner,
  roomEnv,
  rooms,
  stakeBoard,
  updateRooms,
  warmRooms,
} from './place-rooms.ts';
import { money } from './score.ts';
import { TREES, standing } from './chop.ts';
import { forge } from './forge.ts';
import { job } from './job.ts';
import { run } from './run.ts';
import { sites } from '../../place/sites.ts';
import { createShop } from './shop.ts';
import { updateTalkCard, talking } from '../../place/talk.ts';
import { BOARDS } from './town-lines.ts';

roomEnv.up = (id) => id === 'house' || L1.open;
stakeBoard(rooms.shop, BOARDS.shopPlot);
stakeBoard(rooms.museum, BOARDS.museumPlot);
// The indoor camera goes last, as before, so a pull-out or the telescope comes first.
camConstraints.splice(camConstraints.indexOf(indoorCamera), 1);
camConstraints.push(indoorCamera);
const house = createHouse(placeRoomsOwner, rooms.house, { has: hasFact });
const shop = createShop(placeRoomsOwner, placeRooms, { has: hasFact, money, youGot }, placeWardrobe, placeResidents.say);
registerInteractable(shop.targets);
/** The museum's table, from Place's own modules: every site going up or done, the track as far as it's laid. */
const museumEnv: MuseumEnv = {
  *buildings() {
    for (const q of sites)
      if (q.state !== 'none') yield { plan: q.plan, grow: q.state === 'done' ? 1 : q.t / q.doneAt };
  },
  forgeLit: () => forge.lit,
  *trees() {
    for (const t of TREES) if (standing(t)) yield t;
  },
  *rails() {
    for (const l of lines) {
      const { line, dir } = l.spec;
      const head = run.line === l ? run.head : l.open ? (dir > 0 ? line.len : 0) : dir > 0 ? 7 : line.len - 30;
      const stubTo = dir < 0 ? 30 : 0; // line 1 starts with its village stub down
      const lo = dir > 0 ? 0 : head,
        hi = dir > 0 ? head : line.len;
      yield { line, lo, hi };
      if (stubTo && lo > stubTo) yield { line, lo: 0, hi: stubTo };
    }
  },
  *movers() {
    const f = machine.flatbed;
    yield { x: f.x, y: f.y, z: f.z, kind: 'machine' };
    if (job.rung.trains)
      for (const l of lines) {
        const c = l.train.tr.cars[0]!;
        yield { x: c.x, y: c.y, z: c.z, kind: 'train' };
      }
  },
  people: () => job.people,
};
const museum = createMuseum(placeRoomsOwner, placeRooms, museumEnv);
const { listPrice } = shop;
let warmed = false;
export function updateTownLife(dt: number) {
  if (!warmed) {
    warmed = true;
    warmRooms();
  }
  updateRooms(dt);
  house.update();
  shop.update();
  museum.update(dt);
  shoreWorker.update(dt);
  placeResidents.update(dt);
  updateTalkCard();
}
export function resetTownLife() {
  placeResidents.reset();
  shoreWorker.reset();
}
/** For the evals. */
export const townLife = { rooms, indoors, talking, listPrice, guys: placeResidents.guys };
