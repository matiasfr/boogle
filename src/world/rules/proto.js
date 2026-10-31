// Retired 2026-10-31: the prototype flags are gone and every feature they gated is always on. The `proto` key keeps
// its slot in RULES so state order and hashes line up across builds. It has no ops. It keeps whatever bitmask a save
// or an older host's snapshot carries and serializes and hashes it exactly as older builds do, so a room that mixes
// builds agrees even when an older host ran with `?off=` (fresh: all five old flags on). Nothing reads the mask.
export const name = 'proto';
const ALL = 31; // the five old flags
export function install(sync) {
  let m = ALL;
  sync.registerState('proto', {
    serialize: () => ({ m }),
    load: (json) => {
      if (Number.isInteger(json?.m)) m = json.m & ALL;
    },
    hash: () => Math.imul((m + 1) ^ 0x9e3779b1, 16777619) >>> 0,
  });
  return {};
}
