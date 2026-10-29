// A dig submitted while the room is reconnecting still lands (sync.js held edits, through real peer-room timing).
// The HOST tab is stalled ~4.5 s with a busy loop, so the client hears nothing, says 'host silent' after DEAD_MS (3 s)
// and goes to 'connecting'; the client digs then. (Stalling the client instead would freeze the tab that has to
// submit, and its frozen-timer guard would stop it declaring the host silent.) Once both tabs are live again the host
// has the pit, the client dropped no held edit, and both tabs hash every state the same at one tick.
// Run it after changing held edits in src/world/sync.js, reconnects in src/net/peer-room.js, or net.js attach/fail.
// Window handles only (window.boogle.sync, src/features/debug-handle.js), so `--url` works too. Not in the nightly smoke:
// a forced stall adds timing flakiness to a job that files issues.
const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
const SYNC = 'const s = window.boogle.sync;';
const STALL_MS = 4500;

export default {
  about: 'the host stalls, the client digs while reconnecting, and the dig lands once both are back',
  timeout: 300000, // generous: two software-rendered tabs on a busy machine
  async run(t) {
    const room = ('rdig-' + id).slice(0, 32);
    const size = [480, 300];
    const A = await t.open({ name: 'Alice', room, size });
    const B = await t.open({ name: 'Bob', room, size });
    const met = `window.boogle.net.room && window.boogle.remotes.size >= 1`;
    const seen = [await A.waitFor(met, { timeout: 60000 }), await B.waitFor(met, { timeout: 60000 })];
    if (
      !t.check(
        'the players see each other',
        seen.every((ms) => ms >= 0),
        `room ${room}, ${seen.join(' / ')} ms`,
      )
    )
      return;
    const roles = `(() => { ${SYNC} const w = s.worldStatus(); return w.ready && w.mode; })()`;
    await A.waitFor(roles, { timeout: 60000 });
    await B.waitFor(roles, { timeout: 60000 });
    const modes = [await A.eval(`return ${roles};`), await B.eval(`return ${roles};`)];
    if (!t.check('one host and one client', [...modes].sort().join() === 'client,host', modes.join())) return;
    const [host, client] = modes[0] === 'host' ? [A, B] : [B, A];

    const cell = await client.eval(`${SYNC} const { mask, delta, n } = s.terrain;
      for (let r = 0; r < 60; r++) for (let di = -r; di <= r; di++) for (const dj of [-r, r]) {
        const i = 190 + di, j = 186 + dj;
        if (mask[i * n + j] && delta[i * n + j] > -100) return { i, j, idx: i * n + j };
      }
      return null;`);
    if (!t.check('found a diggable beach cell', !!cell, JSON.stringify(cell))) return;
    const depth = `window.boogle.sync.terrain.delta[${cell.idx}]`;
    const before = await host.eval(`return ${depth};`);
    const live = `window.boogle.net.state === 'live'`;
    await client.waitFor(live, { timeout: 30000 });

    // Freeze the host's main thread. Not awaited: the client has to keep running meanwhile.
    const stall = host.page
      .evaluate((ms) => {
        const end = Date.now() + ms;
        while (Date.now() < end);
      }, STALL_MS)
      .catch((e) => e);
    const down = await client.waitFor(`window.boogle.net.state === 'connecting'`, { timeout: STALL_MS + 3000 });
    const sent =
      down >= 0 ? await client.eval(`${SYNC} return s.submitEdit({ op: 'dig', i: ${cell.i}, j: ${cell.j} });`) : null;
    await stall;
    if (
      !t.check(
        "the client sees the host go silent and digs while 'connecting'",
        down >= 0 && sent === true,
        `${down} ms after the stall began, submitEdit -> ${sent}`,
      )
    )
      return;

    const back = `(() => { ${SYNC} return window.boogle.net.state === 'live' && s.worldStatus().ready; })()`;
    const up = [await host.waitFor(back, { timeout: 90000 }), await client.waitFor(back, { timeout: 90000 })];
    const after = [await A.eval(`return ${roles};`), await B.eval(`return ${roles};`)];
    t.check(
      'both tabs are live again with one host',
      up.every((ms) => ms >= 0) && [...after].sort().join() === 'client,host',
      `${up.join(' / ')} ms; ${after.join(',')}`,
    );

    const dug = await host.waitFor(`${depth} < ${before}`, { timeout: 30000 });
    const st = await client.eval(`${SYNC} return s.worldStatus();`);
    t.check(
      "the held dig reaches the host's terrain",
      dug >= 0,
      `host ${before} -> ${await host.eval(`return ${depth};`)}, client ${await client.eval(`return ${depth};`)}`,
    );
    t.check(
      'the client dropped no held edit',
      st.heldDropped === 0,
      `heldDropped ${st.heldDropped}, resyncs ${st.resyncs}`,
    );

    // Both tabs hash every state at the end of the same tick, a second ahead; a resync can skip it, so retry.
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
    t.check(
      'both tabs hash every state the same at one tick',
      !!a && !!b && JSON.stringify(a) === JSON.stringify(b),
      `tick ${tick} host ${JSON.stringify(a)} client ${JSON.stringify(b)}`,
    );
    // Stills are for a human reading a failure; on a starved machine a screenshot can time out, which is not one.
    for (const g of [A, B])
      console.log('  still', await g.still(g === host ? 'host' : 'client').catch((e) => e.message.split('\n')[0]));
  },
};
