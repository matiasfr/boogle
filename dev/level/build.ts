// Shared provenance for cheap progression reports and opt-in physics packets; no renderer or physics import.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export function sourceBuild() {
  // Conservative invalidation: source, layout fixtures, visual kits or dependency-lock changes invalidate every packet.
  const files = [
    ...fs.globSync('src/**/*'),
    ...fs.globSync('dev/**/*.ts'),
    ...fs.globSync('dev/layouts/*.json'),
    ...fs.globSync('assets/**/*'),
    'package.json',
    'package-lock.json',
  ]
    .filter((file) => fs.statSync(file).isFile())
    .sort();
  const hash = createHash('sha256');
  const dependencies = files.map((file) => {
    const digest = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    hash.update(file).update('\0').update(digest).update('\0');
    return { file, sha256: digest };
  });
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8')) as {
    packages: Record<string, { version?: string }>;
  };
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceHash: hash.digest('hex'),
    physics: lock.packages['node_modules/@dimforge/rapier3d']?.version,
    dependencies,
  };
}
