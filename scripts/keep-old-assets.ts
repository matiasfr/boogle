// Keeps recent builds' hashed files on the site. A GitHub Pages deploy replaces every file at once, so a page still
// loading the build before gets 404s and never starts, and one that did start can't fetch its lazy parts. deploy.yml
// runs this on dist/ before publishing: what left the build in the last KEEP_MS is fetched back from the live site.
// assets-kept.json, also on the site, remembers when each file was last in a build. A failure here only loses old files.
//   SITE_URL=https://boogle.club/ node scripts/keep-old-assets.ts dist
import fs from 'node:fs';
import path from 'node:path';

const KEEP_MS = 30 * 60_000; // a page is cached for 10 minutes (Pages' max-age); the rest is for slow loads
const LIST = 'assets-kept.json';
const AT_ONCE = 16;

const dist = process.argv[2] ?? 'dist';
const site = process.env.SITE_URL ?? 'https://boogle.club/';
const assets = path.join(dist, 'assets');
const now = Date.now();
const kept: Record<string, number> = Object.fromEntries(fs.readdirSync(assets).map((f) => [f, now]));

const res = await fetch(site + LIST).catch(() => null);
const old: Record<string, number> = res?.ok ? await res.json().catch(() => ({})) : {};
const gone = Object.keys(old).filter((f) => !kept[f] && now - old[f]! < KEEP_MS && /^[\w.-]+$/.test(f));
let files = 0,
  bytes = 0;
for (let k = 0; k < gone.length; k += AT_ONCE)
  await Promise.all(
    gone.slice(k, k + AT_ONCE).map(async (f) => {
      const r = await fetch(`${site}assets/${f}`).catch(() => null);
      if (!r?.ok) return;
      const body = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(path.join(assets, f), body);
      kept[f] = old[f]!;
      files++;
      bytes += body.length;
    }),
  );
fs.writeFileSync(path.join(dist, LIST), JSON.stringify(kept));
console.log(`kept ${files} of ${gone.length} old files, ${(bytes / 1e6).toFixed(1)} MB`);
