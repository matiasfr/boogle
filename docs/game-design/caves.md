# 6.12 Caves

The pond is a named still-water volume (`cave-pond`, level 3 m, existing ellipse `q < .81`). On the production-water routes,
the cave's 3D interior predicate excludes the outdoor ocean under its roof; the pond supplies its own floor and
zero surface velocity. Pond entry splashes use the shared particles without adding sea rings. Above-roof queries
remain outdoor, and classic home keeps its own sea pending CI qualification; water URL selectors are ignored. See [island water](island.md) for query limits.

On those routes, the near-plane lens grid uses that pond's level and actual ellipse, including when the lens
straddles its bank. It does not use ocean waves inside the pond. Dry cave interiors have no underwater volume;
the pond transmits the locally lit cave through absorption, with a wet-lens exit but no outdoor sky/sun in-scatter,
ocean sun shafts or marine snow. These are Local optics,
with no breath, drowning or additional shared state.
The pond does not sample the outdoor frozen sky cube through its cave roof.

- **What.** A separate little world under the heightfield, loaded lazily in its own chunk after start
  ([src/features/pois.ts](../../src/features/pois.ts); its `site.ts` ground stays eager): one seamless mesh, built a little
  each frame once loaded,
  is both the look and a trimesh collider. The ground is cut open at the four mouths (`setTerrainHoles`), and a ring
  of rock round each mouth (look only) hides the seam where the hillside's hole meets the tunnel. Bodies switch
  between the surface's collision group and the cave's when they cross a mouth (1 m out counts as in); a safety net
  puts anything stuck in rock back. Inside, the camera stays in the tunnel, the fog closes in and the sky light dims
  (`atmosphere.underground`); darkness is baked per vertex by distance from the nearest mouth (full daylight within 2 m,
  60 % from 14 m in). Cave rock casts shadows so the sun no longer lights the tunnels.
- **Sync kind.** Local and cosmetic, apart from collisions, which only affect bodies this client simulates.
- **Files.** [src/pois/caves/](../../src/pois/caves/) (`network.ts`, `mesh.ts`, `decor.ts`, `index.ts`, `site.ts`),
  [src/physics/physics.ts](../../src/physics/physics.ts) (`GROUP`, `groundProbe`).
- **Known issues.** The phone playtest asked for an audit of the caves' look and the walk in and out; the owner keeps
  the caves but wants that audit before more is added ([tech-plan.md](../tech-plan.md), "Decided").

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
