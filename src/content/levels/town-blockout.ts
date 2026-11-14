// The Round's blockout (docs/plans/home-flip.md, B3): the eight bought plots as plain blocks and the clock's footing.
// Every placement is in its own building's frame (x across the front, z out of the door, y above the ground there);
// src/entities/town/blockout.ts stands each at its `TOWN_BLOCKS` row, so a spacing change is one town-plan.ts row and
// no record. Sizes are the kits' authored numbers (test/town-plan.test.ts holds them to `TOWN_BLOCKS`).
import { defineLevel, type Placement } from '../../prefab/types.ts';

const PALE = '#e4e5e6';
const KITS = {
  house: { w: 7.4, d: 7.4, high: 3.84, mid: 1.92, face: 3.76, mat: 4.3 },
  cottage: { w: 5.4, d: 4.4, high: 3, mid: 1.5, face: 2.26, mat: 2.8 },
} as const;
const PLOTS = [
  ['plot1', 'house'],
  ['plot2', 'house'],
  ['plot3', 'house'],
  ['plot4', 'cottage'],
  ['plot5', 'cottage'],
  ['plot6', 'house'],
  ['plot7', 'cottage'],
  ['plot8', 'house'],
] as const;

const placements: Placement[] = PLOTS.flatMap(([plot, kit]): Placement[] => {
  const k = KITS[kit],
    id = `town.block.${plot}`,
    pale = { colour: PALE };
  return [
    { id, prefab: 'greybox.box', pos: [0, k.mid, 0], scale: [k.w, k.high, k.d] },
    // The door side: a pale panel proud of the door face, and a pale mat on the ground against the wall
    // (inside the quarry road's 1.25 m verge), so the door side reads from above.
    { id: `${id}.door`, prefab: 'greybox.decoration', pos: [0, 1, k.face], scale: [1.2, 2, 0.12], params: pale },
    { id: `${id}.mat`, prefab: 'greybox.decoration', pos: [0, 0.03, k.mat], scale: [1.6, 0.06, 1.2], params: pale },
  ];
});
placements.push({ id: 'town.footing', prefab: 'greybox.box', pos: [0, 0.15, 0], scale: [5, 0.3, 5] });

export const levels = [defineLevel({ place: 'town-blockout', placements })];
