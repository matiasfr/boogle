import { simulateCampaign } from './campaign.ts';
import type { CampaignOptions, Policy } from './campaign-types.ts';
import { POLICIES } from './campaign-types.ts';
import { parseOption } from './options.ts';
import { threeArea } from './three-area.ts';
import { fiveArea } from './five-area.ts';
import { writeCampaignReport } from './report.ts';
import { headline, playRooms } from './trade-model.ts';
import { routeSpine } from './trade-route.ts';

const args = process.argv.slice(2);
const routes = [threeArea, fiveArea];
const help =
  'economy [three-area|five-area] [--players=1..4] [--policy=route-first|tool-first|cart-first|town-first|optional-first] [--core-only] [--content=N] [--cost=N] [--supply=N] [--distance=N] [--scenario=late-3h|late-7h|1-2-1|absence] [--omit=ID,ID] [--json]\neconomy trade [--players=1..3] [--seed=N] [--json]  # the passenger-trade model: four rooms over the route\neconomy --report  # regenerate both routes, all parties, comparisons, Markdown, JSON and 3 SVGs';
if (args.includes('--help')) console.log(help);
else if (args[0] === 'trade') {
  const num = (k: string, d: number) => Number(args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
  const rooms = playRooms(routeSpine(), undefined, { players: num('players', 1), seed: num('seed', 1) });
  if (args.includes('--json')) console.log(JSON.stringify(rooms.map(headline), null, 2));
  else
    console.table(
      rooms.map(headline).map((h) => ({
        room: h.id,
        routeH: +h.routeHours.toFixed(2),
        earned: Math.round(h.earned),
        spent: Math.round(h.spent),
        capped: Math.round(h.capped),
        houses: h.houses,
        seatHaulMin: +h.seatHaulMin.toFixed(1),
        sourceSavedMin: +h.sourceSavedMin.toFixed(1),
        goalsH: h.goalHours === null ? '-' : +h.goalHours.toFixed(2),
      })),
    );
}
else if (args.includes('--report')) {
  if (args.length !== 1) throw new Error('--report uses the complete fixed comparison suite; no other flags');
  writeCampaignReport(routes);
} else {
  const options: CampaignOptions = {};
  let selected = routes,
    party: number | undefined,
    scenario: string | undefined,
    json = false;
  for (const arg of args) {
    if (arg === '--json') json = true;
    else if (arg === '--core-only') options.optional = false;
    else if (routes.some((c) => c.id === arg)) selected = routes.filter((c) => c.id === arg);
    else {
      const [key, value] = parseOption(arg) ?? [];
      if (value === undefined) throw new Error(`Unknown argument ${arg}\n${help}`);
      if (key === 'players') party = Number(value);
      else if (key === 'scenario') scenario = value;
      else if (key === 'omit') options.omit = value.split(',');
      else if (key === 'policy') {
        if (!POLICIES.includes(value as Policy)) throw new Error(`Unknown policy ${value}`);
        options.policy = value as Policy;
      } else if (key === 'content' || key === 'cost' || key === 'supply' || key === 'distance')
        options[key] = Number(value);
      else throw new Error(`Unknown argument ${arg}\n${help}`);
    }
  }
  const results = selected.flatMap((c) => {
    if (scenario && !c.scenarios[scenario]) throw new Error(`Unknown scenario ${scenario}`);
    for (const id of options.omit ?? [])
      if (!c.tasks.some((t) => t.id === id && t.optional)) throw new Error(`Can only omit an optional task: ${id}`);
    if (scenario && party !== undefined) throw new Error('--scenario defines its own attendance; omit --players');
    return (scenario ? [1] : party === undefined ? [1, 2, 3, 4] : [party]).map((p) =>
      simulateCampaign(c, p, { ...options, presence: scenario ? c.scenarios[scenario] : undefined }),
    );
  });
  if (json) console.log(JSON.stringify(results, null, 2));
  else
    console.table(
      results.map((r) => ({
        route: r.route,
        party: r.party,
        policy: r.policy,
        complete: r.complete,
        minutes: +(r.elapsedS / 60).toFixed(1),
        authored: +(r.authoredS / 60).toFixed(1),
        hauling: +(r.haulOnlyS / 60).toFixed(1),
        waiting: +(r.waitS / 60).toFixed(1),
        loads: r.totals.loads,
        concurrent: r.totals.maxConcurrentDeliveries,
      })),
    );
  if (results.some((r) => !r.complete)) process.exitCode = 1;
}
