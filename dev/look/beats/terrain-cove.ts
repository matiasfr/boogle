import type { ShotList } from '../shot-types.ts';

const strata: [number, number, number] = [0, 0.18, 0.7];
const slopes: [number, number, number] = [0.6, 0.72, 0.84];

// Authored beach camera interprets the previz composition; it is not a recovered camera solution.
export default {
  question: 'Do smooth sandstone forms, continuous grass edges and soft pigment survive the slope/strata wedge?',
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
        columns: { id: 'cove.slopeThreshold', label: 'Rock slope normal Y', values: slopes },
        legend: 'Current / Neutral · gain 0.12 · bloom off · centre: candidate default, not owner approval',
      },
      variants: strata.flatMap((strength) =>
        slopes.map((threshold) => ({
          name: `Strata ${strength} / slope ${threshold}`,
          look: 'current',
          tunables: { 'cove.strataStrength': strength, 'cove.slopeThreshold': threshold },
          graphics: { resolution: 1, bloom: false },
        })),
      ),
    },
  ],
} satisfies ShotList;
