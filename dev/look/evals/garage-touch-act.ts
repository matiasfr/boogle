// The garage's Install held by a real touch (docs/plans/garage-install-moment.md, the checkpoint's touch case): action
// half of railway-install.ts (its default `prompt` step leaves the garage open on the Longer boiler, ready). Needs
// look's --touch, which makes the page a phone and gives it window.__touch: a touch point sent through the browser, so
// the button's own touchHold sees trusted pointer events. Presses the middle of the Install button (.g-btn) and lets
// go when the moment's hit lands (`&touchhold=full`, the default) or 600 ms in (`&touchhold=early`), and prints when
// each beat happened in ms from the press on this page's clock: the commit, the server's accept, the drop and the hit.
//   npm run look -- --real --touch --size 390x844 --rail-seed steel-home --hud --eval dev/look/evals/railway-install.ts \
//     --until window.__installDone --action dev/look/evals/garage-touch-act.ts --video --seconds 9 --name touch-full
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { MOMENT } = (await import(
  '/src/entities/railway/garage-data.ts' as string
)) as typeof import('../../../src/entities/railway/garage-data.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { line, railRead, rw, shed } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { audioSnapshot } = (await import(
  '/src/render/audio.ts' as string
)) as typeof import('../../../src/render/audio.ts');

const touch = (window as Window & { __touch?: (type: string, x: number, y: number) => Promise<void> }).__touch;
if (!touch) throw new Error('garage-touch: run with look --touch (no window.__touch)');
const early = new URLSearchParams(location.search).get('touchhold') === 'early';
const say = (text: string) => console.log(`TOUCH ${text}`);
const api = garage.api!;
const facts = () => ({ boiler: line(rw(), LINE2).boiler, fitted: line(rw(), LINE2).fitted, spent: shed(rw()).spent });
window.__debugCam?.clear();
const btn = document.querySelector<HTMLElement>('.g-btn')!;
const r = btn.getBoundingClientRect();
const x = r.left + r.width / 2,
  y = r.top + r.height / 2;
const hit = document.elementFromPoint(x, y);
say(
  `touch mode ${document.body.classList.contains('touch')}; button "${btn.textContent?.trim()}" ${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(x)},${Math.round(y)} of ${innerWidth}x${innerHeight}; under the point: ${hit === btn || btn.contains(hit) ? 'the button' : (hit?.className ?? 'nothing')}`,
);
const before = facts();
say(
  `before ${JSON.stringify(before)} snap ${JSON.stringify({ phase: api.snap().phase, sel: api.snap().sel, canInstall: api.snap().canInstall })} audio ${audioSnapshot().context}`,
);
const at: Record<string, number> = {};
const phases: string[] = [];
const t0 = performance.now();
const mark = (name: string) => (at[name] ??= Math.round(performance.now() - t0));
await touch('touchStart', x, y);
let lifted = false;
for (;;) {
  const s = api.snap();
  if (phases.at(-1) !== s.phase) phases.push(s.phase);
  if (s.phase === 'holding') mark('holding');
  if (s.phase === 'moment') {
    mark('commit');
    if (!s.waiting) mark('accepted');
    if (!s.waiting && s.ms >= MOMENT.quiet) mark('drop');
    if (s.ms >= MOMENT.hit) mark('hit');
  }
  if (!lifted && (early ? performance.now() - t0 >= 600 : at.hit !== undefined)) {
    await touch('touchEnd', x, y);
    lifted = true;
    mark('lift');
  }
  if (lifted && (early ? performance.now() - t0 > 3500 : true)) break;
  if (performance.now() - t0 > 8000) {
    if (!lifted) await touch('touchEnd', x, y);
    mark('gave up');
    break;
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}
say(`beats (ms from the press) ${JSON.stringify(at)}; phases ${phases.join(' > ')}`);
for (let k = 0; k < 50 && railRead()!.pending() > 0; k++) await new Promise((resolve) => setTimeout(resolve, 100));
const after = facts();
say(
  `after ${JSON.stringify(after)} snap ${JSON.stringify({ phase: api.snap().phase, real: api.snap().real, longFitted: api.snap().facts.longFitted })}`,
);
if (early) {
  if (at.commit !== undefined || after.boiler !== before.boiler || after.spent !== before.spent)
    throw new Error('garage-touch: letting go early installed');
  say('PASS early: held 600 ms, let go, nothing committed or installed');
} else {
  if (at.hit === undefined || after.boiler !== before.boiler + 1)
    throw new Error('garage-touch: the touch hold did not install');
  say(`PASS full: press-to-drop ${at.drop} ms, Line 2's boiler ${before.boiler} to ${after.boiler}`);
}
export {};
