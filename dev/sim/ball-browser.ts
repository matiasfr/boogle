// Records what dev/sim/ball-course.ts does in the real game, on the GPU, into ball-browser.json for `npm run sim -- ball`
// to compare with. Run it again after changing the ball's physics, the ground or the throw:
//   node dev/sim/ball-browser.ts
import fs from 'node:fs';
import { Game, launch, sleep, startStack } from '../look/lib.ts';

const stack = await startStack();
const browser = await launch();
try {
  const game = await Game.open(browser, stack, { room: `sim${Date.now().toString(36)}` });
  await sleep(3000);
  const result = await game.page.evaluate(async () => {
    const path = '/dev/sim/ball-course.ts' as string;
    const { runCourse } = (await import(path)) as typeof import('./ball-course.ts');
    return runCourse(async (done) => {
      while (!done()) await new Promise(requestAnimationFrame);
    });
  });
  fs.writeFileSync(new URL('./ball-browser.json', import.meta.url), `${JSON.stringify(result)}\n`);
  console.log(`rest ${result.rest}, respawn rest ${result.respawnRest}, sea y ${result.seaY}`);
  await game.close();
} finally {
  await browser.close();
  await stack.close();
}
