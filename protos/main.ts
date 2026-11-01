// boogle.club/protos/: a card per prototype (protos.ts) with a Play button, its one question and a box for your take
// saved in this browser (store.ts) that copy out as a docs/playtests.md entry, with the verdict and behaviour counters
// the in-game prototype bar (src/proto/bar/) recorded, and a heat map of the recorded sittings (heat.ts). Nothing here
// talks to a server.
import './protos.css';
import { PLAYTEST_ORDER, PROTOS } from './protos.ts';
import type { Proto, ProtoStatus } from './protos.ts';
import { VERDICTS, countsLine, read, sittingLine, sittings, urlParam, write, type Saved } from './store.ts';
import { heatMap } from './heat.ts';

const ORDER: Record<ProtoStatus, number> = { live: 0, building: 1, retired: 2 };
const touch = matchMedia('(pointer: coarse)').matches;

// Re-read on every access: the game's prototype bar writes verdicts and counters to the same key from another tab.
const saved = (id: string): Saved => read(id);
const save = (id: string, patch: Partial<Omit<Saved, 'counts'>>) => write(id, patch);
const verdictLabel = (s: Saved) => VERDICTS.find((v) => v.id === s.verdict)?.label ?? '';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const PLACEHOLDER = /<(\w+)>/;
const href = (p: Proto, name: string) =>
  import.meta.env.BASE_URL + p.url.replace(/^\//, '').replace(PLACEHOLDER, encodeURIComponent(name.trim()));
const stepLabel = (p: Proto) => (p.step === 'depth' ? 'Depth track' : `Step ${p.step}`);
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local
const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');

const hasNotes = (p: Proto) => {
  const s = saved(p.id);
  return (
    s.notes.trim() !== '' ||
    s.values.trim() !== '' ||
    s.variant.trim() !== '' ||
    s.verdict !== '' ||
    Object.keys(s.counts).length > 0 ||
    sittings(p.id).length > 0
  );
};

// The prototype's part of an entry in docs/playtests.md (one bullet list, like the entries there).
function body(p: Proto): string {
  const s = saved(p.id);
  const flag = p.url.replace(PLACEHOLDER, s.name.trim() || `<${p.url.match(PLACEHOLDER)?.[1]}>`);
  const lines = [`- Prototype: ${p.title} (\`${flag}\`, find the fun ${stepLabel(p).toLowerCase()})`];
  const quick = s.verdict
    ? `${verdictLabel(s)}${s.verdictV ? ` (on ${s.verdictV})` : ''}${s.verdictNote.trim() ? `: ${oneLine(s.verdictNote)}` : ''}.`
    : '';
  lines.push(`- ${p.question} ${[quick, oneLine(s.notes)].filter(Boolean).join(' ') || '(no answer)'}`);
  const did = countsLine(s.counts);
  if (did) lines.push(`- Did: ${did}`);
  const sat = sittingLine(sittings(p.id).at(-1));
  if (sat) lines.push(`- Last sitting: ${sat}`);
  if (p.variants?.length) lines.push(`- Variant preferred: ${oneLine(s.variant) || '___'}`);
  if (s.values.trim()) lines.push(`- Values: \`${oneLine(s.values)}\``);
  return lines.join('\n');
}
const header = () => `## ${today()}\n- Who: Matias, solo`;

async function copy(text: string, said: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    said.textContent = 'Copied.';
  } catch {
    // No clipboard (http, old browser): select the text in a box so a long-press copies it.
    const box = el('textarea', 'fallback');
    box.value = text;
    box.readOnly = true;
    said.replaceChildren(box);
    box.select();
    return;
  }
  setTimeout(() => (said.textContent = ''), 2500);
}

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
    if (now.verdict) {
      const v = el('span', `verdict ${now.verdict}`, verdictLabel(now));
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

// "Start here": PLAYTEST_ORDER as numbered steps of big Play buttons, one per variant, ticked once the game's bar has a
// verdict for that variant. Entries whose card or variant is missing are skipped.
function startHere(): HTMLElement {
  type Run = { p: Proto; why: string; later: boolean; legs: { label: string; url: string; v: string }[] };
  const runs: Run[] = [];
  for (const step of PLAYTEST_ORDER) {
    const p = PROTOS.find((x) => x.id === step.id && x.status !== 'retired');
    const variant = step.variant ? p?.variants?.find((v) => v.name === step.variant) : undefined;
    if (!p || (step.variant && !variant)) continue;
    const leg = variant
      ? { label: variant.name, url: import.meta.env.BASE_URL + variant.url.replace(/^\//, ''), v: variant.name }
      : {
          label: 'default',
          url: PLACEHOLDER.test(p.url) && !saved(p.id).name.trim() ? `#${p.id}` : href(p, saved(p.id).name),
          v: urlParam(p, 'v') ?? '',
        };
    const last = runs.at(-1);
    if (last?.p === p) last.legs.push(leg);
    else runs.push({ p, why: step.why, later: !!step.later, legs: [leg] });
  }

  const wrap = el('section', 'start');
  wrap.append(
    el('h2', '', 'Start here'),
    el('p', 'lede', 'Solo, iPad, about 20 minutes for 1–3. Copy each entry back to the director.'),
  );
  const list = (rs: Run[], numbered: boolean) => {
    const ol = el(numbered ? 'ol' : 'ul', 'steps');
    rs.forEach((r, i) => {
      const li = el('li', 'step');
      if (numbered) li.append(el('span', 'n', String(i + 1)));
      const text = el('div', 'text');
      text.append(el('strong', '', r.p.title), el('span', 'why', r.why));
      const legs = el('div', 'legs');
      for (const leg of r.legs) {
        // A lone default is just "Play"; "default" only beside the variants it's compared with.
        const a = el('a', 'btn leg', r.legs.length === 1 && leg.label === 'default' ? 'Play' : leg.label);
        a.href = leg.url;
        if (!touch && !leg.url.startsWith('#')) a.target = '_blank';
        const tick = el('span', 'tick', '✓');
        tick.setAttribute('aria-label', 'verdict saved');
        a.append(tick);
        const draw = () => {
          const s = saved(r.p.id);
          tick.hidden = !(s.verdict && s.verdictV === leg.v);
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
      runs.filter((r) => !r.later),
      true,
    ),
  );
  const later = runs.filter((r) => r.later);
  if (later.length) wrap.append(el('h3', '', 'When you have time'), list(later, false));
  return wrap;
}
document.getElementById('list')!.before(startHere());

const sorted = PROTOS.map((p, i) => ({ p, i }))
  .sort((a, b) => ORDER[a.p.status] - ORDER[b.p.status] || a.i - b.i)
  .map((x) => x.p);
document.getElementById('list')!.append(...sorted.map(card));

// Copy all: every prototype with something written, under one date (all the live ones if nothing is written yet).
document.getElementById('copy-all')!.addEventListener('click', () => {
  const some = sorted.filter(hasNotes);
  const pick = some.length ? some : sorted.filter((p) => p.status === 'live');
  copy(`${header()}\n${pick.map(body).join('\n')}\n`, document.getElementById('said-all')!);
});
