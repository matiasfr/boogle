// Local overlap diagnostic (`?view=overlap`, Local Tunables view.mode 3, Dev → Z-fighting). Loaded only by
// view-mode.ts when the mode is chosen; source materials are never edited or disposed.
//
// Pass 1 draws every opaque mesh into a float target: object id, instance index, view depth and a shade.
// Pass 2 draws them again with no depth test into a second target, keeping only fragments whose depth matches
// the stored nearest surface within OVERLAP_EPS while a different object/instance owns that pixel: two surfaces
// competing for one depth, which is what z-fighting is. A screen pass paints the first target flat grey and the
// second magenta. Contacts inside one draw (merged geometry) share an id and are not shown; the census covers them.
import {
  Color,
  FloatType,
  InstancedMesh,
  Mesh,
  MeshBasicNodeMaterial,
  NearestFilter,
  QuadMesh,
  RenderTarget,
  Vector2,
  type Material,
  type NodeMaterial,
  type Object3D,
} from 'three/webgpu';
import {
  Discard,
  Fn,
  If,
  abs,
  float,
  instanceIndex,
  ivec2,
  max as tslMax,
  min as tslMin,
  mix,
  normalView,
  positionView,
  screenCoordinate,
  textureLoad,
  uniform,
  vec3,
  vec4,
  vertexStage,
} from 'three/tsl';
import { renderer, scene, camera, sky, pipeline } from '../render/scene.ts';

/** Depth agreement treated as "the same surface": 2 mm (the census tolerance) plus 0.05 % of view depth. */
export const OVERLAP_EPS = { base: 0.002, perMetre: 0.0005 };

// Stored as id + 1 so a cleared pixel (0) never names an object.
const objectId = uniform(0).onObjectUpdate(({ object }) => (object ? object.id + 1 : 0));
// Interpolation leaves the index a hair off its integer (97.99999), so round it before any comparison.
const instance = vertexStage(instanceIndex.toFloat()).round();
const depth = positionView.z.negate();
const target = () => {
  const t = new RenderTarget(1, 1, { type: FloatType, minFilter: NearestFilter, magFilter: NearestFilter });
  t.texture.generateMipmaps = false;
  return t;
};
const ids = target();
const hits = target();
const at = (t: RenderTarget, dx = 0, dy = 0) => textureLoad(t.texture, ivec2(screenCoordinate.xy).add(ivec2(dx, dy)));

type Pass = 'id' | 'hit';
let pass: Pass | null = null;
const copies = { id: new WeakMap<Material, NodeMaterial>(), hit: new WeakMap<Material, NodeMaterial>() };
function overrideMaterial(source: Material, kind: Pass) {
  let copy = copies[kind].get(source);
  if (copy) return copy;
  copy = new MeshBasicNodeMaterial();
  // NodeMaterial.copy keeps position/skin/morph nodes, alpha test and side, so the copy covers the same pixels.
  copy.copy(source as MeshBasicNodeMaterial);
  copy.lights = false;
  copy.fog = false;
  copy.transparent = false;
  copy.lightsNode = copy.envNode = copy.aoNode = null;
  copy.fragmentNode = copy.backdropNode = null;
  copy.depthTest = kind === 'id';
  copy.depthWrite = kind === 'id';
  copy.outputNode =
    kind === 'id'
      ? vec4(objectId, instance, depth, abs(normalView.z))
      : Fn(() => {
          const stored = at(ids);
          const eps = float(OVERLAP_EPS.base).add(depth.mul(OVERLAP_EPS.perMetre));
          const mine = stored.x.equal(objectId).and(stored.y.equal(instance));
          If(mine.or(stored.x.equal(0)).or(abs(stored.z.sub(depth)).greaterThan(eps)), () => Discard());
          return vec4(objectId, instance, 0, 1);
        })();
  copies[kind].set(source, copy);
  source.addEventListener('dispose', () => {
    copy.dispose();
    copies[kind].delete(source);
  });
  return copy;
}

const opaque = (m: Material) => m.visible && !m.transparent && m.opacity >= 1;
let originalDraw = renderer.getRenderObjectFunction();
const draw: Parameters<typeof renderer.setRenderObjectFunction>[0] = (...args) => {
  const [object, , , , material] = args;
  const active = renderer.getRenderTarget();
  if (pass && (active === ids || active === hits)) {
    if (!(object instanceof Mesh) || object === sky || !opaque(material)) return;
    args[4] = overrideMaterial(material, pass);
  }
  if (originalDraw) originalDraw(...args);
  else renderer.renderObject(...args);
};

// Screen pass: grey shaded by facing, magenta where pass 2 kept a fragment. A hit whose 2-pixel neighbours all
// hit is solid magenta; thin lines (edge-on seams where two meshes merely meet) stay a fainter pink.
const composite = new MeshBasicNodeMaterial({ toneMapped: false, depthTest: false, depthWrite: false });
composite.outputNode = Fn(() => {
  const base = at(ids);
  const hit = at(hits).w;
  const area = tslMin(tslMin(at(hits, 2, 0).w, at(hits, -2, 0).w), tslMin(at(hits, 0, 2).w, at(hits, 0, -2).w));
  const grey = vec3(base.w.mul(0.45).add(0.25));
  const backdrop = vec3(0.08, 0.09, 0.11);
  const lit = base.x.greaterThan(0).select(grey, backdrop);
  const magenta = vec3(1, 0, 1);
  const tint = tslMax(hit.mul(0.45), hit.mul(area));
  return vec4(mix(lit, magenta, tint), 1);
})();
const quad = new QuadMesh(composite);

const size = new Vector2();
const clearColor = new Color();
const originalRender = pipeline.render;
function render() {
  renderer.getDrawingBufferSize(size);
  if (ids.width !== size.x || ids.height !== size.y) {
    ids.setSize(size.x, size.y);
    hits.setSize(size.x, size.y);
  }
  const previous = renderer.getRenderTarget();
  const background = scene.background,
    backgroundNode = scene.backgroundNode;
  scene.background = scene.backgroundNode = null;
  const clearAlpha = renderer.getClearAlpha();
  renderer.getClearColor(clearColor);
  renderer.setClearColor(0x000000, 0);
  try {
    for (const [kind, t] of [
      ['id', ids],
      ['hit', hits],
    ] as const) {
      pass = kind;
      renderer.setRenderTarget(t);
      renderer.clear();
      renderer.render(scene, camera);
    }
  } finally {
    pass = null;
    renderer.setClearColor(clearColor, clearAlpha);
    scene.background = background;
    scene.backgroundNode = backgroundNode;
  }
  renderer.setRenderTarget(previous);
  quad.render(renderer);
  if (probe) readPair();
}

// Hover: names the surface at the cursor (or the screen centre while the pointer is locked / untouched) and the
// competing surface pass 2 found within twelve pixels. Readbacks are throttled and never block a frame.
type Pair = { a: string; b: string; x: number; y: number } | null;
let label: HTMLElement | null = null;
let pointer: { x: number; y: number } | null = null;
let probe = false;
let reading = false;
let last = 0;
let pair: Pair = null;
const onMove = (e: PointerEvent) => {
  pointer = document.pointerLockElement ? null : { x: e.clientX, y: e.clientY };
};
function describe(stored: number, index: number) {
  const id = stored - 1;
  const object = scene.getObjectById(id);
  if (!object) return `object ${id}`;
  const names: string[] = [];
  for (let p: Object3D | null = object; p && p !== scene; p = p.parent) if (p.name) names.unshift(p.name);
  const instanced = object instanceof InstancedMesh ? `/instance-${index}` : '';
  return `${names.join('/') || (object as Mesh).geometry?.type || object.type}/mesh-${id}${instanced}`;
}
function readPair() {
  const now = performance.now();
  if (reading || now - last < 150) return;
  reading = true;
  last = now;
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  const cx = pointer ? pointer.x - rect.left : rect.width / 2;
  const cy = pointer ? pointer.y - rect.top : rect.height / 2;
  const R = 12;
  const x = Math.round((cx / rect.width) * size.x) - R;
  const y = Math.round((cy / rect.height) * size.y) - R;
  const w = R * 2 + 1;
  if (x < 0 || y < 0 || x + w > size.x || y + w > size.y) {
    reading = false;
    return;
  }
  void Promise.all([
    renderer.readRenderTargetPixelsAsync(ids, x, y, w, w),
    renderer.readRenderTargetPixelsAsync(hits, x, y, w, w),
  ])
    .then(([a, b]) => {
      let best = -1,
        bestD = Infinity;
      for (let i = 0; i < w * w; i++) {
        if (!b[i * 4 + 3]) continue;
        const d = ((i % w) - R) ** 2 + (Math.floor(i / w) - R) ** 2;
        if (d < bestD) [best, bestD] = [i, d];
      }
      pair =
        best < 0
          ? null
          : {
              a: describe(Math.round(Number(a[best * 4])), Math.round(Number(a[best * 4 + 1]))),
              b: describe(Math.round(Number(b[best * 4])), Math.round(Number(b[best * 4 + 1]))),
              x: cx,
              y: cy,
            };
      if (label) {
        label.textContent = pair ? `${pair.a}\n↔ ${pair.b}` : 'No overlap at the cursor.';
        Object.assign(label.style, { left: `${rect.left + cx + 14}px`, top: `${rect.top + cy + 14}px` });
      }
    })
    .catch(() => {
      /* a resize can invalidate a pending read; the next frame tries again */
    })
    .finally(() => {
      reading = false;
    });
}

/** The pair last named under the cursor or crosshair, for Dev tool snapshots and looks. */
export const overlapPair = () => pair;

export function installOverlap() {
  originalDraw = renderer.getRenderObjectFunction();
  renderer.setRenderObjectFunction(draw);
  pipeline.render = render;
  label = document.createElement('pre');
  label.dataset.devUi = '';
  Object.assign(label.style, {
    position: 'fixed',
    left: '50%',
    top: '50%',
    margin: '0',
    maxWidth: 'min(560px, 70vw)',
    whiteSpace: 'pre-wrap',
    background: '#111d',
    color: 'white',
    padding: '6px 8px',
    font: '12px/1.35 ui-monospace, monospace',
    pointerEvents: 'none',
    zIndex: '100',
  });
  document.body.append(label);
  addEventListener('pointermove', onMove);
  probe = true;
}
export function removeOverlap() {
  probe = false;
  removeEventListener('pointermove', onMove);
  label?.remove();
  label = null;
  pair = null;
  pipeline.render = originalRender;
  renderer.setRenderObjectFunction(originalDraw);
}
