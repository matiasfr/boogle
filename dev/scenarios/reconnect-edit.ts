// An identity changed while the room is reconnecting lands through its server command session, on
// the production entry. One tab's socket drops (room.pause: closed as a network loss would, reconnects held for
// PAUSE_MS), so it goes to 'connecting'; it changes its local colour, then identity.ts sends durable who.set when
// its session is ready again. (Chromium's offline mode spares localhost.)
// Once it is live again the other tab's roster has changed and both tabs observe the same published replica.
// The tab's own colour is set too, so identity.ts does not send it back.
// Run it after changing command reconnects, src/net/ws-room.ts, or src/netplay/net.ts
// attach/fail. Window handles only (window.boogle.sync, window.boogle.me), so `--url` works too. Not in the
// nightly smoke: a forced drop adds timing flakiness to a job that files issues.
import { EDIT_WAIT_MS, MET, roles, replicasAtOneStep } from './lib/world.ts';
import type { T } from './run.ts';

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
const PAUSE_MS = 2000;
const ROSTER = `JSON.stringify((await import('/src/world/game-world.ts')).rules.roster.roster.colors)`;
// The tab's colour, changed, as a held who.set; the tab's own state follows so identity.ts agrees with it.
const RECOLOUR = `const me = window.boogle.me, c = me.colorIdx === 0 ? 1 : 0;
  me.colorIdx = c;
  return true;`;

export default {
  sourceImports: true, // the colour check imports the roster and identity from the source
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
    if (!t.check('the other tab has a roster', typeof before === 'string' && before !== '[]', String(before))) return;

    await client.eval(`window.boogle.net.room.pause(${PAUSE_MS});`);
    const down = await client.waitFor(`window.boogle.net.state === 'connecting'`, { timeout: 5000 });
    const sent = down >= 0 ? await client.eval(RECOLOUR) : null;
    if (
      !t.check(
        "the dropped tab goes to 'connecting' and edits there",
        down >= 0 && sent === true,
        `${down} ms after the drop, local colour changed -> ${sent}`,
      )
    )
      return;

    const back = `window.boogle.net.state === 'live' && window.boogle.sync.worldStatus().ready`;
    const up = await client.waitFor(back, { timeout: 30000 });
    const after = await roles(A, B);
    t.check('the tab is live again on the server', up >= 0 && after.ok, `${up} ms; ${after.modes.join(',')}`);

    const landed = await other.waitFor(`${ROSTER} !== ${JSON.stringify(before)}`, { timeout: EDIT_WAIT_MS });
    t.check(
      'the identity command reaches the other tab after reconnect',
      landed >= 0,
      `roster hash ${String(before)} -> ${await other.eval(`return ${ROSTER};`)} (own ${await client.eval(`return ${ROSTER};`)})`,
    );
    // The roster change must be the held edit itself: the dropped tab's colour, read from the other tab's roster.
    const pid = await client.eval(`const { identity } = await import('/src/player/identity.ts'); return identity.pid;`);
    const want = await client.eval(`return window.boogle.me.colorIdx;`);
    const roster = await other.eval(
      `const { rules } = await import('/src/world/game-world.ts'); const k = rules.roster.indexOf(${JSON.stringify(pid)});
       return k < 0 ? null : rules.roster.colorOf(k);`,
    );
    t.check(
      "the other tab's roster has the dropped tab's new colour",
      roster === want,
      `${String(pid)}: roster ${String(roster)}, wanted ${String(want)}`,
    );
    const replicas = await replicasAtOneStep(other, client);
    t.check('both tabs agree on railway, roster and tuning at one server step', replicas.same, replicas.detail);
    // Stills are for a human reading a failure; on a starved machine a screenshot can time out, which is not one.
    for (const g of [A, B])
      console.log('  still', await g.still(g === client ? 'dropped' : 'other').catch((e) => e.message.split('\n')[0]));
  },
};
