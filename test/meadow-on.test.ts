// The meadow is on by default (owner, 14 November 2026; docs/game-design/place.md, "The meadow"): with no flag its
// lawn layer joins the ground material, and its keep map holds the rules for where things grow. Pure checks of the
// map and the flags, and one node graph built in Node (see test/meadow-off.test.ts); nothing is drawn.
import test from 'node:test';
import assert from 'node:assert/strict';

(globalThis as { location?: unknown }).location = { search: '' };
const flags = await import('../src/place/meadow-flags.ts');
const { homeGroundMaterial } = await import('../src/place/ground-material.ts');
const { KEEP_REACH, KEEP_W, keepBakeByFrame, meadowKeep } = await import('../src/place/meadow-field.ts');
const { FORMATION, GRID, LINES, LINKS, lineAt, offsetLat } = await import('../src/place/layout.ts');
const { TOWN_CENTRE, TOWN_COURT, TOWN_RING, TOWN_SLOTS, slotPoint, townBuilding } =
  await import('../src/place/town-plan.ts');
const { DEVICES, LEVER, SECRETS } = await import('../src/place/tech-layout.ts');
const { pathAt } = await import('../src/place/path-field.ts');

const keep = meadowKeep();
/** The keep map at a Place-local point: metres to the nearest kept thing (capped at the reach) and the density cap. */
function at(p: { x: number; z: number }) {
  const k = (Math.round(p.x - GRID.x0) + Math.round(p.z - GRID.z0) * KEEP_W) * 4;
  return { clear: (keep[k]! / 255) * KEEP_REACH, cap: keep[k + 1]! / 255 };
}

test('with no flag both parts of the meadow are on, and each can be asked for alone', async () => {
  assert.deepEqual(flags.MEADOW, { tint: true, flowers: true, tier: '' });
  const alone = async (search: string) => {
    (globalThis as { location?: unknown }).location = { search };
    const fresh: typeof flags = await import(`../src/place/meadow-flags.ts?${search}`);
    return fresh.MEADOW;
  };
  assert.deepEqual(await alone('?meadow=tint'), { tint: true, flowers: false, tier: '' });
  assert.deepEqual(await alone('?meadow=flowers&meadowTier=phone'), { tint: false, flowers: true, tier: 'phone' });
  assert.deepEqual(await alone('?meadow=off'), { tint: false, flowers: false, tier: '' });
});

test('with no flag the lawn layer loads and joins the ground material with its two maps', async () => {
  const ready = flags.meadowBeforeLand();
  assert.ok(ready);
  await ready;
  const layer = flags.meadowLawnLayer();
  assert.ok(layer);
  const names = (homeGroundMaterial(layer).toJSON() as { textures?: { name: string }[] }).textures?.map((t) => t.name);
  assert.ok(names?.includes('place-meadow-noise'));
  assert.ok(names?.includes('place-meadow-keep'));
});

test("flowers grow thinly on the Round's green and clear the statue and court", () => {
  assert.equal(at(TOWN_CENTRE).clear, 0);
  assert.equal(at(TOWN_COURT.centre).clear, 0);
  for (const bearing of [20, 110, 160, 290]) {
    const green = at(slotPoint(bearing, 9));
    assert.ok(green.clear >= 2, `green at ${bearing}`);
    assert.ok(green.cap < 0.6, `green cap at ${bearing}`);
  }
});

test('nothing grows in a building or plot, on a railway, or within 6 m of a secret, a device or the lever', () => {
  for (const slot of TOWN_SLOTS) assert.equal(at(townBuilding(slot.id)).clear, 0, slot.id);
  for (const line of [LINES.north, LINES.east])
    for (let k = 0; k < line.xs.length; k += 5) {
      const p = { x: line.xs[k]!, z: line.zs[k]! };
      if (p.x > GRID.x0 + 6 && p.x < GRID.x1 - 6 && p.z > GRID.z0 + 6 && p.z < GRID.z1 - 6)
        assert.equal(at(p).clear, 0, `rail ${k}`);
    }
  for (const p of [...SECRETS, ...Object.values(DEVICES), LEVER])
    for (const [dx, dz] of [
      [0, 0],
      [5, 0],
      [0, -5],
      [-3.5, 3.5],
    ] as const)
      assert.equal(at({ x: p.x + dx, z: p.z + dz }).clear, 0);
});

test('both tracks of a double formation are clear, sleeper ends and turnouts included', () => {
  const on = { x: 0, z: 0, ux: 0, uz: 1 };
  /** A point `across` metres off the up track's centre at `s` along a line. */
  const upTrack = (link: (typeof LINKS)[number], s: number, across: number) => {
    const lat = offsetLat(FORMATION[link.id], s);
    if (lat === null) return null;
    lineAt(link.line, s, on);
    return { x: on.x - on.uz * (lat + across), z: on.z + on.ux * (lat + across) };
  };
  // The review's case: the timber line at s 70.5, inside the up track's sleepers on its far side.
  for (const across of [-1.3, 0, 1.3]) assert.equal(at(upTrack(LINKS[0]!, 70.5, across)!).clear, 0, `timber ${across}`);
  let checked = 0;
  for (const link of LINKS)
    for (let s = FORMATION[link.id].from; s <= FORMATION[link.id].to; s += 2.5)
      for (const across of [-1.3, 0, 1.3]) {
        const p = upTrack(link, s, across);
        if (!p || p.x < GRID.x0 + 6 || p.x > GRID.x1 - 6 || p.z < GRID.z0 + 6 || p.z > GRID.z1 - 6) continue;
        assert.equal(at(p).clear, 0, `${link.id} s ${s} across ${across}`);
        checked++;
      }
  assert.ok(checked > 300);
});

test('the keep map does not start baking before a frame has been drawn, then bakes a slice a call', () => {
  let frames = 0,
    clock = 0,
    asked = 0;
  const step = keepBakeByFrame(
    () => frames,
    3,
    () => {
      asked++;
      return (clock += 2);
    },
  );
  for (let k = 0; k < 5; k++) assert.equal(step(), null);
  assert.equal(asked, 0, 'no work before the first frame');
  frames = 1;
  assert.equal(step(), null, 'one slice is not the whole bake');
  assert.ok(asked > 0);
  let map: Uint8Array | null = null,
    calls = 1;
  while (!map && calls < 10000) {
    map = step();
    calls++;
  }
  assert.ok(map && calls > 3, `baked over ${calls} calls`);
  assert.deepEqual(map, keep);
  assert.equal(step(), null);
});

test('the ring road is left to the path field: the keep map does not need to know it', () => {
  const road = slotPoint(45, (TOWN_RING.inner + TOWN_RING.outer) / 2);
  assert.ok(pathAt(road.x, road.z).edge < 0);
});
