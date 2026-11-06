import type { ShotList } from '../shot-types.ts';

const irregularities: [number, number, number] = [0, 0.6, 1];
const colours: [number, number, number] = [2, 3, 4];

// Authored beach camera interprets the previz composition; it is not a recovered camera solution.
export default {
  question: 'Do unequal beds and related sediment tones read naturally on steep faces beside crisp turf and wet sand?',
  size: [640, 400],
  beats: [
    {
      name: 'Cove sandstone — authored beach fixture',
      query: 'proto=place&dev=1&coveShot=previz',
      setup: 'dev/look/evals/terrain-cove.ts',
      warm: 3,
      cameras: [{ name: 'Previz beach interpretation', cam: [775, 6, 16], look: [806, 3, 43], fov: 62 }],
      wedge: {
        rows: { id: 'cove.bandIrregularity', label: 'Bed irregularity', values: irregularities },
        columns: { id: 'cove.bandColourCount', label: 'Sediment tones', values: colours },
        legend: 'Current / Neutral · gain 0.12 · bloom off · centre: candidate default, not owner approval',
      },
      variants: irregularities.flatMap((irregularity) =>
        colours.map((count) => ({
          name: `Irregularity ${irregularity} / tones ${count}`,
          look: 'current',
          tunables: { 'cove.bandIrregularity': irregularity, 'cove.bandColourCount': count },
          graphics: { resolution: 1, bloom: false },
        })),
      ),
    },
  ],
} satisfies ShotList;
