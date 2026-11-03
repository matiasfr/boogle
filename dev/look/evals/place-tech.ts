// Round 4's moves in ?proto=place, staged: `BOOGLE_QUERY='proto=place&shot=glide' npm run look -- --room proto-place --eval
// dev/look/evals/place-tech.ts --action dev/look/evals/place-tech-act.ts --video --curves --target glide --seconds 12`. Sets the
// state and stands you there; the action file (window.__techAct) does the thing with real physics. Shots: see `SHOTS` below.
// `&glidecam=frame|pull|off` compares cameras. `&test=rest|neutral|turn|open|close` picks a glide transient.
const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'glide';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = window.__place as any;
if (!place) throw new Error('no place: add proto=place to the query');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { playMark } = (await import('/src/proto/mark.ts' as string)) as typeof import('../../../src/proto/mark.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(100);
await wait(1500);
const body = me.body!;
const O = place.ORIGIN.x;
const tech = place.tech;
const padOf = (id: string) => tech.PADS.find((p: { id: string }) => p.id === id);
const stand = (x: number, y: number, z: number, yaw = 0, pitch = -0.2) => {
  teleport(body, x, y + 1, z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = yaw;
  cam.pitch = pitch;
};
const onPad = (id: string, yaw = 0, pitch = -0.2) => {
  const p = padOf(id);
  stand(p.x + O, p.top, p.z, yaw, pitch);
};
const act = (fn: () => unknown) => void ((window as unknown as { __techAct: () => unknown }).__techAct = fn);
const yawTo = (x: number, z: number) => Math.atan2(-(x - body.position.x), -(z - body.position.z));
const aimAt = (x: number, y: number, z: number) => {
  cam.yaw = me.yaw = yawTo(x, z);
  const d = Math.hypot(x - body.position.x, z - body.position.z);
  cam.pitch = Math.min(0.85, Math.atan2(y - (body.position.y + 1.35), d) - 0.3); // the ring's up in the view, as a person would
};
const hookTo = async (id: string) => {
  const r = tech.RINGS.find((x: { pad: { id: string } }) => x.pad.id === id);
  aimAt(r.at.x, r.at.y, r.at.z);
  await wait(320);
  console.log('HOOK pick', id, tech.move.pick?.pad.id, tech.whyNot(r));
  tech.fireHook();
  while (tech.move.pull) await wait(30);
};
const SHOTS: Record<string, () => Promise<unknown> | unknown> = {
  /** A long glide off the summit. &test=: rest, neutral, turn, open, close for the transients; default straight. */
  async glide() {
    place.skipTower();
    await wait(600);
    place.job.tech.glide = true;
    onPad('summit', -1.2, -0.25);
    await wait(800);
    const t = q.get('test') ?? '';
    act(async () => {
      if (t === 'open') {
        // Falling free, at about the fall cap, before it opens.
        input.keys.add('KeyW');
        teleport(body, body.position.x + 22, 90, body.position.z + 22);
        await wait(800);
        playMark('open at speed');
        tech.toggleGlide();
        await wait(6000);
        input.keys.delete('KeyW');
        return;
      }
      // Off the edge, open at once.
      input.keys.add('KeyW');
      while (me.coyote > 0) await wait(20);
      await wait(120);
      tech.toggleGlide();
      playMark('opened');
      if (t === 'neutral') {
        await wait(4000);
        input.keys.delete('KeyW');
        playMark('stick let go');
      } else if (t === 'turn') {
        await wait(3500);
        // Time the heading from the body's velocity: the plot has speed, not direction.
        const timeTurn = async (step: number) => {
          const heading = () => Math.atan2(body.velocity.x, body.velocity.z);
          const start = heading();
          const goal = start + step;
          const t0 = performance.now();
          cam.yaw += step;
          let inside = -1;
          while (performance.now() - t0 < 1500) {
            const e = Math.abs(Math.atan2(Math.sin(heading() - goal), Math.cos(heading() - goal)));
            if (e < (5 * Math.PI) / 180 && inside < 0) inside = performance.now() - t0;
            await new Promise((r) => requestAnimationFrame(r));
          }
          console.log(
            `TURN ${((step * 180) / Math.PI).toFixed(0)} deg: within 5 deg at ${(inside / 1000).toFixed(2)} s`,
          );
        };
        await timeTurn(Math.PI / 2);
        await wait(800);
        await timeTurn(Math.PI * 0.999);
      } else if (t === 'rest') {
        input.keys.delete('KeyW');
        await wait(2000);
        playMark('stick pushed');
        input.keys.add('KeyW');
      } else if (t === 'close') {
        await wait(4000);
        playMark('closed');
        tech.toggleGlide();
      }
    });
  },
  /** Standing at the summit before taking it: the device's show, and the wing's flash. */
  async summit() {
    place.skipTower();
    await wait(800);
    onPad('summit', Math.PI, -0.2);
    await wait(600);
    act(() => tech.take('glide'));
  },
  /** Up the tower with real presses, from the first slab. */
  async climb() {
    place.skipTower();
    await wait(800);
    onPad('t0', 0.6, 0.3);
    await wait(800);
    act(async () => {
      for (const id of ['t1', 't2', 't3', 't4', 't5', 'summit']) {
        await hookTo(id);
        console.log('HOOK arrived', id, body.position.y.toFixed(1));
        await wait(700);
      }
    });
  },
  /** One pull, from the stem's pillar. */
  async hook() {
    place.skipTower();
    await wait(800);
    place.job.tech.hook = false;
    onPad('p2', 0.6, 0.1);
    await wait(500);
    act(() => tech.take('hook'));
  },
  /** The first device and its second jump, then the block. */
  async jump() {
    place.skipPath();
    await wait(800);
    place.job.chest = null;
    onPad('p1', 2.2, -0.2);
    await wait(500);
    act(() => tech.take('jump'));
  },
  /** A plain double jump with a press after the apex. */
  async doublejump() {
    place.skipLine2();
    await wait(600);
    stand(903, 18, 14, 0);
    await wait(800);
    act(async () => {
      input.keys.add('KeyW');
      await wait(400);
      pressJump();
      await wait(380);
      releaseJump();
      pressJump();
      await wait(120);
      releaseJump();
      await wait(1400);
      input.keys.delete('KeyW');
    });
  },
  /** Gate 1: at the quarry, the slab and its chain to the ledge. */
  async gate1() {
    place.skipTower();
    await wait(800);
    place.job.gate.quarry = false;
    place.placeMachine();
    stand(82 + O, 24.5, 42, -2.2, -0.05);
    act(() => tech.open('quarry'));
  },
  /** Gate 2: at the rim, the slab and the posts to the tower. */
  async gate2() {
    place.skipTower();
    await wait(800);
    const g = tech.GATES.sea;
    stand(g.x + O - 9, 24.5, g.z - 6, -1.2, -0.03);
    act(() => tech.open('sea'));
  },
  /** A device's pillar from the footbridge below, on the first walk. */
  async fromBelow() {
    stand(-49 + O, 2.2, -83, -0.9, 0.45);
  },
  /** The tower's route from the south bank. */
  async towerView() {
    place.skipTower();
    await wait(600);
    stand(26 + O, 24.5, 34, 0.5, 0.42);
  },
  /** The finders' bay, with a few found. */
  async hub() {
    place.skipTrains();
    await wait(1000);
    stand(-98 + O, 18.3, 7, 1.57, -0.08);
  },
  /** On the deck beside the first pillar, on the way home. */
  async onDeck() {
    place.skipPath();
    await wait(800);
    place.job.chest = null;
    const l = place.lines[0].spec.line;
    stand(l.xs[100] + O, 28.5, l.zs[100], 0.2, -0.05);
  },
};
await SHOTS[shot]?.();
setTimeout(() => window.__debugCam!.clear(), 600);
export {};
