import { defineLevel } from '../../prefab/types.ts';
export const levels = [
  defineLevel({
    place: 'town-court',
    placements: [
      { id: 'town.goal-a', prefab: 'town.ball-court', pos: [0, 0, 0] },
      { id: 'town.goal-b', prefab: 'town.ball-court', pos: [0, 0, 0] },
      { id: 'town.ball-lever', prefab: 'town.ball-lever', pos: [0, 0, 0] },
    ],
  }),
];
