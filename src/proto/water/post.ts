// The demo keeps its AgX, meter, vignette and dither. The opt-in tone comparison changes only its curve/trim.
import { MAX_DPR, pipeline, renderer, scenePass } from '../../render/scene.ts';
import { agx, createExposureMeter, TSL, type N } from '../../render/tone.ts';
import { waterQuality } from './quality.ts';

const { Fn, dot, fract, pow, screenCoordinate, select, uniform, uv, vec3, vec4 } = TSL;
const { OnAfterRenderPipeline, OnBeforeRenderPipeline } = TSL;
const hash33 = Fn(([p]: [N]) => {
  const q = fract(p.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
  q.addAssign(dot(q, q.yxz.add(33.33)));
  return fract(q.xxy.add(q.yxx).mul(q.zyx));
});

/** Call after createUnderwater installs its HDR composite; update belongs to the existing water frame hook. */
export function installDemoPost() {
  const source: N = pipeline.outputNode;
  const meter = createExposureMeter(scenePass.getTextureNode());
  const exposure = uniform(1),
    frame = uniform(0);
  function setTone(curve: (rgb: N) => N, trim = 1) {
    exposure.value = trim;
    pipeline.outputNode = Fn(() => {
      OnBeforeRenderPipeline(() => {
        scenePass.setResolutionScale(Math.min(1, (waterQuality.resolution * MAX_DPR) / renderer.getPixelRatio()));
      });
      OnAfterRenderPipeline(() => meter.save(renderer));
      const d = uv().sub(0.5).mul(Math.SQRT2);
      const c = curve(source.rgb.mul(meter.value).mul(exposure)).mul(dot(d, d).mul(-0.08).add(1)).toVar();
      const srgb = select(
        c.lessThanEqual(vec3(0.0031308)),
        c.mul(12.92),
        pow(c, vec3(1 / 2.4))
          .mul(1.055)
          .sub(0.055),
      );
      const noise = hash33(vec3(screenCoordinate.xy, frame))
        .add(hash33(vec3(screenCoordinate.xy, frame.add(17))))
        .sub(1)
        .div(255);
      return vec4(srgb.add(noise), 1);
    })();
    pipeline.outputColorTransform = false;
    pipeline.needsUpdate = true;
  }
  setTone(agx);
  let frames = 0;
  return {
    exposure,
    setTone,
    update(dt: number) {
      frame.value = frames++ & 255;
      meter.update(dt);
    },
  };
}
