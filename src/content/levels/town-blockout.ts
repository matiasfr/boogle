// The Round's blockout (docs/plans/home-flip.md, B3): the eight bought plots as plain blocks and the clock's footing.
// Every placement is in its own building's frame (x across the front, z out of the door, y above the ground there);
// src/entities/town/blockout.ts stands each at its `TOWN_BLOCKS` row, so a spacing change is one town-plan.ts row and
// no record. Sizes are the kits' authored numbers (test/town-plan.test.ts holds them to `TOWN_BLOCKS`).
import { defineLevel, type Placement } from '../../prefab/types.ts';

const PALE = '#e4e5e6';
// The mat is dark so it reads against the pale ground and the grey block from above (designer, B4 finding 6).
const DARK = '#3b3d40';
/** The door panel's width; the mat is wider than the door and 1.5 m deep, centred `mat` out from the block. */
const DOOR_WIDE = 1.2,
  MAT_WIDE = 1.6,
  MAT_DEEP = 1.5;
const KITS = {
  house: { w: 7.4, d: 7.4, high: 3.84, mid: 1.92, face: 3.76, mat: 4.45 },
  cottage: { w: 5.4, d: 4.4, high: 3, mid: 1.5, face: 2.26, mat: 2.95 },
} as const;
const PLOTS = [
  ['plot1', 'house'],
  ['plot2', 'house'],
  ['plot3', 'house'],
  ['plot4', 'cottage'],
  ['plot5', 'cottage'],
  // The quarry road's verge is 1.25 m at plot 6's front: its mat stops at the road's edge.
  ['plot6', 'house', { deep: 1.25, mat: 4.325 }],
  ['plot7', 'cottage'],
  ['plot8', 'house'],
] as readonly (readonly [string, keyof typeof KITS, { deep: number; mat: number }?])[];

const placements: Placement[] = PLOTS.flatMap(([plot, kit, short]): Placement[] => {
  const k = KITS[kit],
    id = `town.block.${plot}`,
    pale = { colour: PALE },
    deep = short?.deep ?? MAT_DEEP,
    mat = short?.mat ?? k.mat;
  return [
    { id, prefab: 'greybox.box', pos: [0, k.mid, 0], scale: [k.w, k.high, k.d] },
    // N1: the default drawn footprint is empty ground, with a low outline and the existing door mat.
    ...(
      [
        [0, -k.d / 2, k.w, 0.12],
        [0, k.d / 2, k.w, 0.12],
        [-k.w / 2, 0, 0.12, k.d - 0.12],
        [k.w / 2, 0, 0.12, k.d - 0.12],
      ] as const
    ).map(([x, z, w, d], edge): Placement => ({
      id: `${id}.outline.${edge}`,
      prefab: 'greybox.decoration',
      pos: [x, 0.025, z],
      scale: [w, 0.05, d],
      params: { colour: '#e4cf9b' },
    })),
    // The door side: a pale panel proud of the door face, and a dark mat wider than the door on the ground against
    // the wall, so the door side reads from above and on foot.
    { id: `${id}.door`, prefab: 'greybox.decoration', pos: [0, 1, k.face], scale: [DOOR_WIDE, 2, 0.12], params: pale },
    {
      id: `${id}.mat`,
      prefab: 'greybox.decoration',
      pos: [0, 0.03, mat],
      scale: [MAT_WIDE, 0.06, deep],
      params: { colour: DARK },
    },
  ];
});
placements.push({ id: 'town.footing', prefab: 'greybox.box', pos: [0, 0.15, 0], scale: [5, 0.3, 5] });
/** Whether The Boogler's stone statue stands on the footing. Off (owner, 15 November): the statue shows what he looks
 * like before he is met, so an unfinished statue under a sheet in a scaffold stands there instead, with the builders'
 * notice. The statue's record and builder are kept. Planned and not built: this becomes "the room has met The
 * Boogler" (docs/game-design/place.md, "Planned, not built"); no meeting logic exists yet. */
export const BOOGLER_STATUE_UNVEILED: boolean = false;
// Either stands at the same place under the same id; its plinth's foot is the footing's top.
placements.push(
  BOOGLER_STATUE_UNVEILED
    ? { id: 'town.statue', prefab: 'town.statue', pos: [0, 0.3, 0] }
    : { id: 'town.statue', prefab: 'town.statue-works', pos: [0, 0.3, 0], labels: { notice: 'statueWorks' } },
);

export const levels = [defineLevel({ place: 'town-blockout', placements })];
