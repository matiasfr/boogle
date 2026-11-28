# Ideas

A parking lot for things to flesh out later. Not a task list: nothing here is planned or promised. One line each, `- idea, why it's interesting (YYYY-MM-DD)`, under a loose heading. Delete freely (git keeps them). An idea worth real thought becomes a doc in [proposals/](proposals/); one the owner commits to becomes a row in [backlog.md](backlog.md) that turn, with his words, and its line here is deleted.

## Ball

## Rewards
- Special unlocks for finding all seven crystals (2026-11-09)

## Look
- Revisit time of day and colour grading with the new sky and AgX: the game felt a bit dull and even the stars around the player's head looked very dark, maybe material properties and emissive values on things (owner, 2026-11-03)

## Island

## The Boogler
- A post-game twist after meeting The Boogler at the ending, to scope later: "its cool when games do that" (owner, 2026-11-12; [campaign outline](plans/campaign-outline.md#7-owner-decisions) decision 3); on 26 November he called meeting The Boogler the beginning of the post-game, with different mechanics, the greybox ending a placeholder until then ([entry](decisions-core-loop.md#d-2026-11-26-ending-starts-the-post-game))

## Trains
- Rail network depth: friends choose which connection next (a new source against a shortcut) and which visible bottleneck to fix, and the railway runs itself, with no signals, orders or dispatch. The owner is "curious about" it; the research asks for a ten-minute paper railway (a 2D page) before any code: [rail-network-depth](research/rail-network-depth.md#first-prototype-a-ten-minute-paper-railway) (owner, 2026-11-11)
- A side-on camera while seated on the train, the island sliding by; sitting itself is now decided (decisions.md), but the bench variant's camera was cut (owner, 2026-11-02)
- Train-riding UX pass once there are trains beyond the default cargo ones: a way to board that looks natural (a passenger car or seats, not sitting on a flat deck), and a ride that feels really satisfying over the long stretches; builds on [train-riding](research/train-riding.md) (owner, 2026-11-06)
- A world / rail map view: the Home hall's live line map and the halt boards grown to show every line, its trains and their loads, a wall you stand at rather than a screen; parked in [engine-garage](brainstorms/engine-garage.md#parked) (owner, 2026-11-10)
- A train logistics readout: each departure board shows the next train's cargo as icons and counts, the hall's line map a dot and load pip per train, no routing or timetables; parked in [engine-garage](brainstorms/engine-garage.md#parked) (owner, 2026-11-10)

## Multiplayer
- Twenty-one ideas for more fun with friends dropping in (two-person carries as comedy, proximity voice and a ping reply, arriving by train where your friends are, a welcome-back board, honks and postcards left for friends, things to do on the train, and more), each with when it fits against the backlog and the three to try first: [friends-drop-in](proposals/friends-drop-in.md). "I really like a lot of these" (owner, 2026-11-17)
- Races with the RC carts, since the soapbox turned out fun to drive (owner, 2026-11-01)
- Rooms have a host who can reset the room from the UI, like Palworld's servers: "A user can host its own server or in this case there's a dedicated server but maybe a user should be able to reset the server from UI like if they're an admin or if they're the host of a room. So maybe rooms should have hosts, but it should work in a way that accommodates for mobile, where a host may intermittently disconnect if they sign up, go to a different app, etc." So being host must survive a phone going to the background and coming back; for the future (owner, 2026-11-10)
- The room is the save: "this game feels more like there's a coherent save progress that is really about the communal room and less about individual players. And so that's a very different model than compared to like a Counter-Strike server where anyone can just drop in or drop out." Clarifies the host idea above: a room is a shared world with an owner and its people, not an open server (owner, 2026-11-10)
- How a host proves who they are: "per device or maybe a password or a simple code that I can use to sign in from anywhere?" (owner, 2026-11-10)

## Controls
- Bring back a hotbar, only if a real gameplay element demands it (owner, 2026-11-02; cut in favour of one thing in your hands)

## HUD
- Move the counters in the pause menu somewhere in the world later, diegetically (2026-11-04)
- A select screen with a map and currencies, later (2026-11-04)
- The name chip and Live pill could move into the menu; design that later (2026-11-04)

## Tooling
- More work to make the engine more like a real game engine and ease a later move to another ECS engine: "I'm also interested if there's more work that we could do to make our engine more like a real game engine and make it easier if we ever need to migrate to another ECS engine" (owner, 2026-11-12). An open interest, not a decision; a study is in progress at `docs/research/engine-portability.md` (branch `research/engine-portability`, not yet on main).
  - 13 November (owner, UTC): stronger than an open interest: number one priority; the choice of library is still his to make after the spike (see [Engine foundations first](agents/owner-calls.md)). Both studies (`engine-portability.md`, `engine-long-term.md`) are to be judged first on enforceability, the criterion in that call: one way to add state, behaviour and views, which tooling rejects when broken. "For the ranked engine work, I really want you to ignore your biases thus far and think what would be best for the engine long term, even if it's a lot of work. Like moving the lock step states into components, etc." And: "I am interested at this point in considering adopting bit ECS" (after "Why do we need integer state?"). Work in progress, not yet on main: an unanchored second study (`docs/research/engine-long-term.md`, Codex) and a bitECS store spike (branch `codex/bitecs-store-spike`, `docs/research/bitecs-store-spike.md`). [ecs-evaluation](research/ecs-evaluation.md) (6 November) chose the in-house ECS over bitECS because lockstep code could not use bitECS's history-dependent query order: a reason to re-test now that the railway is server state.
- [x] **Playtest data that reaches us** (owner, 2 November, after the two-player round 3 test: "build infrastructure to get the most data out of future playtests"). Built: any `?proto=` page uploads on its own and `npm run playtest` reads it, every player in a room together ([telemetry-and-updates.md](game-design/telemetry-and-updates.md)). Still open: survey answers linked to the session.
- Agent-driven exploratory playtesting, after [ramenvr/autopilot](https://github.com/ramenvr/autopilot) (Unreal/Unity/Godot only, no web support): an agent reads the source and writes a bot from a prompt, with legal options, facts, a plan with stall detection and an effect check per action. Borrow that structure on top of `dev/look/playthrough.ts` if the playthrough bot starts missing real bugs (softlocks, confusing routes). A real integration needs a browser plugin, a Python adapter and the hosted decision model Jev (pricing not found), so it's only worth a spike to test whether it finds a bug in the round that the playthrough bot misses; if tried, set `AUTOPILOT_SHARE=0` (2026-11-03)

- **Post looks for a later rendering pass.** Toy-only outlines (dark, 2 px) read best, then haze for distance. Before reuse: cut the roughly 6 ms cost, reduce line crawl on hat seams and roofs, and explain the white shoreline marks using frozen-frame captures. Layers are on tag `archive/post-looks-round2`; see [round two](research/post-look-round2.md).

## World and story
- The story frame: by connecting everywhere and building an economy for the simple little guys, the players are secretly doing The Boogler's work, for good (owner, 2026-11-06)
- Narrative pass per area, after the mechanics and numbers are settled: characters you meet with fun dialogue, lore for each place and how the world ties together, plus what each environment looks like; it "will really just flesh out the world" (owner, 2026-11-06)
- Visitors from the mainland: boats bring little-guy visitors to the port now and then, maybe new residents or helpers (owner, 2026-11-07)
