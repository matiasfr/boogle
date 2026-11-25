// The POIs' things (src/pois/): the lighthouse and the windmill farm (the caves' furnishing is ./caves.ts). Their builders are
// src/prefab/builders/poi-*.ts; where a solid's size comes from a dimension, a recipe derives it on load.
import { definePrefab } from '../../prefab/types.ts';

export const prefabs = [
  definePrefab({
    key: 'poi.hut-plaster',
    scope: 'place',
    visual: { builder: 'secrets.box', params: { color: '#e8dcc0' } },
    colliders: [{ group: 'room', shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
  }),
  definePrefab({
    key: 'poi.hut-timber',
    scope: 'place',
    visual: { builder: 'secrets.box', params: { color: '#7f5630' } },
    colliders: [{ group: 'room', shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
  }),
  definePrefab({
    key: 'poi.hut-felt',
    scope: 'place',
    visual: { builder: 'secrets.column', params: { color: '#393545', rTop: 1, rBottom: 0.96 } },
    colliders: [{ group: 'room', shape: 'cylinder', at: [0, 0, 0], rTop: 1, rBottom: 0.96, h: 1, segments: 7 }],
  }),
  // The striped tower on the hill, its gallery deck and the spiral stair round the outside. Origin: the middle of the
  // flat pad it stands on; the stair's foot faces local -x (inland).
  definePrefab({
    key: 'poi.lighthouse',
    scope: 'place',
    visual: {
      builder: 'poi.lighthouse',
      params: {
        plinthH: 0.3,
        plinthR: 3.7,
        towerH: 18,
        rBottom: 2.6,
        rTop: 2,
        deckR: 3.65,
        stairW: 1.3,
        turns: 2.5,
        segments: 90,
        railFrom: 0.035,
        headroom: 2.3,
      },
    },
    colliders: [],
    layout: { kind: 'lighthouse' },
  }),
  // The lantern room's glass, the lamp, its two beams and the halo. Origin: the middle of the deck's walkable top.
  definePrefab({
    key: 'poi.lighthouse-lantern',
    scope: 'place',
    visual: { builder: 'poi.lighthouse-lantern', params: {} },
    colliders: [],
  }),
  // A mill's tower, cap and door (origin: its foot). The sails are `poi.windmill-rotor`, kinematic and turned by the farm.
  definePrefab({
    key: 'poi.windmill',
    scope: 'place',
    visual: { builder: 'poi.windmill', params: {} },
    colliders: [
      // The plinth and tower (src/pois/windmills/model.ts: 0.9 + 7.2 high, radius 1.6 at the top, 2.5 + 0.4 at the
      // foot), and the cap; test/prefab-trees.test.ts holds them to the model.
      { shape: 'cylinder', at: [0, 4.05, 0], rTop: 1.6, rBottom: 2.9, h: 8.1, segments: 8 },
      { shape: 'sphere', at: [0, 8.1, 0], r: 2.1 },
    ],
  }),
  definePrefab({
    key: 'poi.windmill-rotor',
    scope: 'place',
    visual: { builder: 'poi.windmill-rotor', params: {} },
    colliders: [],
  }),
  definePrefab({
    key: 'poi.hay-bale',
    scope: 'place',
    visual: { builder: 'poi.hay-bale', params: {} },
    colliders: [{ shape: 'sphere', at: [0, 0, 0], r: 0.78 }],
  }),
  definePrefab({
    key: 'poi.fence-post',
    scope: 'place',
    visual: { builder: 'poi.fence-post', params: {} },
    colliders: [],
  }),
  definePrefab({
    key: 'poi.fence-rail',
    scope: 'place',
    visual: { builder: 'poi.fence-rail', params: {} },
    colliders: [],
  }),
];
