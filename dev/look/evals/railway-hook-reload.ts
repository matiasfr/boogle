// Existing look eval/until mechanism re-enters after a real page reload.
const { startHookReload } = (await import(
  '/dev/look/bots/railway.ts' as string
)) as typeof import('../bots/railway.ts');
startHookReload();
export {};
