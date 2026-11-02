// The land the server's world runs on (docs/plans/server-host.md, "Land on the server"): src/world/home-land.json,
// pinned by dev/scenarios/world-inputs.ts in the running game. The rules need only { n, layout }.
//
//   const { land } = loadHomeLand()
import fs from 'node:fs';

const HOME_LAND = new URL('../../../src/world/home-land.json', import.meta.url);

export type HomeLand = { land: { n: number; layout: Record<string, unknown> } };

export function loadHomeLand(file: URL | string = HOME_LAND): HomeLand {
  const { n, layout } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { land: { n, layout } };
}
