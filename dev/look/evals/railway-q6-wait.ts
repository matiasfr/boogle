// Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 1), for `look --action` on `--rail-seed
// q5-done` after `--eval railway-b5b8-at.ts --query b58at=head`: chop a load from the nearest tree, stand at the depot rack
// (whose leftover logs offer no "Pick up"), then walk into the frame's reach loaded. Logs what was offered, the sign
// and the nudge count; the motion sheet films the one bob and puff.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { account, inspectRailway, line2Trains, rail, rw, railPid, qjob } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const bot = makeBot();
const read = () => inspectRailway()!;
const carry = () => account(rw(), railPid())?.carry ?? 0;
const report = (beat: string) => {
  const w = rw(),
    acct = account(w, railPid()),
    v = read().line2View as { trainOwed?: boolean; q6Sign?: unknown; depot?: number[] | null };
  console.log(
    `SIXWAIT ${beat} ${JSON.stringify({
      offered: interactTarget()?.verb ?? null,
      carry: acct?.carry ?? 0,
      railsCarry: acct?.rails ?? 0,
      depot: rail(w).depot,
      q6: { stock: qjob(w, 5).stock, railStock: qjob(w, 5).railStock },
      trains: line2Trains(w),
      trainOwed: v.trainOwed,
      sign: v.q6Sign,
    })}`,
  );
};
report('start');
// A load from the standing tree nearest the frame, chopped by hand.
const frame = (read().line2View as { frames: { x: number; z: number }[] }).frames[5]!;
const tree = read()
  .trees.filter((t) => !t.cleared && t.remaining >= 8)
  .sort((a, b) => Math.hypot(a.x - frame.x, a.z - frame.z) - Math.hypot(b.x - frame.x, b.z - frame.z))[0];
if (!tree || !(await bot.use(tree.x, tree.z, 'a tree', /^Chop$/))) throw new Error('no tree');
if (!(await bot.work(() => carry() >= 8, 60000))) throw new Error('the logs never came onto the back');
await bot.wait(600);
report('loaded');
const depot = (read().line2View as { depot: number[] | null }).depot!;
await bot.walk(depot[0]!, depot[2]!, 1.2);
await bot.wait(500);
report('at the rack');
// `q6cam=frame`: the debug camera on the frame and its rack, so the sheet catches the sign's bob.
if (new URLSearchParams(location.search).get('q6cam') === 'frame') {
  const [x, y, z] = depot;
  window.__debugCam!.set([x! - 7, y! + 3.5, z! + 6], [(x! + frame.x) / 2, y! + 1.4, (z! + frame.z) / 2], 55);
}
// Up to the frame from the rack's side, stopping 1.6 m short (its posts and the parked machine stand round it).
const toward = Math.hypot(depot[0]! - frame.x, depot[2]! - frame.z);
const ok = await bot.walk(
  frame.x + ((depot[0]! - frame.x) / toward) * 1.6,
  frame.z + ((depot[2]! - frame.z) / toward) * 1.6,
  0.6,
);
console.log(`SIXWAIT walked ${ok}`);
await bot.wait(300);
report('in reach');
await bot.wait(2500);
report('settled');
export {};
