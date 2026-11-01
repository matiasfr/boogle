// boogle.club/protos/: a card per prototype (protos.ts) with a Play button, its questions and checklist, and notes
// saved in this browser that copy out as a docs/playtests.md entry. Nothing here talks to a server.
import './protos.css';
import { PROTOS } from './protos.ts';
import type { Proto, ProtoStatus } from './protos.ts';

type Saved = { answers: string[]; notes: string; values: string; done: boolean[]; name: string };

const KEY = 'boogle-protos-v1';
const ORDER: Record<ProtoStatus, number> = { live: 0, building: 1, retired: 2 };
const touch = matchMedia('(pointer: coarse)').matches;

function loadAll(): Record<string, Partial<Saved>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') ?? {};
  } catch {
    return {};
  }
}
const store = loadAll();
const saved = (id: string): Saved => {
  const s = store[id] ?? {};
  return {
    answers: s.answers ?? [],
    notes: s.notes ?? '',
    values: s.values ?? '',
    done: s.done ?? [],
    name: s.name ?? '',
  };
};
function save(id: string, patch: Partial<Saved>) {
  store[id] = { ...saved(id), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode or full storage: the notes still live in the page until it closes.
  }
}

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
  return s.answers.some((a) => a.trim()) || s.notes.trim() !== '' || s.values.trim() !== '';
};

// The prototype's part of an entry in docs/playtests.md (one bullet list, like the entries there).
function body(p: Proto): string {
  const s = saved(p.id);
  const flag = p.url.replace(PLACEHOLDER, s.name.trim() || `<${p.url.match(PLACEHOLDER)?.[1]}>`);
  const lines = [`- Prototype: ${p.title} (\`${flag}\`, find the fun ${stepLabel(p).toLowerCase()})`];
  p.questions.forEach((q, i) => lines.push(`- ${q} ${oneLine(s.answers[i] ?? '') || '(no answer)'}`));
  if (s.notes.trim()) lines.push(`- Notes: ${oneLine(s.notes)}`);
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
    meta.append(' · ', el('strong', 'badge', p.status === 'building' ? 'not live yet' : 'retired'));
  head.append(meta, el('h2', '', p.title));
  if (p.note) head.append(el('p', 'note', p.note));
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

  const tryList = el('ul', 'try');
  p.tryThis.forEach((t, i) => {
    const li = el('li');
    const lab = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = !!s.done[i];
    box.addEventListener('change', () => {
      const done = saved(p.id).done.slice();
      done[i] = box.checked;
      save(p.id, { done });
    });
    lab.append(box, el('span', '', t));
    li.append(lab);
    tryList.append(li);
  });
  c.append(el('h3', '', 'Try this'), tryList);

  c.append(el('h3', '', 'Answer'));
  p.questions.forEach((q, i) =>
    c.append(
      field(q, s.answers[i] ?? '', 2, (v) => {
        const answers = saved(p.id).answers.slice();
        answers[i] = v;
        save(p.id, { answers });
      }),
    ),
  );
  c.append(field('Notes', s.notes, 3, (v) => save(p.id, { notes: v }), 'What felt off, what broke, ideas'));
  if (p.values)
    c.append(
      field('Copy values line (paste from the kit)', s.values, 2, (v) => save(p.id, { values: v }), 'haul-kit room=…'),
    );

  const foot = el('div', 'foot');
  const copyBtn = el('button', 'btn', 'Copy playtest entry');
  copyBtn.type = 'button';
  const said = el('span', 'said');
  said.setAttribute('aria-live', 'polite');
  copyBtn.addEventListener('click', () => copy(`${header()}\n${body(p)}\n`, said));
  foot.append(copyBtn);
  if (p.kit) {
    const kit = el('a', 'kit', 'Playtest kit');
    kit.href = p.kit;
    kit.target = '_blank';
    kit.rel = 'noopener';
    foot.append(kit);
  }
  c.append(foot, said);
  return c;
}

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
