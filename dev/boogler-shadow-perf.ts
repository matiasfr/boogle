// CPU-only measurement, no browser. node dev/boogler-shadow-perf.ts
// Reports process CPU and elapsed time; shared-machine noise and production hardware remain separate.
import { createBooglerShadow } from '../src/world/boogler-shadow.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { loadBooglerLand } from '../server/src/host/land.ts';
import { booglerVisitors } from '../server/src/host/boogler-presence.ts';

const init = performance.now();
const land = loadBooglerLand();
const landLoadMs = performance.now() - init;
const results = [];
for (const rooms of [1, 8, 32]) {
  const brains = Array.from({ length: rooms }, (_, k) => createBooglerShadow(land, mulberry32(123 + k), 0));
  const run = (start: number, count: number) => {
    for (let t = start; t < start + count; t++)
      for (const brain of brains) {
        const p = brain.snapshot();
        const phase = Math.floor(t / 100) % 4;
        brain.step(
          t,
          booglerVisitors(
            [
              { x: p.x + 2, z: p.z, at: t, act: phase === 1 ? 1 : 0, wary: phase === 2 ? 1 : 0 },
              { x: phase === 3 ? p.x : 900, z: p.z, at: t, act: phase === 3 ? 2 : 0 },
            ],
            t,
          ),
        );
      }
  };
  run(1, 1000);
  const cpu = process.cpuUsage(),
    start = performance.now();
  run(1001, 20000);
  const elapsedMs = performance.now() - start,
    used = process.cpuUsage(cpu);
  const ticks = 20000 * rooms,
    cpuMs = (used.user + used.system) / 1000;
  results.push({
    rooms,
    ticks,
    cpuMs,
    elapsedMs,
    cpuUsPerTick: (cpuMs * 1000) / ticks,
    cpuMsPerRoomSecond: (cpuMs / ticks) * 10,
    cpuMsPerSecondAllRooms: (cpuMs / ticks) * 10 * rooms,
  });
}
console.log(JSON.stringify({ landLoadMs, results }, null, 2));
