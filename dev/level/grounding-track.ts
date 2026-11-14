// Audit the actual settled buildTrack boxes, stopping before scene/physics construction.
import * as THREE from 'three/webgpu';
import { boxAt, place, type Box } from '../../src/render/box-plan.ts';
import { FORMATION, LINKS, ORIGIN, STUB, UP_LAT, crossLat, lineAt, railY, upLat } from '../../src/place/layout.ts';
import { H, surfaceHeight } from '../../src/place/terrain.ts';
import { sampleFootprint } from '../../src/place/support.ts';
import { carriedPiece, sleeperStations, trackPanels } from '../../src/entities/railway/track-panels.ts';
import { chunkOf } from '../../src/entities/railway/track-chunks.ts';
import { sourceFunction } from './source.ts';

// The sources are stubbed past the boxes, so the owner is never asked for anything.
const noOwner = {} as import('../../src/render/owned-view.ts').OwnedView;

/** Every settled track box of both lines, panelled and continuous, as the game's own buildTrack makes them. */
export function trackBoxes() {
  const file = 'src/entities/railway/track.ts';
  const P = { x: 0, z: 0, ux: 0, uz: 1 };
  const lateral = sourceFunction('src/entities/railway/line-geometry.ts', 'lateral', { P, ORIGIN });
  const complete = new Error('Track geometry captured');
  const captured: { boxes: Box[]; kinds: string[] }[] = [];
  const buildTrack = sourceFunction<typeof import('../../src/entities/railway/rail-kit.ts').buildTrack>(
    file,
    'buildTrack',
    {
      THREE,
      P,
      lateral,
      STUB,
      lineAt,
      railY,
      H,
      place,
      trackPanels,
      carriedPiece,
      sleeperStations,
      chunkOf,
      TOP: sourceFunction<number>(file, 'TOP', {}),
      DECK_W: sourceFunction<number>(file, 'DECK_W', {}),
      BED_W: sourceFunction<number>(file, 'BED_W', {}),
      FORMATION,
      UP_LAT,
      upLat,
      crossLat,
      box: sourceFunction('src/render/boxes.ts', 'box', { boxAt, groundHeight: H }),
      dropSet: (boxes: Box[]) => boxes,
      lookTrack: (boxes: Box[], kinds: string[]) => {
        captured.push({ boxes, kinds });
        throw complete;
      },
    },
  );
  return LINKS.flatMap((spec) =>
    (['panels', 'continuous'] as const).map((mode) => {
      try {
        buildTrack(spec, () => {}, noOwner, mode);
      } catch (error) {
        if (error !== complete) throw error;
      }
      const track = captured.pop();
      if (!track || track.boxes.length !== track.kinds.length) throw new Error(`${spec.id}: missing track geometry`);
      for (const kind of ['sleeper', 'rail'])
        if (!track.kinds.includes(kind)) throw new Error(`${spec.id}: missing ${kind} geometry`);
      return { spec, mode, boxes: track.boxes, kinds: track.kinds };
    }),
  );
}

export function checkTrackGrounding() {
  return trackBoxes().flatMap(({ spec, mode, boxes, kinds }) =>
    boxes.flatMap((box, k) => {
      const kind = kinds[k]!;
      if (kind !== 'sleeper' && kind !== 'plank' && kind !== 'rail') return [];
      // Sleepers/deck tops and rail undersides define the bed. Respect both yaw and grade;
      // comparing only the highest corner would miss terrain at the low end of a tilted piece.
      const face = kind === 'rail' ? 0 : 1;
      const corners = [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ].map(([x, z]) =>
        new THREE.Vector3(x!, face, z!).applyMatrix4(box.local).add(new THREE.Vector3(box.x, box.y, box.z)),
      );
      const a = corners[0]!;
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(box.local);
      if (normal.y <= 0) throw new Error(`${spec.id}/${k}: invalid track bed normal`);
      let groundMin = Infinity,
        groundMax = -Infinity;
      let worst = { x: a.x, z: a.z, terrain: -Infinity, bed: a.y, excess: -Infinity };
      const samples = sampleFootprint(
        corners.map((p) => [p.x, p.z]),
        (x, z) => {
          const terrain = surfaceHeight(x, z);
          const bed = a.y - (normal.x * (x - a.x) + normal.z * (z - a.z)) / normal.y;
          const excess = terrain - bed;
          groundMin = Math.min(groundMin, terrain);
          groundMax = Math.max(groundMax, terrain);
          if (excess > worst.excess) worst = { x, z, terrain, bed, excess };
          return excess;
        },
      );
      const sinkCm = Math.max(0, samples.high * 100);
      return [
        {
          id: `track/${spec.id}/${mode}/${kind}/${k}`,
          x: box.x,
          z: box.z,
          base: Math.min(...corners.map((p) => p.y)),
          top: Math.max(...corners.map((p) => p.y)),
          groundMin,
          groundMax,
          samples: samples.samples,
          gapCm: 0,
          sinkCm,
          failed: sinkCm > 5,
          worst,
        },
      ];
    }),
  );
}
