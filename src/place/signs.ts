// Material boards and HUD counters (logs, kilometres, town, money). Local.
import * as THREE from 'three/webgpu';
import { pauseSections } from '../player/pause-pages.ts';
import type { OwnedView } from '../render/owned-view.ts';

// ---------------------------------------------------------------- boards you can read
/** Physical painted paper takes scene light and shadows, without inverse gain or an emissive floor. */
/** Money as the town writes it: "$1,500". */
export const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export function paperMaterial(map: THREE.CanvasTexture) {
  return new THREE.MeshStandardNodeMaterial({ map, roughness: 1, metalness: 0 });
}

const PAPER = '#fff3d6',
  INK = '#2a1c10';
/** Rows of `wood` under the paper in `paintBoard(…, wood)`'s canvas: a stake board's frame and post sample them, so the
 * whole board is one mesh in one material. */
export const WOOD_ROWS = 64; // enough that a far mip level still samples wood, not paper
/** A painted paper board, `w` by `h` m. With `wood`, the canvas has `WOOD_ROWS` of that colour under the paper: the
 * paper's v runs from `woodV(h / w)` to 1, and anything at v below it is plain wood. */
export function paintBoard(lines: { t: string; px: number; color?: string }[], w: number, h: number, wood?: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  const paper = Math.round((1024 * h) / w);
  c.height = paper + (wood ? WOOD_ROWS : 0);
  const g = c.getContext('2d')!;
  if (wood) {
    g.fillStyle = wood;
    g.fillRect(0, paper, c.width, WOOD_ROWS);
  }
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, paper);
  g.strokeStyle = INK;
  g.lineWidth = 16;
  g.strokeRect(8, 8, c.width - 16, paper - 16);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = lines.reduce((t, l) => t + l.px * 1.22, 0);
  let y = (paper - total) / 2;
  for (const l of lines) {
    g.font = `900 ${l.px}px Figtree, system-ui, sans-serif`;
    g.fillStyle = l.color ?? INK;
    g.fillText(l.t, c.width / 2, y + (l.px * 1.22) / 2, c.width - 60);
    y += l.px * 1.22;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return paperMaterial(tex);
}
/** Where the paper starts in a `paintBoard(…, wood)` texture of this height-to-width ratio (v, 0 at the bottom). */
export const woodV = (ratio: number) => WOOD_ROWS / (Math.round(1024 * ratio) + WOOD_ROWS);

// ---------------------------------------------------------------- the HUD
const nums = document.createElement('div');
nums.className = 'place-nums';
const moneyPill = document.createElement('span');
moneyPill.className = 'place-money-live';
let hudAttached = false;
// The numbers: logs, kilometres, town and a running money count, a comic score. They tick up one by one, so you can feel them.
const shownNum = { money: 0 };
let lastNums = '';
let lastShown = NaN; // the whole dollars last written: formatting and the DOM writes run only when it changes
let previousMoney: number | undefined;
let hideMoney: ReturnType<typeof setTimeout> | undefined;
export function mountNumbers(owner: OwnedView) {
  shownNum.money = 0;
  lastNums = '';
  lastShown = NaN;
  previousMoney = undefined;
  owner.cleanup(() => {
    clearTimeout(hideMoney);
    nums.remove();
    moneyPill.remove();
    moneyPill.classList.remove('on');
    const at = pauseSections.indexOf(nums);
    if (at >= 0) pauseSections.splice(at, 1);
    hudAttached = false;
  });
}
export function setNumbers(score: { money: number; logs: number; metres: number }, _people = 0, snapshot = false) {
  if (!hudAttached) {
    hudAttached = true;
    pauseSections.push(nums);
    (document.querySelector('.hud') ?? document.body).append(moneyPill);
  }
  if (snapshot) {
    shownNum.money = score.money;
    clearTimeout(hideMoney);
    moneyPill.classList.remove('on');
  } else if (previousMoney !== undefined && score.money > previousMoney) {
    moneyPill.classList.add('on');
    clearTimeout(hideMoney);
    hideMoney = setTimeout(() => moneyPill.classList.remove('on'), 2000);
  }
  previousMoney = score.money;
  const ease = (a: number, b: number, k: number) => (Math.abs(b - a) < 1 ? b : a + (b - a) * k);
  shownNum.money = ease(shownNum.money, score.money, 0.12);
  // Called every frame: toLocaleString and a textContent write (a style recalculation) each frame cost ~0.06 ms in V8.
  const whole = Math.round(shownNum.money);
  if (whole === lastShown) return;
  lastShown = whole;
  const money = dollars(whole);
  moneyPill.textContent = money;
  const s = `<span class="place-money"><b>${money}</b></span>`;
  if (s === lastNums) return;
  lastNums = s;
  nums.innerHTML = s;
}
