// One production AgX output, after underwater HDR. The old path retains scene.ts's Neutral transform.
import { pipeline, renderer, scenePass } from '../scene.ts';
import { agx, createExposureMeter, TSL, type N } from '../tone.ts';
import { bind, onChange, scalar, tuningEnabled } from './live.ts';
import { createWaterBloom } from './bloom.ts';
import { NeutralToneMapping } from 'three/webgpu';
import { toneMapping } from 'three/tsl';
import { toyNeutral, toySkyEnabled } from './flags.ts';

const { Fn, If, OnAfterRenderPipeline, pow, select, vec3, vec4, float, mix, dot, max } = TSL;

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
  const look = { power: 1.12, saturation: 1.3 };
  const agxPower = scalar('post.agxPower', look, 'power');
  const agxSaturation = scalar('post.agxSaturation', look, 'saturation');
  let compare: ((hdr: N, gain: N) => N) | undefined;
  let locked = () => false;
  let curve = () => (toyNeutral ? 'neutral' : 'agx');
  let stopCompare = () => {};
  const makeOutput = (hdr: N) =>
    Fn(() => {
      OnAfterRenderPipeline(() => meter.save(renderer));
      const gain = tuningEnabled ? mix(1, meter.value.mul(float(key).div(0.18)), auto).mul(exposure) : meter.value;
      let c = compare
        ? compare(hdr, gain)
        : toyNeutral
          ? toneMapping(NeutralToneMapping, 1, vec4(hdr.rgb.mul(gain), 1)).rgb
          : tuningEnabled
            ? agx(hdr.rgb.mul(gain), agxPower, agxSaturation)
            : agx(hdr.rgb.mul(gain));
      if (tuningEnabled) {
        c = c.toVar();
        If(contrast.notEqual(1), () => {
          c.assign(pow(max(c, 0), vec3(contrast)));
        });
        If(saturation.notEqual(1), () => {
          c.assign(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation));
        });
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
  let output = makeOutput(source);
  let bloom: ReturnType<typeof createWaterBloom> | undefined;
  let bloomOutput: N;
  const bloomParams = { enabled: 0, strength: 0.05, threshold: 1.5 };
  const strength = scalar('post.bloomStrength', bloomParams, 'strength');
  const threshold = scalar('post.bloomThreshold', bloomParams, 'threshold');
  bind(
    'post.bloom',
    () => bloomParams.enabled,
    (value) => {
      bloomParams.enabled = value as number;
    },
  );
  const stop = onChange(() => {
    const enabled = bloomParams.enabled === 1 && bloomParams.strength > 0;
    if (enabled && !bloom) {
      // First enable builds the optional pipelines on the next real draw. No work at flag-off startup.
      bloom = createWaterBloom(source, threshold);
      bloomOutput = makeOutput(bloom.hdr.add(bloom.glow.mul(strength)));
    }
    const next = enabled ? bloomOutput : output;
    if (pipeline.outputNode === next) return;
    pipeline.outputNode = next;
    pipeline.needsUpdate = true;
  });
  pipeline.outputNode = output;
  pipeline.outputColorTransform = false;
  pipeline.needsUpdate = true;
  return {
    async prepare() {
      if (!tuningEnabled || toySkyEnabled) return;
      const looks = await import('./looks.ts');
      compare = looks.prepareLooks(agxPower, agxSaturation, () => meter.read(renderer));
      locked = looks.exposureLocked;
      curve = looks.activeLookCurve;
      stopCompare = looks.disposeLooks;
      output = makeOutput(source);
      pipeline.outputNode = output;
      pipeline.needsUpdate = true;
    },
    update: tuningEnabled ? (dt: number) => meter.update(locked() ? 0 : dt) : meter.update,
    tone: () => curve(),
    dispose() {
      stop();
      stopCompare();
      if (pipeline.outputNode === output || pipeline.outputNode === bloomOutput) {
        pipeline.outputNode = previous;
        pipeline.outputColorTransform = transform;
        pipeline.needsUpdate = true;
      }
      meter.dispose();
      bloom?.dispose();
    },
  };
}
