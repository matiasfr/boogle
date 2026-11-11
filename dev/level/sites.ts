// Every POI's site, in folder order (src/island/index.ts composes them the same way), for the tools that run outside Vite.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Site } from '../../src/island/stamps.ts';

export type IdSite = Site & { id: string };

const poiDir = path.join(import.meta.dirname, '../../src/pois');
const ids = fs
  .readdirSync(poiDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(poiDir, d.name, 'site.ts')))
  .map((d) => d.name)
  .sort();
export const baseSites: IdSite[] = [];
for (const id of ids)
  baseSites.push({ id, ...(await import(pathToFileURL(path.join(poiDir, id, 'site.ts')).href)).default });
