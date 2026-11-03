# Prototype: procedural sky (`?proto=sky`)

Serves DESIGN.md 1, **Toys before chores**: “Every system must be fun to mess with before it has goals.”
This Local cosmetic study makes the main island a place worth lingering in. Question:
**Do these clouds and this horizon keep the sky you liked and make it better?**

The owner's 3 November verdict was “the original is looking pretty nice, honestly.” The original light blue stays;
the deeper `#2a6fe0` take and its sun/fill overrides are removed.

- The dome's existing palette, gradient curve, sun, fill light and fog colour follow the plain game's whole day.
  No forced time or moon phase: the normal world clock runs, and `&tod=` / `&moon=` use the game's existing preview.
  For comparison, `&tod=0.3` gives noon, `0.55` sunset and `0.8` night.
- Five rounded cloud groups stay around the camera in x/z, at fixed world heights of 80–195 m. Climbing the
  lighthouse brings you closer to their altitude instead of lifting them with you. Each group merges eight smooth
  lobes into one mesh, sharing geometry and one TSL material. The original nine clouds are hidden only here.
  White tops and lightly cool undersides turn glowing orange at sunset, retaining rounded shading; night keeps
  the previous quiet blue moonlit palette. Groups orbit continuously at 0.0012 radians/s (about 0.35 m/s for distant
  groups), with no wrapping boundary or cloud-free travel beyond the island.
- A soft low dome band blends toward its existing horizon colour, including at sunset and night. The original
  sun glow, moon and stars remain above it. The existing sea material blends its colour, glints and transparency
  toward that same horizon over 280–390 m of view depth, keeping blue water visible out to a thin, straight
  horizon transition. There is no shallow-angle haze; the dome shoulder spans direction heights 0–0.025.
  A safety fade over the plane's outer 610–640 m square rim hides its 650 m edge from oblique shore views.
  No new water design or palette.
- Distant land keeps the plain game's fog range, 110–520 m, and caves retain their own fog range.
  The sea uses its material haze instead of applying scene fog a second time.
- No new meshes beyond the existing five cloud groups, cloud shadow casters, textures, volumes or render passes.
  Ground cloud shadows remain deferred. Real-time smoothness and iPad cost need device playtesting.

Without the flag, the original dome and sea graphs, clouds, lighting, fog and clock remain in use. The loader is
`src/features/proto-sky.ts`, presentation lives in `src/proto/sky/`, and the small marked seams in
`src/render/sky.ts` and `src/render/water-render.ts` select horizon haze only. `?proto=water` owns the sea's future.
Build choices and offline source limits: [procedural-sky research](../research/procedural-sky.md).
