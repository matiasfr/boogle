// Round 4's shore arrival. Local presentation and static Owner collision; Node tools use the same default grid.
// The isolated arrival=village comparison keeps the previous coast. SPAWN remains the village fallback.
import { pageQuery } from '../flags.ts';
import type { Plot, Pt } from './layout.ts';

export const SHORE_COAST = pageQuery().get('arrival') !== 'village';
export const SHORE_LANDING = { x: -199, z: 10, yaw: -Math.PI / 2 - 0.2 };
// Broad climb, then a bend between the cottages before the existing northbound walk.
export const SHORE_PATH: Pt[] = [
  [-199, 10, 3],
  [-187, 10, 3],
  [-177, 28, 9],
  [-165, 32, 14],
  [-150, 32, 18],
  [-143, 20, 18],
  [-137, 13, 18],
  [-121, 3, 18],
  [-105, 3, 18],
  [-98, 9, 18],
];
export const SHORE_HOP = { x: -165, z: 32, y: 14, height: 0.75, top: 1.2, bottom: 1.6 };

/** Keep the later water tower and its scaffold beside the walk; site IDs and progress stay unchanged. */
export const shorePlot = (p: Plot): Plot =>
  SHORE_COAST && p.type === 'water' && p.x === -131 && p.z === 8 ? { ...p, z: 17 } : p;
