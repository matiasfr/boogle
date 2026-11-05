// The same module is re-entered by look's --until import after each real page reload; start is once per document.
const { start } = (await import(
  '/dev/look/bots/railway-reload.ts' as string
)) as typeof import('../bots/railway-reload.ts');
start();
export {};
