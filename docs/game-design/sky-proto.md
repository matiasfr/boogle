# Prototype: procedural sky (`?proto=sky`)

Serves DESIGN.md 1, **Toys before chores**: “Every system must be fun to mess with before it has goals.”
This Local cosmetic study makes the main island a place worth lingering in. Question: **Does this feel like the place in the painting?**

- Holds a late-morning sun at `tod=0.2`; `&tod=0.3` gives noon, `&tod=0.55` sunset, `&tod=0.8` night.
  Moon phase defaults to full (`0.5`), with `&moon=` as an override. Neither the shared clock nor gameplay changes.
- Daylight starts with `place/look.ts` LIGHT: sky top `#2a6fe0`, horizon `#a8d0f5`, curve `0.42`;
  warm sun `#ffe6bf` at 3.1; hemisphere `#b4cffa` / `#c4b48c` at 2.3. Two smooth dome bands separate
  the clean horizon from the deeper upper sky. The extra palette and light fade out over sun heights 0.14–0.42,
  leaving the existing sunset and moonlit night, including stars. Fog colour follows the horizon; fog range stays unchanged.
- Five rounded cloud groups stay around the camera, including one high overhead. Each merges eight smooth lobes
  into one mesh, sharing geometry and one TSL material. The original nine cloud meshes are hidden only here.
  Soft white tops / cool undersides turn warm at sunset and dim blue at night. Groups orbit at 0.0012 radians/s
  (about 0.35 m/s for distant groups), with no wrapping boundary or cloud-free travel beyond the island.
- The daylight halo stays localized around the sun and can exceed 1 in linear HDR. No global bloom, textures,
  atmosphere simulation, volumetric raymarching, extra render passes or cloud shadow-map draws.
- Ground cloud shadows are deferred: the camera-relative cloud layout needs a coherent world-space projection
  before shadows would convincingly belong to it. Real-time smoothness and iPad cost need device playtesting.

Without the flag, the original dome graph, clouds, light and clock remain in use. The loader is
`src/features/proto-sky.ts`, presentation lives in `src/proto/sky/`, and the marked `src/render/sky.ts` seam
selects the daylight gradient/glare graph. `skyU` and `skyColors` keep their existing contract.
Build choices and offline source limits: [procedural-sky research](../research/procedural-sky.md).
