// Home's rotunda in blocks (docs/plans/roundhouse-rotunda.md, step 1b): the generated level's pieces, each stood
// round the table from the site's row and shown by stage. Local and static: a piece reads no fact; the Roundhouse view
// (./roundhouse-view.ts) says which stage to show and owns the working bay's slab, sockets and vehicles.
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import level from '../../../content/built/levels/rotunda-home.json' with { type: 'json' };
import { ROTUNDA_HOME } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
import { rotundaPieces, rotundaPose, rotundaShows } from '../../place/rotunda.ts';

export function createRotundaBlocks(owner: OwnedView) {
  const site = ROTUNDA_HOME;
  const placements = new Map(loadLevelArtifact(level, definitions).placements.map((p) => [p.id, p]));
  const pieces = rotundaPieces(site).map((piece) => {
    const placement = placements.get(`rotunda-${site.id}.${piece.id}`);
    if (!placement) throw new Error(`rotunda: the level has no ${piece.id}; run npm run prefabs`);
    const pose = rotundaPose(site, piece.turn);
    const instance = instantiate(
      placement.prefab,
      { ...placement, pos: [pose.x + ORIGIN.x, pose.y, pose.z], rot: [pose.yaw, 0, 0] },
      { owner },
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
