// The numbers of ?proto=crossing (./index.ts), in one table to change them. Three variants, each differing in one thing:
// the default against `express` is the same distance with a faster train, `express` against `vast` is the same train
// with far more sea. Rides: 64 s, 29 s and 85 s. On foot, for comparison: sprint 9.5 m/s (126 s and 7 min), walk 5.6 m/s.
import { protoV } from '../flags.ts';

export type Crossing = {
  length: number; // m of line, station to station
  speed: number; // m/s, the train's cruise
  accel: number; // m/s², speeding up and braking
  swing: number; // m the S-curve swings off the straight line
  rise: number; // m of rail height over the sea at mid-span
  ramp: number; // m over which the line climbs from the shore to mid-span
  fogNear: number; // m: the far plane, the fog and the sea all follow from fogFar (./sky.ts)
  fogFar: number;
};
const DEFAULT: Crossing = {
  length: 1200,
  speed: 20,
  accel: 3,
  swing: 70,
  rise: 15,
  ramp: 300,
  fogNear: 180,
  fogFar: 3600,
};
const VARIANTS: Record<string, Crossing> = {
  '': DEFAULT,
  express: { ...DEFAULT, speed: 50, accel: 8 },
  vast: { ...DEFAULT, length: 4000, speed: 50, accel: 8, swing: 220, rise: 18, ramp: 500, fogFar: 9200 },
};
export const CROSSING: Crossing = VARIANTS[protoV('crossing')] ?? DEFAULT;

export const TIMETABLE = {
  dwell: 10, // s standing at each end
  firstLeave: 10, // s from when you arrive to the first departure: it drops you beside a train about to leave
  stopIn: 24, // m from each end of the line to where the train stands
};
export const FEEL = {
  fovWide: 5, // degrees wider at the express's top speed (less at lower speeds, none standing)
  fovIn: 1.6, // /s: how fast it eases wider, and back
  hudAfter: 6, // s of riding before the HUD fades
  smokePerM: 0.5, // puffs per metre the loco moves
};

// The everyday look: previz shot 2 (docs/research/sunshine-look.md, recommendations 1-3). Colours are display sRGB.
export const LOOK = {
  // The sea (./sea.ts): body colour by depth, sky reflection by view angle, sun glitter.
  shallow: '#66D6CF', // at 0 m
  body: '#0A80B5', // at 2.5 m
  deep: '#0774B0', // from 9 m, and all open water
  f0: 0.02, // reflection looking straight down
  reflectGain: 0.42, // Schlick's curve scaled down: the shot's sea only drifts toward the sky
  reflectCap: 0.3, // and at most, so the horizon stays blue
  skyRipple: 0.12, // how much of the normal layers reaches the reflection
  glintExp: 240,
  glintGain: 1.4,
  laneGain: 0.45, // of that, once the layers have faded into a soft lane
  slope8: 0.12, // the 8 m normal layer's RMS slope
  slope2: 0.05, // the 2 m layer's
  swell: 0.018, // each wave of the slow swell's slope
  fadePx: [2, 3] as const, // a layer's detail is gone when its features span this few pixels
  // The day (./sky.ts): holds until the sun is low, then the game's own golden hour and night take over.
  skyTop: '#1E8CEC',
  skyHorizon: '#CCD9EE',
  skyCurve: 0.36, // the game's is 0.6: the pale band stays low, and the sky is blue by a third of the way up
  fog: '#A4C8F0', // bluer than the horizon, so the far sea stays blue and meets a soft pale band
  sunI: 4, // on a late-morning sun, whose light rakes the deck
  sunNoonI: 2.5, // the game's,
  // The viaduct (./world.ts).
  timber: '#C08A4C',
  timberDark: '#7F5630',
  bed: '#6A4A2C',
  sleeper: '#8A6236',
  seam: '#6E4C2A',
  rail: '#3A302C',
  marker: '#D23A2C',
  pier: '#C2CED2',
  pierCap: '#8F9A9E',
};
