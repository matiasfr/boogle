// Bounded Local GPU queries. The same inverse surface kernel serves rendering and these owner-side forces.
// Promise callbacks only enqueue completions; publish() is called before physics, never from a callback.
import { SEA } from '../../constants.ts';
import { ReadbackBuffer } from 'three/webgpu';
import type { WaterPosition, WaterSample, WaterProvider } from '../../physics/water-field.ts';
import { renderer } from '../scene.ts';
import type { createShoreAtlas } from './shore-providers.ts';
import { TSL, type N } from './tsl.ts';

const CAPACITY = 64,
  MAX_AGE = 0.1,
  MAX_DISTANCE = 0.5,
  MAX_SPEED = 3;
const { Fn, attributeArray, instanceIndex, vec4 } = TSL;
type Result = { height: number; velocity: number; time: number; p: WaterPosition; seq: number };
type Consumer = { id: string; generation: number; p: WaterPosition; seen: number; result?: Result };
type Request = { consumer: Consumer; generation: number; p: WaterPosition; previous?: Result; prediction?: number };
type Completion = { requests: Request[]; time: number; seq: number; data: Float32Array };
const distance = (a: WaterPosition, b: WaterPosition) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const bound = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    mean: values.reduce((a, b) => a + b, 0) / (values.length || 1),
    p95: sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0,
    max: sorted.at(-1) ?? 0,
  };
}
function record(values: number[], value: number) {
  if (values.length === 2048) values.shift();
  values.push(value);
}

export function createWaterQueries(heightAt: (xz: N) => N, atlas: ReturnType<typeof createShoreAtlas>) {
  const consumers = new Map<string, Consumer>();
  const completed: Completion[] = [];
  const consumedAges: number[] = [];
  const ages: number[] = [],
    errors: number[] = [],
    rejectedAges: number[] = [];
  const rejected = { age: 0, position: 0, generation: 0, order: 0, nonfinite: 0, capacity: 0 };
  let now = 0,
    sequence = 0,
    generation = 0,
    disposed = false,
    accepted = 0,
    failed = 0,
    skipped = 0,
    resets = 0;
  const slots = Array.from({ length: 2 }, () => {
    const input = attributeArray(new Float32Array(CAPACITY * 4), 'vec4');
    const output = attributeArray(CAPACITY, 'vec4');
    const compute = Fn(() => {
      const p = input.element(instanceIndex);
      output.element(instanceIndex).assign(vec4(heightAt(p.xy), heightAt(p.zw), 0, 0));
    })().compute(CAPACITY);
    return { input, output, compute, readback: new ReadbackBuffer(CAPACITY * 16), pending: false };
  });
  const reset = (c: Consumer) => {
    c.generation = ++generation;
    c.result = undefined;
  };
  function fallback(p: WaterPosition): WaterSample {
    const bed = atlas.sampleAt(p.x, p.z);
    return {
      height: SEA,
      verticalVelocity: 0,
      bedHeight: bed.bed,
      body: 'sea',
      bodyId: 'sea',
      valid: false,
      age: Infinity,
      normal: [bed.normal[0]!, bed.normal[1]!],
    };
  }
  function read(c: Consumer, p: WaterPosition): WaterSample {
    const sample = fallback(p),
      r = c.result;
    if (!r) return sample;
    const age = Math.max(0, now - r.time),
      nearby = distance(p, r.p) <= MAX_DISTANCE;
    sample.age = age;
    sample.valid = nearby && age <= MAX_AGE;
    // Brief extrapolation, then ease to mean over 250 ms. A teleport clears r before this path.
    const fade = nearby ? Math.max(0, 1 - Math.max(0, age - MAX_AGE) / 0.25) : 0;
    sample.height += (r.height + r.velocity * Math.min(age, MAX_AGE) - SEA) * fade;
    sample.verticalVelocity = sample.valid ? r.velocity : 0;
    return sample;
  }
  const provider: WaterProvider = {
    sampleAt(id, p) {
      let c = consumers.get(id);
      if (!c) {
        // Reserve the two force consumers; an observer can never crowd the player or owned ball out.
        const force = id === 'player' || id === 'ball';
        const observers = consumers.size - Number(consumers.has('player')) - Number(consumers.has('ball'));
        if (consumers.size >= CAPACITY || (!force && observers >= CAPACITY - 2)) {
          rejected.capacity++;
          return fallback(p);
        }
        c = { id, generation: ++generation, p: { ...p }, seen: now };
        consumers.set(id, c);
      }
      if (distance(c.p, p) > 2) reset(c);
      c.p = { x: p.x, y: p.y, z: p.z };
      c.seen = now;
      const sample = read(c, p);
      if (sample.valid) record(consumedAges, sample.age);
      return sample;
    },
    nearby(p) {
      for (const c of consumers.values()) {
        // surfaceAt is deliberately 2D; its Infinity sentinel must not fail the cache's vertical proximity test.
        const sample = read(c, Number.isFinite(p.y) ? p : { ...p, y: c.p.y });
        if (sample.valid) return sample;
      }
      return fallback(p);
    },
    invalidate(id) {
      const c = consumers.get(id);
      if (c) reset(c);
    },
    forget(id) {
      const c = consumers.get(id);
      if (c) reset(c);
      consumers.delete(id);
    },
  };
  return {
    provider,
    publish(time: number) {
      if (disposed) return;
      if (time < now || time - now > 1) {
        for (const c of consumers.values()) reset(c);
        resets++;
      }
      now = time;
      for (const done of completed.splice(0))
        done.requests.forEach((r, i) => {
          const c = r.consumer,
            age = now - done.time;
          if (consumers.get(c.id) !== c || c.generation !== r.generation) {
            rejected.generation++;
            return;
          }
          if (c.result && done.seq <= c.result.seq) {
            rejected.order++;
            return;
          }
          if (age > MAX_AGE || age < 0) {
            rejected.age++;
            record(rejectedAges, age);
            return;
          }
          if (distance(c.p, r.p) > MAX_DISTANCE) {
            rejected.position++;
            return;
          }
          const height = done.data[i * 4]!,
            previousHeightNow = done.data[i * 4 + 1]!;
          if (!Number.isFinite(height) || !Number.isFinite(previousHeightNow)) {
            rejected.nonfinite++;
            return;
          }
          // Both heights for this derivative use the PREVIOUS sample's fixed x/z: crossing a slope isn't wave motion.
          const dt = r.previous ? done.time - r.previous.time : 0;
          const velocity =
            r.previous && dt > 0 && dt <= 0.25 ? bound((previousHeightNow - r.previous.height) / dt, MAX_SPEED) : 0;
          c.result = { height, velocity, p: r.p, time: done.time, seq: done.seq };
          accepted++;
          record(ages, age);
          if (r.prediction !== undefined) record(errors, Math.abs(r.prediction - height));
        });
      for (const [id, c] of consumers) if (now - c.seen > 3) provider.forget(id);
    },
    dispatch(time: number) {
      if (disposed || !consumers.size) return;
      const slot = slots.find((s) => !s.pending);
      if (!slot) {
        skipped++;
        return;
      }
      const requests: Request[] = [];
      const data = slot.input.value.array as Float32Array;
      for (const c of consumers.values()) {
        if (time - c.seen > 0.25) continue;
        const p = { ...c.p },
          previous = c.result;
        const prediction = read(c, p);
        // Advance the consumed estimate to this kernel's exact timestamp, at the exact request position.
        const predicted = prediction.valid ? prediction.height + prediction.verticalVelocity * (time - now) : undefined;
        const i = requests.length * 4;
        data.set([p.x, p.z, previous?.p.x ?? p.x, previous?.p.z ?? p.z], i);
        requests.push({ consumer: c, generation: c.generation, p, previous, prediction: predicted });
      }
      if (!requests.length) return;
      slot.input.value.needsUpdate = true;
      const seq = ++sequence;
      slot.pending = true;
      renderer.compute(slot.compute);
      void renderer
        .getArrayBufferAsync(slot.output.value, slot.readback)
        .then(() => {
          if (!disposed && slot.readback.buffer)
            completed.push({ requests, time, seq, data: new Float32Array(slot.readback.buffer.slice(0)) });
        })
        .catch(() => {
          failed++;
        })
        .finally(() => {
          slot.readback.release();
          slot.pending = false;
        });
    },
    inspect() {
      return {
        capacity: CAPACITY,
        consumers: consumers.size,
        pending: slots.filter((s) => s.pending).length,
        queued: completed.length,
        accepted,
        failed,
        skipped,
        resets,
        rejected: { ...rejected },
        limits: { ageSeconds: MAX_AGE, distanceMetres: MAX_DISTANCE, velocity: MAX_SPEED },
        acceptedAgeSeconds: summary(ages),
        consumedAgeSeconds: summary(consumedAges),
        rejectedAgeSeconds: summary(rejectedAges),
        predictionErrorMetres: summary(errors),
        errorMeaning: 'same request position/time GPU kernel versus consumed prediction; not tessellated image error',
        samples: [...consumers.values()].map((c) => ({
          id: c.id,
          generation: c.generation,
          position: c.p,
          ...read(c, c.p),
        })),
      };
    },
    dispose() {
      disposed = true;
      for (const c of consumers.values()) reset(c);
      consumers.clear();
      completed.length = 0;
      for (const slot of slots) {
        slot.compute.dispose();
        slot.input.value.dispose();
        slot.output.value.dispose();
        slot.readback.dispose();
      }
    },
  };
}
