// Several features extend the same built-in materials (terrain, props) through onBeforeCompile. Chain the patches and
// give each combination its own program cache key, so two materials of the same type with different patches never
// share a compiled shader.
export function patchMaterial(mat, key, fn) {
  if (!mat) return;
  const prev = mat.onBeforeCompile;
  const keys = [...(mat.userData.patchKeys ?? []), key];
  mat.userData.patchKeys = keys;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    fn(shader, renderer);
  };
  mat.customProgramCacheKey = () => keys.join('+');
  mat.needsUpdate = true;
}
