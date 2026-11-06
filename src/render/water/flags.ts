// Route ownership and retained Local look experiments; water=old/new are no longer selectors.
export { newWaterEnabled } from '../../proto/flags.ts';

const query = new URLSearchParams(location.search);
export const eveningPreview = query.get('evening');
// The summer sky is the day sky (owner, 6 November); the evening endpoint is still the procedural atmosphere.
export const prepareEvening = eveningPreview === '1' || eveningPreview === 'preview';
export const SKY_CUBE_SIZE = 1024;
