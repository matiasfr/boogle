// The cliff kit's areas as built (dev/prefab/cliff-kit.ts writes one level an area; `npm run level-check` fails an area
// this list does not mount). Each stands as its own instance batches, so an area behind you draws nothing.
import canyon from '../../../content/built/levels/canyon-kit.json' with { type: 'json' };

export const KIT_AREAS: readonly unknown[] = [canyon];
