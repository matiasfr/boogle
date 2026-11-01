// World-space labels (sprites: signs, plaques) that make way when the camera comes close: within NEAR_FADE.far metres
// they shrink and fade, down to `minScale` and `minAlpha` at NEAR_FADE.near, so a sign you stand beside or ride past
// stops filling the view, while at mid range and beyond it reads at full size. Local, cosmetic.
import type * as THREE from 'three/webgpu';

export const NEAR_FADE = { near: 4, far: 14, minAlpha: 0.3, minScale: 0.55 };

/** 0 at `near` metres or closer, 1 at `far` or beyond, smooth between. */
export function nearness(sprite: THREE.Object3D, camera: THREE.Camera): number {
  const d = sprite.position.distanceTo(camera.position);
  const t = Math.min(1, Math.max(0, (d - NEAR_FADE.near) / (NEAR_FADE.far - NEAR_FADE.near)));
  return t * t * (3 - 2 * t);
}

/** Fades and scales `sprite` (base size w × h, times `swell`) for the camera's distance this frame. */
export function fadeNear(sprite: THREE.Sprite, camera: THREE.Camera, w: number, h: number, swell = 1): void {
  const t = nearness(sprite, camera);
  const s = (NEAR_FADE.minScale + (1 - NEAR_FADE.minScale) * t) * swell;
  sprite.scale.set(w * s, h * s, 1);
  sprite.material.opacity = NEAR_FADE.minAlpha + (1 - NEAR_FADE.minAlpha) * t;
}
