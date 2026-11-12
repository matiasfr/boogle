// npm run look -- --rail-seed q6-stocked --query b58at=apron --eval dev/look/evals/railway-b5b8-at.ts --action dev/look/evals/railway-q6-forge.ts --video --seconds 10
//  (seed: any with station 6 active; trains-on shows the rails rack after trains run)
// Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 1), for `look --action` after `--eval
// railway-b5b8-at.ts --query b58at=apron` on a seed with station 6 active: walk up to the forge's rails rack, then to
// the boiler's pedestal, logging what each offers. Before trains the rack offers no "Take rails"; once they run it does.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { forge, inspectRailway, line2Active, line2Trains, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const bot = makeBot();
const face = (x: number, z: number) => {
  const p = me.body!.position;
  cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
};
const read = () => inspectRailway()!;
const report = (beat: string) => {
  const w = rw();
  console.log(
    `SIXFORGE ${beat} ${JSON.stringify({
      offered: interactTarget()?.verb ?? null,
      blocked: interactTarget()?.blocked ?? null,
      active: line2Active(w),
      trains: line2Trains(w),
      rack: forge(w).rack,
      trainOwed: (read().line2View as { trainOwed?: boolean }).trainOwed,
    })}`,
  );
};
const rack = (read().line2View as { forgeRack: { x: number; z: number } }).forgeRack;
// From the rack's west side, 6 m from the pedestal, so the boiler's prompt can't win the pick.
await bot.walk(rack.x - 1.6, rack.z + 0.6, 0.4);
face(rack.x, rack.z);
await bot.wait(600);
report('at the forge rack');
const pedestal = (read().line2View as { boiler: { x: number; z: number } }).boiler;
await bot.walk(pedestal.x + 2.4, pedestal.z + 1.2, 0.4);
face(pedestal.x, pedestal.z);
await bot.wait(600);
report('at the pedestal');
export {};
