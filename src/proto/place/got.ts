// Legacy Place owns this presentation for the page. Production owns and disposes its own instance.
import { scene } from '../../render/scene.ts';
import { createRewardReveal } from '../../render/reward-reveal.ts';
import { fanfare, pop } from '../../render/fanfare.ts';
import { softGlow } from './look.ts';

export type { Got } from '../../render/reward-reveal.ts';
export const { rememberGot, resetGotHistory, gettingItem, youGot, dropGot, press, updateGot } = createRewardReveal({
  parent: scene,
  fanfare,
  pop,
  softGlow,
});
