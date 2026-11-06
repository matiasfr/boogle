import type { ShotList } from '../shot-types.ts';

const strata: [number, number, number] = [0.35, 0.6, 0.9];
const widths: [number, number, number] = [0.3, 0.5, 0.7];

// Authored beach camera interprets the previz composition; it is not a recovered camera solution.
export default {
  question: 'Do broad orange/ochre beds read as sandstone while the rounded toe and grass cap stay coherent?',
  size: [640, 400],
  beats: [
    {
      name: 'Cove sandstone — authored beach fixture',
      query: 'proto=place&terrain=cove&dev=1&coveShot=previz',
      setup: 'dev/look/evals/terrain-cove.ts',
      warm: 3,
      cameras: [{ name: 'Previz beach interpretation', cam: [775, 6, 16], look: [806, 3, 43], fov: 62 }],
      wedge: {
        rows: { id: 'cove.strataStrength', label: 'Strata', values: strata },
        columns: { id: 'cove.bandWidth', label: 'Ochre band fraction', values: widths },
        legend: 'Current / Neutral · gain 0.12 · bloom off · centre: candidate default, not owner approval',
      },
      variants: strata.flatMap((strength) =>
        widths.map((width) => ({
          name: `Strata ${strength} / band width ${width}`,
          look: 'current',
          tunables: { 'cove.strataStrength': strength, 'cove.bandWidth': width },
          graphics: { resolution: 1, bloom: false },
        })),
      ),
    },
  ],
} satisfies ShotList;
