// Owner decisions, not exemptions from correctness checks. Absence of a reference is never deletion authority.
export const RETAINED: Record<string, string> = {
  'dev/audio/render.ts': 'Manual listening-pack renderer: node dev/audio/render.ts.',
  'dev/economy/model.ts': 'Manual pacing model: node dev/economy/model.ts round4.',
  'dev/economy/place-level.ts': 'Manual place reach check: node dev/economy/place-level.ts.',
  'dev/layout/export.ts': 'Manual island layout export: node dev/layout/export.ts.',
  'dev/look/boot-time.ts': 'Manual boot timing: node dev/look/boot-time.ts.',
  'dev/look/sw-check.ts': 'Manual service worker check: node dev/look/sw-check.ts.',
  'dev/water-diagnose.ts': 'Manual water diagnosis: node dev/water-diagnose.ts.',
  'docs/research/notes/entity-architecture/dispatch-bench.ts':
    'Reproducible research benchmark, run directly with Node.',
  'native/guest/build.ts': 'Manual guest engine build documented in native/guest/README.md.',
  'src/proto/place/ambience.ts': 'ambienceState is a documented manual browser listening inspection.',
  'src/player/identity.ts': 'adoptPid is the owner-kept transfer and account seam (docs/plans/0.1-groundwork.md).',
  'src/sim/tiers.ts': 'Held until rewards are designed (docs/decisions.md, Controls).',
};
