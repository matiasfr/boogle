// Step 0 counterfactuals, isolated in a fresh process; never imported by the game or test suite.
// node --import ./test/helpers/rail-no-audit.ts test/spacing/progression.ts <count> <speed> <stage> <light|heavy>
import { RAIL_LINES, RAIL_TRAINS } from '../../src/sim/railway-lines.ts';
const [countArg, speedArg, stage = 'trains-on', rate = 'light'] = process.argv.slice(2);
const count = Number(countArg),
  speed = Number(speedArg);
if (![1, 2, 3].includes(count) || ![140, 200].includes(speed)) throw new Error('count 1..3, speed 140|200');
const built = process.argv.includes('--built');
if (!built) {
  const l = RAIL_LINES[1]!;
  Object.assign(l, { trains: count, speed, accel: speed === 140 ? 2.5 : 3.5, brake: 3.5 });
  Object.assign(l.fleet!, { trains: [count, 6, 6, 6, 6] });
  let n = 0;
  for (const r of RAIL_TRAINS)
    if (r.line === 1) {
      if (n++ >= count) Object.assign(r, { home: 0, track: 0, shed: true });
    }
}
// Imports happen after the catalog override, so seed placement and its load checks see the same counterfactual.
if (stage === 'delivery') {
  const { railwayAtTrains, rail, trainId, act, railTick, qjob, layTicks, unaudited } =
    await import('../helpers/rail.ts');
  const { Train } = await import('../../src/sim/railway-components.ts');
  const s = unaudited(railwayAtTrains('trains-on'));
  const fit = rail(s.w).trains;
  if (!built && count === 1) s.w.mut(Train, trainId(s.w, 1))!.depart = fit + 280;
  while (rail(s.w).depot !== 32 || rail(s.w).depotRails !== 32) {
    if (s.t - fit > 6000) throw new Error('delivery timeout');
    railTick(s.w, ++s.t);
  }
  const delivered = s.t - fit;
  if (act(s, 'a', 'rail.pack') !== 1) throw new Error('pack');
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      if (act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake') !== 16) throw new Error('take');
      if (act(s, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }) !== 16) throw new Error('deposit');
    }
  const end = qjob(s.w, 5).start + layTicks(s.w, 5);
  while (s.t < end) railTick(s.w, ++s.t);
  console.log(JSON.stringify({ count, speed, delivered: delivered / 10, q6: (s.t - fit) / 10 }));
  process.exit(0);
}
const { fuzz } = await import('./run.ts');
const results = Array.from({ length: 4 }, (_, k) => fuzz(stage, 0x5140 + k, 100, 20000, rate === 'light'));
const waits = results.flatMap((r) => r.waits);
console.log(
  JSON.stringify({
    count,
    speed,
    stage,
    rate,
    samples: waits.length,
    mean: waits.reduce((a, b) => a + b, 0) / waits.length / 10,
    over105: (waits.filter((x) => x > 1050).length / waits.length) * 100,
    worst: Math.max(...results.map((r) => r.worst.ticks)) / 10,
    unserved: results.flatMap((r) => r.unserved),
  }),
);
