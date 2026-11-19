import { defineLevel, type Placement, type PrefabKey } from '../../prefab/types.ts';
// Counts pin the existing shared construction recipe's stable piece order.
const counts = { house: [79, 18], shop: [94, 18], museum: [136, 22], gate: [56, 18], plot3: [74, 18] } as const;
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
      // At cottage height the three-row opening reaches the eaves; omit the zero-height lintel and its shadow.
      if (id === 'gate' && ((phase === 'hulls' && index === 5) || (phase === 'proxy' && index === 6))) continue;
      const name = `${id}-${phase}-${index}`;
      const shell = phase === 'scaffold' || phase === 'pieces';
      placements.push({
        id: `room-${name}`,
        prefab: `town.room-${shell ? `${id}-shell` : name}` as PrefabKey,
        pos: [0, 0, 0],
        ...(shell ? { params: { phase, index } } : {}),
      });
    }
  return defineLevel({ place: `room-${id}`, placements });
});
