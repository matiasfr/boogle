// Include the whole file process (imports and seed setup too), not just the individual tests' durations.
import path from 'node:path';
import { unitWeight } from './unit-shards.ts';
import type { TestEvent } from 'node:test/reporters';

export default async function* unitTiming(source: AsyncIterable<TestEvent>) {
  for await (const { type, data } of source) {
    if ((type === 'test:dequeue' || type === 'test:complete') && data.file && path.resolve(data.name) === data.file) {
      // Forward slashes on every platform: unit weights, annotations and tests key files that way.
      const file = path.relative(process.cwd(), data.file).split(path.sep).join("/");
      const weight = unitWeight(file);
      if (type === 'test:dequeue') {
        yield `unit file start ${file}\n`;
        if (weight === undefined)
          yield `::warning file=${file}::Unmeasured unit file ${file} was assigned 1s; refresh unit weights.\n`;
      } else {
        const seconds = data.details.duration_ms / 1000;
        yield `unit file ${file}: ${seconds.toFixed(3)}s\n`;
        yield `unit timing ${JSON.stringify({ file, seconds, weight: weight ?? null, passed: data.details.passed })}\n`;
        if (weight !== undefined && seconds > Math.max(10, weight * 2))
          yield `::warning file=${file}::Unit weight drift: ${file} took ${seconds.toFixed(1)}s against ${weight}s (>2x and >10s); refresh unit weights.\n`;
      }
    }
  }
}
