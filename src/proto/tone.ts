// Local comparison, DESIGN.md: Show, don't tell; small and readable.
// Research and exposure calibration: docs/research/tone-comparison.md. Never changes renderer.toneMapping.
import { NeutralToneMapping, ACESFilmicToneMapping, SRGBColorSpace, NoToneMapping } from 'three/webgpu';
import { onFrame } from '../loop.ts';
import { pipeline, renderer, scenePass } from '../render/scene.ts';
import { agx, createExposureMeter, luma, TSL, type N } from '../render/tone.ts';
import { protoOn } from './flags.ts';

const { Fn, OnAfterRenderPipeline, clamp, mix, renderOutput, smoothstep, toneMapping, vec3, vec4 } = TSL;
export type Tone = 'neutral' | 'agx' | 'agx-sat' | 'aces';
// Fixed middle-grey match, shared across scenes: no shot-specific exposure that could hide a curve's weakness.
export const trims: Record<Tone, number> = { neutral: 1, agx: 0.771116, 'agx-sat': 0.771116, aces: 0.729587 };
const curves: Record<Tone, (rgb: N) => N> = {
  neutral: (rgb) => toneMapping(NeutralToneMapping, 1, vec4(rgb, 1)).rgb,
  agx,
  'agx-sat': (rgb) => {
    const c = agx(rgb).toVar(),
      y = luma(c);
    // Extra chroma in the toy midtones, tapering off before white highlights. Clamp only at the display gamut.
    return clamp(mix(vec3(y), c, smoothstep(0.45, 0.9, y).oneMinus().mul(0.3).add(1)), 0, 1);
  },
  aces: (rgb) => toneMapping(ACESFilmicToneMapping, 1, vec4(rgb, 1)).rgb,
};

export async function installTone(tone: Tone) {
  if (protoOn('water')) {
    // Await the actual installation, not a timer: avoid metering or tone mapping its display output twice.
    const { post } = await import('./water/index.ts');
    post.setTone(curves[tone], trims[tone]);
    return;
  }
  let hdr: N = scenePass.getTextureNode();
  if (protoOn('place')) {
    await import('./place/index.ts');
    const { LOOK } = await import('./place/look.ts');
    if (LOOK.gtao) hdr = (await import('./place/look-gtao.ts')).toneSource;
  }
  let meter: ReturnType<typeof createExposureMeter> | undefined;
  const map = (source: N, input: N) => {
    meter?.dispose();
    const exposure = (meter = createExposureMeter(input));
    return Fn(() => {
      OnAfterRenderPipeline(() => exposure.save(renderer));
      const rgb = curves[tone](source.rgb.mul(exposure.value).mul(trims[tone]));
      return renderOutput(vec4(rgb, source.a), NoToneMapping, SRGBColorSpace);
    })();
  };
  if (protoOn('look')) {
    await import('../debug/look-lab.ts');
    const { setOutputTone } = await import('../debug/look-post.ts');
    setOutputTone(map);
  } else {
    pipeline.outputNode = map(pipeline.outputNode, hdr);
    pipeline.outputColorTransform = false;
    pipeline.needsUpdate = true;
  }
  onFrame(({ dt }) => meter?.update(dt), { phase: 'late', order: 1200 });
}
