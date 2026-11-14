// npm run look -- --rail-seed wagon-on --query garage=select --hud --eval dev/look/evals/garage-open.ts --action dev/look/evals/garage-act.ts
//  (garage=select|hold|moment|cat:<id>; hold=<ms>)
// Action half of garage-open.ts: hands the camera back to the garage, then does what `&garage=` says.
//   select    choose the longer boiler (readouts' preview, the ghost on the engine)
//   hold      select, then hold Install for `&hold=<ms>` (default 700: mid-lift) and stay holding (needs steel home:
//             there is no try-on, so without it the hold does nothing)
//   moment    select, hold to the commit and let the whole moment play
//   cat:<id>  choose that category
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const what = query.get('garage') ?? 'select';
window.__debugCam?.clear();
const api = garage.api!;
if (what.startsWith('cat:')) {
  api.choose(what.slice(4) as 'engine');
} else if (what !== 'enter') {
  api.choose('engine', 'long');
  await wait(400);
  if (what === 'hold' || what === 'moment') {
    api.holdStart();
    if (what === 'hold') await wait(Number(query.get('hold') ?? 700));
  }
}
export {};
