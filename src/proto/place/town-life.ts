// The town you can go into (docs/plans/round-4.md, step 6), wired together: ./rooms.ts the buildings and the indoor camera,
// ./house.ts, ./shop.ts and ./museum.ts what's in them, ./residents.ts who's there and what they notice, ./town-lines.ts every word.
// An optional side activity: nothing here gates the job (DESIGN.md 3). The house stands from the start, and the shop and the
// museum rise when the first path opens, so you've got money to be priced out of and something to see in miniature when you walk
// home across your bridge. They read shared state, so two people see the same buildings; everything else indoors is Local.
import { camConstraints } from '../../player/player.ts';
import { updateHouse } from './house.ts';
import { L1 } from './lines.ts';
import { updateMuseum } from './museum.ts';
import { guys, resetResidents, updateResidents } from './residents.ts';
import { indoorCamera, indoors, roomEnv, rooms, stakeBoard, updateRooms, warmRooms } from './rooms.ts';
import { listPrice, updateShop } from './shop.ts';
import { updateTalkCard, talking } from './talk.ts';
import { BOARDS } from './town-lines.ts';

roomEnv.up = (id) => id === 'house' || L1.open;
stakeBoard(rooms.shop, BOARDS.shopPlot);
stakeBoard(rooms.museum, BOARDS.museumPlot);
camConstraints.push(indoorCamera);
let warmed = false;
export function updateTownLife(dt: number) {
  if (!warmed) {
    warmed = true;
    warmRooms();
  }
  updateRooms(dt);
  updateHouse();
  updateShop();
  updateMuseum(dt);
  updateResidents(dt);
  updateTalkCard();
}
export const resetTownLife = resetResidents;
/** For the evals. */
export const townLife = { rooms, indoors, talking, listPrice, guys };
