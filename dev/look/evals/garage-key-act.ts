// npm run look -- --real --size 1440x900 --rail-seed steel-home --hud --eval dev/look/evals/garage-key.ts \
//   --until window.__gkReady --action dev/look/evals/garage-key-act.ts --video --seconds 18 --name garage-key
// Action half of garage-key.ts: the garage on keyboard events alone (KeyboardEvent on the canvas, bubbling to the
// window's key listeners as a player's key does; never triggerAction). Prints `GKEY <step> @<ms>` lines, ms from the
// action's start, for picking frames out of the --video:
//   open    a tap of E at the post opens the garage
//   tap     a tap of E on the Longer boiler installs nothing (the hold lets go early)
//   let-go  E held 600 ms of the 1200 ms hold, then let go: nothing installs
//   hold    E held (with key repeats) through the Install hold: the moment commits and Line 2's boiler goes to 2
//   skip    a tap of E once the moment may be skipped ends it
//   whistle ArrowDown to the Whistle category, then E: Hear a whistle (counted by a spy on the garage's hear)
//   close   Esc leaves the garage
//   pause   at the post's prompt with Pause open, E does nothing; with Pause shut, E opens the garage again
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { MOMENT } = (await import(
  '/src/entities/railway/garage-data.ts' as string
)) as typeof import('../../../src/entities/railway/garage-data.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { openPause, closePause } = (await import(
  '/src/features/pause.ts' as string
)) as typeof import('../../../src/features/pause.ts');
const { modalOpen } = (await import(
  '/src/player/modal.ts' as string
)) as typeof import('../../../src/player/modal.ts');
const { line, rw } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');

window.__debugCam?.clear();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const t0 = performance.now();
const at = () => Math.round(performance.now() - t0);
const say = (step: string, data: unknown) => console.log(`GKEY ${step} @${at()} ${JSON.stringify(data)}`);
const target = () => document.querySelector('canvas') ?? document.body;
const key = (type: 'keydown' | 'keyup', code: string, repeat = false) =>
  target().dispatchEvent(new KeyboardEvent(type, { code, key: code === 'KeyE' ? 'e' : code, repeat, bubbles: true }));
const tap = async (code: string, ms = 90) => {
  key('keydown', code);
  await wait(ms);
  key('keyup', code);
};
const until = async (fn: () => boolean, ms: number) => {
  const end = performance.now() + ms;
  while (!fn() && performance.now() < end) await wait(16);
  return fn();
};
const done = window as Window & { __gkDone?: boolean; __gkFail?: string };
const fail: string[] = [];
const check = (ok: boolean, what: string) => ok || fail.push(what);
const api = garage.api!;
const boiler = () => line(rw(), LINE2).boiler;

void (async () => {
  say('start', { locked: !!document.pointerLockElement, boiler: boiler(), offered: interactTarget()?.id });

  await tap('KeyE');
  const opened = await until(() => api.isOpen(), 3000);
  let s = api.snap();
  say('open', { open: s.open, sel: s.sel, canInstall: s.canInstall, phase: s.phase, modal: modalOpen() });
  check(opened && s.sel === 'long' && s.canInstall, 'E at the post opens the garage on the Longer boiler, ready');
  await wait(1200); // the camera's glide

  const before = boiler();
  await tap('KeyE');
  await wait(700);
  s = api.snap();
  say('tap', { phase: s.phase, held: s.held, tapped: s.tapped > 0, boiler: boiler() });
  check(s.phase === 'idle' && !s.held && s.tapped > 0 && boiler() === before, 'a tap of E installs nothing');
  await wait(600);
  // Let go part-way through the hold: it stops, nothing installs.
  key('keydown', 'KeyE');
  await until(() => api.snap().held, 1000);
  await wait(600);
  const mid = api.snap().held;
  key('keyup', 'KeyE');
  await wait(500);
  s = api.snap();
  say('let-go', { heldAt600: mid, phase: s.phase, held: s.held, boiler: boiler() });
  check(mid && s.phase === 'idle' && !s.held && boiler() === before, 'letting E go part-way installs nothing');
  await wait(800);

  const pressed = at();
  key('keydown', 'KeyE');
  let heldSeen = false;
  const end = performance.now() + 4000;
  while (api.snap().phase !== 'moment' && performance.now() < end) {
    heldSeen ||= api.snap().held;
    key('keydown', 'KeyE', true); // the key repeat a held key sends
    await wait(33);
  }
  s = api.snap();
  say('hold', { phase: s.phase, heldSeen, ring: s.ring, committedAfter: at() - pressed });
  check(heldSeen && s.phase === 'moment', 'E held through the hold commits the install');
  await wait(150);
  key('keyup', 'KeyE');
  const accepted = await until(() => boiler() === before + 1, 4000);
  say('installed', { boiler: boiler(), was: before, waiting: api.snap().waiting });
  check(accepted, "Line 2's boiler went up by one");

  await until(() => api.snap().canSkip && api.snap().ms >= MOMENT.skipFrom + 300, 4000);
  say('skip-ready', { ms: Math.round(api.snap().ms), canSkip: api.snap().canSkip });
  await tap('KeyE');
  await wait(100);
  s = api.snap();
  say('skip', { phase: s.phase, open: s.open });
  check(s.phase === 'idle' && s.open, 'E skips the rest of the moment');
  await wait(1500);

  let heard = 0;
  const hear = api.hear;
  api.hear = () => {
    heard++;
    hear();
  };
  for (let k = 0; k < 6 && api.snap().cat !== 'whistle'; k++) {
    await tap('ArrowDown');
    await wait(250);
  }
  await tap('KeyE');
  await wait(400);
  say('whistle', { cat: api.snap().cat, heard });
  check(api.snap().cat === 'whistle' && heard === 1, 'E on the Whistle category hears a whistle');
  api.hear = hear;
  await wait(1200);

  await tap('Escape');
  await until(() => !api.isOpen(), 2000);
  say('close', { open: api.isOpen(), modal: modalOpen() });
  check(!api.isOpen() && !modalOpen(), 'Esc leaves the garage');
  await wait(800);

  // Outside the garage, E is the post's prompt again: Pause takes it, and with Pause shut it opens the garage.
  const offered = await until(() => interactTarget()?.id === 'railway-garage', 3000);
  openPause();
  await wait(300);
  await tap('KeyE');
  await wait(400);
  const paused = { garage: api.isOpen(), modal: modalOpen() };
  closePause();
  await wait(500);
  await tap('KeyE');
  const reopened = await until(() => api.isOpen(), 3000);
  say('pause', { offered, verb: interactTarget()?.verb ?? null, paused, reopened });
  check(offered && !paused.garage && paused.modal, 'Pause swallows E');
  check(reopened, "E at the post's prompt opens the garage again");
  say('verdict', { pass: fail.length === 0, fail });
  if (fail.length) done.__gkFail = fail.join('; ');
  done.__gkDone = true;
})();
export {};
