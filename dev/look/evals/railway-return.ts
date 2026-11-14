// npm run look -- --real --query 'from=gorge-reached' --eval dev/look/evals/railway-return.ts
// --until "(import('/dev/look/bots/railway-return.ts').then(m=>m.start()), !!document.documentElement.dataset.railwayReturn)"
// A real reload destroys this document; --until reattaches the observer in the new one.
const { start } = (await import(
  '/dev/look/bots/railway-return.ts' as string
)) as typeof import('../bots/railway-return.ts');
start();
export {};
