// Metadata only for the toon lighting model (src/render/toon.ts): the owner's 10 November pick, style B without its rim.
// Defaults are the shipped look; with Dev or tune=1 each knob is a live uniform. No renderer or runtime state imports.
export const TOON_PARAMETERS = {
  edge: { default: 0.22, min: 0, max: 1, units: 'N·L', meaning: 'Where the lit step starts on the sun side.' },
  soft: {
    default: 0.07,
    min: 0.01,
    max: 0.3,
    units: 'N·L',
    meaning: "Half-width of the step's smooth edge; a hard edge aliases and crawls in motion.",
  },
  lit: {
    default: 0.8,
    min: 0,
    max: 1.5,
    units: 'N·L',
    meaning: "The lit plateau; near flat ground's N·L at the frozen sun, so sunlit ground keeps its brightness.",
  },
  keep: {
    default: 0.3,
    min: 0,
    max: 1,
    units: 'share',
    meaning: 'Share of the cosine kept on the lit side, so round heads stay round.',
  },
  flat: {
    default: 0.55,
    min: 0,
    max: 1,
    units: 'share',
    meaning: "How much of the sky fill's up/down gradient is removed (0 is the plain hemisphere).",
  },
  shade: {
    default: 0.72,
    min: 0,
    max: 1.5,
    units: 'fill multiplier',
    meaning: 'Sky fill kept on faces turned from the sun, cool-tinted.',
  },
  rim: {
    default: 0,
    min: 0,
    max: 1,
    units: 'N·L',
    meaning: 'Sun-side rim on characters. 0: the 2 November "no rim light" call; style B had .35.',
  },
} as const;
export type ToonKey = keyof typeof TOON_PARAMETERS;
export const TOON_SPECS = Object.entries(TOON_PARAMETERS).map(([key, spec]) => ({
  ...spec,
  id: `toon.${key}`,
  type: 'number' as const,
  scope: 'local' as const,
  integer: false,
  at: 'next frame',
  owner: 'src/render/toon.ts',
}));
