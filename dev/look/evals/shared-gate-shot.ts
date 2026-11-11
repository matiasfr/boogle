// Shared moments play for everyone (decisions.md, 10 November): player 1 pulls the quarry lever from the Quarry gate
// jump-in's landing and player 2, standing 30 m back, gets the gate shot from the server's accepted pull. Each
// page's still is taken just after the shot starts, in real time, with a short motion sheet so player 2's still lands mid-shot and logs its `moment played` mark. Short: a hang is not retried.
// npm run look -- --players 2 --rail-seed hook-earned --query shot=play --eval dev/look/evals/shared-gate-shot.ts \
//   --until window.__placeDone --real --frames 2 --seconds 0.3 --wall 240 --name shared-gate-shot
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { jumpOf } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');
const { watchPlayMarks } = (await import(
  '/src/proto/mark.ts' as string
)) as typeof import('../../../src/proto/mark.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Shot = { active: boolean; weight: number; kind: string | null };
type View = { lever: { x: number; z: number; pulled: boolean }; switchCamera: Shot };
const read = () => inspectRailway()!;
const view = () => read().line2View as unknown as View;
const player = new URLSearchParams(location.search).get('player');
const shot = window as Window & { __placeDone?: boolean };
const bot = makeBot({
  recover: () => {
    throw new Error('shared-gate-shot look asked for recovery');
  },
});
const check = (ok: unknown, beat: string) => {
  if (!ok) throw new Error(beat);
};
const until = async (fn: () => unknown, beat: string, ms = 120000) => check(await bot.until(fn, ms, beat), beat);
watchPlayMarks((name, data) => {
  if (name === 'moment played') console.log(`MOMENT ${player} ${JSON.stringify(data)}`);
});
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    if (!(await railReady(300000))) throw new Error('shared-gate-shot: the railway never became ready');
    await until(() => me.body && me.coyote > 0 && view()?.lever, 'seed arrived', 300000);
    const land = jumpOf('hook-earned')!.land!;
    // Player 2 stands 30 m back from the apron, facing away from the gate.
    const off = player === '1' ? 0 : 30;
    teleport(me.body!, land.x, land.y + 1, land.z + off);
    me.body!.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = player === '1' ? land.yaw! : land.yaw! + Math.PI;
    await bot.wait(800);
    await until(() => me.coyote > 0 && window.boogle.remotes.size > 0, 'landed and sees the partner', 60000);
    if (player === '1') {
      await bot.wait(1500);
      const { x, z } = view().lever;
      check(await bot.use(x, z, 'the quarry lever', /^Pull/), 'lever offered');
    }
    await until(() => view().lever.pulled, 'the lever is pulled', 30000);
    await until(() => view().switchCamera.kind === 'quarry' && view().switchCamera.weight > 0.05, 'gate shot plays');
    const c = view().switchCamera;
    console.log(`SHOT ${player} ${JSON.stringify(c)} cam ${cam.yaw.toFixed(2)}`);
    shot.__placeDone = true;
  })(),
  'shared-gate-shot look',
);
export {};
