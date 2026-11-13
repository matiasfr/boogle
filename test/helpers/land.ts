// The static land used by Node tests and the server, checked against the running game by world-inputs.
import fs from 'node:fs';
import type { Land } from '../../src/world/rules/types.ts';

const landFile = JSON.parse(fs.readFileSync(new URL('../../src/world/home-land.json', import.meta.url), 'utf8'));

// Built once per process; treat it as read-only.
let home: Land | null = null;
export function homeLand() {
  home ??= { n: landFile.n, layout: landFile.layout };
  return home;
}
