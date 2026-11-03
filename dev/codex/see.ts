// How a sandboxed Codex job sees the game: `BOOGLE_QUERY='proto=water' node dev/codex/see.ts <npm run look options>`, then
// open the PNGs it names with view_image. macOS's sandbox won't let Chromium start, so this runs the job's own server and
// Vite in the sandbox and asks ./look-broker.ts, outside it, to point a browser at them. See .claude/skills/codex/SKILL.md.
import fs from 'node:fs';
import path from 'node:path';
import { startStack, sleep } from '../look/lib.ts';

const dir = path.resolve('.look/see');
fs.mkdirSync(dir, { recursive: true });
const id = `${Date.now()}-${process.pid}`;
const stack = await startStack();
let status: number;
try {
  const request = { url: stack.base, args: process.argv.slice(2), query: process.env.BOOGLE_QUERY ?? '' };
  fs.writeFileSync(path.join(dir, `${id}.tmp`), JSON.stringify(request));
  fs.renameSync(path.join(dir, `${id}.tmp`), path.join(dir, `${id}.json`)); // the broker never reads half a request
  const done = path.join(dir, `${id}.done.json`);
  const deadline = Date.now() + 6 * 60_000;
  while (!fs.existsSync(done)) {
    if (Date.now() > deadline)
      throw new Error('No answer from the look broker (is this running under dev/codex/run.ts?)');
    await sleep(300);
  }
  const answer = JSON.parse(fs.readFileSync(done, 'utf8')) as { status: number; output: string };
  console.log(answer.output);
  status = answer.status;
} finally {
  await stack.close();
}
process.exit(status);
