# First fall at the works

The owner answered question 1 on 28 November 2026 and accepted option A, including the hall fallback when state is unknown. See the [dated decision](https://github.com/matiasfr/boogle/commit/4da4c528686168281938e018407f74170d9d0ea6) and [start-flow brief](../brainstorms/start-flow.md). The axe and boiler have their own build.

## Build order

1. **Choose the works when Jump in is pressed.** In `src/place/layout.ts` and `home-station.ts`, locate the Camp pad at local (−20, −150) and the hall pad at the village spawn (−97, 14). Aim at the parked machine and the actual board post respectively. In `src/features/fall.ts` and `src/fall/{arrival,stage,index,letters}.ts`, set the destination once from the synced, confirmed railway mirror. Station 3's completion (job 2) is the path-open predicate used by the opening view. Funding or starting the final lay still means Camp. Anyone already rolling, falling or standing keeps their place when the last section opens. A guest pressing Jump in afterward gets the hall. An unknown room gets the hall. Carry the rail, trolley, cloud, lettering, yaw and scattered props together. Keep #2648's post-title physics footing, flop and stand-up and the Act 1 crane. Proof: first free view on desktop and 390 × 844, then a guest joining a room with line 1 complete.
2. **Place the returning player and retire the dock board.** In `src/entities/railway/arrival.ts`, use the same selection for the no-pose and exhausted-search fallback. Keep `src/place/return-spot.ts`'s remembered standable spot and yaw, then built halts (ride destination first), then fallback. Keep checked jump-room landings ahead of fallback. Land at the selected pad just once. In `home-station-view.ts`, `works-live.ts`, the board prefab and its inspection/eval, aim the hall face at the arriving guest and retire the dock-only post, footing and collider. The cove, stakes and road remain destinations. Proof: two tabs sharing a room, fresh guest sees the host working, later guest faces the board, reload resumes their saved spot.
3. **Measure the route.** Update `dev/economy/place-level.ts`, `dev/look/bots/railway.ts`, `dev/scenarios/arrival.ts` and the first-run and place chapters. Check `src/proto/playdata/record.ts` and `dev/loop/trace.ts`: a first-fall session starts its clock at the first dry footing after descent (director completion is the fallback). The clock includes recovery and the crane. Only the first server-authoritative contribution marked mine ends it. A reload, another player feeding, a tap or the axe reveal cannot earn it. Proof: read the real-speed deposit trace, plus level-check and the changed-file checks.

**Risk for steps 1–3:** local placement, scenery, measurements and documentation. Neither sim nor server selects this avatar's pad. They consume existing command reach and player position. No edits planned to `src/sim`, `src/world`, `src/net`, `server/`, the wire or a WORLD_NS-pinned fixture. Independent review and net/server suites apply if the build changes one.

## Level findings

On main 4fff5e3bd, the place check floods from the village over paths and footbridges to the machine, groves and first frame. It has no pad or sight-line switch. Additional samples of its production terrain H, at 1 m spacing inside an 8 m disc and at 101 points from a 1.6 m eye to a 1.5 m target, give:

| Pad (world x,z) | Dry elevation, disc range | First landmark and terrain clearance |
| --- | --- | --- |
| Camp (980,−150) | 30.09 m, 29.94–30.22 | Wake (996.05,−149.4), 16.06 m, 1.49 m clear. About 1.8 s walking to enter the 6 m wake radius. Frame (995.62,−141.89), 17.6 m. |
| Hall (903,14) | 18.21 m, 17.45–18.22 | Actual board (910.18,6.12), 10.66 m, 1.50 m clear. Roughly two seconds on foot. |

The hall centre is 7 m away, but the board stands inside its north bay and faces roughly away from the pad. Step 2 aims the painted face at the square. Ground samples omit structures and camera framing. The Camp route retains the axe, chop and deposit gates. The path gives everyone a way back. At Stations 2 and 3 the new track leads on from Camp. After the bridge, the board names more distant work; the walk before trains run can still reach 546 m.

## Done means

- The first standing view frames the layer, resident and frame sign on desktop and phone. The track guides a mid-line guest. Two players can land and act independently.
- After line 1 reaches Home a new guest can read the hall board, with Sleeves in the view. A valid saved return takes precedence. The dock can still be visited.
- A real-speed bot reaches its first accepted deposit in under 60 s. The next fresh-session median target is under 120 s (baseline 235 and 241 s, n=2). Future human sessions tune the result.

## Design review (2026-11-28)

| Call | Kind | Basis |
| --- | --- | --- |
| Camp through the last lay, hall after it or when state is unknown | Decided | 28 November first fall at the works |
| Visit the dock later, remove its board | Decided | Same decision, answer 2 |
| Fall through the title and stand up into the Act 1 camera move | Decided | 2 and 11 November, decisions-controls |
| Axe and funded frame gate the first ride | Decided | 15 November, grant queue |
| Place and face the two pads at the coordinates measured above, turn the hall sign to meet the guest | Default | Keeps the first goal visible without rebuilding the hall |
| Lock the aim on Jump in and reuse the phase for a return that exhausts its usual candidates | Default | Prevents a moving destination during the fall and preserves a friend's saved place |

4 Decided, 2 Default, 0 New. The owner resolved the brainstorm's New call. The walk from the dock used 101 seconds of the two-minute budget before the axe. [Level design](../research/level-design.md) supports the three-second walk to the machine. [Route contract](../research/route-contract.md) keeps the work gate. [Progression flow](../research/progression-flow-layout.md) and [wordless onboarding](../research/wordless-onboarding.md) favour an obvious next goal and a route back. Finding for step 2: face the actual board toward the pad. Terrain clearance alone cannot establish a readable sign. No new player words. Sleeves' existing direction to follow the path to Camp remains applicable to someone who walks back to town before taking the axe.

## Open questions

1. Move the shore landing to Camp until Home connects, then to the hall? Recommended **yes**, answered **yes** on 28 November. All five answers in the brief stand. No outstanding direction question.

