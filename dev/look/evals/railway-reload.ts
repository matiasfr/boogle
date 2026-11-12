// The same module is re-entered by look's --until import after each real page reload; start is once per document.
// Run it real-time (a warp ends with the first reload, which destroys the page's warp state and the poll's context):
//   npm run look -- --real --eval dev/look/evals/railway-reload.ts --wall 800 --until "(import('/dev/look/bots/railway-reload.ts').then(m=>m.start()), document.documentElement.dataset.railwayRecovery==='done')"
// The --until expression is the re-attach: each poll after a reload imports the bot into the new document.
const { start } = (await import(
  '/dev/look/bots/railway-reload.ts' as string
)) as typeof import('../bots/railway-reload.ts');
start();
export {};
