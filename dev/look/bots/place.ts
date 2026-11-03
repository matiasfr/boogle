// The bot for ?proto=place, `shot=play` in ./../evals/place-job.ts: plays the whole round with real input, at a person's pace.
// `npm run playthrough` runs it. Moving about, notes and checks are ../bot.ts; this is only what this round asks of you. A new
// beat goes here: say what you expect with `bot.until(..., what)`, so a beat that doesn't come is on the record.
import { makeBot } from '../bot.ts';
import { me } from '../../../src/player/player.ts';

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
          let w = 0;
          await travel(place.rack.x, place.rack.z, 2.6);
          while (place.rack.logs <= 0 && w++ < 300) await wait(200);
          press();
          await wait(800);
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
      await bill(st);
      await lay(st);
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
    l: { k: number; train: { tr: { stop: number; cars: { body: { position: { x: number; z: number } } }[] } } },
    h: { x: number; z: number; stop: number; k: number },
  ) => {
    await travel(h.x, h.z, 1);
    note(`on the platform: ${onDeck()?.name ?? 'no'}, eta ${place.trainEta(l.train.tr, h.stop)}`);
    const callAt = now();
    await waitFor(() => l.train.tr.stop === h.stop, 90000, 'the train coming');
    note(`waited ${(now() - callAt).toFixed(1)} s`);
    const c = l.train.tr.cars[1]!.body.position;
    await bot.straight(c.x, c.z, 0.9, 5000);
    note('aboard?');
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
  bot.finish(
    `$${place.money()}, ${place.job.people} people, ${place.job.score.logs} logs, ${(place.job.score.metres / 1000).toFixed(2)} km`,
  );
}
