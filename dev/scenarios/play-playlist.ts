// The playtest playlist (`/?play`, src/proto/bar/, docs/plans/find-the-fun.md "One path") on an iPad-sized touch
// screen: the island loads with the bar on step 1, Next walks every step (an island toy teleports you to its spawn
// without a reload; a chapter is its own page, and Next from it comes back to the island), a variant switch on the
// wagon happens live (no reload), and a verdict with a note is saved per variant for the protos page's Copy all.
// Stills: the bar at step 1 and at the wagon. Serves DESIGN.md "How we work".

type Game = {
  page: {
    waitForURL: (u: RegExp | ((u: URL) => boolean), o?: { timeout?: number }) => Promise<void>;
    url: () => string;
  };
  eval: (body: string) => Promise<unknown>;
  key: (code: string, holdMs?: number) => Promise<void>;
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

const BAR = `document.querySelector('.proto-bar')`;
const STEP = `${BAR}?.querySelector('.pb-n')?.textContent ?? ''`;
const TITLE = `${BAR}?.querySelector('.pb-title')?.textContent ?? ''`;
// Distance from the step's card (or playing variant's) spawn, by title; -1 for a card with none (moves). The wagon's
// step puts you on its middle flatbed: the distance from that.
const OFF = `const { PROTOS } = await import('/protos/protos.ts');
  const { protoV } = await import('/src/proto/flags.ts');
  const p = PROTOS.find((c) => c.title === (${TITLE}));
  if (p.id === 'wagon') {
    const c = window.__wagon.cars[1].body.position, b = window.boogle.me.body.position;
    return Math.hypot(b.x - c.x, b.z - c.z);
  }
  const s = p.variants?.find((v) => v.name === protoV(p.id))?.spawn ?? p.spawn;
  if (!s) return -1;
  const b = window.boogle.me.body.position;
  return Math.hypot(b.x - s.x, b.z - s.z);`;

export default {
  about: 'the ?play playlist: Next through every step, a live variant switch, a verdict saved per variant',
  timeout: 600000,
  async run(t: Run) {
    const room = 'proto-play' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'solo', room, hud: true, touch: true, size: [1194, 834], query: 'play' });
    const up = await g.waitFor(`!!${BAR}?.querySelector('.pb-next')`, { timeout: 60000 });
    t.check('the playlist bar is up', up >= 0);
    const total = Number(String(await g.eval(`return ${STEP};`)).split('/')[1]);
    t.check('it starts at step 1', String(await g.eval(`return ${STEP};`)).startsWith('1/'), String(total));
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 30000 });
    await g.eval(`document.querySelector('.first-run-close')?.click();`);
    await t.sleep(1500);
    t.check('step 1: at its spawn', Number(await g.eval(OFF)) < 2.5);
    t.check('still: the bar at step 1', true, await g.still('play-start'));

    // Walk every step. A marker on window tells a teleport (survives) from a page load (gone).
    const seen: string[] = [];
    let reloads = 0;
    for (let i = 1; i <= total; i++) {
      const before = String(await g.eval(`return ${STEP};`));
      await g.eval(`window.__playMark = 1; ${BAR}.querySelector('.pb-next').click();`);
      const want = `${(i % total) + 1}/${total}`;
      const ms = await g.waitFor(`(${STEP}) === '${want}' && window.boogle?.me?.entered`, { timeout: 120000 });
      if (ms < 0) {
        // a chapter's page: a returning visit goes straight in; else take the card
        await g.eval(`document.querySelector('#enter:not([disabled])')?.click();`).catch(() => {});
        await g.waitFor(`(${STEP}) === '${want}' && window.boogle?.me?.entered`, { timeout: 60000 });
      }
      const title = String(await g.eval(`return ${TITLE};`));
      const reloaded = !(await g.eval(`return window.__playMark === 1;`));
      if (reloaded) reloads++;
      await t.sleep(1200);
      const off = Number(await g.eval(OFF));
      seen.push(`${want} ${title}${reloaded ? ' (page)' : ''} ${off < 0 ? '' : `${off.toFixed(1)} m`}`);
      t.check(`Next from ${before} reaches ${want}: ${title}`, ms >= 0 || (await g.eval(`return ${STEP};`)) === want);
      t.check(`${title}: you are at its spot`, off < 3, `${off.toFixed(2)} m`);
      if (title === 'Ride: the wagon') {
        const v = await g.eval(`return window.__wagon?.VARIANT;`);
        t.check('the wagon plays the playlist’s first variant (the default, calm)', v === 'calm', String(v));
        await t.sleep(2000);
        t.check('still: the wagon', true, await g.still('play-wagon'));
        await g.eval(`window.__playMark = 1;`);
        await g.eval(
          `[...${BAR}.querySelectorAll('.pb-variants button')].find((b) => b.textContent.startsWith('lively')).click();`,
        );
        await t.sleep(500);
        const after = await g.eval(`return [window.__wagon?.VARIANT, window.__playMark === 1, location.search];`);
        t.check(
          'switching the wagon to lively is live: no reload',
          JSON.stringify(after).startsWith('["lively",true'),
          JSON.stringify(after),
        );
        await g.eval(`${BAR}.querySelector('.pb-yes').click();
          const n = ${BAR}.querySelector('.pb-note'); n.value = 'rocks nicely'; n.dispatchEvent(new Event('input')); n.blur();`);
        const s = (await g.eval(
          `return JSON.parse(localStorage.getItem('boogle-protos-v1') || '{}').wagon?.byV?.lively ?? null;`,
        )) as { verdict?: string; note?: string } | null;
        t.check(
          'the verdict is saved for lively',
          s?.verdict === 'yes' && s?.note === 'rocks nicely',
          JSON.stringify(s),
        );
      }
    }
    console.log(seen.join('\n'));

    // Keys stand in for the pad (./pad.ts: D-pad down opens, RB is Next, B closes): P opens the bar, ] moves on.
    await g.eval(`window.__playMark = 1;`);
    await g.key('KeyP');
    const open = await g.waitFor(`${BAR}.classList.contains('pad') && !!${BAR}.querySelector('[data-focus]')`);
    t.check('P opens the bar under the pad, a control focused', open >= 0);
    await g.key('BracketRight');
    const moved = await g.waitFor(`(${STEP}) === '2/${total}' && window.__playMark === 1`);
    t.check('] goes to the next toy without a reload', moved >= 0, String(await g.eval(`return ${STEP};`)));
    await g.key('Escape');
    t.check('Esc closes it', (await g.waitFor(`!${BAR}.classList.contains('pad')`)) >= 0);
    t.check('chapters are their own pages, island toys are not', reloads > 0 && reloads < total, `${reloads} loads`);
    const entry = String(await g.eval(`const { allEntries } = await import('/protos/entry.ts'); return allEntries();`));
    t.check('Copy all carries the variant’s verdict', entry.includes('lively: Yes: rocks nicely'), entry.slice(0, 400));
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));
  },
};
