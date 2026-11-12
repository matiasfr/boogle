// npm run look -- --at "path opened" --curves --action dev/look/evals/sprint-jump.ts --seconds 6 --frames 2
// An action for `--curves`: sprint from standing, jump twice, stop. Real keys' state; pair with --seconds 6 and --at.
const { input } = await import('/src/player/input.ts' as string);
const { me } = await import('/src/player/player.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
void (async () => {
  input.keys.add('KeyW');
  input.keys.add('ShiftLeft');
  await wait(1800);
  me.jumpQueued = 0.2;
  await wait(1500);
  me.jumpQueued = 0.2;
  await wait(1200);
  input.keys.delete('KeyW');
  input.keys.delete('ShiftLeft');
})();
export {};
