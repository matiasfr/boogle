// Typed authoring runs only here. The browser reads the committed, validated JSON.
import fs from 'node:fs';
import { assertAuthoredNumbers } from './authored.ts';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonical, compile, writeArtifacts } from './compiler.ts';
import { names } from '../../src/prefab/names.ts';
import type { LevelDef, PrefabDef } from '../../src/prefab/types.ts';
import { haltKitContent } from './halts.ts';
import { rotundaContent } from './rotunda.ts';
import { cliffKitContent } from './cliff-kit.ts';

const root = path.resolve(import.meta.dirname, '../..');
const prefabs: PrefabDef[] = [],
  levels: LevelDef[] = [];
// Forward slashes on Windows too (globSync joins with path.sep), so the prefabs/levels split below matches.
const sources = fs.globSync('src/content/{prefabs,levels}/*.ts', { cwd: root }).map((f) => f.split(path.sep).join('/'));
for (const file of sources.sort()) {
  const source = (await import(pathToFileURL(path.join(root, file)).href)) as {
    prefabs?: PrefabDef[];
    levels?: LevelDef[];
  };
  if (file.startsWith('src/content/prefabs/')) {
    if (!Array.isArray(source.prefabs)) throw new Error(`${file}: export prefabs array`);
    prefabs.push(...source.prefabs);
  } else {
    if (!Array.isArray(source.levels)) throw new Error(`${file}: export levels array`);
    levels.push(...source.levels);
  }
}
const halts = haltKitContent();
levels.push(...halts.levels);
levels.push(...rotundaContent().levels);
levels.push(...cliffKitContent().levels);
assertAuthoredNumbers({ prefabs, levels }, 'authored content');
const outputs = compile(prefabs, levels, names);
const check = process.argv.includes('--check');
writeArtifacts(outputs, path.join(root, 'content/built'), check);
console.log(
  `prefabs: ${prefabs.length} records, ${levels.length} levels, ${[...outputs.values()].reduce((n, s) => n + Buffer.byteLength(s), 0)} bytes${check ? ', fresh' : ''}`,
);
const areas = new Map<string, { records: number; bytes: number }>();
const artifact = JSON.parse(outputs.get('prefabs.json')!) as { prefabs: Record<string, PrefabDef> };
for (const def of Object.values(artifact.prefabs)) {
  const area = def.key.startsWith('railway.halt-') ? 'halts' : def.key.split('.')[0]!;
  const total = areas.get(area) ?? { records: 0, bytes: 0 };
  total.records++;
  total.bytes += Buffer.byteLength(canonical(def));
  areas.set(area, total);
}
for (const [area, total] of [...areas].sort())
  console.log(`area ${area}: ${total.records} records, ${total.bytes} definition bytes (standalone canonical records)`);
