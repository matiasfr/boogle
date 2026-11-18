// The caves' furnishing (src/pois/caves/decor.ts stands each thing where it probes the cave): lanterns, the mouths'
// timber frames and name boards, the hub's signpost, the mine, the pond and the wine cellar. Pieces are
// src/prefab/builders/poi-caves.ts's; solids are in the CAVE group, so only bodies underground touch them.
import { definePrefab, type ColliderDef, type PrefabDef } from '../../prefab/types.ts';

const parts = (key: string, colliders: ColliderDef[] = [], extra: Partial<PrefabDef> = {}) =>
  definePrefab({
    key: `cave.${key}`,
    scope: 'place',
    visual: { builder: 'poi.cave-parts', params: { piece: key } },
    colliders,
    ...extra,
  } as PrefabDef);
const solid = (at: [number, number, number], half: [number, number, number], rot?: number): ColliderDef => ({
  shape: 'box',
  at,
  half,
  ...(rot === undefined ? {} : { rot: [rot, 0, 0] }),
  group: 'cave',
});
/** A painted board (its words are decor.ts's), facing local +z. */
const board = (key: string, w: number, h: number, z = 0) =>
  definePrefab({
    key: `cave.${key}`,
    scope: 'place',
    visual: { none: true },
    colliders: [],
    attach: { board: { kind: 'label', at: [0, 0, z], facing: [0, 0, 1], w, h, posts: 'none' } },
  });
const light = { light: { kind: 'point', at: [0, 0, 0] } } as const;

export const prefabs = [
  parts('lantern', [], { attach: light }),
  parts('lantern-arm'),
  parts('mouth-frame'),
  board('mouth-board', 2.2, 0.55),
  board('sign-board', 1.5, 0.34, 0.012),
  board('mine-board', 2.6, 0.6),
  parts('signpost', [solid([0, 1.3, 0], [0.1, 1.3, 0.1])]),
  parts('stalactite'),
  parts('sleeper'),
  parts('rail'),
  parts('support-post', [solid([0, 0, 0], [0.12, 1.35, 0.12])]),
  parts('support-beam'),
  parts('minecart', [solid([0, 0.75, 0], [0.5, 0.45, 0.72])]),
  parts('ore-load'),
  // A unit crate: its placement scales it (and its solid), and the crate alone turns.
  parts('crate', [solid([0, 0, 0], [0.5, 0.5, 0.5])]),
  parts('pickaxe'),
  parts('lamp-post'),
  parts('ore-vein'),
  definePrefab({ key: 'cave.pond', scope: 'place', visual: { builder: 'poi.cave-water', params: {} }, colliders: [] }),
  parts('crystals', [], { attach: { light: { kind: 'point', at: [0, 0.8, 0] } } }),
  parts('mushroom'),
  parts('rowboat', [solid([0, 0.3, 0], [0.5, 0.3, 1.2], 0.4)]),
  // Bays spread evenly along the cellar's long walls: their width (and solid) comes from the cellar's length.
  definePrefab({
    key: 'cave.rack-bay',
    scope: 'place',
    visual: {
      builder: 'poi.cave-parts',
      params: { piece: 'rack-bay', length: 9.6, margin: 2.8, pitch: 0.95 }, // length: the cellar's (network.ts)
    },
    colliders: [],
    layout: { kind: 'cellar-rack' },
  }),
  // The placement stretches the shelf (and its solid) along the wall.
  parts('bottle-shelf', [solid([0, 1.2, 0], [0.3, 1.2, 0.6])]),
  parts('bottles'),
  parts('cask', [solid([0, 1.15, 0], [1.1, 1.15, 1.1])]),
  parts('table', [solid([0, 0.42, 0], [1.1, 0.42, 0.55])], { attach: { light: { kind: 'point', at: [0.4, 1.3, 0] } } }),
  parts('stool', [solid([0, 0.25, 0], [0.25, 0.25, 0.25])]),
];
