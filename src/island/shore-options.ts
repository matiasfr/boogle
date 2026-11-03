// Local, home-only visual experiment. No heightfield, shore bake or shared state changes.
export const SHORE = { x0: -42.5, x1: 42.5, z0: 10, z1: 50, divisions: 3 };
const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const home = q.get('classic') === '1' && !q.has('proto');
export const shoreMode = home && ['smooth', 'smooth-detail'].includes(q.get('shore') ?? '') ? q.get('shore') : null;
export const shoreRocks = home && q.get('shoreRocks') === '1';
export const inShore = (x: number, z: number) => x >= SHORE.x0 && x <= SHORE.x1 && z >= SHORE.z0 && z <= SHORE.z1;
