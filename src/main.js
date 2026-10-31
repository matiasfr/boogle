import './style.css';
import * as THREE from 'three/webgpu';
import { scene, camera, renderer, rendererReady, renderFrame } from './render/scene.js';
import { precompile } from './render/precompile.js';
import { createTerrainMesh } from './adapters/terrain.js';
import { createWaterMesh } from './render/water-render.js';
import { installStepHooks } from './physics/physics.js';
import { stepPhysics, physicsReady } from './physics/engine.ts';
import { createProps, createClouds } from './render/props.js';
import { ball, resolveBallOwner, prepareBall } from './physics/ball.js';
import { me, updateIntent } from './player/player.js';
import { net, remotes, connectRoom, updateRemotes } from './netplay/net.ts';
import { renderPeople, initLobby, lobbyReady } from './player/hud.js';
import { initInput } from './player/input.js';
import { createStall } from './adapters/mushroom-garden.js';
import { runFrame, runStart, beginFrame, mark, endFrame } from './loop.js';
import { splashStage, splashProgress, splashDone } from './boot/splash.js';

// Every feature module in src/features/ registers its own hooks (see src/loop.js).
import.meta.glob('./features/*.{js,ts}', { eager: true });

createTerrainMesh();
createWaterMesh();
createProps();
createClouds();
createStall();
installStepHooks({ me, ball, remotes });

// Before the step: remote poses, ball ownership, this player's intent, the ball's kinematic pose. Everything after
// it (gameplay, visual sync, camera, HUD, presence) runs as onFrame hooks; src/loop.js lists their order.
let last = performance.now();
let elapsed = 0;
const ctx = { now: 0, dt: 0, elapsed: 0 }; // one object for every frame's hooks (no per-frame garbage)
function frame(now = performance.now()) {
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); // a first rAF stamp can predate `last` (play())
  last = now;
  elapsed += dt;
  beginFrame(); // per-section CPU times for ?prof=1 (src/loop.js)
  updateRemotes(now);
  resolveBallOwner(now);
  updateIntent(dt);
  prepareBall();
  mark('main: pre-step');
  stepPhysics(dt);
  mark('main: physics');
  ctx.now = now;
  ctx.dt = dt;
  ctx.elapsed = elapsed;
  runFrame('world', ctx);
  runFrame('update', ctx);
  runFrame('late', ctx);
  renderFrame();
  endFrame('main: render (CPU)');
}

// The network and the lobby do not wait for the GPU. Only the first frame does (renderer.render throws until init), and
// Enter, so nobody gets in before it can draw. Shaders are compiled behind the loading screen (src/boot/splash.js), not
// in the first frames.
function start() {
  initInput();
  initLobby();
  connectRoom();
  renderPeople();
  runStart();
}

async function play() {
  // Slow GPUs (and software rendering) can take many seconds: past 8 s the game opens anyway and the rest builds on.
  splashStage(0.45, 0.95, 'Warming up the shaders');
  await Promise.race([precompile(null, splashProgress), new Promise((r) => setTimeout(r, 8000))]);
  last = performance.now();
  renderer.setAnimationLoop(frame); // three resets its info, ticks the TSL clock, then runs ours: one loop, one order
  await new Promise((r) => requestAnimationFrame(r)); // one frame drawn: the output and shadow pipelines exist too
  lobbyReady();
  splashDone();
}

// Debug handle for poking at the game from the console (before start(): features' onStart hooks add to it).
window.boogle = { THREE, scene, camera, me, ball, net, remotes };

start();
splashStage(0.3, 0.45, 'Waking up the graphics');
Promise.all([rendererReady, physicsReady]).then(play, splashDone); // no graphics: the lobby says why
