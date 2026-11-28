# Lane C Part 5 — a hangout at Ring Island

**Proceeding, 28 November 2026.** The hangout moves west of the protected station terrace. The move proceeds as a New call and preserves the owner's station-house decision.

## At the halt

From the west ramp a passenger sees two blueprint boards. Walking between the boards previews either a lookout or a bellhouse in gold. Holding the existing interact action for one second spends 150 Boogles from the shared strongbox at the default tune. The first accepted choice belongs to the room. A guest arriving during the ten-second build sees its progress. A returning friend sees the finished building.

In the lookout a player walks into the ground room, climbs the exterior stair to the six-metre deck, looks through the fixed brass telescope toward the current works and can glide back to the halt. With the works finished the telescope faces High Gorge. In the bellhouse a player pulls a rope, hears the bell and sees a gold ring rise over the belfry. A friend can spot the signal from the crossing. Both activities work solo and neither pays for play. Home keeps its four priced plots. These choices serve DESIGN principles 3, 6, 7 and 8.

## Level findings

The 10 November [station decision](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not) places the Lookers' waiting room at the north-west corner. [Ring Island build 1, finding 20](ring-island-build1.md) records its terrace, the crossing and the ramp. The production ground protects a rectangle around the greybox terrace from the track cutting. It does not build the greybox's platform-height floor there.

Measured in production ring coordinates (along-track u, lateral offset, metres):

| Feature | Position or extent | Implication |
| --- | --- | --- |
| Protected ground | 467–478.5, −21 to −8.3 | Includes a one-metre margin around the station terrace. |
| Waiting room | Centre (474.18, −16.01) after converting the greybox frame; inside room 5 × 4 m, leaning walls and projecting roof | Its centre lies inside the brief's 5.4 × 4.4 m cottage when centred on the protected ground. The crossing reaches the forecourt from the east. |
| Centred cottage | (472.75, −14.65); four production terrain corners at 6.90, 7.15, 7.97 and 8.22 m | Overlaps the approved house. Corner relief is 1.32 m. A flat production terrace cannot be assumed from its name. |
| Built site | (473, −27), floor 9 m; four ground corners at 7.61–8.90 m | About 12 m from the outer ramp end (464, −18.8). A 5.3 m approach rises to the porch. The shell is 5.4 × 4.4 m. The landing and exterior stair are on its far end. |

The offline level checker measures production grounding and Home house solids but excludes room/station collision. It cannot certify either proposed shell or its route. A final layout test must include the future station-house solids, its entrance and the ramp, even though the leaning house currently mounts only in the greybox. The optional deck adds a local glide departure after the crossing opens. The player can walk down the same stair. No work edge changes.

Moving the cottage within the rectangle also fails for either alignment parallel to the platform. Project the four corners of the station roof from `houseBoxes()` through `toWorld` and `ringUL`. For each potential separating axis (two roof normals and two Ring axes), the largest possible gap occurs at a corner of the permitted cottage-centre rectangle. Across those extrema the best gap is −0.14 m for a 5.4 × 4.4 m shell and −0.63 m with its dimensions swapped. Every such placement therefore overlaps the roof in plan, before adding stairs or the forecourt. This result concerns the requested halt-facing layout.

The level run reported the planned Ring checks OK and 5,244 production placements with zero grounding problems. The layout test projects the future station solids and its window sightline, samples the summit trail across its full 2.6 m width, checks the approach grade and checks terrain visibility from the ramp end to the doorway.

**Research.** [Growing towns](../research/growing-towns.md) informs the visible permanent pick. [Level design](../research/level-design.md) and the [route contract](../research/route-contract.md) inform the short walk from the halt, the return route and preservation of the works.

## Rules, state and wire

Town slot 1 and Plot slot 16 use the existing railway checkpoint and replica. The server creates both rows for every room, stakes the offer when the seam is joined (the brief's ring-joined seed), and uses zero freight thresholds. Joining is the rivet strike that opens service, earlier than a train physically arriving. Only kinds 6 and 7 are valid on slot 16. The purchase uses the existing unpredicted rail.buy edit, authenticated actor pose, 3.2 m board reach and per-town pricing. A refusal leaves the boards and funds intact. Construction follows the accepted purchase tick. The room host runs rule ticks and saves. Both kinds add one rider per minute at the existing line 2 far queue once construction finishes. Preserve Home's base demand, rider caps, fare and conservation checks.

Boards, models, telescope and rope motion are local views. A deliberate pull while standing still has no distinct replicated pose. Use a transient bell message through the room interface, with the host supplying sender identity, validating a built bellhouse and proximity to the rope, and limiting each peer to one pull per 1.5 s. Receivers check shape, sender, current building and cooldown. Play the pull locally once and suppress sender echo. Late arrivals see the saved building and hear future pulls.

## Implementation steps after the site decision

- [x] 1. Pin the chosen footing, boards and stair in the Ring frame in `src/sim/railway-ring-layout.ts`. Ground the approach against production triangles and project the greybox station's oriented solids into the same frame. Test footprint separation, doorway access, approach grade, scaffold, deck headroom and both board centres in server reach. Inspect the ramp approach at phone width.
- [x] 2. Add the arrival-gated catalogue offer to `railway-trade-layout.ts`. Share eligibility between `railway-queries-trade.ts`, `railway-sys-trade.ts`, `railway-check-trade.ts` and board visibility. Validate purchase chronology on checkpoint load. Accrue completed Ring demand on the far side only and include that demand in the till estimate. Exercise pre-join refusal, permanent pick, both kinds, per-town price and exact extra rider accrual.
- [x] 3. Dispatch Home and Ring reach separately in `src/world/railway-server.ts`. Extend `server/test/railway-buy-host.test.ts` with real r:edit sessions at each board, a Home-position refusal, wrong kind, insufficient funds, racing purchases, one debit and restored accepted state. Bump `src/world/namespace.ts` with dated history in the catalogue commit. Planning base is v83. Inspect origin/main on rebase and take its next version, coordinating with Lane B. Regenerate affected replay and seed fixtures and compare action sequences. Verify the route with `npm run loop -- run`.
- [x] 4. Mount the twin boards, distinct toppers, ghost swap and timed construction from the accepted plot in the Ring Island entity. Use the cottage cutaway and shared lift-or-wait for grouped solids, including a visitor in the footprint and a player on the scaffold when it retires. Add the stair, deck and works-facing telescope using the existing lookout modal. Add rope interaction, bell swing, spatial sound and sky ring with the validated relay in hosted-room and receipt tests. Use the existing interact controls on keyboard, pad and touch. Update owning trade and place design sections, any newly observed activity marks in `dev/loop/graph.ts`, and affected bot targets and seeds.
- [x] 5. Run the ship check, full server suite and network suite. Inspect both built choices and the 390 px board, walk the room and stair, open the telescope and glide, and pull the bell with a second tab on the platform. Exercise restarts during and after construction in the host tests.

## Design review (2026-11-28)

| Call | Kind | Basis |
| --- | --- | --- |
| Town choices give a walk-in building with an optional activity. | Decided | 27 November course change and 10 November walk-in buildings. |
| Keep the leaning station house and Lookers' waiting room at the north-west corner. | Decided | 10 November station decision, answer 5. |
| The owner supplies final names and words. | Decided | 11 November story and characters decision. |
| Ring gets the first additional town offer; Home stops at four and bought plots remain permanent. | New | Lane C next, questions 1, 3 and 5, instructed yes. |
| Lookout or Bellhouse, one rider per minute, staked at join with no freight at base 300. | New | Lane C next, questions 2 and 4, instructed yes. |
| Twin boards 2.4 m apart, ordinary hold and build time, six-metre deck and works-facing telescope, 1.5 s shared bell cooldown. | Default | Brief calls 11–13 and Part 2's interaction. |
| Survey the strip west of the station terrace for the hangout, beginning at (473, −27). | New | Resolves the site overlap while keeping the existing station decision. Changes the assigned STACK_KEEP location. |

**Counts.** 3 Decided, 1 Default, 3 New. Existing brief calls are logged with its source commit 1743279ec. The New relocation call records the surveyed west site at (473, −27) and its 9 m floor.

**Disposition.** Built west of STACK_KEEP. The default price is 150. Both accepted picks use slot 16 and add one rider per minute to the far queue after completion. The offer reuses the existing buy operation, prompt registration and build mark.

**World version.** Lane B landed its High Gorge yard gifts as v84. Ring's town and plot take v85. The combined look-seed dispatcher serves both the incline gift and the two finished Ring buildings.

**Replay comparison.** The additional Town and Plot rows change every world hash. All 85 seed stages retain their tick, all 541 operation steps retain their label and result, and the host trace retains 8,620 records.

**Walkthrough.** From the outer ramp end the controller walked up the foundation ramp, into the room, back onto the porch and up the four stair flights. It reached the deck at body height 15.45 m, opened the telescope with Interact, stepped back and deployed the glider off the deck. These browser runs checked reachability. They did not measure travel time.

**Purchase and signal evidence.** A browser held Interact at the lookout board and received kind 6 with one 150-Boogle debit. The host tests race both picks, restore during construction, advance through completion and restore again. A player inside the bellhouse pulled the rope with Interact. A second browser profile on the platform received the signal. Both observed the rising ring. [Lookout](lane-c-part5/lookout.png), [bellhouse](lane-c-part5/bellhouse.png), [390 px boards](lane-c-part5/boards-phone.png), [signal on the observer's tab](lane-c-part5/bell-signal.png).

**v85 checks.** Ship check passed 2,202 tests with one skipped. The network suite passed all 411 checks. The full server suite passed 422 tests with two skipped on repeat. The first run reached its 120-second deadline in the ending-route host test. The repeat allowed 300 seconds per test. The headless route finished with one, two, three and four players.

**Placeholder copy.** Lookout Tower, Signal Bellhouse, both board titles, price and rider lines, purchase hold labels, telescope prompt and bell-rope prompt. No new dialogue.

## Risks and remaining checks

Moving the future station roof, window or trail can close off the approach. The layout test uses the station's source solids, the window-to-shard ray and the production trail. Construction uses the same occupied-shape checks as the railway frames. A player standing on a scaffold as it retires and a second player inside a rising wall still need a live two-player walkthrough. The signal was verified visually across tabs. Bell loudness and physical-device controls remain unverified.
