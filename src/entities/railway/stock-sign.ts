// Local stock badge: the same small physical-source cue on timber and steel racks. A train-fed stretch's rack shows the
// `'train'` drawing until trains run (docs/plans/boiler-first-choice.md, step 1): the old train's own loco side-on, its
// boiler a dashed gold outline (the rope's gold), pulling one wagon heaped with the log and rail icons, no number.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { reducedMotion } from '../../constants.ts';

export type StockSignKind = 'logs' | 'rails' | 'train';
const LINE = '#edcf8c';
const PUFF_S = 0.9;
const BOB_S = 0.5;

export function stockSign(owner: OwnedView, start: StockSignKind) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = readableUnlit(new THREE.SpriteNodeMaterial({ map, transparent: true, depthWrite: false }));
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.6, 0.8, 1);
  owner.add(sprite);
  owner.cleanup(() => {
    map.dispose();
    material.dispose();
  });
  const logs = (x: number, y: number, r: number) => {
    for (const [dx, dy] of [
      [-1, -0.83],
      [1, -0.83],
      [0, 0.83],
    ]) {
      g.fillStyle = '#eac28a';
      g.beginPath();
      g.arc(x + dx! * r, y + dy! * r, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#956636';
      g.lineWidth = r / 6;
      g.stroke();
    }
  };
  const rails = (x: number, y: number, length: number, width: number, gap: number, across = false) => {
    g.strokeStyle = '#a3cee2';
    g.lineWidth = width;
    for (const o of [-gap / 2, gap / 2]) {
      g.beginPath();
      if (across) {
        g.moveTo(x - length / 2, y + o);
        g.lineTo(x + length / 2, y + o);
      } else {
        g.moveTo(x + o, y - length / 2);
        g.lineTo(x + o, y + length / 2);
      }
      g.stroke();
    }
  };
  /** The old train side-on, heading right: cab at the back, boiler and chimney in front, one wagon behind. */
  const train = (puff: number) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // The wagon: a flat deck on two wheels, heaped with a log stack and a rail bundle.
    logs(40, 66, 11);
    rails(80, 74, 34, 7, 14, true);
    g.strokeStyle = LINE;
    g.lineWidth = 5;
    g.strokeRect(18, 86, 84, 8);
    g.beginPath();
    g.moveTo(102, 90);
    g.lineTo(114, 90);
    g.stroke();
    // The loco: chassis, cab, the roof on its posts, the front bumper.
    g.strokeRect(114, 86, 120, 8);
    g.strokeRect(120, 54, 40, 32);
    g.strokeRect(114, 40, 52, 6);
    for (const x of [126, 154]) {
      g.beginPath();
      g.moveTo(x, 46);
      g.lineTo(x, 54);
      g.stroke();
    }
    g.strokeRect(234, 80, 8, 12);
    for (const [x, r] of [
      [36, 7],
      [84, 7],
      [136, 9],
      [176, 9],
      [214, 9],
    ]) {
      g.fillStyle = '#493522';
      g.beginPath();
      g.arc(x!, 103, r!, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    // The missing boiler: a dashed gold barrel and chimney where they sit on the real engine.
    g.strokeStyle = GOLD_ROPE;
    g.lineWidth = 5;
    g.setLineDash([9, 7]);
    g.beginPath();
    g.roundRect(162, 58, 68, 28, 12);
    g.stroke();
    g.beginPath();
    g.moveTo(206, 58);
    g.lineTo(203, 26);
    g.lineTo(221, 26);
    g.lineTo(218, 58);
    g.stroke();
    g.setLineDash([]);
    // One steam puff off the drawn chimney (nudge): two rounds rising and fading.
    if (puff >= 0 && puff < 1) {
      g.fillStyle = '#fff5dc';
      for (const [lag, size] of [
        [0, 1],
        [0.25, 0.7],
      ]) {
        const t = (puff - lag!) / (1 - lag!);
        if (t <= 0) continue;
        g.globalAlpha = 0.85 * (1 - t);
        g.beginPath();
        g.arc(212 - 14 * t, 20 - 12 * t, size! * (6 + 9 * t), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  };
  let kind = start,
    n = 0,
    drawn = '',
    nudged = -1;
  const draw = (puff: number) => {
    const key = kind === 'train' ? `train:${puff < 0 || puff >= 1 ? -1 : puff}` : `${kind}:${n}`;
    if (key === drawn) return;
    drawn = key;
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = '#493522';
    g.strokeStyle = LINE;
    g.lineWidth = 6;
    g.beginPath();
    g.roundRect(4, 4, 248, 120, 14);
    g.fill();
    g.stroke();
    if (kind === 'train') train(puff);
    else {
      if (kind === 'logs') logs(60, 68, 18);
      else rails(59, 64, 66, 10, 32);
      g.font = '900 76px Figtree, system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff5dc';
      g.fillText(String(n), 174, 68, 126);
    }
    map.needsUpdate = true;
  };
  return {
    sprite,
    get kind() {
      return kind;
    },
    set(count: number) {
      n = count;
      draw(-1);
    },
    /** Switch drawings; redraws only on a change. */
    show(next: StockSignKind) {
      kind = next;
      draw(-1);
    },
    /** One bob and one steam puff from the drawn chimney (under reduced motion, the puff only). */
    nudge() {
      nudged = 0;
    },
    update(dt: number) {
      if (nudged < 0) return;
      nudged += dt;
      // Lift the sprite on its own anchor (lower centre, higher sprite), so the caller's position stays the rack's.
      const lift = reducedMotion ? 0 : Math.sin(Math.PI * Math.min(1, nudged / BOB_S));
      sprite.center.y = 0.5 - 0.2 * lift;
      if (kind === 'train') draw(Math.round((nudged / PUFF_S) * 30) / 30);
      if (nudged >= Math.max(PUFF_S, BOB_S)) {
        nudged = -1;
        sprite.center.y = 0.5;
        draw(-1);
      }
    },
  };
}
