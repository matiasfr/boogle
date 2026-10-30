// Two players in one room: a shared edit by one (a tossed mango) shows up for the other, and both worlds stay identical.
// Window handles only (window.boogle.sync, window.boogle.gifts), so `--url` works too.
const TOSS = (n) =>
  `window.boogle.sync.submitEdit({ op: 'gift.toss', i: 230, j: 205, k: 0, y: -1, n: ${n}, l: [0, 100, 0, 0, 0, 0] })`; // k 0 = coconut (the catalog index is pinned: append-only)
const ITEM = `window.boogle.gifts.items.some((it) => it.src === 2 && it.i === 230 && it.j === 205)`;

export default {
  about: 'player B tosses a coconut; player A sees the same item and the world hashes agree',
  timeout: 240000, // two software-rendered tabs: see the hash wait below
  async run(t) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room });
    const B = await t.open({ name: 'Bob', room });
    const connected = await B.waitFor(`window.boogle.net.room && window.boogle.remotes.size >= 1`, { timeout: 30000 });
    t.check('the players see each other', connected >= 0);
    const sent = await B.eval(`return ${TOSS('Date.now() % 1000')};`);
    t.check('the toss was accepted', sent === true, String(sent));
    const seen = await A.waitFor(ITEM, { timeout: 15000 });
    t.check("B's toss reaches A", seen >= 0, seen + ' ms');
    // The host broadcasts a world hash every 20 ticks (sync.js HASH_EVERY); the client counts matches. Two
    // software-rendered tabs can run well under 1 tick/s, so allow a whole hash period in wall time.
    await B.waitFor(`window.boogle.sync.worldStatus().hashOk > 0`, { timeout: 90000 });
    const stA = await A.eval(`return window.boogle.sync.worldStatus();`);
    const stB = await B.eval(`return window.boogle.sync.worldStatus();`);
    t.check(
      'no desync reported, hash checks ran',
      !stA.hashBad && !stB.hashBad && stA.hashOk + stB.hashOk > 0,
      `A ${JSON.stringify(stA)} B ${JSON.stringify(stB)}`,
    );
    const x = 230 * 1.25 - 255, // src/constants.js CELL, HALF
      z = 255 - 205 * 1.25;
    await A.view({ cam: [x + 5, 4, z + 5], look: [x, 0, z] });
    await A.still('A-sees-coconut');
  },
};
