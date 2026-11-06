import type { ShotList } from '../shot-types.ts';
import pipeline from './visual-pipeline.ts';

const brightness: [number, number, number] = [1, 0.8, 0.6];
const profiles: [number, number, number] = [0, 1, 2];
const wedge = {
  baseline: 5,
  rows: { id: 'sky.cloudBrightness', label: 'Cloud radiance', values: brightness },
  columns: { id: 'sky.lightColourProfile', label: 'Light profile', values: profiles },
  legend:
    '0 original / 1 neutral / 2 slightly cool · Neutral gain .12 · gold 5: owner choice 6 Nov · cell 1: morning reference',
};
const variants = brightness.flatMap((cloud) =>
  profiles.map((profile) => ({
    name: `Cloud ${cloud}; light profile ${profile}`,
    look: 'current',
    tunables: {
      'post.centre': 0.12,
      'sky.keyGain': 1.12,
      'sky.fillGain': 3.2,
      'sky.cloudBrightness': cloud,
      'sky.lightColourProfile': profile,
    },
    graphics: { resolution: 1, bloom: false },
  })),
);
export default {
  question:
    'Do reduced cloud radiance and neutral/cool lighting remove the bright-cloud and warm-cast complaint while keeping spawn and town readable?',
  size: [640, 400],
  beats: [
    {
      name: 'Spawn: real first gameplay view after Jump in',
      query: 'proto=place&intro=1&dev=1',
      setup: 'dev/look/evals/spawn-view.ts',
      warm: 0,
      cameras: [
        { name: 'First settled gameplay camera', snapshot: 'spawnGameplayCamera', cam: [0, 0, 0], look: [0, 0, -1] },
        {
          name: 'Supplemental upward glance at spawn — not the first gameplay framing',
          snapshot: 'spawnSkyCamera',
          cam: [0, 0, 0],
          look: [0, 0, -1],
        },
      ],
      wedge,
      variants,
    },
    { ...pipeline.beats[1]!, name: 'Town doorway: cloud brightness and light warmth', wedge, variants },
  ],
} satisfies ShotList;
