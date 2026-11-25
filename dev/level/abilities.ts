// The moves as numbers, from the real controller's constants: one jump's rise and two jumps', how far each carries at
// walking pace, and how far a glide carries for a drop, with the research's margins. Read by the abilities check
// (dev/economy/place-level.ts) and the cliff kit's reach check (./cliff-kit-reach.ts). ONE_JUMP is the abilities
// check's measured jump with its margin; ./mover.ts's `jumpHeight` (1.604 m) is the flood's step, derived from gravity.
import { MOVE } from '../../src/place/tech-layout.ts';

export const ONE_JUMP = 1.68,
  TWO_JUMPS = 3.03,
  JUMP_REACH = 4.7, // walking pace, one jump
  TWO_REACH = 8; // two
export const GLIDE = (drop: number) => Math.max(0, (drop - 2) * (MOVE.glideSpeed / MOVE.glideSink) * 0.8 - 2.8);
