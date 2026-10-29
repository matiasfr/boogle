// Two players in one room: a dig by one shows up for the other, and both worlds stay identical.
export default {
  about: 'player B digs; player A sees the same ground and the world hashes agree',
  async run(t) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room });
    const B = await t.open({ name: 'Bob', room });
    const connected = await B.waitFor(`window.boogle.net.room && window.boogle.remotes.size >= 1`, { timeout: 30000 });
    t.check('the players see each other', connected >= 0);
    const cell = { i: 70, j: 90 }; // beach, north-west of the court
    const read = `const { terrain } = await import('/src/world/terrain-edits.js'); return terrain.delta[${cell.i * 129 + cell.j}];`;
    const before = await A.eval(read);
    await B.eval(
      `const { submitEdit } = await import('/src/world/sync.js'); submitEdit({ op: 'dig', i: ${cell.i}, j: ${cell.j} });`,
    );
    const seen = await A.waitFor(
      `(async () => { const { terrain } = await import('/src/world/terrain-edits.js'); return terrain.delta[${cell.i * 129 + cell.j}] < ${before}; })()`,
      { timeout: 15000 },
    );
    t.check("B's dig reaches A", seen >= 0, seen + ' ms');
    // the host broadcasts a world hash every few ticks; the client counts matches
    await B.waitFor(`(async () => (await import('/src/world/sync.js')).worldStatus().hashOk > 0)()`, {
      timeout: 30000,
    });
    const stA = await A.eval(`const s = await import('/src/world/sync.js'); return s.worldStatus();`);
    const stB = await B.eval(`const s = await import('/src/world/sync.js'); return s.worldStatus();`);
    t.check(
      'no desync reported, hash checks ran',
      !stA.hashBad && !stB.hashBad && stA.hashOk + stB.hashOk > 0,
      `A ${JSON.stringify(stA)} B ${JSON.stringify(stB)}`,
    );
    await A.view({
      cam: [cell.i * 1.25 - 80 + 5, 4, 80 - cell.j * 1.25 + 5],
      look: [cell.i * 1.25 - 80, 0, 80 - cell.j * 1.25],
    });
    await A.still('A-sees-pit');
  },
};
