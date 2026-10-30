// Retired 2026-10-30: the shared water sim is removed (docs/plans/cleanup-dig-water-junk.md); the sea stays. The
// `water` key keeps its slot in RULES so state order and hashes line up across builds. It loads any save and
// ignores the cells.
export const name = 'water';
export const BARE_HASH = 2166136261; // any constant works (old tabs cannot match, see the plan); same as terrain's
export function install(sync) {
  sync.registerState('water', { serialize: () => ({}), load: () => {}, hash: () => BARE_HASH });
  return {};
}
