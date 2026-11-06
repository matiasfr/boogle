// Original periodic pigment marks, baked once at load. No reference pixels or baked directional light.
import * as THREE from 'three/webgpu';
const SIZE = 512;
let cached: ReturnType<typeof bake> | undefined;
/** Original, seamless tuft marks. Strokes share roots and fan apart; pigment and height use the same relief. */
function turfMarks() {
  const blades = new Float32Array(SIZE * SIZE),
    roots = new Float32Array(blades.length);
  let seed = 0x6b746672;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  const pixel = (x: number, y: number) => ((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE);
  for (let tuft = 0; tuft < 420; tuft++) {
    const x = random() * SIZE,
      y = random() * SIZE,
      angle = random() * Math.PI * 2,
      spread = 0.65 + random() * 0.8;
    // A small darker clump anchors each fan, without a baked lighting direction.
    for (let py = Math.floor(y - 5); py <= y + 5; py++)
      for (let px = Math.floor(x - 5); px <= x + 5; px++) {
        const r2 = ((px - x) ** 2 + (py - y) ** 2) / 25;
        if (r2 < 1) {
          const i = pixel(px, py);
          roots[i] = Math.max(roots[i] ?? 0, (1 - r2) ** 2);
        }
      }
    const count = 3 + Math.floor(random() * 3);
    for (let blade = 0; blade < count; blade++) {
      const direction = angle + ((blade / (count - 1)) * 2 - 1) * spread,
        length = 7 + random() * 10,
        dx = Math.cos(direction) * length,
        dy = Math.sin(direction) * length,
        width = 0.8 + random() * 0.65,
        relief = 0.55 + random() * 0.45;
      for (let py = Math.floor(Math.min(y, y + dy) - 2); py <= Math.max(y, y + dy) + 2; py++)
        for (let px = Math.floor(Math.min(x, x + dx) - 2); px <= Math.max(x, x + dx) + 2; px++) {
          const t = Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / (length * length)));
          const distance = Math.hypot(px - x - t * dx, py - y - t * dy);
          const coverage = Math.max(0, Math.min(1, width * (1 - t * 0.8) + 0.6 - distance));
          const i = pixel(px, py);
          blades[i] = Math.max(blades[i] ?? 0, coverage * relief);
        }
    }
  }
  return { blades, roots };
}
function bake() {
  const rock = new Uint8Array(SIZE * SIZE * 4),
    turf = new Uint8Array(rock.length),
    data = new Uint8Array(rock.length);
  const byte = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255);
  const marks = turfMarks();
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = (x / SIZE) * Math.PI * 2,
        v = (y / SIZE) * Math.PI * 2;
      const broad = Math.sin(u + 0.6 * Math.sin(v * 2)) * Math.cos(v - 0.4 * Math.sin(u * 3));
      const brush = Math.sin(u * 7 + Math.sin(v * 3) * 2) * Math.cos(v * 5 + Math.sin(u * 2));
      const grain = Math.sin(u * 29 + Math.sin(v * 17)) * Math.cos(v * 31 - Math.sin(u * 13));
      const r = 0.79 + broad * 0.1 + brush * 0.07 + grain * 0.02;
      const blade = marks.blades[y * SIZE + x] ?? 0,
        root = marks.roots[y * SIZE + x] ?? 0;
      const g = 0.82 + blade * 0.13 - root * 0.07;
      const i = (y * SIZE + x) * 4;
      rock.set([byte(r), byte(r * 0.98), byte(r * 0.94), 255], i);
      turf.set([byte(g * 0.97), byte(g), byte(g * 0.92), 255], i);
      data.set(
        [
          byte(0.5 + brush * 0.3 + grain * 0.1),
          byte(0.45 + blade * 0.3 - root * 0.06),
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
