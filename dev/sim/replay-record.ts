// Plays the golden session in the real game, on the GPU, through real keys and a real mouse, with ?record=1 on, and saves
// it to dev/sim/replays/<name>.json: walk to the ball, grab it, throw it, walk, sprint, jump, hop, over a crest, swim. Do this again after
// a change to the physics you mean to keep (then `npm run sim -- replay --write`), so "the browser session" stays true:
//   node dev/sim/replay-record.ts [name]
import fs from 'node:fs';
import path from 'node:path';
import { stringifyRecording, type Recording } from '../../src/debug/record-format.ts';
import { Game, launch, sleep, startStack } from '../look/lib.ts';

const name = process.argv[2] || 'golden';
const out = path.join(import.meta.dirname, 'replays', `${name}.json`);
const YAW = 2.2; // across open ground, clear of the trees and the stall (./player-course.ts)

const stack = await startStack();
const browser = await launch();
try {
  const game = await Game.open(browser, stack, { room: `replay${Date.now().toString(36)}`, query: 'record=1' });
  const { page } = game;
  await game.waitFor(() => window.boogle.ball.mine, { timeout: 15000 });
  await sleep(1500); // settled

  const turn = (yaw: number) =>
    game.eval(async (yaw) => {
      const path = '/src/player/state.ts' as string;
      const { cam } = (await import(path)) as typeof import('../../src/player/state.ts');
      cam.yaw = yaw;
    }, yaw);
  const state = () =>
    game.eval(() => {
      const { me, ball, boogler } = window.boogle;
      const p = me.body!.position;
      const d = boogler?.disp;
      return {
        x: p.x,
        z: p.z,
        bx: ball.pose.p.x,
        bz: ball.pose.p.z,
        boogler: d ? Math.hypot(d.x - p.x, d.z - p.z) : -1,
      };
    });
  const face = (x: number, z: number, from: { x: number; z: number }) => turn(Math.atan2(from.x - x, from.z - z));
  const hold = async (keys: string[], ms: number) => {
    for (const k of keys) await page.keyboard.down(k);
    await sleep(ms);
    for (const k of keys) await page.keyboard.up(k);
  };

  // Entering picks a random spot, and in one run something a headless world doesn't have knocked the player aside on the
  // way from there to the ball (most likely the Boogler, who wanders about here). So: from a spot with a clearer walk,
  // and the replay says if it wasn't clear. His talk prompt can also beat the ball's: then E doesn't grab. Run this again.
  await game.eval(async () => {
    const path = '/src/physics/engine.ts' as string;
    const { teleport } = (await import(path)) as typeof import('../../src/physics/engine.ts');
    const b = window.boogle.me.body!;
    teleport(b, 10.5, b.position.y + 0.3, 26);
    b.velocity.set(0, 0, 0);
  });
  await sleep(1000);
  await game.eval(() => window.boogle.record.start());
  await sleep(300);

  // To the ball, and pick it up.
  await page.keyboard.down('KeyW');
  for (let k = 0; k < 300; k++) {
    const s = await state();
    if (Math.hypot(s.x - s.bx, s.z - s.bz) < 1.8) break;
    await face(s.bx, s.bz, s);
    await sleep(30);
  }
  await page.keyboard.up('KeyW');
  await sleep(500);
  await page.keyboard.press('KeyE');
  await game.waitFor(() => window.boogle.ball.held, { timeout: 3000 });

  // A few steps with it, then a real throw: mouse down in the middle of the canvas, wind up, let go.
  await turn(YAW);
  await hold(['KeyW'], 700);
  await page.mouse.move(480, 300);
  await page.mouse.down();
  await sleep(550);
  await page.mouse.up();
  await sleep(1500);

  // Walk, sprint, stop, a held jump, a hop, a jump on the run.
  await hold(['KeyW'], 1000);
  await hold(['KeyW', 'ShiftLeft'], 1200);
  await sleep(500);
  await hold(['Space'], 500);
  await sleep(900);
  await page.keyboard.press('Space');
  await sleep(800);
  await page.keyboard.down('KeyW');
  await hold(['Space'], 300);
  await sleep(600);
  await page.keyboard.up('KeyW');
  await sleep(400);

  // Back up the slope at a sprint and over its top: the ground snap (MOVE.snapMaxGap) only acts on a crest.
  await turn(YAW - Math.PI);
  await hold(['KeyW', 'ShiftLeft'], 2200);
  await sleep(300);

  // To the nearest sea, sprinting, and swim about.
  const sea = await game.eval(async () => {
    const paths = ['/src/island/heights.ts', '/src/constants.ts'] as string[];
    const { groundHeight } = (await import(paths[0]!)) as typeof import('../../src/island/heights.ts');
    const { SEA } = (await import(paths[1]!)) as typeof import('../../src/constants.ts');
    const p = window.boogle.me.body!.position;
    for (let r = 6; r < 400; r += 3)
      for (let a = 0; a < 6.28; a += 0.2) {
        const x = p.x + Math.cos(a) * r,
          z = p.z + Math.sin(a) * r;
        if (groundHeight(x, z) < SEA - 2.5) return { x, z };
      }
    throw new Error('no sea');
  });
  await face(sea.x, sea.z, await state());
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await game.waitFor(() => window.boogle.me.swimming, { timeout: 25000 });
  await page.keyboard.up('ShiftLeft');
  await sleep(1500);
  await hold(['Space'], 200);
  await sleep(1000);
  await page.keyboard.up('KeyW');
  await sleep(600);

  const end = await state();
  const recording = (await game.eval(() => window.boogle.record.stop())) as Recording;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, stringifyRecording(recording));
  const seconds = recording.frames.reduce((sum, [dt]) => sum + dt, 0);
  console.log(`${path.relative(process.cwd(), out)}: ${recording.frames.length} frames, ${seconds.toFixed(1)} s`);
  console.log(`sea at ${sea.x.toFixed(1)}, ${sea.z.toFixed(1)}; the Boogler ended ${end.boogler.toFixed(1)} m away`);
  await game.close();
} finally {
  await browser.close();
  await stack.close();
}
