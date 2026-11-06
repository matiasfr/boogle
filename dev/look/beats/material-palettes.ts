import type { ShotBeat, ShotList, ShotVariant } from '../shot-types.ts';
import pipeline from './visual-pipeline.ts';
import clouds from './cloud-warmth.ts';
import { MATERIAL_FAMILIES, PALETTE_NAMES } from '../../../src/render/material-palette-tuning.ts';

const variants: ShotVariant[] = [0, 2].flatMap((mode) =>
  PALETTE_NAMES.map((name, choice) => ({
    name: `${choice} ${name} / ${mode ? 'RAW base colour (view=raw)' : 'LIT Current/Neutral'}`,
    look: 'current',
    tunables: {
      ...Object.fromEntries(MATERIAL_FAMILIES.map((family) => [`material.${family}`, choice])),
      'view.mode': mode,
      'view.sky': 1,
      'view.water': 1,
      'post.centre': 0.12,
      'sky.keyGain': 1.12,
      'sky.fillGain': 3.2,
      'sky.cloudBrightness': 0.8,
      'sky.lightColourProfile': 1,
    },
    graphics: { resolution: 1, bloom: false },
  })),
);
export default {
  question:
    'Which family pigments remove the yellow/orange cast while keeping grass, paths, timber, cliffs, walls and roofs distinct in lit and raw views?',
  size: [800, 500],
  beats: (
    [
      {
        ...pipeline.beats[0]!,
        name: 'Material calibration — front row: grass, sand/path, timber, stone/cliff, cream, roof',
        query: 'proto=place&dev=1&shot=pack&fixture=material-calibration',
        cameras: [
          {
            name: 'Buddy, reference presets/charts and six family anchors',
            anchor: 'player',
            cam: [0, 8, 17],
            look: [0, 1, 0],
            fov: 48,
          },
        ],
      },
      pipeline.beats[1]!,
      pipeline.beats[2]!,
      { ...clouds.beats[0]!, cameras: [clouds.beats[0]!.cameras[0]!] },
    ] satisfies ShotBeat[]
  ).map((beat) => ({
    ...beat,
    wedge: undefined,
    grid: {
      rows: ['Lit', 'Raw base colour'],
      columns: PALETTE_NAMES.map((name, choice) => `${choice} ${name}`),
      baseline: 1,
      legend:
        'Lighting fixed: cloud .8 / neutral · gain .12 · key 1.12 / fill 3.2 · each family is independently selectable',
    },
    variants,
  })),
} satisfies ShotList;
