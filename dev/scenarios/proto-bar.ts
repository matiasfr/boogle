// The in-game prototype bar (src/proto/bar/, ?proto=...) on an iPad-sized touch screen over the soapbox prototype:
// it shows the card's title and question, drops you at the card's spawn, saves a one-tap verdict to the protos page's
// store, and a variant switch is live (soapbox handling: no reload) and keeps your spot, with the switch counted. Serves DESIGN.md "How we work".

type Game = {
  page: { waitForURL: (u: RegExp, o?: { timeout?: number }) => Promise<void>; click: (sel: string) => Promise<void> };
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  still: (label: string) => Promise<string>;
  errors: string[];
};
type Run = {
  open: (o: {
    name: string;
    room: string;
    hud?: boolean;
    query?: string;
    size?: number[];
    touch?: boolean;
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const SPAWN = `(await import('/protos/protos.ts')).PROTOS.find((p) => p.id === 'soapbox').spawn`;
const AT = `const s = ${SPAWN}; const p = window.boogle.me.body.position; return Math.hypot(p.x - s.x, p.z - s.z);`;
const STORE = `return JSON.parse(localStorage.getItem('boogle-protos-v1') || '{}').soapbox ?? {};`;

export default {
  about: 'the prototype bar: question, spawn next to the verb, one-tap verdict, variant switch keeps your spot',
  timeout: 240000,
  async run(t: Run) {
    const room = 'proto-bar' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({
      name: 'solo',
      room,
      hud: true,
      touch: true,
      size: [1194, 834],
      query: 'proto=soapbox',
    });
    const up = await g.waitFor(`!!document.querySelector('.proto-bar')`, { timeout: 60000 });
    t.check('the bar is up', up >= 0);
    const text = String(await g.eval(`return document.querySelector('.proto-bar').textContent;`));
    t.check('it shows the title and question', text.includes('Soapbox cart') && text.includes('Is driving fun?'), text);
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 30000 });
    await t.sleep(1000);
    const d = Number(await g.eval(AT));
    t.check('you start at the card’s spawn', d < 2, `${d.toFixed(2)} m away`);

    await g.eval(`document.querySelector('.first-run-close')?.click(); document.querySelector('.pb-yes').click();`);
    await g.eval(
      `const n = document.querySelector('.pb-note'); n.value = 'drifts feel great'; n.dispatchEvent(new Event('input')); n.blur();`,
    );
    await t.sleep(1500); // a few seconds in the prototype
    const shot = await g.still('ipad');
    t.check('still: the bar at iPad size', true, shot);
    const s = (await g.eval(STORE)) as { verdict?: string; verdictNote?: string };
    t.check('the verdict is saved for the protos page', s.verdict === 'yes' && s.verdictNote === 'drifts feel great');

    // Move off the spawn, switch to drifty: the handling changes live, no reload, and you stay where you stood.
    await g.eval(`const { teleport } = await import('/src/physics/physics.ts');
      const s = ${SPAWN}; const b = window.boogle.me.body; teleport(b, s.x + 3, b.position.y, s.z + 2);`);
    await t.sleep(300);
    await g.eval(
      `window.__barMark = 1; [...document.querySelectorAll('.pb-variants button')].find((b) => b.textContent === 'drifty').click();`,
    );
    await g.page.waitForURL(/v=drifty/, { timeout: 30000 });
    await t.sleep(1000);
    const grip = await g.eval(`return [window.__barMark === 1, window.__soapbox.T.grip];`);
    t.check(
      'drifty switches live (no reload), with its handling',
      JSON.stringify(grip) === '[true,32]',
      JSON.stringify(grip),
    );
    const back = Number(
      await g.eval(`const s = ${SPAWN}; const p = window.boogle.me.body.position;
      return Math.hypot(p.x - (s.x + 3), p.z - (s.z + 2));`),
    );
    t.check('the switch keeps your spot', back < 2, `${back.toFixed(2)} m away`);
    const after = (await g.eval(STORE)) as { counts?: Record<string, number>; verdict?: string };
    t.check(
      'the switch is counted, time too',
      after.counts?.['variant switches'] === 1 && (after.counts?.seconds ?? 0) > 1,
      JSON.stringify(after.counts),
    );
    const pressed = await g.eval(`return document.querySelector('.pb-variants [aria-pressed="true"]')?.textContent;`);
    t.check('drifty shows as playing', pressed === 'drifty', String(pressed));
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));
  },
};
