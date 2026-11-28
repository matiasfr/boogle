import { FAR, ORIGIN } from './layout.ts';
import { ringAt, ringDeckY } from '../sim/railway-ring-layout.ts';

export const ringCounts = { flock: 16, school: 36, swarm: 28 };
export type RingGroup = keyof typeof ringCounts;

// Shore bands follow the southern cone's contour on either side of the arrival.
// Keep the full travel envelope outside the station and its westward approach.
const shoreAngles = [0.343, -0.12, 0.57, -0.39];
export function ringAnchor(kind: RingGroup, i: number) {
  const phase = i * 2.4;
  if (kind === 'flock' && i % 4 === 3) {
    const u = 16000 + (i >> 2) * 2000;
    const p = ringAt(u, -605);
    return { x: p.x / 100, z: p.z / 100, y: ringDeckY(u) / 100, bent: u / 100 };
  }
  // Exposed rocks on the seaward lip of the station fill.
  if (kind === 'flock' && i % 4 === 2) {
    return { x: 1389 + 1.9 * Math.sin(phase), z: -800 + Math.cos(phase), y: 0.22, bent: 0 };
  }
  // Two schools also occupy the northern shallows of the main cone.
  const angle =
    (kind === 'school' && i % 3 === 2 ? Math.PI + (i % 2 ? 0.22 : -0.22) : shoreAngles[i % 4]!) +
    Math.sin(phase) * 0.009;
  const radius = (kind === 'school' ? 330 : kind === 'flock' ? 317 : 300) + Math.cos(phase) * 1.6;
  return {
    x: ORIGIN.x + FAR.x + Math.sin(angle) * radius,
    z: ORIGIN.z + FAR.z + Math.cos(angle) * radius,
    y: kind === 'school' ? -0.1 : 66 - (70 * radius) / 340,
    bent: 0,
  };
}
