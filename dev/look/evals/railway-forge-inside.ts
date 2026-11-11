// Inside the finished forge's workshop (town-layout step 4a, furnished 10 November): put the player in the room and frame
// one view of it, chosen by `--query view=...` (door | furnace | back | top | walk). From `--rail-seed q1-done` (forge lit,
// so finished). Positions are local to the forge's centre (x right, z toward the front wall, y up from the floor).
// npm run look -- --rail-seed q1-done --eval dev/look/evals/railway-forge-inside.ts --query view=door --name forge-door
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { X, Z, forgePlan } = (await import(
  '/src/place/opening-plans.ts' as string
)) as typeof import('../../../src/place/opening-plans.ts');
const view = new URLSearchParams(location.search).get('view') ?? 'furnace';
const floor = forgePlan().y + 0.5;
// player (x, z), camera (x, y, z), target (x, y, z), fov
const VIEWS: Record<string, [number[], number[], number[], number]> = {
  door: [[-2.9, 3.7], [-3.0, 1.9, 8.2], [0.2, 0.8, 0.4], 62],
  furnace: [[-2.9, 1.5], [-4.2, 2.1, -1.0], [1.0, 0.7, 2.4], 70],
  back: [[2.0, 1.2], [3.8, 2.2, 3.0], [-1.5, 0.9, -2.8], 70],
  top: [[0.5, 1.5], [0.5, 10.5, 7.5], [0, 0, 0.2], 55],
  walk: [[0, 0.4], [0.5, 2.4, 3.2], [-0.5, 0.9, -2.6], 70],
};
const [at, cam, look, fov] = VIEWS[view]!;
background(
  (async () => {
    if (!(await railReady())) throw new Error('railway-forge-inside: the railway never became ready');
    while (!me.body) await new Promise((r) => setTimeout(r, 100));
    teleport(me.body!, X + at![0]!, floor + 0.6, Z + at![1]!);
    me.body!.velocity.set(0, 0, 0);
    await new Promise((r) => setTimeout(r, 1800));
    window.__debugCam?.set(
      [X + cam![0]!, floor + cam![1]!, Z + cam![2]!],
      [X + look![0]!, floor + look![1]!, Z + look![2]!],
      fov,
    );
    // Draw calls here (scene.ts's renderer.info is reset each frame; read right after a completed frame), with and
    // without the sun's shadow pass, and the shader programs alive: the furnishing's cost, for `PLAY counts` lines.
    const { renderer, sun } = (await import(
      '/src/render/scene.ts' as string
    )) as typeof import('../../../src/render/scene.ts');
    // Warm-ups draw one frame in 30: the first frame that really drew counts.
    const frame = async () => {
      for (let n = 0; n < 200; n++) {
        const at = window.boogle.prof.last.frames;
        while (window.boogle.prof.last.frames === at) await new Promise((r) => setTimeout(r, 10));
        if (renderer.info.render.drawCalls > 0) return renderer.info.render.drawCalls;
      }
      return 0;
    };
    await new Promise((r) => setTimeout(r, 1500));
    await frame();
    const withShadows = await frame();
    sun.castShadow = false;
    await frame();
    const without = await frame();
    sun.castShadow = true;
    console.log(
      `PLAY counts ${view}: calls ${withShadows}, shadow ${withShadows - without}, programs ${renderer.info.memory.programs}`,
    );
  })(),
  'forge inside',
);
export {};
