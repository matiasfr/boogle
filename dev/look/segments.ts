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
  Q6: 'Q6 laid',
  pier: 'pier',
  crossing: 'crossing footed',
} as const;
export type RailStop = keyof typeof RAIL_STOPS;
/** `--from <stage>`: an accepted `--rail-seed` server save that railway-b5b8-bot.ts resumes from (its `railFrom`).
 * Seeds are written per run through the real host's save path; there are no client fixtures to keep. */
export const RAIL_FROM = {
  'q5-done': { railFrom: 'boiler', after: 'Q5' },
  'trains-on': { railFrom: 'q6', after: 'trains' },
} as const satisfies Record<string, { railFrom: string; after: RailStop }>;
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
  const seed = from ? RAIL_FROM[from] : undefined;
  if (seed && to && names.indexOf(to) <= names.indexOf(seed.after))
    throw new Error(`--to must follow ${seed.after} when starting from ${from}`);
  return { from, to, seed };
}
