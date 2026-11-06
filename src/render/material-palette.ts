// Local authoring only. Ordinary visits return the existing graph/material unchanged.
import * as THREE from 'three/webgpu';
import { materialColor, uniform } from 'three/tsl';
import { bind, tuningEnabled } from './water/live.ts';
import { MATERIAL_FAMILIES, MATERIAL_PALETTES, type MaterialFamily } from './material-palette-tuning.ts';
import { patchNode } from './material-patch.ts';
import type { OwnedView } from './owned-view.ts';

const listeners = new Set<() => void>();
const families = Object.fromEntries(
  MATERIAL_FAMILIES.map((family) => {
    const factor = new THREE.Color(1, 1, 1);
    const node = tuningEnabled ? uniform(factor) : null;
    const state = { choice: 0, factor, node };
    bind(
      `material.${family}`,
      () => state.choice,
      (value) => {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3)
          throw new Error(`Invalid ${family} palette`);
        if (state.choice === value) return;
        state.choice = value;
        const swatches = MATERIAL_PALETTES[family];
        const anchor = new THREE.Color(swatches[0]);
        const selected = new THREE.Color(swatches[value]!);
        factor.setRGB(selected.r / anchor.r, selected.g / anchor.g, selected.b / anchor.b);
        for (const update of listeners) update();
      },
    );
    return [family, state];
  }),
) as Record<MaterialFamily, { choice: number; factor: THREE.Color; node: ReturnType<typeof uniform> | null }>;

// TSL graph types do not preserve the varying input node's operations.
// oxlint-disable-next-line typescript/no-explicit-any
export function paletteNode(base: any, family: MaterialFamily) {
  return tuningEnabled ? base.mul(families[family].node) : base;
}
/** New preview clone; never attach a node to a cached shared material. */
export function paletteMaterial<T extends THREE.NodeMaterial>(source: T, family: MaterialFamily, owner?: OwnedView) {
  if (!tuningEnabled) return source;
  const copy = patchNode(source.clone(), 'colorNode', (previous) => paletteNode(previous ?? materialColor, family));
  owner?.cleanup(() => copy.dispose());
  return copy;
}
/** Only callers' owned instance buffers use the CPU equivalent of the same linear ratio. */
export function paletteColour(color: THREE.Color, family: MaterialFamily) {
  return color.multiply(families[family].factor);
}
export function watchPalette(owner: THREE.InstancedMesh, update: () => void) {
  if (!tuningEnabled) return;
  listeners.add(update);
  owner.addEventListener('dispose', () => listeners.delete(update));
}
