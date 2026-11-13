// Compiled leg-2 placements share the massing batch; labels and rock are instantiated under the same owner.
import artifact from '../../../content/built/prefabs.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { validateArtifact, validateLevelArtifact } from '../../prefab/validate.ts';
import { LEG2_TEXT } from './leg2-layout.ts';
const records = (() => {
  const value: unknown = artifact;
  validateArtifact(value);
  return value;
})();
function compiled(value: unknown) {
  validateLevelArtifact(value, records.prefabs);
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
