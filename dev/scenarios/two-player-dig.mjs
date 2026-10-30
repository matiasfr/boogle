// Two players in one room: a dig by one shows up for the other, and both worlds stay identical.
export default {
  about: 'player B digs; player A sees the same ground and the world hashes agree',
  timeout: 240000, // two software-rendered tabs: see the hash wait below
  async run(t) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room });
    const B = await t.open({ name: 'Bob', room });
    const connected = await B.waitFor(`window.boogle.net.room && window.boogle.remotes.size >= 1`, { timeout: 30000 });
    t.check('the players see each other', connected >= 0);
    const N = 409,
      HALF = 255; // src/constants.js GRID_RES, HALF (1.25 m cells)
    // The diggable beach cell nearest a spot west of the court.
    const cell = await A.eval(`const { terrain } = await import('/src/world/terrain-edits.js');
      for (let r = 0; r < 60; r++) for (let di = -r; di <= r; di++) for (const dj of [-r, r]) {
        const i = 190 + di, j = 186 + dj;
        if (terrain.mask[i * ${N} + j]) return { i, j };
      }
      return null;`);
    t.check('found a diggable beach cell', !!cell, JSON.stringify(cell));
    const read = `const { terrain } = await import('/src/world/terrain-edits.js'); return terrain.delta[${cell.i * N + cell.j}];`;
    const before = await A.eval(read);
    await B.eval(
      `const { submitEdit } = await import('/src/world/sync.js'); submitEdit({ op: 'dig', i: ${cell.i}, j: ${cell.j} });`,
    );
    const seen = await A.waitFor(
      `(async () => { const { terrain } = await import('/src/world/terrain-edits.js'); return terrain.delta[${cell.i * N + cell.j}] < ${before}; })()`,
      { timeout: 15000 },
    );
    t.check("B's dig reaches A", seen >= 0, seen + ' ms');
    // The host broadcasts a world hash every 20 ticks (sync.js HASH_EVERY); the client counts matches. Two
    // software-rendered tabs can run well under 1 tick/s, so allow a whole hash period in wall time: a 30 s wait passed
    // or failed on where in the period the dig landed.
    await B.waitFor(`(async () => (await import('/src/world/sync.js')).worldStatus().hashOk > 0)()`, {
      timeout: 90000,
    });
    const stA = await A.eval(`const s = await import('/src/world/sync.js'); return s.worldStatus();`);
    const stB = await B.eval(`const s = await import('/src/world/sync.js'); return s.worldStatus();`);
    t.check(
      'no desync reported, hash checks ran',
      !stA.hashBad && !stB.hashBad && stA.hashOk + stB.hashOk > 0,
      `A ${JSON.stringify(stA)} B ${JSON.stringify(stB)}`,
    );
    await A.view({
      cam: [cell.i * 1.25 - HALF + 5, 4, HALF - cell.j * 1.25 + 5],
      look: [cell.i * 1.25 - HALF, 0, HALF - cell.j * 1.25],
    });
    await A.still('A-sees-pit');
  },
};
