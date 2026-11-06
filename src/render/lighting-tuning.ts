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

export const SKY_AUTHORING_SPECS = [
  {
    id: 'sky.cloudBrightness',
    default: 0.8,
    min: 0.6,
    max: 1,
    integer: false,
    units: 'cloud radiance multiplier',
    at: 'asynchronous sky rebake; await prepareFrozenLighting',
    meaning: 'Cloud RGB before atmospheric compositing; does not change cloud coverage or sun intensity.',
  },
  {
    id: 'sky.lightColourProfile',
    default: 1,
    min: 0,
    max: 2,
    integer: true,
    units: '0=original, 1=neutral, 2=slightly cool',
    at: 'presentation flush',
    meaning: 'Luminance-preserving key and hemisphere RGB profile; not a measured Kelvin temperature.',
  },
].map((spec) => ({
  ...spec,
  type: 'number' as const,
  scope: 'local' as const,
  owner: 'src/render/water/frozen-sky.ts',
}));
