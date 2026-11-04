// Production defaults are explicit data, never prototype URL reads. Local rendering only.
// Research: docs/research/water-demo-diagnosis.md; .25 preserves the approved spectral shape.

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
  refraction: 0.06,
  caustics: 1,
  spray: 1,
  spraySize: 1,
  fogDensity: 1 / 18000,
  glint: 0.6,
  shoreAmp: 0.55, // m
  shoreLambda: 30, // m
  shoreSpeed: 1,
  shoreSteep: 1,
  swellFull: 26, // m: the depth where long swell fully exists
  chopShallow: 0.55, // chop's strength in the shallows
  wind: 9, // m/s
  waveScale: 0.25, // spectrum energy; source shape retained, amplitude halved (measured Hs 6.949 m)
  swellBearing: -15, // degrees
};

// Default demo optics and the previous pop grade, under the same physical lighting.
export const RAW = {
  absorption: ULTRA.absorption,
  scatter: ULTRA.scatter,
  saturation: 1,
  reflectGain: 1,
  reflectCap: 1,
  reflectTint: [1, 1, 1],
  sunGain: 1,
  fogDensity: ULTRA.fogDensity,
  shoreAmp: ULTRA.shoreAmp,
  shoreLambda: ULTRA.shoreLambda,
};
export const GRADE = {
  absorption: [0.85, 0.07, 0.04], // the demo's "clear" with more red gone, so sand under a metre of water goes mint, not lavender
  scatter: [0.0, 0.085, 0.2], // bluer than its "clear", lit the way the demo's auto exposure lifted it
  saturation: 1.2,
  reflectGain: 0.8,
  reflectCap: 0.5, // the horizon stays blue, as in the previz, instead of going to sky
  reflectTint: [0.66, 0.94, 1], // our sky's pale band mirrored in thin water reads lavender; the demo's sky is greener
  sunGain: 2.3 / 2.1,
  fogDensity: ULTRA.fogDensity,
  shoreAmp: ULTRA.shoreAmp,
  shoreLambda: ULTRA.shoreLambda,
};
export const LOOK = RAW;

// The mesh: OceanSurface.js's polar grid. ANGULAR 384 is its ~190k vertices.
export const GRID = { angular: 384, inner: 1, outer: 3000, far: 1500 };

// A few analytic waves for the geometry (stage 1): metres, metres, degrees. Friendly, well under the demo's Hs.
export const WAVES = [
  { lambda: 94, amp: 0.3, dir: 8, steep: 0.5 },
  { lambda: 57, amp: 0.2, dir: -22, steep: 0.6 },
  { lambda: 33, amp: 0.13, dir: 31, steep: 0.7 },
  { lambda: 21, amp: 0.075, dir: -7, steep: 0.8 },
  { lambda: 13, amp: 0.04, dir: 48, steep: 0.8 },
];

// Source shore field: 512² over 1800 m, 3.516 m per texel.
export const SHORE = { extent: 1800, size: 512 };

// All four source bands and 256². Demo diagnostics pass their settings to the reusable renderer explicitly.
export const FFT = {
  size: 256,
  bands: [0, 1, 2, 3],
  loop: 300, // OceanSim: quantised dispersion makes the loop seamless and keeps fp32 phase bounded
  foamRecovery: 0.7, // defaultOceanParams (the constructor's 0.45 placeholder is overwritten each frame)
};

// UnderwaterPass.js, MarineSnow.js and main.js: source values, independent of the water colour grade.
export const UNDER = {
  exposure: 1,
  scattering: 0.03,
  shafts: 2,
  shaftRange: 40,
  shaftSteps: 24,
  meniscus: 0.5,
  lensWidth: 64,
  lensHeight: 36,
  snowCount: 6000,
  snowBox: 24,
  drySeconds: 5,
  // A conservative CPU envelope; the GPU uses the actual displaced surface for the split and wet-lens transition.
  nearHeight: 4,
};
