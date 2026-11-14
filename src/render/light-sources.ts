// The registry of things that glow, apart from the scene: render/lights.ts lends its pool lights to the nearest ones.
// Pure (no scene or loop), so an owner's add and remove can be tested without a renderer.
import * as THREE from 'three';

/** Something that glows: the pool lights the nearest few. on() scales it, 0..1. */
export type LightSource = {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  distance: number;
  on?: () => number;
};
const sources: LightSource[] = [];
/** Every registered source, in registration order: read-only for the pool's per-frame scan. */
export const lightSources: readonly LightSource[] = sources;

// source: { position: Vector3, color, intensity, distance, on?: () => 0..1 }. Returns it (change fields freely).
export function addLightSource(spec: Omit<LightSource, 'color'> & { color?: THREE.ColorRepresentation }) {
  const src = spec as LightSource; // the caller's own object: it may change its fields later
  src.color = new THREE.Color(spec.color ?? '#ffcf8a');
  sources.push(src);
  return src;
}
/** Take a source out again: a view that is disposed removes what it added (page-lifetime sources never do). */
export function removeLightSource(src: LightSource) {
  const i = sources.indexOf(src);
  if (i >= 0) sources.splice(i, 1);
}
