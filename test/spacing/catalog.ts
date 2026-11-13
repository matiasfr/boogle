// Train-spacing harness: catalog settings for a scratch run, by environment, applied before any rule runs. Imported by
// test/spacing/leg1.ts, and usable as a preload for a committed test file (node --import ./test/spacing/catalog.ts
// --test test/railway-route-rules.test.ts). Nothing set: the catalog as committed.
//
//   SPACING_CONTROL=<cap>,<onPct>[,whole][,asks]   candidate B (docs/plans/train-spacing.md 2B) on line 2: Ring Island the one
//       control halt, `cap` ticks past the dwell, `on` onPct% of an even gap (the grown line's circuit over its 5
//       trains), `off` half of `on`; `whole`: off while any train of the line is on an errand. A branch without B
//       ignores the field. `asks` (a diagnostic, not a candidate): the control acts for a train a lever ask is assigned to.
//   SPACING_FLEET=<n>   line 2's fleet from the first section laid (`fleet.trains` [3, 5, 5, 5, 5] becomes [3, n, n, n,
//       n]), with the shed rows RAIL_TRAINS derives from it added at its end. Applied here because RAIL_TRAINS is built
//       when railway-lines.ts loads: this module imports that file alone, so every module that derives from RAIL_TRAINS
//       (LINE_SLOTS, TRAIN_HOME, the world's rows) loads after it. Import this before anything else.
import { LINE2, RAIL_LINES, RAIL_TRAINS, circuitLen, controlOk, lineRows } from '../../src/sim/railway-lines.ts';

const fleetN = process.env.SPACING_FLEET;
if (fleetN) {
  const l = RAIL_LINES[LINE2]!,
    n = Number(fleetN);
  if (!Number.isSafeInteger(n) || n < 5 || !l.fleet) throw new Error(`SPACING_FLEET=${fleetN}`);
  const had = lineRows(l);
  Object.assign(l, { fleet: { ...l.fleet, trains: l.fleet.trains.map((k, j) => (j === 0 ? k : n)) } });
  for (let k = had; k < lineRows(l); k++)
    (RAIL_TRAINS as { line: number; home: number; track: number; shed?: true }[]).push({
      line: LINE2,
      home: 0,
      track: 0,
      shed: true,
    });
}
const spec = process.env.SPACING_CONTROL;
if (spec) {
  const [cap, pct, ...flags] = spec.split(',') as [string, string, ...string[]];
  const l = RAIL_LINES[LINE2]!;
  const ring = l.halts.findIndex((h) => h.name === 'Ring Island');
  const fleet = Math.max(...(l.fleet?.trains ?? [l.trains]));
  const even = Math.floor(circuitLen([l.halts[0]!.s, l.halts.at(-1)!.s]) / fleet);
  const on = Math.floor((even * Number(pct)) / 100),
    off = Math.floor(on / 2);
  Object.assign(l, {
    control: {
      halts: [ring],
      cap: Number(cap),
      on,
      off,
      ...(flags.includes('whole') ? { whole: true } : {}),
      ...(flags.includes('asks') ? { asks: true } : {}),
    },
  });
  if (!controlOk(l)) throw new Error(`SPACING_CONTROL=${spec}: malformed`);
  if (process.env.SPACING_SAY === '1') console.error(`control ${JSON.stringify(l.control)} (even gap ${even} cm)`);
}
