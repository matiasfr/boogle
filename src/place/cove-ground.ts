// Scope common cove layers without changing default Place material ownership.
import * as THREE from 'three/webgpu';
import { attribute, float, positionWorld, smoothstep, texture, textureBicubicLevel, vec2 } from 'three/tsl';
import { applyCoveLayers } from './cove-material.ts';
export function dressCoveGround(material: THREE.MeshStandardNodeMaterial, slopeAt: (x: number, z: number) => number) {
  // The coarse mesh's piecewise-linear slope scalar made square/diagonal pigment borders.
  // Reconstruct that same bounded field continuously, independently of the protected support mesh.
  // Two-metre samples plus a two-texel margin cover the complete material feather. R16F: 11,200 bytes.
  const width = 80,
    height = 70;
  const data = new Uint16Array(width * height);
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++)
      data[j * width + i] = THREE.DataUtils.toHalfFloat(slopeAt(731 + i * 2, -24 + j * 2));
  const slopes = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.HalfFloatType);
  slopes.name = 'cove-soil-slope';
  slopes.minFilter = slopes.magFilter = THREE.LinearFilter;
  slopes.generateMipmaps = false;
  slopes.needsUpdate = true;
  material.addEventListener('dispose', () => slopes.dispose());
  material.colorNode ??= attribute('color', 'vec3');
  const p = positionWorld;
  const region = smoothstep(735, 750, p.x)
    .mul(smoothstep(870, 885, p.x).oneMinus())
    .mul(smoothstep(-20, -5, p.z))
    .mul(smoothstep(95, 110, p.z).oneMinus());
  const uv = p.xz.sub(vec2(731, -24)).div(2).add(0.5).div(vec2(width, height));
  applyCoveLayers(material, region, false, textureBicubicLevel(texture(slopes, uv), float(0)).r);
}
