// Render cost in a few seconds: `npm run perf` (or `-- --url http://localhost:5173/` for a running game).
// Prints draw calls, triangles, shadow-pass calls, geometries and shader programs for the island as you enter it
// and with a fully grown mushroom garden. Counts come from renderer.info and are exact; headless software
// rendering makes fps meaningless, so none is reported. Compare before/after on your change, not absolute numbers.
import { startStack, launch, Game } from './lib.mjs';

const argv = process.argv.slice(2);
const url = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : null;

const STATS = `
  const { renderer, scene, camera, sun } = await import('/src/scene.js');
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  const calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  sun.castShadow = false;
  renderer.render(scene, camera);
  const shadowCalls = calls - renderer.info.render.calls;
  sun.castShadow = true;
  return { calls, shadowCalls, tris, geometries: renderer.info.memory.geometries, programs: renderer.info.programs.length };`;

// Grow every plot at once by loading a snapshot, instead of waiting for sim ticks.
const FULL_GARDEN = `
  const { snapshot, loadSnapshot } = await import('/src/world/sync.js');
  const { PATCH, GROW_TICKS } = await import('/src/sim/mushrooms.js');
  const s = snapshot();
  s.data.mushrooms = [];
  for (let i = PATCH.i0; i < PATCH.i0 + PATCH.w; i += 3)
    for (let j = PATCH.j0; j < PATCH.j0 + PATCH.h; j += 3) s.data.mushrooms.push(i, j, GROW_TICKS);
  loadSnapshot(s);
  return s.data.mushrooms.length / 3;`;

let stack, browser;
try {
  stack = await startStack({ url });
  browser = await launch();
  const g = await Game.open(browser, stack, { name: 'perf' });
  const rows = { 'island, empty garden': await g.eval(STATS) };
  const n = await g.eval(FULL_GARDEN);
  await new Promise((r) => setTimeout(r, 500));
  rows[`island, ${n} grown mushrooms`] = await g.eval(STATS);
  console.table(rows);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}
