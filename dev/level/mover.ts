// Controller limits shared by the full level checker and the standalone compiled-level audit.
import { GRAVITY, JUMP_SPEED, PLAYER_R, SWIM_DEPTH, SWIM_JUMP_SPEED, WALKABLE_NY } from '../../src/constants.ts';
import { MOVE } from '../../src/place/tech-layout.ts';
import type { Mover } from './flood.ts';

export const MOVER: Mover = {
  walkSlope: Math.sqrt(1 - WALKABLE_NY * WALKABLE_NY) / WALKABLE_NY,
  jumpHeight: (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY),
  wade: SWIM_DEPTH + PLAYER_R,
  swimHop: (SWIM_JUMP_SPEED * SWIM_JUMP_SPEED) / (2 * GRAVITY),
};

/** The moves as numbers, from the real controller's constants (dev/economy/place-level.ts's abilities check and the cliff
 * kit's reach check, dev/level/cliff-kit-reach.ts): one jump's rise and two jumps', how far each carries at walking
 * pace, and how far a glide carries for a drop, with the research's margins. */
export const ONE_JUMP = 1.68,
  TWO_JUMPS = 3.03,
  JUMP_REACH = 4.7, // walking pace, one jump
  TWO_REACH = 8; // two
export const GLIDE = (drop: number) => Math.max(0, (drop - 2) * (MOVE.glideSpeed / MOVE.glideSink) * 0.8 - 2.8);
