// Item icons for the HUD: each item's own model (src/item-models.js), rendered once to a small image and cached.
//
//   iconFor(id)   a data: URL for a catalog id (src/sim/gift-catalog.js) or 'ball'
import * as THREE from 'three';
import { renderer } from './scene.js';
import { ball } from './ball.js';
import { itemModel } from './item-models.js';

const ICON = 96;
const icons = new Map();
const iconScene = new THREE.Scene();
iconScene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 2.2));
const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
keyLight.position.set(2, 3, 2);
iconScene.add(keyLight);
const iconCam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
let iconTarget = null;
const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function iconFor(id) {
  if (icons.has(id)) return icons.get(id);
  iconTarget ??= new THREE.WebGLRenderTarget(ICON, ICON);
  const model = id === 'ball' ? new THREE.Mesh(ball.mesh.geometry, ball.mesh.material) : itemModel(id);
  if (id === 'shovel') model.rotation.z = -0.8; // diagonal, so a long thin thing fills the square
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  model.position.sub(box.getCenter(new THREE.Vector3()));
  iconScene.add(model);
  iconCam.position.set(size * 1.2, size * 1.25, size * 1.9);
  iconCam.lookAt(0, 0, 0);
  const prev = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()) };
  const prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(iconTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(iconScene, iconCam);
  const px = new Uint8Array(ICON * ICON * 4);
  renderer.readRenderTargetPixels(iconTarget, 0, 0, ICON, ICON, px);
  renderer.setRenderTarget(prev.target);
  renderer.setClearColor(prev.color, prevAlpha);
  iconScene.remove(model);
  // Render targets hold linear colour and rows bottom-up: convert and flip into a canvas.
  const c = document.createElement('canvas');
  c.width = c.height = ICON;
  const g = c.getContext('2d');
  const img = g.createImageData(ICON, ICON);
  for (let y = 0; y < ICON; y++)
    for (let x = 0; x < ICON; x++) {
      const from = ((ICON - 1 - y) * ICON + x) * 4,
        to = (y * ICON + x) * 4;
      const a = px[from + 3] / 255;
      for (let k = 0; k < 3; k++) img.data[to + k] = a ? Math.round(toSrgb(px[from + k] / 255 / a) * 255) : 0;
      img.data[to + 3] = px[from + 3];
    }
  g.putImageData(img, 0, 0);
  const url = c.toDataURL();
  icons.set(id, url);
  return url;
}
