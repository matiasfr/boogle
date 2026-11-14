// npm run look -- --rail-seed q5-arriving --query 'hf=cart' --eval dev/look/evals/honest-feedback.ts --hud
//  (hf=cart: the rack tag's numbers; hf=tree with --rail-seed awake: the great tree's blocked Chop; hf=frames with
//  --rail-seed q3-done: finished frames packed up; hf=seal with --rail-seed hook-taken|q3-done|q4-done: the drum's bands)
// The 14 November "honest feedback" pieces (docs/plans/level-pacing-1114.md), each framed from what the view reports.
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
if (!(await railReady(20000)) || !me.body) throw new Error('railway not ready');
const mode = new URLSearchParams(location.search).get('hf') ?? '';
type V3 = [number, number, number];
/** Stand at (x, z), or at a given height, facing `aim`, with the look camera at `camera`. */
function pose(body: [number, number], camera: V3, aim: V3, y?: number) {
  teleport(me.body!, body[0], y ?? H(body[0], body[1]) + 0.85, body[1]);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(aim[0] - body[0]), -(aim[2] - body[1]));
  const frame = () => window.__debugCam!.set(camera, aim, 55);
  frame();
  setTimeout(frame, 100);
}
const view = () => inspectRailway() as unknown as Record<string, unknown>;
if (mode === 'cart') {
  type Tag = { text: string; at: V3; yaw: number } | null;
  const tag = () => (view().line2View as { cart: { tag: Tag } } | undefined)?.cart.tag ?? null;
  const end = performance.now() + 15000;
  while (!tag() && performance.now() < end) await wait(100);
  const t = tag();
  if (!t) throw new Error('hf=cart: the rack tag is not up in this seed');
  // The board faces along its local +z.
  const fx = Math.sin(t.yaw),
    fz = Math.cos(t.yaw);
  pose(
    [t.at[0] + fx * 5 + fz * 2, t.at[2] + fz * 5 - fx * 2],
    [t.at[0] + fx * 3.6, t.at[1] + 1.7, t.at[2] + fz * 3.6],
    [t.at[0], t.at[1] + 1.25, t.at[2]],
  );
  console.log(`HF cart tag ${JSON.stringify(t)}`);
} else if (mode === 'tree') {
  // The great tree at world (996, -138), from the path's side, in reach of its Chop.
  const y = H(996, -138);
  pose([994.2, -140.2], [990.5, y + 2.6, -145.5], [996, y + 2.2, -138]);
} else if (mode === 'frames') {
  // Q3's site (world 1028, 26.8) in the foreground, laid and packed up in `q3-done`; Q4's frame stands 53 m on.
  const y = H(1028, 26.8);
  pose([1016, 21], [1014, y + 5, 20], [1040, y, 28.5]);
  console.log(`HF frames packed ${JSON.stringify((view().line2View as { framesPacked?: boolean[] }).framesPacked)}`);
} else if (mode === 'seal') {
  // Needle Bell's summit deck (102.4 m): beside the sealed drum at world (1016, -4.5), in reach of its prompt.
  pose([1013.7, -4.2], [1011.6, 104.5, -1.2], [1016.3, 104.2, -4.5], 102.4 + 0.85);
  console.log(`HF seal ${JSON.stringify((view().line2View as { glideDevice?: unknown }).glideDevice)}`);
} else if (mode === 'door' || mode === 'rack' || mode === 'fitted') {
  // The cradle's cues (footings-signalling A1, A2): `door` and `rack` with --rail-seed stall-done, `fitted` with
  // cradle-fitted. The stall door is 8.5 m from the table (942.1, 17.1) on bearing 190; the forge rack at (915.5, 10).
  if (mode === 'door') pose([940.8, 24.6], [934.2, 21, 20.6], [940.4, 20, 26.2]);
  else if (mode === 'rack') pose([913.6, 8.2], [909.5, 21.6, 5.2], [924, 19.6, 14.5]);
  else pose([945.6, 21.6], [949.5, 24, 12], [939.5, 18.6, 22.5]);
  console.log(`HF cradle ${JSON.stringify((view().worksView as { cradleCues?: unknown }).cradleCues)}`);
} else throw new Error('Choose hf=cart|tree|frames|seal');
export {};
