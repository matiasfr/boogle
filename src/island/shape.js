// The island's natural ground, before any point of interest reshapes it (src/island/stamps.js does that).
//
// Two landmasses joined into one island:
// - home: the original island around the origin (spawn, court, mushroom garden). Inside HOME_KEEP metres of the origin
//   the ground is exactly what it always was, so nothing there moves.
// - mainland: a few times home's size, to the north (-z), with rolling meadows, an eastern plain, a western point and
//   a rocky massif in the north-west. Points of interest are placed on it by their site files (src/pois/*/site.js).
//   Kept small on purpose: everything is a short sprint from spawn (about 10-15 s), so friends stay in sight of
//   each other, and the lighthouse hill in the middle is visible from everywhere.
//
// Pure arithmetic on floats (no three.js, no DOM). Every client computes the same numbers; ground.js quantizes
// them to centimetres once, so the shared sim never sees raw floats.
import { lerp, smoothstep, fbm } from '../math-pure.js';

export const SEABED = -7.5;
const HOME_R = 52;
export const HOME_KEEP = 22; // metres from the origin where the home ground is untouched

// Mainland: a noisy ellipse north of home, small enough that everything is a short run from spawn.
export const MAINLAND = { x: 6, z: -66, rx: 96, rz: 56 };
// Lobes that stick out of the mainland (capes and points), as extra ellipses unioned with it.
const LOBES = [
  { x: 86, z: -36, rx: 34, rz: 26 }, // east plain (windmill farm)
  { x: -78, z: -20, rx: 30, rz: 22 }, // west point, closing the west cove
];
// The north-west massif: a rocky upland.
export const MASSIF = { x: -54, z: -92, rx: 42, rz: 30, h: 15 };

// Original island, unchanged.
export function homeHeight(x, z) {
  const d = Math.hypot(x, z * 1.12) / HOME_R + fbm(x * 0.03 + 11, z * 0.03 - 7) * 0.16;
  const hill = 6.5 * Math.exp(-((x + 12) ** 2 + (z + 6) ** 2) / (2 * 13 * 13));
  const bumps = fbm(x * 0.08, z * 0.08) * 1.1 * (1 - smoothstep(0.55, 0.85, d));
  const inland = 1.3 + hill + bumps + 0.9 * (1 - smoothstep(0.3, 0.8, d));
  return lerp(inland, SEABED, smoothstep(0.8, 1.12, d));
}

const ellipse = (x, z, e) => {
  const u = (x - e.x) / e.rx,
    v = (z - e.z) / e.rz;
  return Math.sqrt(u * u + v * v);
};
// Smooth minimum: joins two distance fields without a crease.
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// 0 inside the coastline, 1 at the coast, > 1 out at sea (normalised, noisy).
export function mainlandDistance(x, z) {
  let d = ellipse(x, z, MAINLAND);
  for (const l of LOBES) d = smin(d, ellipse(x, z, l), 0.35);
  return d + fbm(x * 0.011 + 3.1, z * 0.011 - 5.7) * 0.14 + fbm(x * 0.045 - 2, z * 0.045 + 9) * 0.035;
}

// 0..1 bump with a flat-ish top: 1 at the centre, 0 at t >= 1.
const bump = (t) => (t >= 1 ? 0 : (1 - t * t) * (1 - t * t));

export function mainlandHeight(x, z) {
  const d = mainlandDistance(x, z);
  if (d > 1.25) return SEABED;
  const meadow = 1.9 + 1.5 * (1 - smoothstep(0.3, 0.85, d)) + fbm(x * 0.018 + 7, z * 0.018 + 1) * 2.4;
  const bumps = fbm(x * 0.07, z * 0.07) * 0.9 * (1 - smoothstep(0.6, 0.9, d));
  // The massif: a broad dome with ridges, worn down by noise.
  const m = ellipse(x, z, MASSIF);
  const ridges = 1 - Math.abs(fbm(x * 0.035 + 40, z * 0.035 - 13)) * 2; // 1 on the ridge lines
  const massif = MASSIF.h * bump(m) * (0.78 + 0.22 * ridges) + 3.5 * bump(m / 1.35);
  const inland = meadow + bumps + massif;
  return lerp(inland, SEABED, smoothstep(0.82, 1.1, d));
}

// Smooth maximum of two heights (union of two landmasses).
function smax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

export function naturalHeight(x, z) {
  const home = homeHeight(x, z);
  const r = Math.sqrt(x * x + z * z);
  if (r < HOME_KEEP) return home;
  // The mainland fades in outside HOME_KEEP and only ever raises the ground (smooth max), so spawn, the court and
  // the garden keep the ground they always had.
  const main = lerp(SEABED, mainlandHeight(x, z), smoothstep(HOME_KEEP, HOME_KEEP + 12, r));
  return smax(home, main, 2);
}
