// The land the lockstep rules run on in Node tests (and on the server): the grid size and the gifts layout in
// src/world/home-land.json, which dev/scenarios/world-inputs.ts checks against the running game. The state and op
// order stay in test/fixtures/world-inputs.json.
import fs from 'node:fs';
import type { Land } from '../../src/world/rules/types.ts';

export const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/world-inputs.json', import.meta.url), 'utf8'));
export const landFile = JSON.parse(fs.readFileSync(new URL('../../src/world/home-land.json', import.meta.url), 'utf8'));

// Built once per process; treat it as read-only.
let home: Land | null = null;
export function homeLand() {
  home ??= { n: landFile.n, layout: landFile.layout };
  return home;
}
