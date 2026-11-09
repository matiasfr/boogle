// Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 1), for `look --action` on `--rail-seed
// q6-pile` after `--eval railway-b5b8-at.ts --query b58at=head`: pick up the seeded pile, stand at the depot rack
// (whose leftover logs offer no "Pick up"), then walk into the frame's reach loaded. Logs what was offered, the sign
// and the nudge count; the motion sheet films the one bob and puff.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const bot = makeBot();
const read = () => inspectRailway()!;
const report = (beat: string) => {
  const s = read(),
    v = s.line2View as { trainOwed?: boolean; q6Sign?: unknown; depot?: number[] | null };
  console.log(
    `Q6WAIT ${beat} ${JSON.stringify({
      offered: interactTarget()?.verb ?? null,
      carry: s.carry,
      railsCarry: s.railsCarry,
      depot: s.line2.depot,
      q6: { stock: s.line2.stations[5]!.stock, railStock: s.line2.stations[5]!.railStock },
      trains: s.line2.trains,
      trainOwed: v.trainOwed,
      sign: v.q6Sign,
    })}`,
  );
};
report('start');
if (!(await bot.use(1366, -176, 'the seeded pile', /^Pick up$/))) throw new Error('no pile');
if (!(await bot.work(() => read().carry > 0, 20000))) throw new Error('the pile never came onto the back');
await bot.wait(600);
report('loaded');
const depot = (read().line2View as { depot: number[] | null }).depot!;
await bot.walk(depot[0]!, depot[2]!, 1.2);
await bot.wait(500);
report('at the rack');
const frame = (read().line2View as { frames: { x: number; z: number }[] }).frames[5]!;
// `q6cam=frame`: the debug camera on the frame and its rack, so the sheet catches the sign's bob.
if (new URLSearchParams(location.search).get('q6cam') === 'frame') {
  const [x, y, z] = depot;
  window.__debugCam!.set([x! - 6, y! + 3.5, z! + 7], [x!, y! + 1.6, z!], 55);
}
await bot.walk(frame.x, frame.z, 2);
await bot.wait(300);
report('in reach');
await bot.wait(2500);
report('settled');
export {};
