import { censusWalls } from '../ground/cliff-walls.ts';
import { dressSlope, raysAlong } from './cliff-kit-slope.ts';
import type { Area } from './cliff-kit.ts';

export const northRidge: Area = {
  id: 'north-ridge',
  walls: [[-40, -182]],
  stranded: { x: -42, z: -179, half: 48 },
  dress(kit) {
    const { wallAt } = censusWalls();
    dressSlope(kit, 'camp path shoulder', raysAlong(-78, -177, -6, -177, 0, -1), [29, 35, 41], {
      rock: (x, z) => wallAt(x, z)?.id === 5,
    });
  },
};

export const eastCutting: Area = {
  id: 'east-cutting',
  walls: [[190, -48]],
  stranded: { x: 191, z: -41, half: 24 },
  dress(kit) {
    const { wallAt } = censusWalls();
    dressSlope(kit, 'line two cut', raysAlong(196, -52, 196, -30, -1, 0), [8, 14, 20], {
      rock: (x, z) => wallAt(x, z)?.id === 10,
    });
  },
};
