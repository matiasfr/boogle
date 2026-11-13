import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { probe, orderProbe } from './enforcement.ts';

const results: Awaited<ReturnType<typeof probe>>[] = [];
for (const perf of [false, true]) {
  for (const kind of ['read', 'write', 'readonly', 'cycle', 'workers'] as const) {
    await test(`Becsy ${perf ? 'perf' : 'checked'} enforcement: ${kind}`, async () => {
      let result: Awaited<ReturnType<typeof probe>>;
      if (perf && kind === 'cycle') {
        const child = spawnSync(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            "import { probe } from './dev/spikes/becsy-model/enforcement.ts'; console.log('cycle-started'); console.log(JSON.stringify(await probe(true, 'cycle')));",
          ],
          { encoding: 'utf8', timeout: 750, killSignal: 'SIGKILL' },
        );
        assert.equal((child.error as NodeJS.ErrnoException | undefined)?.code, 'ETIMEDOUT');
        assert.match(child.stdout, /cycle-started/);
        result = { perf, kind, error: 'Timed out after 750 ms; child killed (SIGKILL)', observed: 0 };
      } else result = await probe(perf, kind);
      results.push(result);
      console.log(JSON.stringify(result));
      if (kind === 'workers') assert.match(result.error!, /Multithreading not yet implemented/);
      else if (kind === 'cycle') assert.match(result.error!, perf ? /Timed out/ : /Precedence cycles/);
      else if (!perf)
        assert.match(
          result.error!,
          kind === 'read' ? /not.*readable|didn't.*readable/ : kind === 'write' ? /writeable/ : /not writable/,
        );
      else if (kind === 'readonly') assert.match(result.error!, /not writable/);
      else assert.equal(result.error, null);
    });
  }
  await test(`Becsy ${perf ? 'perf' : 'checked'}: native order follows creation history, orderBy fixes stable-id order`, async () => {
    const a = await orderProbe(perf, false, [1, 2, 3]);
    const b = await orderProbe(perf, false, [3, 1, 2]);
    assert.notDeepEqual(a, b);
    assert.deepEqual(await orderProbe(perf, true, [1, 2, 3]), [1, 2, 3]);
    assert.deepEqual(await orderProbe(perf, true, [3, 1, 2]), [1, 2, 3]);
  });
}
fs.mkdirSync('.look/becsy-model', { recursive: true });
fs.writeFileSync('.look/becsy-model/enforcement.json', JSON.stringify(results, null, 2));
