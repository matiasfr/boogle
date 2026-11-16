// Accepted server seed, camera and read-only diagnostics. No stock/train row edits.
// timeout 360 npm run look -- --rail-seed freight-running --eval dev/look/evals/town-a1.ts --query a1=camp --until window.__freightReady --warm 180 --name town-a1-camp --wall 240 --question 'Does the Camp stack show its stock, with a readable board and seated crates?'
// timeout 360 npm run look -- --rail-seed freight-running --eval dev/look/evals/town-a1.ts --query a1=train --until window.__freightReady --warm 180 --name town-a1-train --wall 240 --question 'Does a line 1 train carry its timber freight on the solid crate deck?'
// a1=quarry frames the second planned stack for placement inspection.
const { railReady, railRead, rw, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { Yard } = (await import(
  '/src/sim/railway-components.ts' as string
)) as typeof import('../../../src/sim/railway-components.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
if (!(await railReady())) throw new Error('A1 proof: railway mirror not ready');
const mode = new URLSearchParams(location.search).get('a1') ?? 'camp';
const x = mode === 'quarry' ? 1066.59 : 1009.64,
  z = mode === 'quarry' ? 29.74 : -143.1;
teleport(me.body!, x + 8, H(x + 8, z + 8) + 0.9, z + 8);
let ready = false,
  key = '';
const poll = () => {
  const w = rw();
  const yards = w.ids(Yard).map((id) => ({ ...w.get(Yard, id)! }));
  const trains = inspectRailway()?.line2View.trains ?? [];
  const train = trains.find((tr) => tr.line === 0 && tr.freight > 0);
  const car = train?.cars[2];
  if (mode === 'train' && car) {
    window.__debugCam?.set([car.x + 7, car.y + 5, car.z + 8], [car.x, car.y + 0.7, car.z], 55);
  } else if (mode !== 'train') {
    const y = H(x, z);
    window.__debugCam?.set([x + 4, y + 4, z + 7], [x + 0.5, y + 0.85, z], 55);
  }
  const stock = yards.find((row) => row.slot === (mode === 'quarry' ? 1 : 0))?.stock;
  if (!ready && (mode === 'train' ? !!car : (stock ?? 0) >= 4)) {
    ready = true;
    (window as Window & { __freightReady?: boolean }).__freightReady = true;
  }
  const snapshot = { yards, train: train && { slot: train.slot, freight: train.freight, crates: train.crates, car } };
  const next = JSON.stringify(snapshot);
  if (ready && key !== next) {
    key = next;
    console.log(`FREIGHT A1 tick ${railRead()!.tick()} ${next}`);
  }
};
poll();
const timer = setInterval(poll, 100);
setTimeout(() => clearInterval(timer), 240_000);
export {};
