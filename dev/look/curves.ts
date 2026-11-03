// Motion as numbers: every frame of a capture, the player's speed, vertical speed and height, the camera's distance and field
// of view, and the frame's own time, as a CSV, a plot and a few readings. For what a contact sheet can't show: how fast a glide
// settles, whether a sprint's camera pumps, whether a jump's arc changed. `npm run look -- --curves` (.claude/skills/look).
// `--curves-vs old.csv` draws an earlier run underneath; `--target glide` draws a reference (./targets.ts) and scores against it.
import fs from 'node:fs';
import type { Game } from './lib.ts';

export type Row = {
  t: number;
  speed: number;
  vy: number;
  y: number;
  cam: number;
  fov: number;
  ms: number;
  ground: number;
};
export type Target = { about: string; bands: Partial<Record<keyof Row, { lo: number; hi: number; note: string }>> };
export type CurveData = { rows: Row[]; marks: { t: number; name: string }[] };

const COLUMNS: (keyof Row)[] = ['t', 'speed', 'vy', 'y', 'cam', 'fov', 'ms', 'ground'];

/** Page code: starts sampling, one row a frame, until `__curves.stop`. */
export const START_CURVES = `
  const { me } = await import('/src/player/player.ts');
  const { camera } = await import('/src/render/scene.ts');
  const c = (window.__curves = { rows: [], marks: [], stop: false });
  const t0 = performance.now();
  let last = t0;
  // The objective line calls in every frame; only what's new is a mark here.
  await import('/src/proto/mark.ts').then((m) =>
    m.watchPlayMarks?.((name) => name !== 'objective' && c.marks.push({ t: (performance.now() - t0) / 1000, name })),
  );
  const tick = () => {
    if (c.stop) return;
    requestAnimationFrame(tick);
    const b = me.body;
    if (!b) return;
    const now = performance.now();
    const dx = camera.position.x - b.position.x, dy = camera.position.y - b.position.y, dz = camera.position.z - b.position.z;
    c.rows.push({
      t: (now - t0) / 1000,
      speed: Math.hypot(b.velocity.x, b.velocity.z),
      vy: b.velocity.y,
      y: b.position.y,
      cam: Math.sqrt(dx * dx + dy * dy + dz * dz),
      fov: camera.fov,
      ms: now - last,
      ground: me.coyote > 0 ? 1 : 0,
    });
    last = now;
  };
  tick();
`;
export const STOP_CURVES = `window.__curves.stop = true; return { rows: window.__curves.rows, marks: window.__curves.marks };`;

export const readCsv = (file: string): Row[] => {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n');
  const names = head!.split(',') as (keyof Row)[];
  return lines.map((l) => {
    const v = l.split(',').map(Number);
    return Object.fromEntries(names.map((n, k) => [n, v[k]!])) as Row;
  });
};
export const writeCsv = (file: string, rows: Row[]) =>
  fs.writeFileSync(
    file,
    [
      COLUMNS.join(','),
      ...rows.map((r) => COLUMNS.map((c) => (c === 't' ? r[c].toFixed(4) : Number(r[c].toFixed(3)))).join(',')),
    ].join('\n') + '\n',
  );

const pct = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;

/** A few plain readings: what you'd otherwise squint at the plot for. */
export function readings(rows: Row[], target?: Target | null) {
  const out: string[] = [];
  const of = (k: keyof Row) => rows.map((r) => r[k]);
  const third = rows.slice(Math.floor((rows.length * 2) / 3));
  const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  const speed = of('speed');
  const peak = Math.max(...speed);
  const peakAt = rows[speed.indexOf(peak)]?.t ?? 0;
  const firstMove = rows.find((r) => r.speed > 0.2)?.t ?? 0;
  const near = rows.find((r) => r.speed >= peak * 0.9)?.t ?? 0;
  out.push(
    `speed: peak ${peak.toFixed(1)} m/s at ${peakAt.toFixed(2)} s; 90% of it ${(near - firstMove).toFixed(2)} s after moving; ` +
      `${avg(third.map((r) => r.speed)).toFixed(1)} over the last third`,
  );
  const y = of('y');
  const air = rows.filter((r) => !r.ground);
  out.push(
    `height: ${Math.min(...y).toFixed(1)} to ${Math.max(...y).toFixed(1)} m; vy ${Math.min(...of('vy')).toFixed(1)} to ` +
      `${Math.max(...of('vy')).toFixed(1)} m/s; ${air.length ? `in the air ${((air.length / rows.length) * 100).toFixed(0)}% of frames` : 'never left the ground'}`,
  );
  const cam = of('cam');
  out.push(
    `camera: ${Math.min(...cam).toFixed(2)} to ${Math.max(...cam).toFixed(2)} m from the player, fov ` +
      `${Math.min(...of('fov')).toFixed(0)} to ${Math.max(...of('fov')).toFixed(0)}`,
  );
  const ms = of('ms')
    .slice(1)
    .sort((a, b) => a - b);
  out.push(
    `frames: ${rows.length}, ${pct(ms, 0.5).toFixed(1)} ms typical, ${pct(ms, 0.95).toFixed(1)} p95, ${(ms.at(-1) ?? 0).toFixed(0)} worst ` +
      `(screenshots stall frames: --frames 2 for clean timing; not a benchmark)`,
  );
  if (target) {
    out.push(`target: ${target.about}`);
    for (const [k, b] of Object.entries(target.bands)) {
      const v = avg(third.map((r) => r[k as keyof Row]));
      const ok = v >= b.lo && v <= b.hi;
      // When it came inside for good: the time to settle, on the same clock as the plot and the marks.
      const outside = rows.findLastIndex((r) => r[k as keyof Row] < b.lo || r[k as keyof Row] > b.hi);
      const settled =
        outside < 0
          ? 'inside throughout'
          : outside === rows.length - 1
            ? 'not settled'
            : `settled at ${rows[outside + 1]!.t.toFixed(2)} s`;
      out.push(
        `  ${k} over the last third ${v.toFixed(2)}: ${ok ? 'inside' : 'OUTSIDE'} ${b.lo} to ${b.hi}, ${settled} (${b.note})`,
      );
    }
  }
  return out;
}

type Plot = {
  rows: Row[];
  marks: { t: number; name: string }[];
  vs: Row[] | null;
  target: Target | null;
  label: string;
};
// In a scratch page (canvas), so the harness needs no image library. One value on each axis, stacked on one clock.
function draw({ rows, marks, vs, target, label }: Plot) {
  const PANELS: [keyof Row, string][] = [
    ['speed', 'speed, m/s'],
    ['vy', 'vertical speed, m/s'],
    ['y', 'height, m'],
    ['cam', 'camera distance, m'],
    ['ms', 'frame time, ms'],
  ];
  const W = 1000,
    H = 170,
    PAD = 58,
    TOP = 34,
    GAP = 8,
    INK = '#2a2a28',
    MUTED = '#77756f',
    GRID = '#e4e2dc',
    LINE = '#2a6fdb',
    OLD = '#b0aea7',
    BAND = 'rgba(46, 158, 92, 0.16)';
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = TOP + PANELS.length * (H + GAP) + 24;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#fbfaf7';
  g.fillRect(0, 0, cv.width, cv.height);
  g.font = 'bold 15px system-ui, sans-serif';
  g.fillStyle = INK;
  g.fillText(label, PAD, 22);
  const tMax = Math.max(rows.at(-1)?.t ?? 1, vs?.at(-1)?.t ?? 0, 0.1);
  const x = (t: number) => PAD + (t / tMax) * (W - PAD - 16);
  PANELS.forEach(([key, title], p) => {
    const y0 = TOP + p * (H + GAP);
    const band = target?.bands[key];
    const vals = [...rows, ...(vs ?? [])].map((r) => r[key]);
    let lo = Math.min(...vals, ...(band ? [band.lo] : []));
    let hi = Math.max(...vals, ...(band ? [band.hi] : []));
    if (key === 'ms') {
      lo = 0;
      hi = Math.min(hi, 100);
    }
    if (hi - lo < 0.5) {
      lo -= 0.25;
      hi += 0.25;
    }
    const y = (v: number) => y0 + H - 18 - ((v - lo) / (hi - lo)) * (H - 26);
    g.strokeStyle = GRID;
    g.lineWidth = 1;
    g.font = '11px system-ui, sans-serif';
    g.fillStyle = MUTED;
    for (let k = 0; k <= 2; k++) {
      const v = lo + ((hi - lo) * k) / 2;
      g.beginPath();
      g.moveTo(PAD, y(v));
      g.lineTo(W - 16, y(v));
      g.stroke();
      g.fillText(v.toFixed(Math.abs(hi - lo) < 10 ? 1 : 0), 14, y(v) + 4);
    }
    if (band) {
      g.fillStyle = BAND;
      g.fillRect(PAD, y(band.hi), W - PAD - 16, y(band.lo) - y(band.hi));
    }
    for (const m of marks) {
      g.strokeStyle = '#c9a227';
      g.beginPath();
      g.moveTo(x(m.t), y0 + 4);
      g.lineTo(x(m.t), y0 + H - 18);
      g.stroke();
      if (p === 0) {
        g.fillStyle = MUTED;
        g.fillText(m.name.slice(0, 20), x(m.t) + 3, y0 + 14);
      }
    }
    const line = (list: Row[], color: string, dash: number[]) => {
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.setLineDash(dash);
      g.beginPath();
      list.forEach((r, k) => {
        const v = Math.min(hi, r[key]);
        if (k) g.lineTo(x(r.t), y(v));
        else g.moveTo(x(r.t), y(v));
      });
      g.stroke();
      g.setLineDash([]);
      g.lineWidth = 1;
    };
    if (vs) line(vs, OLD, [5, 4]);
    line(rows, LINE, []);
    g.font = 'bold 12px system-ui, sans-serif';
    g.fillStyle = INK;
    g.fillText(title + (band ? `  (band: ${band.note})` : ''), PAD + 4, y0 + (p === 0 && marks.length ? 28 : 14));
  });
  g.font = '11px system-ui, sans-serif';
  g.fillStyle = MUTED;
  for (let t = 0; t <= tMax; t += tMax > 12 ? 2 : 1) g.fillText(`${t} s`, x(t) - 6, cv.height - 8);
  if (vs) {
    g.fillStyle = MUTED;
    g.fillText('dashed: the earlier run', W - 150, 22);
  }
  return cv.toDataURL('image/png');
}

export async function plotCurves(game: Game, file: string, plot: Plot) {
  const page = await game.ctx.newPage();
  const url = await page.evaluate(draw, plot);
  await page.close();
  fs.writeFileSync(file, Buffer.from(url.split(',')[1]!, 'base64'));
}
