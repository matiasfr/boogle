import fs from 'node:fs';
import path from 'node:path';
import { metadata, type LevelDef, type PrefabDef } from '../../src/prefab/types.ts';
import { names, type NameRegistry } from '../../src/prefab/names.ts';
import { validateArtifact, validateLevelArtifact } from '../../src/prefab/validate.ts';

/** Canonical portable bytes: sorted keys, authored array order, lossless JSON number representations.
 * Decimal quantization can turn accepted rotations or compensating scales into shear. Retaining the full
 * finite JS number makes serialization error zero for every scale ratio the validator supports.
 */
export function canonical(value: unknown): string {
  const sorted = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sorted);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, n]) => [k, sorted(n)]),
      );
    return v;
  };
  return JSON.stringify(sorted(value), null, 2) + '\n';
}
export function compile(prefabs: readonly PrefabDef[], levels: readonly LevelDef[], registry: NameRegistry = names) {
  const records: Record<string, PrefabDef> = {};
  for (const prefab of prefabs) {
    if (Object.hasOwn(records, prefab.key)) throw new Error(`duplicate prefab ${prefab.key}`);
    records[prefab.key] = prefab;
  }
  const artifact = { ...metadata, format: 'boogle-prefabs', prefabs: records };
  validateArtifact(artifact, registry);
  const outputs = new Map<string, string>([['prefabs.json', canonical(artifact)]]);
  // Verify the actual bytes the runtime will load, including all record and level references.
  const serialized: unknown = JSON.parse(outputs.get('prefabs.json')!);
  validateArtifact(serialized, registry);
  for (const level of levels) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(level.place)) throw new Error('unsafe level name');
    const file = `levels/${level.place}.json`;
    if (outputs.has(file)) throw new Error(`duplicate level ${level.place}`);
    const artifact = { ...metadata, format: 'boogle-level', ...level };
    validateLevelArtifact(artifact, records);
    const bytes = canonical(artifact);
    validateLevelArtifact(JSON.parse(bytes), serialized.prefabs);
    outputs.set(file, bytes);
  }
  return outputs;
}
export function writeArtifacts(outputs: ReadonlyMap<string, string>, directory: string, check: boolean) {
  const existing = fs.existsSync(directory) ? fs.globSync('**/*.json', { cwd: directory }) : [];
  for (const file of existing) {
    if (outputs.has(file)) continue;
    if (check) throw new Error(`stale prefab artifact ${file}`);
    fs.unlinkSync(path.join(directory, file));
  }
  for (const [file, bytes] of outputs) {
    const target = path.join(directory, file);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== bytes)
        throw new Error(`prefab artifact differs: ${file}; run npm run prefabs`);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    }
  }
}
