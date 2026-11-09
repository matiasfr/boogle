# Direction: where Boogle is

**This is Boogle's one roadmap** (owner, 8 November). Other docs that list what's next link here instead of keeping their own list. It is a derived view, not decision authority: decisions live in [boogle-2.md](proposals/boogle-2.md#current-decision-index), standing calls in [owner-calls](agents/owner-calls.md), principles in [DESIGN.md](../DESIGN.md), tasks in each plan, evidence in [playtests.md](playtests.md). Live job status is in [orchestrator-state](agents/orchestrator-state.md). Consult with the [game-direction skill](../.claude/skills/game-direction/SKILL.md). Background: [research](research/game-direction.md). The owner's view of this is the [Line Map](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

Reviewed: 8 November 2026, at `46eb7125`, against boogle-2.md's entries to 8 November, [line2-b5-b8.md](plans/line2-b5-b8.md), [split-rock-roundhouse.md](plans/split-rock-roundhouse.md), [production-core.md](plans/production-core.md) and `git log origin/main`. Compare these sources before quoting anything here.

## How we got here

The Place prototype (`?proto=place`) proved the loop over playtest rounds 1–4, with its state owned by a browser tab. From 4 November, production core rebuilt the same design on server authority, so progress stays built when players leave and rejoin. Line 2 is built on that.

## Phase

**1. Production core, with the next area starting.** Line 1 and line 2 run on the server railway, from the first stretch to the pier facing Ring Island. The next owner playtest covers all of it. Split-rock Works, the next area, has started in parallel by the owner's 8 November call.

**Active gate:** the owner's playtest of the 8 November fixes plus B5–B8. Nothing that playtest could change starts until the owner has played (owner-calls: stop at the owner's playtest).

## Now, next, later

|           | What                                                                                                                                                                                    | Status                                                                                                                                                                                                                                                                 | Done when                                                                                  | Plan                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Now**   | The owner's next playtest: the 8 November solo-test fixes plus line 2 part 2 B5–B8 (halts, trains on both lines, the boiler, Q6 and the pier), at world v21                              | All merged. The final long playthrough is being fixed before the owner plays ([decision](proposals/boogle-2.md#process), 8 November, "the next playtest")                                                                                                             | The owner has played and given notes                                                       | [line2-b5-b8.md](plans/line2-b5-b8.md), [proof record](plans/line2-part2-greybox.md#b5b8-proof-record-8-november) |
| **Next**  | Split-rock Works and the smallest Roundhouse: the breaker, footings carried alone or together, twelve footings and six bents toward Ring Island                                          | J1 (layout) and J2 (default-on blockout) are merged. J3's rules (world v22) wait for the owner's B5–B8 verdict; J4 and J5 follow J3                                                                                                                                 | The area plays end to end, and the bot times it against the six-hour target                | [split-rock-roundhouse.md](plans/split-rock-roundhouse.md)                                             |
| **Later** | The target-quality pass: a full session at target quality on the finished home island, watched with a fresh player, and a second area's cost measured                              | Not yet planned in detail. Its art and character work is listed below                                                                                                                                                                                                 | Owner accepts the experience and quality                                                   | None yet                                                                                               |

**Production core.** Slices 1–3 (the server spine, T1, line 1 and its walk home) merged 5–6 November. Slice 4's construction is complete through the pier at world v21. Still open: slice 5 (schedules, town delivery and growth on the server), slice 6 (object lifetime and presentation dependencies) and slice 7 (retiring `src/proto/place`, which the railway still borrows views and layout from). See the [promotion slices](plans/production-core.md#reviewable-promotion-slices).

**Superseded:** the round-4 replay "Now" is long done. "Don't start new areas yet" was replaced by the 8 November call to start Split-rock Works and the Roundhouse now, with their rules waiting for the B5–B8 verdict.

## Target-quality pass: art and characters

Not yet planned in detail. This is unrelated to the historical eras 1–2 [vertical-slice spec](proposals/vertical-slice.md) (31 October, never built). This lists what's on `main` and what's left, checked against `git log origin/main`.

**Done:**

- **Track-layer machine.** Crawler shell (`85af518a`), flanged rail wheels (`6657c5f6`, `4fa38246`), rigid panel magazine and hoist (`528560d4`), all in #1018. Seats as plain stools (#1197).
- **Fresh material palette** as the default for every family (#1109).
- **Baked wood grain** on a shared tile for visible timber (#1093).
- **Sickle Isles backdrop** on the horizon by default, built to a phone draw budget (#1223).
- **3.6 km fog** for the outdoor view (`fc69843c`, #1167).
- **The starter cove's terrain.** The west cove is every entry's shore (`97db0d0d`), composed after station grading (#1034), and recorded as the terrain direction (`fa4674c8`).

**Characters: done, and spread across several places.**

- **Buddy**, the one player figure: the 2 November calls in [Characters and story](proposals/boogle-2.md#characters-and-story) (no ears or cheeks, gaze, soft shoulders, conductor hats). As built: [player](game-design/player.md).
- **Asset and animation stage** at `/character/` (`917291fe`; [asset-stage](game-design/asset-stage.md)), with Buddy's equipment fitted (`035e5aee`) and the axes and two-handed chop posed (`3e139d2d`).
- **Townsfolk:** the little guys, code-built and instanced (`src/proto/place/folk.ts`), kept as they are by the 5 November "some lo-fi is character" call; they sleep beyond 150 m (#1152).
- **Sleeves**, the town entrance greeter (`8ec6531a`; [place](game-design/place.md)).
- Research: [characters](research/characters.md), [motion references](research/motion-references.md). [decomp-characters](plans/decomp-characters.md) is an unbuilt plan for more engine-run guest characters.

**Characters: left.** Outfits on Buddy's other slots: only head (hats) is used of head, body, hands and feet (1 November, "the bare hero base before outfits"). Animation polish, starting simple (owner-calls). Any further townsfolk modelling needs its own brief.

**Open:**

- **Terrain on the rest of the island.** The cove is done. The rest can be looked at, toward smooth sculpted forms with banded, height-driven strata (5 November, "smooth, textured terrain"; [terrain texturing](research/terrain-texturing.md)).

**OK for now:** lighting and post (owner, 8 November). The broader pass across every visual layer after a [look-dev loop](research/lookdev-loop.md) (5 November) is not scheduled.

**Deferred:** iPad and iPhone measurement of the full look is not prioritized yet (owner, 8 November). The backdrop's phone draw budget stays a build constraint; only the measurement pass waits.

## Phase map

The graph can step back for an affected risk. Exit evidence for each is in the [research](research/game-direction.md#proposed-phase-map-from-here-to-a-finished-boogle).

| Phase                       | Proves                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ |
| 0. Close round 4 discovery  | Done: the notes were reconciled and the changed loop played                          |
| **1. Production core (now)** | One durable shared construction path, solo and two players                          |
| 2. Target-quality pass      | A representative session at target quality, with a fresh player and second-unit cost |
| 3. Controlled content       | Small playable batches at a known rate, with a rough route to the ending             |
| 4. Alpha                    | Every campaign-critical feature works end to end; placeholders allowed               |
| 5. Beta                     | All intended content in; pacing, readability and devices checked                     |
| 6. Release                  | Remaining blockers fixed; the owner approves known limits                            |

## Owner decisions that change the next work

- The owner's B5–B8 verdict unblocks Split-rock's J3 (world v22), the jump-upgrade balcony and the ankle rings.
- Beam carry: pick a Godot-style option after reading the [comparison](research/beam-carry-godot-comparison.md).
- Cart first, then trains: the [proposal](plans/cart-then-trains.md) was never answered. Line 2 already runs the depot cart before its trains, so ask before running it.
