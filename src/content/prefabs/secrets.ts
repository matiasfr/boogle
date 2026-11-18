// The secrets' fixed things (src/entities/finds/secrets-view.ts): the ground their boxes stand on (Place's buildPads and
// buildChestStands) and the clues that make you look twice (its buildClues). Their builders are
// src/prefab/builders/secrets.ts; content/levels/secrets.ts places them. The boxes themselves, what's found and what it
// gives stay the view's: they are state, not records.
import { definePrefab, type ColliderDef } from '../../prefab/types.ts';

const STONE = '#917b5e',
  STONE2 = '#b6a080',
  WOOD = '#8a6238';
/** A unit cube: the placement's scale sizes it. What looks solid is solid. */
const UNIT: ColliderDef = { shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] };
/** A clue's pole, square to the world however the clue is turned. */
const POLE: ColliderDef = { shape: 'box', at: [0, 1.2, 0], half: [0.15, 1.2, 0.15] };

/** A solid box in one colour, sized by its placement. */
const box = (key: `secrets.${string}`, color: string) =>
  definePrefab({ key, scope: 'owner', visual: { builder: 'secrets.box', params: { color } }, colliders: [UNIT] });
/** A seven-sided stone column, rBottom at its foot and rTop at its top, a metre tall until its placement stands it up. */
const column = (key: `secrets.${string}`, rBottom: number, rTop: number) =>
  definePrefab({
    key,
    scope: 'owner',
    visual: { builder: 'secrets.column', params: { rTop, rBottom, color: STONE } },
    colliders: [{ shape: 'cylinder', at: [0, 0, 0], rTop, rBottom, h: 1, segments: 7 }],
  });
/** A clue, turned by its placement's `yaw`; `solid` gives it its pole's solid. */
const clue = (piece: string, solid = false) =>
  definePrefab({
    key: `secrets.${piece}`,
    scope: 'owner',
    visual: { builder: 'secrets.clue', params: { piece } },
    colliders: solid ? [POLE] : [],
  });

export const prefabs = [
  // A ledge no ring serves, stone (the lookout's, the stack's): sized by its placement, top at its top.
  definePrefab({
    key: 'secrets.stone-pad',
    scope: 'owner',
    visual: { builder: 'secrets.stone-pad', params: {} },
    colliders: [UNIT],
  }),
  // The balcony's wooden ledge.
  box('secrets.ledge', WOOD),
  // A stone block under a ledge, solid all the way down into the ground.
  box('secrets.support', STONE),
  // The yard's fences.
  box('secrets.fence', WOOD),
  // The balcony's column in the village and the sea stack: Place's seven-sided tapered columns.
  column('secrets.balcony-column', 1.3, 1.1),
  column('secrets.stack-column', 5.4, 3.4),
  // The plinth a tower box stands on, a metre up. `box` is where the box stands.
  definePrefab({
    key: 'secrets.plinth',
    scope: 'owner',
    visual: { builder: 'secrets.box', params: { color: STONE2, size: [1.7, 1, 1.2] } },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.85, 0.5, 0.6] }],
    attach: { box: { kind: 'point', at: [0, 0.5, 0] } },
  }),
  clue('laundry', true),
  clue('scarf-branch'),
  clue('bell-post', true),
  clue('hard-hat'),
  clue('weather-vane', true),
  clue('flag'),
];
