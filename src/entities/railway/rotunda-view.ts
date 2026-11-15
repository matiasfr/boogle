// Home's finished rotunda (docs/plans/roundhouse-rotunda.md, step 4): the generated level's pieces, each stood
// round the table from the site's row and shown by stage. Local and static: a piece reads no fact; the Roundhouse view
// (./roundhouse-view.ts) says which stage to show and owns the working bay's slab, sockets and vehicles.
import type { OwnedView } from '../../render/owned-view.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import level from '../../../content/built/levels/rotunda-home.json' with { type: 'json' };
import { ROTUNDA_HOME } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
import { rotundaPieces, rotundaPose, rotundaShows } from '../../place/rotunda.ts';

export function createRotundaView(owner: OwnedView) {
  const site = ROTUNDA_HOME;
  const placements = new Map(loadLevelArtifact(level, definitions).placements.map((p) => [p.id, p]));
  const batches = new Map<string, { target: ReturnType<typeof createPrefabBatch>; next: number }>();
  for (const placement of placements.values()) {
    const visual = definitions[placement.prefab]!.visual;
    if (!('builder' in visual) || !visual.batch || batches.has(placement.prefab)) continue;
    const count = [...placements.values()].filter((p) => p.prefab === placement.prefab).length;
    batches.set(placement.prefab, { target: createPrefabBatch(placement.prefab, count, owner), next: 0 });
  }
  const pieces = [...rotundaPieces(site), { id: 'open-doors', part: 'door' as const, turn: 0 }].map((piece) => {
    const placement = placements.get(`rotunda-${site.id}.${piece.id}`);
    if (!placement) throw new Error(`rotunda: the level has no ${piece.id}; run npm run prefabs`);
    const pose = rotundaPose(site, piece.turn);
    const batch = batches.get(placement.prefab);
    const instance = instantiate(
      placement.prefab,
      { ...placement, pos: [pose.x + ORIGIN.x, pose.y, pose.z], rot: [pose.yaw, 0, 0] },
      { owner, ...(batch ? { batch: { target: batch.target, index: batch.next++ } } : {}) },
    );
    return { piece, instance };
  });
  let shown = -1;
  return {
    /** Stand the pieces of `stage` (solid with them) and clear the rest; a change snaps. */
    show(stage: number) {
      if (stage === shown) return;
      shown = stage;
      for (const { piece, instance } of pieces) instance.setEnabled(rotundaShows(site, stage, piece));
    },
    inspect: () => ({ stage: shown, standing: pieces.filter((p) => p.instance.root.visible).map((p) => p.piece.id) }),
  };
}
