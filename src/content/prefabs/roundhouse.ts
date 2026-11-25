// Finished rotunda kit. Origin: the table centre at yard level; +z out along the bay, +x across.
// Separate door states retain record-owned collision; steel framing uses a second shared shell batch.
// The bay's structural solids retain step 1b's clearances, with the raised monitor added above its roof.
import { definePrefab } from '../../prefab/types.ts';
import type { ColliderDef } from '../../prefab/types.ts';

const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number, pitch = 0): ColliderDef => ({
  shape: 'box',
  at: [x, y, z],
  half: [hx, hy, hz],
  ...(pitch ? { rot: [0, pitch, 0] as const } : {}),
});
/** The door wall stands 14 m out: a pier each side of the 3.6 m door, 0.8 m deep, and the lintel over 4.6 m. */
const PIER_X = 2.12,
  PIER_Z = 14.2;
/** The roof falls 1.4 m over the bay's depth (0.129 rad), in three lengths that widen with the wedge. */
const ROOF_PITCH = 0.129;
const BAY_SOLIDS = [
  box(-PIER_X, 3.1, PIER_Z, 0.31, 3.1, 0.4),
  box(PIER_X, 3.1, PIER_Z, 0.31, 3.1, 0.4),
  box(0, 5.4, PIER_Z, 1.8, 0.8, 0.4),
  box(0, 2.4, 24.47, 4.34, 2.4, 0.15),
  box(0, 6.116, 15.6, 3.07, 0.15, 1.82, ROOF_PITCH),
  box(0, 5.65, 19.2, 3.7, 0.15, 1.82, ROOF_PITCH),
  box(0, 5.184, 22.81, 4.34, 0.15, 1.82, ROOF_PITCH),
  // The raised monitor is solid; the approach eaves keep the blockout's reach.
  box(0, 6.44, 17.72, 3.12, 0.45, 1.0, ROOF_PITCH),
];

export const prefabs = [
  definePrefab({
    key: 'roundhouse.steel-pallet',
    visual: { builder: 'roundhouse.bay', params: { part: 'pallet' } },
    colliders: [box(0, 0.09, 0, 0.75, 0.09, 1.05)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.steel-block',
    visual: { builder: 'roundhouse.bay', params: { part: 'steel-block' }, batch: 'steel-store' },
    colliders: [box(0, 0, 0, 0.28, 0.2, 0.28)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.waiting-engine',
    visual: { builder: 'roundhouse.bay', params: { part: 'waiting-engine' }, batch: 'rotunda-waiting-engines' },
    // A covered, parked engine is solid, without a cab/seat or a train in the simulation.
    colliders: [box(0, 1.85, 18.5, 1.2, 1.45, 2.2)],
    scope: 'owner',
  }),
  // Garage step 4: a line's works copy in its bay. The engine itself is drawn by the view (rotunda-view.ts), wearing the
  // line's row; the record holds its solid and the plate in the line's colour (params.colour), and the Strong flatbed.
  definePrefab({
    key: 'roundhouse.copy-plate',
    visual: { builder: 'roundhouse.bay', params: { part: 'copy-plate' } },
    // z 17.9 and 22.1 are src/place/rotunda.ts COPY_AT's engine and flatbed (records import no place code).
    colliders: [box(0, 1.85, 17.9, 1.2, 1.45, 2.2)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.copy-flatbed',
    visual: { builder: 'roundhouse.bay', params: { part: 'copy-flatbed' }, batch: 'rotunda-copy-flatbeds' },
    colliders: [box(0, 0.59, 22.1, 1.1, 0.35, 1.6)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.bay-ruin',
    visual: { builder: 'roundhouse.bay', params: { part: 'ruin' } },
    // Placement-authored broken tops are all >=3.2 m; keep the 1b solid at 3.1 m.
    colliders: [box(-PIER_X, 1.55, PIER_Z, 0.31, 1.55, 0.4), box(PIER_X, 1.55, PIER_Z, 0.31, 1.55, 0.4)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.bay-outline',
    visual: { builder: 'roundhouse.bay', params: { part: 'outline' }, batch: 'rotunda-outlines' },
    colliders: [],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.bay-doors',
    visual: { builder: 'roundhouse.bay', params: { part: 'doors' }, batch: 'rotunda-doors' },
    colliders: [box(0, 2.3, PIER_Z, 1.8, 2.3, 0.1)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.end-wall',
    visual: { builder: 'roundhouse.bay', params: { part: 'wall' }, batch: 'rotunda-end-walls' },
    colliders: [box(0, 2.4, 19.5, 0.15, 2.4, 5.5)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.bay',
    visual: { builder: 'roundhouse.bay', params: { part: 'bay' }, batch: 'rotunda-bays' },
    colliders: BAY_SOLIDS,
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.bay-steel',
    visual: { builder: 'roundhouse.bay', params: { part: 'bay', steel: true }, batch: 'rotunda-steel-bays' },
    colliders: BAY_SOLIDS,
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.bay-open-doors',
    visual: { builder: 'roundhouse.bay', params: { part: 'open-doors' }, batch: 'rotunda-open-doors' },
    colliders: [box(-2.03, 2.3, 15.08, 0.1, 2.3, 0.89), box(2.03, 2.3, 15.08, 0.1, 2.3, 0.89)],
    scope: 'owner',
  }),
  definePrefab({
    key: 'roundhouse.table',
    visual: { builder: 'roundhouse.table', params: {} },
    // The loader expands these authored dimensions to 48 tangent boxes; the floor is the terrain.
    layout: { kind: 'pit-ring', inner: 8.15, outer: 8.6, bottom: -0.9, top: 0.15, segments: 48 },
    colliders: [{ shape: 'trunk', at: [0, -0.65, 0], r: 0.65, h: 0.5 }],
    scope: 'owner',
  }),
];
