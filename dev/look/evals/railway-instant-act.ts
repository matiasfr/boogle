// Action for the instant-feedback capture (replication R1b; setup: railway-instant.ts): three strokes at the tree, then
// the walk to the active frame, whose automatic unload deposits. Each stroke's logs must reach the back on its contact
// beat, not a round trip later: it logs press -> visible carry per stroke, and the adapter's own press -> effect cost.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { CHOP_CONTACT } = (await import(
  '/src/proto/place/chop-timing.ts' as string
)) as typeof import('../../../src/proto/place/chop-timing.ts');
const bot = makeBot({
  recover: () => {
    throw new Error('Instant-feedback action needed recovery');
  },
});
const read = () => inspectRailway()!;
window.__debugCam?.clear(); // the game's own follow camera, behind the player, facing the tree
const frame = () => new Promise<number>((r) => requestAnimationFrame(() => r(performance.now())));
background(
  (async () => {
    const strokes: { pressToCarryMs: number; frames: number; afterContactMs: number; pendingAtShow: number }[] = [];
    for (let k = 0; k < 3; k++) {
      const carry = read().carry;
      const t0 = performance.now();
      bot.press();
      let frames = 0;
      while (read().carry === carry && frames < 240) {
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
    const station = read().station;
    const carried = read().carry;
    await bot.walk(station.x, station.z, 3);
    await bot.until(() => read().carry < carried, 8000, 'the frame takes a log');
    const pendingWhenFirstLogLeft = read().pending;
    await bot.until(() => read().pending === 0 && read().carry === 0, 20000, 'every deposit settles');
    const s = read();
    console.log(
      `RAILWAY INSTANT act ${JSON.stringify({
        strokes,
        pendingWhenFirstLogLeft,
        responseMs: s.prediction.responseMs.slice(-12).map((x) => Math.round(x * 100) / 100),
        corrected: s.prediction.corrected,
        predicted: s.prediction.predicted,
        stock: s.stations[s.activeStation]!.stock,
      })}`,
    );
  })(),
  'instant-feedback action',
);
export {};
