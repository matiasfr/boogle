// The lookout's things (src/entities/lookout/): the ridge telescope and the buoys pointing at Ring Island. Their builders
// are src/prefab/builders/lookout.ts.
import { definePrefab } from '../../prefab/types.ts';

export const prefabs = [
  // The brass telescope on its three legs. Origin: the ground under it. `eyepiece` is where Look through it is offered;
  // `eye` is where the fixed view starts from.
  definePrefab({
    key: 'lookout.telescope',
    scope: 'place',
    visual: { builder: 'lookout.telescope', params: {} },
    // The legs' spread, as one six-sided post.
    colliders: [{ shape: 'cylinder', at: [0, 1.3, 0], rTop: 0.6, rBottom: 0.6, h: 2.6, segments: 6 }],
    attach: {
      eyepiece: { kind: 'point', at: [0, 2.4, 0] },
      eye: { kind: 'point', at: [0, 2.57, 0] },
    },
    interactions: [{ action: 'lookout.look', at: 'eyepiece' }],
  }),
  // An orange buoy (a cone) and its white top, each one instanced draw for the whole line. Origin: the buoy's middle
  // afloat; the top rides `top` above it. No solids: they float out of reach.
  definePrefab({
    key: 'lookout.buoy',
    scope: 'place',
    visual: { builder: 'lookout.buoy', params: {}, batch: 'lookout:buoys' },
    colliders: [],
    attach: { top: { kind: 'point', at: [0, 1.45, 0] } },
  }),
  definePrefab({
    key: 'lookout.buoy-top',
    scope: 'place',
    visual: { builder: 'lookout.buoy-top', params: {}, batch: 'lookout:buoy-tops' },
    colliders: [],
  }),
];
