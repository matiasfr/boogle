// The suites as data (docs/plans/remote-device-tests.md, "What runs on the device"). A scene is one of the bench's named
// poses (src/debug/perf-poses.ts), measured after a settle window. `quick`: the six poses and a heat check, `spawn`
// again at the end, so the drift of p50 between the two shows the device warming. Local, debug only.
import type { PoseName } from '../perf-poses.ts';
import type { SuiteName } from './id.ts';

export type SceneDef = { name: string; pose: PoseName };
export type Suite = { label: string; settleS: number; sampleS: number; scenes: SceneDef[] };

export const SUITES: Record<SuiteName, Suite> = {
  quick: {
    label: 'Quick',
    settleS: 2,
    sampleS: 5,
    scenes: [
      { name: 'spawn', pose: 'spawn' },
      { name: 'town', pose: 'town' },
      { name: 'forge', pose: 'forge' },
      { name: 'bay', pose: 'bay' },
      { name: 'pier', pose: 'pier' },
      { name: 'head', pose: 'head' },
      { name: 'heat', pose: 'spawn' },
    ],
  },
};
