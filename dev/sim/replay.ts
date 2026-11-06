// `npm run sim -- replay [file] [--expect <trace>] [--write [trace]] [--tolerance <m>]`: plays a recording (?record=1,
// src/debug/record.ts) headless on this build, frame by frame, and compares the state it reaches. What that can and can't
// check: ./README.md. With no file, it plays everything in ./replays/, one process each (a world per process), against
// each one's <name>.trace.json.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TRACE_FIELDS, stringifyRows, traceRow, type Press, type Recording } from '../../src/debug/record-format.ts';
import {
  ball,
  ballInReach,
  claimBall,
  grabBall,
  releaseBall,
  respawnBall,
  throwBall,
} from '../../src/entities/ball/state.ts';
import { cam, enterIsland, me, pressJump, releaseJump, turnWithDeck } from '../../src/entities/player/state.ts';
import { setPhysicsClock, teleport } from '../../src/physics/engine.ts';
import { input, inputState } from '../../src/player/input-state.ts';
import { emptyHand, take } from '../../src/player/inventory.ts';
import { handPosition } from '../../src/player/state.ts';
import { launchVelocity, profileFor } from '../../src/player/throw-curve.ts';
import { hrtimeMs } from './timed.ts';
import { frame, headless, virtualClock } from './world.ts';

const DIR = path.join(import.meta.dirname, 'replays');
const TOLERANCE = 0.01; // m, m/s: as `sim -- player`. The same WASM and the same input should give the same answer

const args = process.argv.slice(3);
function option(name: string) {
  const at = args.indexOf(name);
  if (at < 0) return null;
  args.splice(at, 1);
  return args[at] && !args[at]!.startsWith('--') ? args.splice(at, 1)[0]! : '';
}
const expectPath = option('--expect');
const writePath = option('--write');
const tolerance = Number(option('--tolerance')) || TOLERANCE;
const file = args[0];

if (!file) {
  let failed = 0;
  for (const f of fs.readdirSync(DIR).sort()) {
    if (!f.endsWith('.json') || f.endsWith('.trace.json')) continue;
    const flags = [...(writePath === null ? [] : ['--write']), '--tolerance', String(tolerance)];
    const run = [...process.execArgv, process.argv[1]!, 'replay', path.join(DIR, f), ...flags];
    if (spawnSync(process.execPath, run, { stdio: 'inherit' }).status) failed++;
  }
  process.exit(failed ? 1 : 0);
}

const recording = JSON.parse(fs.readFileSync(file, 'utf8')) as Recording;

await headless();
virtualClock();

// ---------------------------------------------------------------- the world the recording starts from
function place() {
  const { start } = recording;
  const { player: pl, ball: bl } = start;
  enterIsland('replay');
  const b = me.body!;
  setPhysicsClock(start.clock);
  teleport(b, pl.p[0]!, pl.p[1]!, pl.p[2]!);
  b.velocity.set(pl.v[0]!, pl.v[1]!, pl.v[2]!);
  me.yaw = pl.yaw;
  me.coyote = pl.coyote;
  me.jumpQueued = pl.jumpQueued;
  me.jumpHeld = pl.jumpHeld;
  me.swimming = pl.swimming;
  me.charging = pl.charging;
  Object.assign(cam, start.cam);
  const { keys, ...sticks } = start.input;
  for (const key of keys) input.keys.add(key);
  Object.assign(input, sticks);
  Object.assign(inputState, start.state);
  ball.pose.p.set(bl.p[0]!, bl.p[1]!, bl.p[2]!);
  ball.pose.q.set(bl.q[0]!, bl.q[1]!, bl.q[2]!, bl.q[3]!);
  ball.pose.v.set(bl.v[0]!, bl.v[1]!, bl.v[2]!);
  teleport(ball.body, bl.p[0]!, bl.p[1]!, bl.p[2]!);
  if (bl.mine) {
    claimBall(bl.held);
    ball.body.angularVelocity.set(bl.w[0]!, bl.w[1]!, bl.w[2]!);
  }
  if (pl.held) take(pl.held);
  else emptyHand();
}

// ---------------------------------------------------------------- presses, as far as a run without hands.ts has them
const skipped = new Map<string, number>();
const skip = (what: string) => skipped.set(what, (skipped.get(what) ?? 0) + 1);
// With nothing to act on these do nothing, here as there; or what they do is already in the frame's changes.
const QUIET = new Set(['use', 'e', 'interact', 'touch', 'sprint', 'back', 'zoom']);
function press([id, down, data]: Press) {
  if (id === 'jump') return down ? pressJump() : releaseJump();
  if (id === 'respawn') return down && respawnBall();
  if (data?.t === 'ball') {
    if (down && ballInReach()) grabBall(); // reach is this build's: a shorter one misses, and the trace shows it
    return;
  }
  if (data?.c !== undefined && data.aim) {
    const p = handPosition();
    const [ax, ay, az] = data.aim as [number, number, number];
    const len = Math.hypot(ax - p.x, ay - p.y, az - p.z) || 1;
    const dir = { x: (ax - p.x) / len, y: (ay - p.y) / len, z: (az - p.z) / len };
    return throwBall(p, launchVelocity(profileFor('ball'), data.c, dir, me.body!.velocity));
  }
  if (data?.t) return skip(`${id} on ${data.t}`);
  if (!QUIET.has(id) && down) skip(id);
}

// ---------------------------------------------------------------- play it
const lastPress: (string | null)[] = []; // per frame: the press before it, for a difference to point at
function play() {
  place();
  const trace: number[][] = [];
  let pressed: string | null = null;
  for (const [k, [dt, c]] of recording.frames.entries()) {
    if (c) {
      if (c.yaw !== undefined) cam.yaw = c.yaw;
      if (c.pitch !== undefined) cam.pitch = c.pitch;
      if (c.keys) {
        input.keys.clear();
        for (const key of c.keys) input.keys.add(key);
      }
      if (c.stickX !== undefined) input.stickX = c.stickX;
      if (c.stickY !== undefined) input.stickY = c.stickY;
      if (c.triggerL !== undefined) input.triggerL = c.triggerL;
      if (c.triggerR !== undefined) input.triggerR = c.triggerR;
      if (c.sprint !== undefined) input.sprint = c.sprint;
      if (c.state) Object.assign(inputState, c.state);
      if (c.charging !== undefined) me.charging = c.charging;
      if (c.mine === true && !ball.mine) claimBall(false);
      if (c.mine === false) releaseBall();
      for (const p of c.presses ?? []) {
        press(p);
        pressed = `${p[0]} ${p[1] ? 'down' : 'up'} at frame ${k}`;
      }
    }
    frame(dt);
    turnWithDeck(); // the view's update does this. A headless world has no decks yet, so here it only keeps the order
    trace.push(traceRow(me, ball));
    lastPress.push(pressed);
  }
  return trace;
}

const t0 = hrtimeMs();
const trace = play();
const ms = hrtimeMs() - t0;
const seconds = recording.frames.reduce((sum, [dt]) => sum + dt, 0);

// ---------------------------------------------------------------- compare
function compare(want: number[][], label: string) {
  if (want.length !== trace.length) {
    console.log(`  ${label}: DIFFERENT, ${trace.length} frames here, ${want.length} there`);
    return false;
  }
  type Off = { k: number; f: number; off: number };
  let first: Off | null = null;
  let worst: Off = { k: 0, f: 0, off: 0 };
  for (let k = 0; k < trace.length; k++)
    for (let f = 0; f < TRACE_FIELDS.length; f++) {
      const off = Math.abs(trace[k]![f]! - want[k]![f]!);
      if (off > worst.off) worst = { k, f, off };
      if (off > tolerance && !first) first = { k, f, off };
    }
  const at = ({ k, f, off }: Off) =>
    `${TRACE_FIELDS[f]} at frame ${k}: ${trace[k]![f]} here, ${want[k]![f]} there, off by ${off.toFixed(3)}`;
  if (!first) {
    console.log(`  ${label}: same within ${tolerance}. ${worst.off ? `Worst: ${at(worst)}` : 'No difference at all'}`);
    return true;
  }
  console.log(`  ${label}: DIFFERENT. First past ${tolerance}: ${at(first)}`);
  console.log(`    the last press before it: ${lastPress[first.k] ?? 'none yet'}. Worst: ${at(worst)}`);
  return false;
}

console.log(
  `${path.basename(file)}: ${trace.length} frames, ${seconds.toFixed(1)} s of game in ${ms.toFixed(0)} ms (${((seconds * 1000) / ms).toFixed(0)}x real time), recorded on build ${recording.build}`,
);
if (recording.peers) console.log(`  ${recording.peers} other player(s) were in the room, and a replay has none`);
if (skipped.size)
  console.log(`  not in a headless run, so skipped: ${[...skipped].map(([w, n]) => `${w} x${n}`).join(', ')}`);

const expected = expectPath || file.replace(/\.json$/, '.trace.json');
let ok = true;
if (writePath !== null) {
  const out = writePath || expected;
  fs.writeFileSync(out, `${stringifyRows(trace)}\n`);
  console.log(`  wrote ${path.relative(process.cwd(), out)}`);
} else if (fs.existsSync(expected)) {
  ok = compare(JSON.parse(fs.readFileSync(expected, 'utf8')) as number[][], path.basename(expected));
} else if (expectPath) {
  throw new Error(`no trace at ${expectPath}`);
} else {
  console.log(`  no ${path.basename(expected)} to compare with: --write saves one`);
}
// For information only: a recording stays as it was played, and a build's physics can change on purpose.
if (recording.trace.length) compare(recording.trace, 'the browser session');
process.exit(ok ? 0 : 1);
