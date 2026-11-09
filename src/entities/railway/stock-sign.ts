// Local stock badge: the same small physical-source cue on timber and steel racks.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';

export function stockSign(owner: OwnedView, kind: 'logs' | 'rails') {
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
  let last = -1;
  return {
    sprite,
    set(n: number) {
      if (n === last) return;
      last = n;
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#493522';
      g.strokeStyle = '#edcf8c';
      g.lineWidth = 6;
      g.beginPath();
      g.roundRect(4, 4, 248, 120, 14);
      g.fill();
      g.stroke();
      if (kind === 'logs') {
        for (const [x, y] of [
          [42, 53],
          [78, 53],
          [60, 83],
        ]) {
          g.fillStyle = '#eac28a';
          g.beginPath();
          g.arc(x!, y!, 18, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#956636';
          g.lineWidth = 3;
          g.stroke();
        }
      } else {
        g.strokeStyle = '#a3cee2';
        g.lineWidth = 10;
        for (const x of [43, 75]) {
          g.beginPath();
          g.moveTo(x, 31);
          g.lineTo(x, 97);
          g.stroke();
        }
      }
      g.font = '900 76px Figtree, system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff5dc';
      g.fillText(String(n), 174, 68, 126);
      map.needsUpdate = true;
    },
  };
}
