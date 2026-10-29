// The caves: walk in at the south mouth, through the hub and the mine, out of the east mouth; balls thrown hard stay
// inside; the ball floats on the underground pond. Physics is stepped directly in the page (fast and repeatable).
const STEP_ROUTE = `
  const { world } = await import('/src/physics.js');
  const { SEGMENTS } = await import('/src/pois/caves/network.js');
  const { caveSd } = await import('/src/pois/caves/mesh.js');
  const { groundHeight } = await import('/src/terrain.js');
  const { GROUP } = await import('/src/physics.js');
  const { me } = window.boogle;
  const seg = (a, b) => SEGMENTS.find((s) => s.from === a && s.to === b).pts.map((p) => [p.x, p.z]);
  const route = [[-89.6, -90], ...seg('south', 'hub').slice(0, -1), [-91.5, -129], ...seg('hub', 'mine').slice(1, -1),
    [-66, -133], ...seg('mine', 'east').slice(1), [-25, -131]];
  const b = me.body;
  b.position.set(-89.6, groundHeight(-89.6, -88) + 1.2, -88);
  b.previousPosition.copy(b.position);
  b.velocity.set(0, 0, 0);
  let w = 0, best = Infinity, bestAt = 0, stuck = 0, wentIn = false, sank = 0;
  for (let k = 0; k < 60 * 120 && w < route.length; k++) {
    if (k % 120 === 0) await new Promise((r) => setTimeout(r, 0)); // let the browser breathe
    const [tx, tz] = route[w];
    const dx = tx - b.position.x, dz = tz - b.position.z, d = Math.hypot(dx, dz);
    if (d < 1.3) { w++; best = Infinity; bestAt = k; continue; }
    if (d < best - 0.3) { best = d; bestAt = k; }
    if (k - bestAt > 240) { stuck++; w++; best = Infinity; bestAt = k; continue; }
    me.wish.set(dx / d, 0, dz / d);
    world.step(1 / 60);
    if (!(b.collisionFilterMask & GROUP.SCENERY)) {
      wentIn = true;
      sank = Math.max(sank, 0.45 + caveSd(b.position.x, b.position.y, b.position.z)); // > 0: centre below its rest height
    }
  }
  me.wish.set(0, 0, 0);
  return { reached: w, of: route.length, stuck, wentIn, outside: !!(b.collisionFilterMask & GROUP.SCENERY), sank: +sank.toFixed(2) };`;

const THROWS = `
  const { world } = await import('/src/physics.js');
  const { ball, claimBall } = await import('/src/ball.js');
  const { caveSd } = await import('/src/pois/caves/mesh.js');
  const { NODES, POND } = await import('/src/pois/caves/network.js');
  claimBall(false);
  const bb = ball.body, ends = [];
  for (let n = 0; n < 8; n++) {
    const a = n * 2.399, up = (n % 4) * 0.25 - 0.2;
    bb.position.set(NODES.hub.x + 1.5, NODES.hub.y + 1.6, NODES.hub.z + 1.5);
    bb.previousPosition.copy(bb.position);
    bb.velocity.set(Math.cos(a) * 28, up * 28, Math.sin(a) * 28);
    for (let k = 0; k < 180; k++) {
      if (k % 30 === 0) await new Promise((r) => setTimeout(r, 0));
      world.step(1 / 60);
    }
    ends.push(+caveSd(bb.position.x, bb.position.y, bb.position.z).toFixed(2));
  }
  bb.position.set(POND.x, POND.level + 2, POND.z);
  bb.previousPosition.copy(bb.position);
  bb.velocity.set(0, 0, 0);
  for (let k = 0; k < 300; k++) {
    if (k % 30 === 0) await new Promise((r) => setTimeout(r, 0));
    world.step(1 / 60);
  }
  return { ends, pondY: +bb.position.y.toFixed(2), level: POND.level };`;

export default {
  about: 'walk through the caves; thrown balls stay inside; the ball floats on the pond',
  async run(t) {
    const g = await t.open({ name: 'caver', size: [480, 300] });
    const ready = await g.waitFor(`(async () => (await import('/src/pois/caves/index.js')).cavesReady())()`, {
      timeout: 60000,
    });
    t.check('the caves are built in the background', ready >= 0, ready + ' ms');
    const walk = await g.eval(STEP_ROUTE);
    t.check(
      'walked from the south mouth to the east mouth',
      walk.reached === walk.of && !walk.stuck,
      JSON.stringify(walk),
    );
    t.check('switched to the cave colliders inside and back outside', walk.wentIn && walk.outside);
    t.check('never sank into the cave floor', walk.sank < 0.25, walk.sank + ' m');
    const balls = await g.eval(THROWS);
    t.check(
      'hard throws stay in the cave (not in the rock)',
      balls.ends.every((d) => d < 0.3),
      balls.ends.join(' '),
    );
    t.check('the ball floats on the pond', Math.abs(balls.pondY - balls.level - 0.2) < 0.3, JSON.stringify(balls));
    await g.view({ cam: [-91, 6.4, -122], look: [-93, 5.5, -132] }, 72);
    await t.sleep(1500);
    t.check('hub still', true, await g.still('hub'));
    await g.view({ cam: [-110, 7.6, -126], look: [-123, 3.6, -132] }, 70);
    await t.sleep(1500);
    t.check('pond still', true, await g.still('pond'));
  },
};
