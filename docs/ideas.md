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
- **Playtest data that reaches us** (owner, 2 November, after the two-player round 3 test: "build infrastructure to get the most data out of future playtests"). Today's traces stay in each player's browser ([record.ts](../src/proto/trace/record.ts), "never sent anywhere"), so nothing from that session arrived on its own. To work out: consented upload per playtest room, every player's route and heat map together, key beat times, confusion and idle spots, device and frame numbers, and survey answers linked to the session. Start from [playtest-telemetry.md](research/playtest-telemetry.md).
