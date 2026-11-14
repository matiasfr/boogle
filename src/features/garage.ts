// The train garage's screen (docs/brainstorms/engine-garage.md, first build, view only): a framed overlay over the
// Roundhouse table with the rail (Upgrades: Engine, Cars, Cargo; Looks and sounds: Looks, Whistle), the parts strip, the
// selected part's readouts and the hold button. It opens only from the lever post at the table (the world half is
// src/entities/railway/garage-view.ts), never from Pause or a key. Local: nothing is sent, saved or shown to anyone else.
// Serves DESIGN.md 7 (telegraph everything: see what a part does before it does it) and 11 (the model shows the part).
import '../ui/ui-kit.css';
import './garage.css';
import { defineKind, spawn } from '../entity/entity.ts';
import { onStart } from '../loop.ts';
import { me } from '../player/player.ts';
import { glyph } from '../player/glyphs.ts';
import { reducedMotion } from '../constants.ts';
import { onMenuKey, setPadGrab, touchHold, wrapAction } from '../player/controls.ts';
import { uiSound } from '../ui/ui-sound.ts';
import { garage } from '../entities/railway/garage-state.ts';
import {
  CATS,
  GROUP_NAME,
  MOMENT,
  partsOf,
  rowsFor,
  shownRow,
  type CatId,
  type Group,
  type Part,
  type Row,
} from '../entities/railway/garage-data.ts';

let root: HTMLElement | null = null;
let els: {
  where: HTMLElement;

  rail: HTMLElement;
  parts: HTMLElement;
  name: HTMLElement;
  pill: HTMLElement;
  desc: HTMLElement;
  rows: HTMLElement;
  note: HTMLElement;
  need: HTMLElement;
  btn: HTMLButtonElement;
  skip: HTMLButtonElement;
} | null = null;
let shownKey = '';
let railKey = '';
let wasOpen = false;

const h = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function build() {
  root = document.createElement('div');
  root.className = 'garage-ui';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'The engine');
  root.innerHTML = `
    <div class="g-vignette"></div>
    <div class="g-top">
      <span class="g-where">Roundhouse · <b></b></span>
      <button class="g-back" type="button">Back</button>

    </div>
    <nav class="g-rail" role="tablist" aria-label="Categories"></nav>
    <div class="g-parts" role="listbox" aria-label="Parts"></div>
    <aside class="g-panel" aria-label="Selected part">
      <div class="g-head"><h2></h2><span class="g-pill"></span></div>
      <p class="g-desc"></p>
      <div class="g-rows" aria-live="polite"></div>
      <p class="g-note"></p>
      <div class="g-need" hidden></div>
      <button class="g-btn" type="button" hidden><span class="g-label">Install</span></button>
    </aside>
    <button class="g-skip" type="button" hidden>Skip</button>`;
  (document.querySelector('.hud') ?? document.body).append(root);
  const q = <T extends HTMLElement>(s: string) => root!.querySelector<T>(s)!;
  els = {
    where: q('.g-where b'),

    rail: q('.g-rail'),
    parts: q('.g-parts'),
    name: q('.g-head h2'),
    pill: q('.g-pill'),
    desc: q('.g-desc'),
    rows: q('.g-rows'),
    note: q('.g-note'),
    need: q('.g-need'),
    btn: q<HTMLButtonElement>('.g-btn'),
    skip: q<HTMLButtonElement>('.g-skip'),
  };
  q('.g-back').addEventListener('click', () => leave());
  els.skip.addEventListener('click', () => garage.api?.skip());
  els.rail.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-cat]');
    if (b) pickCat(b.dataset.cat as CatId);
  });
  els.parts.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-part]');
    const snap = garage.api?.snap();
    if (b && snap) garage.api!.choose(snap.cat, b.dataset.part as Part['id']);
  });
  touchHold(els.btn, {
    down: () => (els!.btn.dataset.act === 'hear' ? garage.api?.hear() : garage.api?.holdStart()),
    up: () => garage.api?.holdEnd(),
    cancel: () => garage.api?.holdEnd(),
  });
}

function partsIn(cat: CatId): Part[] {
  const snap = garage.api!.snap();
  return partsOf(snap.facts).filter((p) => p.cat === cat);
}
function pickCat(cat: CatId) {
  const first = partsIn(cat)[0];
  garage.api?.choose(cat, first?.id);
  // Land on the part you could do something with: the upgrade (ready, or still short of its bill), else the one you
  // have.
  const pick = partsIn(cat).find((p) => p.standing === 'ready' || p.standing === 'steel') ?? first;
  if (pick) garage.api?.choose(cat, pick.id);
}
function leave() {
  const snap = garage.api?.snap();
  // Your own moment holds you to its end; someone else's install, watched from here, never does.
  const watched = snap?.phase === 'moment' && !snap.mine;
  if (!snap || (!watched && snap.phase === 'moment')) return;
  garage.api?.close();
  uiSound('pop');
}
const move = (step: number, across: 'part' | 'cat') => {
  const api = garage.api,
    snap = api?.snap();
  if (!api || !snap || !snap.open) return;
  if (across === 'cat') {
    const i = CATS.findIndex((c) => c.id === snap.cat);
    pickCat(CATS[(i + step + CATS.length) % CATS.length]!.id);
  } else {
    const list = partsIn(snap.cat),
      i = list.findIndex((p) => p.id === snap.sel);
    api.choose(snap.cat, list[(i + step + list.length) % list.length]?.id);
  }
};

// Registered when this file loads (before Pause's own Esc handler), so Back leaves the garage and goes no further.
// Left/right step the parts, up/down the categories; the menu keys and the pad's grabbed slots share it.
const NAV: Record<string, () => void> = {
  left: () => move(-1, 'part'),
  right: () => move(1, 'part'),
  up: () => move(-1, 'cat'),
  down: () => move(1, 'cat'),
};

onMenuKey((e) => {
  if (!garage.api?.isOpen() || e.modified || e.typing) return;
  const act = e.key === 'back' ? () => leave() : (e.key && NAV[e.key]) || null;
  if (!act) return;
  e.preventDefault();
  e.stop();
  if (!e.repeat || e.key !== 'back') act();
});

onStart(() =>
  wrapAction('interact', {
    down: (next) => {
      const api = garage.api,
        snap = api?.snap();
      if (!api || !snap?.open) return next();
      if (snap.canSkip) return api.skip();
      if (snap.cat === 'whistle') return api.hear();
      api.holdStart();
    },
    up: (next) => {
      if (!garage.api?.isOpen()) return next();
      garage.api.holdEnd();
    },
  }),
);

const f = (v: number, digits = 0) => v.toFixed(digits);
function rowHtml(row: Row, i: number, snap: ReturnType<NonNullable<typeof garage.api>['snap']>) {
  if (row.kind === 'text') return `<div class="g-row"><span>${h(row.label)}</span><b>${h(row.text ?? '')}</b></div>`;
  const live = reducedMotion ? 1e6 : snap.ms;
  const s = shownRow(row, i, snap.phase, snap.phase === 'moment' ? live : 0);
  const cls = s.preview ? ' preview' : '';
  if (row.kind === 'pips') {
    const had = Math.round(row.now),
      total = Math.round(Math.max(row.now, row.then));
    const filled = Math.round(s.value);
    let pips = '';
    for (let k = 0; k < Math.max(total, 4); k++)
      pips += `<i class="${k < filled ? 'on' : ''}${k >= had && k < filled ? ' new' : ''}"></i>`;
    const arrow = s.arrow ? `<s>${had}</s> → ` : '';
    return `<div class="g-row"><span>${h(row.label)}</span><b class="${cls}">${arrow}<span class="pips">${pips}</span></b></div>`;
  }
  const arrow = s.arrow ? `<s>${f(row.now, row.digits)}</s> → ` : '';
  return `<div class="g-row"><span>${h(row.label)}</span><b class="${cls}">${arrow}${f(s.value, row.digits)}${h(row.unit ?? '')}</b></div>`;
}

function refresh() {
  const api = garage.api;
  if (!api) return;
  const snap = api.snap();
  if (snap.open && !root) build();
  if (!root || !els) return;
  if (snap.open !== wasOpen) {
    wasOpen = snap.open;
    root.hidden = !snap.open;
    document.body.classList.toggle('garage-open', snap.open);
    if (snap.open) {
      setPadGrab((slot) => (slot === 'b' ? leave() : NAV[slot]?.()), ['b', 'up', 'down', 'left', 'right'], {
        stick: true,
      });
      shownKey = railKey = '';
    } else setPadGrab(null);
  }
  if (!snap.open) return;
  const all = partsOf(snap.facts);
  const list = all.filter((p) => p.cat === snap.cat);
  // Keep the selection inside the category.
  if (!list.some((p) => p.id === snap.sel) && list[0]) api.choose(snap.cat, list[0].id);
  const part = list.find((p) => p.id === snap.sel) ?? list[0];
  if (!part) return;

  const rk = `${snap.cat}|${snap.sel}|${snap.facts.wagonCoupled}|${snap.facts.steelHome}|${snap.facts.longFitted}|${snap.phase === 'idle' || snap.phase === 'holding'}`;
  if (rk !== railKey) {
    railKey = rk;
    const groupOf = (g: Group) =>
      `<span class="g-grp ${g}">${GROUP_NAME[g]}</span>` +
      CATS.filter((c) => c.group === g)
        .map(
          (c) =>
            `<button class="g-cat ${g}" role="tab" type="button" data-cat="${c.id}" aria-selected="${c.id === snap.cat}">${c.name}</button>`,
        )
        .join('');
    els.rail.innerHTML = groupOf('fn') + groupOf('cos');
    els.parts.innerHTML = list
      .map(
        (p) =>
          `<button class="g-part" role="option" type="button" data-part="${p.id}" aria-selected="${p.id === snap.sel}"><span class="nm">${h(p.name)}</span><span class="pill ${p.standing}">${h(p.pill)}</span></button>`,
      )
      .join('');
    // A category with more parts than the strip holds (Cargo's four): the chosen tile is brought into view.
    els.parts.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    els.where.textContent = CATS.find((c) => c.id === snap.cat)!.name;
    els.name.textContent = part.name;
    els.pill.textContent = part.pill;
    els.pill.className = `g-pill pill ${part.standing}`;
    els.desc.textContent = part.desc;
    els.note.textContent = part.price ?? (snap.cat === 'looks' ? 'A look never changes what the train does.' : '');
    // What is missing, as a bill (what is needed, how many are in): shown where Install would be, with no button.
    els.need.hidden = !part.needs;
    els.need.innerHTML = part.needs
      ? `<span>${h(part.needs.what)}</span><b>${part.needs.have}/${part.needs.need}</b>`
      : '';
  }
  // Through a real install the rows count from the old numbers to the new, though the room's rows already say fitted.
  const landing = snap.real && snap.phase === 'moment';
  const rows = rowsFor(snap.cat, snap.sel, snap.facts.longFitted && !landing);
  const html = rows.map((r, i) => rowHtml(r, i, snap)).join('');
  if (html !== shownKey) {
    shownKey = html;
    els.rows.innerHTML = html;
  }
  const busy = snap.phase === 'moment';
  const label = els.btn.querySelector('.g-label')!;
  // No try-on (owner, 14 November 2026): the button is there only when the part can go on now, or is going on. A
  // part the room cannot install yet shows its bill instead, and no button.
  const act = snap.cat === 'whistle' ? 'hear' : landing || (snap.canInstall && part.id === 'long') ? 'install' : 'none';
  els.btn.dataset.act = act;
  els.btn.hidden = act === 'none';
  // "Installed" lands with the hit, as the tile's pill turns.
  const text =
    act === 'hear'
      ? 'Hear it'
      : landing && snap.ms >= MOMENT.hit
        ? 'Installed'
        : snap.phase === 'holding' && snap.held
          ? 'Keep holding'
          : 'Install';
  if (text === 'Installed' && label.textContent === 'Install') uiSound('pop');
  if (label.textContent !== text) label.textContent = text;
  els.btn.disabled = busy && act === 'install';
  root.style.setProperty('--ring', String(snap.phase === 'moment' ? 1 : snap.ring));
  root.classList.toggle('holding', snap.phase === 'holding');
  root.classList.toggle('moment', snap.phase === 'moment');
  root.classList.toggle('waiting', snap.waiting);

  els.skip.hidden = !snap.canSkip;
  const skipHtml = `${glyph('interact')} Skip`.trim();
  if (els.skip.dataset.html !== skipHtml) {
    els.skip.dataset.html = skipHtml;
    els.skip.innerHTML = skipHtml;
  }
  if (snap.tapped && performance.now() - snap.tapped < 700) els.btn.classList.add('pulse');
  else els.btn.classList.remove('pulse');
  els.btn.setAttribute('aria-label', act === 'install' ? 'Hold to install' : text);
}

defineKind('garage', { update: 40 });
spawn({
  kind: 'garage',
  update() {
    if (!me.entered && garage.api?.isOpen()) garage.api.close();
    refresh();
  },
});
