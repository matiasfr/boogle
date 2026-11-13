// Scaffold data only; implementations register names explicitly at the runtime door.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const key = process.argv[2];
if (!key || !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(key)) throw new Error('Usage: npm run prefab:new -- area.name');
const [area, name] = key.split('.');
const file = path.resolve('src/content/prefabs', `${area}-${name}.ts`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(
  file,
  `import { definePrefab } from '../../prefab/types.ts';\nexport const prefabs = [definePrefab({ key: '${key}', visual: { none: true }, colliders: [], scope: 'owner' })];\n`,
  { flag: 'wx' },
);
const level = path.resolve('src/content/levels', `${area}-${name}.ts`);
fs.mkdirSync(path.dirname(level), { recursive: true });
fs.writeFileSync(
  level,
  `import { defineLevel } from '../../prefab/types.ts';\nexport const levels = [defineLevel({ place: '${area}-${name}', placements: [{ id: '${key}', prefab: '${key}', pos: [0, 0, 0] }] })];\n`,
  { flag: 'wx' },
);
execFileSync(process.execPath, ['dev/prefab/build.ts'], { stdio: 'inherit' });
