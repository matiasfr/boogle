// The forge's finish at the moment it lights (town-layout step 4a): the production bot plays to "forge lit" (`botTo`),
// and the moment the forge lights this frames it from the south-west and sets `window.__forgeShot`, so `--until` starts
// the capture as the roof show begins (the beams drop in, the little guys lift them on, the poles come down).
// npm run look -- --query botTo=forge-lit --eval dev/look/evals/railway-forge-lights.ts --until window.__forgeShot
//   --cam 899,26,22 --look 905,21,-3 --video --seconds 30 --question "Does the forge finish as it lights?"
const flags = (await import('/src/proto/flags.ts' as string)) as typeof import('../../../src/proto/flags.ts');
if (!flags.productionRailway) throw new Error('Needs the default entry');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const hide = () =>
  // The bot's on-screen notes would cover the forge.
  document.querySelectorAll<HTMLElement>('div').forEach((d) => {
    if (d.style.zIndex === '9999' && d.style.whiteSpace === 'pre') d.style.display = 'none';
  });
// The moment the forge lights (not when the bot notices): frame it and start the capture.
const watch = setInterval(() => {
  if ((inspectRailway()?.line2?.forge.lit ?? -1) < 0) return;
  clearInterval(watch);
  hide();
  window.__debugCam?.set([899, 26, 22], [905, 21, -3], 60);
  (window as Window & { __forgeShot?: boolean }).__forgeShot = true;
}, 20);
background(play(), 'forge lights');
export {};
