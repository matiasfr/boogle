// Blob shadows (prototype flag `shadows`): soft dark discs under players and the ball at night, when the shadow pass
// is off, so you can still read where you and the ball will land. They shrink as the body rises above the ground.
// Serves DESIGN.md 10 (slapstick needs readable jumps and catches). Cosmetic, local.
import * as THREE from 'three';
import { onFrame } from '../loop.js';
import { scene } from '../render/scene.js';
import { skyNow } from '../render/sky.js';
import { BALL_R, PLAYER_R } from '../constants.js';
import { groundHeight } from '../adapters/terrain.js';
import { ball } from '../physics/ball.js';
import { me } from '../player/player.js';
import { remotes } from '../netplay/net.js';
import { proto } from '../adapters/proto-flags.js';

const OPACITY = 0.4;
const MAX = 16;
const blobs = new THREE.InstancedMesh(
  new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: OPACITY, depthWrite: false }),
  MAX,
);
blobs.frustumCulled = false;
blobs.renderOrder = 1;
blobs.visible = false;
scene.add(blobs);
const m4 = new THREE.Matrix4();

onFrame(
  () => {
    const night = proto.on('shadows') && !skyNow.keyLight; // no key light: no shadow pass
    blobs.visible = night;
    if (!night) return;
    let n = 0;
    const put = (p, r) => {
      if (n >= MAX) return;
      const g = groundHeight(p.x, p.z);
      const s = r * Math.max(0.3, 1 - (p.y - g) * 0.15);
      blobs.setMatrixAt(n++, m4.makeScale(s, 1, s).setPosition(p.x, g + 0.04, p.z));
    };
    if (me.avatar) put(me.avatar.position, PLAYER_R * 1.4);
    for (const r of remotes.values()) if (r.avatar) put(r.avatar.position, PLAYER_R * 1.4);
    put(ball.mesh.position, BALL_R * 1.3);
    blobs.count = n;
    blobs.instanceMatrix.needsUpdate = true;
  },
  { phase: 'late' },
);
