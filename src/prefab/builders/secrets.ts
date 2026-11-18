// The secrets' records (src/entities/finds/secrets-view.ts): the ground their boxes stand on and the clues that make you
// look twice. Every one is vertex-coloured pieces the secrets view merges into its one draw, in level order.
import * as THREE from 'three/webgpu';
import { registerBuilder, type Piece } from '../builders.ts';
import { merged, type Part } from '../../render/part-geometry.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'secrets.box': true;
    'secrets.stone-pad': true;
    'secrets.column': true;
    'secrets.clue': true;
  }
}
const finite = (value: unknown, name: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`prefabs: expected finite ${name}`);
  return value;
};
const colour = (value: unknown, name: string) => {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`prefabs: expected ${name} colour`);
  return value;
};
/** One piece per part, each with its own colour, under `matrix`. */
const pieces = (parts: Part[], matrix = new THREE.Matrix4()): Piece[] =>
  parts.map((p) => ({ geometry: merged([p]), matrix: matrix.clone(), color: p[7] }));

// A box in one colour: `size` metres, or a unit cube the placement's scale sizes.
registerBuilder('secrets.box', (params) => {
  const size = params.size ?? [1, 1, 1];
  if (!Array.isArray(size) || size.length !== 3) throw new Error('prefabs: expected box size');
  const [w, h, d] = size.map((n, i) => finite(n, `box size ${i}`));
  return {
    pieces: [
      { geometry: new THREE.BoxGeometry(w, h, d), matrix: new THREE.Matrix4(), color: colour(params.color, 'box') },
    ],
  };
});

// Place's stone pad: a pale landing cap, a warm stone body and four brass corner keys. The placement's scale is the pad's
// size (both widths and its thickness); the pieces are drawn in the unit frame it stretches, so the keys keep their size.
registerBuilder('secrets.stone-pad', (_params, _batch, placement) => {
  const [sx, sy, sz] = placement?.scale ?? [1, 1, 1];
  const hx = sx / 2,
    hz = sz / 2,
    thick = sy;
  const STONE = '#917b5e',
    BRASS = '#c79a3e';
  const parts: Part[] = [
    ['b', 0, -0.08, 0, hx * 2, thick - 0.16, hz * 2, STONE],
    ['b', 0, thick / 2 - 0.08, 0, hx * 2, 0.16, hz * 2, '#c6b28d'],
    ['b', 0, -thick / 2 + 0.06, 0, hx * 2 + 0.04, 0.12, hz * 2 + 0.04, '#6f604b'],
  ];
  for (const ex of [-1, 1])
    for (const ez of [-1, 1]) parts.push(['b', ex * (hx - 0.34), -0.02, ez * hz, 0.18, thick - 0.24, 0.045, BRASS]);
  return {
    pieces: pieces(parts.map(([k, x, y, z, w, h, d, c]) => [k, x / sx, y / sy, z / sz, w / sx, h / sy, d / sz, c])),
  };
});

// A seven-sided tapered stone column, a metre tall: the placement's scale stands it as high as it needs.
registerBuilder('secrets.column', (params) => ({
  pieces: [
    {
      geometry: new THREE.CylinderGeometry(
        finite(params.rTop, 'column top'),
        finite(params.rBottom, 'column foot'),
        1,
        7,
      ),
      matrix: new THREE.Matrix4(),
      color: colour(params.color, 'column'),
    },
  ],
}));

const BRASS = '#c79a3e';
/** The clues, standing on their origin; local +x is the way they lean or point. */
const CLUES: Record<string, Part[]> = {
  // A laundry pole and a line of washing.
  laundry: [
    ['b', 0, 1.1, 0, 0.12, 2.2, 0.12, '#7f5630'],
    ['b', 3.2, 2.05, -0.8, 6.6, 0.03, 0.03, '#e8e0d0'],
    ['b', 1.4, 1.65, -0.4, 0.7, 0.75, 0.04, '#d8392b'],
    ['b', 2.6, 1.7, -0.7, 0.55, 0.65, 0.04, '#3f6fb0'],
    ['b', 4.0, 1.68, -1.0, 0.6, 0.7, 0.04, '#f2e6c8'],
  ],
  // A scarf caught on a dead branch.
  'scarf-branch': [
    ['c', 0, 1.8, 0, 0.13, 3.6, 0.13, '#5c4530'],
    ['b', 0.5, 3.1, 0, 1.1, 0.07, 0.07, '#5c4530'],
    ['b', 0.9, 2.6, 0, 0.14, 0.95, 0.03, '#5f8f3e'],
  ],
  // A little bell under a bracket on a post; the bracket reaches along +x.
  'bell-post': [
    ['b', 0, 1.2, 0, 0.14, 2.4, 0.14, '#6e4c2a'],
    ['b', 0.4, 2.3, 0, 0.9, 0.1, 0.1, '#6e4c2a'],
    ['k', 0.75, 2.02, 0, 0.17, 0.34, 0.17, BRASS],
  ],
  // A yellow hard hat's worth of colour.
  'hard-hat': [['b', 0, 0.3, 0, 0.6, 0.6, 0.6, '#f2c81a']],
  // A canopy-shaped weather vane.
  'weather-vane': [
    ['b', 0, 2, 0, 0.1, 4, 0.1, '#3a302c'],
    ['s', 0, 4.1, 0, 1.2, 0.3, 0.46, '#2fb7a0'],
    ['b', 0, 3.8, 0, 2.4, 0.06, 0.06, BRASS],
  ],
  // A bright flag.
  flag: [
    ['b', 0, 2, 0, 0.1, 4, 0.1, '#3a302c'],
    ['b', 0.7, 3.6, 0, 1.3, 0.8, 0.04, '#f0752c'],
  ],
};
// A clue, turned `yaw` about its origin. The turn is the drawing's alone: a clue's solid (its record's) stays square to
// the world, as it always stood.
registerBuilder('secrets.clue', (params) => {
  const parts = typeof params.piece === 'string' ? CLUES[params.piece] : undefined;
  if (!parts) throw new Error('prefabs: unknown secrets clue');
  const turn = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, finite(params.yaw, 'clue yaw'));
  return { pieces: pieces(parts, new THREE.Matrix4().compose(new THREE.Vector3(), turn, new THREE.Vector3(1, 1, 1))) };
});
