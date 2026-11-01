// The in-game prototype bar (docs/research/finding-the-fun.md, recs 5, 6, 9, 10), loaded by
// src/features/proto-bar.ts on any `?proto=` page: the prototype's title and gut question from protos/protos.ts,
// a button per variant (switching rewrites `v=` and reloads in the same room and spot), a one-tap verdict with a
// one-line note, and the behaviour counters. Verdict and counters go to the protos page's store (protos/store.ts),
// so its "Copy playtest entry" carries them. On load it drops you at the card's `spawn`, next to the verb, once.
// Local: nothing here is synced. Serves DESIGN.md "How we work".
import './bar.css';
import { onFrame } from '../../loop.ts';
import { me, cam } from '../../player/player.ts';
import { teleport } from '../../physics/physics.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { PLAYER_R } from '../../constants.ts';
import { VERDICTS, cardFor, countsLine, read, write, type Verdict } from '../../../protos/store.ts';
import { protoCount, flushCounts, onCounts } from '../count.ts';

const card = cardFor(location.search);
const params = new URLSearchParams(location.search);
const HINT = 'boogle-proto-spawn'; // sessionStorage: where you stood when you switched variant
const FOLD = 'boogle-proto-bar-folded'; // localStorage: the bar folded or open

type Hint = { proto: string; x: number; z: number; yaw: number; pitch: number; at: number };

function takeHint(): Hint | null {
  try {
    const h = JSON.parse(sessionStorage.getItem(HINT) || 'null') as Hint | null;
    sessionStorage.removeItem(HINT);
    return h && h.proto === params.get('proto') && Date.now() - h.at < 60_000 ? h : null;
  } catch {
    return null;
  }
}

// The variant's own address (its room may differ: the haul's variants each have one), plus whatever else this page's
// address carries (another room you chose, `ridespeed`, `dpr`): only `v` and the variant's own params change.
function switchTo(v: string, url: string) {
  const b = me.body?.position;
  try {
    if (b) {
      const h: Hint = {
        proto: params.get('proto') ?? '',
        x: b.x,
        z: b.z,
        yaw: cam.yaw,
        pitch: cam.pitch,
        at: Date.now(),
      };
      sessionStorage.setItem(HINT, JSON.stringify(h));
    }
  } catch {
    // No session storage: the reload starts at the card's spawn instead.
  }
  protoCount('variant switches');
  flushCounts();
  const next = new URLSearchParams(location.search);
  next.delete('v');
  for (const [k, val] of new URLSearchParams(url.split('?')[1] ?? '')) next.set(k, val);
  if (v) next.set('v', v);
  location.search = next.toString();
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const button = (cls: string, text: string, fn: () => void) => {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    fn();
  });
  return b;
};

if (card) {
  const id = card.id;
  const current = params.get('v') ?? '';
  const bar = el('div', 'proto-bar');
  let folded = false;
  try {
    folded = localStorage.getItem(FOLD) === '1';
  } catch {
    // default: open
  }

  // Header: the fold toggle and the title; the question under it.
  const head = button('pb-head', '', () => {
    folded = !folded;
    bar.classList.toggle('folded', folded);
    try {
      localStorage.setItem(FOLD, folded ? '1' : '0');
    } catch {
      // not remembered
    }
  });
  const chip = el('span', 'pb-chip');
  head.append(el('span', 'pb-fold', ''), el('strong', 'pb-title', card.title), chip);
  head.setAttribute('aria-label', `Prototype: ${card.title}. Fold or open the bar`);
  bar.append(head, el('p', 'pb-q', card.question));

  // Variants: the default first, then each `&v=`; the one playing is pressed.
  if (card.variants?.length) {
    const row = el('div', 'pb-row pb-variants');
    for (const v of [{ name: '', url: card.url, what: 'The default take.' }, ...card.variants]) {
      const b = button('pb-btn', v.name || 'default', () => v.name !== current && switchTo(v.name, v.url));
      b.title = v.what;
      b.setAttribute('aria-pressed', String(v.name === current));
      row.append(b);
    }
    bar.append(row);
  }

  // The verdict: one tap, then an optional line on why.
  const verdictRow = el('div', 'pb-row');
  const note = el('input', 'pb-note');
  note.type = 'text';
  note.enterKeyHint = 'done';
  note.placeholder = 'One line: why';
  note.setAttribute('aria-label', 'Why, in one line');
  const vButtons = new Map<Verdict, HTMLButtonElement>();
  for (const v of VERDICTS) {
    const b = button(`pb-btn pb-v pb-${v.id}`, v.label, () => {
      const was = read(id).verdict;
      write(id, { verdict: was === v.id ? '' : v.id, verdictV: current });
      draw();
      if (was !== v.id) note.focus({ preventScroll: true });
    });
    vButtons.set(v.id, b);
    verdictRow.append(b);
  }
  note.addEventListener('input', () => write(id, { verdictNote: note.value.replace(/\s*\n\s*/g, ' ') }));
  note.addEventListener('keydown', (e) => e.key === 'Enter' && note.blur());
  bar.append(verdictRow, note);

  const counts = el('p', 'pb-counts');
  bar.append(counts);

  function draw() {
    const s = read(id);
    for (const [v, b] of vButtons) b.setAttribute('aria-pressed', String(s.verdict === v));
    if (document.activeElement !== note) note.value = s.verdictNote;
    chip.textContent = s.verdict ? (VERDICTS.find((v) => v.id === s.verdict)?.label ?? '') : '';
    counts.textContent = countsLine(s.counts);
  }
  draw();
  onCounts(draw);
  addEventListener('storage', draw); // the protos page in another tab

  bar.classList.toggle('folded', folded);
  (document.querySelector('.hud') ?? document.body).append(bar);

  // Time in the prototype (visible and entered), and the drop next to the verb, once per load.
  const spawn: { x: number; z: number; yaw: number; pitch?: number } | null = takeHint() ?? card.spawn ?? null;
  let placed = !spawn;
  onFrame(
    ({ dt }) => {
      if (!me.entered || !me.body) return;
      if (!document.hidden && dt > 0 && dt < 1) protoCount('seconds', dt);
      if (placed || !spawn) return;
      placed = true;
      teleport(me.body, spawn.x, groundHeight(spawn.x, spawn.z) + PLAYER_R + 0.6, spawn.z);
      me.body.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = spawn.yaw;
      if (spawn.pitch !== undefined) cam.pitch = spawn.pitch;
    },
    { phase: 'world', order: 40 },
  );
}
