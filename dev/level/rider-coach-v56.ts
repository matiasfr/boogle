// Read-only control: load v56 production source from the recorded #1983 commit in memory.
// node --import ./dev/level/rider-coach-v56.ts --import ./test/helpers/rail-no-audit.ts dev/level/rider-coach-gorge.ts
import { registerHooks } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
registerHooks({
  load(url, context, next) {
    const result = next(url, context);
    if (!url.startsWith('file:')) return result;
    const path = fileURLToPath(url);
    if (!path.startsWith(root + 'src/')) return result;
    return {
      ...result,
      source: execFileSync('git', ['show', '945c69554:' + path.slice(root.length)], {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      }),
    };
  },
});
