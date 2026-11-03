// The bot for ?proto=place, `shot=play` in ./../evals/place-job.ts: plays the whole round with real input, at a person's pace.
// `npm run playthrough` runs it. Moving about, notes and checks are ../bot.ts; this is only what this round asks of you. A new
// beat goes here: say what you expect with `bot.until(..., what)`, so a beat that doesn't come is on the record.
import { makeBot, type Bot } from '../bot.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { cam, me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { carry, type Platform } from '../../../src/physics/platforms.ts';

const q = new URLSearchParams(location.search);

export async function play() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const place = window.__place as any;
  const bot = makeBot({ recover: () => place.backUp() });
  const { note, wait, now, press } = bot;
  const body = me.body!;
  const O = place.ORIGIN.x;
  const [L1, L2] = place.lines;
  const go = (x: number, z: number, r = 1.2, limit = 0) => bot.walk(x, z, r, { limit });
  const travel = go;
  const waitFor = (fn: () => unknown, ms = 60000, what = '') => bot.until(fn, ms, what);
  const lobe = (x: number, z: number) => {
    const a = (Math.atan2(x - O - 8, -(z + 10)) * 180) / Math.PI;
    return a > -38 && a < 16 ? 'n' : a > -164 && a < -38 ? 'w' : 'e';
  };
  const unreachable = new Set<unknown>();
  const standing = (t: { fall: number; great?: boolean }) => t.fall < 0 && !t.great && !unreachable.has(t);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nearestOf = (list: any[], ok: (t: any) => boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let best: any = null,
      bd = Infinity;
    for (const t of list) {
      if (!ok(t)) continue;
      const d = Math.hypot(t.x - body.position.x, t.z - body.position.z);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  };
  const openCrates = async () => {
    for (const c of place.giftState.crates()) {
      if (c.content !== 'gift') continue; // a find stays where it's hidden: `tour`, below
      if (Math.hypot(c.x - body.position.x, c.z - body.position.z) > 60) continue;
      const before = place.giftState.count();
      await travel(c.x, c.z, 1);
      if (Math.hypot(c.x - body.position.x, c.z - body.position.z) > 3) {
        // Past the machine, off the deck: down from the track and across.
        place.backUp();
        await wait(400);
        await go(c.x, c.z, 1, 8000);
      }
      const t = performance.now();
      while (place.giftState.count() === before && performance.now() - t < 3000) await wait(50);
      note(`opened: ${c.content}`);
      await wait(2200);
    }
  };
  const chopUntil = async (fn: () => boolean) => {
    while (!fn() && place.back.room() > 0) {
      const t = nearestOf(place.TREES, standing);
      if (!t) {
        note('NO TREES LEFT');
        await wait(5000);
        return;
      }
      if (!(await travel(t.x, t.z, 2.6))) {
        unreachable.add(t);
        continue;
      }
      while (t.fall < 0 && !fn() && place.back.room() > 0) {
        press();
        await wait(380); // a person, not a machine
      }
      await wait(150);
    }
  };
  const bill = async (st: {
    x: number;
    z: number;
    spec: { id: string };
    wants: (g: string) => number;
    full: () => boolean;
  }) => {
    const started = now();
    const b = place.back;
    let guard = 0;
    while (!st.full() && place.activeFrame() === st && guard++ < 200) {
      await openCrates();
      if (st.wants('beam') > 0 && st.wants('logs') - b.logs <= 0 && !b.big && b.logs === 0) {
        const g = place.greatTree;
        if (g.fall < 0) {
          note('the great tree');
          await travel(g.x, g.z, 3.6);
          while (g.fall < 0) {
            press();
            await wait(380);
          }
          note('felled it');
          await wait(1800);
        }
        await go(g.x + Math.sin(g.fallYaw) * 5, g.z + Math.cos(g.fallYaw) * 5, 4);
        press();
        await wait(300);
        await go(st.x, st.z, 3);
        await wait(1200);
        continue;
      }
      if (st.wants('stone') - b.stone > 0 && b.room() > 0) {
        const r = nearestOf(place.ROCK_LIST, (q: { strokes: number }) => q.strokes < 4);
        if (r) {
          await travel(r.x, r.z, 2.8);
          while (r.strokes < 4 && st.wants('stone') - b.stone > 0 && b.room() > 0) {
            press();
            await wait(380);
          }
          await wait(300);
        }
      }
      if (st.wants('rails') - b.rails > 0 && b.room() >= Math.min(st.wants('rails') - b.rails, 8)) {
        if (place.rack.on && place.rack.rails > 0) {
          await travel(place.rack.x, place.rack.z, 2.6);
          press();
          await wait(800);
        } else {
          await travel(place.RACK.x, place.RACK.z, 3.2);
          let w = 0;
          while (place.forge.rails <= 0 && w++ < 100) await wait(200);
          press();
          await wait(800);
          note(`rails on your back: ${b.rails}`);
        }
      }
      if (st.wants('logs') - b.logs > 0 && b.room() > 0) {
        if (place.rack.on && (st as unknown as { spec: { rack?: string } }).spec.rack) {
          await travel(place.rack.x, place.rack.z, 2.6);
          // A delivery lands one log at a time. Taking its first log races the rest of the stream and
          // turns one carry into several trips (and sometimes a whole extra cart cycle).
          const load = Math.min(st.wants('logs') - b.logs, b.room());
          await waitFor(() => place.rack.logs >= load, 60000, `${st.spec.id} rack load of ${load} logs`);
          press();
          await waitFor(() => b.incoming === 0, 3000, `${st.spec.id} logs on the back`);
        } else await chopUntil(() => st.wants('logs') - b.logs <= 0);
      }
      if (b.logs + b.rails + b.stone > 0 || b.big) {
        await travel(st.x, st.z, 3);
        await wait(Math.max(600, 120 * (b.logs + b.rails + b.stone)));
      }
    }
    note(`${st.spec.id} full (${(now() - started).toFixed(1)} s chop and carry)`);
  };
  const lay = async (st: { spec: { id: string } }) => {
    await waitFor(() => place.run.mode === 'laying', 15000, `${st.spec.id} laying`);
    const t = now();
    await waitFor(() => place.run.mode !== 'laying' && place.run.mode !== 'feeding', 90000, `${st.spec.id} laid`);
    note(`${st.spec.id} laid (${(now() - t).toFixed(1)} s)`);
  };
  // ------------------------------------------------------------ the moves: real presses. The walking planner doesn't know them.
  const tech = place.tech;
  const padOf = (id: string) => tech.PADS.find((p: { id: string }) => p.id === id);
  const face = (x: number, z: number) =>
    void (cam.yaw = me.yaw = Math.atan2(-(x - body.position.x), -(z - body.position.z)));
  /** Off the ground and up onto a ledge: jump, near the top jump again, steering at it all the way. */
  const twoJumps = async (x: number, z: number) => {
    face(x, z);
    input.keys.add('KeyW');
    await wait(120);
    pressJump();
    await wait(330);
    releaseJump();
    await wait(30);
    pressJump();
    const t = performance.now();
    await wait(160);
    releaseJump();
    while (performance.now() - t < 1700 && bot.dist(x, z) > 0.8) {
      face(x, z);
      await wait(30);
    }
    input.keys.delete('KeyW');
    await wait(350);
  };
  const hookTo = async (id: string) => {
    const r = tech.RINGS.find((x: { pad: { id: string } }) => x.pad.id === id);
    face(r.at.x, r.at.z);
    // Aimed as a person would: the ring up in the view, not dead centre.
    const up = Math.atan2(r.at.y - (body.position.y + 1.35), bot.dist(r.at.x, r.at.z));
    cam.pitch = Math.min(0.85, up - 0.3);
    await wait(350);
    if (!tech.fireHook())
      bot.never(`a pull to ${id}: picked ${tech.move.pick?.pad.id ?? 'nothing'}, ${tech.whyNot(r)}`);
    await waitFor(() => !tech.move.pull, 5000, `arrived at ${id}`);
    cam.pitch = -0.1;
    await wait(500);
  };
  const takeTech = async (id: 'jump' | 'hook' | 'glide') => {
    const d = tech.devices[id];
    await bot.use(d.x, d.z, `the ${id} device`, /Take/);
    await waitFor(() => place.job.tech[id], 3000, `took ${id}`);
    note(`ability: ${id}`);
    await wait(id === 'hook' ? 3800 : 3000); // its show
  };
  const glideTo = async (x: number, z: number, limit = 90000) => {
    // Walk off the edge towards it; open as soon as you're off; steer to it, and land.
    face(x, z);
    input.keys.add('KeyW');
    let t = performance.now();
    while (me.coyote > 0 && performance.now() - t < 5000) {
      face(x, z);
      await wait(30);
    }
    await wait(150);
    tech.toggleGlide();
    t = performance.now();
    const y0 = body.position.y;
    while (me.coyote <= 0 && performance.now() - t < limit && !me.swimming) {
      face(x, z);
      await wait(40);
    }
    input.keys.delete('KeyW');
    const off = bot.dist(x, z);
    note(
      `glided ${Math.round(y0 - body.position.y)} m down, ${((performance.now() - t) / 1000).toFixed(1)} s, ${Math.round(off)} m from where it was going`,
    );
    bot.check(`a glide that reached (${x.toFixed(0)}, ${z.toFixed(0)}), ${off.toFixed(0)} m off`, off < 25);
    await wait(500);
  };
  const stem = 92; // where each line passes its pillar
  const deck = (l: { spec: { line: { xs: Float32Array; zs: Float32Array } } }) => ({
    x: l.spec.line.xs[stem]! + O,
    z: l.spec.line.zs[stem]!,
  });
  const firstDevice = async () => {
    const d1 = deck(L1);
    await bot.walk(d1.x, d1.z, 1.2);
    await takeTech('jump');
    // The block beside it, straight away.
    const b = padOf('p1-block');
    await bot.walk(b.x + O + 3.2, b.z, 0.8);
    await twoJumps(b.x + O, b.z);
    await waitFor(() => tech.found.has('block'), 5000, 'the box on the block');
    await wait(2500);
    await bot.straight(d1.x, d1.z, 1.2, 5000); // back down onto the deck
  };
  const ontoSecondPillar = async () => {
    const d2 = deck(L2);
    await bot.walk(d2.x, d2.z, 1);
    const p = padOf('p2');
    await twoJumps(p.x + O, p.z);
    bot.check('the second jump up onto the second pillar', body.position.y > p.top);
  };
  const secondDevice = async () => {
    await ontoSecondPillar();
    await takeTech('hook'); // and it pulls you over to the first slab, where a box is waiting: you land on it
    await waitFor(() => tech.found.has('firstpull'), 3000, "the first slab's box");
    await wait(2500);
    await hookTo('p2');
    const d2 = deck(L2);
    await bot.straight(d2.x, d2.z, 1.2, 4000);
  };
  const firstGate = async () => {
    const a = padOf('apron');
    await bot.walk(a.x + O, a.z + a.hz + 2.1, 1);
    await twoJumps(a.x + O, a.z);
    await bot.use(tech.LEVER.x + O, tech.LEVER.z, 'the lever', /Pull/);
    await waitFor(() => place.job.gate.quarry, 3000, 'the quarry slab');
    note('gate: the quarry');
    await wait(2000);
    await bot.straight(a.x + O, a.z + a.hz + 3, 1.5, 3000); // off the ledge
  };
  const climb = async () => {
    await ontoSecondPillar();
    for (const id of ['t0', 't1', 't2', 't3', 't4', 't5', 'summit']) await hookTo(id);
    note('at the top');
    await takeTech('glide');
    await waitFor(() => place.job.gate.sea, 8000, 'the sea slab');
    note('gate: the sea');
  };
  /** Everything hidden that the run didn't pass through, to show it can be had: put near it, then the real move. */
  const tour = async () => {
    for (const s of tech.SECRETS) {
      if (tech.found.has(s.id)) continue;
      const at = s.from;
      teleport(body, at.x + O, (at.y ?? place.H(at.x + O, at.z)) + 1.3, at.z);
      body.velocity.set(0, 0, 0);
      await wait(900);
      if (s.how === 'walk') await bot.walk(s.x + O, s.z, 0.8);
      else if (s.how === 'jump') await twoJumps(s.x + O, s.z);
      else if (s.how === 'hook') await hookTo(s.id === 'firstpull' ? 't0' : s.id);
      else await glideTo(s.x + O, s.z);
      await bot.straight(s.x + O, s.z, 0.9, 2500);
      await waitFor(() => tech.found.has(s.id), 3000, `the secret ${s.id}, by ${s.how}`);
      note(`found ${s.id} (${s.how})`);
      await wait(2200);
    }
  };
  const from = q.get('from');
  note('start');
  if (from === 'path') place.skipPath();
  else if (from === 'line2') place.skipLine2();
  else if (from === 'head') place.skipHead();
  else if (from === 'trains') place.skipTrains();
  if (!from) {
    const path = place.PATH_SAMPLES[0] as number[][];
    for (let n = 0; n < path.length; n += 3) await go(path[n]![0]! + O, path[n]![1]!, 1.8);
    await go(place.machine.flatbed.x, place.machine.flatbed.z, 5);
    note('at the machine');
    await wait(500);
    press();
    await waitFor(() => place.run.mode === 'idle', 8000);
    note('woke');
    for (const st of L1.stations) {
      await bill(st);
      await lay(st);
    }
    note(`FIRST PATH OPEN at ${now().toFixed(1)}`);
    await wait(6000);
    await firstDevice();
  }
  if (from === 'path' || !from) {
    await openCrates();
    if (place.job.chest) {
      const c = place.giftState.crates().find((x: { content: string }) => x.content === place.job.chest);
      note('walking home');
      await travel(c.x, c.z, 1);
      await wait(2500);
      note(`rung: axe ${place.job.rung.axe}`);
    }
    // The forge, two bills.
    await waitFor(() => place.run.mode === 'waiting', 30000);
    note('forge frame is next');
    const fr = place.forgeFrame;
    await bill(fr);
    await waitFor(() => place.job.forgeBill === 1, 8000, 'the forge moved on to its second bill');
    if (place.job.chest) {
      const c = place.giftState.crates().find((x: { content: string }) => x.content === place.job.chest);
      await travel(c.x, c.z, 1);
      await wait(2500);
      note(`rung: pack ${place.job.rung.pack}`);
    }
    await bill(fr);
    await waitFor(() => place.forge.lit, 30000, 'forge lit');
    note('forge lit');
    await waitFor(() => place.run.mode === 'idle', 30000, 'machine on line 2');
    note('machine on line 2');
  }
  if (from !== 'head' && from !== 'trains') {
    for (const st of L2.stations.slice(0, 5)) {
      if (st.spec.gate === 'quarry' && !place.job.gate.quarry) await firstGate();
      if (st.spec.gate === 'sea' && !place.job.gate.sea) {
        await climb();
        await wait(4500);
        await glideTo(st.x, st.z);
      }
      await bill(st);
      await lay(st);
      if (st.spec.id === 'Q2' && !place.job.tech.hook) await secondDevice();
    }
    note(`FAR HEAD OPEN at ${now().toFixed(1)}`);
    await wait(5000);
    await openCrates();
  }
  if (from !== 'trains') {
    const bo = place.boilerAt();
    const t = now();
    await bot.use(bo.x, bo.z, 'the boiler');
    note(`walked home (${(now() - t).toFixed(1)} s)`);
    await wait(300);
    const c = L1.train.tr.cars[0]!.body.position;
    await bot.use(c.x + 3, c.z + 3, 'the old train');
    note('at the old train');
    await waitFor(() => place.job.rung.trains, 8000, 'trains');
    note('TRAINS');
    await wait(5000);
  }
  // Ride home on line 1, then out on line 2, to the pier.
  const onDeck = () => {
    const pl = place.haltUnder();
    return pl;
  };
  const ride = async (
    l: {
      k: number;
      train: { tr: { stop: number; cars: { body: { position: { x: number; z: number } }; platform: Platform }[] } };
    },
    h: { x: number; z: number; stop: number; k: number },
  ) => {
    await travel(h.x, h.z, 1);
    note(`on the platform: ${onDeck()?.name ?? 'no'}, eta ${place.trainEta(l.train.tr, h.stop)}`);
    const callAt = now();
    await waitFor(() => l.train.tr.stop === h.stop, 90000, 'the train coming');
    note(`waited ${(now() - callAt).toFixed(1)} s`);
    const car = l.train.tr.cars[1]!;
    const c = car.body.position;
    face(c.x, c.z);
    pressJump();
    input.keys.add('KeyW');
    await wait(330);
    releaseJump();
    const end = performance.now() + 3500;
    while (carry.on !== car.platform && performance.now() < end) {
      face(c.x, c.z);
      if (bot.dist(c.x, c.z) < 0.5) input.keys.delete('KeyW');
      await wait(40);
    }
    input.keys.delete('KeyW');
    bot.check('aboard the train', carry.on === car.platform);
    note('aboard');
  };
  const halts = place.halts;
  if (lobe(body.position.x, body.position.z) === 'n') {
    const camp = halts.find((h: { name: string }) => h.name === 'Camp');
    await ride(L1, camp);
    const t = now();
    await waitFor(() => L1.train.tr.stop === 0, 60000, 'the ride home');
    note(`rode home (${(now() - t).toFixed(1)} s)`);
    await wait(500);
  }
  const v2 = halts.find((h: { name: string }) => h.name === 'Village, line 2');
  await ride(L2, v2);
  const t2 = now();
  await waitFor(() => L2.train.tr.stop === 2, 120000, 'the ride out');
  note(`rode out to Far Head (${(now() - t2).toFixed(1)} s)`);
  await wait(4000);
  const pier = L2.stations[5];
  await bill(pier);
  await lay(pier);
  note(`THE JOB IS DONE at ${now().toFixed(1)}`);
  // Home the way a person would by now: the train.
  const head = halts.find((h: { name: string }) => h.name === 'Far Head');
  await ride(L2, head);
  await waitFor(() => L2.train.tr.stop === 0, 120000, 'the ride home from Far Head');
  await wait(800);
  await townTour(bot, place);
  await tour();
  bot.finish(
    `$${place.money()}, ${place.job.people} people, ${place.job.score.logs} logs, ${(place.job.score.metres / 1000).toFixed(2)} km`,
  );
}
// The town, after the job, so a visit doesn't move the job's times: in and out of each building with real input, every talk and the
// shop's three presses. `bot.walk` finds the doors by itself.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function townTour(bot: Bot, place: any) {
  const town = place.town;
  const at = (id: string, lx: number, lz: number) => {
    const r = town.rooms[id];
    return {
      x: r.x + lx * Math.cos(r.yaw) + lz * Math.sin(r.yaw),
      z: r.z - lx * Math.sin(r.yaw) + lz * Math.cos(r.yaw),
    };
  };
  const walkIn = async (id: string) => {
    const r = town.rooms[id];
    const q = at(id, 0, r.d / 2 - 1.2);
    await bot.walk(q.x, q.z, 0.8, { limit: 240000 });
    bot.check(`walked into the ${id}`, await bot.until(() => town.indoors.inside?.id === id, 4000));
    bot.note(`in the ${id}`);
  };
  const walkOut = async (id: string) => {
    const r = town.rooms[id];
    const q = at(id, 0, r.d / 2 + 6);
    await bot.walk(q.x, q.z, 1);
    bot.check(`walked out of the ${id}`, town.indoors.inside?.id !== id);
    bot.note(`out of the ${id}`);
  };
  const tap = async (code: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await bot.wait(120);
  };
  /** Says hello, reads each line (skipping the typing), asks `asks`, then Bye. */
  const talk = async (who: string, asks: string[]) => {
    const g = town.guys[who];
    await bot.use(g.x, g.z, `a talk with ${who}`, /Talk/);
    await bot.until(() => town.talking(), 2000, `talked to ${who}`);
    for (let k = 0; k < 12 && town.talking(); k++) {
      // The typing; only while it types, since on a finished line the same key says the picked answer.
      if (document.querySelector<HTMLElement>('.place-talk-opts')?.hidden) await tap('KeyE');
      await bot.wait(500);
      const opts = [...document.querySelectorAll('.place-talk-opts button')].map((b) => b.textContent ?? '');
      bot.note(`${who}: ${document.querySelector('.place-talk-say')?.textContent ?? ''}`);
      const next = opts.findIndex((o) => asks.includes(o));
      if (next >= 0) {
        asks.splice(asks.indexOf(opts[next]!), 1);
        await tap(`Digit${next + 1}`);
      } else await tap(`Digit${(opts.includes('Go on') ? 0 : opts.indexOf('Bye')) + 1}`);
      await bot.wait(400);
    }
    bot.check(`said everything to ${who}`, asks.length === 0);
  };
  const stand = (id: string, lx: number, lz: number) => at(id, lx, lz);
  bot.note('the town');
  await walkIn('house');
  await talk('pip', ['What sort of job?', 'The Boogler?']);
  await walkOut('house');
  await walkIn('shop');
  // Right up to the stand: the button goes to whichever's nearest.
  const up = (lz: number) => bot.walk(stand('shop', 2.9, lz).x, stand('shop', 2.9, lz).z, 0.5);
  await up(-1.9);
  const hat = stand('shop', 3.8, -1.9);
  await bot.use(hat.x, hat.z, 'trying on the paper hat', /Try on/);
  await bot.wait(600);
  bot.check(`the shop offered it for $0, not ${interactTarget()?.verb}`, /\$0/.test(interactTarget()?.verb ?? ''));
  bot.press();
  await bot.wait(1500);
  bot.check('took the paper hat', place.giftState.bought.includes('paperhat'));
  const rail = stand('shop', 1, -3.45);
  await bot.use(rail.x, rail.z, 'the rail', /Swap/);
  await bot.wait(600);
  // Round Nell, who's nearer on the way: the button talks to whoever's closest.
  await bot.walk(stand('shop', -3, -1.1).x, stand('shop', -3, -1.1).z, 0.8);
  await talk('button', ['Who sets the prices?', 'The Boogler?']);
  await talk('nell', ['The Boogler?']);
  await up(0.2);
  const badge = stand('shop', 3.8, 0.2);
  await bot.use(badge.x, badge.z, 'trying on the button', /Try on/);
  await bot.wait(500);
  await walkOut('shop');
  await bot.wait(2500);
  bot.check('walking out wearing it keeps it', place.giftState.bought.includes('bigbutton'));
  await walkIn('museum');
  await talk('moss', ['Where did the stone come from?', 'The Boogler?']);
  await talk('wren', ['The Boogler?']);
  const q = stand('museum', 3.9, 1.05);
  await bot.walk(q.x, q.z, 1);
  await bot.wait(2500);
  await walkOut('museum');
  bot.note(`kept from the shop: ${place.giftState.bought.join(', ')}`);
}
