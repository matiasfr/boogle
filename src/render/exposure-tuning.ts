// Metadata stays beside the exposure owner; importing it never constructs a renderer.
export const EXPOSURE_SPEC = {
  id: 'post.centre',
  type: 'number',
  scope: 'local',
  default: 0.16,
  min: 0.01,
  max: 2,
  integer: false,
  units: 'linear gain',
  at: 'live',
  owner: 'src/render/exposure.ts',
  meaning: 'Surface exposure gain; higher values brighten the next rendered image.',
} as const;
