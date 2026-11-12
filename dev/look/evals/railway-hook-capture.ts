// command: unknown, needs the seed and --until: the setup half of dev/look/bots/railway-hook-capture.ts (pair with --action dev/look/evals/railway-hook-action.ts; docs/plans/hook-shot.md has the photo frames)
const { start } = (await import(
  '/dev/look/bots/railway-hook-capture.ts' as string
)) as typeof import('../bots/railway-hook-capture.ts');
start();
export {};
