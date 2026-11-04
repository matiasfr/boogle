// Shared scene resolution only; never renderer DPR, tone mapping or MSAA. The demo keeps its independent post owner.
import { renderer, scenePass } from '../scene.ts';
import { bind } from './live.ts';
export function createWaterQuality() {
  const params = new URLSearchParams(location.search);
  const mobile =
    params.get('q') === 'mobile' || (params.get('q') !== 'high' && matchMedia('(pointer: coarse)').matches);
  let resolution = mobile ? 0.6 : 1;
  bind(
    'quality.resolution',
    () => resolution,
    (value) => {
      resolution = value as number;
    },
  );
  const original = scenePass.getResolutionScale();
  const maxDpr = Math.min(devicePixelRatio, 2);
  return {
    name: mobile ? 'mobile' : 'high',
    get resolution() {
      return resolution;
    },
    update() {
      scenePass.setResolutionScale(Math.min(1, (resolution * maxDpr) / renderer.getPixelRatio()));
    },
    dispose() {
      scenePass.setResolutionScale(original);
    },
  };
}
