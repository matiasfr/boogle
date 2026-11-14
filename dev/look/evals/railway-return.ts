// npm run look -- --real --rail-seed gorge-reached --query 'mode=gorge' --eval dev/look/evals/railway-return.ts
// --until "(import('/dev/look/bots/railway-return.ts').then(m=>m.start()), !!document.documentElement.dataset.railwayReturn)"
// A real reload destroys this document; --until reattaches the observer in the new one. A seeded save, not
// `from=gorge-reached`: the local stack did not finish seeding that jump room before the lobby's 180 s limit.
// Add `&mode=` to the query: deck (the Railhead's deck over the sea), train (seated on a departing train: the nearest
// halt), swim (the sea beside the Railhead: the nearest halt), zero (the window set to 0: Home). With `--players 2`
// and `mode=duo`, player 1 reloads on the Railhead and player 2 reports where it was shown them.
// The result (RAILWAY RETURN PASS|FAIL|WATCHED in the log) carries the cover's hold and what was on screen before the
// body settled.
const { start } = (await import(
  '/dev/look/bots/railway-return.ts' as string
)) as typeof import('../bots/railway-return.ts');
start();
export {};
