// Split-rock Works and Roundhouse positions, world centimetres, pinned from Place and the Sickle map (8 Nov 2026).
// Dormant numeric catalog: no runtime consumer until the Works rules land. No prototype imports.
import { LINE1_ROCKS } from './railway-line-layout.ts';

export const WORKS = {
  kilnLogs: 16,
  kilnStone: 16,
  castTicks: 80,
  rackCap: 6,
  stall: 2,
  cradle: 2,
  cradleRails: 8,
  pier: 12,
  total: 16,
  wagonCap: 6,
  rollTicks: 60,
} as const;
export const WORKS_SEAMS = [
  { id: 0, name: 'stall', x: 91240, z: 1760, y: 1830, reach: 400 },
  { id: 1, name: 'throat', x: 111900, z: 8200, y: 2400, reach: 500 },
] as const;
export const WORKS_BREAKER = { x: 91900, z: 540, y: 1815, reach: 420 } as const;
export const WORKS_CLEFT = { x: 116000, z: 12000, y: 2148 } as const;
export const WORKS_KILN = { x: 112800, z: 8700, y: 2420, reach: 450 } as const;
export const WORKS_RACK = { x: 108800, z: 5000, y: 2400, reach: 400 } as const;
export const WORKS_ROCKS = [
  { id: 3, x: 114500, z: 10500, y: 2462, initial: 8 },
  { id: 4, x: 115000, z: 9800, y: 2468, initial: 8 },
] as const;
export const SHED_STALL = { x: 90950, z: 2050, y: 1800, reach: 500 } as const;
export const SHED_TABLE = { x: 91800, z: 1200, y: 1830, reach: 600 } as const;
export const SHED_ROAD = { stall: 0, line2: 1 } as const;
export const WAGON_S = 960;
export const PIER_STOP_CM = 73000;
export const PIER_STOP = { x: 140259, z: -35846, y: 2430 } as const;
// Least displacement on the centimetre grid to clear the real rail by 3.5 m (not its 1 m sample vertices).
export const PIER_RACK = { x: 139894, z: -36177, y: 2430, reach: 400 } as const;
export const PIER_FRAME = { x: 140554, z: -37107, y: 2430, reach: 500 } as const;
export const CROSSING_BENTS = [
  { x: 140254, z: -39199 },
  { x: 140309, z: -41199 },
  { x: 140363, z: -43198 },
  { x: 140417, z: -45197 },
  { x: 140472, z: -47196 },
  { x: 140526, z: -49196 },
] as const;
export const CROSSING_FOOT_OFF = 250;
export const RAIL_ROCKS = [...LINE1_ROCKS, ...WORKS_ROCKS] as const;
