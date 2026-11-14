// The rotunda's blockout records (docs/plans/roundhouse-rotunda.md, step 1b): plain blocks at the kit's true sizes, to
// walk the spacing before any art. Every record is in a piece's own frame: the origin is the table's centre on the
// ground, +z runs out along the piece's bearing and +x across it, so one record serves every bay of every hub and a
// placement carries only where round the table it stands (dev/prefab/rotunda.ts). The drawn shapes come from the kit
// (src/place/rotunda.ts) in src/prefab/builders/roundhouse-block.ts; the solids below are boxes sized to them by hand,
// each within a hand of the drawn wedge. The finished kit replaces these records (the plan's step 4).
import { definePrefab } from '../../prefab/types.ts';
import type { ColliderDef, PrefabDef } from '../../prefab/types.ts';

const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number, pitch = 0): ColliderDef => ({
  shape: 'box',
  at: [x, y, z],
  half: [hx, hy, hz],
  ...(pitch ? { rot: [0, pitch, 0] as const } : {}),
});
const block = (part: string, colliders: ColliderDef[]): PrefabDef => ({
  key: `roundhouse.${part}-block`,
  visual: { builder: 'roundhouse.bay-block', params: { part } },
  colliders,
  scope: 'owner',
});
/** The door wall stands 14 m out: a pier each side of the 3.6 m door, 0.8 m deep, and the lintel over 4.6 m. */
const PIER_X = 2.12,
  PIER_Z = 14.2;
/** The roof falls 1.4 m over the bay's depth (0.129 rad), in three lengths that widen with the wedge. */
const ROOF_PITCH = 0.129;

export const prefabs = [
  definePrefab(
    block('bay', [
      box(-PIER_X, 3.1, PIER_Z, 0.31, 3.1, 0.4),
      box(PIER_X, 3.1, PIER_Z, 0.31, 3.1, 0.4),
      box(0, 5.4, PIER_Z, 1.8, 0.8, 0.4),
      box(0, 2.4, 24.47, 4.34, 2.4, 0.15),
      box(0, 6.116, 15.6, 3.07, 0.15, 1.82, ROOF_PITCH),
      box(0, 5.65, 19.2, 3.7, 0.15, 1.82, ROOF_PITCH),
      box(0, 5.184, 22.81, 4.34, 0.15, 1.82, ROOF_PITCH),
    ]),
  ),
  // A ruin's piers stand 3.2 m to full height (the placement says which). The solid is 3.1 m: under the lowest drawn
  // top and over what two jumps reach from the ground (2.9 m), so nobody stands inside a taller pier.
  definePrefab(
    block('bay-ruin', [box(-PIER_X, 1.55, PIER_Z, 0.31, 1.55, 0.4), box(PIER_X, 1.55, PIER_Z, 0.31, 1.55, 0.4)]),
  ),
  definePrefab(block('bay-door', [box(0, 2.3, PIER_Z, 1.8, 2.3, 0.1)])),
  definePrefab(block('end-wall', [box(0, 2.4, 19.5, 0.15, 2.4, 5.5)])),
  definePrefab(block('bay-outline', [])),
  // The table is flush with the yard: a low disc to stand on. Its kerb is drawn only (a 0.15 m rise; design review,
  // call 2: flush if it snags a walk), and the bridge is the Roundhouse view's, since it turns.
  definePrefab({
    key: 'roundhouse.table-block',
    visual: { builder: 'roundhouse.table-block', params: {} },
    colliders: [{ shape: 'trunk', at: [0, 0.03, 0], r: 8.15, h: 0.06 }],
    scope: 'owner',
  }),
];
