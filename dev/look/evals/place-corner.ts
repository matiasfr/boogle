// Station 3 audit fixtures, through the existing look harness. &cornerState=empty|partial|full|feed|lay|finished|walk.
// Static states are staged; walk uses ordinary inputs from a saved great-beam-shouldered checkpoint, without skips.
const q = new URLSearchParams(location.search);
const state = q.get('cornerState') ?? 'empty';
// oxlint-disable-next-line typescript/no-explicit-any
const p = window.__place as any;
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
p.day.hold = true;
p.day.u = 0.26;
const st = p.lines[0].stations[2];
const action = (fn: () => unknown) => {
  (window as unknown as { __placeAct: () => unknown }).__placeAct = fn;
};
if (state === 'walk') {
  action(async () => {
    const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
    const bot = makeBot();
    bot.check('saved great beam is on the shoulder', p.back.big === 'beam');
    await bot.walk(st.x, st.z, 3);
    await bot.until(() => p.lines[0].open, 60000, 'Station 3 opens the path');
    await bot.walk(938, -11, 2);
    bot.finish('Station 3 approach, delivery, laying and walk home');
  });
} else {
  // Finish earlier stations with the existing dev skip, then stage only this receiver's stock.
  while (p.lines[0].stage < 2) {
    const stage = p.lines[0].stage;
    p.skipDelivery();
    while (p.lines[0].stage === stage) await wait(80);
  }
  if (state === 'finished') p.skipPath();
  const stock = {
    logs: state === 'partial' ? 20 : ['full', 'feed', 'lay'].includes(state) ? 40 : 0,
    rails: 0,
    stone: 0,
    beam: state === 'full' ? 1 : 0,
  };
  Object.assign(st.have, stock);
  st.drawStock(stock);
  st.setTag(state !== 'finished');
  teleport(me.body!, st.x + 2, p.H(st.x + 2, st.z - 9) + 1.2, st.z - 9);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(-30 - (st.x - 1000)), -(-60 - st.z));
  if (state === 'feed' || state === 'lay') action(() => p.skipDelivery());
}
setTimeout(() => window.__debugCam!.clear(), 600);
console.log(`CORNER ${state}: frame=${st.x},${st.y},${st.z}; stock=${JSON.stringify(st.have)}`);
export {};
