# Ideas

A parking lot for things to flesh out later. Not a task list: nothing here is planned or promised. One line each, `- idea, why it's interesting (YYYY-MM-DD)`, under a loose heading. Delete freely (git keeps them). An idea worth real thought becomes a doc in [proposals/](proposals/); one we commit to goes in [PLAN.md](../PLAN.md).

## Ball

## Rewards
- Special unlocks for finding all seven crystals (2026-11-09)

## Look
- Revisit time of day and colour grading with the new sky and AgX: the game felt a bit dull and even the stars around the player's head looked very dark, maybe material properties and emissive values on things (owner, 2026-11-03)

## Island

## The Boogler

## Trains
- A side-on camera while seated on the train, the island sliding by; sitting itself is now decided (decisions.md), but the bench variant's camera was cut (owner, 2026-11-02)
- Train-riding UX pass once there are trains beyond the default cargo ones: a way to board that looks natural (a passenger car or seats, not sitting on a flat deck), and a ride that feels really satisfying over the long stretches; builds on [train-riding](research/train-riding.md) (owner, 2026-11-06)

## Multiplayer
- Races with the RC carts, since the soapbox turned out fun to drive (owner, 2026-11-01)

## Controls
- Camera distance as a setting in the pause menu, beside the volume slider, instead of a dedicated control (owner, 2026-11-02)
- Bring back a hotbar, only if a real gameplay element demands it (owner, 2026-11-02; cut in favour of one thing in your hands)

## HUD
- Move the counters in the pause menu somewhere in the world later, diegetically (2026-11-04)
- A select screen with a map and currencies, later (2026-11-04)
- The name chip and Live pill could move into the menu; design that later (2026-11-04)

## Tooling
- [x] **Playtest data that reaches us** (owner, 2 November, after the two-player round 3 test: "build infrastructure to get the most data out of future playtests"). Built: any `?proto=` page uploads on its own and `npm run playtest` reads it, every player in a room together ([telemetry-and-updates.md](game-design/telemetry-and-updates.md)). Still open: survey answers linked to the session.
- Agent-driven exploratory playtesting, after [ramenvr/autopilot](https://github.com/ramenvr/autopilot) (Unreal/Unity/Godot only, no web support): an agent reads the source and writes a bot from a prompt, with legal options, facts, a plan with stall detection and an effect check per action. Borrow that structure on top of `dev/look/playthrough.ts` if the playthrough bot starts missing real bugs (softlocks, confusing routes). A real integration needs a browser plugin, a Python adapter and the hosted decision model Jev (pricing not found), so it's only worth a spike to test whether it finds a bug in the round that the playthrough bot misses; if tried, set `AUTOPILOT_SHARE=0` (2026-11-03)

- **Post looks for a later rendering pass.** Toy-only outlines (dark, 2 px) read best, then haze for distance. Before reuse: cut the roughly 6 ms cost, reduce line crawl on hat seams and roofs, and explain the white shoreline marks using frozen-frame captures. Layers are on tag `archive/post-looks-round2`; see [round two](research/post-look-round2.md).

- **A critters-and-life pass for the new environments** (owner, 6 November): fish and gulls now live on the classic island only; give the new world its own critters and life, reusing the fish (`src/features/critter-fish.ts`) and gull (`src/features/critter-gulls.ts`) code. (2026-11-06)

## World and story
- The story frame: by connecting everywhere and building an economy for the simple little guys, the players are secretly doing The Boogler's work, for good (owner, 2026-11-06)
- Narrative pass per area, after the mechanics and numbers are settled: characters you meet with fun dialogue, lore for each place and how the world ties together, plus what each environment looks like; it "will really just flesh out the world" (owner, 2026-11-06)
- Visitors from the mainland: boats bring little-guy visitors to the port now and then, maybe new residents or helpers (owner, 2026-11-07)
