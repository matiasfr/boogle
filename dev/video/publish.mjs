// Publish a finished video: `npm run video:publish -- <video.mp4> --title "..." [--summary "..."] [--feature "..."]...
// [--target <commit>] [--from request.json] [--dry]`. Makes a share-sized copy (H.264, about 15-25 MB) and a poster frame, then creates a GitHub release
// `video-<date>` with video.mp4, poster.jpg and meta.json. The deploy workflow (dev/video/site.mjs) turns every
// video-* release into a share page at https://<owner>.github.io/<repo>/updates/<tag>/. This script starts that
// deploy, waits until the page is live and prints the share link. The tag marks the last commit the video covers
// (--target, default main's tip): `npm run video:changes` starts from there. See .claude/skills/video/SKILL.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { run } from '../look/lib.ts';

const argv = process.argv.slice(2);
const opt = { file: null, title: null, summary: '', features: [], target: null, dry: false };
for (let k = 0; k < argv.length; k++) {
  const a = argv[k];
  if (a === '--title') opt.title = argv[++k];
  else if (a === '--summary') opt.summary = argv[++k];
  else if (a === '--feature') opt.features.push(argv[++k]);
  else if (a === '--target') opt.target = argv[++k];
  else if (a === '--from')
    Object.assign(opt, JSON.parse(fs.readFileSync(argv[++k], 'utf8'))); // the same fields as JSON
  else if (a === '--dry') opt.dry = true;
  else if (!a.startsWith('-')) opt.file = a;
  else {
    console.error('unknown option ' + a);
    process.exit(2);
  }
}
if (!opt.file || !opt.title || !fs.existsSync(opt.file)) {
  console.error(
    'npm run video:publish -- <video.mp4> --title "..." [--summary "..."] [--feature "..."]... [--target <commit>] [--dry]',
  );
  process.exit(2);
}

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const [owner, repo] = sh('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).split('/');
const date = new Date().toISOString().slice(0, 10);
const tags = new Set(
  sh('gh', ['release', 'list', '--limit', '200', '--json', 'tagName', '-q', '.[].tagName']).split('\n'),
);
let tag = `video-${date}`;
for (let n = 2; tags.has(tag); n++) tag = `video-${date}-${n}`;
const url = `https://${owner.toLowerCase()}.github.io/${repo}/updates/${tag}/`;

const dir = path.resolve('.look/publish', tag);
fs.mkdirSync(dir, { recursive: true });
const video = path.join(dir, 'video.mp4'),
  poster = path.join(dir, 'poster.jpg');
const duration = Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', opt.file]));
await run('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  opt.file,
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '23',
  '-maxrate',
  '2500k',
  '-bufsize',
  '5000k',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  '-movflags',
  '+faststart',
  video,
]);
await run('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-ss',
  String(Math.min(8, duration * 0.15)),
  '-i',
  opt.file,
  '-frames:v',
  '1',
  '-q:v',
  '3',
  poster,
]);
const meta = { title: opt.title, summary: opt.summary, features: opt.features, date, duration: Math.round(duration) };
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
const notes = [`**Watch and share:** ${url}`, '', opt.summary, '', ...opt.features.map((f) => `- ${f}`)].join('\n');
fs.writeFileSync(path.join(dir, 'notes.md'), notes);

const mb = (fs.statSync(video).size / 1e6).toFixed(1);
console.log(`${tag}: ${mb} MB, ${Math.round(duration)} s -> ${dir}`);
if (opt.dry) {
  console.log(`dry run: would create release ${tag}\nshare link: ${url}`);
  process.exit(0);
}
sh('gh', [
  'release',
  'create',
  tag,
  '--title',
  opt.title,
  '--notes-file',
  path.join(dir, 'notes.md'),
  '--latest=false',
  ...(opt.target ? ['--target', sh('git', ['rev-parse', opt.target])] : []),
  video,
  poster,
  path.join(dir, 'meta.json'),
]);
console.log(`released ${tag}; deploying the share page ...`);
// A release doesn't trigger the Pages deploy (that runs on pushes to main), so start one and wait for the page.
sh('gh', ['workflow', 'run', 'deploy.yml', '--ref', 'main']);
const t0 = Date.now();
let live = false;
while (!live && Date.now() - t0 < 15 * 60000) {
  await new Promise((r) => setTimeout(r, 15000));
  live = await fetch(url, { cache: 'no-store' }).then(
    (r) => r.ok,
    () => false,
  );
}
console.log(live ? `share link: ${url}` : `not live after 15 min; check the deploy run. Link: ${url}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\ntag=${tag}\nlive=${live}\n`);
process.exitCode = live ? 0 : 1;
