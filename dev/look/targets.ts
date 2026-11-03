// Reference motion for `npm run look -- --curves --target <name>`: what a named feel measures, read over the last third of the
// capture, so frame the steady part. Numbers carry their standing; a target is a place to start judging from, not a pass mark.
import type { Target } from './curves.ts';

export const TARGETS: Record<string, Target> = {
  // docs/research/movement-abilities.md: 3.2 m/s of sink is the one measured figure (a student paper, 70 m in 22 s, standing
  // still in the air). 8 m/s forward and 2.5 m/s sink are that doc's starting hypotheses, not Nintendo's numbers.
  glide: {
    about: "Breath of the Wild's glide: docs/research/movement-abilities.md, rec 4; hypotheses except the sink",
    bands: {
      speed: { lo: 7, hi: 9, note: 'hypothesis, 8 m/s forward' },
      vy: { lo: -3.4, hi: -2.3, note: 'hypothesis -2.5; measured -3.2' },
    },
  },
};
