// TUNE_CONTROLLER_KEY=tunablesproofcontroller01 npm run look -- --players 2 --real --room proto-tuneproof --query 'dev=1&t.post.centre=0.24' --eval dev/look/evals/tunables-proof.ts --wall 240
// Needs a proto- room (the tune rule only allows those), the controller key in the server's env (look passes TUNE_CONTROLLER_KEY on), and shared writes only for railway.regrowMinutes, railway.recoveryMinutes (src/debug/dev/tunables.ts validate).
// Loaded through Vite by look's existing --eval. No new browser or harness.
const { identity } = (await import(
  '/src/player/identity.ts' as string
)) as typeof import('../../../src/player/identity.ts');
const { net, connectRoom } = (await import(
  '/src/netplay/net.ts' as string
)) as typeof import('../../../src/netplay/net.ts');
const { rules } = (await import(
  '/src/world/game-world.ts' as string
)) as typeof import('../../../src/world/game-world.ts');
const { snapshot, detachWorld, worldStatus } = (await import(
  '/src/world/sync.ts' as string
)) as typeof import('../../../src/world/sync.ts');
const { onTuneRecord } = (await import(
  '/src/tunables/events.ts' as string
)) as typeof import('../../../src/tunables/events.ts');
const { recordTuneSnapshot } = (await import(
  '/src/debug/dev/tunables.ts' as string
)) as typeof import('../../../src/debug/dev/tunables.ts');
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { exposureSettings } = (await import(
  '/src/render/exposure.ts' as string
)) as typeof import('../../../src/render/exposure.ts');

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
async function run() {
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
      id: 'railway.regrowMinutes',
      value: 60,
      expectedRevision: rules.tune.tune.revision,
    });
    const data = result.data as { requestId: string; status: string };
    assert(data.status === 'pending', 'shared write queued');
    await until(() => rules.tune.get('railRegrowMinutes') === 60, 'shared write applied');
    const applied = await api.run('tunables', 'status', { requestId: data.requestId });
    assert((applied.data as { status: string }).status === 'applied', 'correlated apply');
    const stale = await api.run('tunables', 'set', { id: 'railway.regrowMinutes', value: 70, expectedRevision: 0 });
    assert(!stale.ok, 'stale revision refused');
    const local = await api.run('tunables', 'set', { id: 'post.centre', value: 0.32 });
    assert(local.ok, 'local exposure applied');
    console.log('TUNABLES ' + JSON.stringify({ player, initial, applied, stale }));
  } else {
    await until(() => rules.tune.get('railRegrowMinutes') === 60, 'peer receives shared value');
    const denied = await api.run('tunables', 'set', { id: 'railway.regrowMinutes', value: 90 });
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
await run();

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
