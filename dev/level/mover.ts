// Controller limits shared by the full level checker and the standalone compiled-level audit.
import { GRAVITY, JUMP_SPEED, PLAYER_R, SWIM_DEPTH, SWIM_JUMP_SPEED, WALKABLE_NY } from '../../src/constants.ts';
import type { Mover } from './flood.ts';

export const MOVER: Mover = {
  walkSlope: Math.sqrt(1 - WALKABLE_NY * WALKABLE_NY) / WALKABLE_NY,
  jumpHeight: (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY),
  wade: SWIM_DEPTH + PLAYER_R,
  swimHop: (SWIM_JUMP_SPEED * SWIM_JUMP_SPEED) / (2 * GRAVITY),
};
