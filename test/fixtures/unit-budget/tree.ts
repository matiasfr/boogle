import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const child = spawn(process.execPath, [fileURLToPath(new URL('./interval.ts', import.meta.url))], { stdio: 'ignore' });
if (!child.pid || !process.env.UNIT_PROBE_PID) throw new Error('missing child PID or probe path');
writeFileSync(process.env.UNIT_PROBE_PID, String(child.pid));
while (true) {
  // A helper must not survive this deliberately blocked file.
}
