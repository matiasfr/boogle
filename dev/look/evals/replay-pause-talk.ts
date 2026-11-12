// npm run look -- --real --query 'phoneStartup=1&uiTalk=1' --eval dev/look/evals/replay-pause-talk.ts --size 440x796 --name pause-talk
// needs: node .look/see-client.ts look --production for phoneStartup=1 (the production proxy sets the phone profile); uiTalk=1 leaves a talk open, uiPlay=1 the play HUD, else Pause
// Targeted acceptance through the existing look broker, not a new scenario.
// phoneStartup=1 uses the production proxy's pre-boot touch/DPR profile; Mac Chromium, not a device.
// uiTalk=1 leaves a diagnostic conversation open; uiPlay=1 leaves the play HUD; otherwise Pause.
const { openPause, closePause } = (await import(
  '/src/features/pause.ts' as string
)) as typeof import('../../../src/features/pause.ts');
const { dom } = (await import('/src/player/dom.ts' as string)) as typeof import('../../../src/player/dom.ts');
const { isTouch } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { backSeam } = (await import(
  '/src/features/haul-stack.ts' as string
)) as typeof import('../../../src/features/haul-stack.ts');
const { wrapAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { startTalk, endTalk: closeDialogue } = (await import(
  '/src/place/talk.ts' as string
)) as typeof import('../../../src/place/talk.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const query = new URLSearchParams(location.search);
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
let assertions = 0;
function check(ok: boolean, label: string) {
  if (!ok) throw new Error('REPLAY UI: ' + label);
  assertions++;
}
const shown = (e: HTMLElement | null) => !!e && e.checkVisibility();
const click = (act: string) => {
  const e = document.querySelector<HTMLButtonElement>(`[data-act="${act}"]`);
  check(!!e, 'button ' + act);
  e!.click();
};
navigator.getGamepads = () => [];
// The broker enters with a mouse click; hand the emulated phone back to finger input.
if (isTouch) dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
await wait();
check(isTouch === query.has('phoneStartup'), 'pre-boot input profile');
check(!shown(dom.rosterEl) && !shown(dom.netEl), 'identity and Live absent from play');
check(shown(document.querySelector('.menu-btn')) === isTouch, 'menu button touch only');
if (isTouch) document.querySelector<HTMLButtonElement>('.menu-btn')!.click();
else openPause('options');
await wait();
function identity() {
  const panel = document.querySelector('.pause-identity');
  check(!!panel?.contains(dom.rosterEl) && !!panel.contains(dom.netEl), 'original live identity nodes in Pause');
  check(shown(dom.rosterEl) && shown(dom.netEl), 'name and status visible');
  check(!!dom.rosterEl.textContent?.trim() && /Live/i.test(dom.netEl.textContent ?? ''), 'name and Live populated');
}
identity();
for (const page of ['room', 'controls']) {
  click(page);
  await wait();
  click('back');
  await wait();
  identity();
}
closePause();
await wait();
check(!shown(dom.rosterEl) && !shown(dom.netEl), 'identity hidden again on resume');
openPause('options');
await wait();
identity();
const stats = document.querySelector('.place-nums')!;
check(stats.children.length === 1 && !!stats.querySelector('.place-money'), 'only money in permanent stats');
// Exercise the Local display seam; these are diagnostic carry readouts, not a cargo/drop gameplay proof.
const originalCarry = backSeam.carry!;
const load = { ...originalCarry(), logs: 0, rails: 0, stone: 0, big: null, incoming: 0, reserved: 0, flyingLogs: 0 };
backSeam.carry = () => load;
try {
  for (const state of [
    { logs: 0, incoming: 0, reserved: 0, big: null, visible: false },
    { logs: 3, incoming: 0, reserved: 0, big: null, visible: true },
    { logs: 0, incoming: 0, reserved: 0, big: 'beam', visible: true },
    { logs: 0, incoming: 1, reserved: 0, big: null, visible: true },
    { logs: 0, incoming: 0, reserved: 1, big: null, visible: true },
    { logs: 0, incoming: 0, reserved: 0, big: null, visible: false },
  ] as const) {
    Object.assign(load, state);
    await wait();
    check(shown(document.querySelector('.carry-pause')) === state.visible, 'carry visibility ' + JSON.stringify(state));
  }
} finally {
  backSeam.carry = originalCarry;
}
closePause();
await wait();
// Real poll loop with standard, axes and hat D-pads, as in boogler-talk-pad.
const pad = {
  id: 'Wireless Controller Extended Gamepad',
  index: 0,
  connected: true,
  mapping: 'standard',
  timestamp: 0,
  axes: Array<number>(8).fill(0),
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
};
navigator.getGamepads = () => [pad] as unknown as Gamepad[];
dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad }));
let shape = 'standard';
function direction(dir: '' | 'left' | 'right') {
  pad.mapping = shape === 'standard' ? 'standard' : '';
  pad.axes = Array<number>(shape === 'hat' ? 10 : 8).fill(0);
  if (shape === 'hat') pad.axes[9] = 9 / 7;
  for (const b of pad.buttons) {
    b.pressed = b.touched = false;
    b.value = 0;
  }
  if (!dir) return;
  if (shape === 'standard')
    Object.assign(pad.buttons[dir === 'left' ? 14 : 15]!, { pressed: true, touched: true, value: 1 });
  else if (shape === 'axes') pad.axes[6] = dir === 'left' ? -1 : 1;
  else pad.axes[9] = -1 + (dir === 'left' ? 6 : 2) * (2 / 7);
}
const press = async (dir: 'left' | 'right', ms = 180) => {
  direction(dir);
  await wait(ms);
  direction('');
  await wait();
};
const selected = () =>
  [...document.querySelectorAll('.place-talk-opts button')].findIndex((e) => e.classList.contains('talk-sel'));
const leaks = { ping: 0, flag: 0 };
wrapAction('ping', {
  down: (next) => {
    leaks.ping++;
    next();
  },
});
wrapAction('place-flag', {
  down: (next) => {
    leaks.flag++;
    next();
  },
});
const show = (say = 'Hello') => {
  const p = me.body!.position;
  check(
    startTalk(
      {
        name: 'Input check',
        x: p.x,
        z: p.z,
        color: '#ffd273',
        voice: {
          baseHz: 155,
          rangeSemis: 2,
          formantScale: 0.9,
          brightnessHz: 3500,
          cps: 48,
          grainMs: [65, 95],
          vowels: [0.3, 0.15, 0.4, 0.1, 0.05],
        },
      },
      { say, whole: say === 'Hello', answers: ['One', 'Two', 'Three'].map((label) => ({ label, then: () => null })) },
    ),
    'diagnostic Place talk opened',
  );
};
for (shape of ['standard', 'axes', 'hat']) {
  direction('');
  await wait();
  show('Hello '.repeat(80));
  check(shown(document.querySelector('.place-talk')), shape + ' fixture opened');
  await press('left');
  await press('right');
  check(leaks.ping === 0 && leaks.flag === 0, shape + ' typing has no world actions');
  closeDialogue();
  show();
  await wait(500);
  check(selected() === 0, shape + ' initial selection');
  await press('right');
  check(selected() === 1, shape + ' right selects next');
  await press('left');
  check(selected() === 0, shape + ' left selects previous');
  const seen = new Set<number>();
  direction('right');
  for (let i = 0; i < 12; i++) {
    await wait(70);
    seen.add(selected());
  }
  direction('');
  await wait();
  check(seen.size >= 2, shape + ' held direction repeats');
  check(leaks.ping === 0 && leaks.flag === 0, shape + ' options have no world actions');
  closeDialogue();
}
// A positive control proves instrumentation reaches the ordinary Ping and Flag bindings.
shape = 'standard';
await press('left');
await press('right');
check(leaks.ping > 0 && leaks.flag > 0, 'world actions resume outside talk');
show();
await wait(500);
for (const [key, expected] of [
  ['ArrowRight', 1],
  ['ArrowLeft', 0],
] as const) {
  dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true }));
  dispatchEvent(new KeyboardEvent('keyup', { key, code: key, bubbles: true }));
  await wait();
  check(selected() === expected, 'keyboard ' + key);
}
await press('right');
if (!query.has('uiTalk')) {
  closeDialogue();
  navigator.getGamepads = () => [];
  dispatchEvent(new Event('gamepaddisconnected'));
  if (isTouch) dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
  await wait();
  if (!query.has('uiPlay')) openPause('options');
}
await wait();
console.log(
  'REPLAY UI ' +
    JSON.stringify({
      assertions,
      isTouch,
      viewport: [innerWidth, innerHeight],
      worldActionsAfterTalk: leaks,
      final: query.has('uiTalk') ? 'diagnostic talk' : query.has('uiPlay') ? 'play' : 'pause',
    }),
);
export {};
