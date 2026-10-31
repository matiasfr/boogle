import './style.css';
import * as THREE from 'three/webgpu';
import * as CANNON from 'cannon-es';
import { FIXED } from './constants.js';
import { scene, camera, renderer, rendererReady, renderFrame } from './render/scene.js';
import { precompile } from './render/precompile.js';
import { createTerrainMesh } from './adapters/terrain.js';
import { createWaterMesh } from './render/water-render.js';
import { world, installStepHooks } from './physics/physics.js';
import { createProps, createClouds } from './render/props.js';
import { ball, resolveBallOwner, prepareBall } from './physics/ball.js';
import { me, updateIntent } from './player/player.js';
import { net, remotes, connectRoom, updateRemotes } from './netplay/net.js';
import { renderPeople, initLobby, lobbyReady } from './player/hud.js';
import { initInput } from './player/input.js';
import { createStall } from './adapters/mushroom-garden.js';
import { runFrame, runStart } from './loop.js';

// Every feature module in src/features/ registers its own hooks (see src/loop.js).
import.meta.glob('./features/*.js', { eager: true });

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
function frame(now = performance.now()) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  elapsed += dt;
  updateRemotes(now);
  resolveBallOwner(now);
  updateIntent(dt);
  prepareBall();
  world.step(FIXED, dt, 4);
  const ctx = { now, dt, elapsed };
  runFrame('world', ctx);
  runFrame('update', ctx);
  runFrame('late', ctx);
  renderFrame();
}

// The network and the lobby do not wait for the GPU. Only the first frame does (renderer.render throws until init), and
// Enter, so nobody gets in before it can draw. Shaders are compiled behind the lobby, not in the first frames.
function start() {
  initInput();
  initLobby();
  connectRoom();
  renderPeople();
  runStart();
}

async function play() {
  // Slow GPUs (and software rendering) can take many seconds: past 8 s the game opens anyway and the rest builds on.
  await Promise.race([precompile(), new Promise((r) => setTimeout(r, 8000))]);
  last = performance.now();
  renderer.setAnimationLoop(frame); // three resets its info, ticks the TSL clock, then runs ours: one loop, one order
  await new Promise((r) => requestAnimationFrame(r)); // one frame drawn: the output and shadow pipelines exist too
  lobbyReady();
}

// Debug handle for poking at the game from the console (before start(): features' onStart hooks add to it).
window.boogle = { THREE, CANNON, scene, world, camera, me, ball, net, remotes };

start();
rendererReady.then(play);
