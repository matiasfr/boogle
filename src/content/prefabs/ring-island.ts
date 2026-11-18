// Ring Island's things (src/entities/ring-island/): the greybox box its massing is drawn in (solid, drawn only, or
// solid and not drawn), a rim rock, the folk, the fingerpost's
// arms, the low map table, the summit lookout's deck, the drop hammer's head and the RINGWORKS board's face. Their
// builders are src/prefab/builders/ring-island.ts; src/content/levels/ring-island.ts places them. Colours are the
// greybox's (the view's palette).
import { definePrefab } from '../../prefab/types.ts';

export const prefabs = [
  // A unit cube of the island's massing, solid; the placement's scale sizes it, its rotation lays it along the line.
  definePrefab({
    key: 'ring.box',
    scope: 'place',
    visual: { builder: 'ring.box', params: {} },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
  }),
  // The same, drawn only (paint, posts and rails you walk past or through).
  definePrefab({
    key: 'ring.box-drawn',
    scope: 'place',
    visual: { builder: 'ring.box', params: {} },
    colliders: [],
  }),
  // The same, solid and not drawn (the foot crossing's slab, under its planks and bed).
  definePrefab({
    key: 'ring.box-solid',
    scope: 'place',
    visual: { none: true },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
  }),
  // A marker rock on the summit-side rim of the stack line's cutting: a dodecahedron of `radius` (the island's
  // summitRimRockShape, src/entities/ring-island/path.ts, which the view holds it to), scaled by the placement. Drawn
  // only: its solid is a ring.box-solid inscribed in it, placed after it.
  definePrefab({
    key: 'ring.rim-rock',
    scope: 'place',
    visual: { builder: 'ring.rim-rock', params: { radius: 0.62, color: '#c4beb0' } },
    colliders: [],
  }),
  // One of the folk (a looker, never Rivet): origin under their feet. Nothing solid.
  definePrefab({
    key: 'ring.folk',
    scope: 'place',
    visual: { builder: 'ring.folk', params: { body: '#7a8f6a', head: '#d6c69c', hat: '#ff8a1f', wave: false } },
    colliders: [],
  }),
  // A fingerpost arm, pointing along local +x: origin on the post at the arm's height. Drawn only.
  definePrefab({
    key: 'ring.fingerpost-arm',
    scope: 'place',
    visual: {
      builder: 'ring.fingerpost-arm',
      params: { timber: '#8a6a48', gold: '#ffc83a', dark: '#6a5038', leaf: '#7a8f6a' },
    },
    colliders: [],
  }),
  // The low map table, w by d, its top `legs` over the platform: origin at the middle of its top. Drawn only (the halt
  // map lies over its paint from the rivet: src/entities/railway/ring-map-table.ts). Its size and place are
  // src/entities/ring-island/state.ts's RING_MAP_TABLE (test/prefab-trees.test.ts holds them equal).
  definePrefab({
    key: 'ring.map-table',
    scope: 'place',
    visual: {
      builder: 'ring.map-table',
      params: {
        w: 2.4,
        d: 2.0,
        legs: 0.95,
        top: '#4f6b8a',
        legColor: '#6a5038',
        home: '#f4f1e8',
        gorgeColor: '#e8742c',
        canopyColor: '#7a8f6a',
        stop: '#5d5650',
        here: '#ffc83a',
      },
    },
    colliders: [],
  }),
  // The summit lookout's concrete deck and the orange rail posts round its rim: origin at the middle of its top.
  definePrefab({
    key: 'ring.summit-deck',
    scope: 'place',
    visual: {
      builder: 'ring.summit-deck',
      params: { rail: 5.7, posts: 14, rise: 1.1, deck: '#a6a29a', post: '#e8742c' },
    },
    // The deck, a seven-sided slab (Rapier's hull, as it always was); the rail posts are drawn only.
    colliders: [{ shape: 'cylinder', at: [0, -0.6, 0], rTop: 6, rBottom: 6.5, h: 1.2, segments: 7 }],
  }),
  // The drop hammer's head: origin at its middle, resting on the anvil. The island lifts and drops it every 2.4 s;
  // nothing solid (it swings through where you'd stand).
  definePrefab({
    key: 'ring.hammer-head',
    scope: 'place',
    visual: { builder: 'ring.hammer-head', params: { color: '#3d3a38' } },
    colliders: [],
  }),
  // The RINGWORKS board's face, 4.9 by 1.2 m, facing local +z. Its words and paint are the island's
  // (src/entities/ring-island/view.ts); the frame and legs are boxes.
  definePrefab({
    key: 'ring.board-face',
    scope: 'place',
    visual: { none: true },
    colliders: [],
    attach: { face: { kind: 'label', at: [0, 0, 0], facing: [0, 0, 1], w: 4.9, h: 1.2, posts: 'none' } },
  }),
];
