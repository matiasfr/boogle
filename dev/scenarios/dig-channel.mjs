// Digging a pit at the shoreline lets the sea flow in and fill it (shared water + terrain edits, one player).
const FIND_AND_DIG = `
  const { terrain } = await import('/src/world/terrain-edits.js');
  const { submitEdit } = await import('/src/world/sync.js');
  const { water, region } = window.__water; const H = region.h;
  const { GRID_RES: N, HALF, CELL } = await import('/src/constants.js');
  const mid = Math.round(HALF / CELL); // the origin's cell
  // a beach cell 20-60 cm above the sea, editable, with open sea (ground < -30 cm) within 3 cells
  let pick = null;
  for (let i = 4; i < N - 4 && !pick; i++) for (let j = 4; j < N - 4 && !pick; j++) {
    const g = i * N + j, b = terrain.base[g];
    if (!terrain.mask[g] || b < 20 || b > 60 || Math.hypot(i - mid, j - mid) < 20) continue;
    let near = false;
    for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (terrain.base[(i + a) * N + j + c] < -30) near = true;
    if (near) pick = { i, j, b };
  }
  window.__dig = { pick, w: (pick.i - region.i0) * H + (pick.j - region.j0) };
  return { pick, n: N, depthBefore: water.depth[window.__dig.w], x: pick.i * CELL - HALF, z: HALF - pick.j * CELL };`;

export default {
  about: 'dig a pit at the shore; the sea fills it',
  async run(t) {
    const g = await t.open({ name: 'digger' });
    const found = await g.eval(FIND_AND_DIG);
    t.check('found a diggable shore cell', !!found.pick, JSON.stringify(found.pick));
    const { x, z } = found;
    await g.view({ cam: [x + 5, 4, z + 5], look: [x, 0, z] });
    await t.sleep(1000);
    await g.still('before');
    for (let k = 0; k < 6; k++) {
      await g.eval(
        `const { submitEdit } = await import('/src/world/sync.js'); submitEdit({ op: 'dig', i: ${found.pick.i}, j: ${found.pick.j} });`,
      );
      await t.sleep(500);
    }
    const dug = await g.waitFor(
      `(async () => { const { terrain } = await import('/src/world/terrain-edits.js'); return terrain.delta[${found.pick.i * found.n + found.pick.j}] <= -100; })()`,
      { timeout: 15000 },
    );
    t.check('the pit is dug (ground lowered by 1 m or more)', dug >= 0);
    const filled = await g.waitFor(`window.__water.water.depth[window.__dig.w] >= 30`, { timeout: 45000 });
    const depth = await g.eval(`return window.__water.water.depth[window.__dig.w]`);
    await g.still('after');
    const m = await g.motion('fill', { frames: 6, seconds: 1.5 });
    t.check('the sea fills the pit with water', filled >= 0, `depth ${depth} cm; ${m.sheet}`);
  },
};
