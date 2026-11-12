// npm run look -- --players 2 --eval dev/look/evals/coop-unlock.ts --query 'shot=play&coopShot=unlock&cardMs=20000'
// Co-op abilities captures (dev/look/bots/coop-unlock.ts). The module is re-entered by look's --until import after
// the late shot's real page reload; start is once per document.
const { start } = (await import('/dev/look/bots/coop-unlock.ts' as string)) as typeof import('../bots/coop-unlock.ts');
start();
export {};
