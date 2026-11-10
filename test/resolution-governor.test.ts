// Playtest regression (9 November 2026): a Mac at a steady 17 ms stayed at the resolution floor for four minutes, and a
// phone's reload started at the floor. Simulated vsynced frames: the GPU cost grows with the pixel count (ratio²),
// intervals land on whole vsyncs, Safari's timer rounds them to 1 ms, and a hitch comes every few seconds.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGovernor, startRatio, type GovernorStep } from '../src/render/resolution-governor.ts';

const VSYNC = 1000 / 60;
type Load = (ratio: number) => number; // GPU ms per frame at this ratio

function run(start: number, phases: { s: number; load: Load }[], seed = 7) {
  const g = createGovernor(start);
  let rng = seed,
    t = 0;
  const steps: { t: number; step: GovernorStep; ratio: number }[] = [];
  const at: { t: number; ratio: number }[] = [];
  const rand = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (const phase of phases) {
    const end = t + phase.s;
    let nextHitch = t + 2 + rand() * 2;
    while (t < end) {
      const gpu = phase.load(g.ratio) * (0.5 + rand()); // frame to frame, the scene's cost varies
      let ms = VSYNC * Math.max(1, Math.ceil(gpu / VSYNC - 0.02));
      if (t >= nextHitch) {
        ms = 40 + rand() * 10; // a garbage collection or a shader on first use
        nextHitch = t + 2 + rand() * 2;
      }
      const measured = Math.round(ms + (rand() - 0.5)); // rAF jitter, then Safari's 1 ms resolution
      t += ms / 1000;
      const step = g.frame(measured, { canShed: false, rungShed: false });
      if (step) steps.push({ t, step, ratio: g.ratio });
      at.push({ t, ratio: g.ratio });
    }
  }
  const ratioAt = (s: number) => at.findLast((a) => a.t <= s)?.ratio ?? start;
  return { g, steps, ratioAt };
}

const light: Load = (r) => 8 * r * r; // the village on a Mac: well within a frame at any ratio
const heavy: Load = (r) => 20 * r * r; // the pier: a quarter of the frames late at 0.8, none at 0.7
const floor: Load = (r) => 40 * r * r; // more than the floor can hold

test('drops within 3 s of heavy load and settles where frames fit', () => {
  const { steps, ratioAt } = run(1, [
    { s: 10, load: light },
    { s: 30, load: heavy },
  ]);
  const first = steps.find((s) => s.step === 'down');
  assert.ok(first && first.t - 10 <= 3, `first step down ${first && (first.t - 10).toFixed(1)} s into the load`);
  assert.equal(ratioAt(20), 0.7, `ratio ${ratioAt(20)} 10 s into the load`);
  for (let s = 20; s < 40; s++) assert.ok(ratioAt(s) <= 0.8, `ratio ${ratioAt(s)} at ${s} s: only one step probed`);
});

test('climbs back to full within 25 s once the load ends, at a steady 17 ms with hitches', () => {
  const { ratioAt, steps } = run(1, [
    { s: 10, load: light },
    { s: 60, load: floor }, // pinned at 0.6
    { s: 40, load: light },
  ]);
  assert.equal(ratioAt(70), 0.6);
  const full = steps.find((s) => s.t > 70 && s.ratio === 1);
  assert.ok(full && full.t - 70 <= 25, `full resolution ${full && (full.t - 70).toFixed(1)} s after the load ended`);
});

test('climbs from the floor even after failed probes backed the wait off', () => {
  const { steps } = run(1, [
    { s: 10, load: light },
    { s: 180, load: heavy },
    { s: 120, load: light },
  ]);
  const full = steps.find((s) => s.t > 190 && s.ratio === 1);
  assert.ok(full && full.t - 190 <= 75, `full resolution ${full && (full.t - 190).toFixed(1)} s after the load ended`);
});

test('a device on the edge of a step probes it at most once per 40 s after the first minute', () => {
  const { steps, ratioAt } = run(1, [
    { s: 10, load: light },
    { s: 300, load: heavy },
  ]);
  const ups = steps.filter((s) => s.step === 'up' && s.t > 70);
  assert.ok(ups.length <= 6, `${ups.length} probes in the last four minutes`);
  for (let i = 1; i < ups.length; i++)
    assert.ok(ups[i]!.t - ups[i - 1]!.t >= 38, 'probes spaced by the backed-off wait');
  let fitting = 0;
  for (let s = 70; s < 310; s++) if (ratioAt(s) === 0.7) fitting++;
  assert.ok(fitting / 240 >= 0.85, `${((fitting / 240) * 100).toFixed(0)} % of the time at the ratio that fits`);
});

// Chromium on a 120 Hz Mac (bench --scaler, 9 November): every frame on time, but rAF stamps jitter by about a
// millisecond, so the median sat 1.11–1.19 x the 10th percentile and the calm reset; after a load it took 37 s to
// climb one step and never reached full resolution in a minute.
test('climbs back at 120 Hz when the frame stamps jitter', () => {
  const g = createGovernor(0.6);
  let rng = 3,
    t = 0,
    full: number | null = null;
  const rand = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
  while (t < 60 && full === null) {
    const ms = 1000 / 120 + (rand() - 0.5) * 2.8; // on every vsync, stamped up to 1.4 ms early or late
    t += ms / 1000;
    g.frame(ms, { canShed: false, rungShed: false });
    if (g.ratio === 1) full = t;
  }
  assert.ok(full !== null && full <= 30, `full resolution after ${full?.toFixed(1) ?? 'more than 60'} s`);
});

test('a steady 30 Hz cap reads as the cap, not as slow', () => {
  const g = createGovernor(1);
  for (let i = 0; i < 30 * 60; i++) assert.equal(g.frame(33 + (i % 2), { canShed: false, rungShed: false }), null);
  assert.equal(g.ratio, 1);
});

test('at the floor it sheds a detail rung when still slow, and restores it before climbing', () => {
  const g = createGovernor(0.6);
  let shed = 0;
  // Every other frame misses a vsync: slow, though not a steady 30 Hz cap.
  for (let i = 0; i < 60 * 10; i++) if (g.frame(i % 2 ? 33 : 17, { canShed: true, rungShed: false }) === 'shed') shed++;
  assert.ok(shed >= 1, 'shed under load at the floor');
  const seen: GovernorStep[] = [];
  for (let i = 0; i < 60 * 30; i++) {
    const step = g.frame(17, { canShed: true, rungShed: !seen.includes('restore') });
    if (step) seen.push(step);
  }
  assert.equal(seen[0], 'restore');
  assert.ok(seen.includes('up'), 'climbs once the rung is back');
});

test('a fresh load never starts at the floor', () => {
  assert.equal(startRatio(0.6, true), 0.8);
  assert.equal(startRatio(0.6, false), 0.8);
  assert.equal(startRatio(0.9, true), 0.9);
  assert.equal(startRatio(null, true), 0.8);
  assert.equal(startRatio(null, false), 1);
  assert.equal(startRatio(Number.NaN, false), 1);
});
