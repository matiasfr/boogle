// Retained Local look experiments; every route uses the real sea, and water=old/new are no longer selectors.
const query = new URLSearchParams(location.search);
export const eveningPreview = query.get('evening');
// The summer sky is the day sky (owner, 6 November); the evening endpoint is still the procedural atmosphere.
export const prepareEvening = eveningPreview === '1' || eveningPreview === 'preview';
export const SKY_CUBE_SIZE = 1024;
