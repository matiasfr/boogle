// The mushroom stall's record (src/adapters/mushroom-stall.ts): the counter, its posts and striped awning, the shelf with five
// bags of seeds on it and the sign. Origin: the ground under the counter's middle; the sign faces -z.
import * as THREE from 'three';
import { registerBuilder } from '../builders.ts';
import { itemModel } from '../../player/item-models.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'mushrooms.stall': true;
  }
}

function stripedAwning() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const g = c.getContext('2d')!;
  for (let k = 0; k < 8; k++) {
    g.fillStyle = k % 2 ? '#fffaf0' : '#e5483b';
    g.fillRect(k * 16, 0, 16, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide });
}

function signMaterial() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7d5230';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#fffaf0';
  g.font = '400 36px "Lilita One", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Mushroom seeds', 128, 34, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

registerBuilder('mushrooms.stall', () => {
  const stall = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.9, flatShading: true });
  const woodDk = new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.9, flatShading: true });
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    stall.add(m);
    return m;
  };
  box(2.8, 0.9, 0.9, wood, 0, 0.45, 0);
  box(2.9, 0.08, 1.0, woodDk, 0, 0.92, 0);
  for (const sx of [-1.35, 1.35]) box(0.12, 2.4, 0.12, woodDk, sx, 1.2, 0.35);
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), stripedAwning());
  awning.position.set(0, 2.35, -0.05);
  awning.rotation.x = -Math.PI / 2 + 0.45;
  awning.castShadow = true;
  stall.add(awning);
  box(1.5, 0.3, 0.6, woodDk, 0, 1.11, 0);
  for (let k = 0; k < 5; k++) {
    const bag = itemModel('seeds');
    bag.position.set(-0.56 + k * 0.28, 1.2, (k % 2) * 0.12 - 0.05);
    stall.add(bag);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), signMaterial());
  sign.position.set(0, 1.95, -0.48);
  sign.rotation.y = Math.PI;
  stall.add(sign);
  return stall;
});
