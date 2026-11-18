> **Status: live (2026-11-17), first build (the shut intake); the halt yard is still station-deposit build 1.**

## Pitch

When the last useful piece goes in, the receiver should stop looking hungry, even if the work isn't finished. Keep the shipped fold; let permanent machines show what they're doing; send spares to the already-decided halt yard, not into a dead bill. This serves DESIGN [7: Telegraph everything](../../DESIGN.md#7-telegraph-everything) and [11: Show, don't tell](../../DESIGN.md#11-show-dont-tell). Solo, you can turn around with a spare before walking into dead reach; together, you can leave it where a friend can actually collect it.

## Gut question

With a load on your back, can you tell on approach what still wants it, what the crew is waiting for, and where a spare can go, without trying the old receiver first?

## Best suggestions

1. **Close the intake before folding the frame** [Design, Systems]. On the accepted last piece, turn the receiving board or show a shut intake and let the moving stock say “working”; at a full gate, show the lever or switch instead. Keep icons and exact counts while open, but distinguish a full slot from one still taking goods. A vanished bill alone can mean “not yet,” “working,” or “done.”
2. **Let the finished thing replace the receiver** [Creative, Design]. Ordinary frames still fold to clear ground, not a field of flags. Let the lit forge, fitted wagon or boiler, and built pier carry the payoff; make a retained frame, especially Q7's, look stowed rather than feedable. No reward or extra delivery.
3. **Make the halt yard look like a place to put things down** [Design, Systems, Creative]. Give it a low rack or marked stock bay with visible piles and counts, distinct from a bill's feeder and have/need board. If a confusing turn separates an old frame from a working yard, try one little fingerpost or pennant pointing there. A flag is not a drop target.

## Shape

**Fit and order.** The [14 November note](../plans/round-4-notes.md) and [pacing plan, Problem 4](../plans/level-pacing-1114.md#problem-4-the-station-boxes-once-their-build-is-done) track the same ask. D1 is [as built](../game-design/place.md) despite its unchecked plan box: T1–T3 and Q1–Q6 fold when laid and clear, not when funded; the forge and Q7 are excluded. Actual D1 leaves bare ground, not the plan's sleeper stack. [Station-deposit Build 1](station-deposit.md) is separate, decided but not built or dispatched; I found no separate broad readability row in the [backlog](../backlog.md). Recommend a bounded readability pass first, yard integration in its existing build. No playtest gate.

**Read survey** (code and as-built, not fresh visual evidence):

| Receiver | What already reads; where to look harder |
| --- | --- |
| Line 1 frames | The active bill gives icons/counts and the physical feeder shows work. `view.ts` can leave the tag up while laying. Close the receiving face at funding, even if an occupied frame can't fold after laying. |
| Line 2 frames | The active bill goes away on laying, but the frame stays up until laid. Full gated Q4/Q5 already point to the lever/switch. Q6 before trains takes nothing: its rack's train icon and loaded-arrival nudge explain why, but the frame itself has no bill. Q7 on the pier stays up after completion; check it separately. The travelling rack/shelf are pickup points, not spare sinks. |
| Forge frame | Bill switches from 24 to 32 logs, then goes away on lighting; the built forge, smoke and output strongly signal done. Check the rollover and whether any feeder still reads open; don't pack up the forge or mistake its output rack for a yard. |
| Kiln and cradle | The kiln has separate counts, missing-material ghosts and near-prompt refusal; the lit mouth replaces the bill. The cradle asks for 8 rails, switches to a turn cue on fit, then clears cues as the wagon rolls out. Use as controls. |
| Stall and pier footings | Empty sockets/ghosts and fitted structure communicate progress. The pier intentionally holds its full count before the Q7 railhead opens; check that “full, waiting for track” doesn't read as “bring more” or “done.” |
| Beam and boiler saddles | Single-purpose sockets already show what's wanted and what took its place: empty saddles and lashings become a seated beam; the boiler's dashed echo gives way to a fitted boiler and lashings. Don't imply train service starts the moment it fits. |
| Home's town plots | Train freight, not hand deposits. Piles and exact counts lead to stakes and the purchase board; the pile and bill clear on purchase. Out of scope unless a shot shows them masquerading as hand receivers. See [Trade](../game-design/trade.md). |

**First build, Local only.** Start with a Line 1 frame and the Q3 edge. Derive cues in `view.ts` and `line2-view.ts` from accepted job rows and gate/train state; reuse `stations.ts` bill/feeder and `stock-sign.ts` icon conventions. Leave `frame-pack.ts` occupancy, reload and reduced-motion behavior alone. An optimistic feed can animate but must not close the intake on an unaccepted piece. No new colliders, prompts, rules or saves. Readable without color, motion or sound, at phone size; no new particle system. `npm run inflight` listed `ship/matias-franco-152cc59` and `ship/matias-franco-afe6946`; their full changed-file lists show no overlap with these frame/view files. Recheck before building and coordinate Home placement with the separate forge-rack move.

**Yard boundary.** The [10 November owner call](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts) stands: shared stock at each halt, taken where it lies; appears when track reaches the halt, before trains; never full (strapped bundles of 8 past 24 of a kind); no Pier yard for now; trains carry it later. Keep Build 1's Sim scope and `WORLD_NS` bump. Before then, Drop works and no marker promises storage. Recommend a distinct bay; reuse the old spot only where the halt layout makes that clear. No automatic overflow or new global stock pool.

## Done means

Proposed `look` setups for the builder; inspect stills and real-time transitions, not just exit status.

- **Open → funded → laid:** `--rail-seed q3-stocked` for the edge, `--rail-seed q3-done` for a fresh view. Set up a player-height frame-side `--eval` that walks in loaded and captures the accepted last piece, working feeder and laid edge; repeat at T1 from fresh spawn. Open materials/counts read on approach; the intake looks shut as soon as it stops taking; the clear laid frame is gone. Have a friend stand on it at completion then step off: closed while still standing, nobody dropped, no repeat fold on reload. Check the closed pose in reduced motion and at phone width.
- **Waiting isn't hungry:** `--rail-seed q3-done --eval dev/look/evals/railway-gated-fill.ts --query gated=q4` for full-before-lever; then `--rail-seed q5-done --query b58at=head --eval dev/look/evals/railway-b5b8-at.ts --action dev/look/evals/railway-q6-wait.ts --video --seconds 12` for the loaded Q6 approach. The next action reads as lever or train, not another log; Q6 takes none. After Q7 lays, repeat the loaded approach along the pier to its retained frame: no active feeder or yard marker.
- **Permanent receivers as controls:** `--eval dev/look/evals/railway-forge-finish.ts` from the near-lit forge with one log left. Use `--eval dev/look/evals/railway-works-at.ts` with `--rail-seed works-stocked --query worksat=kiln` vs. `works-lit`, and `stall-done` vs. `cradle-fitted` from `worksat=stall`. Same camera before/after: missing goods read before, the machine or next action after. At `worksat=pier`, compare partially filled vs. full footings before Q7 opens; the full board doesn't solicit another footing.
- **When yard Build 1 exists:** spawn two players at the same newly reached halt before trains; a yard-side `--eval` leaves spare logs with one player and collects them with the other, then reloads. Stock and counts agree; no bill or payout changes; the yard reads differently from a closed frame. Repeat the approach solo. These shots verify cues and state, not blind discovery or fun.

## Open questions

1. **Funded but not laid:** Recommend a turned board or visibly shuttered intake on the last accepted piece, with the working feeder still visible, rather than a sign-only change. **Answer (owner, 17 Nov): as recommended.**
2. **Retained Q7 frame:** Recommend stowing its receiving face in place after laying, leaving the pier's silhouette; no flag or yard there. **Answer (owner, 17 Nov): as recommended.**
3. **Halt handoff:** Recommend a distinct yard bay and a small pointing marker only at a confusing split, after the yard works; ordinary finished sites stay bare. **Answer (owner, 17 Nov): as recommended.**

## Parked

- Try one `/codex` previz from the loaded player's approach: open intake, turned board, then finished track with the functional yard in view.
- If the last deposit and existing fold knock aren't enough, try one short local latch knock or a stubborn hinge settling. No new Boogler copy, praise line or reward.

## Appendix: Three lenses

- **Design:** (1) Show which piece still helps before I walk into reach; (2) redirect me from a closed receiver to the next action; (3) make spares a handy solo drop or co-op handoff, not a sorting chore. Reference: *Animal Crossing: New Horizons* for letting finished infrastructure replace a contribution point, not for adding a donation menu.
- **Systems:** (1) Read accepted bill/phase state, not animation timing or optimistic carry; (2) keep the tested fold and compare Q6's existing refusal as a control; (3) put stock in the agreed yard build, not a new per-frame inventory.
- **Creative:** (1) The last log lands, the board turns, the machine takes over; (2) the installed part or finished track is the trophy; (3) reserve a small marker for a real handoff, and a single knock for later polish if needed.
- **Tensions:** The fold is satisfying but too late to explain refusal, especially when occupied. A flag makes an absence legible but can become a false invitation; earn it at a real yard turn. Reusing a frame's exact spot can save steps but blurs the distinction if the same receiver looks open again. Favor the immediate state change, then the distinct yard silhouette.

## Design review (2026-11-17)

Run by the orchestrator after the owner's answers.

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| A funded frame shuts its intake on the last accepted piece while the feeder keeps working; full-but-gated points at the lever | Decided | [Owner, 17 Nov](../decisions-rail.md#d-2026-11-17-finished-deposits-read) |
| Q7's retained frame stows its intake in place; no flag or yard at the Pier | Decided | Same entry |
| The halt yard is its own bay; a small pointer only at a confusing turn; ordinary finished sites stay bare | Decided, inside the [10 November yard decision](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts) | Same entry |
| The shut look: a turned board or a shutter, readable without colour, motion or sound | Default | Brief, first build |
| The shipped fold (D1) stays as built, on "laid" | Decided earlier | [level-pacing-1114](../plans/level-pacing-1114.md), D1 |

**Findings.**

1. The first build is view-only (Local over accepted rows). The yard stays station-deposit build 1, with its own `WORLD_NS` bump, outside this build.
2. Line 1 frames and the forge's frame between its two bills are the weakest reads; prove those first with the brief's `look` setups.
3. The owner's 17 November foreshadowing call ([rewards](../decisions-rewards.md#d-2026-11-17-forge-made-rewards)) touches the same boards: a station that grants an upgrade keeps that clue through its shut state until the upgrade is claimed.

Suspect copy: none.
