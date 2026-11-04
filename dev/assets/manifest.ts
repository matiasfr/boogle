// Shared build facts. Importing this module never builds an asset or starts a browser/game.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const SRC = path.join(ROOT, 'assets/src');
export const OUT = path.join(ROOT, 'assets/built');
export const MANIFEST = path.join(OUT, 'manifest.json');
/** Download budgets, not resident GPU budgets. A sidecar may override the per-asset limit. */
export const BUDGET = { assetKB: 1024, totalKB: 12 * 1024, maxTexture: 1024 };
export const SMALL_TEXTURE = 256;
export type Sidecar = {
  maxTexture?: number;
  simplify?: number;
  budgetKB?: number;
  expectedClips?: string[];
};
export type Entry = {
  source: string;
  sourceHash: string;
  outHash: string;
  rawBytes: number;
  bytes: number;
  triangles: number;
  animations: string[];
  textures: { name: string; size: [number, number]; mime: string }[];
};
export type Manifest = Record<string, Entry>;
const SOURCE_EXT = ['.py', '.blend', '.glb', '.gltf'];
export const sha = (buf: Buffer | string) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
export const kb = (n: number) => (n / 1024).toFixed(1) + ' KB';

export function sources(dir = SRC) {
  return fs
    .readdirSync(dir)
    .filter((f) => SOURCE_EXT.includes(path.extname(f)))
    .map((f) => ({ name: path.basename(f, path.extname(f)), file: f }));
}
export function sidecar(name: string, dir = SRC): Sidecar {
  const p = path.join(dir, name + '.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}
/** Same source-plus-sidecar byte hash used by the build and freshness check. */
export function sourceHash(file: string, name: string, dir = SRC) {
  const side = path.join(dir, name + '.json');
  return sha(
    Buffer.concat([
      fs.readFileSync(path.join(dir, file)),
      fs.existsSync(side) ? fs.readFileSync(side) : Buffer.alloc(0),
    ]),
  );
}
export function readManifest(file = MANIFEST): Manifest {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

export type AssetHealth = Entry & {
  id: string;
  available: boolean;
  budgetKB: number;
  flags: string[];
  parts: { name: string; triangles: number }[];
};
/** Named mesh-bearing nodes, derived from the actual built GLB, not a second kit list. */
function outputParts(bytes: Buffer) {
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12))) as {
    nodes?: { name?: string; mesh?: number; children?: number[] }[];
    meshes?: { primitives: { indices?: number; attributes: { POSITION?: number }; mode?: number }[] }[];
    accessors?: { count: number }[];
  };
  const count = (index: number): number => {
    const node = json.nodes?.[index];
    if (!node) return 0;
    const mesh = node.mesh === undefined ? undefined : json.meshes?.[node.mesh];
    return (
      (mesh?.primitives.reduce(
        (n, p) =>
          n + ((p.mode ?? 4) === 4 ? (json.accessors?.[p.indices ?? p.attributes.POSITION ?? -1]?.count ?? 0) / 3 : 0),
        0,
      ) ?? 0) + (node.children ?? []).reduce((n, child) => n + count(child), 0)
    );
  };
  return (json.nodes ?? []).flatMap((node, index) =>
    node.name && count(index) > 0 ? [{ name: node.name, triangles: count(index) }] : [],
  );
}
/** Read the GLB JSON chunk; clip names need neither Blender nor mesh/texture decoding. */
function outputClips(bytes: Buffer): string[] {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(16) !== 0x4e4f534a)
    throw new Error('invalid GLB JSON header');
  const end = 20 + bytes.readUInt32LE(12);
  if (end > bytes.length) throw new Error('truncated GLB JSON chunk');
  const json = JSON.parse(bytes.toString('utf8', 20, end)) as { animations?: { name?: string }[] };
  return (json.animations ?? []).map((clip) => clip.name ?? '');
}
/** A serve/build-time snapshot: no remote requests, source mutation, or encoder invocation. */
export function assetHealth(expected: Record<string, readonly string[]> = {}): AssetHealth[] {
  return Object.entries(readManifest()).map(([id, entry]) => {
    const flags: string[] = [];
    let options: Sidecar = {};
    try {
      options = sidecar(id);
    } catch {
      flags.push('Invalid sidecar JSON');
    }
    const budgetKB = options.budgetKB ?? BUDGET.assetKB;
    const output = path.join(OUT, id + '.glb');
    const available = fs.existsSync(output);
    let bytes = entry.bytes;
    let parts: AssetHealth['parts'] = [];
    if (!fs.existsSync(path.join(SRC, entry.source))) flags.push('Missing source');
    else if (sourceHash(entry.source, id) !== entry.sourceHash) flags.push('Stale output: source or sidecar changed');
    if (!available) flags.push('Missing built output');
    else {
      const data = fs.readFileSync(output);
      bytes = data.length;
      if (sha(data) !== entry.outHash) flags.push('Stale output: hash differs from manifest');
      try {
        parts = outputParts(data);
        const actual = outputClips(data);
        const wanted = new Set([...entry.animations, ...(options.expectedClips ?? []), ...(expected[id] ?? [])]);
        for (const name of wanted) if (!actual.includes(name)) flags.push('Missing clip: ' + name);
      } catch {
        flags.push('Unreadable GLB animation metadata');
      }
    }
    if (bytes > budgetKB * 1024) flags.push(`Download budget exceeded: ${kb(bytes)} / ${budgetKB} KB`);
    for (const texture of entry.textures) {
      if (Math.max(...texture.size) > (options.maxTexture ?? BUDGET.maxTexture))
        flags.push(`Texture size budget exceeded: ${texture.name}`);
      if (texture.mime !== 'image/ktx2' && Math.max(...texture.size) > SMALL_TEXTURE)
        flags.push(`Texture needs KTX2: ${texture.name}`);
    }
    return { ...entry, id, bytes, available, budgetKB, flags, parts };
  });
}
