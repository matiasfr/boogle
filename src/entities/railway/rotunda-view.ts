// Home's finished rotunda (docs/plans/roundhouse-rotunda.md, steps 4–5): the generated level's pieces, each stood
// round the table from the site's row and shown by stage. Local scenery: a piece reads no fact; the Roundhouse view
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
    instance.root.updateMatrix();
    return {
      piece,
      instance,
      batch: batch?.target,
      index: batch ? batch.next - 1 : 0,
      rest: instance.root.matrix.clone(),
    };
  });
  let shown = -1;
  let rising = false;
  const matrix = pieces[0]!.rest.clone();
  return {
    /** Stand the pieces of `stage` (solid with them) and clear the rest; a change snaps. */
    show(stage: number) {
      if (stage === shown && !rising) return;
      rising = false;
      shown = stage;
      for (const { piece, instance, rest, batch, index } of pieces) {
        // Reset even an unfinished rise; unchanged pieces keep their record colliders.
        instance.root.position.y = rest.elements[13]!;
        const on = rotundaShows(site, stage, piece);
        instance.setEnabled(on);
        instance.root.visible = on;
        if (batch) {
          batch.mesh.setMatrixAt(index, instance.root.visible ? rest : matrix.makeScale(0, 0, 0));
          batch.mesh.instanceMatrix.needsUpdate = true;
        }
      }
      for (const { target } of batches.values()) {
        target.mesh.computeBoundingBox();
        target.mesh.computeBoundingSphere();
      }
    },
    /** Only newly built shells, doors and end walls move. Existing ruins/solids stay until the new stage settles.
     * Prefab batch matrices are visual only: no moving collider lifts a player through the roof. */
    rise(stage: number, progress: number) {
      rising = true;
      const changed = new Set<ReturnType<typeof createPrefabBatch>>();
      for (const { piece, instance, batch, index, rest } of pieces) {
        if (piece.part === 'ruin' || !rotundaShows(site, stage, piece) || rotundaShows(site, shown, piece)) continue;
        const offset = -8 * (1 - progress);
        instance.root.position.y = rest.elements[13]! + offset;
        instance.root.visible = true;
        if (batch) {
          matrix.copy(rest);
          matrix.elements[13]! += offset;
          batch.mesh.setMatrixAt(index, matrix);
          changed.add(batch);
        }
      }
      for (const batch of changed) {
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.mesh.computeBoundingBox();
        batch.mesh.computeBoundingSphere();
      }
    },
    inspect: () => ({ stage: shown, standing: pieces.filter((p) => p.instance.root.visible).map((p) => p.piece.id) }),
  };
}
