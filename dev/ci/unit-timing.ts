// Include the whole file process (imports and seed setup too), not just the individual tests' durations.
import path from 'node:path';
import type { TestEvent } from 'node:test/reporters';

export default async function* unitTiming(source: AsyncIterable<TestEvent>) {
  for await (const { type, data } of source)
    if (type === 'test:complete' && data.file && path.resolve(data.name) === data.file)
      yield `unit file ${path.relative(process.cwd(), data.file)}: ${(data.details.duration_ms / 1000).toFixed(3)}s\n`;
}
