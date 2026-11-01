// Item icons for the HUD: each item's own model (src/player/item-models.ts), rendered once to a small image and cached.
// The scene renders linear HDR into a render target; a full-screen pass then applies the game's tone mapping and sRGB
// (the same renderOutput the main view ends with) into an 8-bit target, which is read back. A CanvasTarget can't do
// this: the WebGPU canvas is opaque.
//
//   setIcon(img, id)   fills an <img> with the icon for a catalog id (src/sim/gift-catalog.ts) or 'ball' (async)
//   warmIcons(ids)     draws those icons now (behind the loading screen): the icon scene's lights, targets and
//                      tone-mapping quad build pipelines of their own, and the first icon drawn mid-game hitched
import * as THREE from 'three/webgpu';
import { renderOutput, texture, uv } from 'three/tsl';
import { renderer } from '../render/scene.ts';
import { ball } from '../physics/ball.ts';
import { itemModel } from './item-models.ts';

const ICON = 96;
const icons = new Map<string, Promise<string | null>>();
const iconScene = new THREE.Scene();
iconScene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 2.2));
const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
keyLight.position.set(2, 3, 2);
iconScene.add(keyLight);
const iconCam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);

// Built on first use: the scene target (linear HDR, MSAA), the 8-bit output target, and the tone-mapping quad.
let hdr: THREE.RenderTarget | null = null,
  out: THREE.RenderTarget | null = null,
  quad: THREE.QuadMesh | null = null;
const bytes = (size: number) =>
  new THREE.RenderTarget(size, size, { type: THREE.UnsignedByteType, depthBuffer: false });
function setup() {
  const h = (hdr = new THREE.RenderTarget(ICON, ICON, { type: THREE.HalfFloatType, samples: 4 }));
  out = bytes(ICON);
  const mat = new THREE.NodeMaterial();
  mat.blending = THREE.NoBlending;
  mat.depthTest = mat.depthWrite = false;
  // renderOutput un-premultiplies, tone maps (renderer.toneMapping), encodes sRGB and premultiplies again.
  mat.fragmentNode = renderOutput(texture(h.texture, uv()), renderer.toneMapping, renderer.outputColorSpace);
  quad = new THREE.QuadMesh(mat);
}

// Renders run one at a time (they share the render targets and read back asynchronously).
let queue: Promise<unknown> = Promise.resolve();

// The icon for `id`: a promise of its data URL (null if the render failed). icons caches each id's promise; a failed
// render is dropped so the next call tries again.
function iconUrl(id: string) {
  if (!icons.has(id))
    icons.set(
      id,
      (queue = queue
        .then(() => draw(id))
        .catch((e) => {
          console.warn('[icons]', id, e);
          icons.delete(id);
          return null;
        })) as Promise<string | null>,
    );
  return icons.get(id)!;
}

// Fills `img` with the icon for `id` once its render finishes (unless the image has been given another id by then).
export function setIcon(img: HTMLImageElement, id: string) {
  img.dataset.icon = id;
  iconUrl(id).then((url) => {
    if (img.dataset.icon === id && url) img.src = url;
  });
}

export const warmIcons = (ids: string[]) => Promise.all(ids.map(iconUrl));

async function draw(id: string) {
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
    quad!.render(renderer);
  } finally {
    renderer.setRenderTarget(prev.target);
    renderer.setClearColor(prev.color, prevAlpha);
    iconScene.remove(model);
  }
  // WebGPU (the only backend) puts row 0 at the top of a render target and reads it back first, which is also the
  // canvas's order. (A uv.y gradient probe used to guess this and guessed wrong, so every icon came out upside down.)
  const px = (await renderer.readRenderTargetPixelsAsync(out!, 0, 0, ICON, ICON)) as Uint8Array;
  // Bytes are sRGB and premultiplied; a canvas wants straight alpha.
  const c = document.createElement('canvas');
  c.width = c.height = ICON;
  const g = c.getContext('2d')!;
  const img = g.createImageData(ICON, ICON);
  const stride = ICON * 4;
  for (let y = 0; y < ICON; y++) {
    const from = y * stride;
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
