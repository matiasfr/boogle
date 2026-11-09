// The lighthouse: walk up the outside spiral stair to the gallery deck (physics stepped in the page), then see the
// tower in the world's fixed daytime (there is no night to light the lamp).
import type { T } from './run.ts';
const CLIMB = `
  const { stepFixed } = await import('/src/physics/engine.ts');
  const { DECK_Y } = await import('/src/pois/lighthouse/index.ts');
  const { default: site, PAD_Y } = await import('/src/pois/lighthouse/site.ts');
  const { me } = window.boogle;
  const CX = site.x, CZ = site.z, b = me.body;
  const BASE = DECK_Y - 18; // tower foot = stair start
  b.position.set(CX + Math.cos(2.7) * 3.3, PAD_Y + 0.8, CZ + Math.sin(2.7) * 3.3); // on the plinth, just before the stair's foot
  b.previousPosition.set(b.position.x, b.position.y, b.position.z);
  b.velocity.set(0, 0, 0);
  let top = 0, k = 0;
  for (; k < 60 * 45; k++) {
    if (k % 120 === 0) await new Promise((r) => setTimeout(r, 0));
    const dx = b.position.x - CX, dz = b.position.z - CZ, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    const rt = 2.0 + 0.6 * Math.max(0, Math.min(1, 1 - (b.position.y - BASE) / 18)) + 0.68;
    // circle anticlockwise (the stair's way up), held at the stair's middle
    let wx = -Math.sin(a) + Math.cos(a) * Math.max(-0.6, Math.min(0.6, (rt - r) * 1.5));
    let wz = Math.cos(a) + Math.sin(a) * Math.max(-0.6, Math.min(0.6, (rt - r) * 1.5));
    if (r > 4.6) { wx = -dx; wz = -dz; } // head for the stair first
    const l = Math.hypot(wx, wz);
    me.wish.set(wx / l, 0, wz / l);
    stepFixed();
    top = Math.max(top, b.position.y);
    if (b.position.y > DECK_Y + 0.3 && r > 2.2 && r < 3.6) break;
  }
  me.wish.set(0, 0, 0);
  return { deck: +DECK_Y.toFixed(1), top: +top.toFixed(1), seconds: +(k / 60).toFixed(1) };`;

export default {
  island: true, // the classic island by the court (run.ts)
  about: 'climb the lighthouse stair to the deck',
  async run(t: T) {
    const g = await t.open({ name: 'keeper', size: [480, 300] });
    const climb = await g.eval(CLIMB);
    t.check('climbed the spiral stair to the gallery deck', climb.top > climb.deck, JSON.stringify(climb));
    await t.sleep(1000);
    t.check('on the deck', true, await g.still('deck'));
    // From the sea to the south-east, the whole tower (site.ts: x 6, z -58, its pad at 11 m). The old view looked out
    // to sea for the night beams, which went with the night (ded7aeed), so the still showed no tower.
    await g.view({ cam: [44, 22, -96], look: [6, 20, -58] }, 50);
    await t.sleep(2500);
    t.check('the tower by day', true, await g.still('tower'));
  },
};
