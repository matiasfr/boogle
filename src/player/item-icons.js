// Item icons for the HUD: each item's own model (src/player/item-models.js), rendered once to a small image and cached.
// The scene renders linear HDR into a render target; a full-screen pass then applies the game's tone mapping and sRGB
// (the same renderOutput the main view ends with) into an 8-bit target, which is read back. A CanvasTarget can't do
// this: the WebGPU canvas is opaque.
//
//   setIcon(img, id)   fills an <img> with the icon for a catalog id (src/sim/gift-catalog.ts) or 'ball' (async)
//   warmIcons(ids)     draws those icons now (behind the loading screen): the icon scene's lights, targets and
//                      tone-mapping quad build pipelines of their own, and the first icon drawn mid-game hitched
import * as THREE from 'three/webgpu';
import { renderOutput, texture, uv, vec4 } from 'three/tsl';
import { renderer } from '../render/scene.js';
import { ball } from '../physics/ball.js';
import { itemModel } from './item-models.js';

const ICON = 96;
const icons = new Map();
const iconScene = new THREE.Scene();
iconScene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 2.2));
const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
keyLight.position.set(2, 3, 2);
iconScene.add(keyLight);
const iconCam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);

// Built on first use: the scene target (linear HDR, MSAA), the 8-bit output target, and the tone-mapping quad.
let hdr = null,
  out = null,
  quad = null,
  topDown = null;
const bytes = (size) => new THREE.RenderTarget(size, size, { type: THREE.UnsignedByteType, depthBuffer: false });
function setup() {
  hdr = new THREE.RenderTarget(ICON, ICON, { type: THREE.HalfFloatType, samples: 4 });
  out = bytes(ICON);
  const mat = new THREE.NodeMaterial();
  mat.blending = THREE.NoBlending;
  mat.depthTest = mat.depthWrite = false;
  // renderOutput un-premultiplies, tone maps (renderer.toneMapping), encodes sRGB and premultiplies again.
  mat.fragmentNode = renderOutput(texture(hdr.texture, uv()), renderer.toneMapping, renderer.outputColorSpace);
  quad = new THREE.QuadMesh(mat);
}

// Reads back an 8-bit target. Which row comes first differs by backend, so find out with a gradient (uv.y is 1 at the
// top) instead of asking which backend this is.
async function readRows() {
  if (topDown === null) {
    const probe = bytes(4);
    const m = new THREE.NodeMaterial();
    m.fragmentNode = vec4(uv().y, 0, 0, 1);
    const before = renderer.getRenderTarget();
    renderer.setRenderTarget(probe);
    new THREE.QuadMesh(m).render(renderer);
    renderer.setRenderTarget(before);
    const px = await renderer.readRenderTargetPixelsAsync(probe, 0, 0, 4, 4);
    topDown = px[0] > 127;
    probe.dispose();
    m.dispose();
  }
  return topDown;
}

// Renders run one at a time (they share the render targets and read back asynchronously).
let queue = Promise.resolve();

// The icon for `id`: a promise of its data URL (null if the render failed). icons caches each id's promise; a failed
// render is dropped so the next call tries again.
function iconUrl(id) {
  if (!icons.has(id))
    icons.set(
      id,
      (queue = queue
        .then(() => draw(id))
        .catch((e) => {
          console.warn('[icons]', id, e);
          icons.delete(id);
          return null;
        })),
    );
  return icons.get(id);
}

// Fills `img` with the icon for `id` once its render finishes (unless the image has been given another id by then).
export function setIcon(img, id) {
  img.dataset.icon = id;
  iconUrl(id).then((url) => {
    if (img.dataset.icon === id && url) img.src = url;
  });
}

export const warmIcons = (ids) => Promise.all(ids.map(iconUrl));

async function draw(id) {
  if (!hdr) setup();
  const model = id === 'ball' ? new THREE.Mesh(ball.mesh.geometry, ball.mesh.material) : itemModel(id);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  model.position.sub(box.getCenter(new THREE.Vector3()));
  iconScene.add(model);
  iconCam.position.set(size * 1.2, size * 1.25, size * 1.9);
  iconCam.lookAt(0, 0, 0);
  const prev = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()) };
  const prevAlpha = renderer.getClearAlpha();
  try {
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(hdr);
    renderer.clear();
    renderer.render(iconScene, iconCam);
    renderer.setRenderTarget(out);
    quad.render(renderer);
  } finally {
    renderer.setRenderTarget(prev.target);
    renderer.setClearColor(prev.color, prevAlpha);
    iconScene.remove(model);
  }
  const flip = !(await readRows());
  const px = await renderer.readRenderTargetPixelsAsync(out, 0, 0, ICON, ICON);
  // Bytes are sRGB and premultiplied; a canvas wants straight alpha.
  const c = document.createElement('canvas');
  c.width = c.height = ICON;
  const g = c.getContext('2d');
  const img = g.createImageData(ICON, ICON);
  const stride = ICON * 4;
  for (let y = 0; y < ICON; y++) {
    const from = (flip ? ICON - 1 - y : y) * stride;
    for (let x = 0; x < ICON; x++) {
      const i = from + x * 4,
        to = (y * ICON + x) * 4,
        a = px[i + 3];
      for (let k = 0; k < 3; k++) img.data[to + k] = a ? Math.min(255, Math.round((px[i + k] * 255) / a)) : 0;
      img.data[to + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}
