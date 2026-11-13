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
  crossing: 'crossing footed',
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
  // The greybox route's leg 1 (dev/look/bots/railway-legs.ts), from `--from ring-joined`, `gorge-open` or `gorge-mid`.
  gorge: 'gorge reached',
} as const;
export type RailStop = keyof typeof RAIL_STOPS;
/** `--from <stage>`: an accepted `--rail-seed` server save that its `bot` eval resumes from (its `railFrom`).
 * Seeds are written per run through the real host's save path; there are no client fixtures to keep. */
export const RAIL_FROM = {
  'q5-done': { railFrom: 'boiler', after: 'Q5', bot: 'railway-b5b8-bot.ts' },
  'trains-on': { railFrom: 'q6', after: 'trains', bot: 'railway-b5b8-bot.ts' },
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
} as const satisfies Record<string, { railFrom: string; after: RailStop; bot: string }>;
/** Beats both peers pass in a two-player run; the follower watches line two from the village. */
export const RAIL_COOP_STOPS: readonly RailStop[] = [
  'wake',
  't1-done',
  't2-funded',
  'T2',
  'T3',
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
  // `ring-joined` runs the steel bot, or the leg bot when the stop is the Gorge.
  const seed = from
    ? from === 'ring-joined' && to === 'gorge'
      ? RAIL_FROM['gorge-open']
      : RAIL_FROM[from]
    : undefined;
  if (seed && to && names.indexOf(to) <= names.indexOf(seed.after))
    throw new Error(`--to must follow ${seed.after} when starting from ${from}`);
  return { from, to, seed };
}
