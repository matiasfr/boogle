// Cut recorded clips into a video: `npm run reel -- <name | path/to/reel.mjs>`. Edit lists are working files, never
// committed (the published release keeps the video): a bare name is .look/reels/<name>.mjs. Title cards and captions
// are HTML (the game's fonts and colours) rendered to PNG in headless Chromium; ffmpeg trims, overlays,
// crossfades and adds a small synthesized backing track. Clips come from `npm run clip` (.look/clips/). Output:
// .look/reels/<name>.mp4. See .claude/skills/video/SKILL.md.
//
// An edit list:
//   export default { size: [1280, 720], fps: 30, fade: 0.4, music: true, segments: [
//     { card: { kicker, title, sub, list: [..], foot }, seconds: 3, bg: 'clip-name' },   // a title card
//     { clip: 'clip-name', from: 0, to: 6, speed: 1, caption: { title, sub, tag, top } },  // footage + lower third
//   ] };
// `caption.top` moves the caption to the top left (when the game's own UI fills the bottom, e.g. a dialogue box).
// `quiet: true` on a segment drops the drums out while it plays (a breather before a new section).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { run } from '../look/lib.mjs';
import { music } from './music.ts';

const { chromium } = createRequire(import.meta.url)('playwright') as typeof import('playwright');

type Card = { kicker?: string; title: string; sub?: string; list?: string[]; foot?: string };
type Caption = { title: string; sub?: string; tag?: string; top?: boolean };
type Segment = {
  card?: Card;
  seconds?: number;
  bg?: string;
  bgFrom?: number;
  clip?: string;
  from?: number;
  to?: number;
  speed?: number;
  caption?: Caption;
  quiet?: boolean;
};
type Reel = {
  size?: [number, number];
  fps?: number;
  fade?: number;
  music?: boolean;
  bpm?: number;
  segments: Segment[];
};
const reels = path.resolve('.look/reels');
const arg = process.argv[2] || '';
// A bare name is .look/reels/<name>.mjs; anything with a slash or .mjs is a path.
const file = arg.includes('/') || arg.endsWith('.mjs') ? path.resolve(arg) : path.join(reels, arg + '.mjs');
if (!arg || !fs.existsSync(file)) {
  const all = fs.existsSync(reels) ? fs.readdirSync(reels).filter((f) => f.endsWith('.mjs')) : [];
  console.error(`npm run reel -- <name | path/to/reel.mjs>   reels: ${all.map((f) => f.slice(0, -4)).join(', ')}`);
  process.exit(2);
}
const reel: Reel = (await import(file)).default;
const name = path.basename(file, '.mjs');
const [W, H] = reel.size || [1280, 720];
const FPS = reel.fps || 30;
const FADE = reel.fade ?? 0.4;
const clips = path.resolve('.look/clips');
const out = path.resolve('.look/reels', name);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- overlays (HTML -> transparent PNG)
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c as '&']);
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@600;800&family=Lilita+One&display=swap');
  * { margin: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; background: transparent; font-family: Figtree, system-ui, sans-serif;
    color: #f3f8ff; position: relative; overflow: hidden; }
  .display { font-family: 'Lilita One', 'Arial Rounded MT Bold', sans-serif; letter-spacing: 0.01em; }
  .card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; background: radial-gradient(ellipse at center,
    rgba(12,28,52,0.35), rgba(12,28,52,0.72)); }
  .kicker { font-weight: 800; font-size: ${H * 0.03}px; letter-spacing: 0.28em; text-transform: uppercase;
    color: #ffc93d; margin-bottom: ${H * 0.015}px; }
  .title { font-size: ${H * 0.13}px; line-height: 1; text-shadow: 0 ${H * 0.008}px 0 #0f9fc0, 0 ${H * 0.02}px
    ${H * 0.04}px rgba(0,0,0,0.35); }
  .sub { font-weight: 600; font-size: ${H * 0.036}px; margin-top: ${H * 0.025}px; opacity: 0.92; max-width: 80%; }
  .list { list-style: none; padding: 0; margin-top: ${H * 0.035}px; text-align: left; font-weight: 600;
    font-size: ${H * 0.034}px; line-height: 1.55; }
  .list li::before { content: '✦'; color: #ffc93d; margin-right: 0.6em; }
  .foot { position: absolute; bottom: ${H * 0.07}px; font-weight: 800; font-size: ${H * 0.03}px;
    letter-spacing: 0.06em; color: #bfe6f5; }
  .lower { position: absolute; left: ${W * 0.045}px; bottom: ${H * 0.075}px; max-width: 62%;
    padding: ${H * 0.022}px ${H * 0.034}px; border-radius: ${H * 0.022}px; background: rgba(12,28,52,0.66);
    border: 2px solid rgba(255,255,255,0.22); box-shadow: 0 ${H * 0.012}px ${H * 0.04}px rgba(0,0,0,0.25); }
  .lower.top { bottom: auto; top: ${H * 0.115}px; }
  .lower .t { font-size: ${H * 0.058}px; line-height: 1.05; }
  .lower .s { font-weight: 600; font-size: ${H * 0.029}px; margin-top: ${H * 0.008}px; opacity: 0.9; }
  .bar { position: absolute; left: 0; top: ${H * 0.022}px; bottom: ${H * 0.022}px; width: 6px; border-radius: 3px;
    background: #ffc93d; transform: translateX(-3px); }
  .tag { position: absolute; top: ${H * 0.05}px; right: ${W * 0.035}px; padding: ${H * 0.012}px ${H * 0.024}px;
    border-radius: 999px; background: #ff7a45; color: #fff; font-weight: 800; font-size: ${H * 0.026}px;
    letter-spacing: 0.16em; text-transform: uppercase; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
  .brand { position: absolute; top: ${H * 0.045}px; left: ${W * 0.035}px; font-size: ${H * 0.04}px;
    text-shadow: 0 3px 0 #0f9fc0; opacity: 0.95; }`;
const cardHtml = (c: Card) => `<div class="card">
  ${c.kicker ? `<div class="kicker">${esc(c.kicker)}</div>` : ''}
  <div class="title display">${esc(c.title)}</div>
  ${c.sub ? `<div class="sub">${esc(c.sub)}</div>` : ''}
  ${c.list ? `<ul class="list">${c.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  ${c.foot ? `<div class="foot">${esc(c.foot)}</div>` : ''}</div>`;
const lowerHtml = (c: Caption) => `${c.top ? '' : '<div class="brand display">Boogle</div>'}
  ${c.tag ? `<div class="tag">${esc(c.tag)}</div>` : ''}
  <div class="lower${c.top ? ' top' : ''}"><div class="bar"></div><div class="t display">${esc(c.title)}</div>
  ${c.sub ? `<div class="s">${esc(c.sub)}</div>` : ''}</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
async function png(html: string, file: string) {
  await page.setContent(`<!doctype html><style>${CSS}</style><body>${html}</body>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: true });
  return file;
}

// ---------------------------------------------------------------- segments
const dur = (file: string) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));
const clipPath = (n: string) => {
  const p = path.join(clips, n + '.mp4');
  if (!fs.existsSync(p)) throw new Error(`missing clip ${n}: record it with npm run clip`);
  return p;
};
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const parts: { file: string; sec: number }[] = [];
for (const [k, s] of reel.segments.entries()) {
  const file = path.join(out, `seg${String(k).padStart(2, '0')}.mp4`);
  const fit = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`;
  if (s.card) {
    const sec = s.seconds || 3;
    const over = await png(cardHtml(s.card), file.replace('.mp4', '.png'));
    // The card sits on blurred, slowly pushed-in footage (or the game's sky colour when there's no bg clip).
    const bg = s.bg
      ? ['-ss', String(s.bgFrom || 0), '-t', String(sec), '-i', clipPath(s.bg)]
      : ['-f', 'lavfi', '-t', String(sec), '-i', `color=c=0x0f9fc0:s=${W}x${H}:r=${FPS}`];
    await run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      ...bg,
      '-loop',
      '1',
      '-t',
      String(sec),
      '-i',
      over,
      '-filter_complex',
      `[0:v]${fit},scale=${Math.round(W * 1.08)}:-2,crop=${W}:${H},gblur=sigma=14[b];` +
        `[1:v]format=rgba,fade=in:st=0.1:d=0.5:alpha=1[o];[b][o]overlay=0:0,trim=duration=${sec}[v]`,
      '-map',
      '[v]',
      ...enc,
      file,
    ]);
    parts.push({ file, sec });
  } else {
    const src = clipPath(s.clip!);
    const speed = s.speed || 1;
    const from = s.from || 0;
    const to = s.to ?? dur(src);
    const sec = (to - from) / speed;
    const filters = [`[0:v]trim=start=${from}:end=${to},setpts=(PTS-STARTPTS)/${speed},${fit}[v0]`];
    const args = ['-y', '-loglevel', 'error', '-i', src];
    let last = 'v0';
    if (s.caption) {
      const over = await png(lowerHtml(s.caption), file.replace('.mp4', '.png'));
      args.push('-loop', '1', '-t', String(sec), '-i', over);
      const fin = Math.max(0.2, sec - 0.7);
      filters.push(`[1:v]format=rgba,fade=in:st=0.25:d=0.45:alpha=1,fade=out:st=${fin}:d=0.45:alpha=1[o]`);
      filters.push(`[v0][o]overlay=0:0:shortest=1[v1]`);
      last = 'v1';
    }
    await run('ffmpeg', [...args, '-filter_complex', filters.join(';'), '-map', `[${last}]`, ...enc, file]);
    parts.push({ file, sec });
  }
  console.log(`  ${path.basename(file)}  ${parts.at(-1)!.sec.toFixed(2)} s  ${s.clip || s.card!.title}`);
}
await browser.close();

// ---------------------------------------------------------------- join with crossfades, add music
const inputs = parts.flatMap((p) => ['-i', p.file]);
let chain = '',
  prev = '0:v',
  t = parts[0].sec;
for (let k = 1; k < parts.length; k++) {
  const o = `x${k}`;
  chain += `[${prev}][${k}:v]xfade=transition=fade:duration=${FADE}:offset=${(t - FADE).toFixed(3)}[${o}];`;
  prev = o;
  t += parts[k].sec - FADE;
}
const total = t;
// Where each segment starts in the joined video (for the music's quiet stretches).
const starts = parts.map((_, k) => parts.slice(0, k).reduce((a, p) => a + p.sec - FADE, 0));
const quiet = reel.segments.flatMap((s, k): [number, number][] =>
  s.quiet ? [[starts[k]!, starts[k]! + parts[k]!.sec]] : [],
);
chain += `[${prev}]fade=in:st=0:d=0.5,fade=out:st=${(total - 0.8).toFixed(3)}:d=0.8[v]`;
const video = path.resolve('.look/reels', name + '.mp4');
const audio = [];
if (reel.music !== false) {
  const wav = path.join(out, 'music.wav');
  fs.writeFileSync(wav, music(total, reel.bpm || 112, quiet));
  audio.push('-i', wav);
}
await run('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  ...inputs,
  ...audio,
  '-filter_complex',
  chain,
  '-map',
  '[v]',
  ...(audio.length
    ? ['-map', `${parts.length}:a`, '-af', 'loudnorm=I=-16:TP=-1.5', '-c:a', 'aac', '-b:a', '160k', '-shortest']
    : []),
  ...enc,
  '-movflags',
  '+faststart',
  video,
]);
console.log(`\n${video}  (${total.toFixed(1)} s)`);
