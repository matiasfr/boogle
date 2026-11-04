// Imported by place-coop's &trees=1 route. Real two-peer harvest, replay, legacy-message and snapshot assertions.
const { net } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { coop, pairHook } = (await import(
  '/src/proto/place/coop.ts' as string
)) as typeof import('../../../src/proto/place/coop.ts');
const tree = (await import('/src/proto/place/chop.ts' as string)) as typeof import('../../../src/proto/place/chop.ts');
const state = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { cart } = (await import(
  '/src/proto/place/depot.ts' as string
)) as typeof import('../../../src/proto/place/depot.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => boolean, label: string) => {
  const end = performance.now() + 30000;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`TREE COOP timeout: ${label}`);
    await wait(80);
  }
};
const check = (label: string, ok: boolean, detail: unknown = '') => {
  if (!ok) throw new Error(`TREE COOP FAIL ${label}: ${JSON.stringify(detail)}`);
  console.log(`TREE COOP PASS ${label}: ${JSON.stringify(detail)}`);
};
const messages = new Map<string, Record<string, unknown>>();
const entered = new Set<string>();
const acknowledged = new Set<string>();
await until(() => !!net.room && !!me.body && coop.debug().peers.length > 0, 'partner joined');
net.room!.onMessage((raw) => {
  const m = raw as Record<string, unknown>;
  if (m.t !== 'treeProbe' || typeof m.phase !== 'string') return;
  if (m.ack === true) {
    acknowledged.add(m.phase);
    return;
  }
  messages.set(m.phase, m);
  // Only acknowledge phases this peer actually reached. Retrying a phase also gets
  // an acknowledgement after this peer has moved on, so listener startup cannot lose it.
  if (entered.has(m.phase)) net.room!.send({ t: 'treeProbe', phase: m.phase, ack: true });
});
const barrier = async (phase: string) => {
  entered.add(phase);
  if (messages.has(phase)) net.room!.send({ t: 'treeProbe', phase, ack: true });
  net.room!.send({ t: 'treeProbe', phase });
  const timer = setInterval(() => net.room!.send({ t: 'treeProbe', phase }), 200);
  try {
    await until(() => messages.has(phase) && acknowledged.has(phase), phase);
  } finally {
    clearInterval(timer);
  }
};
await barrier('ready');
await wait(2000);
check('current peers retain rail and ride capabilities', coop.railCart() && coop.rideCart());
const authority = coop.debug().amAuthority;
const t = tree.TREES[29]!;
const empty = () => {
  tree.back.logs = tree.back.rails = tree.back.stone = tree.back.incoming = 0;
  tree.back.big = null;
};
empty();
if (authority) {
  state.job.awake = state.job.rung.multi = true;
  state.job.rung.axe = state.job.rung.pack = 1;
  tree.applyTreeHarvest(t, { work: 5, issued: 5, ceiling: 15, revision: 1, fell: false, fallYaw: 0, collapsed: false });
}
const snapshot = () =>
  net.room!.send({
    t: 'placeCoopTrees1',
    k: 'snap',
    snap: { gen: coop.debug().gen, shared: state.captureShared() },
    force: true,
  });
if (authority) snapshot();
net.room!.onMessage((raw) => {
  const m = raw as Record<string, unknown>;
  if (authority && m.t === 'treeProbe' && m.phase === 'snapshotPlease') {
    snapshot();
    net.room!.send({ t: 'treeProbe', phase: 'snapshotSent' });
  }
});
await until(() => t.issued === 5 && state.job.rung.axe === 1, 'shared partial tree');
teleport(me.body!, t.x + (authority ? -2.2 : 2.2), t.y + 1.2, t.z + 0.8);
me.body!.velocity.set(0, 0, 0);
await barrier('partial');
if (!authority) {
  // Hold one outbound request while a real authority snapshot arrives, then release it unchanged.
  const room = net.room!;
  const send = room.send.bind(room);
  let held: Parameters<typeof room.send>[0] | null = null;
  room.send = (m) => {
    const message = m as Record<string, unknown>;
    if (message.t === 'placeCoopTrees1' && message.k === 'harvest') held = m;
    else send(m);
  };
  try {
    check('follower starts real chop', tree.chop(t));
    await until(() => !!held && !!coop.debug().harvestPending, 'outbound request reserved');
    send({ t: 'treeProbe', phase: 'snapshotPlease' });
    await until(() => messages.has('snapshotSent'), 'same-generation snapshot arrived');
    check('snapshot preserves five reserved bag slots', tree.back.room() === 11, tree.back.room());
  } finally {
    room.send = send;
  }
  if (held) send(held);
}
await until(() => t.issued === 10 && (authority || tree.back.logs === 5), 'follower accepted hit');
await barrier('follower award');
if (authority) {
  const receipt = coop.debug().harvestReceipts[0];
  check('authority retained receipt', !!receipt);
  for (let n = 0; n < 3; n++) net.room!.send({ t: 'placeCoopTrees1', k: 'harvested', ...receipt! });
}
await wait(500);
check('duplicate receipt awards once', tree.back.logs === (authority ? 0 : 5), tree.back.logs);
empty();
await barrier('final');
check('both start final swing', tree.chop(t));
await until(() => t.fall >= 0 && !coop.debug().harvestPending, 'final hit resolved');
net.room!.send({ t: 'treeProbe', phase: 'award', logs: tree.back.logs });
await until(() => messages.has('award'), 'partner award count');
check(
  'simultaneous final hits conserve five remaining logs',
  tree.back.logs + Number(messages.get('award')!.logs) === 5,
  { own: tree.back.logs, other: messages.get('award')!.logs },
);
check('both agree felled, exactly fifteen issued', t.issued === 15 && t.fall >= 0, tree.readTreeHarvest(t));
await wait(1200);
const before = JSON.stringify(tree.readTreeHarvest(t));
const cartBefore = JSON.stringify(cart);
net.room!.send({ t: 'placeCoop', k: 'reset', gen: coop.debug().gen + 50 });
net.room!.send({ t: 'placeCoop', k: 'chop', i: 28, n: 12, yaw: 0 });
net.room!.send({ t: 'placeCoop', k: 'cartCall' });
net.room!.send({ t: 'placeCoop', k: 'cartLoad', n: 16, manual: true });
net.room!.send({ t: 'placeCoop', k: 'cartRide', boost: true });
await wait(500);
check(
  'legacy reset and chop messages are harmless',
  JSON.stringify(tree.readTreeHarvest(t)) === before && tree.greatTree.fall < 0,
);
check('legacy cart call, load and ride messages are harmless', JSON.stringify(cart) === cartBefore);
await barrier('legacy ignored');
if (!authority) tree.resetTrees();
await barrier('restore snapshot');
if (authority) snapshot();
await until(() => t.issued === 15 && t.fall >= 0, 'snapshot restores cleared follower tree');
check('snapshot cannot award inventory', tree.back.logs <= 5, tree.back.logs);
const owned = tree.back.logs;
state.save();
tree.resetTrees();
empty();
check('local save restores accepted state', state.restore());
check('reload keeps felled state and exact personal award', t.fall >= 0 && t.issued === 15 && tree.back.logs === owned);
await barrier('restored');
// Model old presence on the wire as well as old messages. Capability fields alone
// must neither elect an older peer nor let its claimed ride/grip change this railway.
const presence = net.room!.presence.bind(net.room);
net.room!.presence = (p) =>
  presence({
    ...(p && typeof p === 'object' ? p : {}),
    placeCoopTrees1: null,
    placeCoop: 0,
    placeRailCart: 1,
    placeCartRide: 2,
    placeLongBeam: 0,
  });
net.room!.presence({});
await until(() => coop.debug().peers.length === 0, 'legacy peer excluded');
await wait(300);
check(
  'legacy capability and beam presence cannot affect current railway',
  coop.railCart() && coop.rideCart() && !coop.cartRider() && !pairHook.busy?.(),
);
await barrier('legacy presence ignored');
window.__debugCam!.set([t.x + 10, t.y + 7, t.z + 12], [t.x, t.y + 1, t.z], 50);
Object.assign(window, { __coopDone: true });
console.log(
  `TREE COOP complete: authority=${authority}, logs=${tree.back.logs}, state=${JSON.stringify(tree.readTreeHarvest(t))}`,
);
export {};
