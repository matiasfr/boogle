// The before/after postcard (docs/research/era-progression.md, rec 6; shared-moments-and-events.md, rec 7): when
// opening day starts, a still of the court from a fixed camera; once the ripple has spread, another from the same
// spot; then both side by side on a paper card, so the change lands and is remembered. Local: each tab takes its own,
// and only if it saw opening day happen (a late joiner gets no "before"). The scene renders linear HDR into a target,
// a full-screen pass applies the game's tone mapping and sRGB (as src/player/item-icons.ts does), and it is read back.
import * as THREE from 'three/webgpu';
import { renderOutput, texture, uv, vec4 } from 'three/tsl';
import { renderer, scene } from '../../render/scene.ts';

const W = 384,
  H = 216;
const COURT_CAM = { at: [12, 9, 36], look: [12, 3, 4] }; // the court in front, the route, town hall and tower behind
const SHOW_S = 14;

const cam = new THREE.PerspectiveCamera(55, W / H, 0.5, 900);
cam.position.set(COURT_CAM.at[0], COURT_CAM.at[1], COURT_CAM.at[2]);
cam.lookAt(COURT_CAM.look[0], COURT_CAM.look[1], COURT_CAM.look[2]);

let hdr: THREE.RenderTarget | null = null,
  out: THREE.RenderTarget | null = null,
  quad: THREE.QuadMesh | null = null,
  topDown: boolean | null = null;
function setup(): void {
  hdr = new THREE.RenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  out = new THREE.RenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false });
  const mat = new THREE.NodeMaterial();
  mat.blending = THREE.NoBlending;
  mat.depthTest = mat.depthWrite = false;
  mat.fragmentNode = renderOutput(texture(hdr.texture, uv()), renderer.toneMapping, renderer.outputColorSpace);
  quad = new THREE.QuadMesh(mat);
}
// Which row comes first differs by backend: find out once with a gradient (uv.y is 1 at the top).
async function rowsTopDown(): Promise<boolean> {
  if (topDown !== null) return topDown;
  const probe = new THREE.RenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: false });
  const m = new THREE.NodeMaterial();
  m.fragmentNode = vec4(uv().y, 0, 0, 1);
  const before = renderer.getRenderTarget();
  renderer.setRenderTarget(probe);
  new THREE.QuadMesh(m).render(renderer);
  renderer.setRenderTarget(before);
  const px = (await renderer.readRenderTargetPixelsAsync(probe, 0, 0, 4, 4)) as Uint8Array;
  probe.dispose();
  m.dispose();
  return (topDown = px[0] > 127);
}

async function still(): Promise<string | null> {
  if (!hdr) setup();
  const prev = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(hdr);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.setRenderTarget(out);
    quad!.render(renderer);
  } finally {
    renderer.setRenderTarget(prev);
  }
  // Sampling the scene's target in the output pass flips it once more than the probe (unlike item-icons' square,
  // symmetric-looking icons, a landscape shows it), so rows that come out top-down need flipping here.
  const flip = await rowsTopDown();
  const px = (await renderer.readRenderTargetPixelsAsync(out!, 0, 0, W, H)) as Uint8Array;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const from = (flip ? H - 1 - y : y) * W * 4;
    img.data.set(px.subarray(from, from + W * 4), y * W * 4);
    for (let x = 0; x < W; x++) img.data[(y * W + x) * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}

// ---------------------------------------------------------------- the card
const card = document.createElement('div');
card.className = 'era-postcard';
card.hidden = true;
(document.querySelector('.hud') ?? document.body).append(card);
card.addEventListener('click', () => (card.hidden = true));

let before: Promise<string | null> | null = null,
  hideAt = 0;
const safe = (p: Promise<string | null>) =>
  p.catch((e) => {
    console.warn('[era postcard]', e);
    return null;
  });

/** The "before" still: call when opening day starts, while the old era still stands. */
export function snapBefore(): void {
  before = safe(still());
}
/** The "after" still, then the card (only if there is a "before"). */
export function snapAfter(eraName: string): void {
  const b = before;
  if (!b) return;
  before = null;
  void Promise.all([b, safe(still())]).then(([pre, post]) => {
    if (!pre || !post) return;
    card.innerHTML =
      `<figure><img alt="" src="${pre}"><figcaption>Before</figcaption></figure>` +
      `<figure><img alt="" src="${post}"><figcaption>After</figcaption></figure>` +
      `<p>Opening day: ${eraName}</p>`;
    card.hidden = false;
    hideAt = performance.now() + SHOW_S * 1000;
    const tick = () => {
      if (performance.now() >= hideAt) card.hidden = true;
      else if (!card.hidden) setTimeout(tick, 500);
    };
    tick();
  });
}
/** Drop a pending "before" (the era changed without the swap being seen: a reset, a reload). */
export function forgetPostcard(): void {
  before = null;
}
