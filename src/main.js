import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FIXED } from './constants.js';
import { renderer, scene, camera } from './scene.js';
import { createTerrainMesh } from './terrain.js';
import { createWaterMesh } from './water-render.js';
import { world, installStepHooks } from './physics.js';
import { createProps, createClouds } from './props.js';
import { ball, resolveBallOwner, prepareBall } from './ball.js';
import { me, updateIntent } from './player.js';
import { net, remotes, connectRoom, updateRemotes } from './net.js';
import { renderPeople, initLobby } from './hud.js';
import './world/water-world.js';
import { initInput } from './input.js';
import { createStall } from './mushroom-garden.js';
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
function frame(now) {
  requestAnimationFrame(frame);
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
  renderer.render(scene, camera);
}

function start() {
  initInput();
  initLobby();
  connectRoom();
  renderPeople();
  runStart();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
}

// Debug handle for poking at the game from the console.
window.boogle = { THREE, CANNON, scene, world, camera, me, ball, net, remotes };

start();
