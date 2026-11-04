// Shared authoring vocabulary, not a new look. See docs/research/material-pipeline.md, recommendations 2 and 4.
// Like flat() and paint(), equivalent recipes share an immutable-by-contract material. Clone before tinting,
// previewing or extending with patchNode(); never mutate or dispose a cached material (or its texture).
import * as THREE from 'three/webgpu';

export type ColourToken = `#${string}`; // sRGB; THREE.Color decodes this once.
export type Emission = Readonly<{ linear: readonly [number, number, number]; gain: number }>;
export type Alpha =
  | Readonly<{ mode: 'opaque' }>
  | Readonly<{ mode: 'mask'; cutoff: number }>
  | Readonly<{ mode: 'blend'; opacity: number }>;
type Common = Readonly<{
  colour: ColourToken;
  emissive?: Emission;
  alpha: Alpha;
  sidedness: 'front' | 'back' | 'double';
}>;
export type Surface = Common &
  Readonly<{
    roughness: number;
    metalness: number;
    vertexColours: boolean;
    normals: 'authored' | 'flat';
  }>;
// Unlit sprites have no roughness, metalness or mesh normals. Their linear emission multiplies the colour/map.
export type Feedback = Common & Readonly<{ map?: THREE.Texture }>;

const opaque = { mode: 'opaque' } as const;
const flat: Surface = {
  colour: '#ffffff',
  roughness: 0.95,
  metalness: 0,
  alpha: opaque,
  sidedness: 'front',
  vertexColours: false,
  normals: 'flat',
};
// Existing flat()/paint() values only. These names are available for deliberate opt-in, not a broad migration.
export const presets: Readonly<Record<'timber' | 'paintedToy' | 'foliage' | 'stone' | 'steel', Surface>> &
  Readonly<{ feedback: Feedback }> = {
  timber: { ...flat, colour: '#7a5430', roughness: 0.85 },
  paintedToy: { ...flat, colour: '#c83a2a' },
  foliage: { ...flat, colour: '#3f8a3a' },
  stone: { ...flat, colour: '#a8a498' },
  steel: { ...flat, colour: '#5c5f66', roughness: 0.45, metalness: 0.7, normals: 'authored' },
  feedback: { colour: '#ffffff', alpha: { mode: 'blend', opacity: 1 }, sidedness: 'front' },
};
export type Preset = keyof typeof presets;
type SurfacePreset = Exclude<Preset, 'feedback'>;
const surfaces = new Map<string, THREE.MeshStandardNodeMaterial>();
const sprites = new Map<string, THREE.SpriteMaterial>();
const sides = { front: THREE.FrontSide, back: THREE.BackSide, double: THREE.DoubleSide } as const;

function range(value: number, max: number) {
  if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`Material scalar out of range: ${value}`);
  return value;
}

/** Cached materials belong to this module. Per-player colour: material('paintedToy').clone().color.set(...). */
export function material(preset: 'feedback', overrides?: Partial<Feedback>): THREE.SpriteMaterial;
export function material(preset: SurfacePreset, overrides?: Partial<Surface>): THREE.MeshStandardNodeMaterial;
export function material(preset: Preset, overrides: Partial<Surface & Feedback> = {}) {
  const spec = { ...presets[preset], ...overrides };
  const colour = new THREE.Color(spec.colour);
  const emission = spec.emissive;
  const radiance = emission
    ? new THREE.Color(...(emission.linear.map((v) => range(v, Infinity)) as [number, number, number]))
    : new THREE.Color(0, 0, 0);
  const gain = emission ? range(emission.gain, Infinity) : 1;
  const alpha = spec.alpha;
  const common = {
    color: colour,
    transparent: alpha.mode === 'blend',
    opacity: alpha.mode === 'blend' ? range(alpha.opacity, 1) : 1,
    alphaTest: alpha.mode === 'mask' ? range(alpha.cutoff, 1) : 0,
    depthWrite: alpha.mode !== 'blend',
    side: sides[spec.sidedness],
  };
  // Fixed field order and decoded colours: override insertion order and equivalent hex spellings do not split caches.
  const key = [colour.toArray(), common.transparent, common.opacity, common.alphaTest, common.depthWrite, common.side];
  if (preset === 'feedback') {
    if (emission) colour.multiply(radiance).multiplyScalar(gain);
    const map = spec.map ?? null;
    const id = JSON.stringify([...key, colour.toArray(), map?.uuid ?? null]);
    let mat = sprites.get(id);
    if (!mat) sprites.set(id, (mat = new THREE.SpriteMaterial({ ...common, map })));
    return mat;
  }
  const surface = spec as Surface;
  const roughness = range(surface.roughness, 1);
  const metalness = range(surface.metalness, 1);
  const id = JSON.stringify([
    ...key,
    roughness,
    metalness,
    radiance.toArray(),
    gain,
    surface.vertexColours,
    surface.normals,
  ]);
  let mat = surfaces.get(id);
  if (!mat) {
    mat = new THREE.MeshStandardNodeMaterial({
      ...common,
      roughness,
      metalness,
      emissive: radiance,
      emissiveIntensity: gain,
      vertexColors: surface.vertexColours,
      flatShading: surface.normals === 'flat',
    });
    surfaces.set(id, mat);
  }
  return mat;
}
