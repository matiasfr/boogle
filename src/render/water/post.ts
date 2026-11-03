// One production AgX output, after underwater HDR. The old path retains scene.ts's Neutral transform.
import { pipeline, renderer, scenePass } from '../scene.ts';
import { agx, createExposureMeter, TSL, type N } from '../tone.ts';

const { Fn, OnAfterRenderPipeline, pow, select, vec3, vec4 } = TSL;

export function installWaterPost(source: N) {
  const previous = pipeline.outputNode;
  const transform = pipeline.outputColorTransform;
  const meter = createExposureMeter(scenePass.getTextureNode());
  const output = Fn(() => {
    OnAfterRenderPipeline(() => meter.save(renderer));
    const c = agx(source.rgb.mul(meter.value));
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
