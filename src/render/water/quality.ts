// Shared scene resolution only; never renderer DPR, tone mapping or MSAA. The demo keeps its independent post owner.
import { renderer, scenePass } from '../scene.ts';
export function createWaterQuality() {
  const params = new URLSearchParams(location.search);
  const mobile =
    params.get('q') === 'mobile' || (params.get('q') !== 'high' && matchMedia('(pointer: coarse)').matches);
  const resolution = mobile ? 0.6 : 1;
  const original = scenePass.getResolutionScale();
  const maxDpr = Math.min(devicePixelRatio, 2);
  return {
    name: mobile ? 'mobile' : 'high',
    resolution,
    update() {
      scenePass.setResolutionScale(Math.min(1, (resolution * maxDpr) / renderer.getPixelRatio()));
    },
    dispose() {
      scenePass.setResolutionScale(original);
    },
  };
}
