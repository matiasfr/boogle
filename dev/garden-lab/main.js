// Garden lab: 2D preview of src/sim/garden.js. Not part of the game build.
import * as G from '../../src/sim/garden.js';

const W = 12;
const H = 6;
const EMOJI = {
  flower: ['🌱', '🌿', '🌸'],
  melon: ['🌱', '🌿', '🌾', '🍉'],
  palm: ['🌱', '🌿', '🌴', '🌴', '🥥'],
};
const g = G.createGarden({ seed: 42, canPlant: (i, j) => i >= 0 && j >= 0 && i < W && j < H });
const wetCells = new Set([G.cellKey(0, 0), G.cellKey(1, 0), G.cellKey(0, 1)]);
const isWet = (i, j) => wetCells.has(G.cellKey(i, j));
let tick = 0;
let player = 1;
let kind = 'flower';
let sel = null;
let msg = '';
let live = true;

const bar = document.getElementById('bar');
const grid = document.getElementById('grid');
const status = document.getElementById('status');
const btn = (label, fn, key) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = fn;
  if (key) b.dataset.k = key;
  bar.appendChild(b);
};
for (const k of Object.keys(G.KINDS)) btn(k, () => { kind = k; render(); }, k);
for (let n = 1; n <= 6; n++) btn('P' + n, () => { player = n; render(); }, 'p' + n);
btn('+1 min', () => advance(600));
btn('+1 day', () => advance(G.DAY_TICKS));
btn('+1 h (step)', () => advance(36000));
btn('offline 8 h (catchUp, 50% wet)', () => {
  G.catchUp(g, tick, tick + 288000, 500);
  tick += 288000;
  msg = 'catchUp 8h at 50% wet';
  render();
});
btn('pause/run', () => { live = !live; });

const pid = (n) => 'player' + n;
function advance(n) {
  for (let k = 0; k < n; k++) G.step(g, tick++, isWet);
  render();
}
function act(r, what) {
  msg = r.ok ? what + ' ok' + (r.item ? ' -> ' + r.item.count + ' ' + r.item.kind : '') : what + ' refused: ' + r.reason;
  render();
}

function render() {
  grid.innerHTML = '';
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const c = G.cropAt(g, i, j);
      const d = document.createElement('div');
      d.className = 'cell' + (isWet(i, j) ? ' wet' : '') + (sel && sel[0] === i && sel[1] === j ? ' sel' : '');
      if (c) {
        const hydrated = tick < c.wetUntil || isWet(i, j);
        const v = G.visitorCount(c, tick);
        d.innerHTML =
          EMOJI[c.kind][c.stage] +
          (v ? '<i>' + '✨'.repeat(Math.min(5, v)) + '</i>' : '') +
          '<small>' + c.stage + '/' + G.KINDS[c.kind].stages + (hydrated ? ' 💧' : '') + (v ? ' x' + G.visitorMultiplier(c, tick) / 1000 : '') + '</small>';
        d.dataset.stage = c.stage;
      }
      d.onclick = () => {
        sel = [i, j];
        if (!c) act(G.plant(g, { i, j, kind, p: pid(player) }, tick), 'plant ' + kind);
        else render();
      };
      d.oncontextmenu = (e) => {
        e.preventDefault();
        const k = G.cellKey(i, j);
        if (wetCells.has(k)) wetCells.delete(k);
        else wetCells.add(k);
        render();
      };
      grid.appendChild(d);
    }
  }
  for (const b of bar.querySelectorAll('button[data-k]')) b.classList.toggle('on', b.dataset.k === kind || b.dataset.k === 'p' + player);
  status.textContent = 'tick ' + tick + ' (day ' + G.dayOf(tick) + ') | player ' + player + ' | ' + kind + ' | hash ' + G.hash(g) + ' | ' + msg;
}

addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '6') { player = +e.key; render(); }
  else if (sel && e.key === 'w') act(G.water(g, { i: sel[0], j: sel[1], p: pid(player) }, tick), 'water');
  else if (sel && e.key === 'h') act(G.harvest(g, { i: sel[0], j: sel[1], p: pid(player) }, tick), 'harvest');
});
setInterval(() => { if (live) advance(1); }, 100);
window.__lab = { g, G, act, advance, setSel: (i, j) => { sel = [i, j]; render(); }, setPlayer: (n) => { player = n; render(); } };
render();
