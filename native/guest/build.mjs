// Builds the guest engine, native/guest/out/engine.wasm: the guest's simulation and the guest and dino models, compiled
// from a local checkout of the upstream decompilation (README.md says which) with the shim in this folder. Nothing it
// builds is committed or deployed; the player brings it (src/guest/engine.ts).
//
//   GUEST_DECOMP=/path/to/checkout node native/guest/build.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { TEXTURES } from '../../src/guest/textures.ts';

const here = dirname(fileURLToPath(import.meta.url));
const decomp = process.env.GUEST_DECOMP;
if (!decomp || !existsSync(join(decomp, 'src/game/mario.c'))) {
  console.error('Set GUEST_DECOMP to a checkout of the upstream decompilation (native/guest/README.md).');
  process.exit(1);
}
const out = join(here, 'out/engine.wasm'); // gitignored
const tool = (name, brewPath) => (existsSync(brewPath) ? brewPath : name);
const CLANG = process.env.CLANG ?? tool('clang', '/opt/homebrew/opt/llvm/bin/clang');
const WASM_LD = process.env.WASM_LD ?? tool('wasm-ld', '/opt/homebrew/opt/lld/bin/wasm-ld');

const DECOMP_SOURCES = [
  'src/game/mario.c',
  'src/game/mario_actions_airborne.c',
  'src/game/mario_actions_automatic.c',
  'src/game/mario_actions_cutscene.c',
  'src/game/mario_actions_moving.c',
  'src/game/mario_actions_object.c',
  'src/game/mario_actions_stationary.c',
  'src/game/mario_actions_submerged.c',
  'src/game/mario_step.c',
  'src/game/mario_misc.c',
  'src/game/interaction.c',
  'src/engine/math_util.c',
  'src/engine/surface_collision.c',
  'src/engine/graph_node.c',
  'src/engine/geo_layout.c',
  'src/engine/graph_node_manager.c',
];
const SHIM_SOURCES = ['shim.c', 'stubs.c', 'surfaces.c', 'render.c', 'model.c'];

// The upstream models #include textures that its build extracts from a ROM. Each stub holds the texture's index in
// TEXTURES (src/guest/textures.ts, same order) instead, so render.c can name the texture a display list loads; the
// pixels come from the player's ROM.
const TEXTURE_FILES = [
  'mario/mario_metal',
  'mario/mario_overalls_button',
  'mario/mario_logo',
  'mario/mario_sideburn',
  'mario/mario_mustache',
  'mario/mario_eyes_center',
  'mario/mario_eyes_half_closed',
  'mario/mario_eyes_closed',
  'mario/mario_eyes_closed_unused_0',
  'mario/mario_eyes_closed_unused_1',
  'mario/mario_eyes_left_unused',
  'mario/mario_eyes_right_unused',
  'mario/mario_eyes_up_unused',
  'mario/mario_eyes_down_unused',
  'mario/mario_eyes_dead',
  'mario/mario_wing',
  'mario/mario_wing_tip',
  'mario/mario_metal_wing_unused',
  'mario/mario_metal_wing_tip_unused',
  'yoshi/yoshi_eye',
  'yoshi/yoshi_eye_blink',
  'yoshi/yoshi_nostril',
];
if (TEXTURE_FILES.length !== TEXTURES.length) throw new Error('TEXTURE_FILES and src/guest/textures.ts disagree');
const work = join(tmpdir(), 'boogle-guest-build');
rmSync(work, { recursive: true, force: true });
mkdirSync(dirname(out), { recursive: true });
TEXTURE_FILES.forEach((file, i) => {
  mkdirSync(join(work, 'gen/actors', dirname(file)), { recursive: true });
  writeFileSync(join(work, 'gen/actors', `${file}.rgba16.inc.c`), `${i},\n`);
});

const flags = [
  '--target=wasm32',
  '-O2',
  '-ffreestanding',
  '-nostdlibinc',
  '-fno-strict-aliasing',
  '-fwrapv',
  '-std=gnu11',
  '-Wno-everything',
  '-fvisibility=hidden',
  '-DVERSION_US=1',
  '-DF3D_OLD=1',
  '-D_FINALROM=1',
  '-DNON_MATCHING=1',
  '-DAVOID_UB=1',
  '-D_LANGUAGE_C',
  `-I${join(here, 'include')}`,
  `-I${join(work, 'gen')}`,
  `-I${join(decomp, 'include')}`,
  `-I${join(decomp, 'include/libc')}`,
  `-I${join(decomp, 'src')}`,
  `-I${decomp}`,
];

const objects = [];
for (const src of [...DECOMP_SOURCES.map((s) => join(decomp, s)), ...SHIM_SOURCES.map((s) => join(here, s))]) {
  const obj = join(work, `${objects.length}-${basename(src)}.o`);
  execFileSync(CLANG, [...flags, '-c', src, '-o', obj], { stdio: 'inherit' });
  objects.push(obj);
}
const extra = process.env.ALLOW_UNDEFINED ? ['--allow-undefined'] : [];
execFileSync(
  WASM_LD,
  [
    '--no-entry',
    '--gc-sections',
    '--strip-all',
    '--export-dynamic',
    '-z',
    'stack-size=262144',
    '--initial-memory=16777216',
    ...extra,
    ...objects,
    '-o',
    out,
  ],
  { stdio: 'inherit' },
);
console.log(`${out}: ${(statSync(out).size / 1024).toFixed(0)} KB`);
