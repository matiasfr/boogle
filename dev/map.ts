// npm run map -- <folder> [more folders or files]: what's in a folder, without reading it. Each file's size, what its opening
// comment says, and what it exports, generated so it can't go stale. Read this first, then only what you need, with line
// ranges: a whole-file read stays in an agent's context for the rest of its session and is paid again on every message.
import fs from 'node:fs';
import path from 'node:path';

const asked = process.argv.slice(2);
if (!asked.length) {
  console.error('npm run map -- <folder> [more]');
  process.exit(2);
}
const files = asked.flatMap((a) =>
  fs.statSync(a).isDirectory()
    ? fs
        .readdirSync(a)
        .filter((f) => /\.ts$/.test(f))
        .sort()
        .map((f) => path.join(a, f))
    : [a],
);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const about: string[] = [];
  for (const l of lines) {
    const c = /^\/\/ ?(.*)/.exec(l);
    if (!c) break;
    about.push(c[1]!);
  }
  const sentence =
    about
      .join(' ')
      .match(/^.*?\.(\s|$)/)?.[0]
      ?.trim() ?? about.join(' ');
  const names = [...text.matchAll(/^export (?:async )?(?:const|let|function|class|type) (\w+)/gm)].map((m) => m[1]!);
  const shown = names.slice(0, 14).join(', ') + (names.length > 14 ? `, +${names.length - 14}` : '');
  console.log(`${f}  ${lines.length} lines, ${Math.round(text.length / 1000)}k`);
  if (sentence) console.log(`  ${sentence.slice(0, 170)}`);
  if (shown) console.log(`  exports: ${shown}`);
}
