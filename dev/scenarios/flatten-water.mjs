// Flattening sand at the shore reaches the shared water: the sim's copy of the ground follows the flatten, the sea
// flows into the levelled hollow, and a player who joins afterwards (whose snapshot load copies the ground fresh)
// stays in sync with the host. Guards the "flatten leaves the water sim on stale ground" desync.
const FIND = `
  const { terrain } = await import('/src/world/terrain-edits.js');
  const { water, region } = window.__water; const H = region.h;
  const { GRID_RES: N, HALF, CELL } = await import('/src/constants.js');
  const mid = Math.round(HALF / CELL); // the origin's cell
  // a beach cell 20-60 cm above the sea, editable with its 3x3, open sea (ground < -30 cm) within 2 cells, well inside
  // the simulated region (same idea as dig-channel)
  let pick = null;
  for (let i = region.i0 + 8; i < region.i0 + region.w - 8 && !pick; i++)
    for (let j = region.j0 + 8; j < region.j0 + region.h - 8 && !pick; j++) {
      const g = i * N + j, b = terrain.base[g];
      if (!terrain.mask[g] || b < 20 || b > 60 || Math.hypot(i - mid, j - mid) < 20) continue;
      let sandy = true, near = false;
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (!terrain.mask[(i + a) * N + j + c]) sandy = false;
      for (let a = -2; a <= 2; a++)
        for (let c = -2; c <= 2; c++) if (terrain.base[(i + a) * N + j + c] < -30) near = true;
      if (sandy && near) pick = { i, j, b };
    }
  window.__flat = { pick, w: pick && (pick.i - region.i0) * H + (pick.j - region.j0) };
  return { pick, n: N };`;

// Cells in the water region whose sim ground differs from terrain base + delta.
const STALE = `(async () => {
  const { terrain } = await import('/src/world/terrain-edits.js');
  const { water, region: r } = window.__water, n = Math.round(Math.sqrt(terrain.base.length));
  let bad = 0;
  for (let a = 0; a < r.w; a++) for (let b = 0; b < r.h; b++) {
    const g = (r.i0 + a) * n + r.j0 + b;
    if (water.terrain[a * r.h + b] !== terrain.base[g] + terrain.delta[g]) bad++;
  }
  return bad;
})()`;

const STATUS = `const s = (await import('/src/world/sync.js')).worldStatus();
  return { mode: s.mode, hashOk: s.hashOk, hashBad: s.hashBad, resyncs: s.resyncs, bad: s.lastBad?.keys };`;

export default {
  about: 'flatten at the shore: the water sim sees the new ground, the sea fills it, a late joiner stays in sync',
  timeout: 300000,
  async run(t) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room, size: [320, 200] });
    const host = await A.waitFor(
      `(async () => { const w = (await import('/src/world/sync.js')).worldStatus(); return w.ready && w.mode === 'host'; })()`,
      { timeout: 60000 },
    );
    if (!t.check('the first player hosts the room', host >= 0, host + ' ms')) return;
    const found = await A.eval(FIND);
    if (!t.check('found a flattenable shore cell', !!found.pick, JSON.stringify(found.pick))) return;
    const { i, j } = found.pick;
    const GROUND = `const { terrain } = await import('/src/world/terrain-edits.js'); const g = ${i * found.n + j};
      return terrain.base[g] + terrain.delta[g];`;
    // Flatten the 3x3 down toward -80 cm (40 cm off the centre, 20 cm off each neighbour per edit) until the centre
    // sits at least 40 cm below the sea. The host rate-limits edits by tick and a loaded tab ticks slowly, so wait a
    // few ticks between edits.
    let ground = found.pick.b;
    for (let k = 0; k < 12 && ground > -40; k++) {
      const tick = await A.eval(
        `const { submitEdit, world } = await import('/src/world/sync.js');
        submitEdit({ op: 'flatten', i: ${i}, j: ${j}, h: -80 }); return world.tick;`,
      );
      await A.waitFor(`(async () => (await import('/src/world/sync.js')).world.tick >= ${tick + 4})()`, {
        timeout: 15000,
      });
      ground = await A.eval(GROUND);
    }
    t.check('the flatten lowered the ground below the sea', ground <= -40, `centre ground ${ground} cm`);
    const synced = await A.waitFor(`${STALE}.then((bad) => bad === 0)`, { timeout: 5000 });
    const stale = await A.eval(`return ${STALE};`);
    t.check('the water sim ground equals terrain base + delta', synced >= 0, `${stale} stale cells`);
    const filled = await A.waitFor(`window.__water.water.depth[window.__flat.w] >= 30`, { timeout: 45000 });
    const depth = await A.eval(`return window.__water.water.depth[window.__flat.w]`);
    t.check('the sea fills the flattened hollow', filled >= 0, `depth ${depth} cm`);

    // A late joiner loads the snapshot, which copies the ground fresh: its water must match the host's.
    const B = await t.open({ name: 'Bob', room, size: [320, 200] });
    const joined = await B.waitFor(`window.boogle.net.room && window.boogle.remotes.size >= 1`, { timeout: 60000 });
    t.check('the late joiner connects', joined >= 0, joined + ' ms');
    // host hash rounds after the join: a stale-ground host fails the first one
    await B.waitFor(
      `(async () => { const s = (await import('/src/world/sync.js')).worldStatus(); return s.hashBad > 0 || s.hashOk >= 3; })()`,
      { timeout: 90000 },
    );
    const stA = await A.eval(STATUS);
    const stB = await B.eval(STATUS);
    t.check(
      'the late joiner stays in sync (no hash mismatch)',
      !stA.hashBad && !stB.hashBad && stB.hashOk > 0,
      `A ${JSON.stringify(stA)} B ${JSON.stringify(stB)}`,
    );
  },
};
