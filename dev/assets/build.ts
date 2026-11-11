// The asset pipeline (docs/plans/asset-pipeline.md): sources in assets/src/, optimized glTF in assets/built/, which the
// game imports with `?url` (Vite hashes the file name on build).
//
//   npm run assets                 build every source whose hash changed since the manifest
//   npm run assets -- scaffold-kit build one (or several), changed or not; --force rebuilds them all
//   npm run assets -- --check      no Blender, no encoders: every source has a fresh output, fresh; size targets only warn (in `check`)
//
//   npm run assets -- --scratch .look/lamp lamp  same builder, isolated src/ and built/; no catalogue registration
//
// Sources, by extension:
// - <name>.py     a Blender script that builds the asset from nothing and exports it to the path after `--`
//                 (assets/src/scaffold-kit.py). Agents can write these: models as code, run headless.
// - <name>.blend  a Blender file, exported with the settings below.
// - <name>.glb    already glTF (another tool, a download with a licence noted in the sidecar): only optimized.
// - <name>.json   optional sidecar for any of them: { "maxTexture": 2048, "simplify": 0.5, "budgetKB": 2048 } (limits: BUDGET in manifest.ts).
//
// Steps: Blender export (headless, `-b --factory-startup`), then gltf-transform: dedup, weld, resample animations,
// prune, simplify (only if the sidecar asks), textures resized to maxTexture and turned into KTX2 (ETC1S for colour,
// UASTC + zstd for normal and data maps; needs KTX-Software's `ktx`), then meshopt (EXT_meshopt_compression with
// KHR_mesh_quantization). Outputs are committed: CI has neither Blender nor `ktx`, and `--check` keeps them honest.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  SRC,
  OUT,
  MANIFEST,
  BUDGET,
  SMALL_TEXTURE,
  sha,
  kb,
  sources,
  sidecar,
  sourceHash,
  readManifest,
  budgetReport,
  assetSizeWarning,
  textureSizeWarning,
  sizeSummary,
  budgetSummary,
} from './manifest.ts';

// ---------------------------------------------------------------- --check: cheap, runs in `npm run check`
function check() {
  const manifest = readManifest();
  const errors: string[] = [];
  const sizeWarnings: string[] = [];
  const textureWarnings: string[] = [];
  const sizes: Record<string, number> = {};
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
    const over = assetSizeWarning(name, buf.length, sidecar(name).budgetKB ?? BUDGET.assetKB);
    if (over) sizeWarnings.push(over);
    for (const t of e.textures) {
      const big = textureSizeWarning(name, t.name, Math.max(...t.size));
      if (big) textureWarnings.push(big);
      if (t.mime !== 'image/ktx2' && Math.max(...t.size) > SMALL_TEXTURE)
        errors.push(
          `${name}: texture ${t.name} is ${t.mime} at ${t.size.join('x')}; over ${SMALL_TEXTURE} px needs KTX2`,
        );
    }
    sizes[name] = buf.length;
  }
  for (const name of Object.keys(manifest))
    if (!sources().some((s) => s.name === name))
      errors.push(`${name}: in the manifest but has no source in assets/src`);
  const report = budgetReport(sizes);
  // Size targets warn and never fail (owner, 10 November): the exit code ignores these.
  for (const w of [...sizeWarnings, ...textureWarnings, ...report.flags.map((f) => 'all assets: ' + f)])
    console.warn('assets: WARNING ' + w);
  if (errors.length) {
    console.error('assets: ' + errors.join('\nassets: '));
    process.exit(1);
  }
  console.log(`assets: ${Object.keys(manifest).length} fresh, ${budgetSummary(report)}`);
  if (report.conditionalFirst.length)
    console.log(`assets: first-priority but conditional (not in first load): ${report.conditionalFirst.join(', ')}`);
  if (report.unregistered.length)
    console.log(`assets: not registered (total only, no priority): ${report.unregistered.join(', ')}`);
  console.log('assets: ' + sizeSummary(Object.keys(manifest).length, sizeWarnings, textureWarnings, report.flags));
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
function exportRaw(file: string, tmp: string, sourceDir: string): Buffer {
  const src = path.join(sourceDir, file);
  const ext = path.extname(file);
  if (ext === '.glb' || ext === '.gltf') return fs.readFileSync(src);
  const raw = path.join(tmp, 'raw.glb');
  if (ext === '.py') run(blender(), ['-b', '--factory-startup', '--python-exit-code', '1', '--python', src, '--', raw]);
  else run(blender(), ['-b', src, '--factory-startup', '--python-exit-code', '1', '--python-expr', EXPORT_BLEND(raw)]);
  return fs.readFileSync(raw);
}

async function build(names: string[], force: boolean, scratch?: string) {
  const sourceDir = scratch ? path.join(scratch, 'src') : SRC;
  const outputDir = scratch ? path.join(scratch, 'built') : OUT;
  const manifestFile = scratch ? path.join(outputDir, 'manifest.json') : MANIFEST;
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

  const manifest = readManifest(manifestFile);
  fs.mkdirSync(outputDir, { recursive: true });
  const all = sources(sourceDir);
  const unknown = names.filter((n) => !all.some((s) => s.name === n));
  if (unknown.length) throw new Error(`assets: no source named ${unknown.join(', ')} in ${sourceDir}`);
  for (const { name, file } of all) {
    const hash = sourceHash(file, name, sourceDir);
    if (names.length ? !names.includes(name) : !force && manifest[name]?.sourceHash === hash) continue;
    const opts = { maxTexture: BUDGET.maxTexture as number, ...sidecar(name, sourceDir) };
    // Over the texture target is a warning: the asset is still built with the sidecar's maxTexture as authored.
    const bigTexture = textureSizeWarning(name, 'maxTexture', opts.maxTexture);
    if (bigTexture) console.warn('assets: WARNING ' + bigTexture);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-asset-'));
    try {
      const raw = exportRaw(file, tmp, sourceDir);
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
      fs.writeFileSync(path.join(outputDir, name + '.glb'), bytes);
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
      fs.rmSync(path.join(outputDir, name + '.glb'), { force: true });
    }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(manifestFile, JSON.stringify(sorted, null, 2) + '\n');
}

const args = process.argv.slice(2);
const scratchIndex = args.indexOf('--scratch');
let scratch: string | undefined;
if (scratchIndex >= 0) {
  const value = args[scratchIndex + 1];
  if (!value || value.startsWith('--')) throw new Error('--scratch needs a directory under .look/');
  scratch = path.resolve(value);
  const look = path.resolve('.look') + path.sep;
  if (!scratch.startsWith(look) || args.includes('--check'))
    throw new Error('Scratch builds must be under .look/ and cannot use --check');
  args.splice(scratchIndex, 2);
}
const { checkCatalogue } = await import('./catalogue-check.ts');
if (args.includes('--check')) check();
else
  await build(
    args.filter((a) => !a.startsWith('--')),
    args.includes('--force'),
    scratch,
  );
if (!scratch) checkCatalogue();
