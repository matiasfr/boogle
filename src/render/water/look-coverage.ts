// Optional visible-coverage attachment. One rendering-class policy, no asset material clones or patches.
import {
  BlendMode,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  UnsignedByteType,
  NoColorSpace,
  NearestFilter,
  type Object3D,
  type Material,
} from 'three/webgpu';
import { scenePass } from '../scene.ts';
import { TSL, type N } from './tsl.ts';

const { Fn, output, mrt, vec4, clamp, uniform } = TSL;
type Builder = { object: Object3D & { isSprite?: boolean }; material: Material & { isSpriteNodeMaterial?: boolean } };

export function createLookCoverage(ocean: Object3D) {
  const previous = scenePass.getMRT();
  const classes = { opaque: new Set<string>(), water: new Set<string>(), protected: new Set<string>() };
  // Object-updated, not a builder-time constant: rocks can share a material with toys.
  // Owners tag whole procedural families once. No asset material edits or second attachment.
  const terrain = uniform(0).onObjectUpdate(({ object }: { object: Object3D }) =>
    object.userData.postLookTerrain === true ? 1 : 0,
  );
  const coverage = Fn((_: N[], builder: Builder) => {
    const material = builder.material;
    // r187's Background owner creates this material; it is not an asset naming convention.
    if (material.name === 'Background.material') return vec4(0);
    const alpha = clamp(output.a, 0, 1);
    const kind =
      builder.object === ocean
        ? 'water'
        : builder.object.isSprite || material.isSpriteNodeMaterial || material.transparent || !material.depthWrite
          ? 'protected'
          : 'opaque';
    classes[kind].add(material.type + ':' + material.name);
    return kind === 'water'
      ? vec4(0, alpha, 0, alpha)
      : kind === 'protected'
        ? vec4(0, 0, alpha, alpha)
        : vec4(terrain.oneMinus(), 0, 0, 1);
  })();
  const blend = new BlendMode(CustomBlending);
  blend.blendSrc = blend.blendSrcAlpha = OneFactor;
  blend.blendDst = blend.blendDstAlpha = OneMinusSrcAlphaFactor;
  const node = mrt({ output, postCoverage: coverage })
    .setBlendMode('postCoverage', blend)
    .setClearColor('postCoverage', 0, 0);
  const texture = scenePass.getTexture('postCoverage');
  texture.type = UnsignedByteType;
  texture.colorSpace = NoColorSpace;
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  const sampled: N = scenePass.getTextureNode('postCoverage');
  let enabled = false;
  // getTexture appends an attachment; it is only connected by enable().
  scenePass.renderTarget.textures.splice(scenePass.renderTarget.textures.indexOf(texture), 1);
  return {
    sampled,
    enable(value: boolean) {
      if (value === enabled) return;
      enabled = value;
      // Recreate the target descriptor at this structural boundary, preserving the colour/depth texture objects.
      scenePass.renderTarget.dispose();
      if (value) {
        scenePass.renderTarget.textures.push(texture);
        scenePass.setMRT(previous ? previous.merge(node) : node);
      } else {
        scenePass.renderTarget.textures.splice(scenePass.renderTarget.textures.indexOf(texture), 1);
        scenePass.setMRT(previous);
        texture.dispose();
      }
    },
    inspect: () => ({
      enabled,
      format: 'RGBA8',
      samples: scenePass.renderTarget.samples,
      classes: Object.fromEntries(Object.entries(classes).map(([kind, materials]) => [kind, [...materials]])),
    }),
    dispose() {
      this.enable(false);
      texture.dispose();
    },
  };
}
