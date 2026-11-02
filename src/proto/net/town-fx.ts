// What ?proto=net's and ?proto=place's towns share: how a change ripples through a town, and its dust and fireworks.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';

export const RIPPLE_MPS = 13; // how fast the change spreads from the centre
export const LANDMARK_AFTER = 1.1; // s after the ripple starts that the landmark begins to rise
export const easeBack = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; // overshoots a little, lands at 1
export const smooth = (u: number) => u * u * (3 - 2 * u);
const dust = new THREE.Color('#d8c8a6');
export const soot = new THREE.Color('#8d8780');
export const SHELLS = ['#ff4f4f', '#ffcf33', '#4fdc7a', '#2f8cff', '#ff7ad9', '#ffffff'].map((c) => new THREE.Color(c));

export function puff(x: number, y: number, z: number, r: number) {
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    emit({
      x: x + Math.cos(a) * r,
      y: y + 0.3,
      z: z + Math.sin(a) * r,
      vx: Math.cos(a) * 3,
      vy: 1.4,
      vz: Math.sin(a) * 3,
      life: 1.3,
      size: 1.2,
      color: dust,
      alpha: 0.85,
      grow: [1, 3],
      gravity: -0.4,
      drag: 1.6,
      fade: 0.5,
    });
  }
}

// One big shell over the landmark: bright and large, so a burst reads from 150 m away.
export function shell(x: number, y: number, z: number, color: THREE.Color) {
  for (let k = 0; k < 34; k++) {
    const a = Math.random() * Math.PI * 2,
      u = Math.random() * 2 - 1,
      s = 11 + Math.random() * 4,
      c = Math.sqrt(1 - u * u);
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * c * s,
      vy: u * s,
      vz: Math.sin(a) * c * s,
      life: 1.4 + Math.random() * 0.5,
      size: 2.1,
      color,
      gravity: 5,
      drag: 1.5,
      shrink: 0.3,
    });
  }
}
