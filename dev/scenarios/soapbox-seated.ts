// Seated in the soapbox on an iPad-sized touch screen (research/cross-device-input.md recs 7, 11, 15): the driving
// touch layout (main button "Get out", Jump "Drift / Brake", Bump/Toss/Honk/Ping hidden), ← steers instead of turning
// the camera, a two-finger scroll does not look, and getting out restores the walking layout. Serves DESIGN.md 1
// (Toys before chores) and 8 (Designed for drop-in, drop-out).
type Page = {
  keyboard: { down: (k: string) => Promise<void>; up: (k: string) => Promise<void> };
};
type Game = {
  page: Page;
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: {
    name: string;
    room: string;
    hud?: boolean;
    query?: string;
    size?: number[];
    touch?: boolean;
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

// Which touch buttons show, and the labels of the two fixed ones.
const LAYOUT = `const shown = (sel) => { const b = document.querySelector('#touch ' + sel); return !!b && getComputedStyle(b).display !== 'none'; };
  return { grab: document.getElementById('btn-grab').textContent, jump: document.getElementById('btn-jump').textContent,
    bump: shown('.bump'), honk: shown('.honk-btn'), ping: shown('.ping-btn'), toss: shown('.toss') };`;
type Layout = { grab: string; jump: string; bump: boolean; honk: boolean; ping: boolean; toss: boolean };

export default {
  about: 'soapbox seated: driving touch layout, arrows only steer, scroll does not look, getting out restores it',
  timeout: 240000,
  async run(t: Run) {
    const room = 'soapseat' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'driver', room, hud: true, touch: true, size: [1194, 834], query: 'proto=soapbox' });
    await g.waitFor(`window.boogle?.me?.entered && !!window.__soapbox`, { timeout: 90000 });
    await g.eval(`document.querySelector('.first-run-close')?.click(); document.querySelector('.pb-close')?.click();`);
    const walking = (await g.eval(LAYOUT)) as Layout;
    t.check('walking: Jump reads Jump, Bump shows', walking.jump === 'Jump' && walking.bump, JSON.stringify(walking));

    await g.eval(`window.__soapbox.board();`);
    await t.sleep(500);
    t.check('seated', !!(await g.eval(`return (await import('/src/player/input.ts')).inputState.seated;`)));
    const seat = (await g.eval(LAYOUT)) as Layout;
    t.check(
      'driving layout: Get out and Drift / Brake',
      /Get out|Back to the top/.test(seat.grab) && seat.jump === 'Drift / Brake',
      JSON.stringify(seat),
    );
    t.check(
      'driving layout: Bump, Honk, Ping and Toss hide',
      !seat.bump && !seat.honk && !seat.ping && !seat.toss,
      JSON.stringify(seat),
    );
    t.check('still: driving touch layout at 1194x834', true, await g.still('soapbox-seated-touch'));

    // ← steers the cart and does not add the 2 rad/s arrow turn. The cart rolls off the start and the chase camera
    // follows it, so for this check the steering may not turn the cart (maxYaw 0) nor lead the camera (camLead 0):
    // then only an arrow turn would swing the camera off the cart's heading (by about 0.6 rad, against the chase).
    const OFF = `const { S } = window.__soapbox; const y = (await import('/src/player/player.ts')).cam.yaw - S.heading;
      return Math.atan2(Math.sin(y), Math.cos(y));`;
    await g.eval(`const { T } = window.__soapbox; window.__keep = [T.maxYaw, T.camLead]; T.maxYaw = 0; T.camLead = 0;`);
    await t.sleep(600);
    const o0 = Number(await g.eval(OFF));
    await g.page.keyboard.down('ArrowLeft');
    await t.sleep(1000);
    const steer = Number(await g.eval(`return window.__soapbox.S.steer;`));
    const turned = Math.abs(Number(await g.eval(OFF)) - o0);
    await g.page.keyboard.up('ArrowLeft');
    await g.eval(`const { T } = window.__soapbox; [T.maxYaw, T.camLead] = window.__keep;`);
    t.check('seated: ← steers the cart left', steer < -0.3, steer.toFixed(3));
    t.check('seated: ← does not turn the camera off the cart', turned < 0.25, turned.toFixed(3));
    // A sideways two-finger scroll, dispatched on the canvas and read back in the same task, so the chase camera has
    // no frame to pull the view back in between: walking, these 300 px would look about 1 rad round.
    const scrolled = Number(
      await g.eval(`const { cam } = await import('/src/player/player.ts'); const c = document.getElementById('view');
        const y = cam.yaw; for (let i = 0; i < 6; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaX: 50, bubbles: true, cancelable: true }));
        return Math.abs(cam.yaw - y);`),
    );
    t.check('seated: a sideways scroll does not look', scrolled < 0.01, scrolled.toFixed(3));

    await g.eval(`window.__soapbox.getOut(false);`);
    await t.sleep(300);
    const after = (await g.eval(LAYOUT)) as Layout;
    t.check(
      'out: the walking layout is back',
      after.jump === 'Jump' && after.bump && !(await g.eval(`return document.body.classList.contains('seated');`)),
      JSON.stringify(after),
    );
  },
};
