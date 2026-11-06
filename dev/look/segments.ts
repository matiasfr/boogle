// Named ends of route work, not shortcuts that manufacture game state. Both runners record these through saves.ts.
export const CHECKPOINTS = ['at-cove', 't1-done', 't2-funded', 'pier-ending'] as const;
export const BEATS = [
  'at-cove',
  'wake',
  't1-done',
  't2-funded',
  'T2',
  'T3',
  'jump',
  'forge-lit',
  'Q1',
  'Q2',
  'hook',
  'Q3',
  'Q4',
  'Q5',
  'glider',
  'trains',
  'pier-ending',
  'Q6',
  'pier',
  'audio-loop',
] as const;

export function segmentOptions(args: string[]) {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    if (!args[i + 1] || args[i + 1]!.startsWith('--')) throw new Error(`${flag} needs a value`);
    return args[i + 1];
  };
  const from = value('--from');
  const next: Record<string, string> = {
    'at-cove': 't1-done',
    't1-done': 'T2',
    't2-funded': 'T2',
    'pier-ending': 'pier',
  };
  const to = value('--to') ?? (args.includes('--regenerate') ? 'pier' : from ? next[from] : undefined);
  if (from && !CHECKPOINTS.some((name) => name === from)) throw new Error(`--from: ${CHECKPOINTS.join(', ')}`);
  if (to && !BEATS.some((name) => name === to)) throw new Error(`--to: ${BEATS.join(', ')}`);
  if (from && args.includes('--regenerate')) throw new Error('Regeneration starts fresh; omit --from');
  if (from && to && BEATS.findIndex((n) => n === to) <= BEATS.findIndex((n) => n === from))
    throw new Error('--to must follow --from');
  return { from, to, regenerate: args.includes('--regenerate'), saves: value('--saves') };
}
