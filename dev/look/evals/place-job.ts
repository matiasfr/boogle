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
  /** The gifts you wear, close up on the real avatar. */
  async hat() {
    place.give(Number(q.get('n') ?? 8));
    put(903, 14);
    await wait(2500);
    const p = body.position;
    frame([p.x + Math.sin(ang) * 2.6, p.y + 1.1, p.z + Math.cos(ang) * 2.6], [p.x, p.y + 0.75, p.z], 40);
  },
};
await SHOTS[shot]?.();
if (!SHOTS[shot]) follow();
export {};
