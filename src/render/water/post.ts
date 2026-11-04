// One production AgX output, after underwater HDR. The old path retains scene.ts's Neutral transform.
import { pipeline, renderer, scenePass } from '../scene.ts';
import { agx, createExposureMeter, TSL, type N } from '../tone.ts';
import { scalar, tuningEnabled } from './live.ts';

const { Fn, OnAfterRenderPipeline, pow, select, vec3, vec4, float, mix, dot, max } = TSL;

export function installWaterPost(source: N) {
  const previous = pipeline.outputNode;
  const transform = pipeline.outputColorTransform;
  const meter = createExposureMeter(scenePass.getTextureNode());
  const params = { exposure: 1, autoExposure: 1, keyValue: 0.18, contrast: 1, saturation: 1 };
  const exposure = scalar('post.exposure', params, 'exposure');
  const auto = scalar('post.autoExposure', params, 'autoExposure');
  const key = scalar('post.keyValue', params, 'keyValue');
  const contrast = scalar('post.contrast', params, 'contrast');
  const saturation = scalar('post.saturation', params, 'saturation');
  const output = Fn(() => {
    OnAfterRenderPipeline(() => meter.save(renderer));
    const gain = tuningEnabled ? mix(1, meter.value.mul(float(key).div(0.18)), auto).mul(exposure) : meter.value;
    let c = agx(source.rgb.mul(gain));
    if (tuningEnabled) {
      c = pow(max(c, 0), vec3(contrast));
      c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
    }
    const srgb = select(
      c.lessThanEqual(vec3(0.0031308)),
      c.mul(12.92),
      pow(c, vec3(1 / 2.4))
        .mul(1.055)
        .sub(0.055),
    );
    return vec4(srgb, 1);
  })();
  pipeline.outputNode = output;
  pipeline.outputColorTransform = false;
  pipeline.needsUpdate = true;
  return {
    update: meter.update,
    dispose() {
      if (pipeline.outputNode === output) {
        pipeline.outputNode = previous;
        pipeline.outputColorTransform = transform;
        pipeline.needsUpdate = true;
      }
      meter.dispose();
    },
  };
}
