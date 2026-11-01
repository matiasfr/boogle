// A toss submitted while the room is reconnecting still lands (sync.js held edits, through real ws-room timing).
// One tab's socket drops (room.pause: closed as a network loss would, reconnects held for PAUSE_MS), so it goes to
// 'connecting'; it tosses then, and reconnects once the pause is over. (Chromium's offline mode spares localhost.) Once it is live
// again the other tab has the item, the tab dropped no held edit, and both tabs hash every state the same at one tick.
// Run it after changing held edits in src/world/sync.ts, reconnects in src/net/ws-room.ts, or src/netplay/net.ts
// attach/fail. Window handles only (window.boogle.sync, src/features/debug-handle.ts), so `--url` works too. Not in the
// nightly smoke: a forced drop adds timing flakiness to a job that files issues.
import { toss, TOSSED, MET, roles, hashesAtOneTick } from './lib/world.mjs';

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
const PAUSE_MS = 2000; // well under sync's 5 s held-edit age

export default {
  about: 'a tab drops off the network, tosses while reconnecting, and the toss lands once it is back',
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
    const { modes, ok, host: other, client } = await roles(A, B);
    if (!t.check("both tabs hold the server's world", ok, modes.join())) return;

    const before = await other.eval(`return ${TOSSED};`);
    if (!t.check('no toss item there yet', before === false, String(before))) return;
    await client.waitFor(`window.boogle.net.state === 'live'`, { timeout: 30000 });

    await client.eval(`window.boogle.net.room.pause(${PAUSE_MS});`);
    const down = await client.waitFor(`window.boogle.net.state === 'connecting'`, { timeout: 5000 });
    const sent = down >= 0 ? await client.eval(`return ${toss()};`) : null;
    if (
      !t.check(
        "the dropped tab goes to 'connecting' and tosses there",
        down >= 0 && sent === true,
        `${down} ms after the drop, submitEdit -> ${sent}`,
      )
    )
      return;

    const back = `window.boogle.net.state === 'live' && window.boogle.sync.worldStatus().ready`;
    const up = await client.waitFor(back, { timeout: 30000 });
    const after = await roles(A, B);
    t.check('the tab is live again on the server', up >= 0 && after.ok, `${up} ms; ${after.modes.join(',')}`);

    const landed = await other.waitFor(TOSSED, { timeout: 30000 });
    const st = await client.eval(`return window.boogle.sync.worldStatus();`);
    t.check(
      'the held toss reaches the other tab',
      landed >= 0,
      `other item ${await other.eval(`return ${TOSSED};`)}, own item ${await client.eval(`return ${TOSSED};`)}`,
    );
    t.check(
      'the tab dropped no held edit',
      st.heldDropped === 0,
      `heldDropped ${st.heldDropped}, resyncs ${st.resyncs}`,
    );

    const hashes = await hashesAtOneTick(other, client);
    t.check('both tabs hash every state the same at one tick', hashes.same, hashes.detail);
    // Stills are for a human reading a failure; on a starved machine a screenshot can time out, which is not one.
    for (const g of [A, B])
      console.log('  still', await g.still(g === client ? 'dropped' : 'other').catch((e) => e.message.split('\n')[0]));
  },
};
