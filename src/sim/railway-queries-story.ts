// The room's story act, derived from railway progress the world already holds (docs/brainstorms/acts.md; owner,
// 11 November 2026). No saved state, no op: a pure read. Act 1 until Far Head's show, when Q5 is laid; Act 2 after.
// Acts 3 to 5 are not in the code: each turns on when the content behind it is built.
import type { World } from '../ecs/index.ts';
import { QJob } from './railway-components.ts';
import { qjob } from './railway-queries.ts';

/** Q5 is slot 4 of line two's stretches: the one Far Head's show plays on. */
const FAR_HEAD_SLOT = 4;

export type StoryAct = 1 | 2;
/** The room's act now. */
export const storyAct = (w: World): StoryAct => (w.get(QJob, qjob(w, FAR_HEAD_SLOT))!.completion ? 2 : 1);
