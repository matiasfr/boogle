// Disposable --rail-seed proof: relocations frame the fixture; pickups, unloads and pulls use real interactions.
// gatedAction=1 leaves the last carried rails for --action: unload, wait full, pull, then lay in one real-time clip.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const {
  inspectRailway,
  line2Active,
  line2GateOpen,
  line2Jobs,
  line2SeaOpen,
  piles: pileRows,
  rail,
  railAccount,
  railAt,
  railPid,
  railRead,
  rw,
} = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { LINE2_STATIONS } = (await import(
  '/src/sim/railway-line2-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line2-layout.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const k = query.get('gated') === 'q4' ? 3 : 4;
const spec = LINE2_STATIONS[k]!;
const shot = window as Window & { __gatedPrepared?: boolean; __gatedDone?: boolean };
const bot = makeBot({
  recover: () => {
    throw new Error('Gated fixture must not recover');
  },
});
const read = () => inspectRailway()!;
/** Station k's row and its timed fields, flat. */
const job = () => {
  const j = line2Jobs(rw(), railAt())[k]!;
  return { ...j.job, ...j.run };
};
const down = () => (k === 3 ? line2GateOpen(rw()) : line2SeaOpen(rw()));
const acct = () => railAccount(rw(), railPid());
const pending = () => railRead()!.pending();
async function until(fn: () => unknown, label: string, ms = 180000) {
  if (!(await bot.until(fn, ms, label))) throw new Error(label);
}
await until(() => railRead()?.ready() && me.body, 'seed ready');
if (line2Active(rw()) !== k) throw new Error(`Requires Q${k + 1} active seed`);
const frame = read().line2View.frames[k]!;
const camera: [number, number, number] = [frame.x - 9, frame.y + 7, frame.z + 12];
const aim: [number, number, number] = [frame.x, frame.y + 1.8, frame.z];
function move(p: { x: number; y: number; z: number }, dx = 0.8, dz = 0.8) {
  teleport(me.body!, p.x + dx, p.y + 0.85, p.z + dz);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-dx, -dz) + Math.PI;
  cam.pitch = -0.1;
}
async function take(kind: 0 | 2) {
  await until(
    () => (kind === 0 ? rail(rw()).depot > 0 : rail(rw()).depotRails > 0),
    'cart delivered requested material',
  );
  const depot = read().line2View.depot!;
  const at = kind === 0 ? { x: depot[0]!, y: depot[1]!, z: depot[2]! } : read().line2View.shelf!;
  move(at);
  const id = kind === 0 ? 'railway-depot-logs' : 'railway-depot-rails';
  await until(() => interactTarget()?.id === id, `${id} offered`, 3000);
  const before = (kind === 0 ? acct()?.carry : acct()?.rails) ?? 0;
  bot.press();
  await until(() => ((kind === 0 ? acct()?.carry : acct()?.rails) ?? 0) > before, `${id} carried`, 3000);
  await until(() => pending() === 0, 'pickup confirmed', 3000);
}
async function unload(kind: 0 | 2) {
  const carried = (kind === 0 ? acct()?.carry : acct()?.rails) ?? 0;
  const stock = kind === 0 ? job().stock : job().railStock;
  // A supply pulse ages existing piles independently of this carry. Compare material, not its recovery clock.
  const piles = () => JSON.stringify(pileRows(rw()).map((p) => [p.x, p.z, p.kind, p.n]));
  const beforePiles = piles();
  move(frame, 0, 2.8);
  await wait(250);
  const origin = { ...me.body!.position };
  await until(
    () => ((kind === 0 ? acct()?.carry : acct()?.rails) ?? 0) === 0 && pending() === 0,
    'stationary automatic unload',
    10000,
  );
  if ((kind === 0 ? job().stock : job().railStock) !== stock + carried) throw new Error('unload lost material');
  if (piles() !== beforePiles) throw new Error(`unload changed ground material: ${beforePiles} -> ${piles()}`);
  if (Math.hypot(me.body!.position.x - origin.x, me.body!.position.z - origin.z) > 0.8)
    throw new Error('unload left reach');
  if (down() || job().start >= 0) throw new Error('gated delivery started laying');
  console.log(
    `GATED unloaded ${JSON.stringify({ k, kind, carried, stock: job().stock, rails: job().railStock, position: me.body!.position })}`,
  );
}
function fullWaiting() {
  if (
    job().stock !== spec.bill[0] ||
    job().railStock !== spec.bill[1] ||
    job().start !== -1 ||
    job().elapsed !== 0 ||
    down()
  )
    throw new Error('full gated frame did not wait');
  console.log(
    `GATED full waiting ${JSON.stringify({ job: job(), gateSolid: k === 3 ? read().line2View.gateSolid : read().line2View.seaGateSolid, piles: pileRows(rw()).length })}`,
  );
}
if (!shot.__gatedPrepared) {
  if (down()) throw new Error('Expected closed gate');
  for (const kind of [0, 2] as const) {
    for (let trip = 0; (kind === 0 ? job().stock : job().railStock) < spec.bill[kind === 0 ? 0 : 1]; trip++) {
      if (trip > 5) throw new Error('Too many fixture trips');
      await take(kind);
      if (kind === 2 && query.get('gatedAction') === '1' && job().railStock + (acct()?.rails ?? 0) >= spec.bill[1])
        break;
      await unload(kind);
    }
  }
  if (query.get('gatedAction') !== '1') fullWaiting();
  shot.__gatedPrepared = true;
} else {
  background(
    (async () => {
      await unload(2);
      await wait(2000);
      fullWaiting();
      const at = k === 3 ? read().line2View.lever : read().line2View.sea;
      move(at, 1.5, 0);
      const id = k === 3 ? 'railway-quarry-lever' : 'railway-sea-switch';
      await until(() => interactTarget()?.id === id, 'gate pull offered', 3000);
      bot.press();
      await until(() => down() && job().start >= 0 && pending() === 0, 'pull funds stocked frame', 5000);
      move(frame, 0, 4.2);
      await until(() => job().elapsed > 50 && read().line2View.head > spec.fromCm / 100, 'pull starts laying', 10000);
      console.log(`GATED laying ${JSON.stringify({ job: job(), head: read().line2View.head })}`);
      shot.__gatedDone = true;
    })(),
    'gated fill and pull proof',
  );
  setTimeout(() => {
    if (!shot.__gatedDone) throw new Error('Gated action missed its expected laying beat');
  }, 13000);
}
window.__debugCam!.set(camera, aim, 55);
setTimeout(() => window.__debugCam!.set(camera, aim, 55), 100);
export {};
