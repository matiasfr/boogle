// Owner-requested transition regression: execute coop.ts with inert presentation dependencies, without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['src/proto/place/coop.ts'], write: false, format: 'cjs' });
type Message = Record<string, unknown>;

function fixture() {
  const job = { awake: false, rung: {}, tech: {}, boiler: 0 };
  const shared = () => ({ job: structuredClone(job), lines: [] });
  const messages: Message[] = [];
  let onMessage: (m: Message, from: string) => void = () => {};
  let onPresence: (r: Message, pr: Message) => void = () => {};
  let onConnection: (connected: boolean) => void = () => {};
  const room = {
    send: (m: Message) => messages.push(m),
    onMessage: (fn: typeof onMessage) => {
      onMessage = fn;
    },
    onConnection: (fn: typeof onConnection) => {
      onConnection = fn;
    },
  };
  const noop = () => {};
  const dependencies: Record<string, object> = {
    'three/webgpu': { Vector3: class {} },
    '../../netplay/net.ts': {
      net: { myPeer: 'follower', room },
      remotes: new Map(),
      addPresenceField: noop,
      keepPresenceWhile: noop,
      onPeerRemoved: noop,
      onRoomReady: (fn: (value: typeof room) => void) => fn(room),
      onRemotePresence: (fn: typeof onPresence) => {
        onPresence = fn;
      },
    },
    '../../world/sync.ts': { world: { tick: 10 } },
    '../../features/haul-stack.ts': { backSeam: {} },
    './coop-identity.ts': { COOP_IDENTITY: 'place', currentCoopPeer: () => true },
    './job.ts': {
      COOP: true,
      job,
      captureShared: shared,
      save: noop,
      applyShared: (value: ReturnType<typeof shared>) => Object.assign(job, value.job),
      count: (n: unknown, max = 1e7) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max,
    },
    './lines.ts': { lines: [], machine: { flatbed: { platform: {} }, loco: { platform: {} } } },
    './layout.ts': { GOODS: ['logs', 'rails', 'stone', 'beam'] },
    './depot.ts': { cartPlatform: {} },
    './chop.ts': { chopHooks: {}, back: { big: null }, trunkTaken: () => false, setTrunkTaken: noop },
    './celebrate.ts': { clearMoments: noop, showBanner: noop },
    './pieces.ts': { clearTrips: noop },
    './got.ts': { resetGotHistory: noop },
    './big-cargo.ts': {
      bigCargo: {
        beam: { revision: 0, holder: null, ground: null },
        boiler: { revision: 0, holder: null, ground: null },
      },
    },
  };
  const output = {
    exports: {} as {
      coop: {
        setup(value: object): void;
        arrived(): void;
        debug(): { gen: number };
      };
    },
  };
  vm.runInNewContext(compiled.outputFiles[0]!.text, {
    module: output,
    exports: output.exports,
    require: (name: string) => dependencies[name] ?? {},
    performance: { now: () => 1000 },
    document: { hidden: false, addEventListener: noop },
    structuredClone,
    console: { warn: (...args: unknown[]) => assert.fail(`unexpected co-op warning: ${args}`) },
  });
  const { coop } = output.exports;
  coop.setup({
    run: { mode: 'asleep' },
    snapAll: noop,
    putMachine: noop,
    clearIncoming: noop,
    startOver: () => {
      job.awake = false;
    },
  });
  onPresence({ peer: 'authority', visible: true }, { place: 0 });
  return {
    coop,
    job,
    messages,
    onConnection,
    reset: (gen: number) => onMessage({ t: 'place', k: 'reset', gen }, 'authority'),
    snap: (gen: number, awake: boolean) =>
      onMessage({ t: 'place', k: 'snap', snap: { gen, shared: { job: { ...job, awake }, lines: [] } } }, 'authority'),
  };
}

test('a snapshot queued before arrival cannot undo a later reset from the same authority', () => {
  const f = fixture();
  f.snap(0, true);
  f.reset(1);
  f.coop.arrived();
  assert.equal(f.coop.debug().gen, 1);
  assert.equal(f.job.awake, false);
});

test('a current snapshot still initializes a newly arrived follower', () => {
  const f = fixture();
  f.snap(1, true);
  f.coop.arrived();
  assert.equal(f.coop.debug().gen, 1);
  assert.equal(f.job.awake, true);
});
