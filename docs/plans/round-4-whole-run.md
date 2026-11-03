# Round 4 whole-run assessment — 3 November 2026

**Outcome: partial validation; local fixes ready for review.** The solo route completed every expected action. Targeted two-player moments passed. A full two-player route and a genuinely blind first visit remain unverified because the required broker cannot run them. Item 5 records completion of this agent pass and handoff, not that those gaps have passed. No push, ship or deployment; no work after round 4.

## Changes and principles

- **DESIGN.md 7, Telegraph everything:** the empty material frame now collides as low rails and four posts. The solid log pile follows the visible row count and disappears with it. A matched T3 probe changed minimum camera distance from **1.89 m to 5.49 m**, removing the sharp collapse beside the opening. It still blocks at the visible low rail until jumped. No global camera or movement tuning.
- **DESIGN.md 11, Show, don't tell:** a low canvas pack replaces the tall empty rectangle, keeping the same four meshes. The loaded and empty views leave the head clear. The repeated rails objective is gone; the beacon, visible stock and nearby **Take rails** action remain. The baseline here showed the objective **six times / 28 s** (the earlier review reported eight / 39 s); the new solo run shows **zero / 0 s**.
- **DESIGN.md 7 and 11:** both existing slabs read as sealed stone gates: paired leaves, joints, pale edges and a brass/teal seal, merged into each existing face mesh. No added draw, light or gameplay gate.
- **DESIGN.md 6, Visible progress:** both clients already saw box clothing, but shop hats disappeared remotely. Receipt validation now accepts shop stock as well as gifts, with the same slot/known-item checks and unchanged presence shape. Both clients visibly wear the paper hat, scarf and overalls in the repeated capture.

No bills, capacity, train speed, ability tuning or route length changed. All additions remain in the prototype's scope. The Boogler's dialogue, gift lines and HUD copy were preserved except for the explicitly requested rails objective.

## Run and beat table

[Baseline manifest](../../.look/evidence/1793698645177-80319/evidence.json), [bare-URL solo manifest](../../.look/evidence/1793699704621-92797/evidence.json), [full solo report](../../.look/evidence/1793699704621-92797/run/report.txt), [bot log](../../.look/evidence/1793699704621-92797/run/bot.txt). Times below are elapsed telemetry time, rounded; the bot log starts about five seconds later. The full route is about **33:19**, the pier ending **29:25**, first path **5:58**, trains **26:35**. The bot knows the route; this is a floor for a first-time human, not a pacing verdict.

| Beat | Solo time | Observation and first-visit cue assessment |
| --- | --- | --- |
| Approach / wake | 1:24 | Route-aware bot reached the machine after 78 s walking. Blind discovery of the path and beacon was not tested. |
| First tree / frame / box | 1:30 / 1:49 / 2:01 | Material feeding and box opening happened. Opened box sheets show lids breaking, prizes rising and empty space afterward. |
| Rock break | Before T2, 3:14 lay | Opened motion and consecutive video frames show stone fragments lifting toward the back and the rock depleting. |
| Great tree / beam | 5:32 shoulder | Reframed capture shows the fall, bare trunk, shoulder carry, delivery and Beam 1/1. No extra prompt added. |
| First path | 5:58 | Opened celebration sheet: pull-out, rockets, banner and view return. Final T3 probe removes the camera collapse; feel and sound remain unknown. |
| Double jump | 6:10 | Rings, particles, pickup banner and automatic second hop are visible. Raised nearby box supplies a use. |
| Axe / pack | 6:30 / 9:07 | Both rungs occurred. Pack's empty view and 16-log close-up leave the head clear; upgrade silhouette remains visible. First-time chest recognition is unproven. |
| Forge / rails | 11:55 / 12:03 | Six rail pickups still occurred without the repeated objective. Beacon legibility to an uninformed player remains untested. |
| Depot / pushing cart | 15:09 | Tracked sheet and twelve consecutive frames show both little guys behind the moving loaded cart, hands at the bar and stepping feet. |
| Hook shot | about 16:15 | Pickup carries the player to the first slab/box; cable and destination are visible, camera distance 5.22–5.33 m. |
| Q3 / quarry gate / Q4 | 17:23 / 17:48 / 19:15 | Every expected action occurred. Gate photo shows a sealed stone door in shade. Lever discovery was route-aware. |
| Glider / sea gate | about 20:27 / 20:30 | Pickup canopy flash and pan along the post chain are visible. Full bot glides 77 m in 24 s, ending 2 m from its target. Following the posts unaided remains unproven. |
| Q5 / Far Head | 24:29 / 24:58 | Last sea stretch and celebration completed. No timing or content was lengthened. |
| Trains / pier ending | 26:35 / 29:25 | All expected rides and construction passed, with an imperfect return ride described below. |
| House / shop / museum | 31:24 / 31:34 / 32:00 | Solo tried, kept and swapped items and talked to all expected residents. Two-player shop photos show one talking inside while the other keeps the hat and exits. |
| See-saw (separate co-op check) | Targeted | Both lift, carry 20 m, set, then alternately launch. Sheets show both airborne, about 7.5 m rise; local clients finish at equal ticks, no errors. |

These are **informed cue observations**, not a passed blind test. `fresh=1` was used in targeted captures; the bare URL also enables the clean view by default. No new instructional copy was added to cover uncertainty.

## Pacing and pauses

The Q3–Q5 interval, measured from **Q2 laid to Q5 laid**, is **533.7 s (8:54)**. Actual bill work is **55.9 + 81.5 + 204.9 = 342.3 s (5:42)**. Hook pickup to glider is **251.7 s (4:12)**, and glider to trains **368.4 s (6:08)**. Q3–Q5 does include the hook, gate and glider; the entire interval should not be described as having no new toy. These numbers alone do not justify a tuning change.

There are **19 still periods totalling 301 s**, one **1.6 s** push into an obstacle, no runtime/console/gfx errors, and no missing expected solo actions. The generic unmarked “did something together” is appropriate for solo. Every still period of at least ten seconds:

| Start | Duration | Explanation from bot/telemetry |
| --- | --- | --- |
| 1:46 / 3:10 | 11 / 11 s | T1 / T2 feed and track laying. |
| 5:37 | 27 s | T3 feed, laying, then path-opening presentation. |
| 15:00 | 10 s | Q1 feed and lay. |
| 15:23 | 19 s | Waiting at the depot's frontier rack while the cart brings stock. |
| 15:47 / 17:19 / 19:11 | 17 / 13 / 18 s | Q2 / Q3 / Q4 feeding and laying. |
| 24:23 | 39 s | Q5 feeding and long sea crossing construction. |
| 26:41 / 27:19 / 29:34 | 12 / 31 / 16 s | Train arrival waits at Camp, Village line 2 and Far Head. |
| 28:56 | 28 s | Pier feed and construction. |
| 30:12 | 15 s | **Unwanted:** the rider leaves the return train near (1184, -32), tumbles onto land and stops near (1179, -5). The bot waits for the train to reach home, then walks to town. This is not a successful uninterrupted return ride. |

The remaining five short pauses total 34 s: great-tree interaction, forge lighting, glider pickup, train unlock and end-of-tour observation. The final run had **zero water falls**, but two return-ride tumble marks and a bot “stuck in a hole: back up” recovery at Far Head. The baseline had 30 water/recovery marks on its return journey. This variable ride/pathfinding problem is left explicit, not hidden by the successful completion status. Automatic/fixture teleports in the tour and recovery mean this is not an uninterrupted human walk.

## Opened visual evidence

Each link is the broker manifest with exact arguments, tested tree, health result and artifact names. PNG inspection, rather than command success, supports the observations above.

| Question | Manifest | Images actually opened |
| --- | --- | --- |
| Does the rock break read? | [rock](../../.look/evidence/1793699042653-86713/evidence.json) | `rock-motion.png`, derived `rock-consecutive.png` |
| Are the cart guys pushing? | [cart](../../.look/evidence/1793699172203-89116/evidence.json) | `cart-tracked-motion.png`, derived `cart-consecutive.png` |
| Does the great beam chain work? | [beam](../../.look/evidence/1793699219045-89442/evidence.json) | `great-beam-motion.png` |
| Do boxes reveal and clear? | [boxes](../../.look/evidence/1793699524734-92493/evidence.json) | `boxes-framed-motion.png` |
| Do ability pickups show their effect? | [jump](../../.look/evidence/1793699260586-89744/evidence.json), [hook](../../.look/evidence/1793699282502-90172/evidence.json), [glider](../../.look/evidence/1793699303689-90812/evidence.json) | Each corresponding `*-pickup-motion.png` |
| Does the path opening read? | [opening](../../.look/evidence/1793698777742-82393/evidence.json) | `opening-before-motion.png` |
| Does T3 collapse the camera? | [before](../../.look/evidence/1793698845563-83474/evidence.json), [after](../../.look/evidence/1793699018384-86420/evidence.json) | Both `t3-*-motion.png` and `t3-*-curves.png` |
| Does the slab read as a sealed gate? | [before](../../.look/evidence/1793698865072-83921/evidence.json), [after](../../.look/evidence/1793698997406-85992/evidence.json) | Both `gate-*-still.png` |
| Is the pack low and visible? | [pack](../../.look/evidence/1793699910741-93430/evidence.json), solo manifest above | `low-pack-still.png`, baseline and final solo `run/end-still.png` |
| Can two players bounce? | [see-saw](../../.look/evidence/1793699459270-92128/evidence.json) | `seesaw-default-motion.png`, `p2-seesaw-default-still.png` |
| Can both use the shop independently? | [shop](../../.look/evidence/1793699848147-93134/evidence.json) | `shop-default-still.png`, `p2-shop-default-still.png` |
| Do shop clothes show remotely? | [before](../../.look/evidence/1793699954859-93731/evidence.json), [fixed](../../.look/evidence/1793700043719-94085/evidence.json) | Both players' stills from both runs; the missing remote paper hat is visible after the fix. |

`--curves` was used for T3, opening, abilities and see-saw. `--filmstrip` was attempted but rejected by the broker. As required by the task, consecutive frames were instead extracted from the real-time rock/cart videos with ffmpeg and opened. These do not establish real-time smoothness. Opening's sheet predates the fixes; its unchanged celebration is also exercised by the complete updated solo route. Other affected source received repeat checks; shop clothing was the last source edit and has its own repeated two-client capture. Documentation/commits may make older manifests differ from the final Git tree.

## Failures, departures and every item left

1. **Full two-player route remains unverified.** The allowed playthrough operation has no `--players`; broker look uses its `--url`, which disables warped warm-up without the unavailable `--clock-url`. Actual two-tab runs measured 1.00x; the broker kills a command at seven minutes. A roughly 33-minute route cannot fit. No replacement harness or direct Chromium was started. The targeted see-saw, shop and clothes runs are not substituted for the full route.
2. **Blind first visit remains unverified.** [The prescribed first-visit protocol](../../dev/look/playtester.md) explicitly forbids source/coordinates/checkpoints and substituting the route-aware bot. The broker supports no persistent session. I already knew the route from this audit, so fresh captures are disclosed as informed. This needs the director's supported session or the owner, not an invented pass.
3. **Return-train rider loss and Far Head bot recovery remain.** Exact evidence and locations are above. No player/platform physics was changed on an uncertain cause. Reproduce with human input before selecting a fix; the owner brief includes this ride.
4. **iPad, sound, perceived smoothness and gut pacing remain unjudged.** [Owner brief](round-4-playtest.md) names the exact moments. The numerical frame rates are health samples on a shared GPU, not performance benchmarks.
5. **Tool/fixture failures are retained:** the first playthrough query omitted `shot=play`, resulting in 11:17 idle; corrected run finished. `--name` for playthrough and `--filmstrip` for look were rejected. The initial cart shot missed the cart; it was reframed. The built-in great-tree shot fell off the rim before chopping; a checkpoint-based walk produced the valid capture. First box action accidentally selected secret crates and raised a fixture error; filtering gift crates fixed it, then framing was widened. Initial two-player bare query selected the harness's classic island and failed `__place`; `classic=0` selects the same gameplay defaults as the bare URL while allowing the harness's `player` parameters. This override is disclosed rather than called a literal bare-URL two-player run. The corrected targeted runs have no errors.
6. **Prior round-4 leftovers remain:** the research/pictures checkbox and the two-player track's ambient-rumour/resident timing exception are not silently closed by this pass. The scope did not reopen those decisions or add content.
7. **No remote access or publication.** `inflight` fetches, so local branch/status/ref checks replaced it under the task's network prohibition. Stills are local evidence, not uploaded PR shots. No push, ship, CI, merge or live deployment was attempted. Stop at the owner's playtest after this handoff.

## Checks

`npx prettier --write` and focused ESLint passed for the edited source. Final `npm run check` passed: lint, types, **292/292 tests**, registry, five levels, assets and production build. The existing trusted [world-inputs scenario passed](../../.look/evidence/1793700255736-94459/evidence.json), with no graphics errors; it checks the shared world fixture, not the whole round-4 route. `node dev/economy/place-level.ts` passed all ability reach checks. No new tests/scenarios and no tuning changes.
