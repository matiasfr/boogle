// The finished forge's merged furnishing. Every piece's parts and solids come from one compiled record.
import { merged } from '../../render/part-geometry.ts';
import { instantiate, workshopChair } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import level from '../../../content/built/levels/workshop-kit.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';

export function workshopKit(hw: number, hd: number, owner: OwnedView) {
  if (hw !== 5 || hd !== 4) throw new Error('workshop kit: room dimensions differ from authored records');
  const placements = loadLevelArtifact(level, definitions).placements;
  const pieces = placements.map((p) => instantiate(p.prefab, p, { owner }));
  return {
    hulls: [...placements, workshopChair].flatMap((p) =>
      definitions[p.prefab]!.colliders.map((c) => {
        if (c.shape !== 'box' || c.rot || p.rot || p.scale)
          throw new Error('workshop clearance expects axis-aligned boxes');
        return {
          dx: p.pos[0] + c.at[0],
          dy: p.pos[1] + c.at[1],
          dz: p.pos[2] + c.at[2],
          hx: c.half[0],
          hy: c.half[1],
          hz: c.half[2],
        };
      }),
    ),
    geometry: merged(pieces.flatMap((p) => p.parts)),
    glass: pieces.flatMap((p) => p.glass),
    setEnabled(on: boolean) {
      for (const piece of pieces) piece.setEnabled(on);
    },
  };
}
