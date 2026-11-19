// Review inventory: count production track/yard operands without creating a renderer.
// node --import ./dev/sim/hooks.ts dev/level/rider-coach-pools.ts
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { trackBoxes } from './grounding-track.ts';
import { sourceModule, sourceFunction } from './source.ts';
import * as home from '../../src/place/home-station.ts';
import * as layout from '../../src/place/layout.ts';
import * as turnout from '../../src/place/turnout.ts';
import * as shape from '../../src/entities/railway/works-shape.ts';
import { bayFrame } from '../../src/place/rotunda.ts';
import { junctions, spanAcross } from '../../src/place/junctions.ts';
import { sleeperStations } from '../../src/entities/railway/track-panels.ts';
import { H } from '../../src/place/terrain.ts';
import { TREE_SOURCES } from '../../src/place/tree-sources.ts';
// Only add a read accessor to the real collector; never invoke its deferred renderer imports.
const yardSource = fs
  .readFileSync('src/entities/railway/yard-track.ts', 'utf8')
  .replace('    sleeper,', '    blobCount: () => blobs.length,\n    sleeper,');
const { createYardTrack } = sourceModule<{ createYardTrack: unknown }>(yardSource, { THREE, ...shape });
const { layHomeYard } = sourceModule<{ layHomeYard: (ground: typeof H) => { blobCount: () => number } }>(
  fs.readFileSync('src/entities/railway/home-yard.ts', 'utf8'),
  { home, ...layout, ...turnout, bayFrame, junctions, spanAcross, sleeperStations, ...shape, createYardTrack },
);
const sleepers = trackBoxes()
  .filter((t) => t.mode === 'panels')
  .map((t) => ({ line: t.spec.id, count: t.kinds.filter((k) => k === 'sleeper').length }));
const yard = layHomeYard(H).blobCount();
// Sources installs a tree blob, and view.ts installContact repeats standing trees. Count every source twice
// even if it has been cleared. Every station has frame and feeder blobs. Only the track layer has car blobs.
const trees = TREE_SOURCES.length * 2,
  stations = layout.LINKS.reduce((n, l) => n + l.stations.length * 2, 0),
  machines = 2;
console.log(
  JSON.stringify(
    {
      sleepers,
      yard,
      trees,
      stations,
      machines,
      blobUpperBound: sleepers.reduce((n, s) => n + s.count, 0) + yard + trees + stations + machines,
      capacity: sourceFunction<number>('src/place/look.ts', 'BLOBS', {}),
      coachIncrement: 0,
    },
    null,
    2,
  ),
);
