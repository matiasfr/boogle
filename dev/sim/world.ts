// The game with no browser: the real ground, the server's land, Rapier, and every entity that has
// a src/entities/*/headless.ts. One world per process (the game's state is module-level), so two players are two
// processes. A frame is main.ts's without its update and late phases, which only draw:
//
//   await headless()              once, first
//   frame()                       one 60 Hz frame on the run's own clock, as fast as the CPU goes
//   frame(dt, now)                one frame at a time you give (a networked run paces itself on the wall clock)
//   virtualClock()                performance.now() reads the run's clock, for code that compares its times to `now`
//   await joinRoom(room)          into a real room on VITE_BOOGLE_SERVER, as src/main.ts's connectRoom does
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beginFrame, endFrame, frameCtx, mark, runFrame } from '../../src/loop.ts';
import { physicsReady, stepPhysics } from '../../src/physics/engine.ts';
import { connectRoom } from '../../src/netplay/net.ts';
import { land } from '../../src/world/game-world.ts';
import { updateWorld } from '../../src/world/sync.ts';
import home from '../../src/world/home-land.json' with { type: 'json' };

const root = path.join(import.meta.dirname, '../..');
const FRAME = 1 / 60;
let clock = 0;
let online = false;

export async function headless() {
  await physicsReady;
  // A method that throws would be caught and turned off, as in a browser. A headless run should fail instead.
  globalThis.reportError ??= (err) => {
    throw err;
  };
  Object.assign(land.layout, home.layout);
  for (const file of fs.globSync('src/entities/*/headless.ts', { cwd: root }).sort())
    await import(pathToFileURL(path.join(root, file)).href);
}

export function virtualClock() {
  performance.now = () => clock;
}

/** Joins a real room. The late phase then runs too: with no view loaded it's only the presence send (src/netplay/net.ts). */
export async function joinRoom(room: string) {
  online = true;
  // All a room wants of a page: the address it reads the room from, and pagehide, which never comes here.
  const noop = () => {};
  Object.assign(globalThis, {
    location: { search: `?room=${room}` }, // the module-level flags already chose the classic-registry world (no location)
    addEventListener: noop,
    removeEventListener: noop,
  });
  await connectRoom();
}

export function frame(dt = FRAME, now = (clock += dt * 1000)) {
  beginFrame();
  frameCtx.now = now;
  frameCtx.dt = dt;
  frameCtx.elapsed += dt;
  runFrame('prePhysics', frameCtx);
  stepPhysics(dt);
  mark('main: physics');
  runFrame('world', frameCtx);
  updateWorld(dt);
  if (online) runFrame('late', frameCtx);
  endFrame('sim: lockstep');
}
