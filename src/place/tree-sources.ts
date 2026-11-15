// Production trees are generated prefab placements. Catalog identities and state-driven lifetime stay unchanged.
import level from '../../content/built/levels/land-trees.json' with { type: 'json' };
import { definitions } from '../prefab/catalogue.ts';
import { loadLevelArtifact, validateLevel } from '../prefab/validate.ts';
import { treePlacements } from './tree-placement-source.ts';
import type { TreeSource } from './tree-placement-source.ts';
export type { TreeSource } from './tree-placement-source.ts';
export const TREE_PLACEMENTS = treePlacements(loadLevelArtifact(level, definitions).generator!);
validateLevel({ place: 'land-trees', placements: TREE_PLACEMENTS }, definitions);
export const TREE_SOURCES: readonly TreeSource[] = TREE_PLACEMENTS.map((p) => ({
  index: p.params!.index as number,
  x: p.pos[0],
  z: p.pos[2],
  y: p.pos[1],
  root: p.params!.root as TreeSource['root'],
  size: p.scale![0],
  great: p.params!.great as boolean,
  hardwood: p.params!.hardwood as boolean,
  cleared: p.params!.cleared as boolean,
}));
