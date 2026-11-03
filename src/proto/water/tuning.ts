// The numbers of ?proto=water (./index.ts). Ultra Water's own values come first, unchanged, so the prototype starts from
// that water and moves toward toon by turning knobs, not the other way round (owner, 2 November). `&v=raw` plays them as
// they are; the default adds GRADE on top. The demo's units are physical (sun ~7, then auto exposure and AgX); ours are
// display-ish under a fixed exposure and Neutral, so SUN_GAIN stands in for what its exposure did to that sun.
import { protoV } from '../flags.ts';

export const ISLAND_AT = { x: 2400, z: 0 }; // far enough that home is a smudge on the horizon
export const SPAWN = { x: 2400 + 118, z: -28, yaw: -Math.PI / 2 + 0.15 }; // on the beach the swell comes to, facing the surf rock

// OceanSurface.js, constructor uniforms, and main.js's "clear" water preset.
export const ULTRA = {
  absorption: [0.4, 0.062, 0.032],
  scatter: [0.0, 0.05, 0.08],
  foamTint: [0.62, 0.78, 0.82],
  sss: [1.6, 0.06, 0.05], // peak strength, view strength, shadow strength
  foamBias: 0.05,
  foamScale: 1.3,
  foamBand: 0.2, // m: the contact band
  foamBright: 0.72,
  roughness: 0.02,
  fogDensity: 1 / 18000,
  glint: 0.6,
  shoreAmp: 0.55, // m
  shoreLambda: 30, // m
  shoreSpeed: 1,
  shoreSteep: 1,
  swellFull: 26, // m: the depth where long swell fully exists
  chopShallow: 0.55, // chop's strength in the shallows
  wind: 9, // m/s
  swellBearing: -15, // degrees
};

// The look over those numbers. Each is 1 (or the demo's) in `raw`.
const RAW = {
  absorption: ULTRA.absorption,
  scatter: ULTRA.scatter,
  saturation: 1,
  reflectGain: 1,
  reflectCap: 1,
  reflectTint: [1, 1, 1],
  sunGain: 2.1,
  fogDensity: 1 / 3200, // the demo's haze has 18 km to work in; our far plane is 6 km
  shoreAmp: ULTRA.shoreAmp,
  shoreLambda: ULTRA.shoreLambda,
};
const GRADE = {
  absorption: [0.85, 0.07, 0.04], // the demo's "clear" with more red gone, so sand under a metre of water goes mint, not lavender
  scatter: [0.0, 0.085, 0.2], // bluer than its "clear", lit the way the demo's auto exposure lifted it
  saturation: 1.2,
  reflectGain: 0.8,
  reflectCap: 0.5, // the horizon stays blue, as in the previz, instead of going to sky
  reflectTint: [0.66, 0.94, 1], // our sky's pale band mirrored in thin water reads lavender; the demo's sky is greener
  sunGain: 2.3,
  fogDensity: 1 / 4200,
  shoreAmp: 0.7, // this island's shelf is half as wide as the demo's, so its surf is shorter and a little taller
  shoreLambda: 22,
};
export const LOOK = protoV('water') === 'raw' ? RAW : GRADE;

// The mesh: OceanSurface.js's polar grid. ANGULAR 384 is its ~190k vertices.
const gridParam = Number(new URLSearchParams(location.search).get('grid')); // `&grid=192`, for cost
export const GRID = { angular: gridParam || 384, inner: 1, outer: 3000, far: 6000 };

// A few analytic waves for the geometry (stage 1): metres, metres, degrees. Friendly, well under the demo's Hs.
export const WAVES = [
  { lambda: 94, amp: 0.3, dir: 8, steep: 0.5 },
  { lambda: 57, amp: 0.2, dir: -22, steep: 0.6 },
  { lambda: 33, amp: 0.13, dir: 31, steep: 0.7 },
  { lambda: 21, amp: 0.075, dir: -7, steep: 0.8 },
  { lambda: 13, amp: 0.04, dir: 48, steep: 0.8 },
];

// The shore field, over the island: 512² over 1400 m is 2.7 m a texel (the demo: 3.5).
export const SHORE = { extent: 1400, size: 512 };
