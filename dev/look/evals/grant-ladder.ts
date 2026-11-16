// npm run look -- --rail-seed q5-done --eval dev/look/evals/grant-ladder.ts --until window.__grantLadderDone --cam 1331,1.3,-99 --look 1326.8,7,-112 --warm 45 --frames 2 --seconds 0.2 --name grant-c6
// C6: start a swimmer below the ladder; real forward input only, no recovery or ability use.
const { makeBot, hideBotNotes } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { background } = await import('/src/async.ts' as string);
const bot = makeBot({
  allowSwimming: true,
  recover: () => {
    throw new Error('No ladder recovery teleport');
  },
});
const proof = window as Window & { __grantLadderDone?: boolean };
background(
  (async () => {
    if (!(await bot.until(() => me.body, 30000, 'body'))) throw new Error('Ladder: no player');
    teleport(me.body, 1326.8, 0, -100);
    me.body.velocity.set(0, 0, 0);
    await bot.wait(500);
    console.log(`GRANT ladder start ${JSON.stringify(me.body.position)}`);
    const reached = await bot.straight(1326.8, -121, 0.35, 30000);
    console.log(`GRANT ladder finish ${JSON.stringify(me.body.position)} reached=${reached}`);
    if (!reached || me.body.position.y < 15.3) throw new Error('Ladder: swimmer did not reach the dry stack');
    hideBotNotes();
    proof.__grantLadderDone = true;
  })(),
  'Grant helmet escape',
);
export {};
