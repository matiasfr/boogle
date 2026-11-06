// Local visibility edges only: repeat strokes while the tool is out do not summon it again.
import * as THREE from 'three/webgpu';
import type { Particle } from '../../render/particle-pool.ts';

const ivory = new THREE.Color('#fff4bd');
const point = new THREE.Vector3();
export function sparkleAxe(
  axe: THREE.Object3D,
  wasVisible: boolean,
  reducedMotion: boolean,
  emit: (particle: Particle) => void,
  intensity: number,
) {
  if (reducedMotion || axe.visible === wasVisible) return;
  const appearing = axe.visible;
  const count = appearing ? 4 : 2;
  for (let i = 0; i < count; i++) {
    const marker = axe.getObjectByName(i % 2 === 0 ? 'axe-blade-contact' : 'axe-grip-left');
    if (!marker) continue;
    marker.getWorldPosition(point);
    const side = i < 2 ? 1 : -1;
    emit({
      x: point.x + side * 0.07,
      y: point.y + (i % 2 === 0 ? 0.04 : -0.04),
      z: point.z - side * 0.07,
      vx: side * 0.35,
      vy: 0.3,
      vz: -side * 0.25,
      life: appearing ? 0.16 - i * 0.015 : 0.11 - i * 0.015,
      size: appearing ? 0.11 : 0.085,
      color: ivory,
      intensity,
      shrink: 0.85,
      fade: 0.65,
      shape: 'glint',
      rotation: side * 0.15,
      spin: side * 2,
    });
  }
}
