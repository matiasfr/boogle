# 6.12 Caves

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
