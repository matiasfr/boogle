import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FIXED, HALF, SPAWN, HEAD_OFFSET, PLAYER_R, BALL_R, SEND_MS } from './constants.js';
import { clamp, lerp } from './math.js';
import { renderer, scene, camera } from './scene.js';
import { groundHeight, createTerrainMesh } from './terrain.js';
import { createWaterMesh, waterMat } from './water-render.js';
import { world, installStepHooks, teleport } from './physics.js';
import { createProps, createClouds, updateClouds } from './props.js';
import { animateAvatar } from './avatars.js';
import { ball, claimBall, respawnBall, resolveBallOwner, prepareBall } from './ball.js';
import { me, updateIntent, updateCamera, updatePreview, handPosition } from './player.js';
import { net, remotes, connectRoom, updateRemotes, sendPresence } from './net.js';
import { renderPeople, updateHud, initLobby } from './hud.js';
import { updateSplash } from './splash.js';
import { updateWorld } from './world/sync.js';
import { initInput } from './input.js';

createTerrainMesh();
createWaterMesh();
createProps();
createClouds();
installStepHooks({ me, ball, remotes });

function afterStep(now) {
  if (ball.mine) {
    const bp = ball.body.position;
    if (!ball.held && (Math.abs(bp.x) > HALF - 3 || Math.abs(bp.z) > HALF - 3 || bp.y < -15)) respawnBall();
    const ip = ball.held ? bp : ball.body.interpolatedPosition;
    ball.disp.p.set(ip.x, ip.y, ip.z);
    const q = ball.body.quaternion;
    ball.disp.q.set(q.x, q.y, q.z, q.w);
    const v = ball.body.velocity;
    ball.disp.v.set(v.x, v.y, v.z);
  }

  if (me.body) {
    const p = me.body.position;
    if (p.y < -25) {
      teleport(me.body, SPAWN.x, groundHeight(SPAWN.x, SPAWN.z) + 1.2, SPAWN.z);
      me.body.velocity.setZero();
    }
    // Walking into a slow ball takes ownership so the push resolves in this tab's simulation.
    if (!ball.mine && ball.owner && !ball.held && now - me.lostBallAt > 400 && ball.disp.v.length() < 5) {
      const bpos = ball.disp.p;
      const dy = clamp(bpos.y - p.y, 0, HEAD_OFFSET);
      const d = Math.hypot(bpos.x - p.x, bpos.y - (p.y + dy), bpos.z - p.z);
      if (d < PLAYER_R + BALL_R + 0.08) claimBall(false);
    }
  }
}

const tmpV = new THREE.Vector3();
function syncVisuals(dt) {
  if (ball.mine) {
    if (ball.held) handPosition(ball.mesh.position);
    else ball.mesh.position.copy(ball.disp.p);
    ball.mesh.quaternion.copy(ball.disp.q);
  } else {
    const k = 1 - Math.exp(-dt * 25);
    ball.mesh.position.lerp(ball.disp.p, k);
    ball.mesh.quaternion.slerp(ball.disp.q, k);
  }

  if (me.avatar && me.body) {
    const ip = me.body.interpolatedPosition;
    me.avatar.position.set(ip.x, ip.y, ip.z);
    me.avatar.rotation.y = me.yaw;
    animateAvatar(me.avatar, Math.hypot(me.body.velocity.x, me.body.velocity.z), me.coyote <= 0 && !me.swimming, dt);
  }
  for (const r of remotes.values()) {
    if (!r.avatar) continue;
    r.avatar.position.copy(r.target);
    r.avatar.rotation.y = r.yaw;
    const speed = dt > 0 ? tmpV.copy(r.target).sub(r.prevPos).setY(0).length() / dt : 0;
    r.speed = lerp(r.speed, speed, 1 - Math.exp(-dt * 10));
    r.prevPos.copy(r.target);
    animateAvatar(r.avatar, r.speed, r.state === 1, dt);
  }
}

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
  afterStep(now);
  syncVisuals(dt);
  updateCamera(elapsed);
  updateClouds(dt);
  updateWorld(dt);
  updateSplash(dt, elapsed, ball, me, remotes);
  updatePreview();
  updateHud();
  if (net.room && (me.entered || ball.mine) && now - net.lastSend >= SEND_MS) sendPresence();
  waterMat.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
}

function start() {
  initInput();
  initLobby();
  connectRoom();
  renderPeople();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
}

// Debug handle for poking at the game from the console.
window.boogle = { THREE, CANNON, scene, world, camera, me, ball, net, remotes };

start();
