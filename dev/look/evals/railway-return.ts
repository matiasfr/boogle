// npm run look -- --real --query 'from=gorge-reached' --eval dev/look/evals/railway-return.ts
// --until "(import('/dev/look/bots/railway-return.ts').then(m=>m.start()), !!document.documentElement.dataset.railwayReturn)"
// A real reload destroys this document; --until reattaches the observer in the new one.
// Add returnSave=1 to the query for step 3's Gorge -> train deck -> sea storage-retention proof, without reloading.
const { start } = (await import(
  '/dev/look/bots/railway-return.ts' as string
)) as typeof import('../bots/railway-return.ts');
start();
export {};
