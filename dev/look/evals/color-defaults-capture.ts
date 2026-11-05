// Use the existing frozen-shot engine, including fresh draws and exact switch-away/back pixel checks.
const { installWarp } = (await import('/dev/look/warp.ts' as string)) as typeof import('../warp.ts');
if (!window.__warp) installWarp();
const { captureShots } = (await import('/dev/look/shot-page.ts' as string)) as typeof import('../shot-page.ts');
const { paintNative } = (await import('/dev/look/sheet-render.ts' as string)) as typeof import('../sheet-render.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { rooms } = (await import(
  '/src/proto/place/rooms.ts' as string
)) as typeof import('../../../src/proto/place/rooms.ts');
const { H } = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');
const { skyNow } = (await import('/src/render/sky.ts' as string)) as typeof import('../../../src/render/sky.ts');
type V = [number, number, number];
type View = { name: string; cam: V; look: V; fov?: number; player?: V };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = new URLSearchParams(location.search);
function local(r: typeof rooms.house, x: number, y: number, z: number): V {
  return [r.x + x * Math.cos(r.yaw) + z * Math.sin(r.yaw), r.y + y, r.z - x * Math.sin(r.yaw) + z * Math.cos(r.yaw)];
}
function board(name: string, key: keyof typeof rooms, x: number, y: number, z: number, distance = 5, yaw = 0): View {
  const r = rooms[key],
    at = local(r, x, y, z),
    angle = r.yaw + yaw;
  return {
    name,
    look: at,
    cam: [at[0] + Math.sin(angle) * distance, at[1], at[2] + Math.cos(angle) * distance],
    fov: 62,
    player: [r.x + Math.sin(r.yaw) * 9, H(r.x, r.z) + 0.8, r.z + Math.cos(r.yaw) * 9],
  };
}
// Exact settled pose from round four's current-shade reading, not the teleport's transient +.8 m height.
const shade: V = [924.5, 18.449861526489258, -14];
const groups: Record<string, View[]> = {
  signs: [
    { name: 'doorway', cam: [892, 20, 12], look: [886, 20, 11] },
    board('distance', 'house', 0, 2.1, 4.04, 12),
    board('jobs', 'house', -0.2, 1.5, -3.15, 2.3),
    board('fineprices', 'shop', 0, 3.42, 4.34),
    board('tags', 'shop', 4.3, 1.95, -1.9, 2.3, -Math.PI / 2),
  ],
  land: [
    { name: 'town', cam: [909, 24.449861526489258, 35], look: [903, 19.149861526489257, 20] },
    {
      name: 'shade',
      cam: [shade[0] + 3.4, shade[1] + 1.5, shade[2] - 2.8],
      look: [shade[0], shade[1] + 0.7, shade[2]],
      player: shade,
      fov: 40,
    },
    { name: 'horizon', cam: [890, 25, 65], look: [800, 0, 180] },
  ],
  stress: [
    { name: 'sand', cam: [890, H(890, 144) + 7, 144], look: [890, H(890, 144), 144.01] },
    {
      name: 'sky',
      cam: [890, 25, 65],
      look: [890 + skyNow.sunDir.x * 100, 25 + skyNow.sunDir.y * 100, 65 + skyNow.sunDir.z * 100],
    },
    ...(['shop', 'museum'] as const).map((id) => ({
      name: id,
      cam: local(rooms[id], 0, 1.7, 1),
      look: local(rooms[id], 0, 1.7, -3),
      player: local(rooms[id], 0, 0.9, 4),
    })),
    { name: 'underwater', cam: [868, -3, 144], look: [830, -4, 180] },
    { name: 'waterline', cam: [868, 0, 144], look: [830, -1, 180] },
  ],
};
groups.evening = [
  groups.land![0]!,
  groups.land![1]!,
  groups.signs![0]!,
  groups.signs![2]!,
  { name: 'horizon', cam: [884, 8, 151], look: [864, 9, 151], fov: 62 },
  groups.stress![1]!,
];
for (const view of groups[q.get('group') ?? 'land']!) {
  if (q.has('only') && !q.get('only')!.split(',').includes(view.name)) continue;
  const at = view.player ?? [903, H(903, 20) + 0.8, 20];
  teleport(me.body!, ...(at as V));
  me.body!.velocity.set(0, 0, 0);
  me.yaw = 0;
  window.__debugCam!.set(view.cam, view.look, view.fov ?? 62);
  await wait(3000);
  console.log(
    'COLOUR VIEW ' +
      JSON.stringify({
        view,
        furniture: Object.fromEntries(Object.entries(rooms).map(([k, r]) => [k, r.near.visible])),
      }),
  );
  await captureShots(
    {
      name: view.name,
      query: 'proto=place&dev=1',
      size: [innerWidth, innerHeight],
      cameras: [view],
      variants: [{ name: 'defaults', look: 'current' }],
    },
    paintNative,
  );
}
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
console.log('COLOUR SKY ' + JSON.stringify(waterRuntime.inspect().sky));
export {};
