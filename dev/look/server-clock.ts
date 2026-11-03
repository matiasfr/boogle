// Preloaded only into look's disposable server child. Like the page warp, advance in small steps at a wall-time cap.
// Scaling wall time directly makes an OS scheduling pause exceed updateWorld's catch-up cap and silently lose ticks.
// This clock never skips ahead to hide lag: report its deficit, and the world's actual tick progress, in coop-warp.ts.
import timers from 'node:timers';
import { syncBuiltinESMExports } from 'node:module';

const realNow = performance.now.bind(performance);
const RealDate = Date;
const realTimeout = timers.setTimeout;
const realImmediate = timers.setImmediate;
const STEP = 1000 / 60;
let wallBase = realNow();
let virtual = wallBase;
let gameBase = virtual;
let speed = 1;
const epoch = RealDate.now() - wallBase;
const pending = new Set<ClockTimer>();

class ClockTimer {
  at: number;
  fn: () => void;
  delay: number;
  repeat: boolean;
  referenced = true;
  constructor(fn: () => void, delay: number, repeat: boolean) {
    this.fn = fn;
    this.delay = delay;
    this.repeat = repeat;
    this.at = virtual + delay;
    pending.add(this);
  }
  ref() {
    this.referenced = true;
    return this;
  }
  unref() {
    this.referenced = false;
    return this;
  }
  hasRef() {
    return this.referenced;
  }
  refresh() {
    this.at = virtual + this.delay;
    pending.add(this);
    return this;
  }
  close() {
    pending.delete(this);
    return this;
  }
  [Symbol.dispose]() {
    this.close();
  }
}
function runTimers() {
  for (;;) {
    let first: ClockTimer | undefined;
    // Set order breaks equal-deadline ties in registration order.
    for (const t of pending) if (t.at <= virtual && (!first || t.at < first.at)) first = t;
    if (!first) return;
    if (first.repeat) first.at = virtual + first.delay;
    else pending.delete(first);
    first.fn();
  }
}
function pump() {
  const wanted = gameBase + (realNow() - wallBase) * speed;
  if (speed === 1) {
    virtual = wanted;
    runTimers();
  } else {
    const began = realNow();
    // Catch up through small steps, never one large dt. Bound the batch so socket traffic gets a turn as well.
    for (let n = 0; n < 8 && virtual < wanted; n++) {
      virtual += STEP;
      runTimers();
      if (realNow() - began > 2) break;
    }
  }
  const ahead = (virtual - (gameBase + (realNow() - wallBase) * speed)) / speed;
  // Keep the harness pump referenced: unref'd immediates otherwise wait for socket traffic to wake Node's poll.
  // The child owns its lifetime and exits explicitly on close or IPC disconnect, including when all game timers unref.
  if (ahead > 0 || speed === 1) realTimeout(pump, speed === 1 ? 1 : ahead);
  else realImmediate(pump);
}
function timer(fn: (...args: unknown[]) => void, ms = 1, repeat = false, args: unknown[] = []) {
  return new ClockTimer(() => fn(...args), Math.max(1, ms || 1), repeat);
}
const timeout = ((fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
  timer(fn, ms, false, args)) as unknown as typeof setTimeout;
const interval = ((fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
  timer(fn, ms, true, args)) as unknown as typeof setInterval;
// Retain the native clear for handles created by Node internals before preload.
const nativeClear = timers.clearTimeout;
const clearTimer = ((handle: ClockTimer | NodeJS.Timeout | undefined) => {
  if (handle instanceof ClockTimer) handle.close();
  else nativeClear(handle);
}) as typeof clearTimeout;
globalThis.setTimeout = timers.setTimeout = timeout;
globalThis.setInterval = timers.setInterval = interval;
globalThis.clearTimeout = timers.clearTimeout = clearTimer;
globalThis.clearInterval = timers.clearInterval = clearTimer;
syncBuiltinESMExports();
performance.now = () => virtual;
const ScaledDate = class extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length) super(...(args as [number]));
    else super(epoch + virtual);
  }
  static override now() {
    return Math.floor(epoch + virtual);
  }
};
globalThis.Date = new Proxy(RealDate, {
  apply: () => new ScaledDate().toString(),
  construct: (_target, args) => new ScaledDate(...args),
  get: (target, key) => (key === 'now' ? ScaledDate.now : Reflect.get(target, key)),
});
pump();

export const clock = {
  read: () => ({
    speed,
    game: virtual / 1000,
    wall: realNow() / 1000,
    lag: (gameBase + (realNow() - wallBase) * speed - virtual) / 1000,
  }),
  set(n: number) {
    if (!Number.isFinite(n) || n < 1 || n > 50) throw new Error('warp speed must be between 1 and 50');
    wallBase = realNow();
    gameBase = virtual;
    speed = n;
    return this.read();
  },
};
