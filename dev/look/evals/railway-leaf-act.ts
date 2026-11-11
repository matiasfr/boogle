// R4c proof (docs/plans/ring-island-build1.md, step 4c), `look --action` at `--rail-seed leaf-raised`: the leaf's swing
// reached through the real prompts. The bot is set down on the brace platform and knocks out the pawl at the gold strut ("Knock out the pawl"), then four
// times takes a footing off the railhead rack and sets it at the jib ("Shoulder a footing", "Hang the weight"); the
// fourth brings the leaf down and the motion sheet films it. `leafdo=under` steps onto the platform's last metre (u 259.4,
// the toe's landing) the moment the last footing is hung, to see the player walked clear. Staging teleports only.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { aperture, inspectRailway, ringOpen, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const doing = new URLSearchParams(location.search).get('leafdo') ?? '';
const bot = makeBot();
const head = layout.RING_HEAD[7]!;
const say = (text: string) => console.log(`LEAF ${text}`);
const state = () => {
  // The leaf's swing is the Works view's; the ring is rows (ringOpen's head, the aperture's set and joined).
  const w = rw();
  return JSON.stringify({ leaf: inspectRailway()?.worksView?.leafView, ring: { ...ringOpen(w), ...aperture(w) } });
};
/** Set down at (u, lat) on a deck whose top is `y` m. */
function stand(u: number, lat: number, y: number) {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
  teleport(me.body!, p.x / 100, y + 0.85, p.z / 100);
  me.body!.velocity.set(0, 0, 0);
}
const site = (s: { x: number; z: number }) => [s.x / 100, s.z / 100] as const;
say(`start ${state()}`);
stand(288, 3.4, layout.RING_BRACE.y / 100);
await bot.wait(400);
if (!(await bot.use(...site(layout.RING_BRACE), 'knock out the pawl', /Knock out the pawl/)))
  throw new Error('the brace was not offered');
await bot.wait(900);
say(`braced ${state()}`);
async function take(n: number) {
  stand(238.5, 4.8, head.rack.y / 100);
  await bot.wait(400);
  if (!(await bot.use(...site(head.rack), 'shoulder a footing', /Shoulder a footing/))) throw new Error(`no take ${n}`);
  await bot.wait(700);
  stand(254, 3.6, head.jib.y / 100);
  await bot.wait(400);
}
async function hang(n: number) {
  if (!(await bot.use(...site(head.jib), 'hang the weight', /Hang the weight/))) throw new Error(`no set ${n}`);
  say(`hung ${n} ${state()}`);
}
for (let n = 1; n <= 3; n++) {
  await take(n);
  await hang(n);
  await bot.wait(1500);
}
await take(4);
// The last footing is hung after this returns, so the motion sheet films the whole swing.
void (async () => {
  await hang(4);
  if (doing === 'under') {
    await bot.wait(300);
    stand(259.4, 3.6, head.jib.y / 100);
  }
})();
for (const ms of [0, 500, 1000, 1500, 2000, 2500, 3500])
  setTimeout(() => {
    const u = me.body!.position;
    say(`after ${ms} at ${u.x.toFixed(1)},${u.y.toFixed(1)},${u.z.toFixed(1)} ${state()}`);
  }, ms);
export {};
