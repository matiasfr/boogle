// A toss submitted while the room is reconnecting still lands (sync.js held edits, through real peer-room timing).
// The HOST tab is stalled ~4.5 s with a busy loop, so the client hears nothing, says 'host silent' after DEAD_MS (3 s)
// and goes to 'connecting'; the client tosses then. (Stalling the client instead would freeze the tab that has to
// submit, and its frozen-timer guard would stop it declaring the host silent.) Once both tabs are live again the host
// has the item, the client dropped no held edit, and both tabs hash every state the same at one tick.
// Run it after changing held edits in src/world/sync.ts, reconnects in src/net/peer-room.js, or src/netplay/net.ts attach/fail.
// Window handles only (window.boogle.sync, src/features/debug-handle.js), so `--url` works too. Not in the nightly smoke:
// a forced stall adds timing flakiness to a job that files issues.
import { toss, TOSSED, MET, roles, hashesAtOneTick } from './lib/world.mjs';

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
const STALL_MS = 4000; // past peer-room's 3 s silence limit, with room left under sync's 5 s held-edit age

export default {
  about: 'the host stalls, the client tosses while reconnecting, and the toss lands once both are back',
  timeout: 300000, // generous: two software-rendered tabs on a busy machine
  async run(t) {
    const room = ('redit-' + id).slice(0, 32);
    const size = [480, 300];
    const A = await t.open({ name: 'Alice', room, size });
    const B = await t.open({ name: 'Bob', room, size });
    const seen = [await A.waitFor(MET, { timeout: 60000 }), await B.waitFor(MET, { timeout: 60000 })];
    if (
      !t.check(
        'the players see each other',
        seen.every((ms) => ms >= 0),
        `room ${room}, ${seen.join(' / ')} ms`,
      )
    )
      return;
    const { modes, ok, host, client } = await roles(A, B);
    if (!t.check('one host and one client', ok, modes.join())) return;

    const before = await host.eval(`return ${TOSSED};`);
    if (!t.check('no toss item there yet', before === false, String(before))) return;
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
    const sent = down >= 0 ? await client.eval(`return ${toss()};`) : null;
    await stall;
    if (
      !t.check(
        "the client sees the host go silent and tosses while 'connecting'",
        down >= 0 && sent === true,
        `${down} ms after the stall began, submitEdit -> ${sent}`,
      )
    )
      return;

    const back = `window.boogle.net.state === 'live' && window.boogle.sync.worldStatus().ready`;
    const up = [await host.waitFor(back, { timeout: 90000 }), await client.waitFor(back, { timeout: 90000 })];
    const after = await roles(A, B);
    t.check(
      'both tabs are live again with one host',
      up.every((ms) => ms >= 0) && after.ok,
      `${up.join(' / ')} ms; ${after.modes.join(',')}`,
    );

    const landed = await host.waitFor(TOSSED, { timeout: 30000 });
    const st = await client.eval(`return window.boogle.sync.worldStatus();`);
    t.check(
      'the held toss reaches the host',
      landed >= 0,
      `host item ${await host.eval(`return ${TOSSED};`)}, client item ${await client.eval(`return ${TOSSED};`)}`,
    );
    t.check(
      'the client dropped no held edit',
      st.heldDropped === 0,
      `heldDropped ${st.heldDropped}, resyncs ${st.resyncs}`,
    );

    const hashes = await hashesAtOneTick(host, client);
    t.check('both tabs hash every state the same at one tick', hashes.same, hashes.detail);
    // Stills are for a human reading a failure; on a starved machine a screenshot can time out, which is not one.
    for (const g of [A, B])
      console.log('  still', await g.still(g === host ? 'host' : 'client').catch((e) => e.message.split('\n')[0]));
  },
};
