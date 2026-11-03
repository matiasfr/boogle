// DESIGN.md 1, Toys before chores: a place worth lingering in.
// Implements procedural-sky.md recommendations 1–4. Local presentation only; the world clock is untouched.
import type * as THREE from 'three';
import { onFrame, onStart } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { atmosphere, skyColors } from '../../render/sky.ts';
import { seaU } from '../../render/water-render.ts';
import { createSkyClouds } from './clouds.ts';

onStart(() => {
  createSkyClouds();
  onFrame(
    () => {
      seaU.uHaze.value.copy(skyColors.horizon);
      // updateSky resets the range each frame. Distant land shares the sea's haze; caves keep their own fog.
      if (atmosphere.underground === 0) (scene.fog as THREE.Fog).far = 360;
    },
    { phase: 'update', order: -2 },
  );
});
