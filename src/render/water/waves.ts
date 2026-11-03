// Contract shared by the FFT renderer and the demo's retained analytic diagnostic.
import type { N } from './tsl.ts';
export type WaveSource = {
  displace(xz: N, cell: N, damp: N): N;
  shade(xz: N, footprint: N, damp: N): { slope: N; variance: N; unresolved: N; whitecap: N };
  update(time: number): void;
  dispose?(): void;
};
