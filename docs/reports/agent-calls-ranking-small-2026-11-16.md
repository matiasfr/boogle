# Agent-call ranking, the small topics — 16 November 2026

Stage 2 of the agent-call triage for the remaining topics (owner-approved, 16 November): the designer's sort of every row still `open` in **CH** (characters, cosmetics and story), **GX** (graphics, water, sky and devices), **AU** (audio), **HU** (controls, HUD and arrival) and **AT** (architecture, tools and prototype lifecycle) of [agent-calls.md](../agent-calls.md), read on `origin/main` at `3a0571e0f`. It follows the [first batch](agent-calls-ranking-2026-11-16.md) (CL and RW) in format and bar. IDs are [stage 1](agent-calls-triage-2026-11-16.json)'s, matched by exact Call text against its baseline `4bde3a35f`; every open row matched, so there are no `-new-` IDs. Judged on DESIGN.md, the decision files, owner calls, direction, the linked plans, and the code where a row's premise depended on what is built. Every row is in the [JSON sheet](agent-calls-ranking-small-2026-11-16.json). Nothing in agent-calls.md is changed here.

- **Decide:** worth your call. Ranked; a recommendation and one reason each.
- **Flag:** wrong, already answered, or out of date. The fix and its source.
- **Bulk:** safe to confirm as it stands.

Copy rows: names, characters and their words stay yours. Where a row is copy, the recommendation says **owner's copy** and nothing here judges the words.

| Topic | Decide | Flag | Bulk | Open |
| --- | ---: | ---: | ---: | ---: |
| Characters, cosmetics and story | 1 | 3 | 12 | 16 |
| Graphics, water, sky and devices | 0 | 1 | 5 | 6 |
| Audio | 0 | 0 | 0 | 0 |
| Controls, HUD and arrival | 3 | 4 | 10 | 17 |
| Architecture, tools and prototype lifecycle | 1 | 8 | 58 | 67 |
| **All** | 5 | 16 | 85 | 106 |

Audio has no open rows. Every decide list is well under the cap of about 10, so nothing was cut. These topics are mostly built defaults: Graphics has nothing that needs you beyond its one flag, and Architecture's one decision is about your own testing workflow.

## Characters, cosmetics and story

### Decide

1. **CH-014: Sleeves the greeter's 15 lines, written by the greeter job and live in the game.** Recommend **confirm as placeholders; the words are owner's copy**. They are the first lines a new player hears and they ship today; names, characters and their words are yours (11 November), so only you can keep or rewrite them. *Source:* [decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s) · [greeter.ts](../../src/entities/railway/greeter.ts)

### Flags

- **CH-003: The Boogler's position and facing are saved, he returns to his start on a reset, and his wander is seeded per room.** DESIGN.md's authority table, applied on your word on 16 November ("Apply the draft."), says The Boogler's position and facing are saved; a room reset sending him home is your 9 November rule ("The Boogler included"). The seeded wander and idle look are as built. Fix: **confirm and move to the archive (already answered)**. *Source:* [DESIGN.md](../../DESIGN.md), Clear authority · [decisions-process.md#d-2026-11-16-design-sync-model-applied](../decisions-process.md#d-2026-11-16-design-sync-model-applied) · [decisions-controls.md#d-2026-11-09-a-room-reset-starts-the-game](../decisions-controls.md#d-2026-11-09-a-room-reset-starts-the-game)
- **CH-007: Dressing cycles each slot left and right, applied at once, with no confirm or revert; partners see every step.** Your 10 November entry, written from your five answers to the pause-wardrobe review, states the rule: "Left and right cycle each slot, applied at once; partners see each step through the usual presence." That entry's words are the orchestrator's summary; your own answer (4) on the pips was "Nothing plus what you own". Fix: **confirm and move to the archive (already answered)**. *Source:* [decisions-characters.md#d-2026-11-10-dress-buddy-from-pause-you-is](../decisions-characters.md#d-2026-11-10-dress-buddy-from-pause-you-is)
- **CH-011: Colour moves to the You page, the pet row reads the stowaway's name, mute on You, fullscreen under Options, and a lighter dim behind You.** You overruled the dim on 10 November ("there is a dull filter which doesnt make sense on the customization screen"): You has no dim at all. The rest is as built. Fix: **change: confirm, minus the lighter dim**. *Source:* [decisions-characters.md#d-2026-11-10-no-dim-behind-the-pause-view-s-you](../decisions-characters.md#d-2026-11-10-no-dim-behind-the-pause-view-s-you)

### Bulk (12, confirm)

The server-owned Boogler's reaction delays and ranges (built on your 13 November authority answer), the Pause wardrobe's button map, cycle order, rows and "new" dot, a resident's direct line over a reward card, and suspect town lines kept as written (owner's copy). IDs: CH-001, CH-002, CH-004, CH-006, CH-008, CH-009, CH-010, CH-012, CH-013, CH-015, CH-016, CH-017.

## Graphics, water, sky and devices

### Flags

- **GX-005: Dressing-kit small calls: painted risers stay, timber kerb only at edges, nothing on Ring Island yet, you pick the style from a two-style previz sheet.** On 15 November you had the painted timber risers and their highlights removed; climbs keep the plain packed-earth path. The other kit calls stand. Fix: **change: confirm, minus "painted risers stay"**. *Source:* [decisions-look.md#d-2026-11-15-plain-path-climbs](../decisions-look.md#d-2026-11-15-plain-path-climbs)

### Bulk (5, confirm)

The packed-earth path's colours and checks inside your 14 November choice, the path-edge view rules, the terrain clean-up order, and the vertical-only Sunshine swell. IDs: GX-001, GX-002, GX-003, GX-004, GX-007.

## Audio

No open rows.

## Controls, HUD and arrival

### Decide

1. **HU-009: Acts come from railway progress: Act 2 at Q5 (built), Act 3 at the twelfth pier footing, Act 4 at the Meet; each browser shows the current act once.** Recommend **change: confirm the rule; place Acts 3 and 4 when their opening shows are built**. The rule and Act 2 are yours already; Acts 3 and 4 are story structure, which is yours (11 November), and as logged both fall in the Ring Island stretch, so they are better placed once you see those beats. *Source:* [decisions-controls.md#d-2026-11-11-the-game-has-acts](../decisions-controls.md#d-2026-11-11-the-game-has-acts) · [decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s) · [railway-queries-story.ts](../../src/sim/railway-queries-story.ts)
2. **HU-012: The one way to skip a cinematic is Interact, offered 0.8 s in, shown as Interact's own glyph in a highlighted chip; that press only skips.** Recommend **confirm**. Your 9 November rule allowed "maybe" one highlighted button and left the pick logged; this is that pick, and it now applies to every shot, the Q4 and forge cuts included. *Source:* [decisions-controls.md#d-2026-11-09-a-cinematic-can-t-be-interrupted](../decisions-controls.md#d-2026-11-09-a-cinematic-can-t-be-interrupted)
3. **HU-005: After the return window runs out, you start at Home, with the Welcome back card.** Recommend **confirm**. Your 14 November entry decides recent returns but leaves Home after a long absence open with you; with the route now long, starting at Home rather than the nearest halt sets how far a returning player is from where they left off. *Source:* [decisions-controls.md#d-2026-11-14-a-recent-reload-returns-you-where](../decisions-controls.md#d-2026-11-14-a-recent-reload-returns-you-where)

### Flags

- **HU-001: Far Head's shared shot grows from 5 s to about 8.5 s with a cut to the forge casting the boiler.** You answered on 15 November: "the Far Head cutscene could be longer, that's fine". It is built (#1870). Fix: **confirm and move to the archive (already answered)**. *Source:* [decisions-core-loop.md#d-2026-11-15-grant-queue-answered](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered) · [forge-call-handoff.md#as-built-15-november-2026](../plans/forge-call-handoff.md#as-built-15-november-2026)
- **HU-002: The pier gains a shared 2.5 s shot of the forge casting the breaker; after a show the camera turns toward the forge for a player on foot.** On 15 November you moved the casting to the boiler fit, "with no camera cut"; the pier cut that is still in code (pier-view.ts) now only shows a breaker already cast, so the row's wording is out of date. Fix: **change: keep the turn toward the forge; the pier's cut shows the breaker waiting, not being cast**. *Source:* [decisions-core-loop.md#d-2026-11-15-works-flow](../decisions-core-loop.md#d-2026-11-15-works-flow)
- **HU-007: A returning player gets the act as the first line of the Welcome back card; a first-visit late joiner sees the current act at landing.** Your 11 November acts entry says it ("a returning player gets the act as the first line of the Welcome back card instead; two full-screen moments never stack"), and your later answer that day ("keep it a bit mysterious") already covers the Welcome back line. Fix: **confirm and move to the archive (already answered)**. *Source:* [decisions-controls.md#d-2026-11-11-the-game-has-acts](../decisions-controls.md#d-2026-11-11-the-game-has-acts)
- **HU-018: The switch cinematic's camera can be clipped by trees on the way in.** The summit switch it describes is gone: on 15 November the switch moved to the sea gate and Q4 got its own camera shot of the jamb. Any clipping in the new shot is a fresh bug, not this call. Fix: **revert (retire: out of date)**. *Source:* [decisions-core-loop.md#d-2026-11-15-fly-first](../decisions-core-loop.md#d-2026-11-15-fly-first) · [decisions-controls.md#d-2026-11-15-q4-gets-a-camera-shot](../decisions-controls.md#d-2026-11-15-q4-gets-a-camera-shot)

### Bulk (10, confirm)

The 30-minute return window and train-to-halt return, act-card presentation, predicted shared moments for the actor, the moment banner, the world-reset name card and what a reset forgets, and draft wording staying live until you edit it. IDs: HU-003, HU-004, HU-006, HU-008, HU-010, HU-011, HU-013, HU-014, HU-015, HU-016.

## Architecture, tools and prototype lifecycle

### Decide

1. **AT-005: The Pause → More → Jump in list is deleted only after you have fast-forwarded a room yourself; `?from=` keeps working, unlisted.** Recommend **confirm**. You said you are "not a fan of the jump-in rooms as separate rooms"; keeping the list until you have used fast-forward yourself is the agents' guess at when you are ready to lose it, and only you can say whether that is now. *Source:* [owner-calls.md#one-room](../agents/owner-calls.md#one-room) · [room-fast-forward.md](../plans/room-fast-forward.md)

### Flags

- **AT-003: A room fast-forward replaces the world with a stage's seed; everyone lands at the stage's spot once; wardrobe finds stay; the shared island refused until you answer question 1.** On 13 November you dropped the wardrobe rule ("wardrobe fine stay doesn't need to be a rule") and answered question 1: the dev key holder may replace any room, the shared island included, behind the typed name, countdown and backup. Fix: **change: confirm, minus "wardrobe finds stay", with question 1 answered**. *Source:* [owner-calls.md#one-room](../agents/owner-calls.md#one-room) · [room-fast-forward.md#owner-questions](../plans/room-fast-forward.md#owner-questions)
- **AT-010: Riders, the wallet, households and source steps are integers in the server sim; a `?proto=trade` prototype runs the same rules unsaved.** The town economy shipped straight into the live game (#1927–#1935) and no trade prototype exists in src; your 15 November answer prefers testing in the main game. Fix: **change: confirm the integer counts; drop the `?proto=trade` prototype**. *Source:* [direction.md#now-next-later](../direction.md#now-next-later) · [decisions-core-loop.md#d-2026-11-15-grant-queue-answered](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered)
- **AT-015: The loop graph records the kiln's cue as prompt-only and reports no cue, because the gold ghost was only proposed.** On 16 November you made the dashed gold outline the game's sign for "a part goes here", so the reason is out of date; the tool still reports only what the code shows. Fix: **change: confirm reading cues from the code; the gold ghost is now decided**. *Source:* [decisions-look.md#d-2026-11-16-gold-outline-not-physical](../decisions-look.md#d-2026-11-16-gold-outline-not-physical)
- **AT-031: Worktree cleanup kept three with uncommitted changes and four under 48 hours old.** Your 13 November worktree rule removes unmerged worktrees "without waiting 48 hours", tagging uncommitted work first; this was a one-off from 9 November. Fix: **revert (retire: superseded)**. *Source:* [owner-calls.md#worktrees](../agents/owner-calls.md#worktrees)
- **AT-034: No jump-in rows yet for the town, the curio shelf or the Q5 rim wait; add them when those jobs land.** The town rows exist (Timber home, Fares paid, Ready to build, House built in src/world/railway-jump.ts); under "One live game", later stages go in as fast-forward stages, not new jump-in rooms. Fix: **revert (retire: done)**. *Source:* [railway-jump.ts](../../src/world/railway-jump.ts) · [owner-calls.md#one-room](../agents/owner-calls.md#one-room)
- **AT-050: The town's wood and stone growth waits for cargo in slice 5, not railway milestones; T6 ships the workshop and camps waking.** You answered on 12 November that "deliveries stake the plots", and the slice 5 freight is built. Fix: **confirm and move to the archive (already answered)**. *Source:* [decisions-rewards.md#d-2026-11-12-town-economy-answered](../decisions-rewards.md#d-2026-11-12-town-economy-answered)
- **AT-070: The Roundhouse stall is 4 × 9 m, smaller than the plan's 7 × 14 m, with bent roads.** On 14 November you said it "feels a little cramped" and "the train barely fits", and asked for a real rotunda, bigger, reusable across the hubs. Fix: **revert (superseded)**. *Source:* [owner-calls.md#the-roundhouse-is-a-real-rotunda](../agents/owner-calls.md#the-roundhouse-is-a-real-rotunda)
- **AT-073: The Sickle Isles backdrop is pale flat-shaded greybox, one draw call, not walkable.** You decided it on 8 November: "backdrop for now is fine"; areas became walkable as they were built, as that entry says. Fix: **confirm and move to the archive (already answered)**. *Source:* [decisions-process.md#d-2026-11-08-the-sickle-isles-map-as-a](../decisions-process.md#d-2026-11-08-the-sickle-isles-map-as-a)

### Bulk (58, confirm)

Server seats and The Boogler's replication, fast-forward wording and list, the trade numbers' one home, the review-path trim, the loop graph and trace tooling (measurements, weights, supply fallbacks, beat lists), the headless-run retirement, worktree tags, jump-in tooling defaults (kept while the list exists; AT-005 decides when it goes), and the Place-retirement ports as built (telescope, buoys, residents, station boxes, secrets, crystals, the museum, town facts and sign, the shop, camps waking, the forge rack, the parked track layer, the depot cart retiring). IDs: AT-001, AT-002, AT-004, AT-007, AT-008, AT-009, AT-012, AT-013, AT-014, AT-016, AT-017, AT-018, AT-019, AT-020, AT-021, AT-022, AT-023, AT-027, AT-028, AT-029, AT-030, AT-032, AT-033, AT-035, AT-036, AT-037, AT-038, AT-039, AT-040, AT-041, AT-042, AT-043, AT-044, AT-045, AT-046, AT-047, AT-048, AT-051, AT-053, AT-054, AT-055, AT-056, AT-057, AT-058, AT-059, AT-060, AT-061, AT-062, AT-063, AT-064, AT-065, AT-066, AT-067, AT-068, AT-069, AT-071, AT-072, AT-074.
