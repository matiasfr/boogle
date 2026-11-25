import { defineLevel, type Placement, type Vec3 } from '../../prefab/types.ts';

// Metres from the earth floor. The front opens south toward the home meadow.
const pieces: Placement[] = [];
function part(id: string, prefab: Placement['prefab'], pos: Vec3, scale: Vec3, roll = 0) {
  pieces.push({ id, prefab, pos, scale, ...(roll ? { rot: [0, 0, roll] as const } : {}) });
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
// The original ceiling stays at the eaves. Two solid slopes carry the wooden roof courses.
for (const side of [-1, 1]) {
  part('roof/slope' + side, wood, [side * 1.44, 4.02, 0], [3.18, 0.16, 4.88], -side * 0.4);
  for (let row = 0; row < 4; row++) {
    part(
      'roof/course' + side + '-' + row,
      'poi.hut-roof-board',
      [side * ((35 + row * 72) / 100), (4580 - row * 305) / 1000, 0],
      [0.83, 0.12, 4.96],
      -side * 0.4,
    );
  }
  for (let row = 0; row < 7; row++) {
    part(
      'roof/gable' + side + '-' + row,
      'poi.hut-board',
      [0, (348 + row * 17) / 100, side * 2.02],
      [(524 - row * 77) / 100, 0.175, 0.18],
    );
  }
}
part('roof/brim', 'poi.hut-felt', [-0.12, 4.79, -0.65], [0.88, 0.18, 0.88]);
part('roof/crown', 'poi.hut-felt', [-0.12, 5.43, -0.65], [0.48, 1.16, 0.48]);
part('front/brow', 'poi.hut-trim', [0, 3.02, 2.2], [2.8, 0.22, 0.2], -0.065);
const trim = 'poi.hut-trim';
for (const side of [-1, 1]) {
  const cx = side * 1.84;
  part('front/frame' + side, trim, [cx, 1.75, 2], [0.91, 1.18, 0.29]);
  part('front/pane' + side, 'poi.hut-glass', [cx, 1.75, 2], [0.68, 0.93, 0.31]);
  part('front/mullion' + side, trim, [cx, 1.75, 2], [0.07, 0.94, 0.33]);
  part('front/crossbar' + side, trim, [cx, 1.73, 2], [0.7, 0.08, 0.34]);
  part('front/sill' + side, 'poi.hut-board', [cx, 1.13, 2.1], [1.12, 0.12, 0.42]);
  part('side-1/shutter' + side, 'poi.hut-shutter', [-2.53, 1.75, side * 0.89], [0.12, 1.13, 0.42]);
}
part('side-1/frame', trim, [-2.38, 1.75, 0], [0.3, 1.22, 1.32]);
part('side-1/pane', 'poi.hut-glass', [-2.38, 1.75, 0], [0.32, 0.96, 1.07]);
part('side-1/mullion', trim, [-2.38, 1.75, 0], [0.34, 0.96, 0.08]);
for (let i = 0; i < 10; i++) {
  part('bench/plank' + i, 'poi.hut-board', [(-207 + 46 * i) / 100, 0.017, 0], [0.452, 0.044, 3.97]);
}
part('bench', 'secrets.ledge', [-1.35, 0.23, -1.38], [1.6, 0.46, 0.62]);
part('back/peg', trim, [-1.25, 1.56, -1.68], [0.15, 0.14, 0.52]);
part('back/spare-brim', 'poi.hut-spare', [-1.25, 1.66, -1.47], [0.34, 0.07, 0.34]);
part('back/spare-crown', 'poi.hut-spare', [-1.25, 1.94, -1.47], [0.18, 0.5, 0.18]);

export const levels = [defineLevel({ place: 'boogler-hut', placements: pieces })];
