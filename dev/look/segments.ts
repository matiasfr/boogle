// Named ends of the production railway route, not shortcuts that manufacture game state.
/** `--to <name>`: the railway bot's beat it stops after (`?botTo=`), in route order. `crossing` sets no stop. */
export const RAIL_STOPS = {
  'audio-loop': 'audio loop',
  wake: 'awake',
  't1-done': 'T1 production completed',
  't2-funded': 'T2 funded',
  T2: 'T2 laid',
  T3: 'T3 laid',
  jump: 'optional jump used',
  'forge-lit': 'forge lit',
  Q1: 'Q1 laid',
  Q2: 'Q2 laid',
  hook: 'hook taken',
  Q3: 'Q3 laid',
  Q4: 'Q4 laid',
  Q5: 'Q5 laid',
  glider: 'glided home',
  trains: 'TRAINS',
  // Slice 5 (R1, R2): meant with `--from trains-on`; the bot waits until line 1's first timber is at the Village. A bare
  // `--to freight` plays the whole route first (past the 300 s limit in a run on 12 November).
  freight: 'freight home',
  // Slice 5 (R3): meant with `--from trains-on` too (the trade seeds are jump-ins, not `--from` seeds); the bot waits
  // until the first fare is in the strongbox (the mirror's Till.landed > 0).
  fare: 'fare landed',
  Q6: 'Q6 laid',
  pier: 'pier',
  wagon: 'wagon coupled',
  crossing: 'crossing footed',
  Q7: 'Q7 laid',
  // Ring Island's part (dev/look/bots/railway-ring.ts), from `--from deck-laid`, `gap-footed` or `leaf-raised`: these are its checkpoints.
  railhead: 'railhead reached',
  'gap-footed': 'gap footed',
  gap: 'gap glided',
  braced: 'leaf braced',
  'ring-joined': 'ring joined',
  'ring-ride': 'ring ridden',
  // Ring Island build 2's part (dev/look/bots/railway-steel.ts), from `--from ring-joined` or a steel seed: its checkpoints.
  'steel-lit': 'steel works lit',
  'steel-home': 'steel home',
  'boiler-long': 'boiler installed',
  // The greybox route's legs (dev/look/bots/railway-legs.ts): leg 1 from `--from ring-joined`, `gorge-open` or
  // `gorge-mid`; leg 2 from `gorge-reached` or a later leg seed. Bell Rock is reached by the incline's last ride, the
  // bay when the bay cut's first train brings the bot to Bell Rock's upper platform. Leg 3 (greybox-leg3.md, step 7)
  // from `bay-reached`: canopy once the bot, the glider cloth taken at Canopy Town, has ridden home to the West landing.
  gorge: 'gorge reached',
  bell: 'bell reached',
  bay: 'bay reached',
  canopy: 'canopy home',
  port: 'port home',
  'deep-span': 'deep span open',
  lap: 'lap ridden',
  wall: 'wall home',
  notch: 'Notch reached',
  original: 'meeting post pressed',
  ending: 'ending card closed',
} as const;
export type RailStop = keyof typeof RAIL_STOPS;
/** The greybox legs' stops (dev/look/bots/railway-legs.ts). */
const LEG_STOPS: readonly RailStop[] = [
  'gorge',
  'bell',
  'bay',
  'canopy',
  'port',
  'deep-span',
  'lap',
  'wall',
  'notch',
  'original',
  'ending',
];
/** `--from <stage>`: an accepted `--rail-seed` server save that its `bot` eval resumes from (its `railFrom`).
 * Seeds are written per run through the real host's save path; there are no client fixtures to keep. */
export const RAIL_FROM = {
  'q5-done': { railFrom: 'boiler', after: 'Q5', bot: 'railway-b5b8-bot.ts' },
  'trains-on': { railFrom: 'q6', after: 'trains', bot: 'railway-b5b8-bot.ts' },
  'works-arrive': { railFrom: 'works', after: 'pier', bot: 'railway-works-bot.ts' },
  'wagon-on': { railFrom: 'wagon', after: 'wagon', bot: 'railway-works-bot.ts' },
  'crossing-done': { railFrom: 'ring-deck', after: 'crossing', bot: 'railway-ring-bot.ts' },
  // Ring Island build 1 (R5): the footed gap, the leaf raised on its pawl, the wagon's last four on the railhead rack.
  'deck-laid': { railFrom: 'ring', after: 'crossing', bot: 'railway-ring-bot.ts' },
  'gap-footed': { railFrom: 'ring', after: 'crossing', bot: 'railway-ring-bot.ts' },
  'leaf-raised': { railFrom: 'ring', after: 'crossing', bot: 'railway-ring-bot.ts' },
  // Ring Island build 2 (R5): the steel bot rides out, feeds the works, brings the steel home and holds the Install.
  // Each phase reads the rows first, so it resumes from the steel seeds as well.
  'ring-joined': { railFrom: 'steel', after: 'ring-joined', bot: 'railway-steel-bot.ts' },
  'steel-kit': { railFrom: 'steel', after: 'ring-joined', bot: 'railway-steel-bot.ts' },
  'steel-lit': { railFrom: 'steel', after: 'steel-lit', bot: 'railway-steel-bot.ts' },
  'steel-home': { railFrom: 'steel', after: 'steel-home', bot: 'railway-steel-bot.ts' },
  // Leg 1 (greybox route step 5): the stack line to High Gorge. `--from ring-joined --to gorge` runs it too.
  'gorge-open': { railFrom: 'legs', after: 'ring-joined', bot: 'railway-legs-bot.ts' },
  'gorge-mid': { railFrom: 'legs', after: 'ring-joined', bot: 'railway-legs-bot.ts' },
  // Leg 2 (greybox-leg2.md, step 5): the pick, the barrier, the incline to Bell Rock, the seeds, the ride home and the bay
  // cut, from High Gorge reached (the seed starts at the Village).
  'gorge-reached': { railFrom: 'legs', after: 'gorge', bot: 'railway-legs-bot.ts' },
  // Leg 3 (greybox-leg3.md, step 7): the Canopy barrier at Bell Rock, the three sections to Canopy Town, the cloth and
  // the ride home, from the bay cut laid (the seed starts at the Village).
  'bay-reached': { railFrom: 'legs', after: 'bay', bot: 'railway-legs-bot.ts' },
  'cave-first-open': { railFrom: 'legs', after: 'bay', bot: 'railway-legs-bot.ts' },
  'cave-first-reached': { railFrom: 'legs', after: 'bay', bot: 'railway-legs-bot.ts' },
  // Garage step 4 (garage-step4.md, step 4): the bay cut's second section and leg 3 from its first lay. `trade-ready`
  // has the works' 12 steel home, so `--query railFit=strong` (or quick) fits the bay line at the post first;
  // `bay-mid`'s pool is empty and a fit asked there fails.
  'bay-mid': { railFrom: 'legs', after: 'bell', bot: 'railway-legs-bot.ts' },
  'trade-ready': { railFrom: 'legs', after: 'bell', bot: 'railway-legs-bot.ts' },
  // Leg 4 starts with the Canopy line laid. The bot collects the cloth and rides home before opening the plug.
  'canopy-reached': { railFrom: 'legs', after: 'bay', bot: 'railway-legs-bot.ts' },
  'port-reached': { railFrom: 'legs', after: 'port', bot: 'railway-legs-bot.ts' },
  // The Wall's final frame, reached through the jump room's landing.
  'wall-mid': { railFrom: 'legs', after: 'port', bot: 'railway-legs-bot.ts' },
  'wall-deep': { railFrom: 'legs', after: 'port', bot: 'railway-legs-bot.ts' },
  'wall-closed': { railFrom: 'legs', after: 'wall', bot: 'railway-legs-bot.ts' },
} as const satisfies Record<string, { railFrom: string; after: RailStop; bot: string }>;
/** Beats both peers pass in a two-player run; the follower watches line two from the village. */
export const RAIL_COOP_STOPS: readonly RailStop[] = [
  'wake',
  't1-done',
  't2-funded',
  'T2',
  'T3',
  'forge-lit',
  'Q3',
  'Q4',
  'Q5',
  'Q6',
  'pier',
  'crossing',
];

export function railSegmentOptions(args: string[]) {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    if (!args[i + 1] || args[i + 1]!.startsWith('--')) throw new Error(`${flag} needs a value`);
    return args[i + 1];
  };
  const names = Object.keys(RAIL_STOPS) as RailStop[];
  const isStop = (name: string): name is RailStop => names.some((n) => n === name);
  const isSeed = (name: string): name is keyof typeof RAIL_FROM => name in RAIL_FROM;
  if (args.includes('--regenerate') || args.includes('--saves'))
    throw new Error('Production seeds are server saves built per run: npm run checkpoints checks every stage builds');
  const from = value('--from'),
    to = value('--to');
  if (from !== undefined && !isSeed(from)) throw new Error(`--from: ${Object.keys(RAIL_FROM).join(', ')} (rail seeds)`);
  if (to !== undefined && !isStop(to)) throw new Error(`--to: ${names.join(', ')}`);
  // `ring-joined` runs the steel bot, or the leg bot when the stop is a leg's.
  const seed = from
    ? from === 'ring-joined' && to !== undefined && LEG_STOPS.includes(to)
      ? RAIL_FROM['gorge-open']
      : RAIL_FROM[from]
    : undefined;
  const caveSeed = from === 'cave-first-open' || from === 'cave-first-reached';
  const order = value('--order') ?? (caveSeed ? 'cave' : 'canopy');
  if (order !== 'canopy' && order !== 'cave') throw new Error('--order: canopy or cave');
  if (args.includes('--order') && seed?.bot !== 'railway-legs-bot.ts')
    throw new Error('--order requires a seed for the legs bot');
  if (order === 'cave' && from === 'canopy-reached') throw new Error('--from canopy-reached has already built Canopy');
  if (from === 'cave-first-reached' && order !== 'cave') throw new Error(`--from ${from} has already built the cave`);
  if (from === 'cave-first-reached' && to === 'port')
    throw new Error('--from cave-first-reached has already reached Port Quay');
  if (seed && to && names.indexOf(to) <= names.indexOf(seed.after))
    throw new Error(`--to must follow ${seed.after} when starting from ${from}`);
  // A seed's bot stops only at its own beats: the legs' stops are the legs bot's, the rest another bot's. A bot that
  // never reaches the stop would finish its own route and pass without it.
  if (to === 'deep-span' && from !== 'wall-deep') throw new Error('--to deep-span requires --from wall-deep');
  if (from === 'wall-deep' && to && to !== 'deep-span') throw new Error('--from wall-deep plays to deep-span');
  if (from === 'crossing-done' && to !== 'Q7') throw new Error('--from crossing-done plays to Q7');
  if (to === 'Q7' && from !== 'crossing-done') throw new Error('--to Q7 requires --from crossing-done');
  if (from === 'works-arrive' && to !== 'wagon' && to !== 'crossing')
    throw new Error('--from works-arrive plays to wagon or crossing');
  if (from === 'wagon-on' && to !== 'crossing') throw new Error('--from wagon-on plays to crossing');
  if (to === 'wagon' && from !== 'works-arrive') throw new Error('--to wagon requires --from works-arrive');
  if (to === 'crossing' && from && from !== 'works-arrive' && from !== 'wagon-on')
    throw new Error('--to crossing from a seed requires --from works-arrive or wagon-on');
  // With no seed the wake bot runs (railway-job.ts), and it never plays the greybox legs.
  if (!seed && to && LEG_STOPS.includes(to))
    throw new Error(
      `--to ${to}: the wake bot never plays the legs; --from ${(Object.keys(RAIL_FROM) as (keyof typeof RAIL_FROM)[])
        .filter(
          (k) =>
            RAIL_FROM[k].bot === RAIL_FROM['gorge-open'].bot && names.indexOf(to) > names.indexOf(RAIL_FROM[k].after),
        )
        .join(', ')}`,
    );
  if (seed && to) {
    const legStop = LEG_STOPS.includes(to);
    const playsTo = (s: { bot: string }) => (s.bot === RAIL_FROM['gorge-open'].bot) === legStop;
    if (!playsTo(seed)) {
      const can = legStop
        ? `--from ${(Object.keys(RAIL_FROM) as (keyof typeof RAIL_FROM)[])
            .filter((k) => playsTo(RAIL_FROM[k]) && names.indexOf(to) > names.indexOf(RAIL_FROM[k].after))
            .join(', ')}`
        : `the legs bot plays only to ${LEG_STOPS.join(', ')}`;
      throw new Error(`--to ${to}: the ${from} seed's bot (${seed.bot}) never reaches it; ${can}`);
    }
  }
  return { from, to, seed, order };
}
