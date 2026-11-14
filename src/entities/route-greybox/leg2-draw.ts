// Compiled leg-2 placements share the massing batch; labels and rock are instantiated under the same owner.
import { compiled as records } from '../../prefab/catalogue.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { LEG2_TEXT } from './leg2-layout.ts';
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
export function leg2Massing(value: unknown) {
  return compiled(value).placements.filter((p) => batched(p.prefab));
}
export function leg2Extras(owner: OwnedView, value: unknown) {
  for (const p of compiled(value).placements.filter((p) => !batched(p.prefab)))
    instantiate(p.prefab, p, { owner, texts: LEG2_TEXT }).setEnabled(true);
}
