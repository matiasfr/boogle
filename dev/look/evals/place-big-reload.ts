// Restore the full bot's "great beam shouldered" checkpoint in a fresh browser, then exercise the existing Drop input.
const tree = (await import('/src/proto/place/chop.ts' as string)) as typeof import('../../../src/proto/place/chop.ts');
const { bigCargo } = (await import(
  '/src/proto/place/big-cargo.ts' as string
)) as typeof import('../../../src/proto/place/big-cargo.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const check = (label: string, ok: boolean) => {
  if (!ok) throw new Error(`CARGO RELOAD FAIL ${label}`);
  console.log(`CARGO RELOAD PASS ${label}`);
};
check(
  'one saved shoulder restored',
  tree.back.big === 'beam' && tree.back.beam === 1 && tree.trunkTaken() && bigCargo.beam.holder === 'solo',
);
triggerAction('place-drop', 'down');
check(
  'restored cargo can be dropped once',
  tree.back.big === null && tree.back.beam === 0 && tree.trunkDown() && bigCargo.beam.holder === null,
);
const revision = bigCargo.beam.revision;
triggerAction('place-drop', 'down');
check('empty Drop cannot duplicate cargo', bigCargo.beam.revision === revision);
const p = tree.trunkAt();
check(
  'returned or dropped cargo stays reachable',
  Math.hypot(p.x - me.body!.position.x, p.z - me.body!.position.z) < 6.5,
);
window.__debugCam!.set([p.x - 12, p.y + 8, p.z - 12], [p.x, p.y - 0.6, p.z]);
export {};
