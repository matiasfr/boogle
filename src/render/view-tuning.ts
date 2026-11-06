// Local diagnostic metadata only; normal visits never load the material override.
export const VIEW_SPECS = [
  {
    id: 'view.mode',
    default: 0,
    max: 2,
    meaning: '0 lit, 1 unlit with current output, 2 raw base colour (sRGB only).',
  },
  { id: 'view.sky', default: 1, max: 1, meaning: 'Keep the current sky (1) or hide it (0).' },
  { id: 'view.water', default: 1, max: 1, meaning: 'Keep the current water surface (1) or hide it (0).' },
].map((spec) => ({
  ...spec,
  type: 'number' as const,
  scope: 'local' as const,
  min: 0,
  integer: true,
  units: 'choice',
  at: 'next draw; first switch compiles diagnostic materials',
  owner: 'src/debug/view-mode.ts',
}));
