// Copy a committed comparison backend and an installed package into this checkout; never execute another worktree.
// node dev/spikes/becsy-model/prepare-reference.ts <commit> <installed-bitecs-directory>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [ref, packageDir] = process.argv.slice(2);
if (!ref || !packageDir) throw new Error('usage: prepare-reference.ts <commit> <installed-bitecs-directory>');
const commit = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
const pkg = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};
if (pkg.name !== 'bitecs' || pkg.version !== '0.4.0') throw new Error('expected the pinned bitECS 0.4.0 package');
const out = path.resolve('.look/becsy-model/reference');
fs.mkdirSync(out, { recursive: true });
for (const file of ['world.ts', 'schema.ts', 'bitecs.ts']) {
  const source = execFileSync('git', ['show', `${commit}:src/ecs/${file}`], { encoding: 'utf8' });
  fs.writeFileSync(path.join(out, file), source);
}
fs.cpSync(packageDir, path.join(out, 'node_modules/bitecs'), { recursive: true });
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
fs.writeFileSync(
  path.join(out, 'provenance.json'),
  JSON.stringify({ commit, package: pkg.name, version: pkg.version }, null, 2),
);
console.log(`Prepared ${commit}, bitECS ${pkg.version} in ${out}`);
