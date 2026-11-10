// Retained Local look experiments; every route uses the real sea, and water=old/new are no longer selectors.
import type { SkyCubeSize } from './sky-core.ts';
const query = new URLSearchParams(location.search);
export const eveningPreview = query.get('evening');
// The summer sky is the day sky (owner, 6 November); the evening endpoint is still the procedural atmosphere.
export const prepareEvening = eveningPreview === '1' || eveningPreview === 'preview';
// Owner, 9 November ("halving sky texture feels fine"): the sky cube is 512, 16 MiB with mips against 64 MiB at 1024.
// Matched desktop stills (horizon, sun, clouds, water reflection at Far Head and the cove) could not tell them apart,
// so it is 512 everywhere. `skyCube=1024` brings the old size back for comparison.
export const SKY_CUBE_SIZE: SkyCubeSize = query.get('skyCube') === '1024' ? 1024 : 512;
