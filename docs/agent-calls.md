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
| 2026-11-09 | New: the glider's code leaves `main` with D1. It's deferred, not cut: D1 tags its parent `archive/place`, pushes the tag, keeps the tuning as a "Deferred: the glider" note, and the movement slice restores it | [place-retirement](plans/place-retirement.md#design-review-designer-2026-11-09), owner Q5, D1 | designer | "Then delete proto place" and no legacy code; the archive tag follows the prototype-lifecycle call (`archive/moves` precedent); the owner wants it later, not gone | open |
| 2026-11-09 | New: the town's wood and stone growth rows wait for cargo in slice 5, not railway milestones. T6 ships the workshop and the camps waking | [place-retirement](plans/place-retirement.md#design-review-designer-2026-11-09), owner Q1, T6 | designer | The owner put town growth with slice 5 (7 Nov); Place's rows were cargo-built; DESIGN: towns grow from what arrives. T6a as written is the switch | open |
| 2026-11-09 | New: crystals are personal (seven spots, magnet and chime, shelf row); they get a distinct name or look when pillar crystals come | [place-retirement](plans/place-retirement.md#design-review-designer-2026-11-09), owner Q2, K1 | designer | They do nothing yet; personal keeps each discovery and needs no `WORLD_NS` bump or J3 overlap | open |
| 2026-11-09 | New: station boxes for T3 and Q1–Q6, personal, each player rolling their own | [place-retirement](plans/place-retirement.md#design-review-designer-2026-11-09), owner Q3, C1 | designer | "Rewards should be maximal"; the Design Table's boxes with rarity; cosmetic-rarity: each friend gets their own result from shared work (Grant asked, 3 Nov) | open |
| 2026-11-09 | The playtest flag (M or d-pad right) shows as "Flag" in every player's controls guide | place-retirement A1 | designer | Call-first feedback: flag moments without typing. Revisit if visitors find it confusing | open |
| 2026-11-09 | Camps wake with their lines (camp 0 at path, camp 1 at Q3), with fireworks and chimney smoke | place-retirement T6 | designer | Driven by what you connect, not by cargo | open |
| 2026-11-09 | A growth show plays on first sight of a fact; it snaps on load | place-retirement T6 | designer | Place's rule | open |
| 2026-11-09 | The two glide-only secrets wait at the finders' bay from trains on, and return to the world with the glider | place-retirement F2 | designer | No glider in production | open |
| 2026-11-09 | Missed prizes wait at the finders' bay; open either box and the other goes | place-retirement F2 | designer | Place's rule | open |
| 2026-11-09 | Each secret grants a cosmetic only it gives; hook and jump secrets use production's abilities | place-retirement F2 | designer | Place's rule; DESIGN 6 | open |
| 2026-11-09 | Gold finds are personal, with the pinned finds board | place-retirement F1 | designer | DESIGN 6, personal finds | open |
| 2026-11-09 | Late joiners and reloads find an unopened station box for every completion already reached | place-retirement C1 | designer | Same spirit as 4 Nov "later visitors included" | open |
| 2026-11-09 | A station box opens when you walk into it (1.25 m), is saved before the reveal, and its reveal joins the reward queue | place-retirement C1 | designer | Place's rule plus the audit's mid-reveal fix | open |
| 2026-11-09 | Box odds and pity come from Place's catalog (a Wonder by the third box) | place-retirement C1 | designer | cosmetic-rarity recs 1–2 | open |
| 2026-11-09 | The museum's table is 1:120 of the live railway, drawn within 34 m | place-retirement T3 | designer | town-interiors: the museum is shared spectacle | open |
| 2026-11-09 | Production keeps Sleeves at the shore instead of Place's shore worker; `SHORE_ASK` stays in `town-lines.ts` | place-retirement T2 | designer | The 8 Nov greeter replaces him | open |
| 2026-11-09 | Residents hold their tongue while a reward reveal or a conversation is up | place-retirement T2 | designer | Keeps reveals readable | open |
| 2026-11-09 | Each resident notices the newest town fact once per player; rumours rotate; memory is personal and cleared by a world bump | place-retirement T2 | designer | Place's rule; DESIGN 6 | open |
| 2026-11-09 | Town sign population: 12, +8 at path, +6 at Far Head, +6 at the pier | place-retirement T1 | designer | Place's numbers; production gains the Far Head and pier steps | open |
| 2026-11-09 | Town facts: path = T3, forge = forge lit, depot = Q1, head = Q5, trains = trains on, pier = Q6 | place-retirement T1 | designer | The nearest production milestones to Place's facts | open |
| 2026-11-09 | The house stands from the start; its furniture follows the town facts | place-retirement T1 | designer | Place's rule | open |
| 2026-11-09 | Shop and museum rise on the shared first-path fact (T3 done); until then their stake boards show the town's words | place-retirement T1, T3, T5 | designer | Place's rule; shared, so co-op sees one town | open |
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
