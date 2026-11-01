// The asset pipeline (docs/plans/asset-pipeline.md): sources in assets/src/, optimized glTF in assets/built/, which the
// game imports with `?url` (Vite hashes the file name on build).
//
//   npm run assets                 build every source whose hash changed since the manifest
//   npm run assets -- scaffold-kit build one (or several), changed or not; --force rebuilds them all
//   npm run assets -- --check      no Blender, no encoders: every source has a fresh output, within budget (in `check`)
//
// Sources, by extension:
// - <name>.py     a Blender script that builds the asset from nothing and exports it to the path after `--`
//                 (assets/src/scaffold-kit.py). Agents can write these: models as code, run headless.
// - <name>.blend  a Blender file, exported with the settings below.
// - <name>.glb    already glTF (another tool, a download with a licence noted in the sidecar): only optimized.
// - <name>.json   optional sidecar for any of them: { "maxTexture": 1024, "simplify": 0.5, "budgetKB": 1024 }.
//
// Steps: Blender export (headless, `-b --factory-startup`), then gltf-transform: dedup, weld, resample animations,
// prune, simplify (only if the sidecar asks), textures resized to maxTexture and turned into KTX2 (ETC1S for colour,
// UASTC + zstd for normal and data maps; needs KTX-Software's `ktx`), then meshopt (EXT_meshopt_compression with
// KHR_mesh_quantization). Outputs are committed: CI has neither Blender nor `ktx`, and `--check` keeps them honest.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'assets/src');
const OUT = path.join(ROOT, 'assets/built');
const MANIFEST = path.join(OUT, 'manifest.json');

/** Default limits; a sidecar can raise one asset's. Sizes are the optimized .glb as downloaded. */
const BUDGET = { assetKB: 1024, totalKB: 12 * 1024, maxTexture: 1024 };
/** Textures at or under this many pixels a side may stay PNG/WebP (open-world.md, section 2). */
const SMALL_TEXTURE = 256;

type Sidecar = { maxTexture?: number; simplify?: number; budgetKB?: number };
type Entry = {
  source: string;
  sourceHash: string;
  outHash: string;
  rawBytes: number;
  bytes: number;
  triangles: number;
  animations: string[];
  textures: { name: string; size: [number, number]; mime: string }[];
};
type Manifest = Record<string, Entry>;

const SOURCE_EXT = ['.py', '.blend', '.glb', '.gltf'];
const sha = (buf: Buffer | string) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const kb = (n: number) => (n / 1024).toFixed(1) + ' KB';

function sources() {
  return fs
    .readdirSync(SRC)
    .filter((f) => SOURCE_EXT.includes(path.extname(f)))
    .map((f) => ({ name: path.basename(f, path.extname(f)), file: f }));
}
function sidecar(name: string): Sidecar {
  const p = path.join(SRC, name + '.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}
/** A source's hash covers its sidecar too, so changing a budget or texture size rebuilds it. */
function sourceHash(file: string, name: string) {
  const side = path.join(SRC, name + '.json');
  return sha(
    Buffer.concat([
      fs.readFileSync(path.join(SRC, file)),
      fs.existsSync(side) ? fs.readFileSync(side) : Buffer.alloc(0),
    ]),
  );
}
function readManifest(): Manifest {
  return fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
}

// ---------------------------------------------------------------- --check: cheap, runs in `npm run check`
function check() {
  const manifest = readManifest();
  const errors: string[] = [];
  let total = 0;
  for (const { name, file } of sources()) {
    const e = manifest[name];
    const out = path.join(OUT, name + '.glb');
    if (!e || !fs.existsSync(out)) {
      errors.push(`${name}: no output; run \`npm run assets -- ${name}\``);
      continue;
    }
    if (e.sourceHash !== sourceHash(file, name))
      errors.push(`${name}: ${file} changed since its output was built; run \`npm run assets -- ${name}\``);
    const buf = fs.readFileSync(out);
    if (e.outHash !== sha(buf)) errors.push(`${name}: ${name}.glb doesn't match the manifest; rebuild it`);
    const budget = (sidecar(name).budgetKB ?? BUDGET.assetKB) * 1024;
    if (buf.length > budget) errors.push(`${name}: ${kb(buf.length)} is over its ${kb(budget)} budget`);
    for (const t of e.textures)
      if (t.mime !== 'image/ktx2' && Math.max(...t.size) > SMALL_TEXTURE)
        errors.push(
          `${name}: texture ${t.name} is ${t.mime} at ${t.size.join('x')}; over ${SMALL_TEXTURE} px needs KTX2`,
        );
    total += buf.length;
  }
  for (const name of Object.keys(manifest))
    if (!sources().some((s) => s.name === name))
      errors.push(`${name}: in the manifest but has no source in assets/src`);
  if (total > BUDGET.totalKB * 1024)
    errors.push(`all assets: ${kb(total)} is over the ${kb(BUDGET.totalKB * 1024)} total`);
  if (errors.length) {
    console.error('assets: ' + errors.join('\nassets: '));
    process.exit(1);
  }
  console.log(`assets: ${Object.keys(manifest).length} fresh, ${kb(total)} in all`);
}

// ---------------------------------------------------------------- build
function which(cmd: string) {
  const r = spawnSync('/usr/bin/env', ['which', cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}
function blender() {
  const mac = '/Applications/Blender.app/Contents/MacOS/Blender';
  const bin = process.env.BLENDER || (fs.existsSync(mac) ? mac : which('blender'));
  if (!bin) throw new Error('assets: Blender not found (install it, or set BLENDER=/path/to/blender)');
  return bin;
}
function run(bin: string, args: string[]) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`assets: ${path.basename(bin)} failed\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}

// The settings every .blend is exported with: Y up, modifiers applied, no cameras or lights, every action as its own
// clip, compression left to gltf-transform.
const EXPORT_BLEND = (out: string) =>
  `import bpy; bpy.ops.export_scene.gltf(filepath=${JSON.stringify(out)}, export_format='GLB', export_yup=True, ` +
  `export_apply=True, export_cameras=False, export_lights=False, export_extras=False, export_animations=True, ` +
  `export_animation_mode='ACTIONS', export_optimize_animation_size=True, export_draco_mesh_compression_enable=False)`;

/** The unoptimized glTF for a source, as bytes. */
function exportRaw(file: string, tmp: string): Buffer {
  const src = path.join(SRC, file);
  const ext = path.extname(file);
  if (ext === '.glb' || ext === '.gltf') return fs.readFileSync(src);
  const raw = path.join(tmp, 'raw.glb');
  if (ext === '.py') run(blender(), ['-b', '--factory-startup', '--python-exit-code', '1', '--python', src, '--', raw]);
  else run(blender(), ['-b', src, '--factory-startup', '--python-exit-code', '1', '--python-expr', EXPORT_BLEND(raw)]);
  return fs.readFileSync(raw);
}

async function build(names: string[], force: boolean) {
  const { NodeIO, Logger } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS, KHRTextureBasisu } = await import('@gltf-transform/extensions');
  const fn = await import('@gltf-transform/functions');
  const { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } = await import('meshoptimizer');
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  const logger = new Logger(Logger.Verbosity.WARN);
  const io = new NodeIO()
    .setLogger(logger)
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const ktx = which('ktx');

  const manifest = readManifest();
  fs.mkdirSync(OUT, { recursive: true });
  const all = sources();
  const unknown = names.filter((n) => !all.some((s) => s.name === n));
  if (unknown.length) throw new Error(`assets: no source named ${unknown.join(', ')} in assets/src`);
  for (const { name, file } of all) {
    const hash = sourceHash(file, name);
    if (names.length ? !names.includes(name) : !force && manifest[name]?.sourceHash === hash) continue;
    const opts = { maxTexture: BUDGET.maxTexture, ...sidecar(name) };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-asset-'));
    try {
      const raw = exportRaw(file, tmp);
      const doc = (await io.readBinary(new Uint8Array(raw))).setLogger(logger);
      await doc.transform(
        fn.dedup(),
        fn.weld(),
        fn.resample(),
        fn.prune(),
        ...(opts.simplify ? [fn.simplify({ simplifier: MeshoptSimplifier, ratio: opts.simplify, error: 0.001 })] : []),
        // Resize only (no encoder: pure JS, PNG and JPEG); KTX2 follows.
        fn.textureCompress({ resize: [opts.maxTexture, opts.maxTexture] }),
      );
      const textures = doc.getRoot().listTextures();
      if (textures.length && !ktx)
        console.warn(
          `assets: ${name}: \`ktx\` (KTX-Software) not found, textures stay PNG/JPEG; brew install ktx-software`,
        );
      if (textures.length && ktx) {
        doc.createExtension(KHRTextureBasisu).setRequired(true);
        for (const [i, t] of textures.entries()) {
          // Colour maps (sRGB) take ETC1S: small, fine for albedo. Normal, roughness and other data take UASTC.
          const colour = fn.getTextureColorSpace(t) === 'srgb';
          const ext = t.getMimeType() === 'image/jpeg' ? 'jpg' : 'png';
          const inp = path.join(tmp, `t${i}.${ext}`);
          const out = path.join(tmp, `t${i}.ktx2`);
          fs.writeFileSync(inp, t.getImage()!);
          run(ktx, [
            'create',
            '--format',
            colour ? 'R8G8B8A8_SRGB' : 'R8G8B8A8_UNORM',
            '--generate-mipmap',
            ...(colour
              ? ['--encode', 'basis-lz', '--qlevel', '128']
              : ['--encode', 'uastc', '--uastc-quality', '2', '--zstd', '18']),
            inp,
            out,
          ]);
          t.setImage(fs.readFileSync(out)).setMimeType('image/ktx2');
        }
      }
      // meshopt() reorders and quantizes (KHR_mesh_quantization) before compressing.
      await doc.transform(fn.meshopt({ encoder: MeshoptEncoder, level: 'high' }));
      const bytes = Buffer.from(await io.writeBinary(doc));
      fs.writeFileSync(path.join(OUT, name + '.glb'), bytes);
      let triangles = 0;
      for (const mesh of doc.getRoot().listMeshes())
        for (const p of mesh.listPrimitives())
          triangles += Math.floor((p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3);
      manifest[name] = {
        source: file,
        sourceHash: hash,
        outHash: sha(bytes),
        rawBytes: raw.length,
        bytes: bytes.length,
        triangles,
        animations: doc
          .getRoot()
          .listAnimations()
          .map((a) => a.getName()),
        textures: doc
          .getRoot()
          .listTextures()
          .map((t) => ({ name: t.getName() || t.getURI(), size: t.getSize() ?? [0, 0], mime: t.getMimeType() })),
      };
      console.log(`assets: ${name}: ${kb(raw.length)} -> ${kb(bytes.length)}, ${triangles} triangles`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  for (const name of Object.keys(manifest))
    if (!all.some((s) => s.name === name)) {
      delete manifest[name];
      fs.rmSync(path.join(OUT, name + '.glb'), { force: true });
    }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
}

const args = process.argv.slice(2);
if (args.includes('--check')) check();
else
  await build(
    args.filter((a) => !a.startsWith('--')),
    args.includes('--force'),
  );
