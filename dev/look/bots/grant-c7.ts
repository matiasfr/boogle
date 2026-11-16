// Targeted C7 input proof. Staged positions/earned seed, real input handlers and production physics;
// not a played climb or physical controller/device test. Pair the two grant-c7 evals with glide-earned.
import { me, cam } from '../../../src/player/player.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { actionForSlot, triggerAction } from '../../../src/player/controls.ts';
import { inspectRailway } from '../../../src/entities/railway/state.ts';
import { aimHook } from './railway.ts';
import { background } from '../../../src/async.ts';
import { dom } from '../../../src/player/dom.ts';
import { interactTarget } from '../../../src/player/hands.ts';

type Mode = 'keyboard' | 'pad' | 'touch';
const page = window as Window & { __c7Done?: boolean };
const query = new URLSearchParams(location.search);
const kind = query.get('c7') ?? 'hook';
const mode = (query.get('c7Input') ?? 'keyboard') as Mode;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const state = () => inspectRailway()!;
function check(ok: unknown, why: string): asserts ok {
  if (!ok)
    throw new Error(
      `C7 ${why}; ${JSON.stringify({ position: me.body?.position, coyote: me.coyote, target: interactTarget()?.id, tools: inspectRailway()?.reward.tools, glider: inspectRailway()?.glider })}`,
    );
}
async function until(ok: () => boolean, why: string, ms = 5000) {
  const end = performance.now() + ms;
  while (!ok()) {
    check(performance.now() < end, why);
    await wait(20);
  }
}
function inputMode(m: Mode) {
  document.body.classList.toggle('touch', m === 'touch');
  document.body.classList.toggle('gamepad', m === 'pad');
  document.body.dataset.pad = 'xbox';
}
function press(id: 'interact' | 'hook' | 'jump' | 'glide', m: Mode) {
  inputMode(m);
  if (m === 'keyboard') {
    const code = { interact: 'KeyE', hook: 'KeyF', jump: 'Space', glide: 'KeyQ' }[id];
    for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  } else if (m === 'pad') {
    const slot = { interact: 'x', hook: 'rb', jump: 'a', glide: 'lb' }[id];
    const action = actionForSlot(slot);
    check(action?.id === id, `${slot} must bind ${id}`);
    triggerAction(action.id, 'down');
    triggerAction(action.id, 'up');
  } else {
    const button =
      id === 'interact'
        ? dom.grabBtn
        : id === 'jump'
          ? dom.jumpBtn
          : document.querySelector<HTMLElement>(`.place-${id}-btn`);
    check(button && button.getBoundingClientRect().width > 0, `${id} touch button visible`);
    if (id === 'interact') check(button.textContent === 'Hook', 'main touch label says Hook');
    for (const type of ['pointerdown', 'pointerup'])
      button.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 71, bubbles: true }));
  }
}
async function stand(x: number, y: number, z: number) {
  teleport(me.body!, x, y, z);
  me.body!.velocity.set(0, 0, 0);
  await until(() => me.coyote > 0, 'staged platform support');
  await wait(200);
}
async function hookStage() {
  await stand(992.4, 37.65, -1);
  aimHook('t2');
  await until(() => state().hookShot.pick === 't2', 't2 selected');
  await wait(100);
}
async function falling() {
  await stand(1015, 103.05, -6);
  teleport(me.body!, 1005, 100, -6);
  me.body!.velocity.set(0, -5, 0);
  cam.yaw = me.yaw = Math.PI / 2;
  cam.pitch = -0.3;
  await until(() => me.coyote <= 0, 'off summit');
}
export async function stage() {
  await until(() => !!me.body && !!inspectRailway()?.hookShot.owned, 'hook seed loaded', 60000);
  window.__debugCam?.clear();
  if (kind === 'teach') {
    check(!state().glider.owned, 'teach needs hook-taken seed with an untaken glider');
    const d = state().line2View.glideDevice;
    await takeDevice(d.x + 1.8, d.y + 0.65, d.z, () => state().glider.owned);
    return;
  }
  if (kind === 'glide' && state().reward.jumpDevice.available) {
    const d = state().reward.jumpDevice;
    await takeDevice(d.x + 1.5, d.y + 0.65, d.z, () => !state().reward.jumpDevice.available);
  }
  for (const m of ['keyboard', 'pad', 'touch'] as const) {
    inputMode(m);
    if (kind === 'hook') {
      await hookStage();
      const before = state().hookShot.pulls;
      press('interact', m);
      check(state().hookShot.pulls === before + 1, `${m} Interact fires once`);
      await until(() => !state().hookShot.pulling && me.coyote > 0, `${m} dry hook landing`);
      check(Math.abs(me.body!.position.y - 50.45) < 0.5, `${m} landed on t2`);
      await hookStage();
      press('hook', m);
      await until(() => !state().hookShot.pulling && me.coyote > 0, `${m} alternate hook landing`);
    } else {
      await falling();
      press('glide', m);
      check(state().glider.open, `${m} alternate opens`);
      const jumps = state().reward.tools.jumps;
      press('jump', m);
      await wait(150);
      check(!state().glider.open && state().reward.tools.jumps === jumps, `${m} closes before unspent air jump`);
      if (m === 'keyboard') {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true }));
        await wait(100);
        check(!state().glider.open && state().reward.tools.jumps === jumps, 'held Space does not retrigger');
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
      }
      press('jump', m);
      await wait(150);
      check(state().reward.tools.jumps === jumps + 1 && !state().glider.open, `${m} air jump still available`);
      press('jump', m);
      await wait(150);
      check(state().glider.open, `${m} Jump opens after air jump`);
      press('glide', m);
      check(!state().glider.open, `${m} alternate closes`);
    }
    console.log(`PLAY C7 ${kind} ${m} input checks passed`);
  }
  inputMode(mode);
  if (kind === 'hook') {
    await hookStage();
    check(state().hookShot.pulls >= 6, 'six pulls completed');
    check(mode === 'touch' || state().hookShot.chip, 'hook prompt survives three pulls');
  } else {
    await falling();
    press('glide', mode);
  }
}
async function takeDevice(x: number, y: number, z: number, owned: () => boolean) {
  await stand(x, y, z);
  press('interact', 'keyboard');
  await until(owned, 'device accepted');
  await until(() => state().reward.showing, 'device card');
  await wait(1800);
  press('interact', 'keyboard');
  await until(() => !state().reward.showing, 'device card dismissed');
  await wait(300);
}
export async function act() {
  window.__debugCam?.clear();
  const run = async () => {
    if (kind === 'teach') {
      await falling();
      await until(() => state().reward.arrival.glideTeaching, 'first-fall Jump teach');
      const chips = [...document.querySelectorAll('.place-key.on')].map((x) => x.textContent);
      check(
        chips.some((x) => x?.includes('Space')),
        'teach shows Space',
      );
      console.log(`PLAY C7 teach ${JSON.stringify(chips)}`);
    } else {
      await wait(650);
      press(kind === 'hook' ? 'interact' : 'jump', mode);
      if (kind === 'hook') await until(() => !state().hookShot.pulling && me.coyote > 0, 'captured landing');
      else {
        await wait(200);
        check(!state().glider.open, 'captured Jump close');
      }
    }
    page.__c7Done = true;
    console.log(`PLAY C7 ${kind} capture complete`);
  };
  if (kind === 'teach') await run();
  else background(run(), 'C7 capture');
}
