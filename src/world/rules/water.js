// Retired 2026-10-30: the shared water sim is removed (docs/plans/cleanup-dig-water-junk.md); the sea stays. The
// `water` key keeps its slot in RULES so state order and hashes line up across builds. It loads any save and
// ignores the cells.
import { BARE_HASH } from './terrain.js'; // any constant works: old tabs cannot match (see the plan)
export const name = 'water';
export function install(sync) {
  sync.registerState('water', { serialize: () => ({}), load: () => {}, hash: () => BARE_HASH });
  return {};
}
