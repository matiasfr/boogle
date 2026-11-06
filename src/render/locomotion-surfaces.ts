// Local material metadata on the actual live supports. One query per contact, never per frame/voice.
import { forEachStatic, type Body } from '../physics/engine.ts';
import { groundHeight } from '../island/heights.ts';
import { waterField } from '../physics/water-field.ts';

export type StepSurface = 'grass' | 'sand' | 'wood' | 'rail' | 'water';
type Support = { top: number; surface: StepSurface };
type Sampler = (x: number, z: number) => Support | null;
const tagged = new WeakMap<Body, Sampler>();
const floors = new Set<Sampler>();

export function tagStepSupport(body: Body, sample: Sampler) {
  tagged.set(body, sample);
  return body;
}

/** Page-owned rooms supply their current built state. Owned views remove their sampler on disposal. */
export function registerStepFloor(sample: Sampler) {
  floors.add(sample);
  return () => void floors.delete(sample);
}

export function segmentStepSupport(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  topA: number,
  topB: number,
  width: number,
  surface: StepSurface,
): Sampler {
  const dx = bx - ax,
    dz = bz - az,
    length2 = dx * dx + dz * dz;
  return (x, z) => {
    const t = ((x - ax) * dx + (z - az) * dz) / length2;
    if (t < 0 || t > 1) return null;
    if (Math.hypot(x - ax - t * dx, z - az - t * dz) > width / 2) return null;
    return { top: topA + (topB - topA) * t, surface };
  };
}

let warnedUnknown = false;
export function stepSurfaceAt(x: number, y: number, z: number, bodyX = x, bodyZ = z): StepSurface {
  let best: Support | null = null;
  const accept = (s: Support | null) => {
    if (s && Math.abs(y - s.top) < 0.45 && (!best || Math.abs(y - s.top) < Math.abs(y - best.top))) best = s;
  };
  // forEachStatic visits live bodies only: torn-down tracks cannot leave ghost metal surfaces.
  forEachStatic(-1, (body) => {
    const sample = tagged.get(body);
    if (sample) accept(sample(x, z) ?? sample(bodyX, bodyZ));
  });
  for (const sample of floors) accept(sample(x, z) ?? sample(bodyX, bodyZ));
  if (!best) {
    const top = groundHeight(bodyX, bodyZ);
    if (Math.abs(y - top) < 0.45) best = { top, surface: top < 1.8 ? 'sand' : 'grass' };
    else {
      if (import.meta.env.DEV && !warnedUnknown) {
        warnedUnknown = true;
        console.info('audio: untagged support uses grass', { x: bodyX, y, z: bodyZ });
      }
      best = { top: y, surface: 'grass' };
    }
  }
  const support = best as Support;
  const water = waterField.nearby({ x, y, z });
  // A thin deck above water remains wood/rail. Only a grounded submerged sole splashes.
  return water.valid && water.height > support.top + 0.015 && water.height - support.top < 0.8
    ? 'water'
    : support.surface;
}
