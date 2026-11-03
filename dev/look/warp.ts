// Runs the page's clock faster than the wall's, so a long stretch of play costs seconds. Installed before the page's own
// code (`Game.open({ warp: true })`): performance.now, Date, timers and requestAnimationFrame all answer to one clock.
// It starts at 1x on the browser's real frames, so loading, shader builds and captures are normal. `__warp.go(n)` then steps
// fixed 60 Hz frames as fast as the CPU allows, at most n times real time (Infinity: flat out), drawing only one in
// `__warp.drawEvery`. Real events (the socket, fetches, WebGPU promises) still arrive between steps.
//
// What it isn't: a performance measure, or a judge of feel. dt is a steady 1/60 s, which is the kindest case. CSS animations
// run on the wall clock, and the local server's world ticks at real speed, so anything lockstep looks slow to a warped page.

export type WarpHandle = {
  /** The multiple of real time asked for: 1 is normal. */
  speed: number;
  /** Virtual seconds since the page began. */
  now: () => number;
  /** Ahead at this speed; at game second `stopAt`, if given, it returns to 1x on its own, on the exact frame. */
  go: (speed: number, stopAt?: number) => void;
  /** Draw one frame in this many while warped. */
  drawEvery: number;
  /** Virtual frames run so far, and those skipped drawing. */
  frames: number;
  skipped: number;
  /** True while the frame now running won't be drawn. */
  skip: boolean;
};

/** The page half: a function, serialised into the page by Playwright, so it sees nothing else from this file. */
export function installWarp() {
  const real = {
    perf: performance.now.bind(performance),
    date: Date,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    raf: window.requestAnimationFrame.bind(window),
  };
  const STEP = 1000 / 60;
  const epoch = real.date.now() - real.perf();
  let virtual = real.perf();
  let lastReal = virtual;
  type Timer = { id: number; at: number; fn: () => void; every: number; seq: number };
  const timers = new Map<number, Timer>();
  let rafs: { id: number; fn: FrameRequestCallback }[] = [];
  let nextId = 1;
  let seq = 0;

  const add = (fn: unknown, ms: unknown, every: boolean, args: unknown[]) => {
    const id = nextId++;
    const wait = Math.max(0, Number(ms) || 0);
    const call = () => (fn as (...a: unknown[]) => unknown)(...args);
    timers.set(id, { id, at: virtual + wait, fn: call, every: every ? Math.max(1, wait) : 0, seq: seq++ });
    return id;
  };
  const w = window as unknown as Record<string, unknown>;
  w.setTimeout = (fn: unknown, ms?: unknown, ...args: unknown[]) => add(fn, ms, false, args);
  w.setInterval = (fn: unknown, ms?: unknown, ...args: unknown[]) => add(fn, ms, true, args);
  w.clearTimeout = w.clearInterval = (id: number) => void timers.delete(id);
  w.requestAnimationFrame = (fn: FrameRequestCallback) => {
    const id = nextId++;
    rafs.push({ id, fn });
    return id;
  };
  w.cancelAnimationFrame = (id: number) => {
    rafs = rafs.filter((r) => r.id !== id);
  };
  performance.now = () => virtual;
  class VDate extends real.date {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [number]));
      else super(epoch + virtual);
    }
    static override now() {
      return Math.floor(epoch + virtual);
    }
  }
  w.Date = VDate;

  const report = (e: unknown) => {
    // A callback that throws must reach the page's error handlers, not stop the clock.
    real.setTimeout(() => {
      throw e;
    }, 0);
  };
  function runTimers() {
    for (;;) {
      let first: Timer | null = null;
      for (const t of timers.values())
        if (t.at <= virtual && (!first || t.at < first.at || (t.at === first.at && t.seq < first.seq))) first = t;
      if (!first) return;
      if (first.every) first.at += first.every;
      else timers.delete(first.id);
      try {
        first.fn();
      } catch (e) {
        report(e);
      }
    }
  }
  function runRafs() {
    const list = rafs;
    rafs = [];
    for (const r of list) {
      try {
        r.fn(virtual);
      } catch (e) {
        report(e);
      }
    }
  }

  // CSS runs on the wall clock. Warped, a half-second fade would last half a minute of game time.
  const cssOff = document.createElement('style');
  cssOff.textContent =
    '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important }';
  const freezeCss = (on: boolean) => (on ? document.head.append(cssOff) : cssOff.remove());

  const channel = new MessageChannel();
  const handle: WarpHandle = {
    speed: 1,
    now: () => virtual / 1000,
    drawEvery: 30,
    frames: 0,
    skipped: 0,
    skip: false,
    go(speed: number, at?: number) {
      stopAt = at ?? Infinity;
      freezeCss(speed !== 1);
      const was = handle.speed;
      handle.speed = speed;
      handle.skip = false;
      budgetFrom = real.perf();
      budgetBase = virtual;
      if (was === 1 && speed !== 1) post();
      if (speed === 1) {
        lastReal = real.perf();
        if (!realLoop) real.raf(onReal);
        realLoop = true;
      }
    },
  };
  (window as unknown as { __warp: WarpHandle }).__warp = handle;

  // 1x: real frames, with the clock following the wall.
  let realLoop = true;
  function onReal() {
    if (handle.speed !== 1) return void (realLoop = false);
    const t = real.perf();
    virtual += t - lastReal;
    lastReal = t;
    runTimers();
    runRafs();
    real.raf(onReal);
  }
  real.raf(onReal);
  // Timers must fire with the tab's frames stopped as well (a hidden page): a coarse real timer covers it.
  (function tick() {
    if (handle.speed === 1) {
      const t = real.perf();
      virtual += t - lastReal;
      lastReal = t;
      runTimers();
    }
    real.setTimeout(tick, 50);
  })();

  // Warped: a frame per task, so microtasks settle between frames and the socket's messages get in.
  let stopAt = Infinity;
  let budgetFrom = 0;
  let budgetBase = 0;
  let frame = 0;
  const post = () => channel.port1.postMessage(0);
  channel.port2.onmessage = () => {
    if (handle.speed === 1) return;
    if (virtual / 1000 >= stopAt) return handle.go(1);
    // Over the speed asked for: wait for the wall to catch up.
    const ahead = virtual - budgetBase - (real.perf() - budgetFrom) * handle.speed;
    if (ahead > 0) return void real.setTimeout(post, Math.min(50, ahead / handle.speed));
    virtual += STEP;
    runTimers();
    frame++;
    handle.frames++;
    handle.skip = frame % handle.drawEvery !== 0;
    if (handle.skip) handle.skipped++;
    runRafs();
    handle.skip = false;
    post();
  };
}

/** Makes the game skip its draw on the frames warp says to. Page code, once the game's modules exist; needs a dev server. */
export const SKIP_DRAWS = `
  const { pipeline } = await import('/src/render/scene.ts');
  const draw = pipeline.render.bind(pipeline);
  pipeline.render = () => (window.__warp.skip ? undefined : draw());
`;
