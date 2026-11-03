// DESIGN.md 1, Toys before chores: a place worth lingering in.
// Implements procedural-sky.md recommendations 1–4. Local presentation only; the world clock is untouched.
import { onFrame, onStart } from '../../loop.ts';
import { skyColors } from '../../render/sky.ts';
import { seaU } from '../../render/water-render.ts';
import { createSkyClouds } from './clouds.ts';

onStart(() => {
  createSkyClouds();
  onFrame(
    () => {
      seaU.uHaze.value.copy(skyColors.horizon);
    },
    { phase: 'update', order: -2 },
  );
});
