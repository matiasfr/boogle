// Local base-colour diagnostic. Source materials/assets are never edited or disposed.
import { Color, MeshBasicNodeMaterial, NoToneMapping, type Material, type NodeMaterial } from 'three/webgpu';
import { renderer, scene, sky, pipeline, scenePass } from '../render/scene.ts';
import { createWaterMesh } from '../render/water-render.ts';
import { receiverBaseColor } from '../render/water/receivers.ts';
import { bind } from '../render/water/live.ts';
import { VIEW_SPECS } from '../render/view-tuning.ts';

type Surface = Material & Partial<Pick<NodeMaterial, 'lights' | 'colorNode'>> & { color?: Color };
const query = new URLSearchParams(location.search);
const settings: Record<string, number> = {
  'view.mode': query.get('view') === 'raw' ? 2 : query.get('view') === 'unlit' ? 1 : 0,
  'view.sky': query.get('viewSky') === 'off' ? 0 : 1,
  'view.water': query.get('viewWater') === 'off' ? 0 : 1,
};
const copies = new WeakMap<Material, { material: MeshBasicNodeMaterial; version: number }>();
const lit = (material: Surface) =>
  /(?:Standard|Physical|Lambert|Phong|Toon|Shadow)(?:Node)?Material$/.test(material.type) ||
  (material.lights === true && material.type !== 'MeshBasicNodeMaterial');

function baseMaterial(source: Surface) {
  let entry = copies.get(source);
  if (!entry) {
    const material = new MeshBasicNodeMaterial();
    entry = { material, version: -1 };
    copies.set(source, entry);
    source.addEventListener('dispose', () => {
      material.dispose();
      copies.delete(source);
    });
  }
  const target = entry.material;
  if (entry.version !== source.version) {
    // NodeMaterial.copy preserves maps, alpha, side, vertex/instance colours, skin/morph/position
    // nodes and masks. Its basic vertex path still uses the original object's skeleton/instances.
    target.copy(source as MeshBasicNodeMaterial);
    target.lights = false;
    target.lightsNode = target.envNode = target.aoNode = null;
    target.fragmentNode = target.outputNode = target.backdropNode = null;
    target.envMap = target.aoMap = target.lightMap = null;
    target.fog = false;
    const base = receiverBaseColor(source);
    target.colorNode = base === undefined ? (source.colorNode ?? null) : base;
    target.needsUpdate = true;
    entry.version = source.version;
  }
  // Authored colours/opacity can animate without a shader-version change.
  if (source.color) target.color.copy(source.color);
  target.opacity = source.opacity;
  return target;
}

const originalRender = pipeline.render;
let originalDraw = renderer.getRenderObjectFunction();
let installed = false;
let output: {
  node: typeof pipeline.outputNode;
  transform: boolean;
  tone: typeof renderer.toneMapping;
  exposure: number;
} | null = null;
const grey = new Color('#808080');
const draw: Parameters<typeof renderer.setRenderObjectFunction>[0] = (...args) => {
  const [object, targetScene, , , material] = args;
  if (targetScene === scene) {
    if (!settings['view.water'] && object === createWaterMesh()) return;
    if (!settings['view.sky'] && object === sky) return;
    if (settings['view.mode'] && lit(material)) args[4] = baseMaterial(material);
  }
  if (originalDraw) originalDraw(...args);
  else renderer.renderObject(...args);
};
function restoreOutput() {
  if (!output) return;
  pipeline.outputNode = output.node;
  pipeline.outputColorTransform = output.transform;
  renderer.toneMapping = output.tone;
  renderer.toneMappingExposure = output.exposure;
  pipeline.needsUpdate = true;
  output = null;
}
function render() {
  if (settings['view.mode'] === 2) {
    // The water/Looks owner may rebuild while the diagnostic is open; retain its newest output.
    if (!output || pipeline.outputNode !== scenePass) {
      output = {
        node: pipeline.outputNode,
        transform: pipeline.outputColorTransform,
        tone: output?.tone ?? renderer.toneMapping,
        exposure: output?.exposure ?? renderer.toneMappingExposure,
      };
      pipeline.outputNode = scenePass;
      pipeline.outputColorTransform = true;
      pipeline.needsUpdate = true;
    }
    renderer.toneMapping = NoToneMapping;
    renderer.toneMappingExposure = 1;
  }
  const background = scene.background,
    backgroundNode = scene.backgroundNode;
  if (!settings['view.sky']) {
    scene.backgroundNode = null;
    scene.background = grey;
  }
  try {
    originalRender.call(pipeline);
  } finally {
    scene.background = background;
    scene.backgroundNode = backgroundNode;
  }
}
function apply() {
  if (settings['view.mode'] !== 2) restoreOutput();
  const active = settings['view.mode'] !== 0 || !settings['view.sky'] || !settings['view.water'];
  if (active === installed) return;
  installed = active;
  if (active) {
    originalDraw = renderer.getRenderObjectFunction();
    renderer.setRenderObjectFunction(draw);
    pipeline.render = render;
  } else {
    renderer.setRenderObjectFunction(originalDraw);
    pipeline.render = originalRender;
  }
}
for (const spec of VIEW_SPECS) {
  bind(
    spec.id,
    () => settings[spec.id]!,
    (value) => {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > spec.max)
        throw new Error(`Invalid diagnostic choice: ${spec.id}`);
      settings[spec.id] = value;
      apply();
    },
  );
}
apply();
