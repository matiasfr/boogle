// Several modules extend the same node material (terrain, props, critters, caves). patchNode wraps whatever is in one
// node slot (positionNode, colorNode, emissiveNode, aoNode, ...) with fn(prev) and returns the material. prev is null
// when the slot is empty: fn supplies the default (positionLocal for positionNode, materialColor for colorNode, ...).
// No program cache keys: three keys node materials by their node graph.
type Slots = Record<string, unknown>;
// prev is whatever node the slot holds (any TSL node type), so it is typed loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function patchNode<M extends object>(mat: M, slot: string, fn: (prev: any) => unknown): M {
  const m = mat as unknown as Slots & { needsUpdate: boolean };
  m[slot] = fn(m[slot] ?? null);
  m.needsUpdate = true;
  return mat;
}
