import './dev-preferences.ts';
import './style.css';
import * as THREE from 'three/webgpu';
import { scene, camera, renderer, rendererReady, renderFrame } from './render/scene.ts';
import { shouldRender } from './render/quality.ts';
import { precompile, gpuDone, shadersMark } from './render/precompile.ts';
import { createTerrainMesh } from './island/terrain.ts';
import { createWaterMesh, waterReady } from './render/water-render.ts';
import { stepPhysics, physicsReady } from './physics/engine.ts';
import { createProps, createClouds } from './render/props.ts';
import { ball } from './entities/ball/state.ts';
import { inspect } from './entity/inspect.ts';
import { me } from './player/player.ts';
import { net, remotes, connectRoom, onRoomReady } from './netplay/net.ts';
import { renderPeople, initLobby, lobbyReady } from './player/hud.ts';
import { initInput } from './player/input.ts';
import { createStall } from './adapters/mushrooms.ts';
import { runFrame, runStart, beginFrame, mark, endFrame, frameCtx as ctx } from './loop.ts';
import { splashStage, splashProgress, splashDone } from './boot/splash.ts';
import { bootMark } from './boot/timeline.ts';
import { prefetchAssets } from './render/asset-manifest.ts';
import { background } from './async.ts';

// Every feature module in src/features/ registers its own hooks (see src/loop.ts).
import.meta.glob('./features/*.{js,ts}', { eager: true });
// And every entity's index.ts (src/entities/ball/index.ts is the example).
import.meta.glob('./entities/*/index.ts', { eager: true });
bootMark('modules'); // every eager module is in and evaluated (src/boot/timeline.ts lists the phases)
// Startup below owns readiness failures; observers must not create another unhandled rejection.
physicsReady.then(
  () => bootMark('rapier'),
  () => {},
);
rendererReady.then(
  () => bootMark('gpu'),
  () => {},
);
onRoomReady(() => bootMark('room'));

createTerrainMesh();
bootMark('terrain');
createWaterMesh();
createProps();
createClouds();
createStall();
bootMark('props');

// Everything in a frame (intent, gameplay, visual sync, camera, HUD, presence) runs as onFrame hooks around the physics
// step; src/loop.ts lists their order.
let last = performance.now();
let elapsed = 0;
function frame(now = performance.now()) {
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); // a first rAF stamp can predate `last` (play())
  last = now;
  elapsed += dt;
  beginFrame(); // per-section CPU times for ?prof=1 (src/loop.ts)
  ctx.now = now;
  ctx.dt = dt;
  ctx.elapsed = elapsed;
  runFrame('prePhysics', ctx);
  stepPhysics(dt);
  mark('main: physics');
  runFrame('world', ctx);
  runFrame('update', ctx);
  runFrame('late', ctx);
  const draw = shouldRender(now);
  if (draw) renderFrame();
  endFrame('main: render (CPU)', draw);
}

// The network and the lobby do not wait for the GPU. Only the first frame does (renderer.render throws until init), and
// Enter, so nobody gets in before it can draw. Shaders are compiled behind the loading screen (src/boot/splash.ts), not
// in the first frames.
function start() {
  initInput();
  initLobby();
  background(connectRoom(), 'room connect');
  renderPeople();
  runStart();
}

async function play() {
  await waterReady; // the opt-in frozen sky completes its single bake behind loading, before the shader deadline
  // A cold Metal cache takes about 14 s on an M1 Max (docs/research/water-metal-cold.md). Slow GPUs (and software
  // rendering) can take longer: past 16 s the game opens anyway and the rest builds on.
  const giveUp = new Promise((r) => setTimeout(r, 16000));
  splashStage(0.45, 0.95, 'Warming up the shaders');
  await Promise.race([precompile(null, splashProgress), giveUp]);
  shadersMark();
  lobbyReady(); // a returning player joins here, so their avatar's first draw is behind the loading screen too
  last = performance.now();
  // three resets its info, ticks the TSL clock, then runs ours: one loop, one order
  background(renderer.setAnimationLoop(frame), 'game loop');
  await new Promise((r) => requestAnimationFrame(r)); // one frame drawn: the output and shadow pipelines exist too
  await Promise.race([gpuDone(), giveUp]); // submitted is not finished: the screen lifts once the GPU has caught up
  bootMark('first');
  splashDone();
  bootMark('interactive');
  prefetchAssets(); // the content manifest's `soon` files, in idle time (src/render/asset-manifest.ts)
}

// Debug handle for poking at the game from the console (before start(): features' onStart hooks add to it).
window.boogle = { THREE, scene, camera, me, ball, net, remotes, inspect } as Window['boogle'];

start();
splashStage(0.3, 0.45, 'Waking up the graphics');
Promise.all([rendererReady, physicsReady]).then(play, splashDone); // no graphics: the lobby says why
