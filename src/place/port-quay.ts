import { QUAY_TABLE } from '../sim/railway-works-layout.ts';
import { ORIGIN } from './layout.ts';
import type { RotundaSite } from './rotunda.ts';

export const ROTUNDA_PORT_QUAY: RotundaSite = {
  id: 'port-quay',
  centre: { x: QUAY_TABLE.x / 100 - ORIGIN.x, z: QUAY_TABLE.z / 100 },
  y: 3.9,
  tableR: 8,
  approach: 135,
  mid: 315,
  order: [0, -1, 1, -2, 2],
  stages: [5],
  grows: false,
};
