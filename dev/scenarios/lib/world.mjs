// Page-code helpers shared by scenarios (strings for `g.eval` / `g.waitFor`, plus a few steps run on Game handles).
// This folder is not a scenario: run.mjs only lists the .mjs files directly in dev/scenarios/.

// ---- Window handles only (window.boogle, window.boogle.sync): safe for scenarios that also run on a built site
// (`--url`: smoke, reconnect-edit). Never add a /src/ import to this section.

// A tossed gift at a beach cell west of the court. k is the catalog index (0 seeds, which plant, 1 can, 2 frisbee; renumbered at each WORLD_NS bump); n is the
// toss's seed, a number or a page expression.
export const toss = (k = 1, n = 7) =>
  `window.boogle.sync.submitEdit({ op: 'gift.toss', i: 230, j: 205, k: ${k}, y: -1, n: ${n}, l: [0, 100, 0, 0, 0, 0] })`;
export const TOSSED = `window.boogle.gifts.items.some((it) => it.src === 0 && it.i === 230 && it.j === 205)`;
export const MET = `window.boogle.net.room && window.boogle.remotes.size >= 1`;
const ROLE = `(() => { const w = window.boogle.sync.worldStatus(); return w.ready && w.mode + (w.hostId === 'server' ? '@server' : ''); })()`;
const LEAD = `window.boogle.net.room.isLead()`;

// Waits until both tabs hold the world; `ok` when both follow the server's world (src/net/ws-room.ts: the server hosts
// every room). `host` is the lead tab (it runs the Boogler, addHostField), `client` the other; tests that only need two
// tabs use them as "this one" and "that one".
export async function roles(A, B) {
  for (const g of [A, B]) await g.waitFor(ROLE, { timeout: 60000 });
  const modes = [await A.eval(`return ${ROLE};`), await B.eval(`return ${ROLE};`)];
  const ok = modes.every((m) => m === 'client@server');
  const [host, client] = (await A.eval(`return ${LEAD};`)) ? [A, B] : [B, A];
  return { modes, ok, host, client };
}

// Both tabs hash every state at the end of the same tick, a second ahead; a resync can skip it, so retry.
export async function hashesAtOneTick(host, client) {
  let a = null,
    b = null,
    tick = 0;
  for (let k = 0; k < 3 && !(a && b); k++) {
    tick = (await host.eval(`return window.boogle.sync.world.tick;`)) + 10;
    for (const g of [host, client]) await g.eval(`window.boogle.sync.markHashes(${tick});`);
    const got = `window.boogle.sync.hashesAt(${tick}) || window.boogle.sync.world.tick > ${tick} + 5`;
    await host.waitFor(got, { timeout: 60000 });
    await client.waitFor(got, { timeout: 60000 });
    a = await host.eval(`return window.boogle.sync.hashesAt(${tick});`);
    b = await client.eval(`return window.boogle.sync.hashesAt(${tick});`);
  }
  return {
    same: !!a && !!b && JSON.stringify(a) === JSON.stringify(b),
    detail: `tick ${tick} host ${JSON.stringify(a)} client ${JSON.stringify(b)}`,
  };
}

// ---- Game modules (dev server only).

// Put the player at (x, z), standing on the ground unless `y` is given.
export const TP = (x, z, y) => `
  const { teleport } = await import('/src/physics/physics.js');
  const { groundHeight } = await import('/src/adapters/terrain.js');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y ?? `groundHeight(${x}, ${z}) + 0.6`}, ${z});
  b.velocity.set(0, 0, 0);`;
export const INV = `const I = await import('/src/player/inventory.js'); const H = await import('/src/player/hands.js');`;
// The item `toss()` made: its id, kind and world position.
export const TOSSED_ITEM = `
  const { CELL, HALF } = await import('/src/constants.ts');
  const it = window.boogle.gifts.items.find((it) => it.src === 0 && it.i === 230 && it.j === 205);
  return { id: it.id, kind: it.kind, x: it.i * CELL - HALF, z: HALF - it.j * CELL };`;
