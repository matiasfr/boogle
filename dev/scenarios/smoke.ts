// The nightly live smoke test (.github/workflows/smoke.yml), also fine locally: two players join one room of the current
// game, see each other, the client renames itself (a shared roster edit the server accepts), the client throws the ball,
// and both tabs observe matching railway, roster and tune replicas at one server step. Uses only window handles, so it runs
// on the built site too: `npm run scenario -- smoke --url https://boogle.club/`.
// Its room is SMOKE_ROOM (the nightly run rotates smoke-1..smoke-7, so it reuses rooms and loads their snapshots) or
// else a fresh smoke-<random> one; never a friend's room.
import { MET, EDIT_WAIT_MS, roles, replicasAtOneStep } from './lib/world.ts';
import type { T } from './run.ts';
import type { Game } from '../look/lib.ts';

// The cheapest rendering the game offers, seeded into each tab's localStorage before the page's own code runs. These are
// the game's own graphics settings (src/graphics-settings.ts): the player allow-list (resolution, frame limit, MSAA,
// caustics) plus the Dev overrides (shadows, point lights, spray, snow, shafts, lens), which only read `boogle.dev.enabled`.
// They already exist on the deployed site, so the smoke needs no flag from the build it tests, and a player's default game is
// untouched. Nothing the checks read is skipped: they use the world, the net and the ball, not pixels (the stills only
// show the scene). Frame limit 30 halves the scene/output renders; the sim, net and hashes keep their callback cadence.
const LOW_COST = {
  player: { resolution: 0.6, frameLimit: 30, msaa: false, caustics: false },
  dev: {
    resolution: 0.6,
    frameLimit: 30,
    msaa: false,
    shadows: false,
    lights: false,
    caustics: false,
    bloom: false,
  },
};
const lowCostInit = `try {
  localStorage.setItem('boogle.graphics.v1', JSON.stringify({ version: 1, preset: 'custom', values: ${JSON.stringify(LOW_COST.player)} }));
  localStorage.setItem('boogle.dev.enabled', '1');
  localStorage.setItem('boogle.dev.graphics.v1', JSON.stringify({ version: 1, values: ${JSON.stringify(LOW_COST.dev)} }));
} catch {}`;

// SMOKE_DEPTH=light (the CI workflow, software rendering): connect, presence, a roster command and replica equality.
// The default, full, adds the ball's owner handover, which
// need a tab that draws at a few frames a second at least (the owner's Mac nightly, dev/daily).
const FULL = process.env.SMOKE_DEPTH !== 'light';
const PRESENCE_WAIT_MS = 240000;
// ?netdebug=2 logs every reconnect (src/netplay/net.ts); kept for the failure message.
const netLog: string[] = [];

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

export default {
  sourceImports: false,
  about: 'two tabs join, see each other, rename one, throw the ball, and agree on their server replicas',
  timeout: 960000, // generous: two software-rendered tabs on a busy runner (smoke.yml) drop to a few frames per second
  async run(t: T) {
    const room = process.env.SMOKE_ROOM || ('smoke-' + id).slice(0, 32);
    const size = [480, 300]; // small frames keep software GL fast enough for the world clock to run near real time
    // Each player gets a browser process of their own (two tabs of one browser share its GPU process, which is one
    // software rasteriser for both), at the lowest rendering cost (above). t.open returns only once that player is in the
    // world (the lobby click, then the debug handles), so Bob starts loading after Alice has joined, not alongside her.
    const A = await t.open({ name: 'Alice', room, size, query: 'netdebug=2', init: lowCostInit, ownBrowser: true });
    const B = await t.open({ name: 'Bob', room, size, query: 'netdebug=2', init: lowCostInit, ownBrowser: true });
    const worldErrors = new Map<Game, string[]>();
    for (const g of [A, B]) {
      const errs: string[] = [];
      worldErrors.set(g, errs);
      g.page.on(
        'console',
        (m) =>
          /\[ws-room\]|\[boogle\] net|reconnect/i.test(m.text()) &&
          netLog.push(`${g.name} ${Math.round(Date.now() / 1000) % 1000}s ${m.text().slice(0, 80)}`),
      );
      g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && errs.push(m.text()));
    }
    // Both wait at once: a starved tab's socket can drop and rejoin (ws-room's DEAD_MS), and each side only has to see
    // the other once. On failure, say what each tab's net looked like and which sockets reconnected.
    const seen = await Promise.all([
      A.waitFor(MET, { timeout: PRESENCE_WAIT_MS }),
      B.waitFor(MET, { timeout: PRESENCE_WAIT_MS }),
    ]);
    const net = (g: Game) =>
      g
        .eval(
          `const n = window.boogle.net; return JSON.stringify({ state: n.state, room: !!n.room, remotes: window.boogle.remotes.size, ready: window.boogle.sync.worldStatus().ready });`,
        )
        .catch((e: Error) => 'eval failed: ' + e.message);
    const met = t.check(
      'the players see each other',
      seen.every((ms) => ms >= 0),
      seen.every((ms) => ms >= 0)
        ? `room ${room}, ${seen.join(' / ')} ms`
        : `room ${room}, ${seen.join(' / ')} ms (-1: never within ${PRESENCE_WAIT_MS / 1000} s); Alice ${await net(A)} Bob ${await net(B)}; net log: ${netLog.slice(-12).join(' | ')}`,
    );
    if (!met) return; // the checks below need both players
    const hasHandle = await A.eval(`return !!window.boogle.sync;`);
    if (!t.check('the build has the debug handle (window.boogle.sync)', hasHandle)) return;
    const { modes, ok, host, client } = await roles(A, B);
    if (!t.check("both tabs hold the server's world", ok, modes.join())) return;

    // One tab renames itself (who.set, the roster edit the current game's server accepts from anyone); the other's
    // roster changes with it. A reused room may hold an older name, so each run picks a new one.
    const rename = `Smoke ${id.slice(-6)}`;
    const item = `window.boogle.sync.replica()?.roster.some(row => row[1] === ${JSON.stringify(rename)} && row[2] === 3)`;
    // A starved runner's tab may reconnect; retry an unchanged identity only when live.
    const LIVE = `window.boogle.net.state === 'live' && window.boogle.sync.worldStatus().ready`;
    const tossedAt = Date.now();
    const sent: unknown[] = [];
    let landed = -1;
    for (let k = 0; k < 3 && landed < 0; k++) {
      if ((await client.waitFor(LIVE, { timeout: 30000 })) < 0) continue;
      sent.push(
        await client.eval(
          `window.boogle.me.name = ${JSON.stringify(rename)}; window.boogle.me.colorIdx = 3;
           return window.boogle.sync.act('who.set', { n: ${JSON.stringify(rename)}, c: 3 });`,
        ),
      );
      landed = await host.waitFor(item, { timeout: EDIT_WAIT_MS / 3 });
    }
    t.check(
      "one tab's roster edit reaches the other",
      landed >= 0,
      `${landed < 0 ? -1 : Date.now() - tossedAt} ms; sent ${sent.join()}${landed < 0 ? `; Alice ${await net(A)} Bob ${await net(B)}; net log: ${netLog.slice(-12).join(' | ')}` : ''}`,
    );

    // The client throws the ball: it takes ownership and the host watches it fly.
    const ballAt = `(() => { const p = window.boogle.ball.pose.p; return [p.x, p.y, p.z]; })()`;
    if (FULL) {
      const from = await host.eval(`return ${ballAt};`);
      await client.eval(`window.boogle.sync.tossBall(0.6);`);
      // Two questions, so a failure says which: did the throw happen on the thrower's tab (it owns the ball and it left
      // the spot), and did that reach the other tab (it sees another tab's ball move). A tab drawing a frame a second
      // can be slow to act on the first; only the second is a sync problem.
      const ballState = (g: Game) =>
        g
          .eval(
            `const b = window.boogle.ball, p = b.pose.p; return JSON.stringify({ mine: b.mine, held: b.held, remoteOwned: b.remoteOwned, p: [p.x, p.y, p.z].map(Math.round) });`,
          )
          .catch((e: Error) => 'eval failed: ' + e.message);
      const threw = await client.waitFor(
        ([x, y, z]) => {
          const b = window.boogle.ball;
          const p = b.pose.p;
          return b.mine && !b.held && Math.hypot(p.x - x, p.y - y, p.z - z) > 1;
        },
        { timeout: 90000, arg: from },
      );
      const flew = await host.waitFor(
        ([x, y, z]) => {
          const b = window.boogle.ball;
          const p = b.pose.p;
          return !b.mine && b.remoteOwned && Math.hypot(p.x - x, p.y - y, p.z - z) > 1;
        },
        { timeout: 120000, arg: from },
      );
      const to = await host.eval(`return ${ballAt};`);
      t.check(
        'the thrown ball moves for the other player',
        flew >= 0,
        flew >= 0
          ? `${from.map(Math.round)} -> ${to.map(Math.round)}`
          : `${threw >= 0 ? 'thrown on the thrower tab (replication failed)' : 'never left the thrower tab (slow tab or no grab)'}; ${from.map(Math.round)} -> ${to.map(Math.round)}; thrower ${await ballState(client)} watcher ${await ballState(host)}`,
      );
    }

    const replicas = await replicasAtOneStep(host, client);
    t.check('both tabs agree on railway, roster and tuning at one server step', replicas.same, replicas.detail);
    const errs = [...worldErrors.get(host)!, ...worldErrors.get(client)!];
    const shots = [
      await A.still('Alice').catch(() => 'no Alice still'),
      await B.still('Bob').catch(() => 'no Bob still'),
    ];
    t.check('no [world] errors in either console', !errs.length, [...errs.slice(0, 2), ...shots].join(' | '));
    // Last, since the runner reads these after this returns. The CDN just after a deploy can 503 a file for a moment (runs
    // 41425998584, 41883882018). A file the game needs fails the checks above; lib.ts prints which file it was.
    const transient = (e: string) => e.includes('status of 503') || e.includes('response code (503)');
    for (const g of [A, B]) g.consoleErrors = g.consoleErrors.filter((e: string) => !transient(e));
  },
};
