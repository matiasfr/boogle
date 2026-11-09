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
import { L1 } from './lines.ts';
import { updateMuseum } from './museum.ts';
import { guys, resetResidents, residentSay, updateResidents } from './residents.ts';
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
import { createShop } from './shop.ts';
import { updateTalkCard, talking } from './talk.ts';
import { BOARDS } from './town-lines.ts';

roomEnv.up = (id) => id === 'house' || L1.open;
stakeBoard(rooms.shop, BOARDS.shopPlot);
stakeBoard(rooms.museum, BOARDS.museumPlot);
// The indoor camera goes last, as before, so a pull-out or the telescope comes first.
camConstraints.splice(camConstraints.indexOf(indoorCamera), 1);
camConstraints.push(indoorCamera);
const house = createHouse(placeRoomsOwner, rooms.house, { has: hasFact });
const shop = createShop(placeRoomsOwner, placeRooms, { has: hasFact, money, youGot }, placeWardrobe, residentSay);
registerInteractable(shop.targets);
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
  updateMuseum(dt);
  updateResidents(dt);
  updateTalkCard();
}
export const resetTownLife = resetResidents;
/** For the evals. */
export const townLife = { rooms, indoors, talking, listPrice, guys };
