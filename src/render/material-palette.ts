// The owner's default palette (Fresh) applies to every visit as a constant ratio; Dev/tune=1 turns the ratio into a live
// uniform so the other candidates stay selectable.
import * as THREE from 'three/webgpu';
import { materialColor, uniform, vec3 } from 'three/tsl';
import { bind, tuningEnabled } from './water/live.ts';
import {
  DEFAULT_PALETTE,
  MATERIAL_FAMILIES,
  MATERIAL_PALETTES,
  type MaterialFamily,
} from './material-palette-tuning.ts';
import { patchNode } from './material-patch.ts';
import type { OwnedView } from './owned-view.ts';

const listeners = new Set<() => void>();
/** Linear RGB ratio from the family's authored anchor (candidate 0) to the chosen candidate. */
function ratio(family: MaterialFamily, choice: number, into: THREE.Color) {
  const swatches = MATERIAL_PALETTES[family];
  const anchor = new THREE.Color(swatches[0]);
  const selected = new THREE.Color(swatches[choice]!);
  return into.setRGB(selected.r / anchor.r, selected.g / anchor.g, selected.b / anchor.b);
}
const families = Object.fromEntries(
  MATERIAL_FAMILIES.map((family) => {
    const factor = ratio(family, DEFAULT_PALETTE, new THREE.Color());
    const node = tuningEnabled ? uniform(factor) : null;
    const state = { choice: DEFAULT_PALETTE, factor, node };
    bind(
      `material.${family}`,
      () => state.choice,
      (value) => {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3)
          throw new Error(`Invalid ${family} palette`);
        if (state.choice === value) return;
        state.choice = value;
        ratio(family, value, factor);
        for (const update of listeners) update();
      },
    );
    return [family, state];
  }),
) as Record<MaterialFamily, { choice: number; factor: THREE.Color; node: ReturnType<typeof uniform> | null }>;

// TSL graph types do not preserve the varying input node's operations.
// oxlint-disable-next-line typescript/no-explicit-any
export function paletteNode(base: any, family: MaterialFamily) {
  const { factor, node } = families[family];
  return base.mul(node ?? vec3(factor.r, factor.g, factor.b));
}
// One palette clone per source material and family, shared by every caller: a clone per mesh added 20 materials and 7
// programs to the current game for the same look (docs/research/performance.md). Disposed when its last owner goes.
const clones = new Map<THREE.NodeMaterial, Map<MaterialFamily, { copy: THREE.NodeMaterial; users: number }>>();
/** The source's palette clone (shared, read-only for callers); never attach a node to a cached shared material. */
export function paletteMaterial<T extends THREE.NodeMaterial>(source: T, family: MaterialFamily, owner?: OwnedView) {
  let byFamily = clones.get(source);
  if (!byFamily) clones.set(source, (byFamily = new Map()));
  let entry = byFamily.get(family);
  if (!entry) {
    const copy = patchNode(source.clone(), 'colorNode', (previous) => paletteNode(previous ?? materialColor, family));
    byFamily.set(family, (entry = { copy, users: 0 }));
  }
  const shared = entry;
  shared.users++;
  owner?.cleanup(() => {
    if (--shared.users > 0 || byFamily.get(family) !== shared) return;
    byFamily.delete(family);
    if (!byFamily.size) clones.delete(source);
    shared.copy.dispose();
  });
  return shared.copy as T;
}
/** Callers' owned instance buffers and plain materials use the CPU equivalent of the same linear ratio. */
export function paletteColour(color: THREE.Color, family: MaterialFamily) {
  return color.multiply(families[family].factor);
}
export function watchPalette(owner: THREE.InstancedMesh, update: () => void) {
  if (!tuningEnabled) return;
  listeners.add(update);
  owner.addEventListener('dispose', () => listeners.delete(update));
}
