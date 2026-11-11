// Owner-requested transition regression: execute coop.ts with inert presentation dependencies, without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['src/proto/place/coop.ts'], write: false, format: 'cjs' });
type Message = Record<string, unknown>;

function fixture() {
  const job = { awake: false, rung: { depot: true, trains: false }, tech: {}, boiler: 0 };
  const cart = { recallQueued: false };
  const world = { tick: 10 };
  let connected = true;
  const shared = () => ({ job: structuredClone(job), lines: [] });
  const messages: Message[] = [];
  let onMessage: (m: Message, from: string) => void = () => {};
  let onPresence: (r: Message, pr: Message) => void = () => {};
  let onConnection: (connected: boolean) => void = () => {};
  const room = {
    send: (m: Message) => {
      if (connected) messages.push(m);
    },
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
    '../../world/sync.ts': { world },
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
    '../../place/layout.ts': { GOODS: ['logs', 'rails', 'stone', 'beam'] },
    './depot.ts': { cartPlatform: {}, cart },
    './chop.ts': { chopHooks: {}, back: { big: null }, trunkTaken: () => false, setTrunkTaken: noop },
    './celebrate.ts': { clearMoments: noop, showBanner: noop },
    '../../place/pieces.ts': { clearTrips: noop },
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
        askStartOver(button: { textContent: string }): void;
        recallCart(): void;
        recallPending(): boolean;
        debug(): { gen: number };
      };
    },
  };
  vm.runInNewContext(compiled.outputFiles[0]!.text, {
    module: output,
    exports: output.exports,
    require: (name: string) => dependencies[name] ?? {},
    performance: { now: () => 1000 },
    setTimeout: noop,
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
    cart,
    world,
    messages,
    connection: (value: boolean) => {
      connected = value;
      onConnection(value);
    },
    recallAccepted: (gen: number) => onMessage({ t: 'place', k: 'cartRecallAccepted', gen, queued: true }, 'authority'),
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

test('a partitioned reset reconnect adopts the lower authority generation and accepts its recall reply', () => {
  const f = fixture();
  f.snap(0, true);
  f.coop.arrived();
  f.world.tick = 100;
  f.connection(false);
  const sent = f.messages.length;
  const button = { textContent: '' };
  f.coop.askStartOver(button);
  f.coop.askStartOver(button);
  assert.equal(f.coop.debug().gen, 1);
  assert.equal(f.messages.length, sent, 'the reset never reaches the authority during the partition');

  f.connection(true);
  f.snap(0, true);
  assert.equal(f.coop.debug().gen, 0, 'the unsynced follower adopts the current authority even after its local reset');
  assert.equal(f.job.awake, true);
  f.coop.recallCart();
  assert.equal(f.messages.at(-1)?.k, 'cartRecall');
  assert.equal(f.messages.at(-1)?.gen, 0, 'requests use the adopted authority generation');
  assert.equal(f.coop.recallPending(), true);
  f.recallAccepted(1);
  assert.equal(f.coop.recallPending(), true, 'a reply from the abandoned generation cannot settle the request');
  assert.equal(f.cart.recallQueued, false);
  f.recallAccepted(0);
  assert.equal(f.coop.recallPending(), false);
  assert.equal(f.cart.recallQueued, true, 'the authority reply settles the generation-checked request');
});
