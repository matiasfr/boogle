// The nightly live smoke test (.github/workflows/smoke.yml), also fine locally: two players join one room, see
// each other, the client digs, the client throws the ball, and both tabs end the same tick with the same per-state
// hashes. Uses only window handles (window.boogle, window.boogle.sync from src/features/debug-handle.js), so it runs
// on the built site too: `npm run scenario -- smoke --url https://matiasfr.github.io/boogle/`.
// Its room is SMOKE_ROOM (the nightly run rotates smoke-1..smoke-7, so it reuses rooms and loads their snapshots) or
// else a fresh smoke-<random> one; never a friend's room.
const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
const SYNC = 'const s = window.boogle.sync;';

export default {
  about: 'two tabs join, see each other, dig, throw the ball, and agree on every world hash',
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
    const met = `window.boogle.net.room && window.boogle.remotes.size >= 1`;
    const seen = [await A.waitFor(met, { timeout: 60000 }), await B.waitFor(met, { timeout: 60000 })];
    t.check(
      'the players see each other',
      seen.every((ms) => ms >= 0),
      `room ${room}, ${seen.join(' / ')} ms`,
    );
    const hasHandle = await A.eval(`return !!window.boogle.sync;`);
    if (!t.check('the build has the debug handle (window.boogle.sync)', hasHandle)) return;
    const roles = `(() => { ${SYNC} const w = s.worldStatus(); return w.ready && w.mode; })()`;
    await A.waitFor(roles, { timeout: 60000 });
    await B.waitFor(roles, { timeout: 60000 });
    const modes = [await A.eval(`return ${roles};`), await B.eval(`return ${roles};`)];
    const hostIdx = modes.indexOf('host');
    t.check(
      'one host and one client, both holding the world',
      [...modes].sort().join() === 'client,host',
      modes.join(),
    );
    if (hostIdx < 0) return;
    const [host, client] = hostIdx === 0 ? [A, B] : [B, A];

    // The client digs the diggable cell nearest a beach spot west of the court (skipping holes earlier runs in a
    // reused room dug near the -150 cm floor); the host sees the pit.
    const cell = await client.eval(`${SYNC} const { mask, delta, n } = s.terrain;
      for (let r = 0; r < 60; r++) for (let di = -r; di <= r; di++) for (const dj of [-r, r]) {
        const i = 190 + di, j = 186 + dj;
        if (mask[i * n + j] && delta[i * n + j] > -100) return { i, j, idx: i * n + j };
      }
      return null;`);
    if (!t.check('found a diggable beach cell', !!cell, JSON.stringify(cell))) return;
    const depth = `window.boogle.sync.terrain.delta[${cell.idx}]`;
    const before = await host.eval(`return ${depth};`);
    const sent = await client.eval(`${SYNC} return s.submitEdit({ op: 'dig', i: ${cell.i}, j: ${cell.j} });`);
    const dug = await host.waitFor(`${depth} < ${before}`, { timeout: 60000 });
    const why = `sent ${sent}, host ${before} -> ${await host.eval(`return ${depth};`)}, client ${await client.eval(`return ${depth};`)}`;
    t.check("the client's dig reaches the host", dug >= 0, `${dug} ms; ${why}`);

    // The client throws the ball: it takes ownership and the host watches it fly.
    const ballAt = `(() => { const p = window.boogle.ball.disp.p; return [p.x, p.y, p.z]; })()`;
    const from = await host.eval(`return ${ballAt};`);
    await client.eval(`${SYNC} s.tossBall(0.6);`);
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
    const same = !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
    t.check(
      'both tabs hash every state the same at one tick',
      same,
      `tick ${tick} host ${JSON.stringify(a)} client ${JSON.stringify(b)}`,
    );

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
