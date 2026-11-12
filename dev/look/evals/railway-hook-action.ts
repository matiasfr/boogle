// command: unknown, needs the seed and --until: the action half of dev/look/bots/railway-hook-capture.ts (pair with --eval dev/look/evals/railway-hook-capture.ts; docs/plans/hook-shot.md has the photo frames)
const { act } = (await import(
  '/dev/look/bots/railway-hook-capture.ts' as string
)) as typeof import('../bots/railway-hook-capture.ts');
act();
export {};
