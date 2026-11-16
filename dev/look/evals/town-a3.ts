// A3 proof segments, accepted server seed only; no row edits or invented rider rate.
// npm run look -- --rail-seed fares-running --eval dev/look/evals/town-a3.ts --query a3=till --name a3-till
// a3=approach: eye on the island-to-breaker path. a3=island: wait for a real home boarding edge.
// a3=far: the far crowd once its replicated count exceeds the 12 drawn figures.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const home = (await import(
  '/src/place/home-station.ts' as string
)) as typeof import('../../../src/place/home-station.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { rw, railRead, town, till, train, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { folk } = (await import('/src/place/folk.ts' as string)) as typeof import('../../../src/place/folk.ts');
const { RAIL_TRAINS } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { TRAIN_PHASE } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { boxCap } = (await import(
  '/src/sim/railway-queries-trade.ts' as string
)) as typeof import('../../../src/sim/railway-queries-trade.ts');
const mode = new URLSearchParams(location.search).get('a3') ?? 'till';
type V = [number, number, number];
const axis = (a: number, c: number, y: number): V => {
  const p = home.axisPoint(a, c);
  return [layout.toWorld(p.x), y, p.z];
};
const target: V = [layout.toWorld(home.TILL.x), home.HALL.floor + 1.5, home.TILL.z];
const island = mode === 'island';
const eye = island
  ? axis(17.5, home.ISLAND_C - 1.6, 21.5)
  : mode === 'approach'
    ? axis(4, home.ISLAND_C, 20.6)
    : axis(-10.7, home.ISLAND_C - 1.2, 20.5);
const aim: V = island ? axis(11.4, home.ISLAND_C + 1.0, 19.4) : target;
const body = me.body;
if (!body) throw new Error('A3 proof: player not mounted');
const stand = island ? axis(4, home.ISLAND_C - 1, 20) : axis(-10, home.ISLAND_C - 0.4, 19.3);
teleport(body, ...stand);
let atFar = false;
const setCam = () => {
  if (mode === 'far') {
    const g = folk.waiting.find((g) => g.camp === 1 && g.on);
    if (!g) return;
    const x = g.x + Math.cos(g.yaw) * 1.8,
      z = g.z - Math.sin(g.yaw) * 1.8;
    if (!atFar) {
      teleport(body, x, g.y + 0.6, z);
      atFar = true;
    }
    window.__debugCam?.set([x + Math.sin(g.yaw) * 10, g.y + 6, z + Math.cos(g.yaw) * 10], [x, g.y + 0.6, z], 60);
  } else window.__debugCam?.set(eye, aim, island ? 65 : 60);
};
setCam();
const hold = setInterval(setCam, 100);
const snapshot = () => ({
  mode,
  eye,
  aim,
  town: { ...town(rw(), 0) },
  till: { ...till(rw()) },
  cap: boxCap(rw(), railRead()!.trade()),
  waitingDrawn: [0, 1].map((end) => folk.waiting.filter((g) => g.camp === end && g.on).length),
  riders: RAIL_TRAINS.map((_, slot) => ({
    slot,
    count: train(rw(), slot).riders,
    drawn: folk.riders.filter((g) => g.camp === slot && g.on).length,
  })),
  scene: inspectRailway()?.owned,
});
console.log(`PLAY A3 START ${JSON.stringify(snapshot())}`);
let lastWaiting = town(rw(), 0).wait0;
const poll = setInterval(() => {
  if (!railRead()?.ready()) return;
  const row = town(rw(), 0);
  // Alighting and boarding can share one packet: a full train can remain at four. The crowd's fall is the edge.
  const boarded =
    row.wait0 < lastWaiting &&
    RAIL_TRAINS.some((_, slot) => {
      const r = train(rw(), slot);
      return r.riders > 0 && r.at === 0 && r.phase === TRAIN_PHASE.STAND;
    });
  lastWaiting = row.wait0;
  if (island && !boarded) return;
  if (mode === 'far' && row.wait1 <= 12) return;
  clearInterval(poll);
  // Let the row reach the next drawn frame before comparing its count to the cosmetic cast.
  setTimeout(() => {
    console.log(`PLAY A3 PROOF ${JSON.stringify(snapshot())}`);
    (window as Window & { __placeDone?: boolean }).__placeDone = true;
  }, 100);
}, 40);
setTimeout(
  () => {
    clearInterval(hold);
    clearInterval(poll);
  },
  mode === 'far' ? 2_000_000 : 240_000,
);
export {};
