import type { ShotList } from '../shot-types.ts';

// node dev/look/shots.ts dev/look/beats/leg2-bell-lower.ts --name leg2-bell-lower
// Bell Rock's lower level in grey (docs/plans/greybox-leg2-massing.md, step 3 and its design review's stills): your
// body is stood on the lower deck by dev/look/evals/stack-at.ts, so the area's massing is resident.
export default {
  question:
    'Bell Rock, lower level: do the deck, both stall pads with readable labels and the ramp foot read from the west platform, does the ramp show its parapet and head, and does the slipway climb out of the water?',
  size: [1280, 800],
  beats: [
    {
      name: 'Bell Rock lower',
      setup: 'dev/look/evals/stack-at.ts',
      query: 'dev=1&stackat=-65.6,6.5,-840.9',
      warm: 3,
      cameras: [
        { name: 'West platform, north (lever) end', cam: [-54.2, 6.6, -876.8], look: [-66.2, 5.6, -863], fov: 62 },
        { name: 'Up the ramp from its foot', cam: [-72.3, 6.6, -854.4], look: [-70.7, 15, -879.3], fov: 62 },
        { name: "From the water at the slipway's foot", cam: [-53.3, 0.5, -902.3], look: [-54.8, 5, -878.3], fov: 62 },
        { name: 'The cut from above, 200 m north', cam: [-40, 90, -1050], look: [-50, 5, -850], fov: 50 },
      ],
      variants: [{ name: 'Current', look: 'current' }],
    },
  ],
} satisfies ShotList;
