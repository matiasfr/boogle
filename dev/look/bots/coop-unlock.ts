// Co-op abilities, option E captures (docs/brainstorms/coop-abilities.md, "Done means"), on the production railway.
// Two pages: player 2 is the finder, playing the ordinary solo route with real inputs up to the double jump; player 1
// is a friend this file drives. &coopShot= picks the moment the capture stops warping at (window.__coopShot):
//   unlock    the friend walks towards the device as the finder takes it: flourish, no card, shaft flare
//   late      the friend is offline for the find and reconnects in the capture: their own flourish on landing
//   alone     the friend gets the live flourish, reloads (sessionStorage carries the observation; none plays again),
//             then passes the Home plinth alone: the small show
//   together  both walk up to the plinth side by side: the bigger show, from both tabs
// The finder is placed beside the village for `together` (a harness pose, as look --at does); nothing seeds the world.
// npm run look -- --players 2 --eval dev/look/evals/coop-unlock.ts --query 'shot=play&coopShot=unlock&cardMs=20000'
//   --until "(import('/dev/look/bots/coop-unlock.ts').then((m) => m.start()), window.__coopShot || location.search.includes('player=2'))" --seconds 6 --video
// (alone and together add &railStop=optional%20jump%20used, so the finder stops after its jump demonstration)
import { background } from '../../../src/async.ts';
import { inspectRailway } from '../../../src/entities/railway/state.ts';
import { me } from '../../../src/player/player.ts';
import { inputState } from '../../../src/player/input-state.ts';
import { input } from '../../../src/player/input.ts';
import { releaseJump } from '../../../src/entities/player/state.ts';
import { fallArrival } from '../../../src/fall/arrival.ts';
import { net, remotes } from '../../../src/netplay/net.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { INTERP_MS, PLAYER_R } from '../../../src/constants.ts';
import { LINE1_JUMP_DEVICE } from '../../../src/sim/railway-line-layout.ts';
import { makeBot } from '../bot.ts';
import { play } from './railway.ts';

const query = new URLSearchParams(location.search);
const shot = query.get('coopShot') ?? 'unlock';
const finder = query.get('player') === '2';
const KEY = 'look.coop-unlock';
const DEVICE = { x: LINE1_JUMP_DEVICE.x / 100, y: LINE1_JUMP_DEVICE.y / 100, z: LINE1_JUMP_DEVICE.z / 100 };
const w = window as Window & { __coopShot?: boolean; __placeDone?: boolean };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let started = false;

function read() {
  const state = inspectRailway();
  if (!state) throw new Error('Missing railway view');
  return state;
}
function check(ok: unknown, label: string) {
  if (!ok) throw new Error(`COOP FAIL ${label}`);
  console.log(`COOP PASS ${label}`);
}
async function until(ok: () => unknown, label: string, ms = 900000) {
  const end = performance.now() + ms;
  while (!ok() && performance.now() < end) await wait(50);
  check(ok(), label);
}
/** The other player, from presence. */
function other() {
  for (const r of remotes.values()) {
    if (!r.visible || !r.entered) continue;
    const s = r.snaps.sample(performance.now() - INTERP_MS);
    if (s) return { x: s.b.p[0]!, y: s.b.p[1]!, z: s.b.p[2]! };
  }
  return null;
}
const finderAtDevice = (r: number) => {
  const p = other();
  return !!p && Math.hypot(p.x - DEVICE.x, p.z - DEVICE.z) < r && Math.abs(p.y - PLAYER_R - DEVICE.y) < 3;
};
const landed = () => !!me.body && !fallArrival.active && me.coyote > 0 && !me.swimming && read().ready;
/** Every 100 ms while it runs: where the friend is, and whether anything holds them. */
function trace(label: string, ms: number) {
  const end = performance.now() + ms;
  const rows: unknown[] = [];
  const tick = () => {
    const p = me.body?.position;
    const a = read().reward.arrival;
    rows.push({
      t: Math.round(performance.now()),
      x: p && +p.x.toFixed(2),
      z: p && +p.z.toFixed(2),
      held: inputState.held,
      card: read().reward.showing,
      mark: a.mark,
      flourishes: a.flourishes,
      late: a.late,
    });
    if (performance.now() < end) setTimeout(tick, 100);
    else console.log(`COOP TRACE ${label} ${JSON.stringify(rows)}`);
  };
  tick();
}

async function friend() {
  const bot = makeBot({ doneFlag: '__coopFriendDone' });
  await until(landed, 'friend arrived and landed');
  const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { flourishes: number } | null;
  if (!saved) check(!read().jump, 'the jump is not found yet');
  if (shot === 'unlock') {
    await until(() => finderAtDevice(10), 'finder reached the device');
    trace('unlock', 9000);
    w.__coopShot = true;
    // Walking on through it, towards the device: the follow camera looks at its shaft.
    void bot.straight(DEVICE.x, DEVICE.z, 3, 12000);
    await until(() => read().jump, 'friend sees the unlock');
    await until(() => read().reward.arrival.flourishes === 1, 'friend flourish played');
    check(!read().reward.showing && !inputState.held, 'no card and no hold for a friend');
    return;
  }
  if (shot === 'late') {
    await until(() => finderAtDevice(30), 'finder nearing the device');
    net.room!.pause(10 * 60_000); // gone for the find
    await until(() => !read().ready, 'friend offline');
    await wait(40000); // the finder takes it and plays on meanwhile (game time)
    trace('late', 9000);
    w.__coopShot = true;
    net.room!.pause(0); // back
    await until(() => read().ready && read().jump, 'reconnected to a world that has the jump');
    await until(() => read().reward.arrival.late === 1, 'late flourish on landing');
    check(!read().reward.showing && !inputState.held, 'no card and no hold for a late friend');
    return;
  }
  // alone / together: the find happens while the friend is idle; then the plinth.
  if (!saved) {
    await until(() => read().jump && read().reward.arrival.flourishes === 1, 'friend got the flourish');
    if (shot === 'alone') {
      // A reload: what this player has been shown is this browser's, so the flourish does not play again.
      await wait(3000);
      sessionStorage.setItem(KEY, JSON.stringify({ flourishes: read().reward.arrival.flourishes }));
      location.reload();
      return;
    }
  } else {
    await wait(4000);
    const a = read().reward.arrival;
    check(read().jump && a.flourishes === 0 && a.seen.includes('jump'), 'no second flourish after a reload');
  }
  const plinth = read().reward.plinth;
  if (shot === 'alone') {
    check(await bot.walk(plinth.x, plinth.z + 11, 1.5), 'friend walked to the village bay');
    w.__coopShot = true;
    await wait(200);
    await bot.straight(plinth.x, plinth.z + 2.5, 0.8, 8000);
    await until(() => read().reward.plinth.shows === 1, 'small plinth show alone');
    check(read().reward.plinth.together === 0, 'alone is the small show');
    return;
  }
  check(await bot.walk(plinth.x - 1, plinth.z + 11, 1.5), 'friend walked to the village bay');
  await until(() => {
    const p = other();
    return !!p && Math.hypot(p.x - (plinth.x + 1), p.z - (plinth.z + 11)) < 2;
  }, 'finder beside the friend');
  w.__coopShot = true;
  await wait(200);
  await bot.straight(plinth.x - 0.8, plinth.z + 2.6, 0.8, 8000);
  await until(() => read().reward.plinth.shows === 1, 'friend plinth show');
  check(read().reward.plinth.together === 1, 'arriving together is the bigger show');
}

async function find() {
  background(play({ solo: true }), 'finder solo route');
  if (shot !== 'alone' && shot !== 'together') return;
  // The bot stops after its jump demonstration (&railStop=optional jump used); for `together`, the finder is then
  // put beside the village and walks up with the friend.
  await until(() => (window as Window & { __railStop?: string }).__railStop === 'optional jump used', 'finder done');
  if (shot !== 'together') return;
  const plinth = read().reward.plinth;
  const bot = makeBot({ doneFlag: '__coopFinderDone' });
  teleport(me.body!, plinth.x + 1, plinth.y + PLAYER_R + 0.6, plinth.z + 14);
  me.body!.velocity.set(0, 0, 0);
  await until(landed, 'finder placed by the village');
  input.keys.clear();
  releaseJump();
  check(await bot.straight(plinth.x + 1, plinth.z + 11, 0.8, 6000), 'finder beside the friend');
  await until(() => (other()?.z ?? Infinity) < plinth.z + 10.4, 'friend set off', 60000);
  await bot.straight(plinth.x + 0.8, plinth.z + 2.6, 0.8, 8000);
  await until(() => read().reward.plinth.shows === 1, 'finder plinth show');
  check(read().reward.plinth.together === 1, 'the finder sees the crowd, not a card');
  check(!read().reward.showing, 'no second card at the plinth');
}

export function start() {
  if (started) return;
  started = true;
  background(finder ? find() : friend(), `coop-unlock ${finder ? 'finder' : 'friend'} ${shot}`);
}
