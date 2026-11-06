import type { ShotList } from '../shot-types.ts';

const gains: [number, number, number] = [0.12, 0.14, 0.16];
const keys: [number, number, number] = [1.12, 0.96, 1.28];
const fills = [3.2, 4, 2.4];
const variants = gains.flatMap((gain) =>
  keys.map((key, i) => ({
    name: `Gain ${gain}; key ${key}; fill ${fills[i]}`,
    look: 'current',
    tunables: {
      'post.centre': gain,
      'sky.keyGain': key,
      'sky.fillGain': fills[i]!,
      'sky.cloudBrightness': 1,
      'sky.lightColourProfile': 0,
    },
    graphics: { resolution: 1, bloom: false },
  })),
);
const wedge = {
  baseline: 1,
  rows: { id: 'post.centre', label: 'Gain', values: gains },
  columns: { id: 'sky.keyGain', label: 'Key', values: keys },
  legend:
    'Neutral · columns: current (fill 3.2), softer (fill 4), stronger (fill 2.4) · gold 1: morning settings, rebuilt today',
};

// Current source only. The reference reproduces the recorded morning settings, not an old build or photograph.
export default {
  question:
    'Does gain or key/fill balance improve dark-doorway readability without washing out sand, charts and the horizon?',
  size: [640, 400],
  beats: [
    {
      name: 'Calibration: Buddy, five materials, grey/chrome, linear/sRGB chart',
      query: 'proto=place&dev=1&shot=pack&fixture=calibration',
      setup: 'dev/look/evals/visual-pipeline.ts',
      warm: 3,
      cameras: [{ name: 'Calibration', anchor: 'player', cam: [0, 5, 12], look: [0, 1, -1], fov: 48 }],
      wedge,
      variants,
      sampleObjects: [
        ...['#000000', '#202020', '#404040', '#808080', '#bcbcbc', '#ffffff', '#c83a2a', '#3f8a3a', '#2868ca'].flatMap(
          (hex) => [`linear RGB ${hex}`, `sRGB texture ${hex}`],
        ),
        ...[0.01, 0.18, 1, 2, 4, 8, 16, 32, 64].map((n) => `HDR ramp ${n}`),
        'compensated 18% ink',
      ],
    },
    {
      name: 'Town: cream, open shade, dark doorway and physical board',
      query: 'proto=place&dev=1&shot=room&in=house&stage=line2',
      setup: 'dev/look/evals/visual-pipeline.ts',
      warm: 3,
      cameras: [
        { name: 'Doorway at play distance', anchor: 'player', cam: [2, 2.5, 4], look: [-10, 1, -1.5], fov: 55 },
      ],
      wedge,
      variants,
    },
    {
      name: 'Shore: sand, waterline, foam, sun lane and horizon',
      query: 'proto=place&dev=1&shot=pack',
      setup: 'dev/look/evals/visual-pipeline.ts',
      warm: 3,
      cameras: [{ name: 'Shore horizon', cam: [884, 8, 151], look: [868, 0, 144], fov: 62 }],
      wedge,
      variants,
    },
  ],
} satisfies ShotList;
