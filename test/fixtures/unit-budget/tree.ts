import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const child = spawn(process.execPath, [fileURLToPath(new URL('./interval.ts', import.meta.url))], {
  // Windows only: a non-detached child sits in its parent's job object and dies with it, which would hide a budget kill
  // that misses the tree. Detached, only taskkill /t reaches it. On Linux it must stay in the file's process group.
  detached: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'ignore'],
});
if (!child.pid) throw new Error('missing child PID');
await once(child.stdout, 'data');
writeSync(1, `budget probe child ${child.pid}\n`);
while (true) {
  // A helper must not survive this deliberately blocked file.
}
