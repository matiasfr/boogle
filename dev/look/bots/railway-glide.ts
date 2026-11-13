// The glider on Needle Bell's summit (docs/brainstorms/glider-placement.md). Two rooms:
// - `--rail-seed glide-earned`, where the room has taken the glider: the setup stands you on the summit (staging only)
//   and the flight is piece A's, by real input: walk off, Jump spends the air jump, Jump again opens the canopy, Glide
//   closes and reopens it, Jump while open does nothing.
// - `--rail-seed q5-done --query glideTake=1` (piece B's grant): the setup stands you 2.5 m east of the woken device,
//   facing it (staging only); the flight presses Interact to take it, dismisses the card, steps off west and flies to
//   the boiler's apron by the forge as the bot's glide home does, writing `__glideResult`.
import { hideBotNotes as hideNotes, makeBot } from '../bot.ts';
import { glideToBoiler, takeGlider } from './railway.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { inspectRailway, rail, railRead, rw } from '../rail-read.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { background } from '../../../src/async.ts';

const SUMMIT = { x: 1015, y: 102.4, z: -6 }; // tech-layout's summit pad (x + ORIGIN.x)
const page = window as Window & { __placeDone?: boolean; __glideResult?: unknown };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(ok: () => boolean, what: string, ms: number) {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() > end) throw new Error(`GLIDE timed out: ${what}`);
    await wait(20);
  }
}
const glider = () => inspectRailway()!.glider;
const query = new URLSearchParams(location.search);
const taking = query.get('glideTake') === '1';
/** Heading -x: off the summit towards the village, the forge and the line. */
const face = (pitch = -0.12) => {
  cam.yaw = me.yaw = Math.PI / 2;
  cam.pitch = pitch;
};

export async function stage() {
  await until(() => !!railRead()?.ready() && !!me.body, 'railway ready', 60000);
  // With --players 2 the second stands a little apart, so each flies beside the other.
  const side = query.get('player') === '2' ? 2.5 : -1;
  if (taking) {
    const device = inspectRailway()!.line2View.glideDevice;
    if (rail(rw()).glide || !device.available || !device.woken)
      throw new Error(`GLIDE glideTake=1 needs a woken, untaken device (q5-done): ${JSON.stringify(device)}`);
    teleport(me.body!, device.x + 2.5, device.y + PLAYER_R + 0.2, device.z + (side > 0 ? side : 0));
    me.body!.velocity.set(0, 0, 0);
    face();
    await wait(800);
    hideNotes();
    console.log(`GLIDE staged by the device ${JSON.stringify(device)}`);
    page.__placeDone = true;
    if (side > 0) background(watchTake(), "player 2 watches the leader's take");
    return;
  }
  if (!rail(rw()).glide)
    throw new Error('GLIDE the room has not taken the glider: use --rail-seed glide-earned, or glideTake=1');
  await until(() => glider().owned, 'glider owned within 2 s', 2000);
  const s = inspectRailway()!;
  if (!s.line2View.glideDevice.taken) throw new Error('GLIDE the summit device does not read taken');
  if (s.reward.showing) throw new Error('GLIDE a restored glider played its card');
  teleport(me.body!, SUMMIT.x + 2.5, SUMMIT.y + PLAYER_R + 0.2, SUMMIT.z + side);
  me.body!.velocity.set(0, 0, 0);
  face();
  await wait(800);
  if (glider().rolls < 1) throw new Error('GLIDE no folded roll on your back');
  if (inspectRailway()!.reward.showing) throw new Error('GLIDE a restored glider played its card');
  hideNotes();
  console.log(`GLIDE staged ${JSON.stringify(glider())}`);
  page.__placeDone = true;
  if (side > 0) background(watchPartner(), 'player 2 watches the leader glide');
}

/** glideTake=1, player 2: the leader's take reaches you as the flourish (no card) and the roll on your back. */
async function watchTake() {
  await until(() => rail(rw()).glide, "the leader's take reaches player 2", 90000);
  await wait(1500);
  const s = inspectRailway()!;
  const seen = {
    flourish: s.reward.arrival.seen.includes('glide'),
    card: s.reward.showing,
    owned: s.glider.owned,
    rolls: s.glider.rolls,
  };
  console.log(`GLIDE partner take ${JSON.stringify(seen)}`);
  if (!seen.flourish || seen.card || !seen.owned) console.error(`GLIDE partner take wrong: ${JSON.stringify(seen)}`);
  await watchPartner();
}

/** Player 2 stays on the summit, looking out after the leader, and reports their canopy from presence railwayGlide. */
async function watchPartner() {
  window.__debugCam?.clear();
  const end = performance.now() + 90000;
  let seen = 0;
  while (performance.now() < end) {
    face(-0.32);
    const g = glider();
    if (!g.open && g.canopies > seen) {
      seen = g.canopies;
      console.log(`GLIDE partner canopy seen ${JSON.stringify(g)}`);
    }
    await wait(100);
  }
  if (!seen) console.error('GLIDE player 2 never saw the leader open a canopy');
}

/** glideTake=1: Interact on the device, the card, then the glide home to the boiler's apron. */
async function takeAndGlide() {
  window.__debugCam?.clear();
  const bot = makeBot({
    recover: () => {
      throw new Error('GLIDE the take requested recovery');
    },
  });
  hideNotes();
  const { card } = await takeGlider(bot);
  const r = await glideToBoiler(bot);
  page.__glideResult = {
    seconds: r.seconds,
    sinkMean: r.sinkMean,
    speedMax: r.speedMax,
    landing: { x: r.landing.x, z: r.landing.z, dry: r.landing.dry, toPedestal: r.landing.toPedestal },
    card,
    flights: r.flights,
    released: r.released,
  };
  console.log(`GLIDE result ${JSON.stringify(page.__glideResult)}`);
}

export async function fly() {
  if (taking) return takeAndGlide();
  window.__debugCam?.clear();
  face();
  const b = me.body!;
  input.keys.add('KeyW');
  try {
    await until(() => me.coyote <= 0, 'walk off the summit', 5000);
    await wait(150);
    const opensBefore = glider().jumpOpens;
    if (rail(rw()).jump) {
      // The first Jump in the air is the air jump: the canopy waits for it.
      const jumps = inspectRailway()!.reward.tools.jumps;
      pressJump();
      await until(() => inspectRailway()!.reward.tools.jumps === jumps + 1, 'air jump first', 1000);
      releaseJump();
      if (glider().open) throw new Error('GLIDE the air jump opened the canopy');
      await wait(450);
    }
    const pressed = performance.now();
    pressJump();
    await until(() => glider().open, 'Jump opens the canopy', 1000);
    releaseJump();
    const deployMs = performance.now() - pressed;
    face(-0.5); // look down over Home while it holds you
    if (glider().jumpOpens !== opensBefore + 1) throw new Error('GLIDE canopy opened by something other than Jump');
    const top = b.position.y;
    await wait(1500);
    // Full stick, settled: the numbers the brief asks for.
    const samples: { sink: number; speed: number }[] = [];
    for (let k = 0; k < 10; k++) {
      samples.push({ sink: -b.velocity.y, speed: Math.hypot(b.velocity.x, b.velocity.z) });
      await wait(100);
    }
    const sink = samples.reduce((a, s) => a + s.sink, 0) / samples.length,
      speed = samples.reduce((a, s) => a + s.speed, 0) / samples.length;
    const { camDist, canopies, rolls } = glider();
    // Jump while it's open does nothing.
    pressJump();
    await wait(120);
    releaseJump();
    if (!glider().open) throw new Error('GLIDE Jump closed the open canopy');
    // Glide closes it and reopens it (stop and reopen).
    triggerAction('glide', 'down');
    triggerAction('glide', 'up');
    if (glider().open) throw new Error('GLIDE the Glide action did not close it');
    await wait(400);
    triggerAction('glide', 'down');
    triggerAction('glide', 'up');
    if (!glider().open) throw new Error('GLIDE the Glide action did not reopen it');
    const result = {
      deployMs: Math.round(deployMs),
      sink: +sink.toFixed(2),
      speed: +speed.toFixed(2),
      camDist: camDist === null ? null : +camDist.toFixed(2),
      // Every open canopy this tab draws: its own, plus a partner's from presence railwayGlide.
      canopies,
      rolls,
      from: +top.toFixed(1),
    };
    console.log(`GLIDE flight ${JSON.stringify(result)}`);
    const ok =
      Math.abs(result.sink - 3.2) <= 0.3 &&
      Math.abs(result.speed - 10) <= 0.5 &&
      result.camDist !== null &&
      Math.abs(result.camDist - 5.2) < 0.15;
    if (!ok) throw new Error(`GLIDE numbers off: ${JSON.stringify(result)}`);
    const start = performance.now();
    // Over the village by now: let go of the stick and the canopy brakes and sinks you onto dry ground below.
    await wait(Math.max(0, pressed + 12000 - performance.now()));
    input.keys.delete('KeyW');
    await until(() => me.coyote > 0 || me.swimming, 'landing', 40000);
    await wait(200);
    const landed = {
      seconds: +((performance.now() - start) / 1000).toFixed(1),
      at: [b.position.x, b.position.y, b.position.z].map((n) => +n.toFixed(1)),
      swimming: me.swimming,
      open: glider().open,
    };
    console.log(`GLIDE landed ${JSON.stringify(landed)}`);
    if (landed.open) throw new Error('GLIDE canopy still open on the ground');
    if (landed.swimming) throw new Error('GLIDE the first flight ended in the sea');
    page.__glideResult = { ...result, landed };
  } finally {
    input.keys.delete('KeyW');
    releaseJump();
  }
}
