// Shared deterministic world: ticks from the frame loop, and from a worker clock while the tab is hidden.
import { onFrame, onStart } from '../loop.js';
import { updateWorld } from '../world/sync.js';
import { startBackgroundClock } from '../world/background.js';

onFrame(({ dt }) => updateWorld(dt), { phase: 'update', order: -10 });
onStart(() => startBackgroundClock(updateWorld));
