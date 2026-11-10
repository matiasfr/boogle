// One production Neutral output, after the underwater fog. AgX remains in the opt-in look comparisons.
import { pipeline } from '../scene.ts';
import { TSL, type N } from '../tone.ts';
import { surfaceExposure } from '../exposure.ts';
import { bind, onChange, scalar, tuningEnabled } from './live.ts';
import { createWaterBloom } from './bloom.ts';
import { NeutralToneMapping } from 'three/webgpu';
import { toneMapping } from 'three/tsl';
import { registerGraphics } from '../../graphics-settings.ts';

const { Fn, If, pow, select, vec3, vec4, float, mix, dot, max } = TSL;

export function installWaterPost(source: N) {
  const previous = pipeline.outputNode;
  const transform = pipeline.outputColorTransform;
  // Authored fixed gain for the frozen lighting state; no meter draws or history copy.
  const params = { contrast: 1, saturation: 1 };
  const contrast = scalar('post.contrast', params, 'contrast');
  const saturation = scalar('post.saturation', params, 'saturation');
  const look = { power: 1.12, saturation: 1.3 };
  const agxPower = scalar('post.agxPower', look, 'power');
  const agxSaturation = scalar('post.agxSaturation', look, 'saturation');
  let compare: ((hdr: N, gain: N) => N) | undefined;
  let curve = () => 'neutral';
  let stopCompare = () => {};
  const makeOutput = (hdr: N) =>
    Fn(() => {
      const gain = float(surfaceExposure);
      let c = compare ? compare(hdr, gain) : toneMapping(NeutralToneMapping, 1, vec4(hdr.rgb.mul(gain), 1)).rgb;
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
  const updateBloom = () => {
    const enabled = bloomParams.enabled === 1 && bloomParams.strength > 0;
    if (enabled && !bloom) {
      // First enable builds the optional pipelines on the next real draw. No work at flag-off startup.
      bloom = createWaterBloom(source, float(threshold));
      bloomOutput = makeOutput(bloom.hdr.add(bloom.glow.mul(strength)));
    }
    const next = enabled ? bloomOutput : output;
    if (pipeline.outputNode === next) return;
    pipeline.outputNode = next;
    pipeline.needsUpdate = true;
  };
  const stop = onChange(updateBloom);
  pipeline.outputNode = output;
  pipeline.outputColorTransform = false;
  pipeline.needsUpdate = true;
  const unregisterBloom = registerGraphics({
    id: 'bloom',
    label: 'Water bloom',
    choices: [true, false],
    default: false,
    applyMode: 'rebuild',
    cost: 'HDR materialization and bloom passes',
    skips: 'Bypasses the entire bloom chain; allocated targets are retained until water disposal.',
    hitch: 'First enable builds optional targets and pipelines on the next draw; it can hitch.',
    read: () => bloomParams.enabled === 1 && bloomParams.strength > 0,
    apply: (value) => {
      bloomParams.enabled = value === true ? 1 : 0;
      updateBloom();
    },
  });
  return {
    async prepare() {
      if (!tuningEnabled) return;
      const looks = await import('./looks.ts');
      compare = looks.prepareLooks(agxPower, agxSaturation);
      curve = looks.activeLookCurve;
      stopCompare = looks.disposeLooks;
      output = makeOutput(source);
      // A saved Graphics override may have built bloom before Looks was prepared.
      if (bloom) bloomOutput = makeOutput(bloom.hdr.add(bloom.glow.mul(strength)));
      updateBloom();
    },
    tone: () => curve(),
    dispose() {
      unregisterBloom();
      stop();
      stopCompare();
      if (pipeline.outputNode === output || pipeline.outputNode === bloomOutput) {
        pipeline.outputNode = previous;
        pipeline.outputColorTransform = transform;
        pipeline.needsUpdate = true;
      }
      bloom?.dispose();
    },
  };
}
