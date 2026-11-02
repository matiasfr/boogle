// The in-game prototype bar (docs/research/finding-the-fun.md, recs 5-7, 9, 10; docs/plans/find-the-fun.md, "One
// path"), loaded by src/features/proto-bar.ts on any `?proto=` or `?play` page: the prototype's title and gut question
// from protos/protos.ts, a button per variant, a one-tap verdict with a one-line note for the variant playing, the
// behaviour counters, and Copy all (the whole docs/playtests.md entry, protos/entry.ts).
//   ?play (the island, and its chapters): the playlist too. "3 / 14", Prev and Next: Next moves the playlist to the
//   next card, teleports you to its spawn facing it (a chapter, or coming back from one, is a page load), and starts
//   its counters and trace afresh. Where you are and each card's variant are kept in this browser (src/proto/flags.ts).
//   Variants: a prototype that can switch live does (`onVariant`); any other reloads into the same spot.
// Verdicts, notes and counters go per card and variant to the protos page's store (protos/store.ts). Pad and keys:
// ./pad.ts. On load it drops you at the playing variant's `spawn` (else the card's), next to the verb, once.
// Local: nothing here is synced. Serves DESIGN.md "How we work".
import './bar.css';
import { onFrame } from '../../loop.ts';
import { me, cam } from '../../player/player.ts';
import { teleport } from '../../physics/physics.ts';
import { groundHeight } from '../../island/terrain.ts';
import { PLAYER_R } from '../../constants.ts';
import { PROTOS, playlist, onIsland, variantUrl, type Proto, type Spawn } from '../../../protos/protos.ts';
import { VERDICTS, cardFor, countsLine, read, urlParam, vName, writeV, type Verdict } from '../../../protos/store.ts';
import { allEntries, copy } from '../../../protos/entry.ts';
import { protoCount, flushCounts, onCounts, readoutLine, countFor } from '../count.ts';
import { startSitting } from '../trace/record.ts';
import { ON_ISLAND, PLAY, PROTO, playState, protoV, savePlay, setChooser, setStep, switchLive } from '../flags.ts';
import { padBar } from './pad.ts';
import { isSent, sendVerdict } from './send.ts';

const params = new URLSearchParams(location.search);
const HINT = 'boogle-proto-spawn'; // sessionStorage: where you stood when a variant switch reloaded
const FOLD = 'boogle-proto-bar-folded'; // localStorage: the bar folded or open
const steps = PLAY ? playlist() : [];
const byId = (id: string) => PROTOS.find((p) => p.id === id);

type Hint = { proto: string; x: number; z: number; yaw: number; pitch: number; at: number };
function takeHint(id: string): Hint | null {
  try {
    const h = JSON.parse(sessionStorage.getItem(HINT) || 'null') as Hint | null;
    sessionStorage.removeItem(HINT);
    return h && h.proto === id && Date.now() - h.at < 60_000 ? h : null;
  } catch {
    return null;
  }
}
function saveHint(id: string) {
  const b = me.body?.position;
  if (!b) return;
  try {
    const h: Hint = { proto: id, x: b.x, z: b.z, yaw: cam.yaw, pitch: cam.pitch, at: Date.now() };
    sessionStorage.setItem(HINT, JSON.stringify(h));
  } catch {
    // No session storage: the reload starts at the card's spawn instead.
  }
}

const spawnOf = (p: Proto, v: string): Spawn | null => p.variants?.find((x) => x.name === v)?.spawn ?? p.spawn ?? null;
// The island's own address (its room, harness flags), kept while you visit a chapter so Next comes back to it.
const ISLAND_AT = 'boogle-play-island';
const KEEP = ['dpr', 'debugcam', 'netdebug', 'prof']; // flags a chapter's address carries on
if (ON_ISLAND)
  try {
    sessionStorage.setItem(ISLAND_AT, location.search);
  } catch {
    // no session storage: back to a plain ?play
  }
function islandSearch() {
  try {
    return sessionStorage.getItem(ISLAND_AT) || '?play';
  } catch {
    return '?play';
  }
}
/** The page that plays card `p` at variant `v` with the playlist: the island, or the chapter's own address. */
function pageUrl(p: Proto, v: string) {
  if (onIsland(p)) return import.meta.env.BASE_URL + islandSearch();
  const q = new URLSearchParams(variantUrl(p, v).split('?')[1] ?? '');
  for (const k of KEEP) if (params.has(k)) q.set(k, params.get(k)!);
  return `${import.meta.env.BASE_URL}?${q}&play`;
}

// Which card is up: the playlist's step on the island, else the page's `?proto=` (standalone, or a chapter).
let at = ON_ISLAND
  ? Math.max(
      0,
      steps.findIndex((s) => s.card.id === playState().step),
    )
  : steps.findIndex((s) => s.card.id === PROTO);
let card: Proto | undefined = ON_ISLAND ? steps[at]?.card : cardFor(location.search);
const playing = (p: Proto) => protoV(p.id);

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

// The island's step is a chapter (a Start here link, or the playlist was left there): go to its page.
if (ON_ISLAND && card && !onIsland(card)) {
  location.replace(pageUrl(card, playState().v[card.id] ?? steps[at].legs[0]));
  card = undefined;
}

if (card) {
  if (PLAY) savePlay({ step: card.id });
  if (ON_ISLAND) setStep(card.id); // a first visit has no step saved yet
  const bar = el('div', 'proto-bar');
  let folded = false;
  try {
    folded = localStorage.getItem(FOLD) === '1';
  } catch {
    // default: open
  }
  const fold = (v: boolean) => {
    folded = v;
    bar.classList.toggle('folded', v);
    try {
      localStorage.setItem(FOLD, v ? '1' : '0');
    } catch {
      // not remembered
    }
  };

  // Counters and the trace follow the card and variant playing.
  const begin = (fromLoad = false) => {
    const p = card!;
    countFor(p, vName(p, playing(p)));
    if (!params.has('trace')) startSitting(p.id, playing(p) || urlParam(p, 'v') || '', fromLoad);
  };
  if (params.has('trace')) void import('../trace/draw.ts'); // the last sitting's path on the ground

  // Put you at a spawn once you're in (and the body exists).
  let target: (Spawn & { pitch?: number }) | null = null;
  const place = (s: (Spawn & { pitch?: number }) | null) => void (s && (target = s));

  let said = 0;
  const say = el('p', 'pb-say');
  say.setAttribute('aria-live', 'polite');
  const flash = (text: string) => {
    say.textContent = text;
    clearTimeout(said);
    said = window.setTimeout(() => (say.textContent = ''), 2500);
  };

  // A variant: live if the prototype can, else a reload that keeps your spot (or lands at the variant's own spawn).
  function choose(id: string, v: string) {
    const p = byId(id);
    if (!p || vName(p, v) === vName(p, playing(p))) return;
    protoCount('variant switches');
    const own = p.variants?.find((x) => x.name === v)?.spawn ?? null;
    if (PLAY) savePlay({ v: { [id]: v } });
    if (switchLive(id, v)) {
      if (!ON_ISLAND) {
        const next = new URLSearchParams(location.search);
        if (v) next.set('v', v);
        else next.delete('v');
        history.replaceState(history.state, '', `?${next}`);
      }
      begin();
      place(own);
      flash(`${v || 'default'}: switched live`);
      draw();
      return;
    }
    flash('Reloading into the same spot…');
    flushCounts();
    if (!own) saveHint(id);
    if (ON_ISLAND) return location.reload();
    // The variant's own address (its room may differ), plus whatever else this page's address carries (another room
    // you chose, `ridespeed`, `dpr`, `play`): only `v` and the variant's own params change.
    const next = new URLSearchParams(location.search);
    next.delete('v');
    for (const [k, val] of new URLSearchParams(variantUrl(p, v).split('?')[1] ?? '')) next.set(k, val);
    if (v) next.set('v', v);
    location.search = next.toString();
  }
  setChooser(choose);

  // The playlist: to step `i` (wrapping), with the variant last picked there, else the first one it lists.
  function go(i: number) {
    if (!steps.length) return;
    i = (i + steps.length) % steps.length;
    const s = steps[i];
    const p = s.card;
    const v = playState().v[p.id] ?? s.legs[0];
    savePlay({ step: p.id, v: { [p.id]: v } });
    flushCounts();
    if (!ON_ISLAND || !onIsland(p)) {
      location.href = pageUrl(p, v);
      return;
    }
    at = i;
    card = p;
    setStep(p.id);
    if (vName(p, v) !== vName(p, playing(p)) && !switchLive(p.id, v)) return location.reload();
    begin();
    place(spawnOf(p, v));
    build();
  }

  const pad = padBar(bar, { prev: () => go(at - 1), next: () => go(at + 1), unfold: () => fold(false) });
  let draw = () => {};

  // The bar's content for the card up now (rebuilt when the playlist moves on the island).
  function build() {
    const p = card!;
    const head = button('pb-head', '', () => fold(!folded));
    const chip = el('span', 'pb-chip');
    if (steps.length && at >= 0)
      head.append(el('span', 'pb-fold', ''), el('span', 'pb-n', `${at + 1}/${steps.length}`));
    else head.append(el('span', 'pb-fold', ''));
    head.append(el('strong', 'pb-title', p.title), chip);
    head.setAttribute('aria-label', `Prototype: ${p.title}. Fold or open the bar`);
    const parts: HTMLElement[] = [head, el('p', 'pb-q', p.question)];
    if (PLAY && !onIsland(p)) parts.push(el('p', 'pb-counts', `Own page: ${p.chapter ?? 'not on the island'}.`));

    // Variants: the default first, then each `&v=`; the one playing is pressed, the ones with a verdict ticked.
    const vButtons: [string, HTMLButtonElement][] = [];
    const whats = new Map<string, string>(); // variant (vName) -> its one line, shown for the one playing
    const what = el('p', 'pb-what');
    if (p.variants?.length) {
      const row = el('div', 'pb-row pb-variants');
      for (const v of [{ name: '', url: p.url, what: p.defaultWhat ?? 'The default take.' }, ...p.variants]) {
        const b = button('pb-btn', vName(p, v.name), () => choose(p.id, v.name));
        b.title = v.what;
        vButtons.push([v.name, b]);
        whats.set(vName(p, v.name), v.what);
        row.append(b);
      }
      parts.push(row, what);
    }

    // The verdict for the variant playing: one tap, then an optional line on why (a plain text box: dictation works).
    const verdictRow = el('div', 'pb-row pb-verdicts');
    const note = el('input', 'pb-note');
    note.type = 'text';
    note.enterKeyHint = 'done';
    note.placeholder = 'One line: why';
    note.setAttribute('aria-label', 'Why, in one line');
    const vb = new Map<Verdict, HTMLButtonElement>();
    const mine = () => read(p.id).byV[vName(p, playing(p))];
    for (const v of VERDICTS) {
      const b = button(`pb-btn pb-v pb-${v.id}`, v.label, () => {
        const was = mine()?.verdict ?? '';
        writeV(p.id, vName(p, playing(p)), { verdict: was === v.id ? '' : v.id });
        sendVerdict(p.id, vName(p, playing(p)));
        draw();
        if (was !== v.id && !bar.classList.contains('pad')) note.focus({ preventScroll: true });
      });
      vb.set(v.id, b);
      verdictRow.append(b);
    }
    // Sent to the server too (./send.ts): the tick shows while what's stored is what went out.
    const sent = el('span', 'pb-sent', '✓ sent');
    sent.title = 'Sent to the server: no need to paste it';
    verdictRow.append(sent);
    note.addEventListener('input', () => {
      writeV(p.id, vName(p, playing(p)), { note: note.value.replace(/\s*\n\s*/g, ' ') });
      draw();
    });
    note.addEventListener('keydown', (e) => e.key === 'Enter' && note.blur());
    note.addEventListener('blur', () => {
      sendVerdict(p.id, vName(p, playing(p)));
      draw();
    });
    parts.push(verdictRow, note);

    const counts = el('p', 'pb-counts');
    const live = el('p', 'pb-counts pb-readout');
    parts.push(counts, live, say);

    // Prev / Copy all / Next on the playlist; Copy all alone elsewhere.
    const nav = el('div', 'pb-row pb-nav');
    const copied = el('span', 'pb-copied');
    const copyAll = button('pb-btn pb-copy', 'Copy all', () => {
      flushCounts();
      void copy(allEntries(), copied);
    });
    if (steps.length) nav.append(button('pb-btn pb-prev', '◀ Prev', () => go(at - 1)));
    nav.append(copyAll);
    if (steps.length) nav.append(button('pb-btn pb-next', 'Next ▶', () => go(at + 1)));
    parts.push(nav, copied);

    draw = () => {
      const s = read(p.id);
      const cur = vName(p, playing(p));
      for (const [name, b] of vButtons) {
        b.setAttribute('aria-pressed', String(vName(p, name) === cur));
        b.classList.toggle('done', !!s.byV[vName(p, name)]?.verdict);
      }
      what.textContent = whats.get(cur) ?? '';
      const m = s.byV[cur];
      for (const [v, b] of vb) b.setAttribute('aria-pressed', String(m?.verdict === v));
      sent.hidden = !isSent(p.id, cur);
      if (document.activeElement !== note) note.value = m?.note ?? '';
      chip.textContent = m?.verdict ? (VERDICTS.find((v) => v.id === m.verdict)?.label ?? '') : '';
      counts.textContent = countsLine(m?.counts ?? {});
      live.textContent = readoutLine();
      live.hidden = !live.textContent;
    };
    bar.replaceChildren(...parts);
    draw();
    pad.refocus();
  }

  build();
  onCounts(() => draw());
  addEventListener('storage', () => draw()); // the protos page in another tab
  bar.classList.toggle('folded', folded);
  (document.querySelector('.hud') ?? document.body).append(bar);

  // The drop next to the verb: where you stood before a variant reload, else the variant's or the card's spawn.
  begin(true);
  place(takeHint(card.id) ?? spawnOf(card, playing(card)));
  onFrame(
    ({ dt }) => {
      if (!me.entered || !me.body) return;
      if (!document.hidden && dt > 0 && dt < 1) protoCount('seconds', dt);
      if (!target) return;
      const s = target;
      target = null;
      teleport(me.body, s.x, groundHeight(s.x, s.z) + PLAYER_R + 0.6, s.z);
      me.body.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = s.yaw;
      if (s.pitch !== undefined) cam.pitch = s.pitch;
    },
    { phase: 'world', order: 40 },
  );
}
