// The land the server's world runs on (docs/plans/server-host.md, "Land on the server"): src/world/home-land.json,
// pinned by dev/scenarios/world-inputs.mjs in the running game. The rules need only { n, layout }; the plant mask
// stands in for the browser's canPlantAt (src/adapters/mushroom-garden.js), which reads the rendered terrain.
//
//   const { land, canPlantAt } = loadHomeLand()
//   decodeRuns(runs, size)   run lengths, alternating and starting with "off", as one byte per cell
import fs from 'node:fs';

const HOME_LAND = new URL('../../../src/world/home-land.json', import.meta.url);

export type HomeLand = {
  land: { n: number; layout: Record<string, unknown> };
  canPlantAt: (i: number, j: number) => boolean;
};

export function decodeRuns(runs: number[], size: number) {
  const cells = new Uint8Array(size);
  let g = 0;
  runs.forEach((run, k) => {
    if (k % 2) cells.fill(1, g, Math.min(size, g + run));
    g += run;
  });
  if (g !== size) throw new Error(`plant mask covers ${g} cells, the grid has ${size}`);
  return cells;
}

export function loadHomeLand(file: URL | string = HOME_LAND): HomeLand {
  const { n, layout, plant } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const mask = decodeRuns(plant, n * n);
  return {
    land: { n, layout },
    canPlantAt: (i, j) =>
      Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < n && j < n && mask[i * n + j] === 1,
  };
}
