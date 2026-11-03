// A session's routes and idle spots as a PNG, on the map if we have one: the same recipe as the protos page's heat map
// (protos/heat.ts): samples counted per 2 m cell, a square-root ramp, the path as a line, idle discs, marks as crosses.
// Drawn on a real canvas in headless Chromium, so labels and lines look right with no drawing code of our own. Several
// players in one room share the picture, each path its own colour.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ISLAND_MAP } from '../../protos/store.ts';
import type { Sketch } from './beats.ts';
import { num, str, type Session } from './read.ts';
import { playerName } from './summary.ts';

const PLAYER_COLORS = ['#ffffff', '#111111', '#ff4fd8', '#39e6ff'];

type Player = {
  name: string;
  color: string;
  path: [number, number][];
  idle: [number, number, number][];
  into: [number, number, number][];
  marks: { n: string; x: number; z: number }[];
  steps: { n: number; x: number; z: number }[]; // n: its place in the objective timeline
};
type DrawData = {
  players: Player[];
  sketch: Sketch | null;
  island: string | null;
  map: typeof ISLAND_MAP;
  title: string;
};

function draw(d: DrawData) {
  const W = 1600;
  const canvas = document.querySelector('canvas')!;
  const g = canvas.getContext('2d')!;
  const CELL = 2;
  const KEY = 110; // px, the key under the map
  const labels: [number, number][] = []; // where labels went, so two at one spot don't overprint
  // The window: everything recorded, padded, at least 60 m across.
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const p of d.players)
    for (const [x, z] of p.path) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  if (!Number.isFinite(x0)) {
    x0 = z0 = -50;
    x1 = z1 = 50;
  }
  const pad = 20;
  const spanX = Math.max(60, x1 - x0 + 2 * pad);
  const spanZ = Math.max(45, z1 - z0 + 2 * pad);
  const k = Math.min(W / spanX, 1200 / spanZ); // px per metre
  canvas.width = Math.max(1200, Math.round(spanX * k)); // room for the key
  canvas.height = Math.round(spanZ * k) + KEY;
  const ox = (x0 + x1) / 2 - spanX / 2;
  const oz = (z0 + z1) / 2 - spanZ / 2;
  const X = (x: number) => (x - ox) * k;
  const Z = (z: number) => (z - oz) * k;
  const H = canvas.height - KEY;

  g.fillStyle = d.sketch ? '#51794f' : '#1a5ea3';
  g.fillRect(0, 0, canvas.width, H);
  const paint = () => {
    if (d.sketch) {
      const line = (pts: [number, number][], color: string, w: number) => {
        g.strokeStyle = color;
        g.lineWidth = w;
        g.lineJoin = 'round';
        g.beginPath();
        pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
        g.stroke();
      };
      for (const l of d.sketch.lines) line(l, '#c9b184', 5);
      for (const l of d.sketch.rails) line(l, '#3a3a44', 3);
      g.font = '18px system-ui, sans-serif';
      for (const p of d.sketch.places) {
        g.beginPath();
        g.arc(X(p.x), Z(p.z), p.r * k, 0, Math.PI * 2);
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.fillText(p.name, X(p.x) - 30, Z(p.z));
      }
    }
    g.fillStyle = 'rgba(255,255,255,0.14)'; // wash, so the heat reads over it
    g.fillRect(0, 0, canvas.width, H);

    const cells = new Map<string, number>();
    let max = 1;
    for (const p of d.players)
      for (const [x, z] of p.path) {
        const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
        const n = (cells.get(key) ?? 0) + 1;
        cells.set(key, n);
        max = Math.max(max, n);
      }
    for (const [key, n] of cells) {
      const [cx, cz] = key.split(',').map(Number);
      const t = Math.sqrt(n / max);
      g.fillStyle = `hsla(${50 - 50 * t}, 100%, ${55 - 10 * t}%, ${0.45 + 0.5 * t})`;
      g.fillRect(X(cx! * CELL), Z(cz! * CELL), CELL * k + 0.5, CELL * k + 0.5);
    }
    for (const p of d.players) {
      g.strokeStyle = p.color;
      g.lineWidth = 2;
      g.lineJoin = 'round';
      g.beginPath();
      p.path.forEach(([x, z], i) => {
        const prev = p.path[i - 1];
        if (!prev || Math.hypot(x - prev[0], z - prev[1]) > 40) g.moveTo(X(x), Z(z));
        else g.lineTo(X(x), Z(z));
      });
      g.stroke();
    }
    for (const p of d.players) {
      for (const [x, z, s] of p.idle) {
        g.beginPath();
        g.arc(X(x), Z(z), Math.max(7, Math.min(10, 1 + Math.sqrt(s) * 0.8) * k), 0, Math.PI * 2);
        g.fillStyle = 'rgba(110,80,200,0.35)';
        g.fill();
        g.strokeStyle = 'rgba(80,50,170,0.9)';
        g.lineWidth = 2;
        g.stroke();
      }
      for (const [x, z, s] of p.into) {
        const r = Math.max(6, Math.min(14, 3 + s));
        g.beginPath();
        g.moveTo(X(x), Z(z) - r);
        g.lineTo(X(x) + r, Z(z) + r);
        g.lineTo(X(x) - r, Z(z) + r);
        g.closePath();
        g.fillStyle = '#ff8c42';
        g.fill();
        g.strokeStyle = '#3b1d00';
        g.lineWidth = 1.5;
        g.stroke();
      }
      const labelled = new Set<string>();
      g.font = '15px system-ui, sans-serif';
      for (const m of p.marks) {
        const x = X(m.x),
          z = Z(m.z),
          r = 6;
        for (const [w, c] of [
          [5, '#ffffff'],
          [2.5, '#c1121f'],
        ] as const) {
          g.strokeStyle = c;
          g.lineWidth = w;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(x - r, z - r);
          g.lineTo(x + r, z + r);
          g.moveTo(x + r, z - r);
          g.lineTo(x - r, z + r);
          g.stroke();
        }
        if (labelled.has(m.n)) continue;
        labelled.add(m.n);
        let ly = z + 5;
        while (labels.some(([lx, y]) => Math.abs(lx - x) < 120 && Math.abs(y - ly) < 18)) ly += 18;
        labels.push([x, ly]);
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,0.8)';
        g.strokeText(m.n, x + 16, ly);
        g.fillStyle = '#ffffff';
        g.fillText(m.n, x + 16, ly);
      }
      for (const st of p.steps) {
        g.beginPath();
        g.arc(X(st.x), Z(st.z), 12, 0, Math.PI * 2);
        g.fillStyle = '#ffffff';
        g.fill();
        g.strokeStyle = p.color === '#ffffff' ? '#111111' : p.color;
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = '#111111';
        g.font = 'bold 14px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillText(String(st.n), X(st.x), Z(st.z) + 5);
        g.textAlign = 'left';
      }
    }
    // The key.
    g.fillStyle = '#16181d';
    g.fillRect(0, H, canvas.width, KEY);
    g.fillStyle = '#ffffff';
    g.font = 'bold 20px system-ui, sans-serif';
    g.fillText(d.title, 16, H + 30);
    g.font = '15px system-ui, sans-serif';
    let cx = 16;
    for (const p of d.players) {
      g.fillStyle = p.color;
      g.fillRect(cx, H + 50, 22, 6);
      g.fillStyle = '#ffffff';
      g.fillText(p.name, cx + 28, H + 58);
      cx += 40 + g.measureText(p.name).width + 14;
    }
    g.fillStyle = '#c9c9d4';
    g.fillText(
      'yellow to red: where people spent time.  purple disc: stood still.  orange triangle: pushing against something.  ' +
        'red x: a mark.  numbered: objective changed.',
      16,
      H + 90,
    );
    // 10 m.
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(16, H - 18, 10 * k, 4);
    g.font = '13px system-ui, sans-serif';
    g.fillText('10 m', 22 + 10 * k, H - 11);
  };
  if (!d.island) return paint();
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      g.drawImage(img, X(d.map.x0), Z(d.map.z0), d.map.w * k, d.map.h * k);
      paint();
      resolve();
    };
    img.onerror = () => {
      paint();
      resolve();
    };
    img.src = d.island!;
  });
}

function playerOf(s: Session, i: number): Player {
  const pick = (k: string) => s.events.filter((e) => e.k === k);
  const steps: Player['steps'] = [];
  let lastWords = '';
  let n = 0;
  for (const e of pick('objective')) {
    const words = str(e.text).replace(/\d+/g, '#');
    if (words === lastWords) continue;
    lastWords = words;
    n++;
    if (e.x !== undefined) steps.push({ n, x: num(e.x), z: num(e.z) });
  }
  return {
    name: playerName(s),
    color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
    path: pick('p').map((e) => [num(e.x), num(e.z)]),
    idle: pick('idle').map((e) => [num(e.x), num(e.z), num(e.s)]),
    into: pick('into')
      .filter((e) => num(e.s) >= 3)
      .map((e) => [num(e.x), num(e.z), num(e.s)]),
    marks: pick('m')
      .filter((e) => e.x !== undefined && str(e.n) !== 'verb')
      .map((e) => ({ n: str(e.n), x: num(e.x), z: num(e.z) })),
    steps,
  };
}

/** Writes the picture; returns its path, or null when no browser could draw it. */
export async function writeHeatMap(file: string, sessions: Session[], sketch: Sketch | null, root: string) {
  const onIsland = !sketch;
  const island = onIsland
    ? `data:image/png;base64,${fs.readFileSync(path.join(root, 'protos/island.png')).toString('base64')}`
    : null;
  const when = new Date(sessions[0]!.start).toISOString().slice(0, 16).replace('T', ' ');
  const data: DrawData = {
    players: sessions.map(playerOf),
    sketch,
    island,
    map: ISLAND_MAP,
    title: `${sessions[0]!.card}: ${sessions.map(playerName).join(' and ')}, ${when} UTC`,
  };
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    console.error('(no heat map: Chromium is not installed; npx playwright install chromium)');
    return null;
  }
  try {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });
    await page.setContent('<!doctype html><canvas></canvas>');
    await page.evaluate(draw, data);
    const url: string = await page.evaluate(() => document.querySelector('canvas')!.toDataURL('image/png'));
    fs.writeFileSync(file, Buffer.from(url.split(',')[1]!, 'base64'));
    return file;
  } finally {
    await browser.close();
  }
}
