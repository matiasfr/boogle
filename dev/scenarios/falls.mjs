// Long falls anywhere on the island land on top of the ground, never through it: players dropped from 40 m (capped
// fall speed), balls from 80 m at 40 m/s (no cap, the net catches them), and a player pushed under the ground is put
// back on top. Points are spread over all the land, so new ground is covered as the island grows.
const DROPS = `
  const { groundProbe } = await import('/src/physics/physics.ts');
  const { stepFixed } = await import('/src/physics/engine.ts');
  const { ball, claimBall } = await import('/src/physics/ball.ts');
  const { groundHeight } = await import('/src/adapters/terrain.js');
  const { HALF, SEA } = await import('/src/constants.ts');
  const { me } = window.boogle;
  const b = me.body, clear = (body) => body.position.y - groundHeight(body.position.x, body.position.z);
  const put = (body, x, y, z, vx, vy, vz) => {
    body.position.set(x, y, z);
    body.previousPosition.set(body.position.x, body.position.y, body.position.z);
    body.velocity.set(vx, vy, vz);
  };
  const spots = [];
  for (let x = -HALF + 20; x < HALF - 20; x += 23)
    for (let z = -HALF + 20; z < HALF - 20; z += 23)
      if (groundHeight(x, z) > SEA + 1 && groundProbe.netted(x, z)) spots.push([x, z]);
  const pick = spots.filter((_, n) => n % Math.max(1, Math.floor(spots.length / 24)) === 0);
  claimBall(false);
  const through = [];
  let fastest = 0;
  for (const [x, z] of pick) {
    const g = groundHeight(x, z);
    put(b, x, g + 40, z, 5, 0, 3);
    put(ball.body, x + 3, g + 80, z, 0, -40, 0);
    let low = Infinity, ballLow = Infinity;
    for (let k = 0; k < 60 * 4; k++) {
      if (k % 60 === 0) await new Promise((r) => setTimeout(r, 0));
      stepFixed();
      fastest = Math.max(fastest, -b.velocity.y);
      low = Math.min(low, clear(b));
      ballLow = Math.min(ballLow, clear(ball.body));
    }
    // a centimetre-deep dip on impact is fine (the contact pushes it back out the top); ending under is not
    const end = clear(b), ballEnd = clear(ball.body);
    if (end < 0.3 || ballEnd < 0 || Math.min(low, ballLow) < -0.3)
      through.push([x, z, +low.toFixed(2), +end.toFixed(2), +ballLow.toFixed(2), +ballEnd.toFixed(2)]);
  }
  const [px, pz] = pick[0];
  put(b, px, groundHeight(px, pz) - 0.4, pz, 0, -5, 0);
  stepFixed();
  return { spots: pick.length, through, fastest: +fastest.toFixed(1), pushedClear: +clear(b).toFixed(2) };`;

export default {
  about: 'long falls land on the ground, never through it, anywhere on the island',
  async run(t) {
    const g = await t.open({ name: 'faller', size: [480, 300] });
    const r = await g.eval(DROPS);
    t.check('players and balls dropped from high up stay on top', r.spots > 10 && !r.through.length, JSON.stringify(r));
    t.check('falls are capped below tunnelling speed', r.fastest < 22, r.fastest + ' m/s');
    t.check('a player under the ground is put back on top', r.pushedClear > 0, r.pushedClear + ' m');
  },
};
