// Several modules extend the same node material (terrain, props, critters, caves). patchNode wraps whatever is in one
// node slot (positionNode, colorNode, emissiveNode, aoNode, ...) with fn(prev) and returns the material. prev is null
// when the slot is empty: fn supplies the default (positionLocal for positionNode, materialColor for colorNode, ...).
// No program cache keys: three keys node materials by their node graph.
export function patchNode(mat, slot, fn) {
  if (!mat) return mat;
  mat[slot] = fn(mat[slot] ?? null);
  mat.needsUpdate = true;
  return mat;
}
