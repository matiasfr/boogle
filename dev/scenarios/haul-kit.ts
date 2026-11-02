// The haul playtest kit (docs/playtest-kits/haul.md), solo: in a proto- room with ?proto=haul the panel is open, a
// room-wide knob (the hard cap) changes the world, Reset haul empties it again; a normal room without the flag has no
// panel and refuses tuning. Serves DESIGN.md 1 (toys before chores).
import { TP } from './lib/world.ts';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }) => Promise<void>;
  still: (label: string) => Promise<unknown>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

const R = `const { rules } = await import('/src/world/game-world.ts'); const { identity } = await import('/src/player/identity.ts');`;
const count = `(async () => { ${R} return rules.stacks.count(identity.pid); })()`;

export default {
  about: 'the haul kit panel tunes a proto- room for everyone and resets its haul; without the flag, nothing',
  timeout: 240000,
  async run(t: Run) {
    const room = 'proto-hk' + Math.random().toString(36).slice(2, 6);
    const A = await t.open({ name: 'Solo', room, hud: true, query: 'proto=haul' });
    t.check('the panel is open', (await A.waitFor(`!!document.querySelector('.haul-kit.open .hk-row')`)) >= 0);

    await A.eval(`window.boogle.sync.submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'hard', v: 30 });`);
    const tuned = await A.waitFor(`(async () => { ${R} return rules.tune.get('hard') === 30; })()`, { timeout: 20000 });
    t.check('a room-wide knob reaches the world', tuned >= 0, tuned + ' ms');
    const shown = await A.waitFor(
      `[...document.querySelectorAll('.hk-row input[type=number]')].some((i) => i.value === '30')`,
    );
    t.check('the panel shows the room value', shown >= 0);

    await A.eval(`for (let id = 0; id < 12; id++) window.boogle.sync.submitEdit({ op: 'src.take', i: 0, j: 0, id });`);
    const full = await A.waitFor(`(async () => (await ${count}) === 30)()`, { timeout: 30000 });
    t.check('the tuned hard cap holds', full >= 0, String(await A.eval(`return ${count}`)));
    await A.eval(`${TP(13, 10)} window.boogle.me.yaw = Math.PI;`);
    await A.view({ cam: [17.5, 3.2, 13.5], look: [13, 1.6, 10] });
    await A.waitFor(
      `(() => { const p = window.boogle.me.avatar?.position; return p && Math.hypot(p.x - 13, p.z - 10) < 1; })()`,
    );
    await A.still('panel-open');
    await A.eval(`const b = document.querySelector('.hk-body'); b.scrollTop = b.scrollHeight;`);
    await A.still('panel-room');
    await A.eval(`document.querySelector('.hk-head').click();`);
    t.check('the panel collapses', !(await A.eval(`return !!document.querySelector('.haul-kit.open')`)));
    await A.still('panel-closed');
    await A.eval(`document.querySelector('.hk-head').click();`);

    await A.eval(`window.boogle.sync.submitEdit({ op: 'tune.reset', i: 0, j: 0 });`);
    const reset = await A.waitFor(`(async () => (await ${count}) === 0)()`, { timeout: 20000 });
    t.check('Reset haul empties the stack', reset >= 0, reset + ' ms');
    await A.eval(`window.boogle.sync.submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'hard', v: 60 });`);

    // A normal room without the flag: no panel, and the host refuses tuning.
    const B = await t.open({ name: 'Plain', room: 'hk' + Math.random().toString(36).slice(2, 6), hud: true });
    await B.eval(`window.boogle.sync.submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'hard', v: 30 });`);
    await B.eval(`${TP(13, 10)} window.boogle.me.yaw = Math.PI;`);
    await B.view({ cam: [17.5, 3.2, 13.5], look: [13, 1.6, 10] });
    await B.waitFor(
      `(() => { const p = window.boogle.me.avatar?.position; return p && Math.hypot(p.x - 13, p.z - 10) < 1; })()`,
    );
    await B.still('no-flag');
    t.check('no panel without the flag', !(await B.eval(`return !!document.querySelector('.haul-kit')`)));
    const hard = await B.eval(`${R} return rules.tune.get('hard');`);
    t.check('a normal room refuses tuning', hard === 60, String(hard));
    const errs = [...A.errors, ...B.errors];
    t.check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
  },
};
