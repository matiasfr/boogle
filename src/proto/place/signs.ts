// Material boards and HUD counters (logs, kilometres, town, money). Local.
import * as THREE from 'three/webgpu';
import { pauseSections } from '../../player/pause-pages.ts';

// ---------------------------------------------------------------- boards you can read
const PAPER = '#fff3d6',
  INK = '#2a1c10';
export function paintBoard(lines: { t: string; px: number; color?: string }[], w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const g = c.getContext('2d')!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = INK;
  g.lineWidth = 16;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = lines.reduce((t, l) => t + l.px * 1.22, 0);
  let y = (c.height - total) / 2;
  for (const l of lines) {
    g.font = `900 ${l.px}px Figtree, system-ui, sans-serif`;
    g.fillStyle = l.color ?? INK;
    g.fillText(l.t, c.width / 2, y + (l.px * 1.22) / 2, c.width - 60);
    y += l.px * 1.22;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.MeshBasicNodeMaterial({ map: tex });
}

// ---------------------------------------------------------------- the HUD
const nums = document.createElement('div');
nums.className = 'place-nums';
pauseSections.push(nums);
const moneyPill = document.createElement('span');
moneyPill.className = 'place-money-live';
(document.querySelector('.hud') ?? document.body).append(moneyPill);
// The numbers: logs, kilometres, town and a running money count, a comic score. They tick up one by one, so you can feel them.
const shownNum = { km: 0, people: 0, money: 0 };
let lastNums = '';
let previousMoney: number | undefined;
let hideMoney: ReturnType<typeof setTimeout> | undefined;
export function setNumbers(score: { money: number; logs: number; metres: number }, people: number) {
  if (previousMoney !== undefined && score.money > previousMoney) {
    moneyPill.classList.add('on');
    clearTimeout(hideMoney);
    hideMoney = setTimeout(() => moneyPill.classList.remove('on'), 2000);
  }
  previousMoney = score.money;
  const ease = (a: number, b: number, k: number) => (Math.abs(b - a) < 1 ? b : a + (b - a) * k);
  shownNum.km = score.metres / 1000;
  shownNum.people = people;
  shownNum.money = ease(shownNum.money, score.money, 0.12);
  const money = `$${Math.round(shownNum.money).toLocaleString('en-US')}`;
  moneyPill.textContent = money;
  const s =
    `<span>Track <b>${shownNum.km.toFixed(2)}</b> km</span>` +
    `<span>Town <b>${shownNum.people}</b></span>` +
    `<span class="place-money"><b>${money}</b></span>`;
  if (s === lastNums) return;
  lastNums = s;
  nums.innerHTML = s;
}
