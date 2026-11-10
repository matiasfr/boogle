// The Sunshine sea's water field: synchronous CPU heights from the same swell the vertices draw, so swimming, plunges,
// floaters and the camera read the surface with no GPU readback or latency. Local; the contract is ../../../physics/water-field.ts.
import { SEA } from '../../../constants.ts';
import type { WaterPosition, WaterProvider, WaterSample } from '../../../physics/water-field.ts';
import type { Coast } from './coast.ts';
import { swellAt } from './swell.ts';

export function createSwellProvider(coast: Coast) {
  let now = 0,
    reads = 0;
  const sample = (p: WaterPosition): WaterSample => {
    reads++;
    const { bed, normal } = coast.sampleAt(p.x, p.z);
    const { height, rate } = swellAt(p.x, p.z, now, SEA - bed);
    return {
      height,
      verticalVelocity: rate,
      bedHeight: bed,
      body: 'sea',
      bodyId: 'sea',
      valid: true,
      age: 0,
      normal: [normal[0], normal[1]],
    };
  };
  const provider: WaterProvider = {
    sampleAt: (_id, p) => sample(p),
    nearby: sample,
    invalidate() {},
    forget() {},
  };
  return {
    provider,
    /** Before physics, with the clock the surface draws with (the sea's prePhysics). */
    publish(time: number) {
      now = time;
    },
    inspect: () => ({ kind: 'cpu swell', time: now, reads }),
  };
}
