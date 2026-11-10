// Production defaults are explicit data, never prototype URL reads. Local rendering only.

// The water body's optics: the underwater fog and the tint on the ground beneath the sea. Absorption is per metre, linear.
export const LOOK = {
  absorption: [0.4, 0.062, 0.032],
  caustics: 1, // the seabed light's strength on the receivers
};
