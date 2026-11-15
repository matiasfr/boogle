import { definePrefab, type PrefabDef } from '../../prefab/types.ts';
export const prefabs: PrefabDef[] = [
  definePrefab({
    key: 'scenery.palm',
    scope: 'place',
    footprint: 0.5,
    visual: { builder: 'scenery.prop', params: { kind: 'palm' } },
    colliders: [{ shape: 'trunk-chain', at: [0, 0, 0], segments: 7, r: 0.32, lift: 0.25 }],
  }),
  definePrefab({
    key: 'scenery.broadleaf',
    scope: 'place',
    footprint: 0.45,
    visual: { builder: 'scenery.prop', params: { kind: 'broadleaf' } },
    colliders: [
      { shape: 'sphere', at: [0, 0.4, 0], r: 0.3 },
      { shape: 'sphere', at: [0, 1.2, 0], r: 0.3 },
    ],
  }),
  definePrefab({
    key: 'scenery.rock',
    scope: 'place',
    footprint: 0.95,
    wet: true,
    visual: { builder: 'scenery.prop', params: { kind: 'rock' } },
    colliders: [{ shape: 'sphere', at: [0, 0.1, 0], r: 0.82 }],
  }),
];
// Harvestable trees retain state-driven standing/growth/fall bodies in createTreeSolids. The record names
// their placement/visual; it must not allocate an extra static body alongside that existing owner.
prefabs.push(
  definePrefab({ key: 'scenery.tree', scope: 'place', visual: { builder: 'scenery.tree', params: {} }, colliders: [] }),
);
