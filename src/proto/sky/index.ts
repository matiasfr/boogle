// DESIGN.md 1, Toys before chores: a place worth lingering in.
// Implements procedural-sky.md recommendations 1–4. Local presentation only; the world clock is untouched.
import * as THREE from 'three/webgpu';
import { onFrame, onStart } from '../../loop.ts';
import { smoothstep } from '../../math.ts';
import { scene, sun } from '../../render/scene.ts';
import { skyColors, skyDayLook, skyDebug, skyNow, skyU } from '../../render/sky.ts';
import { createSkyClouds } from './clouds.ts';

// Accepted starting palette from place/look.ts LIGHT. Kept here so this experiment does not import another prototype.
const LIGHT = {
  sun: new THREE.Color('#ffe6bf'),
  sky: new THREE.Color('#b4cffa'),
  ground: new THREE.Color('#c4b48c'),
  top: new THREE.Color('#2a6fe0'),
  horizon: new THREE.Color('#a8d0f5'),
};

onStart(() => {
  const q = new URLSearchParams(location.search);
  const number = (key: string, fallback: number) =>
    q.has(key) && Number.isFinite(Number(q.get(key))) ? Number(q.get(key)) : fallback;
  skyDebug.preview(number('tod', 0.2), number('moon', 0.5));
  const hemi = scene.children.find((o): o is THREE.HemisphereLight => o instanceof THREE.HemisphereLight);
  createSkyClouds();
  onFrame(
    () => {
      const day = smoothstep(0.14, 0.42, skyNow.sunDir.y);
      skyDayLook.value = day;
      skyColors.top.lerp(LIGHT.top, day);
      skyColors.horizon.lerp(LIGHT.horizon, day);
      skyU.uCurve.value = 0.6 + (0.42 - 0.6) * day;
      sun.color.lerp(LIGHT.sun, day);
      sun.intensity += (3.1 - sun.intensity) * day;
      if (hemi) {
        hemi.color.lerp(LIGHT.sky, day);
        hemi.groundColor.lerp(LIGHT.ground, day);
        hemi.intensity += (2.3 - hemi.intensity) * day;
      }
      // Match distant land to the horizon without extending the island's fog range.
      (scene.fog as THREE.Fog).color.lerp(LIGHT.horizon, day);
    },
    { phase: 'update', order: -2 },
  );
});
