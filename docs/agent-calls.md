# Calls made without the owner

Owner, 9 November 2026: "In general I'm OK with the model picking defaults or recommendations without my input, as long
as it's logged so we can revisit them." Agents may pick a default or take their own recommendation and keep building;
every such call is logged here, newest first, so the owner can revisit it. A call the owner confirms or changes moves to
[decisions.md](decisions.md) and its row here is marked.

Ask the owner first only for direction or unapproved scope, anything irreversible or outward-facing, and a `WORLD_NS`
bump while they're mid-session ([owner calls](agents/owner-calls.md)).

**Status:** `open` (not yet seen by the owner), `confirmed`, `changed` (link the decision), `reverted`.

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-09 | Leave the pine growing inside the Split-rock Works bowl for J4, rather than moving world trees now | `src/entities/railway/works-view.ts`; [plan](plans/split-rock-roundhouse.md) | orchestrator | It's a world tree that may be a choppable source; moving it changes the log economy | open |
| 2026-11-09 | The Roundhouse stall is 4 × 9 m, smaller than the plan's 7 × 14 m, with bent roads | J2, #1226 | J2 builder | It fits the ground beside the turntable without crossing a path | open |
| 2026-11-09 | The forge rack draws up to the largest rail bill (32), not 16 | #1224 | orchestrator | Q6 needs 32; showing 16 hid half of it | open |
| 2026-11-09 | Q6's parked track layer stays on the line's last metres at Far Head; players hop its low deck to reach the pier | J5 bot, #1229 | job D | Moving the park point changes the laying route; noted for the playtest | open |
| 2026-11-08 | The Sickle Isles backdrop is pale, flat-shaded greybox, one draw call, not walkable | #1223 | backdrop job | The phone budget (+6 draws, +40k triangles) and "backdrop for now is fine" | open |
| 2026-11-08 | B5–B8: no pier banner; a running train answers a call at its next stop; no express run with a rider aboard; the boiler returns to its pedestal when its holder leaves; trains earn no away credit | [B5–B8 plan](plans/line2-b5-b8.md), #1216 | B5–B8 plan | Smallest rules that keep conservation and the bot simple | open |
| 2026-11-08 | Once trains run, the depot cart retires | #1221 | job B | Trains bring Q6's kit; two vehicles on line 1's track collide | open |
| 2026-11-08 | Sleeves the greeter's 15 lines | `src/entities/railway/greeter.ts` | greeter job | Goofy, points up the path, asks for help with the rail (owner's brief) | open |
| 2026-11-08 | Try a springy, lagging beam on the rope (spring-lag) | `src/player/beam-carry-tuning.ts` | owner chose "try option 1"; tuning by builder | Matches the Godot lab's feel | open |
| 2026-11-08 | Steel on the pack shows as two upright bars | pack view | builder | Reads as rails at a glance | open |
| 2026-11-08 | The switch cinematic's camera can be occluded by trees on the way in | `src/render/camera-pull-out.ts` | builder | Polish, not blocking | open |
| 2026-11-08 | Q6's station label overlaps the rack's stock sign at Far Head | Far Head | orchestrator | Polish, not blocking | open |
