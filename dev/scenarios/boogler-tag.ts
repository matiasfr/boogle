// The Boogler's tag stays quiet: at range only the small talk-bubble mark floats over his head; walk up close and his
// name plate (hearts, then the Talk prompt in reach) takes its place.
import { TP } from './lib/world.ts';
import type { T } from './run.ts';

const FACE = (x: string, z: string) => `
  const { cam } = await import('/src/player/player.ts');
  const p = window.boogle.me.body.position;
  cam.yaw = Math.atan2(-(${x} - p.x), -(${z} - p.z)); cam.pitch = -0.15;`;
// He wanders: step to `d` metres from him on every poll until `check` holds.
const at = (d: number, check: string) => `(async () => {
  const bog = window.boogle.boogler.disp;
  ${TP(`bog.x + ${d}`, 'bog.z')} ${FACE('bog.x', 'bog.z')}
  await new Promise((r) => setTimeout(r, 150));
  return ${check};
})()`;
const SIGN = `(() => {
  const tag = document.querySelector('.boogler-tag');
  return !!tag && !tag.hidden && tag.classList.contains('near');
})()`;

export default {
  about: "The Boogler's tag: a small mark at range, his name only up close",
  async run(t: T) {
    const g = await t.open({ name: 'looker', hud: 'play' });

    const farMs = await g.waitFor(at(20, `document.querySelector('.boogler-tag')?.hidden === false && !${SIGN}`), {
      timeout: 20000,
    });
    await g.wait(0.4);
    const far = await g.still('far');
    t.check('at 20 m he shows the mark, not his name', farMs >= 0, `${farMs} ms; ${far}`);

    const nearMs = await g.waitFor(at(5, SIGN), { timeout: 20000 });
    await g.wait(0.4);
    const near = await g.still('near');
    t.check('at 5 m his name plate shows', nearMs >= 0, `${nearMs} ms; ${near}`);
  },
};
