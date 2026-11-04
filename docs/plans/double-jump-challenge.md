# First double-jump challenge

## Goal

Replace the one higher reward ledge beside the first device with a short optional block course, using the existing warm stone platform language. The owner explicitly authorized implementation from the round 4 note; target 20–40 seconds for a competent player, with a cheap dry retry. Serves DESIGN.md **3. Side activities are never required**, **10. Slapstick over precision**, and **11. Show, don't tell**. Unlock timing, device position, Lamp Cap reward, personal collection and missed-reward delivery remain unchanged.

## Design

Static geometry is **Local** presentation and static collision, built by the existing `buildPads()` path in `src/proto/place/tech.ts`. There is no new mutable gameplay state, authority, event, input or lockstep math. Player movement remains Owner physics. Existing `job.tech` and personal `finds` own unlocks and collection exactly as before. Existing `stonePad()` supplies pale caps, warm bodies and brass corners; no new materials or lights.

The first pillar is at local **(-42.2423, -67.8032)**, top **26.3786**. Terrain beneath it is water; west and south are mostly 18–19 m, so ground alone is not a sufficient cheap retry. Use eight broad, level hops folded west then south then east. Coordinates below are offsets from P1; every new pad has half-size **3 m**, with top equal to P1.top. The first six-hop draft took only 14.6 seconds; two extra hops bring the scripted floor to about 20 seconds without artificial pauses. The final fold stays west of the main rail:

| Order | Pad | Offset x | Offset z |
| --- | --- | ---: | ---: |
| 0 | existing p1 | 0 | 0 |
| 1 | j1 | -16.4 | 0 |
| 2 | j2 | -32.4 | 0 |
| 3 | j3 | -48.4 | 0 |
| 4 | j4 | -64.4 | 0 |
| 5 | j5 | -64.4 | 16 |
| 6 | j6 | -64.4 | 32 |
| 7 | j7 | -48.4 | 32 |
| 8 | existing p1-block, relocated | -32.4 | 32 |

Each edge gap is **10 m** (P1 retains half-size 3.4 m). The final reward is over 25 m from the first pillar, so it cannot be taken by jumping straight from the device. Keep the existing `p1-block` array slot and append new pads: ring presence indices must not shift. Keep secret id `block`, gift `lampcap`, `after: hook`, and its existing collection flow; move its position through `padById('p1-block')` and start its bot approach on P1. Delete the old pillar-mounted raised block/support geometry.

Add a plain, dry warm stone catch ribbon **3.4 m below** the pad tops, half-width 4 m along the three outer course legs. Its west edge is offset −68.4, and its south return ends east at −8.8. The lower return (width 3.2 m, x offset −10.4) joins a connector around the pillar; a solid ramp rises from z=10.2 at catch height to z=3.1 at P1 height. Keep overlap faces out of the same plane. Pad/ribbon/ramp shapes describe both meshes and collision. The first version's eastern lower return intersected the rail; the westward revision removes that conflict, and the existing place checker now checks recovery slabs against the rail's padded corridor. Broad pads and the dry floor make misses inexpensive; the main route continues unchanged beside P1.

The actual controller has 7.6 m/s first jump, gravity 18, held-apex gravity 9 below 1.6 m/s, fall gravity 30.6, sprint 9.5 m/s and radius 0.45. Its continuous held single arc is about 0.842 s / 8.00 m at sprint; even adding 0.9 m body diameter stays below a 10 m edge gap. This is a useful bound, **not final collision proof**: include coyote launch, rounding and discretization in scripted failure attempts. The second jump sets vertical velocity to at least 6.8 m/s, making a full sprint double viable. Do not change movement tuning. Walking-only double jumps need not clear these horizontal gaps.

Research basis: `docs/research/movement-abilities.md` sections 2, 3 and 5 (short power-teaching sequence, broad safe landings, real controller budget). The local `codex/placement-checks` branch exists at `aafb903f`, but is not an ancestor of HEAD `326dda13` and is absent from local `main`; do not copy unfinished tooling. No fetch is authorized. Use the existing `dev/economy/place-level.ts` and broker evidence.

## Steps

1. [x] **Geometry and owning docs:** edit `src/proto/place/tech-layout.ts`, `src/proto/place/tech.ts`, and the movement/secret section of `docs/game-design/place.md`. Export compact course data for the existing bot/checker. Build the pads and recovery route through existing helpers without new lifecycle hooks. Preserve all existing copy. Leave the round 4 tracker unchecked because this task does not ship. Verify focused format/lint/typecheck before the full required check.
2. [x] **Existing verification:** update `dev/look/bots/place.ts` so the ordinary place run completes this course after gaining jump, using real sprint/jump inputs and each physical landing, then takes the existing reward. No teleport between pads. Add relevant measurements to `dev/economy/place-level.ts` rather than a new harness. Prove single and sprint single failures, successful double traversal, no direct finish bypass, a dry fall and return. Record actual course time; tune only spacing/route extent within this design if it falls outside the target, and do not insert artificial waits to claim pacing.
3. [x] **Visual evidence:** through `.look/see-client.ts` only, capture a readable course overview, takeoff/midair/landing with `--curves`, and the failed-gap recovery. Visual question: does the reward read as a short chain of generously sized warm stone landings, with the safe retry below and the main route visibly separate? Open the actual PNGs; extract consecutive video frames if used. Run the full bot, read its report even on failure, and run the existing `world-inputs` scenario. Repeat affected evidence after final edits; never edit during a broker run.
4. [x] **Finish:** review/simplify the diff, run `npx prettier --write` on changed files and `npm run check`, fix failures, and commit small imperative commits with the DESIGN.md principle in their bodies. Do not push or ship. Report measured outcomes and exact manifests, with human fun, real-time motion and device play unverified.

## Risks and limits

- The 20–40 second target is checked with the input traversal; centre-path distance alone is roughly 128 m, and alignment/turns add time. Bot timing is not human fun evidence.
- The catch ribbon must not become a premature ground route to the device or a direct platform skip. Its low ground clearance and ramp endpoint require inspection; keep its top below double-jump reach from surrounding terrain where possible.
- Warm stone geometry adds a bounded handful of meshes/colliders with no frame work, lights, shader changes, wire shapes or saves. `npm run check:full` and new unit tests are not triggered. Existing check, place-level and broker checks cover the changed scope.
- The known inflight report was run by the parent before discovering it fetches; no further network is authorized. No other worker's changes may be reverted.

## Open questions

None block the owner's explicitly approved task. Ability timing and the owner's eventual playtest remain the owner's decisions. The implementer may adjust recovery construction or a few metres of spacing after measured collision/visual evidence; any wider mechanic or movement change is outside this plan.

## Verification, 4 November

Final runtime tree: `08bb473c4bb93d651d2c077ddded7f59652e9ae5`, before the documentation-only completion record. Each broker manifest reports no change during its run.

- [Full place bot](../../.look/evidence/1793783720264-55563/evidence.json): finished all expected beats, course **20.6 s**, all eight physical landings, original Lamp Cap collected, then returned to the main route and completed the round. No `NEVER`, page or GPU errors; zero water falls. Crystal and co-op markers were not exercised by this solo run.
- [Course still and curves](../../.look/evidence/1793783819858-56818/evidence.json): **19.6 s** from a staged start, eight successful jumps. Opened the still and curve PNGs: warm caps and lower walkway are visible, the rail is separate, and eight two-part arcs return to the pad height. Some distant landings are partly obscured by existing trees in the overview; human discovery remains unverified.
- [Gap proof](../../.look/evidence/1793783819803-56819/evidence.json): held walking single and sprint single missed; four further late single-press sprint launches also missed (beyond coyote grace these can consume the air jump instead, which still fails alone). The two-press sprint double landed. Opened the still, curves and four consecutive `flight-01.png` through `flight-04.png` frames extracted with ffmpeg at 7.8 s. No pose or velocity writes occur during any measured crossing; only isolated trial setup resets the player.
- [Dry recovery](../../.look/evidence/1793783819812-56820/evidence.json): missed first gap lands on the catch, then **5.9 s** of walking returns to the device without teleport/reset. Opened still and curves: the player is back on the upper pillar and the return trace climbs the ramp from the dry lower level.
- [world-inputs](../../.look/evidence/1793783833516-57398/evidence.json): all existing scenario assertions passed against this running build. The broker's trusted fixture paths belong to its harness checkout.
- `node dev/economy/place-level.ts`: all reachable, all eight 10 m gaps exceed the single-jump estimate including radius/coyote allowance; zero recovery/rail conflicts. Additional read-only sampling at 0.025 m along rails found zero conflicts with a 4.2 m vertical and 1.95 m lateral corridor. Minimum relevant lateral separation **2.625 m**; nearest footpath **5.197 m**. Highest sampled catch-edge terrain leaves **3.452 m** up to its floor, so it provides no ordinary early approach to the device.
- `npx prettier --write` on changed files and `npm run check`: passed. No new tests or scenarios; no lockstep or player tuning changes.

Limitations: human fun/discovery, real-time smoothness, physical gamepad/touch and co-op play are unverified. No Boogler copy changed or suspect lines found. `placement-checks` was not landed in inspected main refs, so its unfinished branch was not copied. Process departure: the required `inflight` command performed a fetch before its implementation was inspected; this was disclosed, and no further external network, push or ship was used. Stop here for the owner's playtest.
