// Page setup for the terrain-pass stills (dev/terrain-pass/shots.ts): Buddy stands at the foot of the gorge's west wall
// in the wedge, facing the camera, for scale. With `tpCounts=1` it also logs the ground's triangle counts.
const q = new URLSearchParams(location.search);
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { H } = await import('/src/proto/place/terrain.ts' as string);
const { renderer } = await import('/src/render/scene.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
const x = 953.5,
  z = 160;
teleport(me.body, x, H(x, z) + 1.2, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = 2.2;
// The ground's exact triangle counts and the renderer's texture count. (Frame draw counts read zero from a look eval;
// use npm run perf for those.) Deferred so the look's own camera is in place first.
async function counts() {
  const { scene } = await import('/src/render/scene.ts' as string);
  // The ground's own triangles: Place's ground mesh (it has the cove's covePath attribute) and the wedge.
  const ground: Record<string, number> = {};
  scene.traverse(
    (o: {
      isMesh?: boolean;
      name: string;
      visible: boolean;
      geometry?: { index?: { count: number }; getAttribute: (n: string) => unknown };
    }) => {
      if (!o.isMesh || !o.geometry?.getAttribute('covePath') || !o.geometry.index) return;
      ground[o.name || 'place-ground'] = o.geometry.index.count / 3;
    },
  );
  console.log(
    'PLAY TERRAIN_COUNTS ' +
      JSON.stringify({
        variant: q.get('terrain') ?? 'off',
        sub: q.get('terrainSub') ?? null,
        textures: renderer.info.memory.textures,
        ground,
      }),
  );
}
if (q.get('tpCounts') === '1') setTimeout(() => void counts(), 1500);
export {};
