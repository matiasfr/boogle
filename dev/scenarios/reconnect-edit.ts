// An edit submitted while the room is reconnecting still lands (sync.ts held edits, through real ws-room timing), on
// the production entry. One tab's socket drops (room.pause: closed as a network loss would, reconnects held for
// PAUSE_MS), so it goes to 'connecting'; it changes its colour then (a `who.set`, the roster's op, the one classic edit
// the current game's server takes), and reconnects once the pause is over. (Chromium's offline mode spares localhost.)
// Once it is live again the other tab's roster has changed, the tab dropped no held edit, and both tabs hash every
// state the same at one tick. The tab's own colour is set too, so identity.ts does not send it back.
// Run it after changing held edits in src/world/sync.ts, reconnects in src/net/ws-room.ts, or src/netplay/net.ts
// attach/fail. Window handles only (window.boogle.sync, window.boogle.me), so `--url` works too. Not in the
// nightly smoke: a forced drop adds timing flakiness to a job that files issues.
import { EDIT_WAIT_MS, MET, roles, hashesAtOneTick } from './lib/world.ts';
import type { T } from './run.ts';

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
const PAUSE_MS = 2000; // well under sync's 5 s held-edit age
const ROSTER = `window.boogle.sync.stateHashes().roster`;
// The tab's colour, changed, as a held who.set; the tab's own state follows so identity.ts agrees with it.
const RECOLOUR = `const me = window.boogle.me, c = me.colorIdx === 0 ? 1 : 0;
  const sent = window.boogle.sync.submitEdit({ op: 'who.set', i: 0, j: 0, n: me.name, c });
  me.colorIdx = c;
  return sent;`;

export default {
  sourceImports: false,
  about: 'a tab drops off the network, edits while reconnecting, and the edit lands once it is back',
  timeout: 300000, // generous: two software-rendered tabs on a busy machine
  async run(t: T) {
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

    await client.waitFor(`window.boogle.net.state === 'live'`, { timeout: 30000 });
    // Both tabs have sent their own who.set by now (identity.ts, every 3 s at most): the roster is settled.
    await other.waitFor(`window.boogle.sync.worldStatus().ready`, { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 4000));
    const before = await other.eval(`return ${ROSTER};`);
    if (!t.check('the other tab has a roster', typeof before === 'number', String(before))) return;

    await client.eval(`window.boogle.net.room.pause(${PAUSE_MS});`);
    const down = await client.waitFor(`window.boogle.net.state === 'connecting'`, { timeout: 5000 });
    const sent = down >= 0 ? await client.eval(RECOLOUR) : null;
    if (
      !t.check(
        "the dropped tab goes to 'connecting' and edits there",
        down >= 0 && sent === true,
        `${down} ms after the drop, submitEdit -> ${sent}`,
      )
    )
      return;

    const back = `window.boogle.net.state === 'live' && window.boogle.sync.worldStatus().ready`;
    const up = await client.waitFor(back, { timeout: 30000 });
    const after = await roles(A, B);
    t.check('the tab is live again on the server', up >= 0 && after.ok, `${up} ms; ${after.modes.join(',')}`);

    const landed = await other.waitFor(`${ROSTER} !== ${String(before)}`, { timeout: EDIT_WAIT_MS });
    const st = await client.eval(`return window.boogle.sync.worldStatus();`);
    t.check(
      'the held edit reaches the other tab',
      landed >= 0,
      `roster hash ${String(before)} -> ${await other.eval(`return ${ROSTER};`)} (own ${await client.eval(`return ${ROSTER};`)})`,
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
