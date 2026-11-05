// Metadata only; the frozen-sky owner retains its lights and presentation flush.
export const LIGHTING_SPECS = [
  { id: 'sky.keyGain', default: 1.12, meaning: 'Multiplier on the baked sky directional light.' },
  { id: 'sky.fillGain', default: 3.2, meaning: 'Multiplier on the outdoor hemisphere fill.' },
].map((spec) => ({
  ...spec,
  type: 'number' as const,
  scope: 'local' as const,
  min: 0,
  max: 8,
  integer: false,
  units: 'linear multiplier',
  at: 'presentation flush',
  owner: 'src/render/water/frozen-sky.ts',
}));
