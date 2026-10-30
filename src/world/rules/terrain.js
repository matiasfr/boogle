// Retired 2026-10-30: sand digging is removed (docs/plans/cleanup-dig-water-junk.md). The `terrain` key keeps its
// slot in RULES so state order and hashes line up across builds. It loads any save and ignores the sand deltas and
// buckets older builds wrote. It always serializes the bare island in the old format, so an older build that loads
// it gets no sand moved.
export const name = 'terrain';
// The old createTerrainState().hash() with no deltas and no players: just the FNV offset basis, so a new host and an
// old tab that loaded its snapshot agree.
export const BARE_HASH = 2166136261;
export function install(sync, land) {
  sync.registerState('terrain', {
    serialize: () => ({ d: [], players: [], n: land.n }),
    load: () => {},
    hash: () => BARE_HASH,
  });
  return {};
}
