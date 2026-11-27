// Exercises the accepted stage change seen by a stationary listener when a teammate strikes the first seam.
const { createForgeGuide } = (await import(
  '/src/entities/railway/forge-guide.ts' as string
)) as typeof import('../../../src/entities/railway/forge-guide.ts');
const { createOwnedView } = (await import(
  '/src/render/owned-view.ts' as string
)) as typeof import('../../../src/render/owned-view.ts');
const { addLooker, folk } = (await import(
  '/src/place/folk.ts' as string
)) as typeof import('../../../src/place/folk.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { inputState } = (await import(
  '/src/player/input-state.ts' as string
)) as typeof import('../../../src/player/input-state.ts');
const { x, y, z } = me.body!.position;
const owner = createOwnedView();
const guy = addLooker(x + 1, y, z, 0, '#2f5d8a');
let stage: 'seam' | null = 'seam';
const guide = createForgeGuide(owner, { body: () => guy, stage: () => stage, ready: () => true });
try {
  await Promise.all([import('/src/place/talk.ts' as string), import('/src/place/chatter.ts' as string)]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  guide.update(1 / 60);
  guide.targets()[0]?.run?.();
  if (!guide.speaking()) throw new Error('Setup failed to open foreman Talk');
  stage = null;
  guy.on = false;
  guide.update(1 / 60);
  if (guide.speaking() || inputState.holder === 'conversation')
    throw new Error('Removing the foreman after the first seam must close Talk and release input');
  Object.assign(window, { __placeDone: true });
} finally {
  owner.dispose();
  folk.guys.splice(folk.guys.indexOf(guy), 1);
}
export {};
