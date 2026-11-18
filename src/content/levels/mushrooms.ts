// Where the mushroom stall stands: x and z on the island, y above the ground there (src/adapters/mushroom-stall.ts resolves
// it on load; the artifact holds this operand, not the ground's height). dev/level/level.ts reads the same placement.
import { defineLevel } from '../../prefab/types.ts';

export const levels = [
  defineLevel({
    place: 'mushrooms',
    // Sunk 5 cm into the ground; yaw 3 turns the sign (the record's -z) to face about +z.
    placements: [{ id: 'stall', prefab: 'mushrooms.stall', pos: [15.2, -0.05, 13.4], rot: [3, 0, 0] }],
  }),
];
