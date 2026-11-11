// Co-op abilities, option E captures (docs/brainstorms/coop-abilities.md, "Done means"), on the production railway.
// Two pages: player 2 is the finder, playing the ordinary solo route with real inputs up to the double jump; player 1
// is a friend this file drives. &coopShot= picks the moment the capture stops warping at (window.__coopShot):
//   multi     the friend is walking about as the finder wakes the track layer: the multi-axe flourish, no card
//   axe       the same at the forge as the finder opens the proper axe chest (the whole route to there first)
//   unlock    the friend walks towards the device as the finder takes it: flourish, no card, shaft flare
//   late      the friend is offline for the find and reconnects in the capture: their own flourish on landing
//   alone     the friend gets the live flourish, drops and rejoins (none plays again), then passes the Home plinth
//             alone: the small show
//   together  both walk up to the plinth side by side: the bigger show, from both tabs
// The finder is placed beside the village for `together` (a harness pose, as look --at does); nothing seeds the world.
// npm run look -- --players 2 --eval dev/look/evals/coop-unlock.ts --query 'shot=play&coopShot=unlock&cardMs=20000'
//   --until "(import('/dev/look/bots/coop-unlock.ts').then((m) => m.start()), window.__coopShot || location.search.includes('player=2'))" --seconds 6 --video
// (alone and together add &railStop=optional%20jump%20used, so the finder stops after its jump demonstration)
import { background } from '../../../src/async.ts';
import { inspectRailway, rail, railAt, railPhase, railRead, rw } from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { inputState } from '../../../src/player/input-state.ts';
import { input } from '../../../src/player/input.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
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
const DEVICE = { x: LINE1_JUMP_DEVICE.x / 100, y: LINE1_JUMP_DEVICE.y / 100, z: LINE1_JUMP_DEVICE.z / 100 };
const w = window as Window & { __coopShot?: boolean };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let started = false;

/** The view's and the session's own fields: the reward, the machine, the scene. */
function read() {
  const state = inspectRailway();
  if (!state) throw new Error('Missing railway view');
  return state;
}
// The room's facts are rows, read now (a published world is never written, so none is held across an await).
const ready = () => !!railRead()?.ready();
const found = () => rail(rw()).jump;
const axeFound = () => rail(rw()).axe;
const phase = () => railPhase(rw(), railAt(), railAt());
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
/** &plinthCam=1: both tabs frame the Home plinth from the same fixed camera (each still draws its own show). */
function plinthCam(plinth: { x: number; y: number; z: number }) {
  if (query.get('plinthCam') !== '1') return;
  window.__debugCam?.set(
    [plinth.x + 6.5, plinth.y + 3.4, plinth.z + 8],
    [plinth.x - 0.4, plinth.y + 1, plinth.z + 1.6],
    55,
  );
}
const landed = () => !!me.body && !fallArrival.active && me.coyote > 0 && !me.swimming && ready();
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
      air: me.coyote <= 0,
      vy: me.body && +me.body.velocity.y.toFixed(2),
      jumps: read().reward.tools.jumps,
      teach: a.teaching,
      badge: a.badge?.map((n) => +n.toFixed(2)),
      flourishes: a.keys.join(),
      late: a.late,
    });
    if (performance.now() < end) setTimeout(tick, 100);
    else console.log(`COOP TRACE ${label} ${JSON.stringify(rows)}`);
  };
  tick();
}

/** The finder's earlier tool unlocks (the multi-axe at the wake, the proper axe) are the finder's card alone: a friend
 * is never shown one, nor held, so this fails the run if a card ever comes up for them. */
async function noCards(until: () => unknown) {
  while (!until()) {
    if (read().reward.showing) throw new Error('COOP FAIL a card stopped the friend for someone else’s find');
    await wait(50);
  }
}

async function friend() {
  const bot = makeBot({ doneFlag: '__coopFriendDone' });
  await until(landed, 'friend arrived and landed');
  background(
    noCards(() => (shot === 'axe' ? axeFound() : found())),
    'friend is never shown a card',
  );
  // Out of the finder's way: both arrive at the same spot, and the route starts from it.
  const p = me.body!.position;
  const away = Math.hypot(DEVICE.x - p.x, DEVICE.z - p.z);
  await bot.walk(p.x - ((DEVICE.x - p.x) / away) * 9, p.z - ((DEVICE.z - p.z) / away) * 9, 2, { limit: 15000 });
  console.log('COOP NOTE friend stepped aside');
  check(!found(), 'the jump is not found yet');
  if (shot === 'multi' || shot === 'axe') {
    // The friend walks about near where the finder works, hopping now and then: held input would show.
    const awake = () => {
      const now = phase();
      return rail(rw()).awake >= 0 && now !== 'asleep' && now !== 'waking';
    };
    const key = shot === 'multi' ? 'multi-axe' : 'axe';
    const has = () => (shot === 'multi' ? awake() : axeFound());
    const near = () => {
      const p = other();
      const target = shot === 'multi' ? read().machine : read().reward.axeChest;
      return !!p && Math.hypot(p.x - target.x, p.z - target.z) < (shot === 'axe' ? 2.6 : 6);
    };
    // Stand within sight of it before the finder gets there, so the capture frames the friend as the flourish plays.
    const spot = shot === 'multi' ? read().machine : read().reward.axeChest;
    await bot.walk(spot.x, spot.z, 8, { limit: 600000 });
    // The chest is only there once the forge is lit: the finder walking past the forge earlier is no moment.
    await until(() => near() && (shot === 'multi' || read().reward.axeChest.available), 'finder reached it', 3000000);
    check(!has(), 'not unlocked yet');
    // The wake takes a few seconds after the press and the flourish comes as it ends: the capture starts at the press.
    if (shot === 'multi') await until(() => phase() === 'waking' || awake(), 'finder pressed wake', 60000);
    trace(shot, 9000);
    w.__coopShot = true;
    const target = shot === 'multi' ? read().machine : read().reward.axeChest;
    void bot.straight(target.x, target.z, 7, 12000);
    const hops = (async () => {
      for (let k = 0; k < 6; k++) {
        pressJump();
        await wait(140);
        releaseJump();
        await wait(1200);
      }
    })();
    await until(has, `friend sees the ${key} unlock`);
    check(!read().reward.showing && !inputState.held, `no card and no hold at the ${key} unlock`);
    await until(() => read().reward.arrival.keys.includes(key), `friend ${key} flourish played`);
    check(!read().reward.showing && !inputState.held, `no card and no hold after the ${key} flourish`);
    await hops;
    check(read().reward.arrival.keys.filter((k) => k === key).length === 1, `one ${key} flourish`);
    return;
  }
  if (shot === 'unlock') {
    await until(() => finderAtDevice(10), 'finder reached the device');
    trace('unlock', 5500);
    w.__coopShot = true;
    // Walking on through it, towards the device (the follow camera looks at its shaft), hopping as they go: an
    // unlock that lands mid-hop shows the mark hollow and never adds a jump to that flight.
    void bot.straight(DEVICE.x, DEVICE.z, 3, 12000);
    const hops = (async () => {
      for (let k = 0; k < 7; k++) {
        pressJump();
        await wait(140);
        releaseJump();
        await wait(160);
        pressJump(); // a second press in the same flight: only spends an air jump if one is really there
        await wait(100);
        releaseJump();
        await wait(500);
      }
    })();
    await until(() => found(), 'friend sees the unlock');
    const airborne = me.coyote <= 0;
    const jumps = read().reward.tools.jumps;
    await until(() => read().reward.arrival.flourishes === 1, 'friend flourish played');
    check(!read().reward.showing && !inputState.held, 'no card and no hold for a friend');
    console.log(`COOP NOTE unlock arrived ${airborne ? 'mid-air' : 'on the ground'}; air jumps before ${jumps}`);
    await hops;
    return;
  }
  if (shot === 'late') {
    await until(() => finderAtDevice(10), 'finder reached the device');
    // Gone for the find: the finder takes it and plays on meanwhile (game time); the room reconnects by itself after.
    net.room!.pause(40000);
    await until(() => !ready(), 'friend offline');
    await wait(30000);
    // Held up in the air while reconnecting (a harness pose), so the capture sees their first landing after it:
    // the flourish waits for that.
    const ground = me.body!.position.y;
    while (!ready()) {
      if (me.body!.position.y < ground + 6) {
        const p = me.body!.position;
        teleport(me.body!, p.x, ground + 12, p.z);
        me.body!.velocity.set(0, 0, 0);
      }
      await wait(30);
    }
    trace('late', 7500);
    w.__coopShot = true;
    await until(() => ready() && found(), 'reconnected to a world that has the jump');
    check(read().reward.arrival.late === 0 || me.coyote > 0, 'nothing plays in the air');
    await until(() => read().reward.arrival.late === 1, 'late flourish on landing');
    check(!read().reward.showing && !inputState.held, 'no card and no hold for a late friend');
    // The first jump since: the mark pulses at its top with the Jump glyph; a second press spends the air jump.
    await wait(900);
    const hop = async () => {
      await until(() => me.coyote > 0, 'grounded before a hop', 5000);
      pressJump();
      await until(() => me.body!.velocity.y > 1, 'hop leaves the ground', 3000);
      releaseJump();
      await until(() => me.body!.velocity.y < 0.5, 'top of the hop', 3000);
      await wait(120);
    };
    await hop();
    check(read().reward.arrival.teaching && read().reward.arrival.teaches === 1, 'first jump pulses the mark, once');
    pressJump();
    await wait(120);
    releaseJump();
    await until(() => read().reward.tools.second, 'the air jump spent');
    await until(() => me.coyote > 0, 'landed', 5000);
    await hop();
    check(read().reward.arrival.teaches === 1 && !read().reward.arrival.teaching, 'the next jump has no pulse');
    await wait(1500);
    check(read().reward.arrival.flourishes === 1, `one flourish in all (${read().reward.arrival.keys.join()})`);
    return;
  }
  // alone / together: the find happens while the friend is idle; then the plinth.
  await until(() => found() && read().reward.arrival.flourishes === 1, 'friend got the flourish');
  if (shot === 'alone') {
    // What this player has been shown is this browser's: a rejoin rebuilds the world with no event, and the record a
    // reload would read already holds the jump, so nothing plays again. (A real reload would stop the two-player warp.)
    const record = Object.keys(localStorage).find((k) => k.startsWith('boogle.railway-seen.v0:'));
    check(record && (JSON.parse(localStorage.getItem(record)!) as string[]).includes('jump'), 'the record keeps it');
    net.room!.pause(2000);
    await until(() => !ready(), 'friend dropped');
    await until(() => ready() && found(), 'friend rejoined');
    await until(landed, 'landed after the rejoin');
    await wait(4000);
    check(read().reward.arrival.flourishes === 1, 'no second flourish after a rejoin');
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
  plinthCam(plinth);
  w.__coopShot = true;
  await wait(200);
  await bot.straight(plinth.x - 0.8, plinth.z + 2.6, 0.8, 8000);
  await until(() => read().reward.plinth.shows === 1, 'friend plinth show');
  check(read().reward.plinth.together === 1, 'arriving together is the bigger show');
}

async function find() {
  // The route starts where both arrive: wait for the friend to step aside.
  await until(landed, 'finder arrived and landed');
  await until(() => {
    const p = other();
    return !!p && Math.hypot(p.x - me.body!.position.x, p.z - me.body!.position.z) > 6;
  }, 'friend out of the way');
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
  plinthCam(plinth);
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
