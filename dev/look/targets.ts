// Reference motion for `npm run look -- --curves --target <name>`: what a named feel measures, read over the last third of the
// capture, so frame the steady part. A target is a place to start judging from, not a pass mark. Sources, tolerances and the
// transients to plot by hand (acceleration, braking, turning, opening, closing): docs/research/botw-glide-target.md.
import type { Target } from './curves.ts';

export const TARGETS: Record<string, Target> = {
  // Only the sink is a Breath of the Wild measurement (a student paper, 70 m in 22 s, standing still in the air). The forward
  // speed leans on one Tears of the Kingdom measurement, 9.7 m/s. No complete BotW glide curve was found.
  glide: {
    about: 'BotW-leaning glide, full stick: docs/research/botw-glide-target.md, rec 1',
    bands: {
      speed: { lo: 9.5, hi: 10.5, note: 'proposed; TotK measured 9.7' },
      vy: { lo: -3.5, hi: -2.9, note: 'BotW measured -3.2, standing still' },
    },
  },
  // The slower variant from docs/research/movement-abilities.md: hypotheses, kept as a feel to compare.
  'glide-slow': {
    about: 'slower feel variant: docs/research/movement-abilities.md, rec 4; hypotheses',
    bands: {
      speed: { lo: 7.5, hi: 8.5, note: 'hypothesis' },
      vy: { lo: -2.8, hi: -2.2, note: 'hypothesis' },
    },
  },
  // BotW's normal outdoor framing, as an experiment: its glide camera's own numbers are unknown. `cam` here is lens to body, about
  // 5.77 m at Boogle's pivot for a 5.3 m radius.
  'glide-frame': {
    about:
      "BotW's normal framing, 5.3 m radius and 50 degrees: docs/research/botw-glide-target.md, rec 6; datamined, not a glide shot",
    bands: {
      cam: { lo: 5.5, hi: 6.05, note: 'lens to body at a 5.3 m radius' },
      fov: { lo: 48, hi: 52, note: 'datamined 50 vertical' },
    },
  },
};
