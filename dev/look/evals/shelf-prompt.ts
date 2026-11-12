// npm run look -- --rail-seed q6-done --query townat=shelf --eval dev/look/evals/railway-town.ts --action dev/look/evals/shelf-prompt.ts --hud
// --action for dev/look/evals/railway-town.ts with townat=shelf: says what the hands would act on in front of the curio
// shelf. Pause's You page dresses you now, so the shelf offers nothing ("Swap ..." prompts went, 10 November).
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
await new Promise((resolve) => setTimeout(resolve, 1200));
const target = interactTarget();
console.log(`SHELF target=${target?.id ?? 'none'} verb=${target?.verb ?? ''} at=${JSON.stringify(me.body?.position)}`);
export {};
