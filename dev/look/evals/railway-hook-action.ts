const { act } = (await import(
  '/dev/look/bots/railway-hook-capture.ts' as string
)) as typeof import('../bots/railway-hook-capture.ts');
act();
export {};
