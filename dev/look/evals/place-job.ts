// The job of ?proto=place, round 4: stages a beat and frames it. Pick with the query (&shot=...):
//   BOOGLE_QUERY='proto=place&shot=hat' npm run look -- --room proto-place --eval dev/look/evals/place-job.ts --size 1180x820 --hud
// See `SHOTS` below. `&ang=<radians>` turns a close-up round the subject.
const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'hat';
type V3t = [number, number, number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = window.__place as any;
if (!place) throw new Error('no place: add proto=place to the query');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(100);
await wait(1500);
const body = me.body!;
const frame = (pos: V3t, look: V3t, fov?: number) => setTimeout(() => window.__debugCam!.set(pos, look, fov), 600);
const follow = () => setTimeout(() => window.__debugCam!.clear(), 600);
const put = (x: number, z: number, yaw = 0, up = 1.2) => {
  teleport(body, x, place.H(x, z) + up, z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = yaw;
};
const ang = Number(q.get('ang') ?? 0.6);
const act = (fn: () => unknown) => void ((window as unknown as { __placeAct: () => unknown }).__placeAct = fn);
/** Line 1 at frame `k`, awake, with no walking: for looking at one beat. */
const toStage = async (k: number) => {
  while (place.lines[0].stage < k) {
    place.skipDelivery();
    const want = place.lines[0].stage + 1;
    while (place.lines[0].stage < want) await wait(80);
    await wait(300);
  }
  await wait(200);
};
const SHOTS: Record<string, () => Promise<unknown> | unknown> = {
  /** The day at &u=: 0.26 the start, 0.7 late afternoon, 0.76 golden, 0.85 night. */
  async day() {
    place.day.hold = true;
    place.day.u = Number(q.get('u') ?? 0.26);
    put(903, 14, -0.25);
    follow();
  },
  /** A tree comes down: the crown bursts, a bare trunk stays. */
  async fell() {
    place.wake();
    await wait(4000);
    const t = place.TREES[3];
    put(t.x + 3, t.z + 1.2, Math.atan2(-(t.x - t.x - 3), -(t.z - t.z - 1.2)));
    follow();
    (window as unknown as { __placeAct: () => void }).__placeAct = async () => {
      const { interactDown, interactUp } = await import('/src/player/hands.ts' as string);
      for (let k = 0; k < 8 && t.fall < 0; k++) {
        interactDown();
        interactUp();
        await wait(300);
      }
    };
  },
  /** The three boxes side by side, Common, Rare and Wonder. */
  async boxes() {
    put(903, 22, 0);
    const y = place.H(903, 14);
    place.giftState.got = [];
    place.deliver(901, y, 15, null);
    place.giftState.got = ['hat', 'scarf'];
    place.deliver(903, y, 15, null);
    place.giftState.got = ['hat', 'scarf', 'teacup', 'overalls', 'beanie', 'glasses'];
    place.deliver(905, y, 15, null);
    place.giftState.got = [];
    frame([903, y + 2.2, 20], [903, y + 0.8, 15], 40);
  },
  /** The shelf, your wardrobe, part full: the action presses Swap once. */
  async shelf() {
    place.give(6);
    const S = place.SHELF,
      nx = Math.sin(S.yaw),
      nz = Math.cos(S.yaw);
    put(S.x + nx * 3, S.z + nz * 3, Math.atan2(nx, nz));
    follow();
    act(async () => {
      const h = await import('/src/player/hands.ts' as string);
      console.log('SHELF target', h.interactTarget()?.verb);
      h.interactDown();
      h.interactUp();
    });
  },
  /** Door to door by train, Far Head to the village: stands on the platform, boards, rides. Reads out on the console. */
  async door() {
    place.skipTrains();
    await wait(1500);
    const l = place.lines[1];
    const tr = l.train.tr;
    const h = place.halts[4];
    const stamp = performance.now();
    const log = (w: string) =>
      console.log(
        `DOOR ${((performance.now() - stamp) / 1000).toFixed(1)} ${w} s ${tr.s.toFixed(0)} v ${tr.v.toFixed(1)} target ${tr.target} stop ${tr.stop} express ${tr.express}`,
      );
    teleport(body, h.x, h.y + 1, h.z);
    body.velocity.set(0, 0, 0);
    follow();
    void (async () => {
      log(`on the platform, eta ${place.trainEta(tr, 2)}`);
      while (tr.stop !== 2) await wait(100);
      log('train in');
      await wait(800);
      const c = tr.cars[1].body.position;
      teleport(body, c.x, c.y + 1.2, c.z);
      body.velocity.set(0, 0, 0);
      await wait(800);
      log('aboard');
      let was = 2;
      while (tr.stop !== 0) {
        if (tr.stop !== was) {
          log('stop changed');
          was = tr.stop;
        }
        await wait(200);
      }
      log('home');
    })();
  },
  /** The pet on your shoulder, on a train. */
  async pet() {
    place.give(4);
    place.skipTrains();
    await wait(2000);
    const c = place.lines[1].train.tr.cars[1].body.position;
    teleport(body, c.x, c.y + 1.2, c.z);
    body.velocity.set(0, 0, 0);
    await wait(1500);
    follow();
  },
  /** The first path opening: stand at the rim, station 3 full on the action. */
  async opening() {
    await toStage(2);
    const st = place.lines[0].stations[2];
    put(st.x + 2, st.z - 9, Math.atan2(-(-30 - (st.x - 1000)), -(-60 - st.z)), 1.2);
    follow();
    act(() => place.skipDelivery());
  },
  /** The first frames: stone, a bill, what the board says. */
  async frame2() {
    await toStage(1);
    const st = place.lines[0].stations[1];
    place.back.logs = 8;
    put(st.x + 2, st.z + 6, Math.atan2(-(st.x - st.x - 2), -(st.z - st.z - 6)));
    follow();
  },
  /** The rocks. */
  async rock() {
    await toStage(1);
    const r = place.ROCK_LIST[0];
    put(r.x + 2.4, r.z + 1, Math.atan2(2.4, 1) + 0);
    follow();
    act(async () => {
      const h = await import('/src/player/hands.ts' as string);
      for (let k = 0; k < 4; k++) {
        h.interactDown();
        h.interactUp();
        await wait(420);
      }
    });
  },
  /** The great tree coming down, and the trunk on your shoulder. */
  async great() {
    await toStage(2);
    const g = place.greatTree;
    put(g.x + 3.5, g.z + 2, Math.atan2(3.5, 2));
    follow();
    act(async () => {
      const h = await import('/src/player/hands.ts' as string);
      for (let k = 0; k < 13 && g.fall < 0; k++) {
        h.interactDown();
        h.interactUp();
        await wait(300);
      }
    });
  },
  async shoulder() {
    await toStage(2);
    place.shoulder('beam');
    const st = place.lines[0].stations[2];
    put(st.x + 12, st.z - 12, 0.6);
    follow();
  },
  /** The proper axe on the oak: &axe=0 for the old one, to compare. */
  async axe() {
    place.skipPath();
    await wait(1200);
    if (q.get('axe') !== '0') {
      place.job.rung.axe = 1;
      place.job.chest = null;
    }
    const oak = place.TREES.at(-2);
    put(oak.x + 2.6, oak.z + 1, Math.atan2(2.6, 1));
    follow();
    act(async () => {
      const h = await import('/src/player/hands.ts' as string);
      for (let k = 0; k < 3; k++) {
        h.interactDown();
        h.interactUp();
        await wait(400);
      }
    });
  },
  /** The chest at the end of the path. */
  async chest() {
    place.skipPath();
    await wait(1500);
    const c = place.giftState.crates()[0];
    put(c.x + 2.6, c.z + 3, Math.atan2(2.6, 3));
    follow();
    act(() => place.openCrate(place.giftState.crates()[0]));
  },
  /** The pack frame, full of logs, from behind. */
  async pack() {
    place.skipLine2();
    await wait(1000);
    place.back.logs = 16;
    put(903, 20, 0);
    await wait(1500);
    const p = body.position;
    frame([p.x + Math.sin(ang) * 3.6, p.y + 1.3, p.z + Math.cos(ang) * 3.6], [p.x, p.y + 0.6, p.z], 45);
  },
  /** The forge half built, its frame, the stack, and the crane. */
  async forge() {
    place.skipPath();
    await wait(1000);
    place.job.chest = null;
    const f = place.forgeFrame;
    place.back.logs = 8;
    put(f.x + 5, f.z - 5, Math.atan2(5, -5));
    follow();
  },
  /** The cart coming down the track to the rack. */
  async cart() {
    place.skipLine2();
    await wait(1500);
    place.skipDelivery();
    await wait(14000);
    const st = place.stationOf(place.lines[1]);
    put(place.rack.x + 3, place.rack.z + 3, Math.atan2(3, 3));
    follow();
    (window as unknown as { __st: unknown }).__st = st;
  },
  /** The cart close, on the way. */
  async cartnear() {
    place.skipLine2();
    await wait(1500);
    place.skipDelivery();
    await wait(13000);
    const c = place.lines[0].spec.line;
    put(1000 + c.xs[40], c.zs[40] + 6, 0.2);
    follow();
  },
  /** The old train waking: action. */
  async wakeTrain() {
    place.skipHead();
    await wait(1500);
    const c = place.lines[0].train.tr.cars[1];
    put(c.x + 7, c.z + 3, Math.atan2(7, 3));
    follow();
    act(() => place.wakeTrains());
  },
  /** A station with its signal, and a train called to it. */
  async halt() {
    place.skipTrains();
    await wait(2500);
    const h = place.halts[Number(q.get('n') ?? 2)];
    put(h.x + 4, h.z + 7, Math.atan2(4, 7));
    follow();
    act(() => put(h.x, h.z, 0, 2.4));
  },
  /** Far Head's end of the trestle, from the Head. */
  async head() {
    place.skipTrains();
    await wait(2500);
    put(1395, -210, 0.4, 1.4);
    follow();
  },
  /** The pier out, and the buoys pointing. */
  async pier() {
    place.skipTrains();
    await wait(1500);
    const l = place.lines[1];
    l.track.snapTo(l.track.u(l.spec.line.len));
    put(1392, -216, 0.06, 1.4);
    frame([1404, 60, -150], [1340, 40, -700], 55);
  },
  /** The sea trestle, from the Head side. */
  async trestle() {
    place.skipTrains();
    await wait(1500);
    const l = place.lines[1];
    const k = 470;
    put(1000 + l.spec.line.xs[k], l.spec.line.zs[k], 2.2, 7);
    follow();
  },
  /** The long view of the whole island, Far Head and all. */
  async map() {
    place.skipTrains();
    await wait(1500);
    frame([1100, 260, 260], [1160, 0, -60], 60);
  },
  /** The telescope. */
  async scope() {
    put(975, -200, 0.3);
    follow();
    act(() => place.lookThrough());
  },
  /** A skip to look at: &to=path,line2,head,trains. */
  async skip() {
    const to = q.get('to');
    if (to === 'path') place.skipPath();
    if (to === 'line2') place.skipLine2();
    if (to === 'head') place.skipHead();
    if (to === 'trains') place.skipTrains();
    follow();
  },
  /** The whole job with real input. &from=path,line2,head,trains starts part way. It needs a long --warm: see the notes on screen. */
  play: () => {
    follow();
    void play();
  },
  /** The gifts you wear, close up on the real avatar. */
  async hat() {
    const w = q.get('wear');
    place.give(10, w ? Object.fromEntries(w.split(',').map((x) => x.split(':'))) : undefined);
    put(903, 14);
    await wait(2500);
    const p = body.position;
    frame([p.x + Math.sin(ang) * 2.6, p.y + 1.1, p.z + Math.cos(ang) * 2.6], [p.x, p.y + 0.75, p.z], 40);
  },
};
// ---------------------------------------------------------------- the bot: walks, chops and carries with real input
async function play() {
  const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
  const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
  const O = place.ORIGIN.x;
  const [L1, L2] = place.lines;
  const say = document.createElement('div');
  say.style.cssText =
    'position:fixed;left:8px;top:90px;z-index:9999;font:bold 12px monospace;color:#000;background:#fffc;padding:6px;white-space:pre';
  document.body.append(say);
  const t0 = performance.now();
  const stamp: string[] = [];
  const now = () => (performance.now() - t0) / 1000;
  let last = 0;
  const note = (s: string) => {
    const n = now();
    const line = `${n.toFixed(1)} (+${(n - last).toFixed(1)}) ${s}`;
    stamp.push(line);
    last = n;
    say.textContent = stamp.join('\n');
    (window as unknown as { __playLog: string[] }).__playLog = stamp;
    console.log('PLAY ' + line);
  };
  const press = () => {
    hands.interactDown();
    hands.interactUp();
  };
  const yawTo = (tx: number, tz: number) => Math.atan2(-(tx - body.position.x), -(tz - body.position.z));
  const near = (x: number, z: number, r: number) => Math.hypot(body.position.x - x, body.position.z - z) < r;
  const go = async (x: number, z: number, r = 1.2, limit = 60000) => {
    input.keys.add('KeyW');
    let was = { x: body.position.x, z: body.position.z, at: performance.now() };
    let stuck = 0;
    const start = performance.now();
    while (!near(x, z, r) && performance.now() - start < limit) {
      cam.yaw = me.yaw = yawTo(x, z);
      await wait(40);
      if (me.swimming) {
        note('in the water: back up the path');
        place.backUp();
        await wait(500);
      }
      if (performance.now() - was.at > 600) {
        if (Math.hypot(body.position.x - was.x, body.position.z - was.z) < 0.5) {
          me.jumpQueued = 0.2;
          // Round whatever it is, a little further each time; not off the side of a deck, though.
          stuck++;
          if (body.position.y - place.H(body.position.x, body.position.z) < 2.5) {
            cam.yaw = me.yaw = yawTo(x, z) + (stuck % 4 < 2 ? 1.3 : -1.3);
            await wait(350 + stuck * 450);
          }
        }
        was = { x: body.position.x, z: body.position.z, at: performance.now() };
      }
    }
    input.keys.delete('KeyW');
  };
  const nearestS = (
    l: { spec: { line: { xs: Float32Array; zs: Float32Array; len: number } } },
    x: number,
    z: number,
  ) => {
    const { xs, zs } = l.spec.line;
    let best = 0,
      bd = Infinity;
    for (let k = 0; k < xs.length; k += 2) {
      const d = (xs[k]! + O - x) ** 2 + (zs[k]! - z) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };
  // Along a line from where you are, as a person would: the next few metres each time, and if you've slipped off the deck
  // and can't get back up, back to where the bank meets it.
  const along = async (
    l: { spec: { line: { xs: Float32Array; zs: Float32Array; len: number } } },
    _from: number,
    to: number,
  ) => {
    const { xs, zs } = l.spec.line;
    let best = Infinity,
      bestAt = performance.now();
    const left = () => Math.abs(nearestS(l, body.position.x, body.position.z) - to);
    for (let guard = 0; guard < 400 && left() > 3; guard++) {
      const n = nearestS(l, body.position.x, body.position.z),
        d = Math.abs(n - to),
        dir = to > n ? 1 : -1;
      if (d < best - 1) {
        best = d;
        bestAt = performance.now();
      }
      if (performance.now() - bestAt > 5000) {
        // Fallen under it: the way a person gets back up.
        if (body.position.y < place.H(xs[n]! + O, zs[n]!) + 1 && place.H(body.position.x, body.position.z) < 16) {
          note('off the track: back up');
          place.backUp();
          await wait(600);
          bestAt = performance.now();
          continue;
        }
        const k = Math.max(0, Math.min(xs.length - 1, n - dir * 14));
        await go(xs[k]! + O, zs[k]!, 1.5, 8000);
        bestAt = performance.now();
        best = Infinity;
        continue;
      }
      const k = Math.max(0, Math.min(xs.length - 1, n + dir * Math.min(6, d)));
      await go(xs[k]! + O, zs[k]!, 1.6, 3000);
    }
    await go(xs[to]! + O, zs[to]!, 2, 6000);
  };
  const lobe = (x: number, z: number) => {
    const a = (Math.atan2(x - O - 8, -(z + 10)) * 180) / Math.PI;
    return a > -38 && a < 16 ? 'n' : a > -164 && a < -38 ? 'w' : 'e';
  };
  /** There, by the track if it means crossing a gorge or the sea. */
  const travel = async (x: number, z: number, r = 1.5) => {
    const a = lobe(body.position.x, body.position.z),
      b = lobe(x, z);
    const far = Math.hypot(body.position.x - x, body.position.z - z) > 70;
    if (a === 'n' && b !== 'n') await along(L1, nearestS(L1, body.position.x, body.position.z), 26);
    if (a === 'e' && (b !== 'e' || far))
      await along(L2, nearestS(L2, body.position.x, body.position.z), b === 'e' ? nearestS(L2, x, z) : 12);
    if (a !== 'e' && b === 'e') await along(L2, nearestS(L2, body.position.x, body.position.z), nearestS(L2, x, z));
    if (a !== 'n' && b === 'n') await along(L1, nearestS(L1, body.position.x, body.position.z), nearestS(L1, x, z));
    await go(x, z, r);
  };
  const standing = (t: { fall: number; great?: boolean }) => t.fall < 0 && !t.great;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nearestOf = (list: any[], ok: (t: any) => boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let best: any = null,
      bd = Infinity;
    for (const t of list) {
      if (!ok(t)) continue;
      // Across a gorge doesn't count as near.
      const d =
        Math.hypot(t.x - body.position.x, t.z - body.position.z) *
        (lobe(t.x, t.z) === lobe(body.position.x, body.position.z) ? 1 : 3);
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
      await travel(t.x, t.z, 2.6);
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
  // A beat that doesn't come is a finding, not something to walk past.
  const waitFor = async (fn: () => boolean, ms = 60000, what = '') => {
    const t = performance.now();
    while (!fn() && performance.now() - t < ms) await wait(60);
    if (what && !fn()) note(`NEVER: ${what}`);
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
    await travel(bo.x, bo.z, 2.4);
    note(`walked home (${(now() - t).toFixed(1)} s)`);
    press();
    await wait(300);
    const c = L1.train.tr.cars[0]!.body.position;
    await travel(c.x + 3, c.z + 3, 3);
    note('at the old train');
    press();
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
    await go(c.x, c.z, 0.9, 5000);
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
  note(
    `THE END at ${now().toFixed(1)}: $${place.money()}, ${place.job.people} people, ${place.job.score.logs} logs, ${(place.job.score.metres / 1000).toFixed(2)} km`,
  );
  (window as unknown as { __placeDone: boolean }).__placeDone = true;
}
await SHOTS[shot]?.();
if (!SHOTS[shot]) follow();
export {};
