# Ideas

A parking lot for things to flesh out later. Not a task list: nothing here is planned or promised. One line each, `- idea, why it's interesting (YYYY-MM-DD)`, under a loose heading. Delete freely (git keeps them). An idea worth real thought becomes a doc in [proposals/](proposals/); one we commit to goes in [PLAN.md](../PLAN.md).

## Ball

## Island

## The Boogler

## Trains
- A side-on camera while seated on the train, the island sliding by; sitting itself is now decided (boogle-2.md), but the bench variant's camera was cut (owner, 2026-11-02)

## Multiplayer
- Races with the RC carts, since the soapbox turned out fun to drive (owner, 2026-11-01)

## Controls
- Camera distance as a setting in the pause menu, beside the volume slider, instead of a dedicated control (owner, 2026-11-02)
- Bring back a hotbar, only if a real gameplay element demands it (owner, 2026-11-02; cut in favour of one thing in your hands)

## Tooling
- [x] **Playtest data that reaches us** (owner, 2 November, after the two-player round 3 test: "build infrastructure to get the most data out of future playtests"). Built: any `?proto=` page uploads on its own and `npm run playtest` reads it, every player in a room together ([telemetry-and-updates.md](game-design/telemetry-and-updates.md)). Still open: survey answers linked to the session.
- Agent-driven exploratory playtesting, after [ramenvr/autopilot](https://github.com/ramenvr/autopilot) (Unreal/Unity/Godot only, no web support): an agent reads the source and writes a bot from a prompt, with legal options, facts, a plan with stall detection and an effect check per action. Borrow that structure on top of `dev/look/playthrough.ts` if the playthrough bot starts missing real bugs (softlocks, confusing routes). A real integration needs a browser plugin, a Python adapter and the hosted decision model Jev (pricing not found), so it's only worth a spike to test whether it finds a bug in the round that the playthrough bot misses; if tried, set `AUTOPILOT_SHARE=0` (2026-11-03)
