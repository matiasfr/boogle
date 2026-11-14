// Typed authoring runs only here. The browser reads the committed, validated JSON.
import fs from 'node:fs';
import { assertAuthoredNumbers } from './authored.ts';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile, writeArtifacts } from './compiler.ts';
import { names } from '../../src/prefab/names.ts';
import type { LevelDef, PrefabDef } from '../../src/prefab/types.ts';
import { readManifest } from '../assets/manifest.ts';

const root = path.resolve(import.meta.dirname, '../..');
const prefabs: PrefabDef[] = [],
  levels: LevelDef[] = [];
for (const file of fs.globSync('src/content/{prefabs,levels}/*.ts', { cwd: root }).sort()) {
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
assertAuthoredNumbers({ prefabs, levels }, 'authored content');
const outputs = compile(prefabs, levels, { ...names, assets: readManifest() });
const check = process.argv.includes('--check');
writeArtifacts(outputs, path.join(root, 'content/built'), check);
console.log(
  `prefabs: ${prefabs.length} records, ${levels.length} levels, ${[...outputs.values()].reduce((n, s) => n + Buffer.byteLength(s), 0)} bytes${check ? ', fresh' : ''}`,
);
