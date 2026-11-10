// The whole network's rail map (docs/world/rail-map.html, docs/plans/rail-map.md) is current with the data it draws:
// Place's rails, the sim catalog, Ring Island's layout and the blockout's future lines.
import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('the rail map is current with the rail data', () => {
  // The generator reads Place's layout and terrain, which need the dev hooks, so it runs in its own process.
  execFileSync(process.execPath, ['--import', './dev/sim/hooks.ts', 'dev/level/rail-map.ts', '--check'], {
    stdio: 'pipe',
  });
});
