// The shared audio context (src/render/audio.ts) is built behind the loading screen, suspended, so the first gesture
// only resumes it: built in that gesture it held the frame 220-250 ms on a Mac, and on a first visit that gesture is
// Jump in, the arrival's first frame (10 November 2026). Local presentation.
import { prepareAudio } from '../render/audio.ts';
import { warmUp } from '../render/precompile.ts';

warmUp(() => {
  prepareAudio();
});
