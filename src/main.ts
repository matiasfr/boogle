import './style.css';
import * as THREE from 'three/webgpu';
import { scene, camera, renderer, rendererReady, renderFrame } from './render/scene.ts';
import { precompile, shadersMark } from './render/precompile.ts';
import { createTerrainMesh } from './island/terrain.ts';
import { createWaterMesh } from './render/water-render.ts';
import { installStepHooks } from './physics/physics.ts';
import { stepPhysics, physicsReady } from './physics/engine.ts';
import { createProps, createClouds } from './render/props.ts';
import { ball, resolveBallOwner, prepareBall } from './physics/ball.ts';
import { me, updateIntent } from './player/player.ts';
import { net, remotes, connectRoom, updateRemotes, onRoomReady } from './netplay/net.ts';
import { renderPeople, initLobby, lobbyReady } from './player/hud.ts';
import { initInput } from './player/input.ts';
import { createStall } from './adapters/mushroom-garden.ts';
import { runFrame, runStart, beginFrame, mark, endFrame } from './loop.ts';
import { splashStage, splashProgress, splashDone } from './boot/splash.ts';
import { bootMark } from './boot/timeline.ts';
import { prefetchAssets } from './render/asset-manifest.ts';

// Every feature module in src/features/ registers its own hooks (see src/loop.ts).
import.meta.glob('./features/*.{js,ts}', { eager: true });
bootMark('modules'); // every eager module is in and evaluated (src/boot/timeline.ts lists the phases)
physicsReady.then(() => bootMark('rapier'));
rendererReady.then(() => bootMark('gpu'));
onRoomReady(() => bootMark('room'));

createTerrainMesh();
bootMark('terrain');
createWaterMesh();
createProps();
createClouds();
createStall();
installStepHooks({ me, ball, remotes });
bootMark('props');

// Before the step: remote poses, ball ownership, this player's intent, the ball's kinematic pose. Everything after
// it (gameplay, visual sync, camera, HUD, presence) runs as onFrame hooks; src/loop.ts lists their order.
let last = performance.now();
let elapsed = 0;
const ctx = { now: 0, dt: 0, elapsed: 0 }; // one object for every frame's hooks (no per-frame garbage)
function frame(now = performance.now()) {
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); // a first rAF stamp can predate `last` (play())
  last = now;
  elapsed += dt;
  beginFrame(); // per-section CPU times for ?prof=1 (src/loop.ts)
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
// Enter, so nobody gets in before it can draw. Shaders are compiled behind the loading screen (src/boot/splash.ts), not
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
  shadersMark();
  last = performance.now();
  renderer.setAnimationLoop(frame); // three resets its info, ticks the TSL clock, then runs ours: one loop, one order
  await new Promise((r) => requestAnimationFrame(r)); // one frame drawn: the output and shadow pipelines exist too
  bootMark('first');
  lobbyReady();
  splashDone();
  bootMark('interactive');
  prefetchAssets(); // the content manifest's `soon` files, in idle time (src/render/asset-manifest.ts)
}

// Debug handle for poking at the game from the console (before start(): features' onStart hooks add to it).
window.boogle = { THREE, scene, camera, me, ball, net, remotes };

start();
splashStage(0.3, 0.45, 'Waking up the graphics');
Promise.all([rendererReady, physicsReady]).then(play, splashDone); // no graphics: the lobby says why
