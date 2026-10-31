// The land the lockstep rules run on in Node tests: the grid size and the gifts layout pinned in
// test/fixtures/world-inputs.json, which dev/scenarios/world-inputs.mjs checks against the running game.
import fs from 'node:fs';

export const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/world-inputs.json', import.meta.url), 'utf8'));

// Built once per process; treat it as read-only.
let home = null;
export function homeLand() {
  home ??= { n: fixture.n, layout: fixture.layout };
  return home;
}
