// The job of ?proto=place, round 4: stages a beat and frames it. Pick with the query (&shot=...):
//   BOOGLE_QUERY='proto=place&shot=hat' npm run look -- --room proto-place --eval dev/look/evals/place-job.ts --size 1180x820 --hud
// See `SHOTS` below. `&ang=<radians>` turns a close-up round the subject.
const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'hat';
type V3t = [number, number, number];
// oxlint-disable-next-line typescript/no-explicit-any
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
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const act = (fn: () => unknown) => {
  (window as unknown as { __placeAct: () => void }).__placeAct = () => {
    background(Promise.resolve(fn()), 'place shot action');
  };
};
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
/** The room in &in=, with the town at &stage=. */
const townAt = async () => {
  const stage = q.get('stage') ?? 'path';
  if (stage === 'path') place.skipPath();
  if (stage === 'line2') place.skipLine2();
  if (stage === 'trains') place.skipTrains();
  const r = place.town.rooms[q.get('in') ?? 'house'];
  while (r.site.state !== 'done') await wait(200);
  await wait(600);
  return r;
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
    act(async () => {
      const { interactDown, interactUp } = await import('/src/player/hands.ts' as string);
      for (let k = 0; k < 8 && t.fall < 0; k++) {
        interactDown();
        interactUp();
        await wait(300);
      }
    });
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
  /** A building: &in=house,shop,museum. Starts outside its door; the action walks in, stops in the middle, turns right round and
   * walks out. &stage= (`path`, the default; `line2`, `trains`; anything else leaves it at the start). */
  async room() {
    const r = await townAt();
    const out = r.d / 2 + 9;
    put(r.x + Math.sin(r.yaw) * out, r.z + Math.cos(r.yaw) * out, r.yaw);
    follow();
    act(async () => {
      const { input } = (await import(
        '/src/player/input.ts' as string
      )) as typeof import('../../../src/player/input.ts');
      input.keys.add('KeyW');
      await wait(Math.round((out + 1) * 180));
      input.keys.delete('KeyW');
      await wait(1800);
      for (let k = 0; k < 100; k++) {
        cam.yaw += 0.063;
        await wait(40);
      }
      const door = { x: r.x + Math.sin(r.yaw) * (r.d / 2 + 7), z: r.z + Math.cos(r.yaw) * (r.d / 2 + 7) };
      input.keys.add('KeyW');
      for (let k = 0; k < 90; k++) {
        cam.yaw = me.yaw = Math.atan2(-(door.x - body.position.x), -(door.z - body.position.z));
        await wait(40);
      }
      input.keys.delete('KeyW');
    });
  },
  /** Stands by a resident or a shop's stand and presses Interact, with the follow camera: &in=house &stand=1.6,-0.9 &face=1.6,-3 &press=1. */
  async press() {
    const r = await townAt();
    place.earn(Number(q.get('money') ?? 16000));
    const world = (lx: number, lz: number) => ({
      x: r.x + lx * Math.cos(r.yaw) + lz * Math.sin(r.yaw),
      z: r.z - lx * Math.sin(r.yaw) + lz * Math.cos(r.yaw),
    });
    const [sx, sz] = (q.get('stand') ?? '1.6,-0.9').split(',').map(Number) as [number, number];
    const [fx, fz] = (q.get('face') ?? '1.6,-3').split(',').map(Number) as [number, number];
    const at = world(sx, sz),
      to = world(fx, fz);
    put(at.x, at.z, Math.atan2(-(to.x - at.x), -(to.z - at.z)), 0.9);
    follow();
    act(async () => {
      const h = await import('/src/player/hands.ts' as string);
      for (let k = 0; k < Number(q.get('press') ?? 1); k++) {
        console.log('PRESS', h.interactTarget()?.verb);
        h.interactDown();
        h.interactUp();
        await wait(1100);
      }
    });
  },
  /** A building seen from room space: &in=house,shop,museum &cam=x,y,z &at=x,y,z &stand=x,y,z &stage=... */
  async roomcam() {
    const r = await townAt();
    const world = (s: string) => {
      const [x, y, z] = s.split(',').map(Number) as [number, number, number];
      const c = Math.cos(r.yaw),
        n = Math.sin(r.yaw);
      return [r.x + x * c + z * n, r.y + y, r.z - x * n + z * c] as V3t;
    };
    const stand = world(q.get('stand') ?? '0,0,0');
    put(stand[0], stand[2], r.yaw + Math.PI, 0.9);
    await wait(1500);
    frame(world(q.get('cam') ?? '0,6,8'), world(q.get('at') ?? '0,1,0'), 50);
  },
  /** The whole job with real input: dev/look/bots/place.ts. &from=path,line2,head,trains starts part way. */
  play: async () => {
    follow();
    void ((await import('/dev/look/bots/place.ts' as string)) as typeof import('../bots/place.ts')).play();
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
await SHOTS[shot]?.();
if (!SHOTS[shot]) follow();
export {};
