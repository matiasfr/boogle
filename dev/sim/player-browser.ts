// Records what dev/sim/player-course.ts does in the real game, on the GPU, into player-browser.json for
// `npm run sim -- player` to compare with. Run it again after changing the controller, the ground or the course:
//   node dev/sim/player-browser.ts
// The Boogler wanders the real game, and now and then he bumps the player mid-course (a headless run has no Boogler). So a
// recording only counts once two runs in a row agree.
import fs from 'node:fs';
import { Game, launch, sleep, startStack } from '../look/lib.ts';

const stack = await startStack();
const browser = await launch();
try {
  const game = await Game.open(browser, stack, { room: `sim${Date.now().toString(36)}` });
  await sleep(3000);
  const course = () =>
    game.page.evaluate(async () => {
      const path = '/dev/sim/player-course.ts' as string;
      const { runCourse } = (await import(path)) as typeof import('./player-course.ts');
      return runCourse(async (done) => {
        while (!done()) await new Promise(requestAnimationFrame);
      });
    });
  let result = await course();
  for (let tries = 0; ; tries++) {
    const again = await course();
    if (JSON.stringify(again) === JSON.stringify(result)) break;
    if (tries === 4) throw new Error('five runs in a row differed: more than the Boogler is moving the player');
    console.log('two runs differed, going again');
    result = again;
  }
  fs.writeFileSync(new URL('./player-browser.json', import.meta.url), `${JSON.stringify(result)}\n`);
  console.log(`walk ends ${result.walk.at(-1)}, sprint ends ${result.sprint.at(-1)}`);
  await game.close();
} finally {
  await browser.close();
  await stack.close();
}
