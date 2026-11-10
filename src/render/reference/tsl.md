## TSL pitfalls (each cost us time)

- `vec3(someColor)` with a `THREE.Color` silently renders black: use `vec3(c.r, c.g, c.b)` or `color(c)`.
- WGSL needs texture samples and derivatives (`dFdx`, `dFdy`) in uniform control flow: sample before any `If`,
  `Loop` with a data-dependent exit, or `Discard`.
- Don't import a TSL function under the same name as a helper from `../math.ts` (`clamp`, `lerp`, `smoothstep`):
  alias it (`clamp as tslClamp`), or the module fails to load.
- `smoothstep` with reversed edges is undefined in WGSL: write `smoothstep(a, b, x).oneMinus()`.
- Firefox's WGSL compiler (naga) refuses `mix`, `smoothstep`, `dot` and `atan2` when every argument is a literal
  ("failed to convert expression to a concrete type"); Chromium and Safari accept it. TSL writes JS numbers as untyped
  literals, and tuning helpers (`scalar`, `coveU`) return plain numbers off the tuning route, so `mix(1, 0.62, ody)`
  becomes `mix( 1.0, 0.62, 1.0 )`. Fold such blends on the CPU (`derived` in `water/live.ts`) or skip the call when the
  weight is a known number. Every harness run reports an offender as a `THREE.WGSL portability` gfx error
  (`dev/look/wgsl-portability.ts`).
- Node graphs compile once per material. Change a uniform's `.value` per frame, never rebuild the node.
