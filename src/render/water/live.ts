// Local rendering controls. Off-route calls return the original constants and allocate no uniforms.
import { Vector3 } from 'three/webgpu';
import { newWaterEnabled } from './flags.ts';
import { TSL, type N } from './tsl.ts';

export const tuningEnabled = newWaterEnabled && new URLSearchParams(location.search).get('tune') === '1';
export type Value = number | number[];
export type Binding = { get(): Value; set(value: Value): void };
export const bindings = new Map<string, Binding>();
const nodes = new Map<string, N>();
const refreshers = new Set<() => void>();
export function onChange(update: () => void) {
  if (tuningEnabled) refreshers.add(update);
  return () => {
    refreshers.delete(update);
  };
}
export function refresh() {
  for (const update of refreshers) update();
}
export function bind(key: string, get: () => Value, set: (value: Value) => void) {
  if (!tuningEnabled) return;
  bindings.set(key, {
    get,
    set(value) {
      set(value);
      refresh();
    },
  });
}
export function scalar(key: string, owner: object, property: string): N {
  const data = owner as Record<string, number>;
  if (!tuningEnabled) return data[property]!;
  if (nodes.has(key)) return nodes.get(key);
  const node = TSL.uniform(data[property]!);
  nodes.set(key, node);
  bind(
    key,
    () => data[property]!,
    (value) => {
      data[property] = value as number;
      node.value = value;
    },
  );
  return node;
}
export function vector(key: string, owner: object, property: string): N {
  const data = owner as Record<string, number[]>;
  const value = data[property]!;
  if (!tuningEnabled) return TSL.vec3(value[0]!, value[1]!, value[2]!);
  if (nodes.has(key)) return nodes.get(key);
  const node = TSL.uniform(new Vector3().fromArray(value));
  nodes.set(key, node);
  bind(
    key,
    () => [...data[property]!],
    (next) => {
      const values = next as number[];
      data[property]!.splice(0, 3, ...values);
      node.value.fromArray(values);
    },
  );
  return node;
}
/** CPU-fold derived constants, updating only when a control changes, never per frame. */
export function derived(read: () => number): N {
  if (!tuningEnabled) return read();
  const node = TSL.uniform(read());
  refreshers.add(() => {
    node.value = read();
  });
  return node;
}
