// Original periodic pigment marks, baked once at load. No reference pixels or baked directional light.
import * as THREE from 'three/webgpu';
const SIZE = 512;
let cached: ReturnType<typeof bake> | undefined;
function bake() {
  const rock = new Uint8Array(SIZE * SIZE * 4),
    turf = new Uint8Array(rock.length),
    data = new Uint8Array(rock.length);
  const byte = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = (x / SIZE) * Math.PI * 2,
        v = (y / SIZE) * Math.PI * 2;
      const broad = Math.sin(u + 0.6 * Math.sin(v * 2)) * Math.cos(v - 0.4 * Math.sin(u * 3));
      const brush = Math.sin(u * 7 + Math.sin(v * 3) * 2) * Math.cos(v * 5 + Math.sin(u * 2));
      const grain = Math.sin(u * 29 + Math.sin(v * 17)) * Math.cos(v * 31 - Math.sin(u * 13));
      const blades = Math.sin(u * 37 + Math.sin(v * 11) * 2) * Math.cos(v * 13 + Math.sin(u * 3));
      const r = 0.79 + broad * 0.1 + brush * 0.07 + grain * 0.02;
      const g = 0.8 + broad * 0.08 + blades * 0.06 + brush * 0.035;
      const i = (y * SIZE + x) * 4;
      rock.set([byte(r), byte(r * 0.98), byte(r * 0.94), 255], i);
      turf.set([byte(g * 0.97), byte(g), byte(g * 0.92), 255], i);
      data.set(
        [
          byte(0.5 + brush * 0.3 + grain * 0.1),
          byte(0.5 + blades * 0.3),
          byte(0.5 + broad * 0.4),
          byte(0.5 + grain * 0.35),
        ],
        i,
      );
    }
  const make = (bytes: Uint8Array, name: string) => {
    const t = new THREE.DataTexture(bytes, SIZE, SIZE, THREE.RGBAFormat);
    t.name = name;
    // Authored linear pigment multipliers/data, not an sRGB photograph.
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  return {
    rock: make(rock, 'cove-rock-pigment'),
    turf: make(turf, 'cove-turf-pigment'),
    data: make(data, 'cove-microheight-breakup'),
  };
}
export const coveTextureBytes = (3 * 4 * (SIZE * SIZE * 4 - 1)) / 3;
export function coveTextures() {
  return (cached ??= bake());
}
