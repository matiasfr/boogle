// Production line 1 through ordinary inputs. Inspection observes; it never seeds a world or moves a player.
import { makeBot, type Bot } from '../bot.ts';
import * as R from '../rail-read.ts';
import { inspectRailway, hookWhyNot, type RailwayViewInspection } from '../../../src/entities/railway/state.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { background } from '../../../src/async.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { carry } from '../../../src/physics/platforms.ts';
import { playMark } from '../../../src/proto/mark.ts';
import {
  LINE1_STATIONS,
  LINE1_GREAT_TREE,
  LINE1_INITIAL,
  LINE1_RAIL_PAIRS,
  LINE1_ROCKS,
  linePanels,
} from '../../../src/sim/railway-line-layout.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { CART_PHASE } from '../../../src/sim/railway-cart.ts';
import { fallArrival } from '../../../src/fall/arrival.ts';
import { net, onRemotePresence, remotes } from '../../../src/netplay/net.ts';
import { RAIL_STOPS } from '../segments.ts';
import { RAIL_STONE } from '../../../src/sim/railway-works-layout.ts';
import { splitRockToCrossing } from './railway-works.ts';
export { splitRockToCrossing };
import { LINE2_BOILER } from '../../../src/sim/railway-line2-layout.ts';

/** `?botTo=<stop>` ends the route after that beat: a segment, not a failure. */
class RouteStop extends Error {}

function hookCheck(bot: Bot, ok: unknown, label: string) {
  bot.check(label, ok);
  if (!ok) throw new Error(label);
}
function hookRing(id: string) {
  const ring = inspectRailway()?.hookShot.rings.find((r) => r.id === id);
  if (!ring) throw new Error(`Missing production hook ring ${id}`);
  return ring;
}
export function aimHook(id: string) {
  const r = hookRing(id),
    p = me.body!.position;
  const d = Math.hypot(r.x - p.x, r.z - p.z);
  cam.yaw = me.yaw = Math.atan2(-(r.x - p.x), -(r.z - p.z));
  cam.pitch = Math.min(0.85, Math.atan2(r.y - p.y - 1.35, d) - 0.3);
}
async function hookLanding(bot: Bot, id: string) {
  const { PADS } = await import('../../../src/place/tech-layout.ts');
  const pad = PADS.find((p) => p.id === id)!;
  hookCheck(
    bot,
    await bot.until(
      () => {
        const p = me.body!.position;
        return (
          !inspectRailway()!.hookShot.pulling &&
          me.coyote > 0 &&
          !me.swimming &&
          Math.abs(p.y - PLAYER_R - pad.top) < 1 &&
          Math.hypot(p.x - pad.x - 1000, p.z - pad.z) < 4
        );
      },
      6000,
      `dry hook landing ${id}`,
    ),
    `hook landed on ${id}`,
  );
}
export async function hookTo(bot: Bot, id: string) {
  aimHook(id);
  hookCheck(
    bot,
    await bot.until(() => inspectRailway()?.hookShot.pick === id, 3500, `picked hook ${id}`),
    `hook ${id}: picked ${inspectRailway()?.hookShot.pick ?? 'nothing'}, ${hookWhyNot(id)}`,
  );
  hookCheck(bot, hookWhyNot(id) === 'nothing', `hook ${id} path is clear: ${hookWhyNot(id)}`);
  const before = inspectRailway()!.hookShot.pulls;
  triggerAction('hook', 'down');
  triggerAction('hook', 'up');
  hookCheck(bot, inspectRailway()!.hookShot.pulls === before + 1, `hook ${id} starts on the press`);
  await hookLanding(bot, id);
  bot.note(`hook: ${id}`);
}
export async function returnFromTower(bot: Bot, ids = ['t5', 't4', 't3', 't2', 't1', 't0', 'p2']) {
  const body = me.body!;
  for (const id of ids) {
    const departureY = body.position.y,
      started = performance.now();
    let clear = false;
    try {
      while (performance.now() - started < 3500) {
        aimHook(id);
        if (
          body.position.y < departureY - 1.5 &&
          inspectRailway()?.hookShot.pick === id &&
          hookWhyNot(id) === 'nothing'
        ) {
          clear = true;
          break;
        }
        input.keys.add('KeyW');
        await bot.wait(30);
      }
    } finally {
      input.keys.delete('KeyW');
    }
    hookCheck(bot, clear, `return hook ${id}: ${hookWhyNot(id)}`);
    triggerAction('hook', 'down');
    triggerAction('hook', 'up');
    await hookLanding(bot, id);
    bot.note(`return hook: ${id}`);
  }
  cam.pitch = -0.1;
}

/** The original p2 approach; the first visit pauses here to take the device and play its demo. */
async function approachNeedleBell(bot: Bot) {
  const view = inspectRailway()!.line2View;
  let lowest = Infinity;
  for (const [x, y, z] of view.routePoints.hook) {
    hookCheck(bot, await bot.straight(x!, z!, 0.6, 10000), 'walked the hook walkway');
    hookCheck(
      bot,
      await bot.until(() => me.coyote > 0 && !me.swimming, 5000, 'walkway supports the walker'),
      'walkway supports the walker',
    );
    lowest = Math.min(lowest, me.body!.position.y - PLAYER_R - y!);
  }
  hookCheck(bot, lowest > -0.25, `hook walkway has no dip (${lowest.toFixed(2)} m)`);
}

async function climbNeedleBell(bot: Bot, onRing?: (id: string) => Promise<void>) {
  // With no demo on a repeat visit, reach p2 by the same walkway and pull to t0 yourself.
  if (!onRing) {
    await approachNeedleBell(bot);
    await hookTo(bot, 't0');
  }
  for (const id of ['t1', 't2', 't3', 't4', 't5', 'summit']) {
    await hookTo(bot, id);
    await onRing?.(id);
  }
  hookCheck(
    bot,
    Math.abs(me.body!.position.y - PLAYER_R - 102.4) < 1 && me.coyote > 0,
    'standing on Needle Bell summit',
  );
}

async function downFromNeedleBell(bot: Bot, noJump: (beat: string) => void) {
  await returnFromTower(bot);
  noJump('hook descent');
  const back = inspectRailway()!.line2View.routePoints.hook;
  for (let i = back.length - 1; i >= 0; i--)
    hookCheck(bot, await bot.straight(back[i]![0]!, back[i]![2]!, 0.6, 10000), 'walked back down the walkway');
  noJump('hook walk return');
}

// B's pinned Local inspection contract. Optional until that parallel job merges; never invent its observations.
type B4View = {
  sea?: { x: number; y: number; z: number; pulled: boolean };
  seaGateSolid?: boolean;
  farHead?: { x: number; y: number; z: number };
  trestleLamps?: number;
};
type B4Route = {
  bot: Bot;
  checkpoint: (name: string) => Promise<void>;
  walkQuarry?: (from: number, to: number) => Promise<void>;
  quarryFrom?: number;
};

async function walkQuarryRail(bot: Bot, from: number, to: number) {
  const { LINKS, ORIGIN, lineAt, railY } = await import('../../../src/place/layout.ts');
  const { besideLine } = await import('../../../src/entities/railway/rail-kit.ts');
  const direction = Math.sign(to - from);
  if (from === 546 && direction < 0) {
    for (const [along, side] of [
      [546, 4.5],
      [540, 4.5],
      [535, 4.5],
      [532, 0],
    ] as const) {
      const p = besideLine(LINKS[1]!.line, along, side);
      hookCheck(bot, await bot.straight(p.x, p.z, 0.5, 12000), 'walked home around the Far Head machine');
      hookCheck(bot, await bot.until(() => me.coyote > 0 && !me.swimming, 5000), 'home bypass stays supported');
    }
    return walkQuarryRail(bot, 532, to);
  }
  for (let s = from; direction * (to - s) >= 0; s += direction * 3) {
    if (from === 286 && s >= 535) {
      // On Far Head's broad ground, round the solid parked machine rather than walking into its rear.
      for (const [along, side] of [
        [535, 4.5],
        [540, 4.5],
        [546, 4.5],
        [546, 0],
      ] as const) {
        const p = besideLine(LINKS[1]!.line, along, side);
        hookCheck(bot, await bot.straight(p.x, p.z, 0.5, 12000), 'walked around the Far Head machine');
        hookCheck(bot, await bot.until(() => me.coyote > 0 && !me.swimming, 5000), 'Far Head bypass stays supported');
      }
      return;
    }
    // Q6's parked machine occupies the last centre metres. Hop its low passenger deck with ordinary Jump.
    const pierMachine = from === 546 && direction > 0 && s >= 735;
    const point = lineAt(LINKS[1]!.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    if (pierMachine) pressJump();
    try {
      hookCheck(
        bot,
        await bot.straight(point.x + ORIGIN.x, point.z, 0.5, 12000),
        `walked quarry rail at ${s.toFixed(0)} m`,
      );
    } finally {
      if (pierMachine) releaseJump();
    }
    hookCheck(
      bot,
      await bot.until(() => me.coyote > 0 && !me.swimming, 5000, 'quarry track supports the walker'),
      'quarry track supports the walker',
    );
    if (from === 286 && direction > 0) {
      for (const [seam, side] of [
        [351, 0],
        [351, 1],
        [416, -1],
        [481, -1],
      ] as const) {
        if (seam < s || seam >= s + 3) continue;
        let lowest = Infinity;
        for (let along = seam - 2; along <= seam + 2; along += 0.5) {
          const p = besideLine(LINKS[1]!.line, along, side);
          hookCheck(bot, await bot.straight(p.x, p.z, 0.15, 6000), `walked seam ${seam} side ${side}`);
          await bot.wait(60);
          lowest = Math.min(lowest, me.body!.position.y - PLAYER_R - railY(LINKS[1]!.line, along));
          hookCheck(bot, !me.swimming && lowest > -0.25, `seam ${seam} side ${side} has no fall-through`);
        }
        bot.note(`trestle seam ${seam} side ${side}: no fall-through, lowest ${lowest.toFixed(3)} m`);
      }
    }
  }
}

/** Real inputs only, shared by the production route and the two accepted-state seeded half-runs. */
export async function seaToFarHead(
  { bot, checkpoint, walkQuarry = (a, b) => walkQuarryRail(bot, a, b), quarryFrom = 10 }: B4Route,
  from: 'sea' | 'q5' = 'sea',
) {
  const read = () => inspectRailway()!;
  const view = () => read().line2View as RailwayViewInspection['line2View'] & B4View;
  const check = (ok: unknown, beat: string) => hookCheck(bot, ok, beat);
  const until = async (fn: () => unknown, beat: string, ms = 600000) => check(await bot.until(fn, ms, beat), beat);
  const walk = async (x: number, z: number, radius = 2.4) =>
    check(await bot.walk(x, z, radius), `B4 walked to ${x.toFixed(1)}, ${z.toFixed(1)} without recovery`);
  check(
    view().sea && typeof view().seaGateSolid === 'boolean' && view().farHead && typeof view().trestleLamps === 'number',
    'B4 Local views missing: line2View.sea, seaGateSolid, farHead, trestleLamps (job B required)',
  );
  check(R.line2Station(3).completion === 1, 'B4 starts with Q4 laid');
  if (from === 'sea') {
    const { LINKS, ORIGIN, lineAt } = await import('../../../src/place/layout.ts');
    const deck = lineAt(LINKS[1]!.line, quarryFrom, { x: 0, z: 0, ux: 0, uz: 1 });
    await walk(deck.x + ORIGIN.x, deck.z, 1);
    await walkQuarry(quarryFrom, 92);
    const jumps = read().reward.tools.jumps;
    await climbNeedleBell(bot);
    const sea = view().sea!;
    await walk(sea.x, sea.z, 0.8);
    await until(() => interactTarget()?.id === 'railway-sea-switch', 'summit offers railway-sea-switch', 5000);
    check(await bot.use(sea.x, sea.z, 'pull sea switch', /^Pull$/), 'sea switch offered');
    check(await bot.work(() => R.line2SeaOpen(R.rw()), 5000, 380), 'sea switch accepted');
    await until(() => R.line2SeaOpen(R.rw()) && !view().seaGateSolid, 'sea gate collider removed');
    await checkpoint('sea gate');
    await downFromNeedleBell(bot, (beat) =>
      check(read().reward.tools.jumps === jumps, `${beat} needed no extra air jump`),
    );
  }
  check(R.line2SeaOpen(R.rw()), 'Q5 seed or summit pull opens the sea gate');
  const q5 = view().frames[4]!;
  check(q5, 'Q5 frame exists');
  const { LINKS, ORIGIN, lineAt } = await import('../../../src/place/layout.ts');
  {
    // Always use the laid track: the general terrain planner can falsely connect the gorge banks.
    const entry = from === 'sea' ? 84 : quarryFrom;
    const start = lineAt(LINKS[1]!.line, entry, { x: 0, z: 0, ux: 0, uz: 1 });
    await walk(start.x + ORIGIN.x, start.z, 1);
    const home = [CART_PHASE.HOME, CART_PHASE.REST, CART_PHASE.LOAD] as number[];
    await until(() => home.includes(R.cart(R.rw()).phase), 'the cart is off the quarry track');
    await walkQuarry(entry, 274);
    const off = lineAt(LINKS[1]!.line, 274, { x: 0, z: 0, ux: 0, uz: 1 });
    const x = off.x + ORIGIN.x;
    const side = Math.sign(-off.uz * (q5.x - x) + off.ux * (q5.z - off.z)) || 1;
    check(
      await bot.straight(x - off.uz * side * 4.5, off.z + off.ux * side * 4.5, 0.6, 8000),
      'stepped off the track beside Q5',
    );
  }
  await walk(q5.x, q5.z);
  const job = () => R.line2Station(4);
  const deliver = async () => {
    await walk(q5.x, q5.z);
    await until(
      () => (R.railBack().carry === 0 && R.railBack().rails === 0 && read().pending === 0) || job().start >= 0,
      'Q5 frame unloads automatically',
      30000,
    );
  };
  for (let trip = 0; job().start < 0; trip++) {
    check(trip < 8, 'Q5 funds in bounded depot trips');
    const seen = new Set<number>();
    const waiting = R.rail(R.rw()).depot + R.rail(R.rw()).depotRails === 0;
    // The cart runs on the server's real-time clock while the page's clock races ahead (about 10x in a --long run), and
    // Q5's rack is 469 m down the cart road, so each Q5 trip needs a much longer page-time wait than the default.
    await until(
      () => {
        seen.add(R.cart(R.rw()).phase);
        return R.rail(R.rw()).depot > 0 || R.rail(R.rw()).depotRails > 0 || job().start >= 0;
      },
      'Q5 depot brings a load',
      2400000,
    );
    if (job().start >= 0) break;
    if (waiting) check(seen.has(CART_PHASE.RUN) || seen.has(CART_PHASE.DROP), 'Q5 cart seen bringing the load');
    if (R.rail(R.rw()).depot > 0 && job().stock < 24) {
      const depot = view().depot!;
      const before = job().stock;
      check(await bot.use(depot[0]!, depot[2]!, 'take Q5 depot logs', /^Pick up$/), 'Q5 depot rack offered');
      check(await bot.work(() => R.railBack().carry > 0 || job().stock > before, 5000, 380), 'Q5 depot logs accepted');
      await until(() => read().pending === 0, 'Q5 depot logs settle');
      await deliver(); // Logs and rails share the same back capacity.
    }
    if (R.rail(R.rw()).depotRails > 0 && job().railStock < 24) {
      const shelf = view().shelf!;
      const before = job().railStock;
      check(await bot.use(shelf.x, shelf.z, 'take Q5 shelf rails', /^Take rails$/), 'Q5 rails shelf offered');
      check(
        await bot.work(() => R.railBack().rails > 0 || job().railStock > before, 5000, 380),
        'Q5 shelf rails accepted',
      );
      await until(() => read().pending === 0, 'Q5 shelf rails settle');
    }
    await deliver();
    bot.note(`Q5 trip ${trip + 1} (${job().stock}/24 logs, ${job().railStock}/24 rails)`);
  }
  await until(() => job().start >= 0, 'Q5 funded');
  await checkpoint('Q5 funded');
  await until(() => job().completion === 1, 'Q5 laid once');
  await checkpoint('Q5 laid');
  // Join the finished deck on the rim, behind the machine now parked at Far Head.
  const rim = lineAt(LINKS[1]!.line, 286, { x: 0, z: 0, ux: 0, uz: 1 });
  await walk(rim.x + ORIGIN.x, rim.z, 0.5);
  await walkQuarry(286, 546);
  const end = view().farHead!;
  check(await bot.straight(end.x, end.z, 0.5, 12000), 'walked the final two metres to Far Head');
  await until(() => me.coyote > 0 && !me.swimming, 'Far Head supports the walker', 5000);
  check(Math.hypot(me.body!.position.x - end.x, me.body!.position.z - end.z) < 3, 'Far Head reached along the trestle');
  check(view().trestleLamps! > 0, 'Far Head trestle lamps placed');
  await checkpoint('Far Head');
}

/** The glide home (glider piece B, Home flow finding 2): back up Needle Bell by hook after Q5, take the woken glider,
 * and fly off the summit's west edge to the boiler's apron by the forge, letting go of the stick 9 m short so the
 * canopy brakes and sinks you onto dry ground. Real inputs only; the result goes in the bot's notes. */
export async function glideHome(
  { bot, checkpoint, walkQuarry = (a, b) => walkQuarryRail(bot, a, b) }: B4Route,
  from: 'far-head' | 'village',
) {
  const check = (ok: unknown, beat: string) => hookCheck(bot, ok, beat);
  check(R.line2Station(4).completion === 1, 'the glide home starts after Q5');
  if (from === 'far-head') await walkQuarry(546, 92);
  else {
    const { LINKS, ORIGIN, lineAt } = await import('../../../src/place/layout.ts');
    const deck = lineAt(LINKS[1]!.line, 84, { x: 0, z: 0, ux: 0, uz: 1 });
    check(await bot.walk(deck.x + ORIGIN.x, deck.z, 1), 'walked to the quarry deck below Needle Bell');
    await walkQuarry(84, 92);
  }
  await climbNeedleBell(bot);
  await takeGlider(bot);
  await checkpoint('glider taken');
  await glideToBoiler(bot);
  await checkpoint('glided home');
}

/** Take the woken glider on Needle Bell's summit with Interact, standing by it; the finder's card is dismissed with
 * Interact after `cardMs` (a co-op partner's find shows none). Returns whether the card showed. */
export async function takeGlider(bot: Bot) {
  const read = () => inspectRailway()!;
  const view = () => read().line2View;
  const check = (ok: unknown, beat: string) => hookCheck(bot, ok, beat);
  const until = async (fn: () => unknown, beat: string, ms = 60000) => check(await bot.until(fn, ms, beat), beat);
  const query = new URLSearchParams(location.search);
  const coop = query.get('player') === '1' || query.get('player') === '2';
  const device = view().glideDevice;
  check(device.available && device.woken, 'the summit glider is woken and waiting after Q5');
  check(await bot.use(device.x, device.z, 'take the glider', /^Take it$/), 'glider device offered');
  check(await bot.work(() => R.rail(R.rw()).glide, 5000, 380), 'the glider accepted after bounded retries');
  await bot.wait(1200);
  const card = read().reward.showing;
  if (card || !coop) {
    await until(() => read().reward.showing, 'glider reveal appears', 10000);
    await bot.wait(Number(query.get('cardMs')) || 1600);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await until(() => !read().reward.showing, 'glider reveal dismissed with Interact', 10000);
  }
  await until(() => read().glider.owned, 'the glider is owned', 5000);
  check(view().glideDevice.taken, 'the summit device reads taken');
  return { card };
}

/** From beside the taken device: step off the summit's west edge and fly to the boiler's apron by the forge, letting go
 * of the stick 9 m short so the canopy brakes and sinks you onto dry ground. Full stick from 3 s after the canopy
 * opens to the let-go is sampled for the BotW numbers. Real inputs only; the result goes in the bot's notes. */
export async function glideToBoiler(bot: Bot) {
  const read = () => inspectRailway()!;
  const check = (ok: unknown, beat: string) => hookCheck(bot, ok, beat);
  const until = async (fn: () => unknown, beat: string, ms = 60000) => check(await bot.until(fn, ms, beat), beat);
  const device = read().line2View.glideDevice;
  // The step-off: a stride south-east of the drum, so the line to the pedestal clears it, the switch on the left.
  const pedestal = { x: LINE2_BOILER.x / 100, z: LINE2_BOILER.z / 100 };
  check(await bot.straight(device.x + 1, device.z + 1.3, 0.4, 6000), 'stood at the summit step-off');
  const face = () => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(pedestal.x - p.x), -(pedestal.z - p.z));
    cam.pitch = -0.35;
  };
  const toPedestal = () => Math.hypot(me.body!.position.x - pedestal.x, me.body!.position.z - pedestal.z);
  const b = me.body!;
  const flightsBefore = read().glider.flights;
  face();
  input.keys.add('KeyW');
  const started = performance.now();
  const samples: { sink: number; speed: number }[] = [];
  let opened: number,
    released = 0;
  try {
    await until(() => me.coyote <= 0 && b.velocity.y < -0.5, 'stepped off the summit, falling', 8000);
    triggerAction('glide', 'down');
    triggerAction('glide', 'up');
    await until(() => read().glider.open, 'the Glide action opens the canopy', 1000);
    opened = performance.now();
    for (;;) {
      face();
      if (!released && performance.now() - opened >= 3000)
        samples.push({ sink: -b.velocity.y, speed: Math.hypot(b.velocity.x, b.velocity.z) });
      if (!released && toPedestal() < 9) {
        input.keys.delete('KeyW');
        released = performance.now();
      }
      if (me.coyote > 0 || me.swimming) break;
      check(performance.now() - started < 90000, 'the glide lands within 90 s');
      await bot.wait(100);
    }
  } finally {
    input.keys.delete('KeyW');
  }
  await bot.wait(300);
  const sinkMean = samples.reduce((a, s) => a + s.sink, 0) / Math.max(1, samples.length);
  const speedMax = Math.max(0, ...samples.map((s) => s.speed));
  const result = {
    seconds: +((performance.now() - started) / 1000).toFixed(1),
    sinkMean: +sinkMean.toFixed(2),
    speedMax: +speedMax.toFixed(2),
    samples: samples.length,
    released: released ? +((released - started) / 1000).toFixed(1) : null,
    landing: {
      x: +b.position.x.toFixed(1),
      y: +b.position.y.toFixed(1),
      z: +b.position.z.toFixed(1),
      dry: !me.swimming,
      toPedestal: +toPedestal().toFixed(1),
    },
    flights: read().glider.flights - flightsBefore,
  };
  bot.note(`GLIDE HOME ${JSON.stringify(result)}`);
  console.log(`GLIDE HOME ${JSON.stringify(result)}`);
  check(samples.length > 0 && Math.abs(sinkMean - 3.2) <= 0.3, `glide sink 3.2 m/s at full stick (${result.sinkMean})`);
  check(Math.abs(speedMax - 10) <= 0.5, `glide speed 10 m/s at full stick (${result.speedMax})`);
  check(!me.swimming, 'the first flight lands dry');
  check(result.landing.toPedestal < 14, `landed within 14 m of the boiler (${result.landing.toPedestal} m)`);
  check(result.flights === 1, `one flight (${result.flights})`);
  check(!read().glider.open, 'the canopy shuts on the ground');
  return result;
}

/** B5–B8, observing accepted state and using the same inputs as the full route. */
export async function boilerToPier(
  { bot, checkpoint, walkQuarry = (a, b) => walkQuarryRail(bot, a, b) }: B4Route,
  from: 'far-head' | 'boiler' | 'q6' = 'far-head',
) {
  const read = () => inspectRailway()!;
  type Trains = ReturnType<
    Awaited<ReturnType<typeof import('../../../src/entities/railway/train-view.ts').createRailwayTrains>>['inspect']
  >;
  type Halts = ReturnType<
    Awaited<ReturnType<typeof import('../../../src/entities/railway/halts-view.ts').createRailwayHalts>>['inspect']
  >;
  const view = () => read().line2View as RailwayViewInspection['line2View'] & Trains & Halts;
  const check = (ok: unknown, beat: string) => hookCheck(bot, ok, beat);
  // The page races about 10x faster than the authority. These are page-time budgets, not train schedules.
  const until = async (fn: () => unknown, beat: string, ms = 2400000) => check(await bot.until(fn, ms, beat), beat);
  const walk = async (x: number, z: number, radius = 1) =>
    check(await bot.walk(x, z, radius), `B8 walked to ${x.toFixed(1)}, ${z.toFixed(1)} without recovery`);
  const straight = async (x: number, z: number) =>
    check(await bot.straight(x, z, 0.5, 12000), 'B8 walked a supported track waypoint');
  const { LINKS, ORIGIN, lineAt, FORMATION } = await import('../../../src/place/layout.ts');
  const point = (line: number, s: number) => {
    const p = lineAt(LINKS[line]!.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    return { ...p, x: p.x + ORIGIN.x };
  };
  check(R.line2Station(4).completion === 1, 'B8 starts after Q5');
  check(view().boiler && view().trains && view().halts, 'B8 requires merged boiler, train and halt inspections');
  // The accepted q5-done and trains-on seeds stop short of the pack chest; the full route opened it at Q4.
  if (from !== 'far-head' && !R.rail(R.rw()).pack) {
    const chest = read().reward.tools.packChest;
    check(await bot.use(chest.x, chest.z, 'open the pack chest', /^Open/), 'seeded pack chest offered');
    check(await bot.work(() => R.rail(R.rw()).pack, 30000, 380), 'seeded pack accepted');
    await bot.wait(1600);
    if (read().reward.showing) {
      // The reveal owns the menu key rather than the world Interact action, as in the full route's dismiss().
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
      await until(() => !read().reward.showing, 'seeded pack reveal dismissed', 10000);
    }
  }
  if (from !== 'q6') {
    if (from === 'far-head') {
      await walkQuarry(546, 10);
      await walk(view().forgeRack.x, view().forgeRack.z, 3);
    }
    const b = view().boiler;
    check(await bot.use(b.x, b.z, 'pick up the boiler', /^Pick up$/), 'boiler pickup offered');
    check(await bot.work(() => view().boiler.mine, 30000, 380), 'boiler on its rope');
    await checkpoint('boiler');
    // Reverse the production path-home bypass, then follow line one's laid deck to camp.
    const village = point(0, 14),
      join = point(0, 30);
    await walk(village.x, village.z);
    await straight(village.x - village.uz * 4, village.z + village.ux * 4);
    await straight(join.x - join.uz * 4, join.z + join.ux * 4);
    await straight(join.x, join.z);
    for (let s = 30; s <= 192; s += 3) {
      const p = point(0, s);
      await straight(p.x, p.z);
      await until(() => me.coyote > 0 && !me.swimming, 'boiler path stays supported', 5000);
      check(view().boiler.mine, 'boiler stays on its carrier');
    }
    const saddle = view().boiler.saddle;
    check(await bot.use(saddle.x, saddle.z, 'fit the boiler', /^Fit the boiler$/), 'boiler fit offered');
    check(await bot.work(() => R.line2Trains(R.rw()), 30000, 380), 'boiler fitted at the old train');
    await checkpoint('TRAINS');
  }
  // Trains stop on request (works-late-game step 1): the lever on the platform the way to `destination`; every ride
  // here ends at its line's end, so nothing is asked aboard. Whichever of the line's trains stops for it is the ride
  // (v26: line 2 runs two).
  const ride = async (line: number, haltId: number, destination: number, called: boolean) => {
    const halt = view().halts[haltId]!;
    await until(() => view().halts[haltId]!.up, 'halt drops into place');
    const dir = destination > halt.stop ? 1 : -1;
    const handle = view().halts[haltId]!.lever.find((h) => h.on && h.dir === dir);
    check(handle, `${halt.name} has a handle toward stop ${destination}`);
    if (!handle!.over)
      check(await bot.use(handle!.x, handle!.z, `request a train at ${halt.name}`, /^Request stop/), 'lever offered');
    await until(() => view().halts[haltId]!.calling, `${halt.name} halt calls a train`);
    if (called) await checkpoint('train called');
    await walk(halt.x, halt.z, 0.5);
    const standing = () =>
      view()
        .trains.filter((t) => t.line === line)
        .find((t) => {
          const r = R.trains(R.rw())[t.slot]!;
          return r.phase === 0 && r.at === halt.stop && (r.track ? -1 : 1) === dir;
        })?.slot;
    await until(() => standing() !== undefined, 'called train arrives');
    const slot = standing()!;
    const train = () => view().trains.find((t) => t.slot === slot)!;
    const aboard = () => train().cars.some((car) => car.riding);
    const end = performance.now() + 20000;
    try {
      while (!aboard() && performance.now() < end) {
        const car = train().cars[1]!;
        const p = me.body!.position;
        cam.yaw = me.yaw = Math.atan2(-(car.x - p.x), -(car.z - p.z));
        input.keys.add('KeyW');
        if (me.coyote > 0) pressJump();
        await bot.wait(120);
        releaseJump();
        await bot.wait(80);
      }
    } finally {
      input.keys.delete('KeyW');
      releaseJump();
    }
    check(aboard(), 'boarded passenger car by real jump');
    let ran = false;
    let sample: Promise<void> | undefined;
    // Warped, the page outruns the real-time room clock, so the drawn train snaps back tens of metres whenever its
    // clock re-anchors (train-view.ts, step()). A rider's support can drop for that one snap and come straight back.
    // Real time has no such snaps (0 in a 43 s line-2 ride at 60 fps), so only a rider who stays off fails.
    let offAt = -1;
    await until(
      () => {
        const on = aboard() && !me.swimming;
        if (!on && offAt < 0) {
          offAt = performance.now();
          const b = me.body!;
          console.log(
            `RIDE BLIP ${JSON.stringify({ line, slot, row: R.trains(R.rw())[slot], along: train().along, on: carry.on?.id ?? null, at: b.position, v: b.velocity, swimming: me.swimming })}`,
          );
        }
        if (on) offAt = -1;
        check(on || performance.now() - offAt < 1500, 'rider stays aboard throughout the train journey');
        const row = R.trains(R.rw())[slot]!;
        ran ||= row.phase === 1;
        if (row.phase === 1 && !sample && new URLSearchParams(location.search).has('railPerf')) {
          sample = (async () => {
            const { hardwareTiming } = await import('../../../src/debug/prof-overlay.ts');
            const timing = await hardwareTiming(3);
            console.log(
              `RAILWAY MOVING PERF ${JSON.stringify({ line, timing, riding: aboard(), phase: R.trains(R.rw())[slot]!.phase })}`,
            );
          })();
          background(sample, 'moving train performance sample');
        }
        return on && ran && row.phase === 0 && row.at === destination;
      },
      `line ${line + 1} arrives with rider`,
    );
    await sample;
    if (line === 0 || from === 'q6') await checkpoint('train ride');
    else bot.note('line 2 train ride');
    const arrival = view().halts.find((h) => h.line === line && h.stop === destination)!;
    await straight(arrival.x, arrival.z);
    await until(() => !aboard() && me.coyote > 0, 'stepped off the train onto the halt', 10000);
  };
  if (from !== 'q6') await ride(0, 1, 0, true);
  await ride(1, 2, 2, from === 'q6');
  await until(
    () => R.rail(R.rw()).depot === 32 && R.rail(R.rw()).depotRails === 32,
    'Q6 train unloads all 32 logs and 32 rails',
  );
  await checkpoint('Q6 stocked');
  check(R.carryMax(R.rw()) === 16, 'Q6 back holds sixteen');
  const job = () => R.line2Station(5);
  const frame = view().frames[5]!;
  const deliver = async () => {
    await walk(frame.x, frame.z, 2.4);
    await until(
      () => R.railBack().carry === 0 && R.railBack().rails === 0 && read().pending === 0,
      'Q6 unload settles',
      30000,
    );
  };
  for (let trip = 0; job().start < 0; trip++) {
    check(trip < 4, 'Q6 funds in bounded sixteen-unit carries');
    if (job().stock < 32) {
      const depot = view().depot!;
      check(await bot.use(depot[0]!, depot[2]!, 'take Q6 depot logs', /^Pick up$/), 'Q6 depot offered');
      check(await bot.work(() => R.railBack().carry > 0, 30000, 380), 'Q6 logs accepted');
      await until(() => read().pending === 0, 'Q6 log take settles', 30000);
      await deliver();
    }
    if (job().railStock < 32) {
      const shelf = view().shelf!;
      check(await bot.use(shelf.x, shelf.z, 'take Q6 shelf rails', /^Take rails$/), 'Q6 shelf offered');
      check(await bot.work(() => R.railBack().rails > 0, 30000, 380), 'Q6 rails accepted');
      await until(() => read().pending === 0, 'Q6 rail take settles', 30000);
      await deliver();
    }
  }
  await checkpoint('Q6 funded');
  await until(() => job().completion === 1, 'Q6 laid once');
  await checkpoint('Q6 laid');
  // From the Q6 frame (on the up track's side) onto line 2 just past the formation's merge at the pier root, where one
  // bed on banked ground steps up from the side (generic-lines step 2). Beside the turnout the up track's bed stands
  // about 0.36 m over the unbanked ground, too high to walk up, so the old straight line from the frame to s 546
  // stalled against it; Far Head's plank crossing (s 538.5) is the other way on, but the frame stands in that line.
  const merge = FORMATION.quarry.to + 1;
  const beside = (s: number, lat: number) => {
    const p = point(1, s);
    return { x: p.x - p.uz * lat, z: p.z + p.ux * lat };
  };
  for (const [s, lat] of [
    [merge, -3.5], // along the frame's side of the turnout, on the ground, clear of the frame
    [merge, 0], // up onto the single track
  ] as const) {
    const p = beside(s, lat);
    await straight(p.x, p.z);
  }
  const start = point(1, 546);
  await straight(start.x, start.z);
  await walkQuarry(546, 739);
  const end = point(1, 739);
  pressJump();
  try {
    await straight(end.x, end.z);
  } finally {
    releaseJump();
  }
  await until(() => me.coyote > 0 && !me.swimming, 'pier end supports the walker', 5000);
  await checkpoint('pier');
}

async function dropFromTower(bot: Bot, id: 't3' | 'summit') {
  if (id === 't3') await returnFromTower(bot, ['t5', 't4', 't3']);
  const [{ PADS }, layout] = await Promise.all([
    import('../../../src/place/tech-layout.ts'),
    import('../../../src/place/layout.ts'),
  ]);
  const pad = PADS.find((p) => p.id === id)!,
    b = me.body!;
  // Walk outwards from the spire, beyond this pad's outer edge. No hook or recovery on the way home.
  const dx = pad.x - 8,
    dz = pad.z + 10;
  cam.yaw = me.yaw = Math.atan2(-dx, -dz);
  cam.pitch = -0.1;
  input.keys.add('KeyW');
  try {
    hookCheck(bot, await bot.until(() => b.position.y < pad.top - 2, 5000, `walked off ${id}`), `walked off ${id}`);
  } finally {
    input.keys.delete('KeyW');
  }
  if (id === 'summit') input.keys.add('KeyW'); // Walk off an intermediate slab too, rather than calling t5 the ground.
  try {
    hookCheck(
      bot,
      await bot.until(
        () => (me.coyote > 0 || (me.swimming && Math.abs(b.velocity.y) < 1.5)) && b.position.y < 30,
        20000,
        `landed on terrain or surface water below ${id}`,
      ),
      `drop ${id} reached terrain or surface water`,
    );
  } finally {
    input.keys.delete('KeyW');
  }
  aimHook('p2');
  await bot.wait(200);
  const ring = hookRing('p2');
  const distance = Math.hypot(ring.x - b.position.x, ring.y - b.position.y, ring.z - b.position.z);
  console.log(
    `HOOK DROP GROUND ${JSON.stringify({ id, position: b.position, p2Distance: distance, p2WhyNot: hookWhyNot('p2') })}`,
  );
  const deck = layout.lineAt(layout.LINKS[1]!.line, 84, { x: 0, z: 0, ux: 0, uz: 1 });
  // The production player can surface-swim. Opt in only for this return, preserving the main route's dry checks.
  const returning = makeBot({
    allowSwimming: true,
    avoid: waitingBoxes,
    recover: () => {
      throw new Error('Gorge return requested forbidden relocation recovery');
    },
  });
  // Reaching the trestle's x/z on the floor is not reaching its deck. Follow the existing low quarry footbridge
  // and its authored graded path up the east bank. Join behind the parked machine, as the Q3 delivery route does.
  const footpath = layout.PATHS[1]!;
  for (const [x, z] of b.position.y - PLAYER_R < 15 ? footpath.pts.slice(footpath.bridgeAt + 1) : []) {
    hookCheck(
      bot,
      await returning.walk(x + layout.ORIGIN.x, z, 1, { limit: 300000 }),
      `gorge return reached existing quarry path (${x}, ${z}) without recovery`,
    );
  }
  bot.note(`hook drop ${id} reached the existing upper quarry path`);
  const line = layout.LINKS[1]!.line;
  const frame = inspectRailway()!.line2View.frames[2]!;
  hookCheck(
    bot,
    await returning.walk(frame.x, frame.z - 5, 0.8),
    'gorge return rounded the north side of the Q3 frame',
  );
  const join = layout.lineAt(line, 112, { x: 0, z: 0, ux: 0, uz: 1 });
  const x = join.x + layout.ORIGIN.x;
  const side = Math.sign(-join.uz * (frame.x - x) + join.ux * (frame.z - join.z)) || 1;
  hookCheck(
    bot,
    await returning.straight(x - join.uz * side * 4.5, join.z + join.ux * side * 4.5, 0.6, 10000),
    'gorge return walked the clear side of the parked machine',
  );
  // The track has a raised timber edge: approach on the bank, then use an ordinary held jump onto it.
  hookCheck(
    bot,
    await returning.straight(x - join.uz * side * 2.25, join.z + join.ux * side * 2.25, 0.6, 10000),
    'gorge return reached the track edge',
  );
  hookCheck(
    bot,
    await bot.until(() => me.coyote > 0, 3000, 'supported before the track-edge jump'),
    'track-edge jump starts on the bank',
  );
  pressJump();
  try {
    hookCheck(bot, await returning.straight(x, join.z, 0.5, 10000), 'gorge return jumped onto the rail');
  } finally {
    releaseJump();
  }
  hookCheck(
    bot,
    await bot.until(() => me.coyote > 0 && !me.swimming, 5000, 'track-edge jump lands'),
    'gorge return landed on the rail',
  );
  for (let s = 112; s > 84; s -= 3) {
    const p = layout.lineAt(line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    hookCheck(
      bot,
      await returning.straight(p.x + layout.ORIGIN.x, p.z, 0.5, 10000),
      `gorge return followed rail s=${s}`,
    );
    hookCheck(bot, Math.abs(b.position.y - PLAYER_R - layout.railY(line, s)) < 1, `gorge return stays on deck s=${s}`);
  }
  hookCheck(
    bot,
    await returning.straight(deck.x + layout.ORIGIN.x, deck.z, 0.5, 10000),
    `DROP RETURN BLOCKED: ${id} must walk/swim to quarry s=84 without recovery`,
  );
  hookCheck(
    bot,
    Math.abs(b.position.y - PLAYER_R - layout.railY(layout.LINKS[1]!.line, 84)) < 1 && me.coyote > 0,
    `drop ${id} returned to the quarry deck`,
  );
  bot.note(`hook drop ${id} walked/swam home without recovery`);
}

/** The station boxes waiting for this player (Q2-Q6): the route walks round them, so their cards never interrupt a
 * walk at an awkward spot. A player opens one by walking into it; the route's job is the railway. */
const waitingBoxes = () =>
  (inspectRailway()?.reward.stationBoxes.boxes ?? []).filter((b) => b.visible).map((b) => ({ x: b.x, z: b.z, r: 1.4 }));

const HOOK_RELOAD_KEY = 'look.railway-hook-reload';
let hookReloadStarted = false;
/** Entry for look's existing reload-aware eval loop. Session storage contains observations, never game state. */
export function startHookReload() {
  if (hookReloadStarted) return;
  hookReloadStarted = true;
  background(
    (async () => {
      const saved = JSON.parse(sessionStorage.getItem(HOOK_RELOAD_KEY) ?? 'null') as {
        stage: 'hook';
        pid: string;
      } | null;
      if (!saved) {
        await play();
        return;
      }
      // On a real navigation the eval can re-enter before the player body exists. Wait without the bot's body sampler.
      const deadline = performance.now() + 300000;
      while (
        (!me.body || !inspectRailway()?.ready || fallArrival.active || me.coyote <= 0) &&
        performance.now() < deadline
      )
        await new Promise<void>((resolve) => setTimeout(resolve, 60));
      const bot = makeBot({
        recover: () => {
          throw new Error('Hook reload proof required recovery');
        },
      });
      hookCheck(
        bot,
        await bot.until(
          () => inspectRailway()?.ready && me.body && !fallArrival.active && me.coyote > 0,
          300000,
          'hook reload arrival',
        ),
        'hook reload arrived dry',
      );
      hookCheck(bot, inspectRailway()!.pid === saved.pid, 'hook reload retains player identity');
      await hookLanding(bot, 't2');
      hookCheck(
        bot,
        await bot.until(() => inspectRailway()?.hookShot.owned, 5000, 'hook latch restored'),
        'hook latch restored once ready',
      );
      await returnFromTower(bot, ['t1']);
      sessionStorage.removeItem(HOOK_RELOAD_KEY);
      document.documentElement.dataset.railwayHookReload = 'done';
      bot.finish('hook reload returns to t2 and pulls to t1');
    })().catch((error: unknown) => {
      document.documentElement.dataset.railwayHookReload = 'failed';
      (window as Window & { __placeDone?: boolean }).__placeDone = true;
      throw error;
    }),
    'hook reload proof',
  );
}

/** `solo`: play the solo route even on a two-player page, beside a friend another eval drives (coop-unlock.ts). */
export async function play({ stopBeforeReward = false, solo = false } = {}) {
  const query = new URLSearchParams(location.search);
  const player = query.get('player');
  const coop = !solo && (player === '1' || player === '2');
  const second = coop && player === '2';
  // &botOrder=legacy keeps the route's old order (the pack after the quarry lever, a cart ride to Q4, a second climb
  // for the sea switch and the walk home from Far Head); the default plays in a player's order (Home flow finding 4):
  // the pack at the forge, the switch on the first climb and the glide home from Needle Bell after Q5.
  const legacy = query.get('botOrder') === 'legacy';
  const botTo = query.get('botTo');
  if (botTo !== null && !(botTo in RAIL_STOPS)) throw new Error(`Unknown botTo ${botTo}`);
  // `pier` is the whole route: its closing totals still run.
  const stopAt = botTo && botTo !== 'crossing' ? RAIL_STOPS[botTo as keyof typeof RAIL_STOPS] : null;
  const hookSeen = new Set<string>();
  let remoteCableSeen = false;
  const peers = new Map<
    string,
    { pid: string | null; x: number; y: number; z: number; seenAt: number; beamHelp: string | null }
  >();
  const offPresence = coop
    ? onRemotePresence((remote, presence) => {
        if (
          second &&
          typeof presence.railwayHook === 'string' &&
          ['p2', 't0', 't1', 't2', 't3', 't4', 't5', 'summit'].includes(presence.railwayHook)
        )
          hookSeen.add(presence.railwayHook);
        if (remote.entered && Array.isArray(presence.p))
          peers.set(remote.peer, {
            pid: remote.pid ?? null,
            x: presence.p[0] as number,
            y: presence.p[1] as number,
            z: presence.p[2] as number,
            seenAt: performance.now(),
            beamHelp: typeof presence.railwayBeamHelp === 'string' ? presence.railwayBeamHelp : null,
          });
        else peers.delete(remote.peer);
      })
    : () => {};
  const bot = makeBot({
    recover: () => {
      throw new Error('Production route needed recovery; no relocation is permitted');
    },
    avoid: waitingBoxes,
  });
  const read = (): RailwayViewInspection => {
    const state = inspectRailway();
    if (!state) throw new Error('Production railway view is unavailable');
    return state;
  };
  const require = (ok: unknown, beat: string) => {
    bot.check(beat, ok);
    if (!ok) throw new Error(beat);
  };
  const until = async (fn: () => unknown, beat: string, ms = 300000) => require(await bot.until(fn, ms, beat), beat);
  // Laying runs on the server's real-time ticks while the page's clock races ahead, so a loaded machine needs longer here.
  const LAYING_MS = 600000;
  // The depot cart runs on the server's clock (a round trip of 70-101 s of it), which a loaded machine runs well behind
  // the warped page clock: as with laying, its waits get twice the default.
  const CART_MS = 600000;
  const job = R.railStation;
  // Co-op witness: mirrored railway hashes by server step, compared offline between the two peers' logs.
  const tickHashes = new Map<number, number>();
  const sampler = coop
    ? setInterval(() => {
        const state = inspectRailway();
        if (second && state && state.hookShot.remoteCables >= 1) remoteCableSeen = true;
        // A segment run (botTo) may end before the forge: witness its whole route.
        if (state?.ready && (stopAt || R.forge(R.rw()).used > 0) && state.step >= 0)
          tickHashes.set(state.step, state.hash);
      }, 50)
    : 0;
  // A station box (Q2-Q6) opens when you walk into it, and the route passes some. Its card holds you until you put it
  // away, as a player would: wait the card's readable time, then press E. The route's own cards keep dismiss().
  let boxCardAt = 0;
  setInterval(() => {
    const reward = inspectRailway()?.reward;
    if (!reward?.stationBoxes.showing || !reward.showing) return void (boxCardAt = 0);
    boxCardAt ||= performance.now();
    if (performance.now() - boxCardAt < 1600) return;
    boxCardAt = 0;
    bot.note(`put away the ${reward.stationBoxes.showing} from a station box`);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  }, 100);
  const logHashes = () =>
    console.log(`RAILWAY TICKHASH ${JSON.stringify({ player: player ?? 'solo', hashes: [...tickHashes] })}`);
  const mark = (name: string) => {
    const state = read();
    // The facts are rows and queries on one world, taken once for the line.
    const w = R.rw();
    const active = R.railActiveStation(w);
    const stations = R.railJobs(w).map(({ job, run }) => ({ ...job, ...run }));
    const now = stations[active]!;
    const me1 = R.railBack();
    const counts = R.railCounts(w);
    document.documentElement.dataset.railwayBeat = name;
    playMark(name, { tick: state.tick, stock: now.stock, carry: me1.carry, completion: counts.completion });
    bot.note(name);
    console.log(
      `RAILWAY CHECKPOINT ${JSON.stringify({
        beat: name,
        player: player ?? 'solo',
        pid: state.pid,
        tick: state.tick,
        hash: state.hash,
        phase: R.railPhase(w),
        ready: state.ready,
        activeStation: active,
        stations,
        carry: me1.carry,
        stoneCarry: me1.stone,
        completion: counts.completion,
        stock: now.stock,
        allocation: now.allocation,
        used: now.used,
        delivered: now.delivered,
        pending: state.pending,
        accounts: R.accounts(w),
        counts,
        panelCount: R.railPanelCount(w),
        panelStock: R.railPanelStock(w),
        axe: R.rail(w).axe,
        jump: R.rail(w).jump,
        beam: R.beam(w),
        rocks: R.rocks(w),
        head: state.head,
        targetHead: state.targetHead,
        machine: state.machine,
        station: state.station,
        position: me.body?.position,
        swimming: me.swimming,
        grounded: me.coyote > 0,
        aboard: carry.on?.id ?? null,
        reward: state.reward,
        pathOpen: state.pathOpen,
        hookShot: state.hookShot,
        beamHelpPeers: [...peers.values()].filter((p) => p.beamHelp && performance.now() - p.seenAt < 1500),
        workedSources: state.trees
          .filter((tree) => tree.work > 0)
          .map(({ id, remaining, work, growth }) => ({ id, remaining, work, growth })),
      })}`,
    );
    if (name === stopAt) throw new RouteStop(name);
  };
  // A targeted still replays real inputs to this beat. Pose checkpoints cannot restore shared progress.
  const checkpoint = async (name: string) => {
    mark(name);
    if (query.get('railStop') !== name) return;
    input.keys.clear();
    releaseJump();
    (window as Window & { __railStop?: string }).__railStop = name;
    // railResume=<s>: hold the beat that long, then play on (a real-time clip that starts at the beat).
    const resume = Number(query.get('railResume'));
    if (resume > 0) return void (await bot.wait(resume * 1000));
    await new Promise<void>(() => {});
  };
  const dismiss = async (name: string) => {
    await until(() => read().reward.showing, `${name} appears`);
    // &cardMs= holds a card up longer, for a capture of it.
    await bot.wait(Number(query.get('cardMs')) || 1600);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await until(() => !read().reward.showing, `${name} dismissed with Interact`);
  };
  const settled = async () => {
    // Peer bumps need a landing wait. A sleeping solo body can have an expired coyote timer while supported.
    if (!coop) return;
    await until(
      () => !!me.body && !fallArrival.active && me.coyote > 0 && !me.swimming && Math.abs(me.body.velocity.y) < 0.5,
      'landed dry and settled before route planning',
      10000,
    );
  };
  const walk = async (x: number, z: number, radius = 1.8) => {
    await settled();
    require(await bot.walk(x, z, radius), `walked to ${x.toFixed(1)}, ${z.toFixed(1)} without recovery`);
  };
  const face = (x: number, z: number) => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  };
  const ride = async (station: number) => {
    if (query.get('ride') !== '1') return;
    const name = LINE1_STATIONS[station]!.id;
    await walk(read().machine.x, read().machine.z, 3);
    const aboard = () => carry.on?.id === 'railway:T1:flatbed' || carry.on?.id === 'railway:T1:loco';
    const end = performance.now() + 15000;
    while (!aboard() && performance.now() < end && !job(station).completion) {
      face(read().machine.x, read().machine.z);
      input.keys.add('KeyW');
      if (me.coyote > 0) pressJump();
      await bot.wait(120);
      releaseJump();
      await bot.wait(80);
    }
    input.keys.delete('KeyW');
    require(aboard(), `boarded ${name} layer by real jump`);
    await checkpoint(`${name} layer boarded`);
    if (query.get('seat') === '1') return sit(station);
    let stayedAboard = true;
    await until(() => {
      stayedAboard &&= aboard() && !me.swimming;
      return job(station).completion;
    }, `${name} completes while riding`);
    require(stayedAboard, `${name} rider stayed aboard throughout laying`);
    require(aboard() && !me.swimming, `${name} rider remains aboard and dry`);
    mark(`${name} layer ride completed`);
  };
  const interact = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  };
  // &seat=1 (with &ride=1): take a track-layer chair by Interact, ride the whole laying seated, stand up aboard.
  const sit = async (station: number) => {
    const name = LINE1_STATIONS[station]!.id;
    const { seatState } = await import('../../../src/entities/railway/seat.ts');
    const remoteSeated = () =>
      [...remotes.values()].some((r) => r.avatar && performance.now() - (r.avatar.userData.seatedAt ?? -1e9) < 300);
    // Boarding lands on the deck within reach (2.5 m) of a chair: Sit is the prompt when nothing else acts.
    await until(() => interactTarget()?.verb === 'Sit', `${name} Sit offered aboard`, 15000);
    interact();
    require(!!seatState().sitting, `${name} seated on the press`);
    await until(
      () => Object.values(seatState().grants).some((g) => g.peer === net.myPeer) || !net.room,
      `${name} chair granted`,
      10000,
    );
    if (coop) await until(remoteSeated, `${name} friend seen seated`, 60000);
    await checkpoint(`${name} seated`);
    const startCount = R.railPanelCount(R.rw());
    let stayed = true;
    let midway = false;
    await until(() => {
      stayed &&= !!seatState().sitting && !me.swimming;
      if (!midway && R.railPanelCount(R.rw()) >= startCount + 6) midway = true;
      return midway;
    }, `${name} lays while seated`);
    await checkpoint(`${name} seated laying`);
    await until(() => {
      stayed &&= !!seatState().sitting && !me.swimming;
      return job(station).completion;
    }, `${name} completes while seated`);
    require(stayed, `${name} rider stayed seated throughout laying`);
    if (coop) require(remoteSeated(), `${name} friend still seen seated at completion`);
    await checkpoint(`${name} seated ride completed`);
    await until(() => interactTarget()?.verb === 'Stand up', `${name} Stand up offered`, 5000);
    interact();
    require(!seatState().sitting && !seatState().request, `${name} stood up on the press`);
    await bot.wait(600);
    const aboard = carry.on?.id === 'railway:T1:flatbed' || carry.on?.id === 'railway:T1:loco';
    require(aboard && !me.swimming, `${name} stood up onto the deck`);
    await checkpoint(`${name} stood up`);
  };
  /** After `stations` stops: their rail pairs are laid and the rest stay on the stack. */
  const panels = (stations: number) => {
    const ids = LINE1_STATIONS.slice(0, stations).map((s) => s.id);
    const committed = linePanels().filter((p) => ids.includes(p.station)).length,
      stock = LINE1_RAIL_PAIRS - committed;
    require(R.railPanelCount(R.rw()) === committed &&
      R.railPanelStock(R.rw()) === stock, `${committed} accepted rail pairs leave ${stock} on the stack`);
  };
  const logs = async (station: number, loads: number) => {
    for (let load = 0; load < loads; load++) {
      let attempts = 0;
      while (R.railBack().carry < 8) {
        await settled();
        require(++attempts <= 20, `${LINE1_STATIONS[station]!.id} found enough reachable logs`);
        const p = me.body!.position;
        const candidates = read()
          .trees.filter(
            (tree) => !tree.cleared && tree.remaining > 0 && tree.id !== 28 && tree.id !== 209 && tree.id !== 232,
          )
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        let chosen: RailwayViewInspection['trees'][number] | undefined;
        for (const candidate of candidates.slice(0, 20)) {
          const route = await bot.plan(candidate.x, candidate.z, 2.6);
          if (route.arrives && route.path.every((point) => point.y >= 3)) {
            chosen = candidate;
            break;
          }
        }
        require(chosen, 'a physically reachable ordinary source exists');
        await walk(chosen!.x, chosen!.z, 2.6);
        face(chosen!.x, chosen!.z);
        const before = R.railBack().carry;
        for (let swing = 0; swing < 100 && R.railBack().carry < 8; swing++) {
          const target = interactTarget();
          if (!target?.click || target.verb !== 'Chop') break;
          bot.press();
          await bot.wait(380);
          if (read().trees.find((source) => source.id === chosen!.id)?.remaining === 0) break;
        }
        await until(() => read().pending === 0, 'harvest requests settle');
        require(R.railBack().carry > before, `source ${chosen!.id} transferred accepted logs`);
      }
      require(R.railBack().carry === 8 && R.railBack().stone === 0, 'eight-piece log back');
      mark(`${LINE1_STATIONS[station]!.id} load ${load + 1} carried`);
      const frame = read().station;
      await walk(frame.x, frame.z, 3);
      await until(() => R.railBack().carry === 0 && read().pending === 0, 'automatic log deposit settles');
      mark(`${LINE1_STATIONS[station]!.id} load ${load + 1} deposited`);
    }
  };
  const box = async (station: 0 | 1) => {
    const id = station === 0 ? 'T1' : 'T2';
    const reward = read().reward.boxes.find((row) => row.station === id)!;
    require(reward, `${id} has its authored personal box`);
    if (stopBeforeReward && station === 0) {
      await walk(reward.x, reward.z, 2);
      mark('T1 unopened reward reached');
      return;
    }
    require(await bot.use(reward.x, reward.z, `open the ${id} cosmetic box`, /^Open/), `${id} box offered`);
    await until(
      () => read().reward.boxes.some((row) => row.station === id && row.claimed && row.owned),
      `${id} ownership stored`,
    );
    mark(`${id} cosmetic claimed`);
    await dismiss(`${id} cosmetic reveal`);
    require(!read().reward.error, 'profile write succeeded');
  };
  try {
    await until(() => !!me.body && R.railRead()?.ready(), 'verified production room ready');
    await until(() => !fallArrival.active && me.coyote > 0 && !me.swimming, 'opening arrival lands dry');
    require(!('__place' in window), 'production installs no mutable legacy Place surface');
    require(R.railPhase(R.rw()) === 'asleep' &&
      R.railBack().carry === 0, 'fresh production route starts asleep and empty');
    if (coop) await until(() => R.accounts(R.rw()).length === 2, 'both independent players joined');
    if (second) {
      const spawn = { x: me.body!.position.x, z: me.body!.position.z };
      await until(
        () =>
          [...peers].some(
            ([peer, p]) =>
              remotes.has(peer) &&
              performance.now() - p.seenAt < 2000 &&
              Math.hypot(p.x - spawn.x, p.z - spawn.z) >= 8 &&
              Math.hypot(p.x - me.body!.position.x, p.z - me.body!.position.z) >= 8,
          ),
        'leader clears the shared spawn before follower departs',
        30000,
      );
      // The shared arrival can lift a stationary peer. Start planning only after that peer lands again.
      await until(
        () => !fallArrival.active && me.coyote > 0 && !me.swimming && Math.abs(me.body!.velocity.y) < 0.5,
        'follower lands dry after leader departure',
        10000,
      );
    }
    const [{ PATH_SAMPLES }, layout] = await Promise.all([
      import('../../../src/place/terrain.ts'),
      import('../../../src/place/layout.ts'),
    ]);
    const line = layout.LINKS[0]!;
    const railAt = (s: number) => layout.lineAt(line.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    const walkTrack = async (from: number, to: number) => {
      const direction = Math.sign(to - from);
      for (let s = from; direction * (to - s) >= 0; s += direction * 3) {
        const point = railAt(s);
        require(await bot.straight(point.x + layout.ORIGIN.x, point.z, 0.5, 12000), `walked rail at ${s.toFixed(0)} m`);
        await until(() => me.coyote > 0 && !me.swimming, 'track supports the walker', 5000);
        require(Math.abs(me.body!.position.y - PLAYER_R - layout.railY(line.line, s)) <
          1, 'walker remains at track height');
      }
      const end = railAt(to);
      require(await bot.straight(end.x + layout.ORIGIN.x, end.z, 0.5, 12000), 'reached track endpoint');
    };
    if (stopAt === RAIL_STOPS['audio-loop']) {
      // Action coverage for audio changes: walk a leg of the opening path, jump, land dry; three times.
      for (let i = 0; i < 3; i++) {
        const point = PATH_SAMPLES[0]![Math.min(3 * (i + 1), PATH_SAMPLES[0]!.length - 1)]!;
        await walk(point[0] + layout.ORIGIN.x, point[1]);
        await until(() => me.coyote > 0, 'grounded before the audio-loop jump', 5000);
        pressJump();
        await until(
          () => me.coyote <= 0 && me.body!.velocity.y > 0,
          `audio-loop jump ${i + 1} leaves the ground`,
          3000,
        );
        await bot.wait(330);
        releaseJump();
        await until(() => me.coyote > 0 && !me.swimming, `audio-loop jump ${i + 1} lands dry`, 5000);
        await bot.wait(500);
      }
      mark(RAIL_STOPS['audio-loop']);
    }
    mark('T1 opening started');
    for (let i = 0; i < PATH_SAMPLES[0]!.length; i += 3) {
      const point = PATH_SAMPLES[0]![i]!;
      await walk(point[0] + layout.ORIGIN.x, point[1]);
    }
    const machine = read().machine;
    await walk(machine.x, machine.z, 3);
    if (coop && !second)
      await until(
        () => [...peers].some(([peer, p]) => remotes.has(peer) && Math.hypot(p.x - machine.x, p.z - machine.z) <= 3.2),
        'friend completes opening walk',
      );
    if (!second) {
      await until(() => interactTarget()?.id === 'place-wake', 'wake offered');
      // A real keyboard tap, once, as soon as offered. No retry or held key can hide a refused wake.
      interact();
      require(R.railPhase(R.rw()) === 'waking' && read().pending === 1, 'single wake tap predicts immediately');
    }
    await until(() => R.railPhase(R.rw()) === 'idle', 'accepted wake ready');
    require(read().prediction.corrected === 0, 'single wake tap was not refused');
    mark('awake');
    // Option E: the card is the waker's alone; a friend gets the flourish as the wake ends, and is never held.
    if (second) {
      await until(() => read().reward.arrival.seen.includes('multi-axe'), "friend's multi-axe flourish played");
      require(!read().reward.showing, 'no multi-axe card for a friend’s wake');
    } else await dismiss('multi-axe reveal');
    mark('T1 multi-axe dismissed');
    if (second) await until(() => job(0).delivered === 16, 'friend supplied sixteen logs');
    await logs(0, coop ? (second ? 1 : 2) : 3);
    await until(() => job(0).start >= 0, 'funded T1 begins');
    mark('T1 funded');
    await ride(0);
    await until(() => job(0).completion === 1, 'T1 laid once', LAYING_MS);
    panels(1);
    require(job(0).used === 24 && job(0).allocation === 0, 'T1 contains exactly 24 logs');
    mark('T1 laid');
    const track = railAt(154);
    await walk(track.x + layout.ORIGIN.x, track.z, 0.8);
    await until(() => me.coyote > 0 && !me.swimming, 'standing on laid T1');
    mark('T1 track stood on');
    await box(0);
    if (stopBeforeReward) return;
    mark('T1 production completed');
    if (R.jobs(R.rw()).length === 1 || query.get('t1Only') === '1') {
      document.documentElement.dataset.railwayProof = 'done';
      bot.finish('T1 real inputs and personal claim');
      return;
    }
    await until(() => R.railActiveStation(R.rw()) === 1, 'T2 opens after T1');
    require(!R.rail(R.rw()).axe, 'proper axe remains locked at T2');
    if (!coop) {
      // A swing always answers: before Station 3 opens the great tree rebounds, and nothing is sent.
      const tree = LINE1_GREAT_TREE;
      await walk(tree.x / 100, tree.z / 100, 2.6);
      face(tree.x / 100, tree.z / 100);
      await until(() => interactTarget()?.id === 'place-tree28', 'the great tree is targeted before Station 3', 5000);
      await checkpoint('great tree before Station 3');
      bot.press();
      await bot.wait(900);
      require(R.beam(R.rw()).state === 'standing' &&
        R.beam(R.rw()).work === 0 &&
        read().pending === 0, 'the great tree rebounds before Station 3, sending nothing');
      mark('great tree rebounds before Station 3');
    }
    if (!second) await logs(1, 4);
    if (!coop || second) {
      const rock = LINE1_ROCKS.find((r) => R.rock(R.rw(), r.id).left >= 8)!;
      require(rock, 'stone source available');
      await walk(rock.x / 100, rock.z / 100, 2.6);
      face(rock.x / 100, rock.z / 100);
      await until(() => interactTarget()?.id === `railway-rock${rock.id}`, 'the chosen rock is targeted', 5000);
      require(await bot.work(() => R.railBack().stone === 8, 30000), 'four productive rock strokes fill stone back');
      await until(() => read().pending === 0, 'stone requests settle');
      mark('T2 stone carried');
      await walk(read().station.x, read().station.z, 3);
      await until(() => R.railBack().stone === 0 && read().pending === 0, 'stone automatically deposited');
      mark('T2 stone deposited');
    }
    await until(() => job(1).start >= 0, 'T2 exact mixed bill funded');
    mark('T2 funded');
    await ride(1);
    await until(() => job(1).completion === 1, 'T2 laid once', LAYING_MS);
    panels(2);
    require(job(1).used === 32 && job(1).stoneUsed === 8, 'T2 embodies 32 logs and 8 stone');
    await checkpoint('T2 laid');
    await box(1);
    await until(() => R.railActiveStation(R.rw()) === 2, 'T3 opens after T2');
    require(!R.rail(R.rw()).axe, 'proper axe not granted by T2 completion');
    require(!read().reward.axeChest.available, 'Station 3 offers no proper axe (it is the forge’s)');
    // The great beam pass: logs and beam fund T3 in either order. Solo lays the beam first (the 40th log starts the
    // feed); a pair brings the logs first (the beam starts it).
    const beamFirst = !coop;
    const laid = () => R.beam(R.rw()).state === 'allocated' || R.beam(R.rw()).state === 'used';
    const t3Logs = async () => {
      if (second) await until(() => job(2).delivered === 24, 'friend supplies the first 24 T3 logs');
      await logs(2, coop ? (second ? 2 : 3) : 5);
      await until(() => job(2).stock === 40 || job(2).start >= 0, 'T3 has 40 accepted logs');
    };
    if (!beamFirst) {
      await t3Logs();
      require(job(2).start < 0, 'logs alone do not feed T3');
      await checkpoint('T3 logs delivered');
    }
    if (!second) {
      const tree = LINE1_GREAT_TREE;
      await walk(tree.x / 100, tree.z / 100, 2.6);
      face(tree.x / 100, tree.z / 100);
      await until(() => interactTarget()?.id === 'place-tree28', 'the great tree is targeted', 5000);
      require(!R.rail(R.rw()).axe, 'the first axe is the one that fells the great tree');
      require(await bot.work(
        () => R.beam(R.rw()).state === 'available',
        30000,
      ), 'great tree yields unique beam after twelve first-axe strokes');
      await until(() => read().pending === 0, 'great tree requests settle');
      mark('T3 beam available');
      const beam = R.beam(R.rw());
      require(R.railBack().carry === 0 && R.railBack().stone === 0, 'empty back before unique beam claim');
      require(await bot.use(beam.x / 100, beam.z / 100, 'pick up unique beam', /^Pick up/), 'beam pickup offered');
      await until(
        () => R.beam(R.rw()).state === 'held' && R.beam(R.rw()).holder === read().pid,
        'unique beam held by carrier',
      );
      await checkpoint('T3 beam carried');
      if (coop) {
        const holder = read().pid;
        const revision = R.beam(R.rw()).revision;
        const helperNear = () =>
          [...peers.values()].some(
            (p) =>
              p.beamHelp === holder &&
              performance.now() - p.seenAt < 1500 &&
              Math.hypot(p.x - me.body!.position.x, p.z - me.body!.position.z) <= 3.5,
          );
        await until(helperNear, 'friend activates Help carry beside the sole beam holder', 30000);
        mark('T3 beam helper joined');
        const start = { ...me.body!.position };
        const route = await bot.plan(read().station.x, read().station.z, 3);
        require(route.arrives, 'a real helped-beam route reaches T3');
        let last = { x: start.x, z: start.z };
        let shown = false;
        for (const point of route.path) {
          if (laid()) break;
          if (Math.hypot(point.x - last.x, point.z - last.z) < 2) continue;
          await until(helperNear, 'helper stays near before the next short beam leg', 10000);
          require(R.beam(R.rw()).holder === holder &&
            R.beam(R.rw()).revision === revision, 'help never claims a second beam');
          await walk(point.x, point.z, 0.7);
          last = point;
          if (!shown && Math.hypot(me.body!.position.x - tree.x / 100, me.body!.position.z - tree.z / 100) >= 9) {
            await until(helperNear, 'helper remains beside the carried beam after moving', 10000);
            require(Math.hypot(me.body!.position.x - start.x, me.body!.position.z - start.z) >=
              5, 'helped beam moves at least five metres');
            shown = true;
            await checkpoint('T3 helped beam carried');
          }
        }
        require(shown, 'helped beam carry was observed before delivery');
        await walk(read().station.x, read().station.z, 3);
      } else await walk(read().station.x, read().station.z, 3);
      await until(laid, 'beam laid in the frame’s saddles');
    } else {
      await until(() => R.beam(R.rw()).state === 'held', 'friend picks up the sole beam');
      const holder = R.beam(R.rw()).holder;
      const carrier = () => [...peers.values()].find((p) => p.pid === holder && performance.now() - p.seenAt < 1500);
      await until(carrier, 'carrier has a fresh real position');
      const initial = carrier()!;
      await walk(initial.x, initial.z, 2.5);
      face(initial.x, initial.z);
      await checkpoint('T3 beam carried');
      require(await bot.use(initial.x, initial.z, 'help carry the beam', /^Help carry$/), 'Help carry offered');
      await until(() => interactTarget()?.id === 'railway-beam-help-release', 'helper grip activated', 5000);
      mark('T3 beam helper joined');
      let shown = false;
      let stoppedAt = performance.now();
      let lastCarrier = { x: initial.x, z: initial.z };
      const deadline = performance.now() + 120000;
      while (!laid() && performance.now() < deadline) {
        const p = carrier();
        require(p && !me.swimming, 'helper follows a fresh dry carrier');
        if (Math.hypot(p!.x - lastCarrier.x, p!.z - lastCarrier.z) > 0.1) {
          stoppedAt = performance.now();
          lastCarrier = { x: p!.x, z: p!.z };
        }
        face(p!.x, p!.z);
        if (Math.hypot(p!.x - me.body!.position.x, p!.z - me.body!.position.z) > 2.1) input.keys.add('KeyW');
        else input.keys.delete('KeyW');
        if (interactTarget()?.id === 'railway-beam-help') bot.press();
        // In a targeted photo the carrier freezes after finishing its short leg. Keep following until that
        // stop is observed, rather than freezing as soon as its moving presence first crosses the threshold.
        const photoReady =
          query.get('railStop') !== 'T3 helped beam carried' ||
          (performance.now() - stoppedAt >= 250 &&
            Math.hypot(p!.x - me.body!.position.x, p!.z - me.body!.position.z) <= 2.5);
        if (!shown && photoReady && Math.hypot(p!.x - LINE1_GREAT_TREE.x / 100, p!.z - LINE1_GREAT_TREE.z / 100) >= 9) {
          require(interactTarget()?.id === 'railway-beam-help-release', 'helper grip remains active after moving');
          require(R.beam(R.rw()).holder === holder &&
            R.railBack().carry === 0 &&
            R.railBack().stone === 0, 'helper has an empty back and no second beam claim');
          shown = true;
          await checkpoint('T3 helped beam carried');
        }
        await bot.wait(40);
      }
      input.keys.delete('KeyW');
      require(shown, 'helper moved with the held beam');
      await until(laid, 'friend delivered unique beam');
    }
    if (beamFirst) {
      require(job(2).start < 0, 'the beam alone does not feed T3');
      await checkpoint('T3 beam seated');
      await t3Logs();
    }
    await until(() => job(2).start >= 0, beamFirst ? 'the 40th log starts the feed' : 'the beam starts the feed');
    await checkpoint('T3 funded');
    await ride(2);
    await until(() => job(2).completion === 1, 'T3 laid once', LAYING_MS);
    panels(3);
    require(R.beam(R.rw()).state === 'used' && job(2).used === 40, 'single beam and 40 logs embodied');
    require(read().reward.claims === 2, 'only T1 and T2 personal boxes earned');
    const counts = R.railCounts(R.rw());
    require(counts.total === LINE1_INITIAL[0] + counts.produced, 'counted logs conserve initial supply and renewal');
    require(counts.stone &&
      counts.stone.total === RAIL_STONE + counts.stone.produced, 'counted stone conserves initial supply and renewal');
    await checkpoint('T3 laid');
    require(!R.rail(R.rw()).jump, 'walk home does not need optional jump');
    const access = railAt(116);
    await walk(access.x + layout.ORIGIN.x, access.z, 0.8);
    await walkTrack(116, 191);
    mark('path camp reached');
    await walkTrack(191, 30);
    mark('path joined village stub');
    // The moving machine is not in the ground planner's static obstacle map. Walk its clear grass side explicitly.
    const join = railAt(30);
    const village = railAt(14);
    const bypass = [
      { x: join.x + layout.ORIGIN.x, z: join.z },
      { x: join.x + layout.ORIGIN.x - join.uz * 4, z: join.z + join.ux * 4 },
      { x: village.x + layout.ORIGIN.x - village.uz * 4, z: village.z + village.ux * 4 },
      { x: village.x + layout.ORIGIN.x, z: village.z },
    ];
    const walkBypass = async (points: typeof bypass) => {
      for (const point of points) {
        require(await bot.straight(point.x, point.z, 0.5, 12000), 'walked a clear waypoint beside the parked machine');
        await until(() => me.coyote > 0 && !me.swimming, 'parked-machine bypass remains dry and supported', 5000);
      }
    };
    await walkBypass(bypass.slice(1));
    await checkpoint('path walked home');
    require(!R.rail(R.rw()).jump, 'walk home completed before jump discovery');
    await walkBypass([...bypass].reverse().slice(1));
    require(Math.abs(me.body!.position.y - PLAYER_R - layout.railY(line.line, 30)) <
      1, 'village stub rejoins the new deck');
    mark('path returned to village join');
    await walkTrack(30, 191);
    mark('path walked back');
    // The completed path reaches the first pillar's authored lip without spending the optional ability.
    await walkTrack(191, 92);
    const { PILLARS } = await import('../../../src/place/tech-layout.ts');
    const pillar = PILLARS[0]!;
    require(pillar.lipTo, 'first pillar has its walkable approach');
    const approach = { x: pillar.x - pillar.lipTo!.x, z: pillar.z - pillar.lipTo!.z };
    const length = Math.hypot(approach.x, approach.z);
    const forward = { x: approach.x / length, z: approach.z / length };
    const slot = (side: number) => ({
      x: pillar.x + layout.ORIGIN.x + forward.x * 0.65 - forward.z * side * 1.35,
      z: pillar.z + forward.z * 0.65 + forward.x * side * 1.35,
    });
    const ownSlot = slot(second ? -1 : 1);
    const friendSlot = slot(second ? 1 : -1);
    const friendAt = (point: { x: number; z: number }) =>
      [...peers].some(
        ([peer, p]) =>
          remotes.has(peer) &&
          Math.hypot(p.x - point.x, p.z - point.z) < 0.8 &&
          Math.abs(p.y - PLAYER_R - pillar.top) < 0.5,
      );
    // Clear the single-width entry before the second player crosses it.
    if (second) await until(() => friendAt(friendSlot), 'friend clears the first-pillar entry lip');
    require(await bot.straight(
      pillar.lipTo!.x + layout.ORIGIN.x,
      pillar.lipTo!.z,
      0.4,
      6000,
    ), 'walked from completed rail to first-pillar lip');
    require(await bot.straight(ownSlot.x, ownSlot.z, 0.4, 6000), 'walked the lip onto the first pillar');
    await until(() => me.coyote > 0 && !me.swimming, 'first pillar supports the player');
    if (!second) require(!R.rail(R.rw()).jump, 'first pillar reached before optional jump discovery');
    mark('first pillar reached');
    if (coop && !second)
      await until(() => friendAt(friendSlot), 'friend reaches the first pillar before shared discovery');
    if (!second) {
      const device = read().reward.jumpDevice;
      require(await bot.use(device.x, device.z, 'take the first jump device', /^Take it$/), 'jump device offered');
    }
    await until(() => R.rail(R.rw()).jump, 'shared optional jump accepted');
    // Co-op abilities, option E: the card is the finder's alone; a friend gets a flourish that never stops them.
    if (second) {
      await until(() => read().reward.arrival.seen.includes('jump'), "friend's jump flourish played");
      require(!read().reward.showing, 'no card for a friend’s find');
    } else await dismiss('optional jump reveal');
    mark('optional jump discovered');
    require(await bot.straight(ownSlot.x, ownSlot.z, 0.4, 6000), 'stood clear of the device for the jump');
    await until(() => me.coyote > 0 && me.body!.velocity.y <= 0, 'grounded before jump demonstration');
    const jumpsBefore = read().reward.tools.jumps;
    pressJump();
    await until(() => me.coyote <= 0 && me.body!.velocity.y > 0, 'ordinary first jump leaves the pillar', 3000);
    releaseJump();
    await bot.wait(180);
    pressJump();
    await until(() => read().reward.tools.jumps === jumpsBefore + 1, 'second press uses the optional air jump', 3000);
    releaseJump();
    await until(
      () => me.coyote > 0 && me.body!.velocity.y <= 0 && !me.swimming,
      'air jump lands dry on first pillar',
      6000,
    );
    require(Math.abs(me.body!.position.y - PLAYER_R - pillar.top) < 1, 'air jump returns to the same pillar');
    // The railway's ops are Server kind, never in the lockstep registry: ask the state.
    require(!R.rail(R.rw()).glide && !read().glider.owned, 'the glider is not granted after line one');
    await checkpoint('optional jump used');
    if (query.get('line2') === '0') {
      document.documentElement.dataset.railwayProof = 'done';
      bot.finish('T1/T2/T3, unique beam, both path walks and first optional jump');
      return;
    }
    // ---------------------------------------------------------------- line two, walking only: no further jumps
    let jumpsAtLine2 = read().reward.tools.jumps;
    const noJump = (beat: string) =>
      require(read().reward.tools.jumps === jumpsAtLine2, `${beat} needed no extra air jump`);
    const v2 = () => read().line2View;
    const quarry = layout.LINKS[1]!;
    const qAt = (s: number) => layout.lineAt(quarry.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    /** Wait for the depot cart's load: when it comes, it was seen on its way and unloading at the rack. */
    const cartBrings = async (beat: string, done: () => boolean) => {
      if (done()) return;
      const seen = new Set<number>();
      await until(
        () => {
          seen.add(R.cart(R.rw()).phase);
          return done();
        },
        beat,
        CART_MS,
      );
      if (R.rail(R.rw()).depot + R.rail(R.rw()).depotRails > 0)
        require(seen.has(CART_PHASE.RUN) || seen.has(CART_PHASE.DROP), `${beat}: the cart was seen bringing it`);
      mark(`${beat} (the cart unloaded at the rack)`);
    };
    const walkQuarry = (from: number, to: number) => walkQuarryRail(bot, from, to);
    if (second) {
      // The friend stays in the room through line two; the leader plays it. Both peers report hashes per beat.
      // The leader opens the pack (at the forge, or after the lever under botOrder=legacy): the friend's back carries
      // 16 too, and they get the flourish, not the card.
      const friendPack = async () => {
        await until(() => R.rail(R.rw()).pack, 'leader opens the pack', 1800000);
        await bot.wait(1500);
        require(R.carryMax(R.rw()) === 16, "the friend's back carries 16");
        require(read().reward.arrival.seen.includes('pack'), "friend's pack flourish played");
        await checkpoint('pack');
      };
      if (!legacy) await friendPack();
      await until(() => R.line2GateOpen(R.rw()), 'leader opens the quarry gate', 1800000);
      require(hookSeen.size >= 5, `friend saw ${hookSeen.size} distinct hook ring ids`);
      require(remoteCableSeen, 'friend saw a remote hook cable');
      await checkpoint('quarry gate open');
      if (legacy) await friendPack();
      await until(() => R.line2Station(3).completion === 1, 'leader lays Q4', LAYING_MS * 3);
      await checkpoint('Q4 laid');
      await until(() => R.line2Station(4).completion === 1, 'leader lays Q5', LAYING_MS * 3);
      await checkpoint('Q5 laid');
      if (!legacy) {
        // The leader climbs back up and takes the glider: the friend gets the flourish wherever they stand, no card.
        await until(() => R.rail(R.rw()).glide, 'leader takes the glider', LAYING_MS * 3);
        await bot.wait(1500);
        require(read().reward.arrival.seen.includes('glide'), "friend's glider flourish played");
        require(!read().reward.showing, 'no glider card for a friend’s find');
        require(read().glider.owned, 'the friend owns the glider too');
        await checkpoint('glider taken');
      }
      await until(() => R.line2Station(5).completion === 1, 'leader lays Q6', LAYING_MS * 6);
      await checkpoint('Q6 laid');
      // Split-rock: the leader opens the Works and footes the crossing; the friend sees it stand.
      await until(() => (R.works(R.rw()).crossing ?? -1) >= 0, 'leader footes the crossing', LAYING_MS * 40);
      await checkpoint('crossing footed');
      document.documentElement.dataset.railwayProof = 'done';
      await bot.wait(3000);
      logHashes();
      require(!stopAt, `botTo ${botTo} was reached`);
      bot.finish('line one with a friend; line two and the crossing observed');
      return;
    }
    // Back down the pillar lip and home along line one.
    require(await bot.straight(
      pillar.lipTo!.x + layout.ORIGIN.x,
      pillar.lipTo!.z,
      0.4,
      6000,
    ), 'left the pillar by its lip');
    await walkTrack(92, 30);
    await walkBypass(bypass.slice(1));
    mark('line two started');
    const fill = async (max: number = R.carryMax(R.rw())) => {
      let attempts = 0;
      while (R.railBack().carry < max) {
        require(++attempts <= 24, 'found enough reachable logs for line two');
        const p = me.body!.position;
        const candidates = read()
          .trees.filter(
            (tree) => !tree.cleared && tree.remaining > 0 && tree.id !== 28 && tree.id !== 209 && tree.id !== 232,
          )
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        let chosen: RailwayViewInspection['trees'][number] | undefined;
        for (const candidate of candidates.slice(0, 20)) {
          const route = await bot.plan(candidate.x, candidate.z, 2.6);
          if (route.arrives && route.path.every((point) => point.y >= 3)) {
            chosen = candidate;
            break;
          }
        }
        require(chosen, 'a reachable ordinary source exists for line two');
        await walk(chosen!.x, chosen!.z, 2.6);
        face(chosen!.x, chosen!.z);
        for (let swing = 0; swing < 60 && R.railBack().carry < max; swing++) {
          const target = interactTarget();
          if (!target?.click || target.verb !== 'Chop') break;
          bot.press();
          await bot.wait(380);
          if (read().trees.find((source) => source.id === chosen!.id)?.remaining === 0) break;
        }
        await until(() => read().pending === 0, 'line-two harvest settles');
      }
    };
    const forge = v2().forgeFrame;
    // The pack frame: its chest waits by the forge from the forge's first bill. Open it (a back of 16 for everyone).
    const openPack = async () => {
      const packChest = read().reward.tools.packChest;
      require(packChest.available, 'the pack chest waits by the forge');
      await walk(v2().forgeRack.x, v2().forgeRack.z, 3);
      await walk(packChest.x, packChest.z);
      require(await bot.use(packChest.x, packChest.z, 'open the pack chest', /^Open/), 'pack chest offered');
      require(await bot.work(() => R.rail(R.rw()).pack, 5000, 380), 'pack accepted after bounded retries');
      await bot.wait(1200);
      if (read().reward.showing || !coop) await dismiss('pack reveal');
      require(R.carryMax(R.rw()) === 16, 'every back carries 16 with the pack');
      await checkpoint('pack');
    };
    for (let load = 0; R.forge(R.rw()).used < 56; load++) {
      require(load < 12, 'forge bills fill in bounded loads');
      // A player opens the pack as soon as its chest appears, beside the forge they are filling.
      if (!legacy && R.forge(R.rw()).used >= 24 && !R.rail(R.rw()).pack) await openPack();
      await fill(Math.min(R.carryMax(R.rw()), 56 - R.forge(R.rw()).used));
      await walk(forge.x, forge.z, 2.4);
      await until(() => R.railBack().carry === 0 && read().pending === 0, 'forge frame unloads automatically', 20000);
      mark(`forge load ${load + 1} (${R.forge(R.rw()).used}/56)`);
    }
    await until(() => R.forge(R.rw()).lit >= 0, 'forge lit by its second bill');
    await checkpoint('forge lit');
    // The proper axe is the lit forge's first made thing; the hardwoods by it rebound the first axe and fell to it.
    const hardwood = read().trees.find((tree) => tree.id === 209)!;
    await walk(hardwood.x, hardwood.z, 2.6);
    face(hardwood.x, hardwood.z);
    await until(() => interactTarget()?.id === 'place-tree209', 'a hardwood is targeted', 5000);
    bot.press();
    await bot.wait(900);
    require(read().trees.find((tree) => tree.id === 209)?.remaining === 15, 'a hardwood rebounds the first axe');
    mark('hardwood rebounds the first axe');
    const chest = read().reward.axeChest;
    require(chest.available, 'the lit forge offers the proper axe');
    await walk(chest.x, chest.z);
    require(await bot.use(chest.x, chest.z, 'open proper axe chest', /^Open/), 'proper axe chest offered');
    // A single press can be rejected before the host receives the settled Owner position.
    // Repeat ordinary input for a bounded window; acceptance remains the required beat.
    require(await bot.work(() => R.rail(R.rw()).axe, 5000, 380), 'proper axe accepted after bounded retries');
    // Whoever opened it gets the card; a friend gets the flourish.
    await bot.wait(1200);
    if (read().reward.showing || !coop) await dismiss('proper axe reveal');
    else require(read().reward.arrival.seen.includes('axe'), "friend's proper axe flourish played");
    await checkpoint('proper axe earned at the forge');
    await walk(hardwood.x, hardwood.z, 2.6);
    face(hardwood.x, hardwood.z);
    await until(() => interactTarget()?.id === 'place-tree209', 'the hardwood is targeted again', 5000);
    bot.press();
    await until(
      () => (read().trees.find((tree) => tree.id === 209)?.remaining ?? 15) < 15,
      'the proper axe bites a hardwood',
      5000,
    );
    await until(() => read().pending === 0, 'hardwood stroke settles');
    mark('hardwood bites the proper axe'); // its logs ride on to Q1
    await until(() => v2().working, 'machine crosses to line two');
    const rack = v2().forgeRack;
    const takeRails = async (n: number) => {
      await until(
        () => R.forge(R.rw()).rack >= Math.min(n, R.carryMax(R.rw())),
        'forge has poured enough rails',
        60000,
      );
      require(await bot.use(rack.x, rack.z, 'take rails from the forge rack', /^Take rails$/), 'forge rack offered');
      // As with the axe chest, a first press can precede the host's settled Owner position: repeat ordinary input.
      require(await bot.work(() => R.railBack().rails > 0, 5000, 380), 'rails accepted after bounded retries');
      await until(() => read().pending === 0, 'rails accepted onto the back');
    };
    const deliver = async (k: number, frameAt: { x: number; z: number }) => {
      await walk(frameAt.x, frameAt.z, 2.4);
      await until(
        () => (R.railBack().carry === 0 && R.railBack().rails === 0) || R.line2Station(k).start >= 0,
        `Q${k + 1} frame unloads automatically`,
        20000,
      );
      await until(() => read().pending === 0, 'unload settles');
    };
    // Q1, by hand beside the turntable: 16 logs and 6 rails.
    const q1 = v2().frames[0]!;
    while (R.line2Station(0).start < 0 && R.line2Station(0).stock < 16) {
      await fill(Math.min(R.carryMax(R.rw()), 16 - R.line2Station(0).stock));
      await deliver(0, q1);
    }
    await takeRails(6);
    await deliver(0, q1);
    await until(() => R.line2Station(0).start >= 0, 'Q1 funded from logs and rails');
    await checkpoint('Q1 funded');
    await until(() => R.line2Station(0).completion === 1, 'Q1 laid once', LAYING_MS);
    await checkpoint('Q1 laid');
    // Q2 and Q3: logs from the depot rack by the frame, rails from the forge by hand.
    const viaTrack = async (frameAt: { x: number; z: number }) => {
      // Q3's frame is across the gorge: walk the finished Q2 trestle.
      const start = qAt(10);
      await walk(start.x + layout.ORIGIN.x, start.z, 1);
      // The depot cart runs this track too and would shove a walker off the trestle: set out while it is on line one
      // (home, resting or loading at the camp), which leaves it at least a leg's run behind.
      const home = [CART_PHASE.HOME, CART_PHASE.REST, CART_PHASE.LOAD] as number[];
      await until(() => home.includes(R.cart(R.rw()).phase), 'the cart is off the quarry track', CART_MS);
      await walkQuarry(10, 112);
      // The parked machine fills the track's end: step off on the frame's side, clear of its body.
      const off = besideQ(112, frameAt);
      require(await bot.straight(off.x, off.z, 0.6, 8000), 'stepped off the track beside the parked machine');
      await walk(frameAt.x, frameAt.z, 2.4);
    };
    function besideQ(s: number, toward: { x: number; z: number }) {
      const p = qAt(s);
      const x = p.x + layout.ORIGIN.x,
        z = p.z;
      const side = Math.sign(-p.uz * (toward.x - x) + p.ux * (toward.z - z)) || 1;
      return { x: x - p.uz * side * 4.5, z: z + p.ux * side * 4.5 };
    }
    const homeFromQuarry = async () => {
      const p = me.body!.position;
      if (p.x - layout.ORIGIN.x < -10) return;
      // Home on foot over the table and the quarry path's bridge; the trestle end is a drop, not a step.
      await walk(rack.x, rack.z, 3);
    };
    for (const k of [1, 2]) {
      const frameAt = v2().frames[k]!;
      const bill = [0, 24, 16][k]!,
        rails = [0, 12, 12][k]!;
      if (k === 2) await viaTrack(frameAt);
      while (R.line2Station(k).start < 0 && R.line2Station(k).stock < bill) {
        // The cart runs on the server's clock (a round trip of 70-90 s); the warped page clock can run ~9x faster.
        await cartBrings(`Q${k + 1} depot brings logs`, () => R.rail(R.rw()).depot > 0);
        const depot = v2().depot!;
        const stockBefore = R.line2Station(k).stock;
        require(await bot.use(depot[0]!, depot[2]!, 'take depot logs', /^Pick up$/), 'depot rack offered');
        // Confirmed within a round trip now, the logs can already have unloaded into the frame beside the rack.
        require(await bot.work(
          () => R.railBack().carry > 0 || R.line2Station(k).stock > stockBefore,
          5000,
          380,
        ), 'depot logs accepted after bounded retries');
        await until(() => read().pending === 0, 'depot logs settle');
        await walk(frameAt.x, frameAt.z, 2.4);
        await until(() => R.railBack().carry === 0 && read().pending === 0, `Q${k + 1} logs unload`, 20000);
      }
      mark(`Q${k + 1} logs delivered`);
      while (R.line2Station(k).start < 0 && R.line2Station(k).railStock < rails) {
        if (k === 2) await homeFromQuarry();
        await takeRails(rails - R.line2Station(k).railStock);
        if (k === 2) await viaTrack(frameAt);
        await deliver(k, frameAt);
      }
      await until(() => R.line2Station(k).start >= 0, `Q${k + 1} funded`);
      await checkpoint(`Q${k + 1} funded`);
      await until(() => R.line2Station(k).completion === 1, `Q${k + 1} laid once`, LAYING_MS);
      await checkpoint(`Q${k + 1} laid`);
      if (k === 1) {
        // The hook walk: from the finished deck near s=92 up the broad sloped walkway to pillar p2.
        require(v2()
          .routes.filter((r) => r.kind === 'hook')
          .every((r) => r.visible && r.solid), 'hook walk built by Q2');
        const deck = qAt(84);
        await walk(deck.x + layout.ORIGIN.x, deck.z, 1);
        await walkQuarry(84, 92);
        await approachNeedleBell(bot);
        noJump('hook walk');
        const hook = v2().hook;
        require(hook.available, 'hook device available after Q2');
        require(await bot.use(hook.x, hook.z, 'take the hook device', /^Take it$/), 'hook device offered');
        require(await bot.work(() => R.rail(R.rw()).hook, 5000, 380), 'shared hook accepted after bounded retries');
        // Whoever took it gets the card; a friend who got there second gets the flourish.
        await bot.wait(1200);
        if (read().reward.showing || !coop) await dismiss('hook reveal');
        else require(read().reward.arrival.seen.includes('hook'), "friend's hook flourish played");
        await until(() => read().hookShot.pulls > 0, 'hook demo starts after the card', 5000);
        await hookLanding(bot, 't0');
        aimHook('t1');
        await until(() => read().hookShot.pick === 't1', `first climb ring picked: ${hookWhyNot('t1')}`, 3500);
        await checkpoint('hook taken');
        await climbNeedleBell(bot, async (id) => {
          if (id === 't2' && query.get('hookReload') === '1') {
            await bot.wait(5500); // Let the ordinary safe-ground pose writer save this actual landing.
            aimHook('t3');
            await until(() => read().hookShot.pick === 't3', `reload pull picked t3: ${hookWhyNot('t3')}`, 3500);
            triggerAction('hook', 'down');
            triggerAction('hook', 'up');
            await bot.wait(100);
            require(read().hookShot.pulling &&
              read().hookShot.ring === 't3', 'reload happens during the t2 to t3 pull');
            sessionStorage.setItem(HOOK_RELOAD_KEY, JSON.stringify({ stage: 'hook', pid: read().pid }));
            location.reload();
            await new Promise<void>(() => {});
          }
        });
        noJump('hook climb');
        await checkpoint('needle bell summit');
        const sealed = v2().glideDevice;
        require(!sealed.available && !sealed.woken && !R.rail(R.rw()).glide, 'the summit glider is sealed before Q5');
        const drop = query.get('hookDrop');
        if (drop === 't3' || drop === 'summit') {
          await dropFromTower(bot, drop);
          bot.finish(`hook drop ${drop} walked home without recovery`);
          return;
        }
        if (!legacy) {
          // The sea switch stands beside you on the first climb: a player pulls it now (seaToFarHead's pull).
          const sea = v2().sea;
          await walk(sea.x, sea.z, 0.8);
          await until(() => interactTarget()?.id === 'railway-sea-switch', 'summit offers railway-sea-switch', 5000);
          require(await bot.use(sea.x, sea.z, 'pull sea switch', /^Pull$/), 'sea switch offered');
          require(await bot.work(() => R.line2SeaOpen(R.rw()), 5000, 380), 'sea switch accepted');
          await until(() => R.line2SeaOpen(R.rw()) && !v2().seaGateSolid, 'sea gate collider removed');
          await checkpoint('sea gate');
        }
        await downFromNeedleBell(bot, noJump);
        if (query.get('earlyLedge') === '1') {
          // Before Q3: reach the apron with the optional double jump; the uncoupled lever must do nothing.
          const [, top] = v2().routePoints.quarry;
          const leverAt = v2().lever;
          const edge = { x: top![0]!, z: top![2]! + 2.2 };
          await walkQuarry(92, 112);
          const off = besideQ(112, edge);
          require(await bot.straight(off.x, off.z, 0.6, 8000), 'stepped off beside the parked machine');
          await walk(edge.x, edge.z, 1);
          face(top![0]!, top![2]! - 2);
          require(!v2().drive &&
            v2().routes.every((r) => r.kind !== 'quarry' || !r.solid), 'no ramp or drive before Q3');
          input.keys.add('KeyW');
          pressJump();
          await bot.wait(260);
          releaseJump();
          await bot.wait(120);
          pressJump();
          await bot.wait(200);
          releaseJump();
          await until(() => me.coyote > 0 && me.body!.velocity.y <= 0, 'landed after the early double jump', 6000);
          input.keys.delete('KeyW');
          require(Math.abs(me.body!.position.y - PLAYER_R - top![1]!) < 0.6, 'reached the apron early by jumping');
          require(await bot.use(leverAt.x, leverAt.z, 'try the uncoupled lever', /^Pull$/), 'lever reachable early');
          await bot.wait(1500);
          require(!R.rail(R.rw()).lever &&
            !R.line2GateOpen(R.rw()) &&
            v2().gateSolid, 'early pull does nothing before Q3');
          await checkpoint('early lever does nothing');
          require(await bot.straight(top![0]!, top![2]! + 4, 0.6, 6000), 'stepped off the apron');
          await until(() => me.coyote > 0, 'landed beside the apron', 6000);
          jumpsAtLine2 = read().reward.tools.jumps; // the early probe is separate from the walking route
        }
      }
    }
    // Q3 done: the quarry ramp, the coupled drive and the lever.
    require(v2().drive, 'Q3 connects the winch drive');
    require(v2()
      .routes.filter((r) => r.kind === 'quarry')
      .every((r) => r.visible && r.solid), 'quarry ramp built by Q3');
    const [low, high] = v2().routePoints.quarry;
    await walk(low![0]!, low![2]! + 2, 1.5);
    require(await bot.straight(low![0]!, low![2]!, 0.6, 10000), 'reached the foot of the quarry ramp');
    require(await bot.straight(high![0]!, high![2]! - 1, 0.6, 10000), 'walked up the quarry ramp');
    await until(
      () => me.coyote > 0 && Math.abs(me.body!.position.y - PLAYER_R - high![1]!) < 0.6,
      'standing on the apron',
    );
    noJump('quarry ramp');
    const lever = v2().lever;
    require(await bot.use(lever.x, lever.z, 'pull the quarry lever', /^Pull$/), 'lever offered');
    require(await bot.work(
      () => R.line2GateOpen(R.rw()),
      5000,
      380,
    ), 'quarry gate opens with Q3 complete and the lever pulled');
    await until(() => !v2().gateSolid, 'gate slab collider removed');
    await checkpoint('quarry gate open');
    // botOrder=legacy: the pack only now, home on foot after the lever.
    if (legacy) {
      await walk(rack.x, rack.z, 3);
      await openPack();
    }
    // Q4, behind the gate now down: the depot cart brings its logs to the rack and its rails from the forge rack to
    // the shelf beside it; one back of 16 takes a load of each to the frame.
    const q4 = v2().frames[3]!;
    const toQ4 = async () => {
      const route = await bot.plan(q4.x, q4.z, 2.4);
      if (route.arrives) return walk(q4.x, q4.z, 2.4);
      // Otherwise along the laid line: the Q2 trestle and Q3's stretch to the quarry, then off beside the frame.
      const start = qAt(10);
      await walk(start.x + layout.ORIGIN.x, start.z, 1);
      await walkQuarry(10, 172);
      const off = besideQ(172, q4);
      require(await bot.straight(off.x, off.z, 0.6, 8000), 'stepped off the track beside Q4');
      await walk(q4.x, q4.z, 2.4);
    };
    // botOrder=legacy: out to Q4 on the depot cart: wait beside the turntable stop while it takes the forge's rails
    // (no call handle since 9 November), board it by a real jump and ride it to the rack. A player walks from the
    // lever to Q4 and waits there for the cart's loads.
    if (legacy) {
      const aboardCart = () => carry.on?.id === 'railway:cart';
      const stop = besideQ(0, rack);
      await walk(stop.x, stop.z, 1.6);
      await until(() => R.cart(R.rw()).phase === CART_PHASE.FORGE, 'the cart comes to the forge', CART_MS);
      // A loaded cart stands about 2 m tall: up with the optional double jump, as Place's porter boards it.
      const boardBy = performance.now() + 15000;
      while (!aboardCart() && performance.now() < boardBy && R.cart(R.rw()).phase === CART_PHASE.FORGE) {
        const c = v2().cart;
        face(c.x, c.z);
        input.keys.add('KeyW');
        if (me.coyote > 0) {
          pressJump();
          await bot.wait(120);
          releaseJump();
          await bot.until(() => me.body!.velocity.y <= 0.5 || aboardCart(), 1500);
          if (!aboardCart()) {
            face(c.x, c.z);
            pressJump();
            await bot.wait(120);
            releaseJump();
          }
        }
        await bot.wait(200);
      }
      input.keys.delete('KeyW');
      require(aboardCart(), 'boarded the cart by real jump');
      await checkpoint('cart ride');
      let stayed = true;
      await until(
        () => {
          stayed &&= aboardCart() && !me.swimming;
          return R.cart(R.rw()).phase === CART_PHASE.DROP;
        },
        'the cart reaches the Q4 rack',
        CART_MS,
      );
      require(stayed, 'rider stayed aboard the cart all the way');
      await checkpoint('cart at the rack');
      {
        const s = v2().cart.along / 100 - 196; // metres along line two (the forge stop is 196 m along its road)
        const off = besideQ(Math.round(s), q4);
        require(await bot.straight(off.x, off.z, 0.6, 8000), 'stepped off the cart beside the track');
      }
    }
    await toQ4();
    const q4Job = () => R.line2Station(3);
    for (let trip = 0; q4Job().start < 0; trip++) {
      require(trip < 8, 'Q4 funds in bounded trips');
      await cartBrings(
        'Q4 depot brings a load',
        () => R.rail(R.rw()).depot > 0 || R.rail(R.rw()).depotRails > 0 || q4Job().start >= 0,
      );
      if (q4Job().start >= 0) break;
      if (R.rail(R.rw()).depot > 0) {
        const depot = v2().depot!;
        const before = R.railBack().carry;
        require(await bot.use(depot[0]!, depot[2]!, 'take Q4 depot logs', /^Pick up$/), 'Q4 depot rack offered');
        require(await bot.work(
          () => R.railBack().carry > before || q4Job().stock > 0,
          5000,
          380,
        ), 'Q4 depot logs accepted');
        await until(() => read().pending === 0, 'Q4 depot logs settle');
      }
      const shelf = v2().shelf;
      if (R.rail(R.rw()).depotRails > 0 && shelf) {
        const before = R.railBack().rails;
        require(await bot.use(shelf.x, shelf.z, 'take Q4 shelf rails', /^Take rails$/), 'Q4 rails shelf offered');
        require(await bot.work(
          () => R.railBack().rails > before || q4Job().railStock > 0,
          5000,
          380,
        ), 'Q4 shelf rails accepted');
        await until(() => read().pending === 0, 'Q4 shelf rails settle');
      }
      await walk(q4.x, q4.z, 2.4);
      await until(
        () =>
          (R.railBack().carry === 0 &&
            (R.railBack().rails === 0 || q4Job().railStock === 16) &&
            read().pending === 0) ||
          q4Job().start >= 0,
        'Q4 frame unloads automatically',
        30000,
      );
      mark(`Q4 trip ${trip + 1} (${q4Job().stock}/16 logs, ${q4Job().railStock}/16 rails)`);
    }
    await until(() => q4Job().start >= 0, 'Q4 funded');
    await checkpoint('Q4 funded');
    await until(() => q4Job().completion === 1, 'Q4 laid once', LAYING_MS);
    await checkpoint('Q4 laid');
    if (legacy) {
      await seaToFarHead({ bot, checkpoint, walkQuarry, quarryFrom: 172 });
      await boilerToPier({ bot, checkpoint, walkQuarry });
    } else {
      // The switch was pulled on the first climb: no second climb before Q5. After Far Head, back up Needle Bell
      // for the glider and fly home to the boiler.
      await seaToFarHead({ bot, checkpoint, walkQuarry, quarryFrom: 172 }, 'q5');
      await glideHome({ bot, checkpoint, walkQuarry }, 'far-head');
      await boilerToPier({ bot, checkpoint, walkQuarry }, 'boiler');
    }
    await splitRockToCrossing({ bot, checkpoint, walkQuarry });
    const totals = R.railCounts(R.rw());
    require(totals.rails && totals.rails.total === totals.rails.poured, 'rails conserve the forge pour');
    require(totals.total === LINE1_INITIAL[0] + totals.produced, 'logs conserve through line two');
    document.documentElement.dataset.railwayProof = 'done';
    if (coop) {
      await bot.wait(3000);
      logHashes();
    }
    require(!stopAt, `botTo ${botTo} was reached`);
    bot.finish('line one, forge, Q1-Q6, Needle Bell, boiler, train rides, the pier and the crossing footed');
  } catch (error) {
    if (error instanceof RouteStop) {
      input.keys.clear();
      releaseJump();
      if (coop) {
        // Let the peer reach the same beat before the witness is written.
        await bot.wait(3000);
        logHashes();
      }
      bot.finish(`segment complete: botTo ${botTo} (${error.message})`);
      return;
    }
    document.documentElement.dataset.railwayProof = 'failed';
    bot.never(`production line1 stopped: ${error instanceof Error ? error.message : String(error)}`);
    console.log(
      `RAILWAY FAILURE ${JSON.stringify({
        ...inspectRailway(),
        rows: R.railRead()?.world().snapshot(),
        player: {
          position: me.body?.position,
          velocity: me.body?.velocity,
          coyote: me.coyote,
          swimming: me.swimming,
          aboard: carry.on?.id ?? null,
        },
      })}`,
    );
    if (query.has('hookDrop')) (window as Window & { __placeDone?: boolean }).__placeDone = true;
    throw error;
  } finally {
    input.keys.delete('KeyW');
    input.keys.delete('ShiftLeft');
    releaseJump();
    if (typeof offPresence === 'function') offPresence();
    clearInterval(sampler);
  }
}
