// Shared scene resolution only; never renderer DPR, tone mapping or MSAA. The demo keeps its independent post owner.
import { setWaterResolution } from '../quality.ts';
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
  return {
    name: mobile ? 'mobile' : 'high',
    get resolution() {
      return resolution;
    },
    update() {
      setWaterResolution(resolution);
    },
    dispose() {
      setWaterResolution(1);
    },
  };
}
