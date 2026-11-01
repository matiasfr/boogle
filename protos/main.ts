// boogle.club/protos/: the way in to the playtest playlist (`/?play`, docs/plans/find-the-fun.md, "One path") and its
// steps, then a card per prototype (protos.ts) with a Play button, its one question and a box for your take saved in
// this browser (store.ts) that copy out as a docs/playtests.md entry (entry.ts), with the verdicts and behaviour
// counters the in-game prototype bar (src/proto/bar/) recorded, and a heat map of the recorded sittings (heat.ts).
// Nothing here talks to a server.
import './protos.css';
import { PROTOS, playlist, onIsland, variantUrl } from './protos.ts';
import type { Proto, ProtoStatus } from './protos.ts';
import { countsLine, read, vName, write, type Saved } from './store.ts';
import { allEntries, body, copy, header, label, stepLabel } from './entry.ts';
import { heatMap } from './heat.ts';

const ORDER: Record<ProtoStatus, number> = { live: 0, building: 1, retired: 2 };
const touch = matchMedia('(pointer: coarse)').matches;

// Re-read on every access: the game's prototype bar writes verdicts and counters to the same key from another tab.
const saved = (id: string): Saved => read(id);
const save = (id: string, patch: Partial<Omit<Saved, 'counts'>>) => write(id, patch);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const PLACEHOLDER = /<(\w+)>/;
const href = (p: Proto, name: string) =>
  import.meta.env.BASE_URL + p.url.replace(/^\//, '').replace(PLACEHOLDER, encodeURIComponent(name.trim()));

function field(label: string, value: string, rows: number, onInput: (v: string) => void, placeholder = '') {
  const wrap = el('label', 'field');
  wrap.append(el('span', 'q', label));
  const t = el('textarea');
  t.rows = rows;
  t.value = value;
  t.placeholder = placeholder;
  t.addEventListener('input', () => onInput(t.value));
  wrap.append(t);
  return wrap;
}

function card(p: Proto): HTMLElement {
  const s = saved(p.id);
  const c = el('article', `card ${p.status}`);
  c.id = p.id;

  const head = el('div', 'head');
  const meta = el('p', 'meta', `${stepLabel(p)} · since ${p.since}`);
  if (p.status !== 'live')
    meta.append(
      ' · ',
      el(
        'strong',
        'badge',
        p.status === 'building' ? 'not live yet' : `retired${p.retired ? `: ${p.retired.why}` : ''}`,
      ),
    );
  head.append(meta, el('h2', '', p.title), el('p', 'what', p.what));
  if (p.note) head.append(el('p', 'note', p.note));
  if (p.retired?.note) head.append(el('p', 'note', p.retired.note));
  c.append(head);

  const play = el('a', 'btn play', 'Play');
  const ph = p.url.match(PLACEHOLDER);
  const setHref = (name: string) => {
    play.href = href(p, name);
    play.classList.toggle('off', !!ph && !name.trim());
  };
  if (!touch) play.target = '_blank';
  if (ph) {
    const nameIn = el('input', 'name');
    nameIn.placeholder = `${ph[1]}`;
    nameIn.value = s.name;
    nameIn.setAttribute('aria-label', ph[1]);
    nameIn.addEventListener('input', () => {
      save(p.id, { name: nameIn.value });
      setHref(nameIn.value);
    });
    const row = el('div', 'playrow');
    row.append(nameIn, play);
    c.append(row);
  } else c.append(play);
  setHref(s.name);
  c.append(el('p', 'url', p.url));
  if (p.variants?.length) {
    const row = el('div', 'variants');
    for (const v of p.variants) {
      const a = el('a', 'btn variant');
      a.href = import.meta.env.BASE_URL + v.url.replace(/^\//, '');
      if (!touch) a.target = '_blank';
      a.title = v.url;
      a.append(el('strong', '', v.name), el('span', '', v.what));
      row.append(a);
    }
    c.append(row);
  }

  const played = el('p', 'played');
  played.setAttribute('aria-live', 'polite');
  const drawPlayed = () => {
    const now = saved(p.id);
    const bits: HTMLElement[] = [];
    const perV = Object.entries(now.byV).filter(([, v]) => v.verdict);
    for (const [name, v] of perV) {
      const b = el('span', `verdict ${v.verdict}`, label(v.verdict));
      b.append(el('small', '', ` on ${name}`));
      bits.push(b);
      if (v.note.trim()) bits.push(el('span', 'why', v.note));
    }
    if (!perV.length && now.verdict) {
      const v = el('span', `verdict ${now.verdict}`, label(now.verdict));
      if (now.verdictV) v.append(el('small', '', ` on ${now.verdictV}`));
      bits.push(v);
      if (now.verdictNote.trim()) bits.push(el('span', 'why', now.verdictNote));
    }
    const did = countsLine(now.counts);
    if (did) bits.push(el('span', 'did', did));
    played.replaceChildren(...bits);
    played.hidden = !bits.length;
  };
  drawPlayed();
  redraws.push(drawPlayed);
  c.append(played);

  c.append(field(p.question, s.notes, 3, (v) => save(p.id, { notes: v }), 'Your take: what felt good, what felt off'));
  if (p.variants?.length) {
    const wrap = el('label', 'field');
    wrap.append(el('span', 'q', 'Variant preferred'));
    const input = el('input', 'name pick');
    input.value = s.variant;
    input.placeholder = p.variants.map((v) => v.name).join(' / ');
    input.addEventListener('input', () => save(p.id, { variant: input.value }));
    wrap.append(input);
    c.append(wrap);
  }
  if (p.values)
    c.append(
      field('Copy values line (paste from the kit)', s.values, 2, (v) => save(p.id, { values: v }), 'haul-kit room=…'),
    );

  const heat = heatMap(p);
  redraws.push(heat.redraw);
  c.append(heat.el);

  const foot = el('div', 'foot');
  const copyBtn = el('button', 'btn', 'Copy playtest entry');
  copyBtn.type = 'button';
  const said = el('span', 'said');
  said.setAttribute('aria-live', 'polite');
  copyBtn.addEventListener('click', () => copy(`${header()}\n${body(p)}\n`, said));
  foot.append(copyBtn);
  c.append(foot, said);
  return c;
}

const redraws: (() => void)[] = [];
// The game tab saved a verdict or counters: show them without a reload.
addEventListener('storage', () => redraws.forEach((fn) => fn()));
addEventListener('focus', () => redraws.forEach((fn) => fn()));

// "Start here": the playlist (protos.ts, `playlist`) as numbered steps of big buttons, one per variant to compare, each
// opening the `?play` island at that step and variant (a chapter's own page for the ones that can't share it), ticked
// once the game's bar has a verdict for that variant. The big button resumes wherever the playlist got to.
const playHref = (q: string) => `${import.meta.env.BASE_URL}?play${q ? `=${encodeURIComponent(q)}` : ''}`;
function startHere(): HTMLElement {
  const steps = playlist();
  const wrap = el('section', 'start');
  const go = el('a', 'btn leg go', 'Play the playlist');
  go.href = playHref('');
  wrap.append(
    el('h2', '', 'Start here'),
    el(
      'p',
      'lede',
      'One link for the whole run: the island with every toy on it, the bar walking you through them in this order (Next takes you to each), a verdict and a line per variant, Copy all at the end. Solo, iPad, pad or touch.',
    ),
    go,
  );
  const list = (rs: typeof steps, numbered: boolean) => {
    const ol = el(numbered ? 'ol' : 'ul', 'steps');
    rs.forEach((r, i) => {
      const li = el('li', 'step');
      if (numbered) li.append(el('span', 'n', String(i + 1)));
      const text = el('div', 'text');
      text.append(el('strong', '', r.card.title), el('span', 'why', r.why));
      if (!onIsland(r.card)) text.append(el('span', 'why', `Own page: ${r.card.chapter ?? 'not on the island'}.`));
      const legs = el('div', 'legs');
      for (const leg of r.legs) {
        // A lone default is just "Play"; "default" only beside the variants it's compared with.
        const name = vName(r.card, leg);
        const a = el('a', 'btn leg', r.legs.length === 1 && !leg ? 'Play' : leg || 'default');
        a.href = playHref(`${r.card.id}:${leg}`);
        a.title = variantUrl(r.card, leg);
        const tick = el('span', 'tick', '✓');
        tick.setAttribute('aria-label', 'verdict saved');
        a.append(tick);
        const draw = () => {
          const s = saved(r.card.id);
          tick.hidden = !(s.byV[name]?.verdict || (s.verdict && s.verdictV === leg));
        };
        draw();
        redraws.push(draw);
        legs.append(a);
      }
      li.append(text, legs);
      ol.append(li);
    });
    return ol;
  };
  wrap.append(
    list(
      steps.filter((r) => !r.later),
      true,
    ),
  );
  const later = steps.filter((r) => r.later);
  if (later.length) wrap.append(el('h3', '', 'When you have time'), list(later, false));
  return wrap;
}
document.getElementById('list')!.before(startHere());

const sorted = PROTOS.map((p, i) => ({ p, i }))
  .sort((a, b) => ORDER[a.p.status] - ORDER[b.p.status] || a.i - b.i)
  .map((x) => x.p);
document.getElementById('list')!.append(...sorted.map(card));

// Copy all: every prototype with something written, under one date (all the live ones if nothing is written yet).
document
  .getElementById('copy-all')!
  .addEventListener('click', () => copy(allEntries(), document.getElementById('said-all')!));
