// The nightly live smoke test (.github/workflows/smoke.yml), also fine locally: two players join one room, see
// each other, the client tosses an item, the client throws the ball, and both tabs end the same tick with the same per-state
// hashes. Uses only window handles (window.boogle, window.boogle.sync from src/features/debug-handle.js), so it runs
// on the built site too: `npm run scenario -- smoke --url https://matiasfr.github.io/boogle/`.
// Its room is SMOKE_ROOM (the nightly run rotates smoke-1..smoke-7, so it reuses rooms and loads their snapshots) or
// else a fresh smoke-<random> one; never a friend's room.
import { toss, MET, roles, hashesAtOneTick } from './lib/world.mjs';

const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

export default {
  about: 'two tabs join, see each other, toss an item, throw the ball, and agree on every world hash',
  timeout: 300000, // generous: two software-rendered tabs on a busy runner can drop to a few frames per second
  async run(t) {
    const room = process.env.SMOKE_ROOM || ('smoke-' + id).slice(0, 32);
    const size = [480, 300]; // small frames keep software GL fast enough for the world clock to run near real time
    const A = await t.open({ name: 'Alice', room, size });
    const B = await t.open({ name: 'Bob', room, size });
    for (const g of [A, B]) {
      g.worldErrors = [];
      g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && g.worldErrors.push(m.text()));
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
    if (!t.check('one host and one client, both holding the world', ok, modes.join())) return;

    // The client tosses a coconut at a beach cell west of the court; the host sees the item.
    const nextId = await host.eval(`return window.boogle.gifts.nextId;`); // a reused room may hold an older toss
    const item = `window.boogle.gifts.items.some((it) => it.src === 2 && it.i === 230 && it.j === 205 && it.id >= ${nextId})`;
    const sent = await client.eval(`return ${toss(0, 'Date.now() % 1000')};`);
    const landed = await host.waitFor(item, { timeout: 60000 });
    t.check("the client's toss reaches the host", landed >= 0, `${landed} ms; sent ${sent}`);

    // The client throws the ball: it takes ownership and the host watches it fly.
    const ballAt = `(() => { const p = window.boogle.ball.disp.p; return [p.x, p.y, p.z]; })()`;
    const from = await host.eval(`return ${ballAt};`);
    await client.eval(`window.boogle.sync.tossBall(0.6);`);
    const flew = await host.waitFor(
      ([x, y, z]) => {
        const b = window.boogle.ball;
        const p = b.disp.p;
        return !b.mine && !!b.owner?.remote && Math.hypot(p.x - x, p.y - y, p.z - z) > 1;
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

    // And sync's own check (the host broadcasts per-state hashes every 2 s) ran on the client, without a mismatch.
    const ok0 = (await client.eval(`return window.boogle.sync.worldStatus().hashOk;`)) || 0;
    await client.waitFor(`window.boogle.sync.worldStatus().hashOk > ${ok0}`, { timeout: 60000 });
    const st = await client.eval(`return window.boogle.sync.worldStatus();`);
    const subs = Object.values(st.subsystems || {});
    t.check(
      "the client's hash checks pass for every state",
      st.hashOk > ok0 && !st.hashBad && subs.length > 0 && subs.every((v) => v === 'ok'),
      JSON.stringify({ hashOk: st.hashOk, hashBad: st.hashBad, resyncs: st.resyncs, subsystems: st.subsystems }),
    );
    const errs = [...host.worldErrors, ...client.worldErrors];
    const shots = [await A.still('Alice'), await B.still('Bob')];
    t.check('no [world] errors in either console', !errs.length, [...errs.slice(0, 2), ...shots].join(' | '));
  },
};
