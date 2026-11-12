// npm run look -- --rail-seed steel-lit --eval dev/look/evals/railway-steel-train.ts --until window.__steelAboard --cam ... --look ...
// npm run look -- --rail-seed boiler-long --query steelwant=long --eval dev/look/evals/railway-steel-train.ts --until window.__steelAboard ...
// Ends the warm-up when a line 2 train stands at Ring Island with steel on its kit car, or with `steelwant=long` wearing
// the longer boiler (docs/plans/ring-island-build2.md, V2), and says which. The two need two seeds: by boiler-long all
// twelve steel are home, so no train carries any. Reads rows only; presses nothing.
const { railReady, rw, train } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { TRAIN_PHASE } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { RING_ISLAND } = (await import(
  '/src/sim/railway-sys-steel.ts' as string
)) as typeof import('../../../src/sim/railway-sys-steel.ts');
const long = new URLSearchParams(location.search).get('steelwant') === 'long';
if (!(await railReady(30_000))) throw new Error('steel train: the railway never became ready');
const timer = setInterval(() => {
  for (const slot of LINE_SLOTS[LINE2]!) {
    const r = train(rw(), slot);
    if (r.phase !== TRAIN_PHASE.STAND || r.at !== RING_ISLAND || (long ? r.boiler !== 1 : !r.steel)) continue;
    console.log(`STEEL TRAIN slot ${slot} stands at Ring Island with ${r.steel} steel, boiler ${r.boiler}`);
    (window as Window & { __steelAboard?: boolean }).__steelAboard = true;
    clearInterval(timer);
    return;
  }
}, 50);
export {};
