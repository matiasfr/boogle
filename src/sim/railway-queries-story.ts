// The room's story act, derived from railway progress the world already holds (docs/brainstorms/acts.md; owner,
// 11 November 2026). No saved state, no op: a pure read. Act 1 until Far Head's show, when Q5 is laid; Act 2 after.
// Acts 3 to 5 are not in the code: each turns on when the content behind it is built.
import type { World } from '../ecs/index.ts';
import { farHeadLaid } from './railway-queries-line2.ts';

export type StoryAct = 1 | 2;
/** The room's act now. */
export const storyAct = (w: World): StoryAct => (farHeadLaid(w) ? 2 : 1);
