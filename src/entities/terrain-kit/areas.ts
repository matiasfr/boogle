// The cliff kit's areas as built (dev/prefab/cliff-kit.ts writes one level an area; `npm run level-check` fails an area
// this list does not mount). Each stands as its own instance batches, so an area behind you draws nothing.
import canyon from '../../../content/built/levels/canyon-kit.json' with { type: 'json' };
import shore from '../../../content/built/levels/cliff-kit-shore.json' with { type: 'json' };
import gorgeRim from '../../../content/built/levels/cliff-kit-gorge-rim.json' with { type: 'json' };
import gorgeWalls from '../../../content/built/levels/cliff-kit-gorge-walls.json' with { type: 'json' };
import gorgeMouth from '../../../content/built/levels/cliff-kit-gorge-mouth.json' with { type: 'json' };

import northRidge from '../../../content/built/levels/cliff-kit-north-ridge.json' with { type: 'json' };
import eastCutting from '../../../content/built/levels/cliff-kit-east-cutting.json' with { type: 'json' };

/** Each area's built level, checked on load (src/prefab/validate.ts loadLevelArtifact). */
export const KIT_AREAS: readonly { place: string }[] = [canyon, shore, gorgeRim, gorgeWalls, gorgeMouth, northRidge, eastCutting];
