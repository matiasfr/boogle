// Loaded through Vite by look's existing --eval. No new browser or harness.
import { identity } from '../../../src/player/identity.ts';
import { net, connectRoom } from '../../../src/netplay/net.ts';
import { rules } from '../../../src/world/game-world.ts';
import { snapshot, detachWorld, worldStatus } from '../../../src/world/sync.ts';
import { onTuneRecord } from '../../../src/tunables/events.ts';
import { recordTuneSnapshot } from '../../../src/debug/dev/tunables.ts';
import { renderer } from '../../../src/render/scene.ts';
import { exposureSettings } from '../../../src/render/exposure.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, label: string) {
  const deadline = performance.now() + 60_000;
  while (!check()) {
    if (performance.now() > deadline) throw new Error(`Tunables: ${label}`);
    await wait(50);
  }
}
function assert(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`Tunables: ${label}`);
}
export async function run() {
  await until(() => !!window.boogle?.dev && worldStatus().ready && net.state === 'live', 'API/room ready');
  const api = window.boogle.dev!;
  await until(() => exposureSettings.centre === 0.24, 'URL exposure after Look restoration');
  const player = new URLSearchParams(location.search).get('player') ?? '1';
  const initial = await api.run('tunables', 'snapshot');
  const invalid = await api.run('tunables', 'set', { id: 'post.centre', value: -1 });
  assert(!invalid.ok, 'invalid value refused');
  if (player === '1') {
    // Disposable local harness controller, explicitly also supplied to its server environment.
    net.room?.close();
    detachWorld();
    net.room = null;
    identity.pid = 'tunectl001';
    identity.key = 'tunablesproofcontroller01';
    await connectRoom();
    await until(() => worldStatus().ready && net.state === 'live', 'controller reconnect');
    const result = await api.run('tunables', 'set', {
      id: 'haul.yield',
      value: 6,
      expectedRevision: rules.tune.tune.revision,
    });
    const data = result.data as { requestId: string; status: string };
    assert(data.status === 'pending', 'shared write queued');
    await until(() => rules.tune.get('yield') === 6, 'shared write applied');
    const applied = await api.run('tunables', 'status', { requestId: data.requestId });
    assert((applied.data as { status: string }).status === 'applied', 'correlated apply');
    const stale = await api.run('tunables', 'set', { id: 'haul.yield', value: 7, expectedRevision: 0 });
    assert(!stale.ok, 'stale revision refused');
    const local = await api.run('tunables', 'set', { id: 'post.centre', value: 0.32 });
    assert(local.ok, 'local exposure applied');
    console.log('TUNABLES ' + JSON.stringify({ player, initial, applied, stale }));
  } else {
    await until(() => rules.tune.get('yield') === 6, 'peer receives shared value');
    const denied = await api.run('tunables', 'set', { id: 'haul.yield', value: 9 });
    const requestId = (denied.data as { requestId: string }).requestId;
    let status = 'pending';
    // Poll through the bounded public API; never infer rejection from an unchanged value.
    for (let i = 0; i < 200 && status === 'pending'; i++) {
      const result = await api.run('tunables', 'status', { requestId });
      status = (result.data as { status: string }).status;
      if (status === 'pending') await wait(25);
    }
    assert(status === 'rejected', 'unauthorized request rejected');
    const local = await api.run('tunables', 'get', { id: 'post.centre' });
    assert((local.data as { value: number }).value === 0.24, 'exposure stays local');
    console.log('TUNABLES ' + JSON.stringify({ player, initial, unauthorized: status, local }));
  }
  const records: unknown[] = [];
  const off = onTuneRecord((kind, fields) => records.push({ kind, ...fields }));
  recordTuneSnapshot();
  off();
  console.log(
    'TUNABLES EXPORT ' +
      JSON.stringify({
        player,
        snapshot: (await api.run('tunables', 'snapshot')).data,
        diff: (await api.run('tunables', 'diff')).data,
        saved: snapshot().data.tune,
        records,
        render: renderer.info.render,
      }),
  );
}
