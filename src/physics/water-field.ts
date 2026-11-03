// Renderer-free Local water contract. GPU results are published only at the pre-physics boundary; callers never wait.
import { SEA } from '../constants.ts';
import { groundHeight } from '../island/heights.ts';

export type WaterPosition = { x: number; y: number; z: number };
export type WaterSample = {
  height: number;
  verticalVelocity: number;
  bedHeight: number;
  body: 'sea' | 'pond' | 'dry';
  bodyId: string;
  valid: boolean;
  age: number; // seconds since the GPU kernel sampled it; still water has age zero
  normal: readonly [number, number]; // outward coast normal, not the optical surface normal
};
export type WaterProvider = {
  sampleAt(id: string, p: WaterPosition): WaterSample;
  nearby(p: WaterPosition): WaterSample;
  invalidate(id: string): void;
  forget(id: string): void;
};
type Pond = {
  id: string;
  level: number;
  ellipse?: { x: number; z: number; rx: number; rz: number };
  contains(p: WaterPosition): boolean;
  bedAt(p: WaterPosition): number;
};
const ponds = new Map<string, Pond>();
const exclusions = new Map<string, (p: WaterPosition) => boolean>();
let provider: WaterProvider | null = null;
const flat = (p: WaterPosition): WaterSample => ({
  height: SEA,
  verticalVelocity: 0,
  bedHeight: groundHeight(p.x, p.z),
  body: 'sea',
  bodyId: 'sea',
  valid: true,
  age: 0,
  normal: [0, 0],
});
function compose(p: WaterPosition, sea: () => WaterSample) {
  let excluded = false;
  for (const contains of exclusions.values())
    if (contains(p)) {
      excluded = true;
      break;
    }
  let sample: WaterSample = excluded ? { ...flat(p), height: -Infinity, body: 'dry', bodyId: 'dry' } : sea();
  for (const pond of ponds.values())
    if (pond.contains(p) && pond.level > sample.height) {
      sample = {
        height: pond.level,
        verticalVelocity: 0,
        bedHeight: pond.bedAt(p),
        body: 'pond',
        bodyId: pond.id,
        valid: true,
        age: 0,
        normal: [0, 0],
      };
    }
  return sample;
}

export const waterField = {
  get moving() {
    return provider !== null;
  },
  install(next: WaterProvider) {
    provider = next;
    return () => {
      if (provider === next) provider = null;
    };
  },
  registerPond(pond: Pond) {
    ponds.set(pond.id, pond);
    return () => void ponds.delete(pond.id);
  },
  pond(id: string) {
    return ponds.get(id);
  },
  opticalPondAt(p: WaterPosition, padding: number) {
    for (const pond of ponds.values()) {
      const e = pond.ellipse;
      if (!e || !pond.contains({ x: e.x, y: p.y, z: e.z })) continue;
      const q = ((p.x - e.x) / (e.rx + padding)) ** 2 + ((p.z - e.z) / (e.rz + padding)) ** 2;
      if (q < 1) return pond;
    }
    return undefined;
  },
  excludeSea(id: string, contains: (p: WaterPosition) => boolean) {
    exclusions.set(id, contains);
    return () => void exclusions.delete(id);
  },
  sampleAt(id: string, p: WaterPosition): WaterSample {
    return compose(p, () => (provider ? provider.sampleAt(id, p) : flat(p)));
  },
  // Non-authoritative synchronous contact/decoration lookup: nearby fresh sample or mean sea/pond.
  // A preview traces many hypothetical points in one frame; it must not fill the live consumer table with them.
  nearby(p: WaterPosition): WaterSample {
    return compose(p, () => (provider ? provider.nearby(p) : flat(p)));
  },
  surfaceAt(x: number, z: number) {
    return this.nearby({ x, y: Infinity, z }).height;
  },
  invalidate(id: string) {
    provider?.invalidate(id);
  },
  forget(id: string) {
    provider?.forget(id);
  },
};
