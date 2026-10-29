// Build the video share pages into the Pages site: `node dev/video/site.mjs <dist>` (run by .github/workflows/deploy.yml
// after the game's build). Every GitHub release tagged video-* (made by dev/video/publish.mjs) becomes
// <dist>/updates/<tag>/ with its video, poster and a page with a player and link-preview tags, plus an index at
// <dist>/updates/. Video files never enter git; they live on the releases. Never fails the deploy: with no gh, no
// network or no releases it builds what it can.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const dist = path.resolve(process.argv[2] || 'dist');
const sh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const updates = path.join(dist, 'updates');
// Download every video-* release into updates/<tag>/ (skipped without gh or network: pages are built from whatever
// is already there, which is also how to try this locally with a folder from .look/publish/).
const repoName =
  process.env.GITHUB_REPOSITORY ||
  (() => {
    try {
      return sh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
    } catch {
      return 'matiasfr/boogle';
    }
  })();
const [owner, repo] = repoName.split('/');
const site = `https://${owner.toLowerCase()}.github.io/${repo}/`;
try {
  const tags = sh(['release', 'list', '--exclude-drafts', '--limit', '200', '--json', 'tagName', '-q', '.[].tagName'])
    .split('\n')
    .filter((t) => /^video-[\w-]+$/.test(t));
  for (const tag of tags) {
    const dir = path.join(updates, tag);
    fs.mkdirSync(dir, { recursive: true });
    try {
      sh([
        'release',
        'download',
        tag,
        '--dir',
        dir,
        '--clobber',
        '-p',
        'video.mp4',
        '-p',
        'poster.jpg',
        '-p',
        'meta.json',
      ]);
    } catch (e) {
      console.log(`skipped ${tag}: ${e.message.split('\n')[0]}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
} catch (e) {
  console.log('no releases fetched: ' + e.message.split('\n')[0]);
}
const tags = fs.existsSync(updates)
  ? fs
      .readdirSync(updates)
      .filter((t) => /^video-[\w-]+$/.test(t) && fs.existsSync(path.join(updates, t, 'meta.json')))
      .sort()
      .reverse()
  : [];

const head = (title, desc, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"><meta property="og:site_name" content="Boogle">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">${extra}
<link rel="icon" href="../../icon-192.png"><link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;700&family=Lilita+One&display=swap" rel="stylesheet">
<style>
  :root { --ink: #13243f; --sea: #0f9fc0; --sun: #ffc93d; --sky: #bfe6f5; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: linear-gradient(#bfe6f5, #e9f7fc) fixed; color: var(--ink); font: 500 17px/1.5 Figtree, system-ui, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
  .brand, h1 { font-family: 'Lilita One', 'Arial Rounded MT Bold', sans-serif; font-weight: 400; }
  .brand { font-size: 28px; color: #fff; text-shadow: 0 3px 0 var(--sea); text-decoration: none; }
  h1 { font-size: clamp(30px, 6vw, 46px); line-height: 1.05; margin: 18px 0 6px; }
  .date { color: #4b5d7a; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-size: 13px; }
  video { width: 100%; border-radius: 16px; background: #000; box-shadow: 0 12px 40px rgba(19,36,63,.25); margin-top: 18px; }
  a { color: var(--sea); font-weight: 700; }
  ul { padding-left: 1.2em; } li::marker { color: var(--sea); }
  .play { display: inline-block; margin-top: 18px; padding: 12px 22px; border-radius: 999px; background: var(--sun);
    color: var(--ink); font-weight: 700; text-decoration: none; box-shadow: 0 4px 0 #d9a21f; }
  .card { display: flex; gap: 16px; align-items: center; padding: 12px; margin-top: 14px; border-radius: 14px;
    background: #fff; color: inherit; text-decoration: none; box-shadow: 0 4px 16px rgba(19,36,63,.08); }
  .card img { width: 200px; max-width: 40%; aspect-ratio: 16/9; object-fit: cover; border-radius: 10px; }
</style></head><body><main><a class="brand" href="../../">Boogle</a>`;

const entries = [];
for (const tag of tags) {
  try {
    const dir = path.join(updates, tag);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const url = `${site}updates/${tag}/`;
    const desc = meta.summary || 'What’s new on the island.';
    const og = `
<meta property="og:type" content="video.other"><meta property="og:url" content="${url}">
<meta property="og:image" content="${url}poster.jpg"><meta property="og:video" content="${url}video.mp4">
<meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="1280">
<meta property="og:video:height" content="720"><meta name="twitter:card" content="summary_large_image">`;
    const page = `${head(meta.title, desc, og)}
<div class="date">${esc(meta.date)}</div><h1>${esc(meta.title)}</h1>
<video src="video.mp4" poster="poster.jpg" controls playsinline preload="metadata"></video>
${meta.summary ? `<p>${esc(meta.summary)}</p>` : ''}
${meta.features?.length ? `<ul>${meta.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
<a class="play" href="../../">Play Boogle</a> <p><a href="../">All updates</a></p></main></body></html>`;
    fs.writeFileSync(path.join(dir, 'index.html'), page);
    entries.push({ tag, meta });
    console.log(`video page: updates/${tag}/`);
  } catch (e) {
    console.log(`skipped ${tag}: ${e.message.split('\n')[0]}`);
  }
}

if (entries.length) {
  const list = entries
    .map(
      ({ tag, meta }) => `<a class="card" href="${tag}/"><img src="${tag}/poster.jpg" alt="" loading="lazy">
<div><div class="date">${esc(meta.date)}</div><strong>${esc(meta.title)}</strong></div></a>`,
    )
    .join('\n');
  const index = `${head('Boogle updates', 'Patch videos from the island.').replaceAll('../../', '../')}
<h1>Updates</h1>${list}</main></body></html>`;
  fs.writeFileSync(path.join(dist, 'updates', 'index.html'), index);
}
