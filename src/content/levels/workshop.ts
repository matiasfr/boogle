import { defineLevel } from '../../prefab/types.ts';
// The room owner's frame has its origin on the finished floor, just as makeWorkshop's group does.
export const levels = [
  defineLevel({
    place: 'workshop',
    placements: [{ id: 'forge-workshop', prefab: 'town.workshop-chair', pos: [2.7, 0, 0.3] }],
  }),
];
