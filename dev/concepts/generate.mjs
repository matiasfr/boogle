// Concept art from text prompts, for design exploration (not game assets). See .claude/skills/concept-art/SKILL.md.
//
//   npm run concepts -- [--prompts dev/concepts/eras.json] [--only era-2,era-4] [--out .look/concepts]
//                       [--via api|codex] [--model gpt-image-2] [--size 1536x864] [--quality medium] [--n 1] [--dry]
//
// Two routes:
// - api: the OpenAI Images API with OPENAI_API_KEY from the environment (POST /v1/images/generations; GPT image models
//   return base64 PNGs). Works anywhere the key and api.openai.com are reachable, including cloud sessions.
// - codex: `codex exec` with Codex's $imagegen skill and a ChatGPT login, on a machine where Codex CLI is installed.
// Default: api when OPENAI_API_KEY is set, else codex when `codex` is on PATH.
//
// A prompts file is { "style": "shared prefix", "items": [{ "id": "era-1", "prompt": "scene" }, ...] }. Every image is
// written as <out>/<id>.png, with manifest.json (the exact prompt per image) and index.html (a contact sheet).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes('--' + name);

const promptsFile = opt('prompts', 'dev/concepts/eras.json');
const out = path.resolve(opt('out', '.look/concepts'));
const only = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const model = opt('model', 'gpt-image-2');
const size = opt('size', '1536x864');
const quality = opt('quality', 'medium');
const n = Math.max(1, Math.min(10, Number(opt('n', '1')) || 1));
const hasCodex = spawnSync('codex', ['--version'], { stdio: 'ignore' }).status === 0;
const via = opt('via', process.env.OPENAI_API_KEY ? 'api' : hasCodex ? 'codex' : 'none');

const spec = JSON.parse(fs.readFileSync(promptsFile, 'utf8'));
const items = spec.items.filter((it) => !only.length || only.includes(it.id));
if (!items.length) {
  console.error(`no prompts matched ${only.join(', ')} in ${promptsFile}`);
  process.exit(2);
}
const full = (it) => [spec.style, it.prompt].filter(Boolean).join(' ');

if (flag('dry')) {
  for (const it of items) console.log(`${it.id}: ${full(it)}\n`);
  process.exit(0);
}
if (via === 'none') {
  console.error(
    'No image route: set OPENAI_API_KEY (an environment secret in cloud sessions), or install Codex CLI and log in.',
  );
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

async function viaApi(it) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, prompt: full(it), size, quality, n, output_format: 'png' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body.error?.message || res.statusText}`);
  return body.data.map((d, k) => {
    const file = path.join(out, n > 1 ? `${it.id}-${k + 1}.png` : `${it.id}.png`);
    fs.writeFileSync(file, Buffer.from(d.b64_json, 'base64'));
    return file;
  });
}

function viaCodex(it) {
  const file = path.join(out, `${it.id}.png`);
  const ask = `$imagegen ${full(it)} Size ${size}. Save the image as ${path.basename(file)} in the current directory.`;
  const r = spawnSync('codex', ['exec', '-C', out, '-s', 'workspace-write', '--skip-git-repo-check', ask], {
    stdio: 'inherit',
  });
  if (r.status !== 0 || !fs.existsSync(file)) throw new Error(`codex exited ${r.status}; no ${path.basename(file)}`);
  return [file];
}

const manifest = { via, model: via === 'api' ? model : 'codex default', size, quality, at: new Date().toISOString() };
manifest.images = [];
let failed = 0;
for (const it of items) {
  process.stdout.write(`${it.id} ... `);
  try {
    const files = via === 'api' ? await viaApi(it) : viaCodex(it);
    for (const f of files) manifest.images.push({ id: it.id, file: path.basename(f), prompt: full(it) });
    console.log(files.map((f) => path.relative(process.cwd(), f)).join(', '));
  } catch (e) {
    failed++;
    console.log('failed: ' + e.message);
  }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Concepts</title><style>body{font:14px system-ui;margin:16px;background:#f3efe4}
figure{margin:0 0 20px}img{max-width:100%;border-radius:8px}figcaption{color:#555;max-width:90ch}</style>` +
    manifest.images
      .map((m) => `<figure><img src="${m.file}"><figcaption><b>${m.id}</b> · ${esc(m.prompt)}</figcaption></figure>`)
      .join('\n'),
);
console.log(`\n${manifest.images.length} image(s) in ${path.relative(process.cwd(), out)}/ (index.html)`);
process.exit(failed ? 1 : 0);
