// Water lab: 2D debug view of src/sim/water.js. i = canvas y (row), j = canvas x.
import { createWater } from '../../src/sim/water.js';

const W = 96;
const H = 96;
const terrain = new Int32Array(W * H);
for (let i = 0; i < W; i++)
  for (let j = 0; j < H; j++) {
    // sea at j = 0 (left edge); beach rises to a plateau with a hill
    let t = -60 + j * 4;
    if (t > 160) t = 160;
    const hx = i - 48;
    const hy = j - 60;
    t += Math.max(0, 140 - Math.round(Math.sqrt(hx * hx + hy * hy) * 7));
    terrain[i * H + j] = t;
  }
const w = createWater({ width: W, height: H, terrain, sea: 0, seaEdges: 4 }); // 4 = j=0 side
w.setSource(48, 60, 6); // spring on the hill top

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const img = ctx.createImageData(W, H);
const info = document.getElementById('info');
let paused = false;
let ms = 0;

function draw() {
  const d = img.data;
  for (let i = 0; i < W; i++)
    for (let j = 0; j < H; j++) {
      const c = i * H + j;
      const t = terrain[c];
      const sh = Math.max(40, Math.min(230, 110 + t * 0.5 + (j > 0 ? t - terrain[c - 1] : 0) * 3));
      let r = sh * 0.9;
      let g = sh * 0.8;
      let b = sh * 0.55;
      const dep = w.depth[c];
      if (dep > 0) {
        const k = Math.min(1, dep / 80);
        r = r * (1 - 0.8 * k) + 20 * k;
        g = g * (1 - 0.6 * k) + 80 * k;
        b = b * (1 - 0.3 * k) + 200 * k;
        if (dep < 3) {
          r = r * 0.6 + 60;
          g = g * 0.6 + 100;
          b = b * 0.6 + 140;
        }
      }
      const p = (i * W + j) * 4;
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
      d[p + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const s = w.stats();
  info.textContent = `tick ${s.tick}\nstep ${ms.toFixed(3)} ms\nactive ${s.active}\nwet ${s.wet}\ntotal ${s.total} cm\nsea ${w.seaLevel} cm\nseaNet ${s.seaNet}\nhash ${w.hash().toString(16)}`;
}

let acc = 0;
let last = performance.now();
function frame(now) {
  acc += now - last;
  last = now;
  while (acc >= 100) {
    acc -= 100;
    if (!paused) {
      const t0 = performance.now();
      w.step();
      ms = performance.now() - t0;
    }
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function cell(e) {
  const r = canvas.getBoundingClientRect();
  return [Math.floor(((e.clientY - r.top) / r.height) * H), Math.floor(((e.clientX - r.left) / r.width) * W)];
}
function edit(e, delta) {
  const [ci, cj] = cell(e);
  for (let di = -2; di <= 2; di++)
    for (let dj = -2; dj <= 2; dj++) {
      const i = ci + di;
      const j = cj + dj;
      if (i < 0 || j < 0 || i >= W || j >= H || di * di + dj * dj > 5) continue;
      terrain[i * H + j] += delta;
    }
  w.wake(ci, cj, 3);
}
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  const [i, j] = cell(e);
  if (e.button === 2) w.addWater(i, j, 100);
  else edit(e, e.shiftKey ? 15 : -15);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') paused = !paused;
  if (e.key === '[') w.setSeaLevel(w.seaLevel - 10);
  if (e.key === ']') w.setSeaLevel(w.seaLevel + 10);
});
window.water = w;
