// npm run look -- --rail-seed q1-done --eval dev/look/evals/workshop-chair.ts --query 'chair=front' --name chair-front
//  (chair=front|side|high frames the forge workshop's chair; &sit=1 walks nothing: it stands the player at the chair's
//   exit, presses Interact when "Sit" is offered and holds the seated pose; &sit=2 then presses again and holds the
//   stood-up pose). Prints `CHAIR ...` lines: the seat state, the body's position and the avatar's yaw.
// The chair is at room-local (2.7, 0, 0.3), facing +z (the front wall); positions below are local to the forge's centre.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { X, Z, forgePlan } = (await import(
  '/src/place/opening-plans.ts' as string
)) as typeof import('../../../src/place/opening-plans.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { seatState } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const query = new URLSearchParams(location.search);
const view = query.get('chair') ?? 'front';
const sit = Number(query.get('sit') ?? 0);
const floor = forgePlan().y + 0.5;
// camera (x, y, z), target (x, y, z), fov
const VIEWS: Record<string, [number[], number[], number]> = {
  front: [[2.2, 1.5, 3.2], [2.7, 0.6, 0.3], 55],
  side: [[0.2, 1.4, 0.9], [2.7, 0.6, 0.3], 55],
  high: [[1.4, 3.0, 2.4], [2.7, 0.4, 0.3], 55],
};
const [cam, look, fov] = VIEWS[view]!;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shot = window as Window & { __chairDone?: boolean };
const say = (what: string) => {
  const p = me.body!.position;
  console.log(
    `CHAIR ${what}`,
    JSON.stringify({
      seat: seatState().sitting,
      prompt: interactTarget()?.verb ?? null,
      local: [+(p.x - X).toFixed(2), +(p.y - floor).toFixed(2), +(p.z - Z).toFixed(2)],
      yaw: +(me.avatar?.rotation.y ?? NaN).toFixed(2),
    }),
  );
};
const interact = () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
};
const until = async (fn: () => unknown, what: string) => {
  const end = performance.now() + 20000;
  while (!fn()) {
    if (performance.now() > end) {
      say(`missed: ${what}`);
      throw new Error(`workshop-chair: ${what}`);
    }
    await wait(50);
  }
};
background(
  (async () => {
    if (!(await railReady())) throw new Error('workshop-chair: the railway never became ready');
    while (!me.body) await wait(100);
    // Without &sit the player waits by the door, out of the frame; with it, on the chair's exit spot.
    const at = sit ? [2.7, 1.7] : [-2.9, 3.7];
    teleport(me.body!, X + at[0]!, floor + 0.6, Z + at[1]!);
    me.body!.velocity.set(0, 0, 0);
    await wait(1800);
    window.__debugCam?.set(
      [X + cam![0]!, floor + cam![1]!, Z + cam![2]!],
      [X + look![0]!, floor + look![1]!, Z + look![2]!],
      fov,
    );
    if (sit) {
      say('before');
      await until(() => interactTarget()?.verb === 'Sit', 'Sit offered at the chair');
      interact();
      await until(() => seatState().sitting, 'seated on the press');
      await wait(1500);
      say('seated');
      if (sit === 2) {
        await until(() => interactTarget()?.verb === 'Stand up', 'Stand up offered');
        interact();
        await until(() => !seatState().sitting && !seatState().request, 'stood up on the press');
        await wait(1500);
        say('stood');
      }
    }
    await wait(600);
    shot.__chairDone = true;
  })(),
  'workshop chair',
);
export {};
