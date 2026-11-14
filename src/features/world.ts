// The room clock: follows the server's step from the frame loop, and from a worker clock while the tab is hidden.
import { onFrame, onStart } from '../loop.ts';
import { updateWorld } from '../world/sync.ts';
import { createBackgroundAdvance, startBackgroundClock } from '../world/background.ts';

const advance = createBackgroundAdvance(updateWorld, performance.now());
onFrame(({ now }) => advance(now, !document.hidden), { phase: 'update', order: -10 });
onStart(() => startBackgroundClock(advance));
