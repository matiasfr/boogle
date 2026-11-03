## TSL pitfalls (each cost us time)

- `vec3(someColor)` with a `THREE.Color` silently renders black: use `vec3(c.r, c.g, c.b)` or `color(c)`.
- WGSL needs texture samples and derivatives (`dFdx`, `dFdy`) in uniform control flow: sample before any `If`,
  `Loop` with a data-dependent exit, or `Discard`.
- Don't import a TSL function under the same name as a helper from `../math.ts` (`clamp`, `lerp`, `smoothstep`):
  alias it (`clamp as tslClamp`), or the module fails to load.
- `smoothstep` with reversed edges is undefined in WGSL: write `smoothstep(a, b, x).oneMinus()`.
- Node graphs compile once per material. Change a uniform's `.value` per frame, never rebuild the node.
