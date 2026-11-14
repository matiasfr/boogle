import fs from 'node:fs';
import path from 'node:path';
import { metadata, type Json, type JsonObject, type LevelDef, type PrefabDef } from '../../src/prefab/types.ts';
import { names, type NameRegistry } from '../../src/prefab/names.ts';
import { loadPrefabArtifact, validateLevelArtifact } from '../../src/prefab/validate.ts';

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
/** Keep generated placement rows compact, but retain readable object/recipe diffs elsewhere. */
function artifactBytes(value: unknown): string {
  return canonical(value).replace(
    /("placements": \[)\n([\s\S]*?)\n( {2}\])/g,
    (_match, start: string, _rows: string, end: string) => {
      const placements = (value as { placements: unknown[] }).placements;
      return `${start}\n${placements.map((p) => '    ' + JSON.stringify(JSON.parse(canonical(p)))).join(',\n')}\n${end}`;
    },
  );
}

/** Intern repeated frames, not evaluated coordinates. Definitions remain authored expression trees. */
function shareOperands(layout: JsonObject): JsonObject {
  const counts = new Map<string, number>();
  const walk = (value: Json, count: boolean): Json => {
    if (Array.isArray(value)) return value.map((v) => walk(v, count));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => {
        if ((key === 'frame' || key === 'basis') && v && typeof v === 'object') {
          const identity = canonical(v);
          if (count) counts.set(identity, (counts.get(identity) ?? 0) + 1);
          else if ((counts.get(identity) ?? 0) > 1) {
            let index = identities.indexOf(identity);
            if (index < 0) {
              index = identities.length;
              identities.push(identity);
              operands.push(v);
            }
            return [key, { operand: index }];
          }
        }
        return [key, walk(v, count)];
      }),
    );
  };
  const identities: string[] = [],
    operands: Json[] = [];
  walk(layout, true);
  const input =
    layout.kind === 'gorge' && Array.isArray(layout.boxes)
      ? {
          ...layout,
          boxes: layout.boxes.map((box) => {
            if (!box || typeof box !== 'object' || Array.isArray(box) || box.solid !== true) return box;
            const rest = { ...box };
            delete rest.solid;
            return rest;
          }),
        }
      : layout;
  const body = walk(input, false) as JsonObject;
  return operands.length ? { ...body, operands } : body;
}

export function compile(prefabs: readonly PrefabDef[], levels: readonly LevelDef[], registry: NameRegistry = names) {
  const records: Record<string, PrefabDef> = {};
  for (const prefab of prefabs) {
    if (Object.hasOwn(records, prefab.key)) throw new Error(`duplicate prefab ${prefab.key}`);
    // A shell's visual spec also owns its hull dimensions. Keep the authored input API unchanged.
    const layout = prefab.layout;
    const source =
      layout?.kind === 'room-hull'
        ? prefabs.find((p) => p.key === prefab.key.replace(/-(?:hulls|poles)-\d+$/, '-shell'))
        : undefined;
    if (source && 'builder' in source.visual) {
      const spec = source.visual.params.spec as JsonObject;
      const dimensions = ['w', 'd', 'high', 'rise'];
      if (!dimensions.every((key) => layout![key] === spec[key]))
        throw new Error(`room dimensions differ from shell: ${prefab.key}`);
      records[prefab.key] = {
        ...prefab,
        layout: {
          ...Object.fromEntries(Object.entries(layout!).filter(([key]) => !dimensions.includes(key))),
          source: source.key,
        },
      };
    } else records[prefab.key] = prefab;
  }
  const artifact = { ...metadata, format: 'boogle-prefabs', prefabs: records };
  const resolved = loadPrefabArtifact(artifact, registry);
  const outputs = new Map<string, string>([['prefabs.json', canonical(artifact)]]);
  // Verify the actual bytes the runtime will load, including all record and level references.
  const serialized = loadPrefabArtifact(JSON.parse(outputs.get('prefabs.json')!), registry);
  for (const level of levels) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(level.place)) throw new Error('unsafe level name');
    const file = `levels/${level.place}.json`;
    if (outputs.has(file)) throw new Error(`duplicate level ${level.place}`);
    const artifact = { ...metadata, format: 'boogle-level', ...level };
    validateLevelArtifact(artifact, resolved.prefabs);
    const bytes = artifactBytes(level.layout ? { ...artifact, layout: shareOperands(level.layout) } : artifact);
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
