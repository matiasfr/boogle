/** node dev/level/ride-minutes.ts [--report]: checkpoint ride times over the sim's fully laid catalog. */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { RAIL_LINES, trainPassesBy } from '../../src/sim/railway-lines.ts';
import { RAIL_LEGS } from '../../src/sim/railway-route.ts';
import { BOILER, stopKin, trainLegTicks, trainStopsOf } from '../../src/sim/railway-train.ts';
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import { RULE_MS } from '../../src/world/room-clock.ts';

const home = new Set(['Village', 'Village, line 2', 'West landing']);
// The world rows and the running line use different names for the same Ring Island halt.
const townName = (name: string) => (name === 'Ring Island halt' ? 'Ring Island' : name);
const towns = new Set(
  WORLD_LINES.flatMap((line) => line.halts.map((halt) => townName(halt.name))).filter((n) => !home.has(n)),
);
const laid = RAIL_LEGS.map((leg) => leg.sections.length);
const ticksPerMinute = 60_000 / RULE_MS;

type Ride = { to: string; line: string; way: string; ticks: number[] };
const rides = new Map<string, Ride[]>();

for (const line of RAIL_LINES) {
  const head = Math.max(0, ...line.halts.filter((h) => !h.leg).map((h) => (h.heads?.length ?? 1) - 1));
  const stops = trainStopsOf(line, Infinity, { head, joined: true }, laid);
  for (const [from, s] of stops.entries()) {
    const start = townName(line.halts[from]!.name);
    if (!home.has(start) && !towns.has(start)) continue;
    for (const [to, end] of stops.entries()) {
      const name = townName(line.halts[to]!.name);
      const dir = Math.sign(to - from);
      if (!dir || !towns.has(name)) continue;
      if (trainPassesBy(line, from, dir, stops.length) || trainPassesBy(line, to, dir, stops.length)) continue;
      // On-request service gives a non-stop ride between each pair of boarding and alighting halts.
      const ride: Ride = {
        to: name,
        line: line.id,
        way: `${start} · ${line.name}`,
        ticks: BOILER.map((_, fit) => trainLegTicks(Math.abs(end - s), 0, stopKin(line, to, dir < 0 ? 1 : 0, fit))),
      };
      const key = home.has(start) ? 'Home' : start;
      const options = rides.get(key) ?? [];
      options.push(ride);
      rides.set(key, options);
    }
  }
}

function routesTo(town: string, from = 'Home', visited: readonly string[] = []): Ride[][] {
  const options = (rides.get(from) ?? []).filter((ride) => !visited.includes(ride.line));
  const direct = options.filter((ride) => ride.to === town);
  return [
    ...direct.map((ride) => [ride]),
    ...options
      .filter((ride) => ride.to !== town)
      .flatMap((ride) => routesTo(town, ride.to, [...visited, ride.line]).map((rest) => [ride, ...rest])),
  ];
}

function rowsFor(town: string): string[] {
  const routes = routesTo(town);
  if (!routes.length) return [`| ${town} | no route | ${BOILER.map(() => '—').join(' | ')} | — | Fail |`];
  const shortest = Math.min(...routes.map((route) => route.reduce((sum, ride) => sum + ride.ticks[0]!, 0)));
  const fewestRides = Math.min(...routes.map((r) => r.length));
  const ways = new Map<string, { label: string; ticks: number[] }>();
  for (const route of routes.filter((r) => r.length === fewestRides)) {
    const first = route[0]!;
    const ticks = BOILER.map((_, fit) => route.reduce((sum, ride) => sum + ride.ticks[fit]!, 0));
    const label = route.map((ride) => ride.way).join(' → ');
    const current = ways.get(first.way);
    if (!current || ticks[0]! < current.ticks[0]!) ways.set(first.way, { label, ticks });
  }
  const ordered = [...ways.values()].sort((a, b) => a.ticks[0]! - b.ticks[0]!);
  const best = fewestRides === 1 ? ordered : ordered.slice(0, 2);
  return best.map(({ label, ticks }, i) => {
    const minutes = ticks.map((t) => (t / ticksPerMinute).toFixed(2)).join(' | ');
    const way = best.length === 1 ? `${label} (one way only)` : label;
    const joined = i === 0 ? (shortest / ticksPerMinute).toFixed(2) : '';
    const flag = i === 0 ? (shortest <= 4 * ticksPerMinute ? 'Pass' : '**Fail**') : '';
    return `| ${town} | ${way} | ${minutes} | ${joined} | ${flag} |`;
  });
}

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const columns = BOILER.map((_, fit) => (fit === 0 ? 'First fit (0)' : `Fit ${fit}`));
const report = [
  '# Ride minutes from Home',
  '',
  `Catalog measured at \`${commit}\`. Regenerate with \`node dev/level/ride-minutes.ts --report\`.`,
  '',
  'Times use the sim’s train profiles and all catalogued track and halts that can open. Depart from the Village or West landing at Home. Each ride runs non-stop on request and times exclude walks, waits and holds.',
  '',
  'The table shows each direct way on the joined catalog. Where a town needs a transfer, it shows up to two departures with the fewest rides, changing at halts with the same town name. It picks the fastest route at the first fit for each departure and carries that route across the other fits. Fit 0 uses each line’s standard speed. The joined-ring column shows the shortest first-fit time across all routes, including transfers. The four-minute rule uses that time before rounding.',
  '',
  `| Town or hub | From Home via | ${columns.join(' | ')} | Joined ring (min) | First-fit rule |`,
  `| --- | --- | ${columns.map(() => '---:').join(' | ')} | ---: | --- |`,
  ...[...towns].sort().flatMap(rowsFor),
  '',
].join('\n');

if (process.argv.includes('--report'))
  writeFileSync(new URL('../../docs/reports/ride-minutes.md', import.meta.url), report);
process.stdout.write(report);
