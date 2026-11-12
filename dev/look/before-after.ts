// npm run before-after -- <git ref> [any npm run look options]: the same capture on that commit and on this checkout, side by
// side, so a visual change can be judged at one camera and one state. The other build comes from `git archive` into
// .look/before/<sha> (kept for next time). Use it with --cam/--look or --at, and BOOGLE_QUERY as usual; with --curves the second
// run draws the first underneath. Writes <name>-before-after.png in the look output folder.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { launch, root } from './lib.ts';

const [ref, ...args] = process.argv.slice(2);
if (!ref || ref.startsWith('-')) {
  console.error('npm run before-after -- <git ref> [look options]');
  process.exit(2);
}
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? null : args[i + 1]!;
};
const without = (name: string) => {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 2);
};
const name = opt('--name') ?? 'compare';
const out = path.resolve(root, opt('--out') ?? '.look');
const afterRoot = opt('--root');
without('--name');
without('--root');

const sha = execFileSync('git', ['rev-parse', '--short', ref], { cwd: root, encoding: 'utf8' }).trim();
const before = path.join(root, '.look/before', sha);
if (!fs.existsSync(path.join(before, 'package.json'))) {
  fs.mkdirSync(before, { recursive: true });
  const tar = execFileSync('git', ['archive', sha], { cwd: root, maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', before], { input: tar, maxBuffer: 1 << 30 });
  // The same packages as this checkout, read-only: nothing installs through this link.
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(before, 'node_modules'));
}
const look = (checkout: string | null, label: string, extra: string[]) => {
  const r = spawnSync(
    process.execPath,
    [
      'dev/look/look.ts',
      ...args,
      ...extra,
      '--name',
      label,
      ...(checkout ? ['--root', checkout] : []),
    ],
    { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' },
  );
  console.log(`--- ${label} (${checkout ? path.basename(checkout) : 'this checkout'})\n${r.stdout.trim()}`);
  if (r.status) process.exit(r.status);
};
const a = `${name}-before`,
  b = `${name}-after`;
look(before, a, []);
const curves = args.includes('--curves') && !args.includes('--curves-vs');
look(afterRoot, b, curves ? ['--curves-vs', path.join(out, `${a}-curves.csv`)] : []);
// In a scratch page (canvas), so the harness needs no image library.
const browser = await launch();
const page = await browser.newPage();
const url = await page.evaluate(
  async ({ left, right, labels }) => {
    const load = (b64: string) =>
      new Promise<HTMLImageElement>((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.src = 'data:image/png;base64,' + b64;
      });
    const [l, r] = await Promise.all([load(left), load(right)]);
    const cv = document.createElement('canvas');
    cv.width = l!.width + r!.width + 8;
    cv.height = Math.max(l!.height, r!.height);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(l!, 0, 0);
    g.drawImage(r!, l!.width + 8, 0);
    g.font = 'bold 16px system-ui, sans-serif';
    [labels[0]!, labels[1]!].forEach((t, k) => {
      const x = k ? l!.width + 16 : 8;
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(x, cv.height - 32, g.measureText(t).width + 14, 26);
      g.fillStyle = '#fff';
      g.fillText(t, x + 7, cv.height - 13);
    });
    return cv.toDataURL('image/png');
  },
  {
    left: fs.readFileSync(path.join(out, `${a}-still.png`)).toString('base64'),
    right: fs.readFileSync(path.join(out, `${b}-still.png`)).toString('base64'),
    labels: [`before: ${sha}`, 'after'],
  },
);
await browser.close();
const file = path.join(out, `${name}-before-after.png`);
fs.writeFileSync(file, Buffer.from(url.split(',')[1]!, 'base64'));
console.log(`before and after: ${file}`);
process.exit(0);
