// The one fixed room clock (docs/plans/replication.md, "One fixed clock"): 60 Hz steps, rules every 6.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP_HZ,
  RULE_STEPS,
  RULE_MS,
  STEP_MS,
  MAX_CATCH_UP,
  createFixedSteps,
  createStepEstimate,
} from '../src/world/room-clock.ts';
import { createSync, TICK_MS } from '../src/world/sync.ts';
import { createRailwayClock } from '../src/world/railway-clock.ts';

test('a server rule tick is exactly six 60 Hz steps and keeps its 100 ms duration', () => {
  assert.equal(STEP_HZ, 60);
  assert.equal(RULE_STEPS, 6);
  assert.equal(RULE_MS, 100);
  assert.equal(TICK_MS, RULE_MS);
});

test('fixed steps count whole steps without drift and drop a stalled backlog', () => {
  const steps = createFixedSteps();
  let n = 0;
  const count = () => n++;
  for (let k = 0; k < 600; k++) steps.advance(16, count); // 9.6 s of 16 ms frames
  assert.equal(n, 576);
  n = 0;
  for (let k = 0; k < 1000; k++) steps.advance(100, count);
  assert.equal(n, 6000, 'a 100 ms advance is exactly six steps, every time');
  n = 0;
  steps.advance(5000, count);
  assert.equal(n, MAX_CATCH_UP, 'a 5 s stall runs at most five rule ticks of steps');
  n = 0;
  steps.advance(16, count);
  assert.equal(n, 0, 'and the dropped backlog does not come back');
});

test('the step estimate follows the freshest stamp and never runs backwards', () => {
  const est = createStepEstimate();
  assert.equal(est.now(0), -1);
  est.hear(600, 1000); // server step 600 heard at local 1000 ms
  assert.equal(est.now(1000), 600);
  assert.equal(est.now(1100), 606);
  // A late packet (an older stamp) does not pull the estimate back.
  est.hear(601, 1100);
  assert.equal(est.now(1100), 606);
  // A fresher, faster path moves it forward.
  est.hear(612, 1150);
  assert.equal(est.now(1150), 612);
  assert.equal(est.tick(1150), 102);
  assert.equal(est.now(1150, 50), 615, 'aheadMs adds a lead for prediction');
  assert.equal(est.now(1150), 612, 'without changing the base estimate');
  // A stamp far behind (a hidden tab ran on, or a server restart) re-anchors.
  est.hear(10, 2000);
  assert.equal(est.now(2000), 10);
});

test('the step estimate tracks a server slower than the local clock instead of running ahead', () => {
  const est = createStepEstimate();
  // The server makes half as many steps as the local clock expects (a stalled or throttled server, a warped page).
  const server = (at: number) => 600 + Math.floor((at * 30) / 1000);
  let worst = 0;
  for (let at = 0; at <= 5000; at += 50) {
    if (at % 200 === 0) est.hear(server(at), at); // the room's clock stamp every 200 ms
    const ahead = est.now(at) - server(at);
    if (at > 1000) worst = Math.max(worst, ahead);
    assert.ok(ahead >= -1, `never behind what was heard (${at} ms)`);
  }
  assert.ok(worst <= 10, `about one window of drift at most, then it follows the server: ${worst} steps`);
});

test('a local world ticks every sixth step and its room clock is tick * 6 + phase', () => {
  const s = createSync();
  const ticks: number[] = [];
  const steps: number[] = [];
  s.onTick((t) => ticks.push(t));
  s.onStep((step) => steps.push(step));
  s.stepWorld(5 * (1000 / 60) + 0.001);
  assert.deepEqual(ticks, []);
  assert.deepEqual(steps, [1, 2, 3, 4, 5]);
  s.stepWorld(1000 / 60);
  assert.deepEqual(ticks, [1]);
  assert.equal(s.roomStep(), 6);
  s.stepWorld(1000);
  assert.equal(s.world.tick, 6, 'a long frame catches up at most five ticks');
  for (let k = 1; k < steps.length; k++) assert.equal(steps[k], steps[k - 1]! + 1, 'steps never skip or repeat');
});

test('mover clocks remove one-way delay with round trips in each tab own time origin', () => {
  const delays = [0, 50, 100];
  const origins = [5000, 50000, 500000];
  const clocks = delays.map(() => createRailwayClock());
  clocks.forEach((clock, k) => {
    const local = origins[k]!,
      delay = delays[k]!;
    assert.equal(clock.hear(600, local + 1000 - delay, local + 1000 + delay), true);
  });
  for (let at = 1200; at <= 3000; at += 17) {
    const values = clocks.map((clock, k) => clock.now(at + origins[k]!, -1));
    assert.ok(Math.max(...values) - Math.min(...values) < 1e-8);
    assert.ok(Math.abs(values[0]! - (600 + (at - 1000) / STEP_MS)) < 1e-8);
  }
});

test('mover clock corrections slew without backwards time or a deck jump; malformed samples do nothing', () => {
  const clock = createRailwayClock();
  assert.equal(clock.hear(0, 0, 0), true);
  assert.equal(clock.now(0, -1), 0);
  assert.equal(clock.now(100, -1), 6);
  assert.equal(clock.hear(12, 100, 200), true); // correction: server step 12 at the local midpoint 150
  let previous = clock.now(200, -1);
  assert.ok(previous >= 11.4 - 1e-8 && previous <= 12.6 + 1e-8);
  for (let at = 217; at < 2000; at += 17) {
    const value = clock.now(at, -1),
      dt = 17 / STEP_MS;
    assert.ok(value >= previous + dt * 0.9 - 1e-8 && value <= previous + dt * 1.1 + 1e-8);
    assert.equal(clock.now(at, -1), value, 'repeat reads do not move a deck');
    previous = value;
  }
  for (const [step, sent, received] of [
    [-1, 0, 1],
    [NaN, 0, 1],
    [1, 10, 9],
    [1, 0, 3000],
    [1, NaN, 2],
  ])
    assert.equal(clock.hear(step!, sent!, received!), false);
  assert.equal(clock.rtt(), 100);
});
