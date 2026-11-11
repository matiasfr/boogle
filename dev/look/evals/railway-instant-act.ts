// Action for the instant-feedback capture (replication R1b; setup: railway-instant.ts): three strokes at the tree, then
// the walk to the active frame, whose automatic unload deposits. Each stroke's logs must reach the back on its contact
// beat, not a round trip later: it logs press -> visible carry per stroke, and the adapter's own press -> effect cost.
const { account, activeStation, inspectRailway, railAt, railJobs, railPid, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { CHOP_CONTACT } = (await import(
  '/src/place/chop-timing.ts' as string
)) as typeof import('../../../src/place/chop-timing.ts');
const bot = makeBot({
  recover: () => {
    throw new Error('Instant-feedback action needed recovery');
  },
});
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const read = () => inspectRailway()!;
const carry = () => account(rw(), railPid())?.carry ?? 0;
// Strokes from the side: six metres off the line from the player to the tree, so neither hides the other.
{
  const p = me.body!.position;
  const tree = read().trees.reduce((a, b) =>
    Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b,
  );
  const dx = tree.x - p.x,
    dz = tree.z - p.z,
    d = Math.hypot(dx, dz) || 1;
  const mx = (p.x + tree.x) / 2,
    mz = (p.z + tree.z) / 2;
  window.__debugCam?.set([mx - (dz / d) * 6, p.y + 2.5, mz + (dx / d) * 6], [mx, p.y + 0.6, mz]);
}
const frame = () => new Promise<number>((r) => requestAnimationFrame(() => r(performance.now())));
background(
  (async () => {
    const strokes: { pressToCarryMs: number; frames: number; afterContactMs: number; pendingAtShow: number }[] = [];
    for (let k = 0; k < 3; k++) {
      const before = carry();
      const t0 = performance.now();
      bot.press();
      let frames = 0;
      while (carry() === before && frames < 240) {
        await frame();
        frames++;
      }
      const ms = performance.now() - t0;
      strokes.push({
        pressToCarryMs: Math.round(ms),
        frames,
        afterContactMs: Math.round(ms - CHOP_CONTACT * 1000),
        pendingAtShow: read().pending,
      });
      await bot.wait(450);
    }
    window.__debugCam?.clear(); // the game's follow camera for the walk to the frame and its unload
    const station = read().station;
    const carried = carry();
    await bot.walk(station.x, station.z, 3);
    await bot.until(() => carry() < carried, 8000, 'the frame takes a log');
    const pendingWhenFirstLogLeft = read().pending;
    await bot.until(() => read().pending === 0 && carry() === 0, 20000, 'every deposit settles');
    const s = read();
    console.log(
      `RAILWAY INSTANT act ${JSON.stringify({
        strokes,
        pendingWhenFirstLogLeft,
        responseMs: s.prediction.responseMs.slice(-12).map((x) => Math.round(x * 100) / 100),
        corrected: s.prediction.corrected,
        predicted: s.prediction.predicted,
        stock: railJobs(rw(), railAt())[activeStation(rw())]!.job.stock,
      })}`,
    );
  })(),
  'instant-feedback action',
);
export {};
