// Blob shadows: soft dark discs under players and the ball at night, when the shadow pass
// is off, so you can still read where you and the ball will land. They shrink as the body rises above the ground.
// Serves DESIGN.md 10 (slapstick needs readable jumps and catches). Cosmetic, local.
import * as THREE from 'three';
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.js';
import { createPool } from '../render/instances.ts';
import { skyNow } from '../render/sky.js';
import { BALL_R, PLAYER_R } from '../constants.ts';
import { groundHeight } from '../adapters/terrain.js';
import { ball } from '../physics/ball.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';

const OPACITY = 0.4;
const MAX = 16;
const pool = createPool(
  new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: OPACITY, depthWrite: false }),
  MAX,
);
const blobs = pool.mesh;
blobs.renderOrder = 1;
blobs.visible = false;
scene.add(blobs);

onFrame(
  () => {
    const night = !skyNow.keyLight; // no key light: no shadow pass
    blobs.visible = night;
    if (!night) return;
    pool.begin();
    const put = (p, r) => {
      const g = groundHeight(p.x, p.z);
      const s = r * Math.max(0.3, 1 - (p.y - g) * 0.15);
      pool.push(p.x, g + 0.04, p.z, 0, 0, 0, 1, s, 1, s);
    };
    if (me.avatar) put(me.avatar.position, PLAYER_R * 1.4);
    for (const r of remotes.values()) if (r.avatar) put(r.avatar.position, PLAYER_R * 1.4);
    put(ball.mesh.position, BALL_R * 1.3);
    pool.end();
  },
  { phase: 'late' },
);
