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
import {
  bayOccupants,
  ROTUNDA_BLOCK,
  ROTUNDA_KIT,
  rotundaBays,
  rotundaPieces,
  rotundaPose,
  rotundaShows,
} from '../../place/rotunda.ts';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { me } from '../../player/state.ts';

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
  const pieces = [
    ...rotundaPieces(site),
    { id: 'open-doors', part: 'door' as const, turn: 0 },
    ...bayOccupants(site, { serving: 1 }).flatMap((turn) => [
      { id: `waiting-${turn}`, part: 'waiting' as const, turn },
      { id: `open-${turn}`, part: 'open' as const, turn },
    ]),
  ].map((piece) => {
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
      enabled: false,
      colliders: definitions[placement.prefab]!.colliders,
    };
  });
  let shown = -1;
  let serving = -1;
  let occupied = new Set<number>();
  let rising = false;
  const matrix = pieces[0]!.rest.clone();
  const point = owner.root.position.clone();
  function clearPlayer({ instance, colliders }: (typeof pieces)[number]) {
    const body = me.body;
    if (!body) return;
    // As at the halt reveal, test BOTH body spheres against the authored boxes in their own frame. Like the
    // bridge's clearance guard, do this before enabling collision, never let Rapier resolve a new solid through us.
    const root = instance.root;
    root.updateWorldMatrix(true, false);
    const overlaps = colliders.some((box) => {
      if (box.shape !== 'box') return false;
      return [0, HEAD_OFFSET].some((up) => {
        root.worldToLocal(point.set(body.position.x, body.position.y + up, body.position.z));
        const dx = Math.max(0, Math.abs(point.x - box.at[0]) - box.half[0]);
        const dy = Math.max(0, Math.abs(point.y - box.at[1]) - box.half[1]);
        const dz = Math.max(0, Math.abs(point.z - box.at[2]) - box.half[2]);
        return dx * dx + dy * dy + dz * dz < (PLAYER_R - 0.01) ** 2;
      });
    });
    if (!overlaps) return;
    // The flat apron on this road, in front of the door reveal and outside the pit/kerb. Transform its ground too:
    // an elevated owner must not put the player down on the untransformed site's floor.
    root.localToWorld(point.set(0, PLAYER_R + 0.025, ROTUNDA_KIT.doorR - ROTUNDA_BLOCK.reveal - PLAYER_R - 0.1));
    body.position.set(point.x, point.y, point.z);
    body.interpolatedPosition.set(point.x, point.y, point.z);
    body.velocity.set(0, 0, 0);
  }
  const shows = (stage: number, piece: (typeof pieces)[number]['piece']) => {
    if (stage >= 2 && piece.turn === -2 && piece.part === 'open') return true;
    if (stage >= 2 && piece.turn === -2 && piece.part === 'door') return false;
    if (piece.part === 'waiting') return occupied.has(piece.turn);
    if (piece.part === 'open') return occupied.has(piece.turn) && rotundaBays(site, stage).includes(piece.turn);
    if (piece.part === 'door' && occupied.has(piece.turn)) return false;
    return rotundaShows(site, stage, piece);
  };
  const view = {
    /** Stand the pieces of `stage` (solid with them) and clear the rest; a change snaps. */
    show(stage: number, count: number) {
      if (stage === shown && count === serving && !rising) return;
      rising = false;
      shown = stage;
      serving = count;
      occupied = new Set(bayOccupants(site, { serving }));
      for (const entry of pieces) {
        const { piece, instance, rest, batch, index } = entry;
        // Reset even an unfinished rise; unchanged pieces keep their record colliders.
        instance.root.position.y = rest.elements[13]!;
        const on = shows(stage, piece);
        if (
          on &&
          !entry.enabled &&
          (piece.part === 'waiting' || piece.part === 'open' || (piece.part === 'door' && piece.turn !== 0))
        )
          clearPlayer(entry);
        instance.setEnabled(on);
        entry.enabled = on;
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
    /** A join removes its covered engine and closes its built bay immediately; no roll-out or phantom train. */
    occupy(count: number) {
      if (count !== serving) view.show(shown, count);
    },
    /** Only newly built shells, doors and end walls move. Existing ruins/solids stay until the new stage settles.
     * Prefab batch matrices are visual only: no moving collider lifts a player through the roof. */
    rise(stage: number, progress: number) {
      rising = true;
      const changed = new Set<ReturnType<typeof createPrefabBatch>>();
      for (const { piece, instance, batch, index, rest } of pieces) {
        if (piece.part === 'ruin' || piece.part === 'waiting' || !shows(stage, piece) || shows(shown, piece)) continue;
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
    inspect: () => ({
      stage: shown,
      serving,
      waiting: [...occupied],
      standing: pieces.filter((p) => p.instance.root.visible).map((p) => p.piece.id),
    }),
  };
  return view;
}
