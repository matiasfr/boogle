// The one load-time path for surface tiles baked from seeded code (docs/research/texturing.md, "Recommended hybrid").
// Callers own the recipe and cache the result for the session: these tiles are shared and never disposed.
import * as THREE from 'three/webgpu';

/** GPU bytes an RGBA8 square tile holds with its full mip chain (about 4/3 of the base level). */
export const tileBytes = (size: number) => Math.round((size * size * 4 * 4) / 3);

/** A repeating, mipmapped RGBA8 tile of authored linear multipliers or data, not an sRGB photograph. */
export function bakedTile(name: string, size: number, rgba: Uint8Array) {
  if (rgba.length !== size * size * 4) throw new Error(`${name}: expected ${size}² RGBA8`);
  const t = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat);
  t.name = name;
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
