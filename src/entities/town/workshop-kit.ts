// The finished forge's merged furnishing. Every piece's parts and solids come from one compiled record.
import { merged } from '../../render/part-geometry.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../../prefab/validate.ts';
import artifact from '../../../content/built/prefabs.json' with { type: 'json' };
import level from '../../../content/built/levels/workshop-kit.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';

export function workshopKit(hw: number, hd: number, owner: OwnedView) {
  if (hw !== 5 || hd !== 4) throw new Error('workshop kit: room dimensions differ from authored records');
  const placements = loadLevelArtifact(level, loadPrefabArtifact(artifact).prefabs).placements;
  const pieces = placements.map((p) => instantiate(p.prefab, p, { owner }));
  return {
    geometry: merged(pieces.flatMap((p) => p.parts)),
    glass: pieces.flatMap((p) => p.glass),
    setEnabled(on: boolean) {
      for (const piece of pieces) piece.setEnabled(on);
    },
  };
}
