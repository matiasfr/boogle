// Disposable option A from docs/research/shore-arrival.md. Local presentation and static Owner collision;
// every visitor to the reserved shore room builds the same grid. No change to the ordinary spawn or terrain.
import type { Pt } from './layout.ts';

const query = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
export const SHORE_ARRIVAL = query.get('proto') === 'place' && query.get('v') === 'shore-arrival';
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
