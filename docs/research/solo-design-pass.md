# Solo design pass: twelve small choices

_Research report, 5 November 2026. Proposals from the owner's 4 November solo iPhone run, checked against checkout `65f7b6a4` and live primary sources. Documentation only; no game changes or new playtest._

**Recommendation:** make the existing relationships visible before adding systems. Separate finds from keys, show what construction is waiting for, and make boarding and rewards easy to read. Change the great-tree order explicitly; account for every regenerated resource.

**Authority and limits.** The [solo notes](../plans/round-4-notes.md#solo-play-4-november-owner-on-iphone-not-yet-triaged) and [5 November decision](../proposals/boogle-2.md#the-shape-of-the-game) govern this pass. Money and cart-first wait for the replay. Seats, forge interior and ability distribution are the owner's “soon” work; their designs below remain proposals. The proper-axe requirement for the great tree is not yet decided. The [latest playtest](../playtests.md#2026-11-04-owner-solo-on-iphone-the-default-url) explicitly says this was not the two-player replay. [Direction](../direction.md)'s older “nothing has been played since” line is stale; it does not override that record.

**Evidence:** **[C]** inspected code/plan; **[V]** fetched primary text; **[S]** indexed primary text where opening failed; **[H]** Boogle proposal, including every suggested timing. No reference game or talk video was played/watched. Harsco's PDF text was read; its image fetch timed out. Not tested on a device. Format follows [crystals-and-wonder](crystals-and-wonder.md) and [beautiful-corner-craft](beautiful-corner-craft.md), not their older progression assumptions. These recommendations serve [DESIGN](../../DESIGN.md)'s **Telegraph everything**, **Show, don't tell**, **Slapstick over precision**, **Designed for drop-in, drop-out**, and **Leave something for the next visitor**.

## 1. Give yellow finds and blue crystals different jobs and shapes

**Problem / today [C].** They look like two crystal currencies. In [`props.ts`](../../src/proto/place/props.ts), yellow octahedra disappear with particles, sound and a discovery counter; they award **no money**. [`crystals.ts`](../../src/proto/place/crystals.ts) has seven blue specimens that fill a personal shelf display and otherwise do nothing. Neither opens gates: [`tech.ts`](../../src/proto/place/tech.ts) uses a lever for the quarry and the summit device for the sea gate.

**Reference [V].** Luigi's Mansion 2 explicitly separates treasure, collectible gems and door keys, with a gem collection in E. Gadd's Vault ([Nintendo manual, sections 10 and 16](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_3ds_2/luigi_s_mansion_1/ElectronicManual_Nintendo3DS_LuigisMansion2_EN.pdf)). The useful lesson is separate purposes, not another currency.

**Options [H].** A: yellow becomes a stamped brass trail find with a personal display; blue remains a rare specimen. B: merge yellow into the blue collection, simplifying the vocabulary but losing frequent small finds. C: make blue gate fuel, adding a collection requirement and undermining optional discovery.

**Recommend A; smallest build.** Change yellow's silhouette to a flat embossed trinket, give its existing found IDs a small display beside the crystal row, and use distinct pickup sounds. Keep blue's liked magnet/chime. Show the gate's chain or illuminated conduit without crystal sockets. No exchange rate, spending or all-finds requirement; that stays outside this pass.

**Tap:** Separate trail trinkets and blue specimens? **A — yes (recommended)** / B — one collection / C — gate fuel.

## 2. Make the boiler's destination look unfinished

**Problem / today [C].** The old train already reads as complete. [`run.ts`](../../src/proto/place/run.ts) makes the boiler available after Far Head; [`props.ts`](../../src/proto/place/props.ts) puts it beside the forge. [`verbs.ts`](../../src/proto/place/verbs.ts) offers “Fit the boiler” only near the first train while carrying it. The directional line in [`objective.ts`](../../src/proto/place/objective.ts) is telemetry, not visible guidance.

**Reference [V].** Tears of the Kingdom's developers made magical devices resemble understandable appliances and used visible glue for connections ([Nintendo interview, part 4](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-4/)). Recognizable function can explain an unusual object.

**Options [H].** A: an empty boiler saddle and matching mounting bands. B: a destination sign beside the forge. C: a camera cut from boiler to train.

**Recommend A; smallest build.** In [`look-kit.ts`](../../src/proto/place/look-kit.ts)/[`rail.ts`](../../src/proto/place/rail.ts), hide the dormant engine's boiler mass and expose two unmistakable curved saddles; preserve its frame/wheels. Give the carried boiler the same band spacing. On fitting, visibly seat that part before the existing wake in [`cargo.ts`](../../src/proto/place/cargo.ts). Verify the silhouette from the earlier camp visit and the final approach; do not alter protected dialogue.

**Tap:** Show the missing boiler in the old train? **A — matching empty saddle (recommended)** / B — sign / C — camera cut.

## 3. Show the switch gate blocking the future railway

**Problem / today [C].** It is not directly in front of the parked machine. [`tech-layout.ts`](../../src/proto/place/tech-layout.ts)'s quarry slab sits at line distance 186, on the future track bed; [`run.ts`](../../src/proto/place/run.ts)'s `gateWaits` prevents the corresponding station job. A chain already connects the lever mechanism. The missing information is the route between these objects.

**Reference [V].** Astroneer's rail posts visibly chain into a route, and junction controls correspond to its branches ([Rails Update](https://blog.astroneer.space/p/rails-update/)). Boogle can borrow route continuity without importing its wiring system.

**Options [H].** A: prepared formation and paired alignment stakes continue through the gate. B: move the slab beside the machine. C: put a lock icon on the station bill.

**Recommend A; smallest build.** Add a short strip of graded earth and two paired stakes on each side of the existing slab, aligned from `GATES.quarry` and the authored line. Keep it visibly unfinished: no usable rails appearing before delivery. Frame the chain, gate and continuation together from the receiver. Open it without changing station costs or the lever's reach.

**Tap:** Explain the gate with the route beyond it? **A — formation and stakes (recommended)** / B — move gate / C — bill icon.

## 4. Explain final rails and the existing forge whistle

**Problem / today [C].** The owner returned to the forge and used the whistle twice without understanding it. [`depot.ts`](../../src/proto/place/depot.ts)'s `automaticRails` supplies Q4/Q5 while the depot is unlocked and trains are not. `railsOwed` subtracts rack, pending and cart rails. In [`pair.ts`](../../src/proto/place/pair.ts), the whistle is available within 5 m of the forge turntable; `callCart` recalls even an outbound loaded cart **to the forge**, overriding its automatic trip. There, “Load the cart” appears when loading is possible. It is not a summon-to-player command.

**Reference [V].** Astroneer can call a train to a rail post and automate station loading ([developer release notes](https://blog.astroneer.space/p/rails-update/)). Its call destination belongs to an identifiable piece of infrastructure.

**Options [H].** A: clarify the existing forge recall and frontier deliveries. B: add a call point at every frontier, changing routing. C: remove recall, leaving automatic service only.

**Recommend A; smallest build.** Label the existing action “Call cart to forge”; place it on a physical bell at its current target. Show an arriving-cart cue at the forge and visible rails on the cart/rack at Q4/Q5. A small rack state can distinguish “rails coming” from empty/no shipment. Keep recall, manual loading, riding, costs and capacities unchanged. Check Q4 automatic arrival, Q5's second load, and a recall during delivery. This repairs comprehension before replay; it does not bring cart-first forward.

**Tap:** Clarify the current service first? **A — forge recall and delivery cues (recommended)** / B — frontier calls / C — automatic only.

## 5. Make the track layer catchable, then give it its own machine shape

**Problem / today [C].** It pulls away before boarding is comfortable. [`run.ts`](../../src/proto/place/run.ts)'s `stepLay` immediately advances at `laySpeedOf`; [`rail.ts`](../../src/proto/place/rail.ts)'s `buildMachine` uses locomotive/flatbed platforms and the kit or wagon look. Its work and transport silhouettes overlap.

**References [V].** Astroneer distinguishes storage cars from faster seated engines ([Rails Update](https://blog.astroneer.space/p/rails-update/)). Real construction equipment offers stronger shapes:

| Machine | Verified mechanism | Boogle art lesson [H] |
| --- | --- | --- |
| [Plasser ConstructionLiner / SVM 1000 lineage](https://technology.plassertheurer.com/en/gleisumbau/ablauf-streckenneubau) | Front crawler gear works on prepared bed; gantries feed sleepers; guides place rails behind the working unit. | Low crawler nose, high open gantry, visible sleeper magazine and laying mouth. |
| [Harsco NTC, manufacturer brochure](https://harscorail.com/wp-content/uploads/2024/12/4339-NTC-4page.pdf) | A laying beam carries rail-guide rollers; a track-type loader is the recommended tow tractor. Locomotive towing is a transport mode. | An open truss and feeder read as construction equipment without a steam-engine body. |

These are track-construction systems, not passenger locomotives. They require prepared formation; neither source establishes Boogle's fictional ability to build its own gorge supports.

**Options [H].** A: slow initial movement plus a broad boarding lip. B: wait for an explicit departure button. C: permanently reduce laying speed.

**Recommend A; smallest build.** Try a 2-second ramp to the existing speed and a broad, contrasting rear footboard whose collider matches its visible top. Keep standing access and put fixed seats inboard (topic 6). First prove boarding after the last deposit without sprinting; do not lengthen every metre. In the later art pass, make one compact open-gantry model in [`place-kit.py`](../../assets/src/place-kit.py), with work parts ahead and the safe rider deck behind. Preserve the accepted material-to-track action; machinery proportions, not real-world speeds, are the reference.

**Tap:** Ease departure and expose a safe boarding lip? **A — yes (recommended)** / B — departure button / C — slower throughout.

## 6. Snap sitting to a few proper places

**Owner approval, 5 November:** Option A is approved for fixed train seats, then the track layer only if its deck has safe space; station benches coordinate with `solo-clips-looks`. Movement stays Owner-driven and contested seats must be exclusive.

**Problem / today [C].** Sitting works, but positions and pose feel improvised. [`seat.ts`](../../src/proto/place/seat.ts) holds the player's current deck-local point, clamps it inboard and drives the existing seated clip; Interact or Jump stands up. [`verbs.ts`](../../src/proto/place/verbs.ts) supplies Sit/Stand prompts. There is no authored seat selection.

**Reference [S].** Sea of Thieves added prompted sitting at particular ship/world locations with a view camera ([Rare's 2.4.0 notes](https://www.seaofthieves.com/release-notes/2.4.0); indexed text read, direct fetch returned 403). This supports chosen places to enjoy a view, not a claim about Rare's animation implementation.

**Options [H].** A: authored seat anchors with one simple pose. B: keep sitting anywhere and improve the pose. C: full approach, turn, sit and inverse-kinematics transitions.

**Recommend A; smallest build.** Two visible sitting places on one train, then the track layer's protected deck. Interact snaps position/facing to a reachable vacant anchor in the existing platform frame; Jump/Interact exits to a safe adjacent point. Keep Stand available while seated. Use one supported torso, bent-knee pose with hands resting; inspect Buddy and hats in the asset stage under [Start animation simple](../agents/owner-calls.md#owners-standing-calls). Keep the established Owner movement authority; simultaneous seat selection must resolve overlap before co-op delivery is claimed. No new animation system is needed for the first comparison.

**Tap:** Start with fixed places and one pose? **A — yes (recommended)** / B — anywhere / C — full transitions.

## 7. Let the finished forge become a place to enter

**Owner approval, 5 November:** Option A is approved as a free completion reward with one doorway, safe floor, guarded furnace and rack-facing seat. Preserve production, pickup and freight paths; verify entry, exit, cutaways and two-player passage.

**Problem / today [C].** Finishing a liked building should reward being there. [`forge.ts`](../../src/proto/place/forge.ts) builds frame/walls by hand, adds its roof from freight and improves rail output; wall collision closes its shell. [`rooms.ts`](../../src/proto/place/rooms.ts) already provides enterable town rooms and camera cutaways, but the forge is separate.

**Reference [V].** Stardew Valley 1.6 makes the restored Community Center fish tank usable ([developer changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/)). A completed structure can become an amenity, not merely a checked bill.

**Options [H].** A: a small walk-in workshop after the roof finishes. B: an open viewing bay only. C: a new indoor crafting game.

**Recommend A; smallest build.** One doorway, safe floor, existing furnace visible behind a barrier, and a seat facing the output rack. Reuse the town cutaway behavior where practical; keep freight paths outside the walking space. Completion opens the doorway without another payment. Preserve the external rail pickup and production rates. Prove entry, exit, roof occlusion and two players passing before furnishing more rooms.

**Tap:** Make completion open a tiny workshop? **A — walk-in reward (recommended)** / B — viewing bay / C — crafting game.

## 8. Spread abilities by meaningful uses, not elapsed timers

**Problem / today [C].** Tonight's owner-supplied acquisition times are **jump 7:06, hook 15:05, glider 17:57**: gaps of **7:59** and **2:52**. These are one session's observations, not target averages. [`tech-layout.ts`](../../src/proto/place/tech-layout.ts) places jump at the first-line pillar, hook at the second-line pillar and glider at Needle Bell's summit. [`tech.ts`](../../src/proto/place/tech.ts) couples the summit pickup to the sea gate. The notes also flag an automatic demonstration jump and overlapping glider/island reveals.

**Reference [V].** A Short Hike's creator designed for players taking the opposite of the obvious route while retaining good pacing ([developer retrospective](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)). Time spacing must tolerate exploration.

**Options [H].** A: retain early jump/hook access, separate glider from the hook's immediate tower reward. B: keep placements and add optional practice. C: enforce minimum minutes between unlocks.

**Recommend A as the next pacing comparison; smallest build.** Keep jump near its present beat; let the player discover the second press. Keep hook near its present beat and give it a short return shortcut during ordinary work. Let the tower summit switch open the sea gate independently, then put glider on the safely walkable far-side landing reached by the next construction beat. Give it an immediate glide home and sequence its reveal before the far-island reveal. This edits `DEVICES`, gate/pickup coupling and affected secret/return routes together. Try **roughly 21–24 minutes** for glider only as a diagnostic range; never stall the player to hit it. Late joiners still inherit shared abilities.

**Tap:** Put a construction beat between hook and glider? **A — yes (recommended)** / B — optional practice only / C — timed unlocks.

## 9. Move the proper axe before the great tree, without shortening Station 3's ordinary work

**Problem / today [C].** [`layout.ts`](../../src/proto/place/layout.ts) requires **40 logs and one beam at T3**. [`chop.ts`](../../src/proto/place/chop.ts) permits the great tree's starter-axe strokes; [`run.ts`](../../src/proto/place/run.ts)/[`ladder.ts`](../../src/proto/place/ladder.ts) grant the proper-axe chest only after T3 opens the path. Merely adding an axe check would deadlock that route. The newer owner call already forbids early felling/shouldering until T3 needs it.

**Reference [V].** Minecraft's axe progression improves harvesting speed ([Mojang's axe article](https://www.minecraft.net/en-us/article/taking-inventory--axe)). That makes the ordinary-log economy relevant even when the proposed new requirement concerns only one special tree. A stronger-looking tree is not enough to fix reward order.

**Options [H].** A: grant the proper axe at T3 after its 40 ordinary logs are stocked, before its beam. B: grant it after T2, accelerating all T3 logging. C: keep the axe reward after T3 and replace T3's beam requirement, moving the great-tree job later.

**Recommend A; smallest build.** Put the existing axe chest on a clearly visible stand beside T3; it opens when the log portion is complete. Then require T3 active **and** proper axe for felling, and T3 still needing the beam for shouldering. Remove the old post-T3 grant, retain shared acquisition and skip this reward for already-upgraded saves. Give the tree broad buttress roots, a split crown and pale ridged bark; starter contact rebounds truthfully. Preserve 40 logs, one beam and the existing great-tree effort initially. This changes the axe's reward moment, so record the owner's choice before implementation; the path opening remains the main T3 payoff.

**Tap:** Earn the axe after stocking T3's ordinary logs? **A — yes (recommended)** / B — after T2 / C — move the beam job later.

## 10. Make the four small moments readable at approach distance

**Problem / today [C].** Tower rewards become visible too late; the axe is easy to miss; hangers do not explain swapping; filling the back needs a little response. [`tech-layout.ts`](../../src/proto/place/tech-layout.ts) owns secret placements; [`ladder.ts`](../../src/proto/place/ladder.ts) owns the axe chest. [`gifts.ts`](../../src/proto/place/gifts.ts)'s `swapSlot` cycles owned items and then empty, while [`verbs.ts`](../../src/proto/place/verbs.ts) says “Swap [slot]”. [`chop.ts`](../../src/proto/place/chop.ts) updates the carried view.

**Reference [V].** A Short Hike rewards off-route curiosity; Nintendo's TotK interview stresses recognition at a glance ([A Short Hike](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/), [Nintendo](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-4/)). Discovery should hide the route or surprise, not every reason to investigate.

**Options [H].** A: fix composition and immediate feedback. B: add labels to all rewards. C: global reward markers.

**Recommend A; smallest build.** Raise/offset each tower chest so its lid is visible from the preceding hook platform, keeping the landing clear. Put the axe on the approach-facing stand from topic 9 (or improve its existing chest if that choice is declined). Highlight the exact hanger and preview the next item's name, including “Take off”; keep swapping local and free. Pulse only the newly filled carried-log slot from **1 → 1.12 → 1 over 0.16 s**, never the avatar or collider; reduced motion keeps the sound/count change. First inspect one example of each from ordinary touch-camera views, not an overhead shot.

**Tap:** Prefer physical visibility and small feedback? **A — yes (recommended)** / B — labels everywhere / C — markers.

## 11. Recover drops and regrow trees with explicit resource accounting

**Problem / today [C].** Nobody may become permanently unable to finish. [`drop.ts`](../../src/proto/place/drop.ts) saves personal piles indefinitely; current Place trees do not regrow. Production slice 1 is different: [`railway-layout.ts`](../../src/sim/railway-layout.ts) pins finite sources, and [`railCounts`](../../src/sim/railway.ts) conserves their supply. [Production core's transaction contract](../plans/production-core.md#transaction-contract-every-unit-has-one-home) also preserves departed players' raw cargo and explicitly forbids quietly minting replacements. The 5 November call authorizes the desired recovery/regrowth behavior, but does not specify its accounting.

**Reference [V].** Minecraft's renewable saplings prevent ever-longer wood trips ([Mojang's sapling article](https://www.minecraft.net/en-us/article/taking-inventory--sapling)). Boogle should make renewal automatic rather than require planting as another chore. This source does not establish Boogle's timers or conservation model.

**Options [H].** A: finite supply, with abandoned material moved into accessible recovery racks; insufficient for all stock hoarded in persistent accounts. B: recover drops **and** explicitly account for renewable source production. C: delete drops and reset trees without a ledger; reject because it conceals loss/duplication.

**Recommend B; smallest build is an accounting proof before a visual timer.** Keep source positions fixed; allow new, bounded harvest generations. Amend production-core before integration: fixed catalog no longer means fixed lifetime output. A regrowth event adds its exact integer yield to both `accepted production` and `unharvested`; harvesting transfers it once. Rendering a tree never creates stock. Keep the existing equation:

`initial supply + accepted production = unharvested + loose + carried + stock + allocation + embodied/used + cargo + rack`

Make a timed-out drop disappear from the ground by atomically transferring it to a safe recovery rack, retaining its material and ownership entitlement; prototype personal piles cannot silently become communal gifts. If storage is full, retain the pile. Use a proposed **20-minute abandonment timer**, suspended while anyone is nearby; inaccessible drops recover promptly. Unique beam/boiler recovery relocates the same unconsumed claim and never duplicates an installed object.

Try ordinary-tree regrowth after **30 minutes**, only at eligible authored sites, outside every player's nearby/view region and away from finished track, buildings and routes. Preserve the great tree's completed beam state. These times need replay evidence. Do not catch up an unlimited number of generations while the room is empty.

**The lockout guarantee needs more than trees.** Keep at least one always-reachable renewable grove outside every future track exclusion. For each required material, prove remaining accessible supply or a renewable producer independent of the blocked job; rails retain their forge source. If stone can all be stranded in departed accounts, propose a bounded, deficit-triggered quarry supply through the same accepted-production ledger. Do not confiscate persistent personal cargo. If that policy is declined, finite conservation alone cannot guarantee availability. Out-of-sight delay must never be the only way to recover a currently unreachable critical item.

Prove one source generation and one pile expiry in the isolated production spine: simultaneous harvest/expiry, full rack, departure with all remaining stock, restart, duplicate events, late join and completed-track exclusions. Persist/hash generation and recovery facts through the existing railway authority. This is a proposed extension to slices 1–3, not behavior already supplied by slice 2 or an instruction to reset its catalog.

**Tap:** Keep every transfer counted, with renewable sources when supply can strand? **B — recovery plus counted renewal (recommended)** / A — finite recovery only.

## 12. Keep money and cart-first after the replay

**Problem / today [C].** Money's meaning and the cart-to-train upgrade need a focused decision, but changing them now would change the replay. [`layout.ts`](../../src/proto/place/layout.ts)'s `PAY` and [`run.ts`](../../src/proto/place/run.ts) already reward construction. Yellow finds do not pay. [`ladder.ts`](../../src/proto/place/ladder.ts) and [`depot.ts`](../../src/proto/place/depot.ts) already place the supply cart before the boiler-powered trains; the deferred “cart-first” experiment is a broader progression comparison, not proof that no cart exists today.

**Reference [V].** Astroneer gives rail cars and rail engines distinct storage/transport roles ([developer notes](https://blog.astroneer.space/p/rails-update/)). That is a useful later comparison, not authority to change this run.

**Later options [H].** After replay, compare A: current hauling/service sequence, and B: an explicitly useful early cart followed by a clearly better train on the same route. For money, compare A: a cosmetic spending role, and B: a non-spendable record of contribution. Do not choose prices, currency identity or unlock costs in this report.

**Recommend / smallest next action:** retain these two notes in the [round-4 tracker](../plans/round-4-notes.md) and reopen only after the owner and Grant replay. Topic 4's comprehension fix remains separate. **No tap needed: deferral is already decided.**

## Order and stop

Before replay, favor existing-behavior clarity (1–5 and 10), with topic 9's reward-order choice explicit. Topics 6–8 are bounded “soon” comparisons; 11 needs the production-plan accounting amendment before promotion. The machine art follows the owner's art-pass timing. Do not bundle all twelve into an implementation approval. Builders verify their changed approach, action and return, then stop at the owner's replay; this report establishes no fun or visual acceptance.
