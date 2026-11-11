// A big label that faces the camera (it lived in the mini-games' shared file, now src/render/fanfare.ts). Only Place's
// halts, depot and pair use it, so it stays here and goes with Place. All Local: cosmetic.
import * as THREE from 'three/webgpu';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { onFrame } from '../../loop.ts';

export type Label = {
  sprite: THREE.Sprite;
  set: (big: string, small?: string, color?: string) => void;
  punch: () => void;
};
const labels: { sprite: THREE.Sprite; w: number; h: number; punchAt: number }[] = [];
export function label(w: number, h: number): Label {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    readableUnlit(new THREE.SpriteNodeMaterial({ map: tex, transparent: true, depthWrite: false })),
  );
  sprite.scale.set(w, h, 1);
  sprite.renderOrder = 10;
  const entry = { sprite, w, h, punchAt: -1e9 };
  labels.push(entry);
  let last = '';
  return {
    sprite,
    set(big, small = '', color = '#fff7e8') {
      const key = big + '|' + small + '|' + color;
      if (key === last) return;
      last = key;
      g.clearRect(0, 0, 512, 256);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      const line = (t: string, y: number, px: number, fill: string) => {
        g.font = `900 ${px}px Figtree, system-ui, sans-serif`;
        g.lineWidth = px * 0.16;
        g.strokeStyle = 'rgba(40, 24, 10, 0.85)';
        g.strokeText(t, 256, y, 496);
        g.fillStyle = fill;
        g.fillText(t, 256, y, 496);
      };
      if (small) {
        line(big, 100, 150, color);
        line(small, 214, 52, '#fff7e8');
      } else line(big, 128, 170, color);
      tex.needsUpdate = true;
    },
    punch: () => (entry.punchAt = performance.now()),
  };
}
// A punch pops a label up to 1.4x and springs it back over 0.35 s.
onFrame(
  () => {
    const now = performance.now();
    for (const l of labels) {
      const t = (now - l.punchAt) / 350;
      const k = t >= 1 ? 1 : 1 + 0.4 * Math.sin(t * Math.PI) * (1 - t);
      l.sprite.scale.set(l.w * k, l.h * k, 1);
    }
  },
  { phase: 'late', order: 40 },
);
