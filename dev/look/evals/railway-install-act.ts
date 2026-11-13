// Action half of railway-install.ts (docs/plans/garage-install-moment.md, G3), for a --video capture: with the garage
// open on the Longer boiler, holds Install through the interact action and prints when each beat happened, in ms from
// the press, on this page's clock: the commit (the hold complete, rail.install sent), the server's accept (the hang
// over), the drop's start, and the hit. Press-to-drop is the hold (1200) plus the quiet (180) plus any wait for the
// server past it. Run with --real: a warped clock is not what a player feels.
//   npm run look -- --real --rail-seed steel-home --hud --eval dev/look/evals/railway-install.ts \
//     --until window.__installDone --action dev/look/evals/railway-install-act.ts --video --seconds 9 --name g3-install
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { MOMENT } = (await import(
  '/src/entities/railway/garage-data.ts' as string
)) as typeof import('../../../src/entities/railway/garage-data.ts');
window.__debugCam?.clear();
const { inspectRailway } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const api = garage.api!;
const t0 = performance.now();
const at: Record<string, number> = {};
const mark = (name: string) => (at[name] ??= Math.round(performance.now() - t0));
triggerAction('interact', 'down');
void (async () => {
  for (;;) {
    const s = api.snap();
    if (s.phase === 'moment') {
      mark('commit');
      if (!s.waiting) mark('accepted');
      if (!s.waiting && s.ms >= MOMENT.quiet) mark('drop');
      if (s.ms >= MOMENT.hit) mark('hit');
    }
    if (at.commit !== undefined && s.phase === 'holding') mark('denied');
    if (at.hit !== undefined || at.denied !== undefined || performance.now() - t0 > 8000) break;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  triggerAction('interact', 'up');
  console.log(`INSTALL beats (ms from the press) ${JSON.stringify(at)}`);
  // Half a second after the hit: the lifted part is gone and the copy wears the longer boiler.
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log(`INSTALL drawn after the hit ${JSON.stringify(inspectRailway()?.worksView?.garageView?.drawn)}`);
})();
export {};
