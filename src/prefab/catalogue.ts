// The compiled catalogue is resolved and validated once per page, shared by every runtime consumer.
import artifact from '../../content/built/prefabs.json' with { type: 'json' };
import haltKit from '../../content/built/levels/halt-kit.json' with { type: 'json' };
import { loadPrefabArtifact, loadLevelArtifact } from './validate.ts';
export const compiled = loadPrefabArtifact(artifact);
export const definitions = compiled.prefabs;

export const haltKitPlacements = loadLevelArtifact(haltKit, definitions).placements;
