// Shared harness for `npm run look` and `npm run scenario`: a Vite dev server plus a local PeerJS signaling
// server, headless Chromium, and a small `Game` wrapper (one page = one player) with stills and motion capture.
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PeerServer } from 'peer';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One table of named viewpoints: camera position, look-at target (world metres, y up).
export const VIEWS = {
  hill: { cam: [-10, 12, -14], look: [-22, 3.5, -21] },
  shore: { cam: [-22, 7.5, -17], look: [-30, 0.5, -27] },
  court: { cam: [12, 4, 30], look: [12, 0.5, 21] },
  overview: { cam: [-40, 40, 40], look: [-5, 0, 0] },
};

const freePort = () =>
  new Promise((res) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });

// Starts Vite on a free port and a local PeerJS signaling server (so rooms work offline). With `url`, only
// uses that already-running game (no signaling server: the game's own settings apply).
export async function startStack({ url = null } = {}) {
  if (url) return { base: url, close: async () => {} };
  const sigPort = await freePort();
  const signaling = PeerServer({ port: sigPort, host: '127.0.0.1', path: '/peerjs' });
  const port = await freePort();
  const vite = spawn(
    process.execPath,
    [path.join(root, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, VITE_BOOGLE_SERVER: `http://127.0.0.1:${sigPort}` },
    },
  );
  const base = `http://127.0.0.1:${port}/`;
  let up = false;
  for (let t = 0; t < 150 && !up; t++) {
    try {
      up = (await fetch(base)).ok;
    } catch {
      await sleep(200);
    }
  }
  if (!up) {
    vite.kill('SIGTERM');
    throw new Error('vite did not start');
  }
  return {
    base,
    async close() {
      if (!vite.killed) vite.kill('SIGTERM');
      await new Promise((r) => signaling.close?.(r) ?? r());
    },
  };
}

export const launch = () =>
  chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

export class Game {
  // opts: room, name, size [w,h], hud (keep the HUD in pictures), out (directory for images), label prefix
  static async open(browser, stack, opts = {}) {
    const g = new Game();
    g.name = opts.name || 'player';
    g.out = path.resolve(opts.out || '.look');
    g.prefix = opts.prefix || '';
    g.size = opts.size || [960, 600];
    g.ctx = await browser.newContext({ viewport: { width: g.size[0], height: g.size[1] } });
    g.page = await g.ctx.newPage();
    g.errors = [];
    g.page.on('pageerror', (e) => {
      g.errors.push(e.message);
      console.error(`[${g.name} page error]`, e.message);
    });
    const room = opts.room || 'look' + Math.random().toString(36).slice(2, 7);
    const sep = stack.base.includes('?') ? '&' : '?';
    await g.page.goto(`${stack.base}${sep}debugcam=1&room=${room}`);
    await g.page.waitForSelector('#enter:not([disabled])', { timeout: 30000 });
    await g.page.fill('#name-input', g.name).catch(() => {});
    await g.page.click('#enter');
    await g.page.waitForFunction(() => window.__debugCam && window.__water, null, { timeout: 20000 });
    if (!opts.hud) await g.page.addStyleTag({ content: '.hud, .touch, .lobby { display: none !important }' });
    await sleep(300);
    fs.mkdirSync(g.out, { recursive: true });
    return g;
  }

  // Run code in the page. A function (with optional JSON arg) or a string body (may `await`, may
  // `await import('/src/...')` game modules; `return` a JSON-able value).
  eval(code, arg) {
    if (typeof code === 'function') return this.page.evaluate(code, arg);
    return this.page.evaluate(`(async () => { ${code}\n})()`);
  }

  // Poll an in-page predicate (function or expression string) until truthy. Returns elapsed ms or -1.
  async waitFor(pred, { timeout = 15000, step = 100, arg } = {}) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        const ok =
          typeof pred === 'function' ? await this.page.evaluate(pred, arg) : await this.eval(`return (${pred});`);
        if (ok) return Date.now() - t0;
      } catch {
        /* page busy */
      }
      await sleep(step);
    }
    return -1;
  }

  // Freeze the camera at a named view or {cam, look}. Pass fov to change the field of view.
  async view(v, fov) {
    const pose = typeof v === 'string' ? VIEWS[v] : v;
    if (!pose) throw new Error('unknown view ' + v);
    await this.page.evaluate(([c, l, f]) => window.__debugCam.set(c, l, f), [pose.cam, pose.look, fov || null]);
  }

  // Keyboard / mouse (real input events, so the game's own handlers run). code: 'KeyQ', 'Space', ...
  async key(code, holdMs = 0) {
    await this.page.keyboard.down(code);
    if (holdMs) await sleep(holdMs);
    await this.page.keyboard.up(code);
  }
  down = (code) => this.page.keyboard.down(code);
  up = (code) => this.page.keyboard.up(code);
  click = (x, y, opts) => this.page.mouse.click(x, y, opts);

  async fps(ms = 1000) {
    return this.page.evaluate(
      (ms) =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const f = () => {
            n++;
            if (performance.now() - t0 < ms) requestAnimationFrame(f);
            else res((n * 1000) / (performance.now() - t0));
          };
          requestAnimationFrame(f);
        }),
      ms,
    );
  }

  path(label, kind) {
    return path.join(this.out, `${this.prefix}${label}-${kind}.png`);
  }

  async still(label = 'still') {
    const p = this.path(label, 'still');
    await this.page.screenshot({ path: p });
    return p;
  }

  // N screenshots spread over `seconds`, tiled into a contact sheet with timestamps, plus a per-pixel temporal
  // stddev heatmap. score = mean stddev (0..255) over `region` ([x,y,w,h] as fractions of the frame).
  async motion(label = 'motion', { frames = 8, seconds = 2, region = null } = {}) {
    const [W, H] = this.size;
    const shots = [];
    const t0 = Date.now();
    for (let k = 0; k < frames; k++) {
      const due = t0 + (k * seconds * 1000) / Math.max(1, frames - 1);
      if (Date.now() < due) await sleep(due - Date.now());
      const t = (Date.now() - t0) / 1000;
      shots.push({ t, b64: (await this.page.screenshot()).toString('base64') });
    }
    const calc = await this.ctx.newPage();
    const res = await calc.evaluate(analyse, { shots, region, W, H });
    await calc.close();
    const save = (p, url) => fs.writeFileSync(p, Buffer.from(url.split(',')[1], 'base64'));
    const sheet = this.path(label, 'motion'),
      heat = this.path(label, 'heat');
    save(sheet, res.sheetUrl);
    save(heat, res.heatUrl);
    return { score: res.score, hotFrac: res.hotFrac, sheet, heat };
  }

  async close() {
    await this.ctx.close();
  }
}

// Runs inside a scratch page (canvas), so the harness needs no image library.
async function analyse({ shots, region, W, H }) {
  const imgs = await Promise.all(
    shots.map(
      (s) =>
        new Promise((r) => {
          const im = new Image();
          im.onload = () => r(im);
          im.src = 'data:image/png;base64,' + s.b64;
        }),
    ),
  );
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const data = imgs.map((im) => {
    cx.drawImage(im, 0, 0);
    return cx.getImageData(0, 0, W, H).data;
  });
  const n = data.length;
  const heat = cx.createImageData(W, H);
  const rx0 = region ? Math.floor(region[0] * W) : 0,
    ry0 = region ? Math.floor(region[1] * H) : 0,
    rx1 = region ? Math.ceil((region[0] + region[2]) * W) : W,
    ry1 = region ? Math.ceil((region[1] + region[3]) * H) : H;
  let sum = 0,
    cnt = 0,
    hot = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      let sd = 0;
      for (let ch = 0; ch < 3; ch++) {
        let m = 0;
        for (let f = 0; f < n; f++) m += data[f][o + ch];
        m /= n;
        let v = 0;
        for (let f = 0; f < n; f++) v += (data[f][o + ch] - m) ** 2;
        sd += v / n;
      }
      sd = Math.sqrt(sd / 3);
      if (x >= rx0 && x < rx1 && y >= ry0 && y < ry1) {
        sum += sd;
        cnt++;
        if (sd > 8) hot++;
      }
      const h = Math.min(1, sd / 40); // black -> red -> yellow -> white over 0..40
      heat.data[o] = Math.min(255, h * 3 * 255);
      heat.data[o + 1] = Math.max(0, Math.min(255, (h * 3 - 1) * 255));
      heat.data[o + 2] = Math.max(0, Math.min(255, (h * 3 - 2) * 255));
      heat.data[o + 3] = 255;
    }
  cx.putImageData(heat, 0, 0);
  const heatUrl = cv.toDataURL('image/png');
  const cols = Math.min(4, n),
    rows = Math.ceil(n / cols),
    tw = Math.floor(W / 2),
    th = Math.floor(H / 2);
  const sheet = document.createElement('canvas');
  sheet.width = cols * tw;
  sheet.height = rows * th;
  const sx = sheet.getContext('2d');
  sx.font = '14px monospace';
  imgs.forEach((im, f) => {
    const x = (f % cols) * tw,
      y = Math.floor(f / cols) * th;
    sx.drawImage(im, x, y, tw, th);
    sx.fillStyle = 'rgba(0,0,0,0.6)';
    sx.fillRect(x, y, 70, 20);
    sx.fillStyle = '#fff';
    sx.fillText(shots[f].t.toFixed(2) + 's', x + 4, y + 15);
    if (region) {
      sx.strokeStyle = '#f0f';
      sx.strokeRect(x + rx0 / 2, y + ry0 / 2, (rx1 - rx0) / 2, (ry1 - ry0) / 2);
    }
  });
  return { score: sum / cnt, hotFrac: hot / cnt, heatUrl, sheetUrl: sheet.toDataURL('image/png') };
}
