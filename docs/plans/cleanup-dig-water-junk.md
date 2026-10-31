# Remove sand digging, the water sim and beach wash-ups (done)

> A record, not a plan. Landed 30 October 2026 as three commits: 4071f5b (digging and the shovel, and the dive),
> c42a698 (the lockstep water sim), b6f1a19 (junk washing up). The full plan is in this file's git history.

**Why.** Clear the toybox around the ball before new gameplay: fewer systems competing with it. Serves DESIGN.md
"Small and readable" and play principles 1 (toys before chores) and 2 (the ball stays the star); DESIGN.md's intro,
core loop and principle examples were rewritten to match.

**What went.** Dig, pile and flatten, the shovel, the dive, the shared water sim and its surface mesh, the `slosh` op,
sea currents on players and the ball, wash-ups and their Boogler small talk, the `clump` particle pool. **What stayed:**
the sea (shader and `SEA` level), swimming, buoyancy, the ball floating, splashes, critters, the cave pond, palm fruit,
the frisbee, seeds, the can, mushrooms and tossing. Readers of the water surface go through `surfaceAt` in
`src/physics/water-field.js`.

**Key decisions.**
- **Stubs keep the state keys.** `terrain` and `water` stay in `RULES` (`src/world/rules/index.js` was not edited, so
  state order never changes) as stubs at `version` 0: they load any save and ignore it, serialize a fixed document and
  hash a constant, and register no ops or ticks. The terrain stub writes the bare island in the old format and hashes
  the old empty-state hash (2166136261), so old tabs agree with it; no stub can match an old water hash (it mixed a
  tick count), so mixed rooms resync `water` until old tabs reload. That costs snapshot traffic, never a crash.
- **GIFTS is append-only.** Ground items, the `hd` presence field and saved hotbars store the catalog index, so no
  entry is removed or reordered: the shovel stays as `retired`, and the old shore kinds became `src: 'sea'` (holdable,
  giftable, never spawned). `SRC.SHORE` and `LIFE.shore` stay so items from older saves age out the same way on every
  build; `washed` and `nextWash` stay in the saved format with `nextWash` pinned to `NEVER`.
- **Old saves still load.** `test/fixtures/snap-pre-version.json`'s `snap` block is never edited; only its expected
  hashes changed, once per step. The two-player and reconnect scenarios now use `gift.toss` instead of digging.
