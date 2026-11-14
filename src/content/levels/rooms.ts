import { defineLevel, type Placement, type PrefabKey } from '../../prefab/types.ts';
// Counts pin the existing shared construction recipe's stable piece order.
const counts = { house: [79, 18], shop: [94, 18], museum: [136, 22] } as const;
export const levels = Object.entries(counts).map(([id, [pieces, scaffold]]) => {
  const placements: Placement[] = [];
  for (const [phase, count] of [
    ['scaffold', scaffold],
    ['pieces', pieces],
    ['hulls', 8],
    ['poles', 5],
    ['proxy', 7],
  ] as const)
    for (let index = 0; index < count; index++) {
      const name = `${id}-${phase}-${index}`;
      placements.push({ id: `room-${name}`, prefab: `town.room-${name}` as PrefabKey, pos: [0, 0, 0] });
    }
  return defineLevel({ place: `room-${id}`, placements });
});
