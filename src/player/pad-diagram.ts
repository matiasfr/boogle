// The gamepad diagram: a drawn controller with a callout for every button, generated from the control registry
// (src/player/controls.ts), so a rebound action moves its callout. The pause view's Gamepad tab shows it
// (src/features/pause.ts); DESIGN.md "Understandable at a glance" and "Telegraph everything".
//
//   padContexts()                  the situations with their own set, as [id, title]: always 'foot' (On foot), then
//                                  'driving' and 'talking' when the registry has rows for them
//   renderPadDiagram(context)      an element: the controller (inline SVG) between two columns of callouts, one per
//                                  slot and stick, with leader lines drawn once laid out (and again on resize).
//                                  A slot no control claims is dimmed and reads "Free". In a context set, the slots the
//                                  context changes are marked (.pd-hot); every other slot keeps its on-foot callout,
//                                  since those buttons still work there.
//
// Each callout carries data-slot and, when bound, data-id (the control's id). Glyphs follow the connected pad's brand
// (body[data-pad], src/player/glyphs.ts); with no pad yet the face buttons are drawn by position (a diamond of four
// dots) rather than with one brand's letters. Under 700 px wide the callouts stack under the controller, no lines.
import './pad-diagram.css';
import { listControls, listActions, menuSlot, PAD_LABEL, type ControlRow, type Detail } from './controls.ts';
import { padGlyph, padText, padDetail } from './glyphs.ts';

const NS = 'http://www.w3.org/2000/svg';
const W = 480; // the controller's viewBox width

type Callout = { slot: string; id?: string; label: string; detail?: string; hot?: boolean; shared?: boolean };
type Point = [number, number];
// Where each leader line ends on the drawing, and the points it passes on the way so it never crosses another control.
const SPOTS: Record<string, { at: Point; via?: Point[]; side: 'l' | 'r' }> = {
  lt: { at: [100, 22], side: 'l' },
  lb: { at: [70, 54], side: 'l' },
  ls: { at: [103, 116], side: 'l' },
  view: { at: [210, 120], via: [[176, 88]], side: 'l' },
  l3: { at: [119, 138], side: 'l' },
  up: { at: [178, 172], side: 'l' },
  left: { at: [154, 196], side: 'l' },
  right: { at: [203, 199], via: [[212, 240]], side: 'l' },
  down: { at: [178, 222], side: 'l' },
  rt: { at: [380, 22], side: 'r' },
  rb: { at: [410, 54], side: 'r' },
  y: { at: [362, 90], side: 'r' },
  menu: { at: [270, 120], via: [[318, 80]], side: 'r' },
  b: { at: [391, 136], side: 'r' },
  x: { at: [330, 124], via: [[366, 112]], side: 'r' },
  a: { at: [362, 167], side: 'r' },
  rs: { at: [326, 179], side: 'r' },
  r3: { at: [313, 206], side: 'r' },
};
const STICK: Record<string, string> = { ls: 'Left stick', rs: 'Right stick' };
const TITLES: Record<string, string> = { foot: 'On foot', driving: 'Driving', talking: 'Talking' };
const FACE = ['a', 'b', 'x', 'y'];
const POS: Record<string, string> = { a: 'Bottom', b: 'Right', x: 'Left', y: 'Top' };

const brand = () => (typeof document === 'undefined' ? '' : (document.body.dataset.pad ?? ''));
const slotsOf = (c: ControlRow) => [c.pad].flat().filter((p): p is string => !!p);
const detailOf = (d: Detail | undefined) => padDetail((typeof d === 'object' && d ? d.pad : d) ?? '');

// Talk boxes read their buttons themselves (src/player/conversation.ts, padPress), so the set is written out here;
// confirm and back follow menuSlot (swapped on a Switch pad).
const talkSet = (): Callout[] => [
  { slot: menuSlot('confirm'), label: 'Say the picked answer', detail: 'Or skip ahead while it types' },
  { slot: 'x', label: 'Say the picked answer' },
  { slot: menuSlot('back'), label: 'Leave the talk' },
  { slot: 'ls', label: 'Pick an answer', detail: 'You stand still while you talk' },
];

export function padContexts(list = listControls()): [string, string][] {
  const have = new Set(list.filter((c) => slotsOf(c).length).map((c) => c.context));
  return ['foot', 'driving', 'talking'].filter((k) => k === 'foot' || have.has(k)).map((k) => [k, TITLES[k]]);
}

// One callout per slot and stick for a context set.
function callouts(context: string): Map<string, Callout> {
  const list = listControls().filter((c) => slotsOf(c).length);
  const out = new Map<string, Callout>();
  const put = (slot: string, c: ControlRow, hot = false) => {
    const was = out.get(slot);
    if (was && !hot) return;
    out.set(slot, { slot, id: c.id, label: c.label, detail: detailOf(c.detail), hot, shared: slotsOf(c).length > 1 });
  };
  for (const c of list) if (!c.context) for (const s of slotsOf(c)) put(s, c);
  // A slot only a situation uses (LT crouches as the guest) still says what it does, and when.
  for (const c of list)
    if (c.context && !TITLES[c.context])
      for (const s of slotsOf(c)) if (!out.has(s)) put(s, { ...c, label: `${c.label} (${c.context})` });
  // Hidden actions name what a shared row leaves out: the hotbar row covers LB and RB, its actions say which way.
  for (const a of listActions()) {
    const c = out.get(a.pad);
    if (!c) out.set(a.pad, { slot: a.pad, id: a.id, label: a.label });
    else if (!a.guide && c.shared && a.label) c.detail = a.label;
  }
  if (context === 'talking') for (const t of talkSet()) out.set(t.slot, { ...t, id: `talk-${t.slot}`, hot: true });
  for (const c of list) if (c.context === context) for (const s of slotsOf(c)) put(s, c, true);
  if (context === 'talking')
    for (const s of ['up', 'down']) {
      const c = out.get(s);
      if (c?.hot) Object.assign(c, { label: 'Pick an answer', detail: '' });
    }
  return out;
}

// ---------------------------------------------------------------- the drawing
const FILL: Record<string, Record<string, [string, string]>> = {
  // [button fill, label colour] per brand; generic is a plain paper button
  xbox: { a: ['#3fae4a', '#fff'], b: ['#e2453c', '#fff'], x: ['#3a7be0', '#fff'], y: ['#f2b81a', '#fff'] },
  ps: { a: ['#2c3446', '#8db4ff'], b: ['#2c3446', '#ff7b72'], x: ['#2c3446', '#f59bd6'], y: ['#2c3446', '#45d6b0'] },
  nintendo: { a: ['#2c3446', '#fff'], b: ['#2c3446', '#fff'], x: ['#2c3446', '#fff'], y: ['#2c3446', '#fff'] },
};
const FACE_AT: Record<string, Point> = { y: [350, 98], x: [320, 128], b: [380, 128], a: [350, 158] };

function face(slot: string) {
  const [cx, cy] = FACE_AT[slot];
  const colors = FILL[brand()]?.[slot];
  const fill = colors ? colors[0] : 'var(--paper)';
  const text = colors ? `<text x="${cx}" y="${cy + 6}" style="fill:${colors[1]}">${padText(slot)}</text>` : '';
  return `<g class="pd-ctl" data-slot="${slot}"><circle cx="${cx}" cy="${cy}" r="14" fill="${fill}"/>${text}</g>`;
}
const shoulder = (slot: string, x: number, y: number, w: number, h: number, ty: number) =>
  `<g class="pd-ctl pd-sh" data-slot="${slot}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2.2}"/>` +
  `<text x="${x + w / 2}" y="${ty}">${brand() ? padText(slot) : PAD_LABEL[slot]}</text></g>`;
const stick = (slot: string, click: string, cx: number, cy: number) =>
  `<g class="pd-ctl pd-well" data-slot="${slot}"><circle cx="${cx}" cy="${cy}" r="30"/></g>` +
  `<g class="pd-ctl pd-cap" data-slot="${click}"><circle cx="${cx}" cy="${cy}" r="19"/>` +
  `<circle class="pd-grip" cx="${cx}" cy="${cy}" r="11"/></g>`;
const arm = (slot: string, x: number, y: number, w: number, h: number) =>
  `<g class="pd-ctl pd-dir" data-slot="${slot}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></g>`;
const BODY =
  'M150 62 H330 C380 62 410 70 428 96 C446 122 462 190 468 240 C474 290 452 312 424 310 C398 308 384 290 368 264 ' +
  'C356 246 344 242 322 242 H158 C136 242 124 246 112 264 C96 290 82 308 56 310 C28 312 6 290 12 240 ' +
  'C18 190 34 122 52 96 C70 70 100 62 150 62 Z';

function controllerSvg() {
  return `<svg class="pd-pad" viewBox="0 0 ${W} 330" role="img" aria-label="A gamepad">
    ${shoulder('lt', 84, 4, 72, 46, 26)}${shoulder('rt', 324, 4, 72, 46, 26)}
    ${shoulder('lb', 58, 38, 116, 34, 58)}${shoulder('rb', 306, 38, 116, 34, 58)}
    <path class="pd-shadow" d="${BODY}" transform="translate(0 7)"/>
    <path class="pd-body" d="${BODY}"/>
    ${stick('ls', 'l3', 130, 128)}${stick('rs', 'r3', 302, 196)}
    <rect class="pd-hub" x="169" y="187" width="18" height="18"/>
    ${arm('up', 169, 167, 18, 22)}${arm('down', 169, 203, 18, 22)}${arm('left', 149, 187, 22, 18)}${arm('right', 185, 187, 22, 18)}
    <g class="pd-ctl pd-mid" data-slot="view"><rect x="198" y="113" width="24" height="14" rx="7"/></g>
    <g class="pd-ctl pd-mid" data-slot="menu"><rect x="258" y="113" width="24" height="14" rx="7"/></g>
    ${FACE.map(face).join('')}
  </svg>`;
}

// ---------------------------------------------------------------- callouts
// With no pad connected, a face button is named by position: four dots with the one meant filled.
const dots = (slot: string) => {
  const at: Record<string, Point> = { y: [12, 4.5], x: [4.5, 12], b: [19.5, 12], a: [12, 19.5] };
  const c = FACE.map((s) => {
    const [x, y] = at[s];
    return `<circle cx="${x}" cy="${y}" r="3.6" class="${s === slot ? 'on' : ''}"/>`;
  }).join('');
  return `<svg class="g pd-dots" viewBox="0 0 24 24" role="img" aria-label="${POS[slot]} face button">${c}</svg>`;
};
const glyphFor = (slot: string) => (!brand() && FACE.includes(slot) ? dots(slot) : padGlyph(slot));

function calloutEl(c: Callout | undefined, slot: string) {
  const el = document.createElement('div');
  el.className = 'pd-call';
  el.dataset.slot = slot;
  if (c?.id) el.dataset.id = c.id;
  if (!c) el.classList.add('pd-free');
  if (c?.hot) el.classList.add('pd-hot');
  const g = document.createElement('span');
  g.className = 'pd-glyph';
  g.innerHTML = glyphFor(slot);
  const text = document.createElement('span');
  text.className = 'pd-text';
  const label = document.createElement('span');
  label.className = 'pd-label';
  label.textContent = c ? c.label : 'Free';
  text.append(label);
  const detail = c ? c.detail : '';
  if (detail || STICK[slot]) {
    const d = document.createElement('span');
    d.className = 'pd-detail';
    d.textContent = detail || STICK[slot];
    text.append(d);
    if (detail) el.title = detail;
  }
  el.append(g, text);
  return el;
}

function drawLines(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('.pd-pad');
  const lines = root.querySelector<SVGSVGElement>('.pd-lines');
  if (!svg || !lines || !root.isConnected) return;
  const box = root.getBoundingClientRect();
  const pad = svg.getBoundingClientRect();
  lines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  if (getComputedStyle(lines).display === 'none' || !pad.width) return lines.replaceChildren();
  const k = pad.width / W;
  const map = ([x, y]: Point): Point => [pad.left - box.left + x * k, pad.top - box.top + y * k];
  const paths: SVGElement[] = [];
  for (const call of root.querySelectorAll<HTMLElement>('.pd-call')) {
    const spot = SPOTS[call.dataset.slot!];
    const g = call.querySelector('.pd-glyph')!.getBoundingClientRect();
    const left = spot.side === 'l';
    const start: Point = [(left ? g.right + 6 : g.left - 6) - box.left, g.top + g.height / 2 - box.top];
    const edge: Point = [left ? pad.left - box.left - 4 : pad.right - box.left + 4, start[1]];
    const pts = [start, edge, ...(spot.via ?? []).map(map), map(spot.at)];
    const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
    const cls = call.classList.contains('pd-free') ? 'free' : call.classList.contains('pd-hot') ? 'hot' : '';
    for (const part of ['halo', 'line']) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', `pd-${part} ${cls}`);
      paths.push(p);
    }
    const [x, y] = map(spot.at);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', '3.5');
    dot.setAttribute('class', `pd-end ${cls}`);
    paths.push(dot);
  }
  lines.replaceChildren(...paths);
}

export function renderPadDiagram(context = 'foot') {
  const set = callouts(context);
  const root = document.createElement('div');
  root.className = 'pad-diagram';
  root.dataset.context = context;
  root.dataset.brand = brand() || 'generic';
  const cols = { l: document.createElement('div'), r: document.createElement('div') };
  cols.l.className = 'pd-col pd-left';
  cols.r.className = 'pd-col pd-right';
  // Sorted top to bottom by where each line first turns, so the lines fan out without crossing.
  const turn = (slot: string) => (SPOTS[slot].via?.[0] ?? SPOTS[slot].at)[1];
  const order = Object.keys(SPOTS).sort((a, b) => turn(a) - turn(b));
  for (const slot of order) cols[SPOTS[slot].side].append(calloutEl(set.get(slot), slot));
  const mid = document.createElement('div');
  mid.className = 'pd-mid-col';
  mid.innerHTML = controllerSvg();
  for (const g of mid.querySelectorAll<SVGGElement>('.pd-ctl')) {
    const c = set.get(g.dataset.slot!);
    g.classList.toggle('free', !c);
    g.classList.toggle('hot', !!c?.hot);
  }
  const lines = document.createElementNS(NS, 'svg');
  lines.setAttribute('class', 'pd-lines');
  lines.setAttribute('aria-hidden', 'true');
  root.append(lines, cols.l, mid, cols.r);
  const draw = () => drawLines(root);
  if (typeof ResizeObserver === 'function') new ResizeObserver(draw).observe(root);
  requestAnimationFrame(draw);
  document.fonts?.ready.then(draw);
  return root;
}
