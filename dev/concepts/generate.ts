// Concept art and asset drafts from text prompts. See .claude/skills/concept-art/SKILL.md.
//
//   npm run concepts -- [--prompts dev/concepts/eras.json] [--only era-2,era-4] [--out .look/concepts]
//                       [--kind concept|icon|sprite|tile|matcap|refsheet] [--chroma #ff00ff|none] [--ref a.png,b.png]
//                       [--recut] [--via api|codex] [--model gpt-image-2] [--size 1536x864] [--quality medium]
//                       [--n 1] [--dry]
//
// Two routes:
// - api: the OpenAI Images API with OPENAI_API_KEY from the environment (POST /v1/images/generations, or /edits when
//   there are reference images; GPT image models return base64 PNGs). Works anywhere the key and api.openai.com are
//   reachable, including cloud sessions.
// - codex: `codex exec` with Codex's $imagegen skill and a ChatGPT login, on a machine where Codex CLI is installed.
// Default: api when OPENAI_API_KEY is set, else codex when `codex` is on PATH.
//
// A prompts file is { "style": "shared prefix", "kind"?, "chroma"?, "refs"?: [paths],
// "items": [{ "id": "era-1", "prompt": "scene", "kind"?, "chroma"?, "refs"? }, ...] }. Flags beat items, items beat
// the file. Every image is written as <out>/<id>.png, with manifest.json (the exact prompt per image) and index.html
// (a contact sheet).
//
// A kind adds an asset-type spec to the prompt (wording after OpenAI's imagegen skill and creating-sprites) and a
// default size. Keyed kinds (icon, sprite) ask for a flat chroma background and cut it out with chroma.ts, keeping
// the model's original as <id>.raw.png; tiles get a seam score and a 2 x 2 preview, <id>.tiled.png. --recut redoes
// this cleanup on the images already on disk, without generating.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { parseHex, keyOut, check, trimSquare, seamScore, tile2x2 } from './chroma.ts';
import type { Img } from './chroma.ts';

type Kind = { size: string; chroma?: string; anchor?: 'center' | 'bottom'; spec?: string };
type Item = { id: string; prompt: string; kind?: string; chroma?: string; refs?: string[]; size?: string };
type Spec = { style?: string; kind?: string; chroma?: string; refs?: string[]; items: Item[] };
type Plan = ReturnType<typeof plan>;
type Image = {
  id: string;
  file: string;
  kind?: string;
  prompt: string;
  raw?: string;
  tiled?: string;
  seam?: number;
  warnings?: string[];
};

const KINDS: Record<string, Kind> = {
  concept: { size: '1536x864' },
  icon: {
    size: '1024x1024',
    chroma: '#ff00ff',
    anchor: 'center',
    spec:
      'Asset type: game UI icon. One object only, centred and filling most of the square with a small even margin; ' +
      'a chunky silhouette that still reads at 48 px; no border, frame, cast shadow, text or grid.',
  },
  sprite: {
    size: '1024x1024',
    chroma: '#ff00ff',
    anchor: 'bottom',
    spec:
      'Asset type: cut-out game sprite (a billboard, prop or decal). One subject only, whole and uncropped, standing ' +
      'on the bottom edge of the frame, seen from the front at eye level; no ground, cast shadow, text or grid.',
  },
  tile: {
    size: '1024x1024',
    spec:
      'Asset type: seamless tileable texture for a repeating surface. Straight top-down orthographic view filling ' +
      'the square edge to edge; the left edge continues into the right and the top into the bottom; even flat ' +
      'lighting with no baked shadows, highlights, vignette or focal object.',
  },
  matcap: {
    size: '1024x1024',
    spec:
      'Asset type: matcap (lit-sphere material capture). A single sphere of this material, orthographic, exactly ' +
      'filling the square and touching all four edges, on plain black; soft key light from the top left and a ' +
      'gentle rim light; no room reflections, text or props.',
  },
  refsheet: {
    size: '1536x1024',
    spec:
      'Asset type: orthographic modelling reference sheet. Front, side and back views of the same subject side by ' +
      'side at the same scale, standing on one shared ground line, in a neutral rest pose; flat even lighting, no ' +
      'perspective, no shadows, plain light grey background, no labels.',
  },
};

const args = process.argv.slice(2);
const opt = (name: string, def?: string) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name: string) => args.includes('--' + name);
const list = (s: string | undefined) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const promptsFile = opt('prompts', 'dev/concepts/eras.json');
const out = path.resolve(opt('out', '.look/concepts')!);
const only = list(opt('only', ''));
const model = opt('model', 'gpt-image-2');
const quality = opt('quality', 'medium');
const n = Math.max(1, Math.min(10, Number(opt('n', '1')) || 1));
const hasCodex = spawnSync('codex', ['--version'], { stdio: 'ignore' }).status === 0;
const via = opt('via', process.env.OPENAI_API_KEY ? 'api' : hasCodex ? 'codex' : 'none');

const spec: Spec = JSON.parse(fs.readFileSync(promptsFile!, 'utf8'));
const items = spec.items.filter((it) => !only.length || only.includes(it.id));
if (!items.length) {
  console.error(`no prompts matched ${only.join(', ')} in ${promptsFile}`);
  process.exit(2);
}

// Everything one image needs: its kind, size, key colour, reference images and the full prompt.
function plan(it: Item) {
  const kindName = opt('kind', it.kind || spec.kind || 'concept')!;
  const kind = KINDS[kindName];
  if (!kind) throw new Error(`unknown kind ${kindName}; one of ${Object.keys(KINDS).join(', ')}`);
  const chroma = opt('chroma', it.chroma || spec.chroma || kind.chroma || 'none')!;
  const key = chroma === 'none' ? null : parseHex(chroma);
  const refs = (opt('ref') ? list(opt('ref')) : it.refs || spec.refs || []).map((r) => path.resolve(r));
  for (const r of refs) if (!fs.existsSync(r)) throw new Error(`no reference image ${r}`);
  const prompt = [
    spec.style,
    kind.spec,
    it.prompt,
    key &&
      `Background: solid flat ${chroma} filling everything around the subject, with no gradient, floor, shadow or ` +
        `other objects. Never use that colour on the subject.`,
    refs.length &&
      `${refs.map((_, k) => `Image ${k + 1}`).join(', ')}: style reference only. Match its rendering, palette and ` +
        `level of detail, not its subject or composition.`,
  ]
    .filter(Boolean)
    .join(' ');
  return { kindName, kind, chroma, key, refs, prompt, size: opt('size', it.size || kind.size)! };
}

if (flag('dry')) {
  for (const it of items) {
    const p = plan(it);
    console.log(`${it.id} [${p.kindName}, ${p.size}${p.key ? ', key ' + p.chroma : ''}]: ${p.prompt}\n`);
  }
  process.exit(0);
}
if (via === 'none' && !flag('recut')) {
  console.error(
    'No image route: set OPENAI_API_KEY (an environment secret in cloud sessions), or install Codex CLI and log in.',
  );
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });
const fileFor = (it: Item, k: number) => path.join(out, n > 1 ? `${it.id}-${k}.png` : `${it.id}.png`);

async function viaApi(it: Item, p: Plan) {
  const headers: Record<string, string> = { authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
  let url = 'https://api.openai.com/v1/images/generations';
  let body: string | FormData = JSON.stringify({
    model,
    prompt: p.prompt,
    size: p.size,
    quality,
    n,
    output_format: 'png',
  });
  if (p.refs.length) {
    url = 'https://api.openai.com/v1/images/edits';
    body = new FormData();
    for (const [k, v] of Object.entries({ model, prompt: p.prompt, size: p.size, quality, n: String(n) }))
      body.append(k, v!);
    for (const r of p.refs)
      body.append('image[]', new Blob([fs.readFileSync(r)], { type: 'image/png' }), path.basename(r));
  } else headers['content-type'] = 'application/json';
  const res = await fetch(url, { method: 'POST', headers, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${json.error?.message || res.statusText}`);
  return (json.data as { b64_json: string }[]).map((d, k) => {
    const file = fileFor(it, k + 1);
    fs.writeFileSync(file, Buffer.from(d.b64_json, 'base64'));
    return file;
  });
}

// Codex's imagegen saves to ~/.codex/generated_images/<session>/ and then copies the file where the prompt asks. It
// ignores --quality and makes one image per run, and it picks its own size near the one asked, so ask it not to stretch.
// Reference images are copied into the output folder so Codex can open them. stdin is closed so `codex exec` doesn't
// wait for extra input when it isn't a TTY.
function viaCodex(it: Item, p: Plan) {
  const refs = p.refs.map((r) => {
    const name = 'ref-' + path.basename(r);
    fs.copyFileSync(r, path.join(out, name));
    return name;
  });
  const files: string[] = [];
  for (let k = 1; k <= n; k++) {
    const file = fileFor(it, k);
    fs.rmSync(file, { force: true });
    const ask =
      (refs.length ? `First open ${refs.join(', ')} with view_image: they are Image 1..${refs.length}. ` : '') +
      `$imagegen ${p.prompt} Aim for ${p.size}. Copy the generated PNG to ${path.basename(file)} in the current ` +
      `directory, unchanged: don't resize, crop or stretch it.`;
    const r = spawnSync('codex', ['exec', '-C', out, '-s', 'workspace-write', '--skip-git-repo-check', ask], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    if (r.status !== 0 || !fs.existsSync(file)) throw new Error(`codex exited ${r.status}; no ${path.basename(file)}`);
    files.push(file);
  }
  return files;
}

const readPng = (file: string): Img => PNG.sync.read(fs.readFileSync(file));
const writePng = (file: string, img: Img) =>
  fs.writeFileSync(file, PNG.sync.write(Object.assign(new PNG({ width: img.width, height: img.height }), img)));

// Cut out keyed kinds and check them; score tiles. Returns the manifest fields to add and any warnings. A keyed
// image is moved to <id>.raw.png first; with `recut` that raw original is already there and is cut again.
function finish(file: string, p: Plan, recut: boolean) {
  const extra: Partial<Image> & Record<string, unknown> = {};
  const warnings: string[] = [];
  if (p.key) {
    const rawFile = file.replace(/\.png$/, '.raw.png');
    if (!recut) fs.renameSync(file, rawFile);
    const raw = readPng(rawFile);
    let cut = keyOut(raw, p.key);
    const c = check(raw, cut, p.key);
    if (p.kind.anchor) cut = trimSquare(cut, { anchor: p.kind.anchor });
    writePng(file, cut);
    Object.assign(extra, { raw: path.basename(rawFile), key: p.chroma, checks: c });
    if (c.corners < 3) warnings.push('background is not the key colour (a scene, floor or fake checkerboard)');
    if (c.subjects > 1) warnings.push(`${c.subjects} separate subjects; ask for one object only`);
    if (c.fringe > 0.1)
      warnings.push(`${Math.round(c.fringe * 100)}% key-coloured edge; pick a key further from the subject`);
  }
  if (p.kindName === 'tile') {
    const img = readPng(file);
    const seam = seamScore(img);
    const tiled = file.replace(/\.png$/, '.tiled.png');
    writePng(tiled, tile2x2(img));
    Object.assign(extra, { tiled: path.basename(tiled), seam: Math.round(seam * 100) / 100 });
    if (seam > 3) warnings.push(`seam score ${seam.toFixed(2)}: the wrap edge shows; regenerate or fix in an editor`);
  }
  return { extra, warnings };
}

const manifest: { via: string; model: string; quality: string; at: string; images?: Image[] } = {
  via: via!,
  model: via === 'api' ? model! : 'codex default',
  quality: via === 'api' ? quality! : 'n/a',
  at: new Date().toISOString(),
};
// Keep earlier images of ids this run doesn't redo, so an --only run doesn't drop the rest from the contact sheet.
const manifestFile = path.join(out, 'manifest.json');
const prev: Image[] = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')).images || [] : [];
const images = (manifest.images = prev.filter(
  (m) => !items.some((it) => it.id === m.id) && fs.existsSync(path.join(out, m.file)),
));
let failed = 0;
for (const it of items) {
  process.stdout.write(`${it.id} ... `);
  try {
    const p = plan(it);
    let files: string[];
    if (flag('recut')) {
      // Redo the cleanup from what's on disk: the raw original for keyed kinds, the image itself otherwise.
      files = Array.from({ length: n }, (_, k) => fileFor(it, k + 1));
      const from = files.map((f) => (p.key ? f.replace(/\.png$/, '.raw.png') : f));
      const missing = from.find((f) => !fs.existsSync(f));
      if (missing) throw new Error(`nothing to recut: no ${path.basename(missing)}`);
    } else files = via === 'api' ? await viaApi(it, p) : viaCodex(it, p);
    const notes = [];
    for (const f of files) {
      const { extra, warnings } = finish(f, p, flag('recut'));
      images.push({
        id: it.id,
        file: path.basename(f),
        kind: p.kindName,
        prompt: p.prompt,
        ...extra,
        warnings,
      });
      notes.push(path.relative(process.cwd(), f) + warnings.map((w) => `\n  warning: ${w}`).join(''));
    }
    console.log(notes.join(', '));
  } catch (e) {
    failed++;
    console.log('failed: ' + (e as Error).message);
  }
}
const order = (id: string) => spec.items.findIndex((it) => it.id === id);
images.sort((a, b) => order(a.id) - order(b.id) || a.file.localeCompare(b.file));
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c as '&']);
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Concepts</title><style>body{font:14px system-ui;margin:16px;background:#f3efe4}
figure{margin:0 0 20px}img{max-width:100%;max-height:80vh;border-radius:8px;vertical-align:top}
img.cut{background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/24px 24px}
figcaption{color:#555;max-width:90ch}.warn{color:#a33}</style>` +
    images
      .map(
        (m) =>
          `<figure><img src="${m.tiled || m.file}"${m.raw ? ' class="cut"' : ''}>` +
          `<figcaption><b>${m.id}</b> · ${m.kind || 'concept'}${m.seam ? ` · seam ${m.seam}` : ''} · ` +
          `${esc(m.prompt)}${(m.warnings || []).map((w) => `<br><span class="warn">${esc(w)}</span>`).join('')}` +
          `</figcaption></figure>`,
      )
      .join('\n'),
);
console.log(`\n${images.length} image(s) in ${path.relative(process.cwd(), out)}/ (index.html)`);
process.exit(failed ? 1 : 0);
