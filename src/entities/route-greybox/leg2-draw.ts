// Compiled leg-2 placements share the massing batch; labels and rock are instantiated under the same owner.
import { compiled as records } from '../../prefab/catalogue.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { LEG2_TEXT } from './leg2-layout.ts';
import { areaBoardVisibility, areaLabels } from './state.ts';
function compiled(input: unknown) {
  const value = loadLevelArtifact(input, records.prefabs);
  for (const p of value.placements)
    for (const key of Object.values(p.labels ?? {}))
      if (!Object.hasOwn(LEG2_TEXT, key)) throw new Error(`prefabs: missing label text ${key}`);
  return value;
}
const batched = (key: string) => {
  const visual = records.prefabs[key]!.visual;
  return ('builder' in visual && visual.batch === 'route-greybox:massing') || key === 'greybox.collider';
};
/** All a leg 2 level's placements (the massing's and the extras'). */
export const leg2Placements = (value: unknown) => compiled(value).placements;
export function leg2Massing(value: unknown) {
  return compiled(value).placements.filter((p) => batched(p.prefab));
}
/** Stands a level's other placements (labels, the lands' prisms) under `owner`; returns how many solids they made. */
export function leg2Extras(owner: OwnedView, value: unknown) {
  let solids = 0;
  for (const p of compiled(value).placements.filter((p) => !batched(p.prefab))) {
    const made = instantiate(p.prefab, p, { owner, texts: LEG2_TEXT, still: true });
    made.setEnabled(true);
    solids += made.bodies.length;
    // Each label can be repainted while this area stands (route-greybox/leg-view.ts: a stall pad that connects).
    for (const [name, key] of Object.entries(p.labels ?? {})) {
      const relabel = (lines: readonly string[]) => made.relabel(name, lines);
      areaLabels.set(key, relabel);
      const visible = (on: boolean) => {
        made.root.visible = on;
      };
      areaBoardVisibility.set(key, visible);
      owner.cleanup(() => {
        if (areaBoardVisibility.get(key) === visible) areaBoardVisibility.delete(key);
        if (areaLabels.get(key) === relabel) areaLabels.delete(key);
      });
    }
  }
  return solids;
}
/** A leg 2 level's pads (`greybox.pad` placements): id, centre and yaw. */
export function leg2Pads(value: unknown) {
  return compiled(value)
    .placements.filter((p) => p.prefab === 'greybox.pad')
    .map((p) => ({ id: p.id, x: p.pos[0], y: p.pos[1], z: p.pos[2], yaw: p.rot?.[0] ?? 0 }));
}
