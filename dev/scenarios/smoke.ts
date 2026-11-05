// The nightly live smoke test (.github/workflows/smoke.yml), also fine locally: two players join one room, see
// each other, the client tosses an item, the client throws the ball, and both tabs end the same tick with the same per-state
// hashes. Uses only window handles (window.boogle, window.boogle.sync from src/features/debug-handle.ts), so it runs
// on the built site too: `npm run scenario -- smoke --url https://boogle.club/`.
// Its room is SMOKE_ROOM (the nightly run rotates smoke-1..smoke-7, so it reuses rooms and loads their snapshots) or
// else a fresh smoke-<random> one; never a friend's room.
import { toss, MET, EDIT_WAIT_MS, roles, hashesAtOneTick } from './lib/world.ts';
import type { T } from './run.ts';
import type { Game } from '../look/lib.ts';

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

export default {
  sourceImports: false,
  about: 'two tabs join, see each other, toss an item, throw the ball, and agree on every world hash',
  timeout: 420000, // generous: two software-rendered tabs on a busy runner (smoke.yml) drop to a few frames per second
  async run(t: T) {
    const room = process.env.SMOKE_ROOM || ('smoke-' + id).slice(0, 32);
    const size = [480, 300]; // small frames keep software GL fast enough for the world clock to run near real time
    const A = await t.open({ name: 'Alice', room, size, query: 'classic=1' });
    const B = await t.open({ name: 'Bob', room, size, query: 'classic=1' });
    const worldErrors = new Map<Game, string[]>();
    for (const g of [A, B]) {
      const errs: string[] = [];
      worldErrors.set(g, errs);
      g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && errs.push(m.text()));
    }
    const seen = [await A.waitFor(MET, { timeout: 60000 }), await B.waitFor(MET, { timeout: 60000 })];
    t.check(
      'the players see each other',
      seen.every((ms) => ms >= 0),
      `room ${room}, ${seen.join(' / ')} ms`,
    );
    const hasHandle = await A.eval(`return !!window.boogle.sync;`);
    if (!t.check('the build has the debug handle (window.boogle.sync)', hasHandle)) return;
    const { modes, ok, host, client } = await roles(A, B);
    if (!t.check("both tabs hold the server's world", ok, modes.join())) return;

    // One tab tosses a frisbee at a beach cell west of the court; the other sees the item.
    const nextId = await host.eval(`return window.boogle.gifts.nextId;`); // a reused room may hold an older toss
    const item = `window.boogle.gifts.items.some((it) => it.src === 0 && it.i === 230 && it.j === 205 && it.id >= ${nextId})`;
    // A starved runner's tab drops and reopens its socket (runs 41421157347, 41418371480: reconnects for a minute or two),
    // and an edit caught in that gap is dropped by design (src/world/sync.ts, HELD_MAX_MS). So toss as a player would: when
    // live, and again if nothing came. Broken gifts still fail all three.
    const LIVE = `window.boogle.net.state === 'live' && window.boogle.sync.worldStatus().ready`;
    const tossedAt = Date.now();
    const sent: unknown[] = [];
    let landed = -1;
    for (let k = 0; k < 3 && landed < 0; k++) {
      if ((await client.waitFor(LIVE, { timeout: 30000 })) < 0) continue;
      sent.push(await client.eval(`return ${toss(1, 'Date.now() % 1000')};`));
      landed = await host.waitFor(item, { timeout: EDIT_WAIT_MS / 3 });
    }
    const dropped = await client.eval(`return window.boogle.sync.worldStatus().heldDropped;`);
    t.check(
      "one tab's toss reaches the other",
      landed >= 0,
      `${landed < 0 ? -1 : Date.now() - tossedAt} ms; sent ${sent.join()}; ${dropped} held edits dropped`,
    );

    // The client throws the ball: it takes ownership and the host watches it fly.
    const ballAt = `(() => { const p = window.boogle.ball.pose.p; return [p.x, p.y, p.z]; })()`;
    const from = await host.eval(`return ${ballAt};`);
    await client.eval(`window.boogle.sync.tossBall(0.6);`);
    const flew = await host.waitFor(
      ([x, y, z]) => {
        const b = window.boogle.ball;
        const p = b.pose.p;
        return !b.mine && b.remoteOwned && Math.hypot(p.x - x, p.y - y, p.z - z) > 1;
      },
      { timeout: 60000, arg: from },
    );
    const to = await host.eval(`return ${ballAt};`);
    t.check(
      'the thrown ball moves for the other player',
      flew >= 0,
      `${from.map(Math.round)} -> ${to.map(Math.round)}`,
    );

    const hashes = await hashesAtOneTick(host, client);
    t.check('both tabs hash every state the same at one tick', hashes.same, hashes.detail);

    // And sync's own check (the server broadcasts per-state hashes every 2 s) ran on the client, without a mismatch.
    // A long wait: on a CI runner's software WebGPU (the live-site run in smoke.yml) two tabs draw a few frames a
    // second and the client can take minutes to reach a hashed tick. It returns as soon as the check runs.
    const ok0 = (await client.eval(`return window.boogle.sync.worldStatus().hashOk;`)) || 0;
    await client.waitFor(`window.boogle.sync.worldStatus().hashOk > ${ok0}`, { timeout: 150000 });
    const st = await client.eval(`return window.boogle.sync.worldStatus();`);
    const subs = Object.values(st.subsystems || {});
    t.check(
      "the client's hash checks pass for every state",
      st.hashOk > ok0 && !st.hashBad && subs.length > 0 && subs.every((v) => v === 'ok'),
      JSON.stringify({ hashOk: st.hashOk, hashBad: st.hashBad, resyncs: st.resyncs, subsystems: st.subsystems }),
    );
    const errs = [...worldErrors.get(host)!, ...worldErrors.get(client)!];
    const shots = [await A.still('Alice'), await B.still('Bob')];
    t.check('no [world] errors in either console', !errs.length, [...errs.slice(0, 2), ...shots].join(' | '));
    // Last, since the runner reads these after this returns. The CDN just after a deploy can 503 a file for a moment (runs
    // 41425998584, 41883882018). A file the game needs fails the checks above; lib.ts prints which file it was.
    const transient = (e: string) => e.includes('status of 503') || e.includes('response code (503)');
    for (const g of [A, B]) g.consoleErrors = g.consoleErrors.filter((e: string) => !transient(e));
  },
};
