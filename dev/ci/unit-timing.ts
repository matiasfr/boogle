// Include the whole file process (imports and seed setup too), not just the individual tests' durations.
import path from 'node:path';
import type { TestEvent } from 'node:test/reporters';

export default async function* unitTiming(source: AsyncIterable<TestEvent>) {
  for await (const { type, data } of source) {
    if ((type === 'test:dequeue' || type === 'test:complete') && data.file && path.resolve(data.name) === data.file) {
      const file = path.relative(process.cwd(), data.file);
      if (type === 'test:dequeue') yield `unit file start ${file}\n`;
      else yield `unit file ${file}: ${(data.details.duration_ms / 1000).toFixed(3)}s\n`;
    }
  }
}
