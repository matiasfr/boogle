// Shared build facts. Importing this module never builds an asset or starts a browser/game.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const SRC = path.join(ROOT, 'assets/src');
export const OUT = path.join(ROOT, 'assets/built');
export const MANIFEST = path.join(OUT, 'manifest.json');
/**
 * Every asset budget, the single source of truth: reference this object, never copy a number.
 * These are tunable policy numbers (download sizes the owner set on 6 November), not engine limits: a different engine
 * or a measured device may move them. They are download budgets, not resident GPU budgets.
 */
export const BUDGET = {
  /** What the first frame waits for: assets registered with priority `first` and no `when` (src/render/asset-manifest.ts). */
  firstLoadKB: 25 * 1024,
  /** All authored assets together, streamed by priority. */
  totalKB: 100 * 1024,
  /** Per asset; a sidecar's `budgetKB` may override it. */
  assetKB: 4 * 1024,
  /** Largest texture edge (px) by default. */
  maxTexture: 1024,
  /** Texture edge (px) past which the build warns (owner, 10 November: a warning, never a failure). */
  heroMaxTexture: 2048,
} as const satisfies Record<string, number>;
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
  nodes: string[];
  textures: { name: string; size: [number, number]; mime: string }[];
};
export type Manifest = Record<string, Entry>;
/** Names from the committed GLB JSON chunk, without decoding or rebuilding any geometry. */
export function glbNodes(bytes: Buffer): string[] {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(16) !== 0x4e4f534a)
    throw new Error('assets: expected glTF 2 JSON chunk');
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')) as {
    nodes?: { name?: string }[];
  };
  return [...new Set((json.nodes ?? []).flatMap((node) => (node.name ? [node.name] : [])))].sort();
}
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
/** Load priority of each built asset, read from the registrations (`registerAsset` in src/), which are its only owner. */
export type AssetStage = { priority: 'first' | 'soon' | 'later'; conditional: boolean };
function assetStages(srcDir = path.join(ROOT, 'src')): Record<string, AssetStage> {
  const stages: Record<string, AssetStage> = {};
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.name.endsWith('.ts') && full !== path.join(srcDir, 'render/asset-manifest.ts'))
        scan(fs.readFileSync(full, 'utf8'));
    }
  };
  const scan = (text: string) => {
    if (!text.includes('registerAsset(')) return;
    const files = new Map<string, string>(); // import identifier -> built asset id
    for (const m of text.matchAll(/import\s+(\w+)\s+from\s+'[^']*assets\/built\/([\w-]+)\.glb\?url'/g))
      files.set(m[1]!, m[2]!);
    for (const m of text.matchAll(/registerAsset\(\{([\s\S]*?)\}\s*\)/g)) {
      const body = m[1]!;
      const url = /\burl:\s*(\w+)/.exec(body)?.[1];
      const priority = /\bpriority:\s*'(first|soon|later)'/.exec(body)?.[1] as AssetStage['priority'] | undefined;
      const id = url && files.get(url);
      if (id && priority) stages[id] = { priority, conditional: /\bwhen:/.test(body) };
    }
  };
  walk(srcDir);
  return stages;
}

export type BudgetReport = {
  firstBytes: number;
  totalBytes: number;
  /** Built assets no `registerAsset` names: counted in the total only. */
  unregistered: string[];
  /** First-priority assets that apply only somewhere (`when`), left out of the first load. */
  conditionalFirst: string[];
  flags: string[];
};
/** First-load and total use against BUDGET, from output sizes, joined with the registrations' priorities. */
export function budgetReport(sizes: Record<string, number>, stages = assetStages()): BudgetReport {
  let firstBytes = 0;
  let totalBytes = 0;
  const unregistered: string[] = [];
  const conditionalFirst: string[] = [];
  for (const [id, bytes] of Object.entries(sizes)) {
    totalBytes += bytes;
    const stage = stages[id];
    if (!stage) unregistered.push(id);
    else if (stage.priority === 'first') {
      if (stage.conditional) conditionalFirst.push(id);
      else firstBytes += bytes;
    }
  }
  const flags: string[] = [];
  if (firstBytes > BUDGET.firstLoadKB * 1024)
    flags.push(`First-load size target exceeded: ${kb(firstBytes)} / ${BUDGET.firstLoadKB} KB`);
  if (totalBytes > BUDGET.totalKB * 1024)
    flags.push(`Total download size target exceeded: ${kb(totalBytes)} / ${BUDGET.totalKB} KB`);
  return { firstBytes, totalBytes, unregistered, conditionalFirst, flags };
}
/** An asset's built size against its target (its sidecar's `budgetKB` or BUDGET.assetKB): a warning line, or null. A warning only. */
export function assetSizeWarning(name: string, bytes: number, budgetKB: number): string | null {
  return bytes > budgetKB * 1024 ? `${name}: ${kb(bytes)} is over its ${kb(budgetKB * 1024)} size target` : null;
}
/** A texture edge against BUDGET.heroMaxTexture: a warning line, or null. A warning only; the asset is still emitted as authored. */
export function textureSizeWarning(name: string, texture: string, edge: number): string | null {
  return edge > BUDGET.heroMaxTexture
    ? `${name}: texture ${texture} is ${edge} px, over the ${BUDGET.heroMaxTexture} px target`
    : null;
}
/** The one line that keeps the warnings counted: how many assets are over a size target, and which kinds. */
export function sizeSummary(total: number, sizeWarnings: string[], textureWarnings: string[], budgetFlags: string[]) {
  const names = new Set([...sizeWarnings, ...textureWarnings].map((w) => w.split(':')[0]));
  return `${names.size} of ${total} assets over a size target (${sizeWarnings.length} over size, ${textureWarnings.length} oversized textures, ${budgetFlags.length} of first-load and total over)`;
}
export function budgetSummary(r: BudgetReport) {
  const mb = (n: number) => (n / 1048576).toFixed(2) + ' MB';
  return `first load ${mb(r.firstBytes)} / ${mb(BUDGET.firstLoadKB * 1024)}, total ${mb(r.totalBytes)} / ${mb(BUDGET.totalKB * 1024)}`;
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
    if ((options.maxTexture ?? 0) > BUDGET.heroMaxTexture)
      flags.push(`Sidecar maxTexture ${options.maxTexture} is over the ${BUDGET.heroMaxTexture} px hero cap`);
    for (const texture of entry.textures) {
      if (Math.max(...texture.size) > (options.maxTexture ?? BUDGET.maxTexture))
        flags.push(`Texture size budget exceeded: ${texture.name}`);
      if (texture.mime !== 'image/ktx2' && Math.max(...texture.size) > SMALL_TEXTURE)
        flags.push(`Texture needs KTX2: ${texture.name}`);
    }
    return { ...entry, id, bytes, available, budgetKB, flags, parts };
  });
}
