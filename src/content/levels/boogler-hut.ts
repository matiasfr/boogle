import { defineLevel, type Placement, type Vec3 } from '../../prefab/types.ts';

// Metres from the earth floor. The front opens south toward the home meadow.
const pieces: Placement[] = [];
function part(id: string, prefab: Placement['prefab'], pos: Vec3, scale: Vec3) {
  pieces.push({ id, prefab, pos, scale });
}
const wall = 'poi.hut-plaster';
const wood = 'poi.hut-timber';
part('back', wall, [0, 1.55, -2], [5, 3.3, 0.24]);
for (const side of [-1, 1]) {
  part('side' + side, wall, [side * 2.38, 1.55, 0], [0.24, 3.3, 4]);
  part('front' + side, wall, [side * 1.8, 1.55, 2], [1.4, 3.3, 0.24]);
  part('jamb' + side, wood, [side * 1.15, 1.42, 2.02], [0.18, 2.84, 0.34]);
}
part('lintel', wood, [0, 2.99, 2], [5.1, 0.42, 0.34]);
part('roof', wood, [0, 3.29, 0], [5.7, 0.22, 4.8]);
part('hat-brim', 'poi.hut-felt', [-1.2, 3.49, -0.7], [1.2, 0.18, 1.2]);
part('hat-crown', 'poi.hut-felt', [-1.2, 4.13, -0.7], [0.62, 1.16, 0.62]);
part('bench', 'secrets.ledge', [-1.35, 0.23, -1.38], [1.6, 0.46, 0.62]);

export const levels = [defineLevel({ place: 'boogler-hut', placements: pieces })];
