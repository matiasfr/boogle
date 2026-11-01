// The heat map under each card (docs/research/playtest-telemetry.md, recs 6, 8 and 9): the card's recorded sittings
// (src/proto/trace/record.ts, read through store.ts) drawn over a top-down picture of the island. Layers as toggles:
// where you went (samples counted per 2 m cell, the busiest cell at full colour, and the last sitting's path as a thin
// line), where you idled (discs sized by the seconds), where you failed (crosses coloured by kind) and where each
// sitting ended (rings; the latest is the big one). A row of buttons picks the variant. One canvas, no library.
import './heat.css';
import islandUrl from './island.png';
import type { Proto } from './protos.ts';
import { IDLE_S, SITTINGS, markColor, sittingLine, sittings, type Sitting } from './store.ts';

/** protos/island.png: `npm run island-map -- --protos` prints these (1 m per pixel, +z down). */
const MAP = { x0: -130, z0: -140, w: 270, h: 210 };
const CELL = 2; // m, the heat map's cells (the layout lab's)
const PAD = 14; // m around what was recorded
const MIN_SPAN = 60; // m: the closest the map zooms in
const ASPECT = 0.75; // height / width
const SEA = '#1a5ea3';

const island = new Image();
island.src = islandUrl;
const ready = island.decode().catch(() => undefined);

type Layer = 'went' | 'idled' | 'failed' | 'quit';
const LAYERS: { id: Layer; label: string }[] = [
  { id: 'went', label: 'Went' },
  { id: 'idled', label: 'Idled' },
  { id: 'failed', label: 'Failed' },
  { id: 'quit', label: 'Quit' },
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const toggle = (text: string, on: boolean, fn: () => void) => {
  const b = el('button', 'heat-tog', text);
  b.type = 'button';
  b.setAttribute('aria-pressed', String(on));
  b.addEventListener('click', fn);
  return b;
};

/** The square-ish window of the world to show: everything recorded, padded, at least MIN_SPAN across. */
function view(list: Sitting[]) {
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  const add = (x: number, z: number) => {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  };
  for (const s of list) {
    for (let i = 0; i < s.p.length; i += 4) add(s.p[i + 1], s.p[i + 2]);
    for (const m of s.marks) add(m.x, m.z);
  }
  if (!Number.isFinite(x0)) return { x: MAP.x0, z: MAP.z0, w: MAP.w, h: MAP.w * ASPECT };
  let w = Math.max(MIN_SPAN, x1 - x0 + 2 * PAD),
    h = Math.max(MIN_SPAN * ASPECT, z1 - z0 + 2 * PAD);
  if (h / w > ASPECT) w = h / ASPECT;
  else h = w * ASPECT;
  return { x: (x0 + x1) / 2 - w / 2, z: (z0 + z1) / 2 - h / 2, w, h };
}

function draw(canvas: HTMLCanvasElement, list: Sitting[], on: Set<Layer>) {
  const css = canvas.clientWidth || 320;
  const dpr = Math.min(3, devicePixelRatio || 1);
  canvas.width = Math.round(css * dpr);
  canvas.height = Math.round(css * ASPECT * dpr);
  const g = canvas.getContext('2d');
  if (!g) return;
  const v = view(list);
  const k = canvas.width / v.w; // px per metre
  const X = (x: number) => (x - v.x) * k,
    Z = (z: number) => (z - v.z) * k;
  g.fillStyle = SEA;
  g.fillRect(0, 0, canvas.width, canvas.height);
  if (island.complete && island.naturalWidth) g.drawImage(island, X(MAP.x0), Z(MAP.z0), MAP.w * k, MAP.h * k);
  g.fillStyle = 'rgba(255,255,255,0.18)'; // wash the backdrop so the heat reads over it
  g.fillRect(0, 0, canvas.width, canvas.height);
  const u = Math.max(1, dpr); // a CSS pixel in canvas pixels

  if (on.has('went')) {
    const cells = new Map<string, number>();
    let max = 0;
    for (const s of list)
      for (let i = 0; i < s.p.length; i += 4) {
        const key = `${Math.floor(s.p[i + 1] / CELL)},${Math.floor(s.p[i + 2] / CELL)}`;
        const n = (cells.get(key) ?? 0) + 1;
        cells.set(key, n);
        max = Math.max(max, n);
      }
    for (const [key, n] of cells) {
      const [cx, cz] = key.split(',').map(Number);
      const t = Math.sqrt(n / max); // a square-root ramp, so a cell passed once still shows
      g.fillStyle = `hsla(${50 - 50 * t}, 100%, ${55 - 10 * t}%, ${0.45 + 0.5 * t})`;
      g.fillRect(X(cx * CELL), Z(cz * CELL), CELL * k + 0.5, CELL * k + 0.5);
    }
    const last = list.at(-1);
    if (last && last.p.length > 4) {
      g.strokeStyle = 'rgba(20,16,12,0.7)';
      g.lineWidth = 1.5 * u;
      g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i < last.p.length; i += 4) {
        const x = X(last.p[i + 1] + 0.5),
          z = Z(last.p[i + 2] + 0.5);
        const jump = i > 0 && Math.hypot(last.p[i + 1] - last.p[i - 3], last.p[i + 2] - last.p[i - 2]) > 40;
        if (i === 0 || jump) g.moveTo(x, z);
        else g.lineTo(x, z);
      }
      g.stroke();
    }
  }
  if (on.has('idled'))
    for (const s of list)
      for (let i = 0; i < s.idle.length; i += 4) {
        const r = Math.max(4 * u, Math.min(10, 1 + Math.sqrt(s.idle[i + 3]) * 0.8) * k);
        g.beginPath();
        g.arc(X(s.idle[i + 1] + 0.5), Z(s.idle[i + 2] + 0.5), r, 0, Math.PI * 2);
        g.fillStyle = 'rgba(110,80,200,0.35)';
        g.fill();
        g.strokeStyle = 'rgba(80,50,170,0.9)';
        g.lineWidth = 1.5 * u;
        g.stroke();
      }
  if (on.has('failed'))
    for (const s of list)
      for (const m of s.marks) {
        if (m.k === 'verb') continue;
        const x = X(m.x + 0.5),
          z = Z(m.z + 0.5),
          r = 5 * u;
        g.lineCap = 'round';
        for (const [w, c] of [
          [4.5 * u, '#ffffff'],
          [2.5 * u, markColor(m.k)],
        ] as const) {
          g.strokeStyle = c;
          g.lineWidth = w;
          g.beginPath();
          g.moveTo(x - r, z - r);
          g.lineTo(x + r, z + r);
          g.moveTo(x + r, z - r);
          g.lineTo(x - r, z + r);
          g.stroke();
        }
      }
  if (on.has('quit'))
    list.forEach((s, i) => {
      if (!s.end) return;
      const latest = i === list.length - 1;
      g.beginPath();
      g.arc(X(s.end.x + 0.5), Z(s.end.z + 0.5), (latest ? 7 : 4.5) * u, 0, Math.PI * 2);
      g.fillStyle = latest ? '#ffffff' : 'rgba(255,255,255,0.75)';
      g.fill();
      g.strokeStyle = '#111111';
      g.lineWidth = (latest ? 3 : 2) * u;
      g.stroke();
    });

  // A scale bar: 10 m.
  const bar = 10 * k;
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(8 * u, canvas.height - 14 * u, bar, 3 * u);
  g.font = `${11 * u}px system-ui, sans-serif`;
  g.fillText('10 m', 8 * u + bar + 4 * u, canvas.height - 10 * u);
}

/** The card's map section; `redraw` re-reads the store (the game tab may have saved a sitting). */
export function heatMap(p: Proto) {
  const box = el('section', 'heat');
  const on = new Set<Layer>(LAYERS.map((l) => l.id));
  let variant: string | null = null; // null: every variant

  const redraw = () => {
    const all = sittings(p.id);
    box.hidden = !all.length;
    if (!all.length) return box.replaceChildren();
    const variants = [...new Set(all.map((s) => s.v))];
    if (variant !== null && !variants.includes(variant)) variant = null;
    const list = variant === null ? all : all.filter((s) => s.v === variant);

    const head = el('p', 'heat-head');
    head.append(
      el('strong', '', 'Where you went'),
      el('span', 'heat-n', ` · ${list.length} sitting${list.length === 1 ? '' : 's'} (this browser keeps ${SITTINGS})`),
    );
    const rows: HTMLElement[] = [head];
    if (p.variants?.length) {
      const row = el('div', 'heat-row');
      row.append(toggle('All', variant === null, () => ((variant = null), redraw())));
      for (const v of variants) row.append(toggle(v || 'default', variant === v, () => ((variant = v), redraw())));
      rows.push(row);
    }
    const layers = el('div', 'heat-row');
    for (const l of LAYERS)
      layers.append(
        toggle(l.label, on.has(l.id), () => {
          if (!on.delete(l.id)) on.add(l.id);
          redraw();
        }),
      );
    rows.push(layers);
    const canvas = el('canvas', 'heat-map');
    canvas.setAttribute('role', 'img');
    const line = sittingLine(list.at(-1));
    canvas.setAttribute('aria-label', `Heat map of ${list.length} sittings. Latest: ${line}`);
    rows.push(canvas);
    const legend = el('p', 'heat-legend');
    const kinds = new Map<string, number>();
    for (const s of list) for (const m of s.marks) if (m.k !== 'verb') kinds.set(m.k, (kinds.get(m.k) ?? 0) + 1);
    for (const [k, n] of kinds) {
      const chip = el('span', 'heat-kind', `${n} ${k}`);
      chip.style.setProperty('--c', markColor(k));
      legend.append(chip);
    }
    legend.append(el('span', 'heat-last', `Latest: ${line}. Idle: still for ${IDLE_S} s or more.`));
    rows.push(legend);
    box.replaceChildren(...rows);
    draw(canvas, list, on);
  };
  void ready.then(redraw);
  let width = 0;
  new ResizeObserver(() => {
    if (box.clientWidth !== width && (width = box.clientWidth)) redraw();
  }).observe(box);
  return { el: box, redraw };
}
