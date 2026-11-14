// Authored recipe operands only. Native construction math stays in the runtime builder.
import { definePrefab, type PrefabDef } from '../../prefab/types.ts';
import { ROOM_PLOTS } from '../../place/layout.ts';
const looks = {
  house: { wall: '#e8dcc0', post: '#7f5630', roof: '#c9a86a', rise: 2.5, smoke: true, pieces: 79, scaffold: 18 },
  shop: { wall: '#f0c98a', post: '#8a4a2c', roof: '#c4453a', rise: 2.6, smoke: false, pieces: 94, scaffold: 18 },
  museum: { wall: '#c8c3b4', post: '#b2ad9f', roof: '#4d5560', rise: 2.8, smoke: false, pieces: 136, scaffold: 22 },
};
export const prefabs: PrefabDef[] = Object.entries(looks).flatMap(([id, look]) => {
  const p = ROOM_PLOTS[id as keyof typeof ROOM_PLOTS];
  const spec = {
    w: p.w,
    d: p.d,
    high: p.high,
    wall: look.wall,
    post: look.post,
    roof: look.roof,
    rise: look.rise,
    smoke: look.smoke,
    ...(id === 'house' ? { wallPalette: 'walls' } : id === 'museum' ? { wallPalette: 'stone' } : {}),
    postPalette: id === 'museum' ? 'stone' : 'timber',
  };
  const records: PrefabDef[] = [];
  for (const phase of ['scaffold', 'pieces'] as const)
    for (let index = 0; index < look[phase]; index++)
      records.push(
        definePrefab({
          key: `town.room-${id}-${phase}-${index}`,
          visual: { builder: 'town.room-shell', params: { spec, phase, index } },
          colliders: [],
          scope: 'owner',
        }),
      );
  for (const phase of ['hulls', 'poles'] as const)
    for (let index = 0; index < (phase === 'hulls' ? 8 : 5); index++)
      records.push(
        definePrefab({
          key: `town.room-${id}-${phase}-${index}`,
          visual: { none: true },
          colliders: [],
          scope: 'owner',
          layout: { kind: 'room-hull', phase, index, w: p.w, d: p.d, high: p.high, rise: look.rise },
        }),
      );
  for (let index = 0; index < 7; index++)
    records.push(
      definePrefab({
        key: `town.room-${id}-proxy-${index}`,
        visual: { builder: 'town.room-proxy', params: { w: p.w, d: p.d, high: p.high, index } },
        colliders: [],
        scope: 'owner',
      }),
    );
  return records;
});
prefabs.push(
  definePrefab({
    key: 'town.room-plot-board',
    visual: { none: true },
    scope: 'owner',
    colliders: [{ shape: 'box', at: [0, 1.1, 0], half: [1.2, 1.1, 0.1] }],
    // The view paints the original one-draw frame/post/paper at this label attachment.
    attach: { sign: { kind: 'label', at: [0, 0, 0], facing: [0, 0, 1], w: 2.2, h: 1.1, posts: 'one' } },
  }),
);
