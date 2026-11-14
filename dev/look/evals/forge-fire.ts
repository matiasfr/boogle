// The workshop furnace's fire (workshop-fire.ts), lit: `--query fire=seat|door|close` frames it from behind the stool,
// from a step inside the door, or close over the guard; the player stands in the room (the roof cut away, sparks and
// flue smoke on) or, with `&sit=1`, sits on the stool. From `--rail-seed q1-done`. Positions are forge-local.
// npm run look -- --rail-seed q1-done --eval dev/look/evals/forge-fire.ts --query 'fire=seat&sit=1' \
//   --until window.__fireDone --video --seconds 6 --name fire-seat
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { X, Z, forgePlan } = (await import(
  '/src/place/opening-plans.ts' as string
)) as typeof import('../../../src/place/opening-plans.ts');
const { sitDown, seatState } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const query = new URLSearchParams(location.search);
const view = query.get('fire') ?? 'seat';
const floor = forgePlan().y + 0.5;
// camera (x, y, z), target (x, y, z), fov
const VIEWS: Record<string, [number[], number[], number]> = {
  seat: [[3.6, 2.0, -1.6], [0.6, 1.0, 2.6], 60],
  door: [[-3.6, 1.7, 1.0], [0, 1.1, 2.9], 60],
  close: [[0.5, 2.0, 1.0], [0, 1.1, 3.1], 55],
};
const [cam, look, fov] = VIEWS[view]!;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
background(
  (async () => {
    if (!(await railReady())) throw new Error('forge-fire: the railway never became ready');
    while (!me.body) await wait(100);
    const at = query.get('sit') ? [2.7, 1.7] : [-3.2, 0.2];
    teleport(me.body!, X + at[0]!, floor + 0.6, Z + at[1]!);
    me.body!.velocity.set(0, 0, 0);
    await wait(1800);
    if (query.get('sit')) {
      sitDown();
      await wait(600);
      console.log('FIRE seated', seatState().sitting);
    }
    window.__debugCam?.set(
      [X + cam![0]!, floor + cam![1]!, Z + cam![2]!],
      [X + look![0]!, floor + look![1]!, Z + look![2]!],
      fov,
    );
    await wait(2500);
    (window as Window & { __fireDone?: boolean }).__fireDone = true;
  })(),
  'forge fire',
);
export {};
