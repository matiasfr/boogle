// Built-GLB roundtrip inspection. No source repair, asset registration or browser ownership.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { ROOT, sha } from './manifest.ts';

const args = process.argv.slice(2);
if (args.length !== 4 || args.includes('--help')) {
  console.log(
    'node dev/assets/inspect.ts <built.glb> <new-output-dir> <ortho-metres> <centre-x,y,z>\nFixed game-axis frame; four columns front/side/back/three, rows clay/parts/wire/material. Run Blender outside the Codex sandbox.',
  );
  process.exit(args.includes('--help') ? 0 : 1);
}
const input = path.resolve(args[0]!),
  out = path.resolve(args[1]!);
const scale = Number(args[2]),
  centre = args[3]!.split(',').map(Number);
if (!(scale > 0 && Number.isFinite(scale)) || centre.length !== 3 || !centre.every(Number.isFinite))
  throw new Error('Expected positive ortho metres and finite x,y,z centre');
const bytes = fs.readFileSync(input);
fs.mkdirSync(out, { recursive: false }); // Never conceal a failed run by overwriting it.
fs.writeFileSync(path.join(out, 'built.glb'), bytes);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.readBinary(new Uint8Array(bytes));
let triangles = 0;
for (const mesh of doc.getRoot().listMeshes())
  for (const primitive of mesh.listPrimitives()) {
    if (primitive.getMode() !== 4) throw new Error('Only triangle props/attachments are supported');
    triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')!.getCount()) / 3;
  }
await doc.transform(dequantize());
for (const extension of doc.getRoot().listExtensionsUsed())
  if (extension.extensionName === 'EXT_meshopt_compression') extension.dispose();
await io.write(path.join(out, 'decoded.glb'), doc);
const blender = process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender';
const script = path.join(ROOT, 'dev/assets/inspect.py');
const settings = {
  input,
  hash: sha(bytes),
  bytes: bytes.length,
  triangles,
  materials: doc.getRoot().listMaterials().length,
  scale,
  centre,
  node: process.version,
  inspectorHash: sha(Buffer.concat([fs.readFileSync(import.meta.filename), fs.readFileSync(script)])),
  nodes: doc
    .getRoot()
    .listNodes()
    .map((n) => ({ name: n.getName(), translation: n.getTranslation(), scale: n.getScale() })),
};
fs.writeFileSync(path.join(out, 'inspection.json'), JSON.stringify(settings, null, 2) + '\n');
const result = spawnSync(
  blender,
  ['-b', '--factory-startup', '--python-exit-code', '1', '--python', script, '--', out],
  { encoding: 'utf8', maxBuffer: 64 << 20 },
);
fs.writeFileSync(path.join(out, 'blender.log'), result.stdout + result.stderr);
if (result.error || result.status !== 0)
  throw new Error(`Blender failed; retained ${out}/blender.log: ${result.error ?? result.signal ?? result.status}`);
console.log(fs.readFileSync(path.join(out, 'metrics.json'), 'utf8'));
console.log(`Inspection: ${out}`);
