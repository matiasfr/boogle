// How the beach ball looks: its mesh and texture, and how the mesh follows the pose in ./state.ts. Reads state, never
// writes it.
import * as THREE from 'three';
import { BALL_R } from '../../constants.ts';
import { handPosition } from '../../player/state.ts';
import { ball } from './state.ts';

function beachBallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  ['#ff4f4f', '#ffffff', '#2f8cff', '#ffffff', '#ffcf33', '#ffffff'].forEach((col, k) => {
    g.fillStyle = col;
    g.fillRect((k * 512) / 6, 0, 512 / 6 + 1, 256);
  });
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 20);
  g.fillRect(0, 236, 512, 20);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_R, 32, 18),
  new THREE.MeshStandardMaterial({ map: beachBallTexture(), roughness: 0.4 }),
);
ballMesh.castShadow = true;
ballMesh.position.copy(ball.pose.p);

let snap = ball.snap;
// The owner shows its body (or the carry spot), others smooth in. A ball put somewhere new jumps there.
export function syncBallMesh(dt: number) {
  if (snap !== ball.snap) {
    snap = ball.snap;
    ballMesh.position.copy(ball.pose.p);
  }
  if (ball.mine) {
    if (ball.held) handPosition(ballMesh.position);
    else ballMesh.position.copy(ball.pose.p);
    ballMesh.quaternion.copy(ball.pose.q);
  } else {
    const k = 1 - Math.exp(-dt * 25);
    ballMesh.position.lerp(ball.pose.p, k);
    ballMesh.quaternion.slerp(ball.pose.q, k);
  }
}
