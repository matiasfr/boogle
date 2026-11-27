> **Status: proposed (2026-11-26).** Owner asked for a designer proposal on a second-player job during the sea-cave plug approach (`docs/decisions-process.md`, `d-2026-11-26-decision-desk-answers`, item 8). One-pass, three-lens brainstorm (design, systems, creative).

# A second-player job during the sea-cave plug approach

**Seed.** In co-op, `plug-gate` has the largest unassigned-seat window on the built route: **172.3 s** per player at 2p, **229.7 s** at 3p, **258 s** at 4p (`docs/reports/wall-waits.md`, `docs/plans/greybox-route.md` §7), followed immediately by **152.8 / 102.8 s** unassigned on `cave-1` because partners only start moving to West Landing after the single-actor plug press lands. Moving the plug press to Bell Rock was tested and rejected: it saved 135 s on `plug-gate` but added 216.1 s to solo `cave-1` (net **+81.1 s** solo). The plug press stays at West Landing; any fix must not slow solo.

## Pitch

Let a second player **pre-feed Cave 1's frame while the sea-cave plug is still shut**, bringing the owner's Line 2 rule ("fill a gated stretch before its switch", 8 November) to greybox frames. On main, `cave` already opens at `bay-2` (`order-choice`) and stocks 20 logs + 20 rails on West Landing's rack 1 immediately; only `legStock` refuses to accept them until `rail.gate` fires. Allowing feeding before the barrier opens turns a serial bottleneck (`plug-gate` → `cave-1`) into parallel co-op work: while Player 1 finishes Canopy (takes the cloth) or travels to the plug, Player 2 walks to West Landing, hauls all 40 units off rack 1 into frame 1, and leaves a full frame pointing at the plug. The moment the plug opens, the 30 s lay starts on that tick. Solo does the same 6 m apron in either order with **0 s regression**.

Serves DESIGN **8. Enjoyable alone and together** (real division of labour in co-op, zero solo cost), **7. Telegraph everything** (a full frame waiting on a shut barrier points straight at the plug), and **11. Show, don't tell** (the stocked rack beside the shut frame invites hauling without a hint). Bends nothing.

## Gut question

When one friend finishes Canopy while another heads to Home's West Landing, does pre-loading the cave frame so the track starts laying the instant the plug pops feel like sharp teamwork—or does the frame sitting full before the rock clears feel odd?

## Three candidate jobs (compared)

| Job | What player 2 does during the approach | Solo cost | Fits decided rules? | Verdict |
| --- | --- | --- | --- | --- |
| **1. Pre-feed Cave 1's gated frame** *(Recommended)* | Travels to West Landing's cave apron, lifts the already-stocked 20 logs + 20 rails off rack 1, and feeds frame 1 while the plug is shut. Opening the plug immediately starts the 30 s lay. | **0 s** (same apron, either order) | Matches `d-2026-11-08-fill-a-gated-stretch-before-its` and `d-2026-11-17-finished-deposits-read` ("full frame waiting on a gate points at the gate"). | **Build this.** Real 40-unit haul, cuts both `plug-gate` and `cave-1` co-op idle, no bump. |
| **2. Stage Cave 2 prep at Home (Roundhouse + kit buffer)** | Fits the cave line's Quick/Strong boiler at Home's Roundhouse (once open) and/or stages Cave 2's 20+20 kit in a West Landing buffer so the first cave train departs without forge rail-wait. | **0 s** (skippable) | Forge already pours 1 rail / 0.5 s (`TRAIN.kitWaitTicks` max 6 s); Roundhouse fit is a 1 s hold and opens after Cave starts. | **Skip.** Too small to fill a 3-minute approach; kit buffer needs a `WORLD_NS` bump for ~6 s saved. |
| **3. Optional plug-weakening props on the apron** | Pries 2–3 sandstone choke-blocks / timber shores off the plug mouth (hands or pick) to cut a break timer or drop starter material into frame 1. | **0 s** (solo one-presses the plug at today's speed) | Overlaps the separate "breaking the plug" brainstorm (`greybox-leg4.md`) and adds new state/ops. | **Park for depth.** Fun slapstick (principle 10), wrong scope for greybox; needs a `WORLD_NS` bump. |

## Best suggestions

1. **Apply pre-feeding to every gated greybox frame, not only the plug** *(systems, design).* One rule change in `legStock` and `gate` (`src/sim/railway-sys-route.ts`) removes the exact same serial co-op stall at `canopy-gate` (55/73 s), `deep-gate` (61/81 s), `notch-gate` (133/177 s), and `causeway-gate` (140/187 s) with zero special-casing for `cave`.
2. **Reuse the decided "full frame points at the gate" read** *(creative, design).* Per `d-2026-11-17-finished-deposits-read`, once frame 1 hits 20/20 logs and 20/20 rails while the plug is shut, shut its intake (no more Feed prompt), show the full stacks on the frame, and angle a clear pointer/sign toward the plug ("Waiting on the sea-cave plug (placeholder)") so arriving players immediately see why it hasn't started laying. *Now.*
3. **Instant lay-kickoff beat on `rail.gate`** *(creative).* When `rail.gate` opens a barrier whose frame is already full, trigger the existing lay-start sound/motion on the very same tick so the opener feels the payoff of their partner's prep immediately—the clip-worthy "I popped the rock and the track shot straight into the cave" moment (like *Unrailed!* when a pre-cleared path lets the engine roll through without pause). *Now (view/sound hook), polish later.*
4. **Update the loop policy to split seats at `plug-gate` / `cave-1`** *(systems).* In `dev/loop/run.ts`, `plug-gate` currently uses `device()` (`if (pl.i !== 0) return;`) and `cave-1` waits on `plug-gate`. Letting seats 2+ run `cave-1` feeding as soon as `legOpen(w, CAVE)` is true measures the real co-op idle drop in `npm run loop -- run` without inventing fake bot work.
5. **Keep the plug's physical demolition for its own depth pass** *(creative, design).* `greybox-leg4.md` explicitly leaves breaking the plug to its own brainstorm; keep the greybox barrier as a clean stand-in now and bring Job 3's slapstick choke-blocks back when the cave mouth gets real art and physics. *Later.*

**Tensions.**
- *Visual plausibility vs. consistency:* A full track-laying frame sitting beside a plugged cave mouth reads slightly gamey until the rock clears, vs. refusing deposits which the owner already called confusing on Line 2 (8 November). **Recommendation:** follow the 8 November rule—the full frame pointing at the plug makes the wait legible and rewards co-op prep.
- *Scope (plug-only vs. all gated frames):* Plug-only avoids changing `incline`, `canopy`, `deep-span`, `notch`, and `causeway` tests, while all-gates keeps one uniform rule across the whole route. **Recommendation:** all gated greybox frames; one rule is simpler to read and cuts co-op idle on five nodes at once.

## Shape (what it takes to build)

- **Sync kind & authority:** Server (`Leg` and `Route` rows, unchanged). `rail.legStock` stays predicted (threshold `m.start = tick` remains server-owned); `rail.gate` stays server-confirmed. No new op, component, presence field, or play-record mark.
- **Files touched (rough size: S–M):**
  - `src/sim/railway-sys-route.ts`: in `legStock`, allow depositing when `sec.gate` is shut and only set `m.start = tick` when the gate is open (or absent); in `gate`, after setting the gate bit, set `m.start = tick` if `m.logs === sec.logs && m.rails === sec.rails && m.start < 0`.
  - `src/sim/railway-check-route.ts`: update `leg laying` invariant (`r.start >= 0` iff bill is full **and** gate is open/absent) and remove the `leg gate` refusal on pre-fed stock.
  - `src/entities/route-greybox/leg-view.ts`: keep "Feed the frame" active on a shut gated frame until full; once full and waiting on the gate, close intake and show the pointer/placeholder reason toward the barrier (`d-2026-11-17-finished-deposits-read`).
  - `dev/loop/graph.ts` & `dev/loop/run.ts`: decouple `cave-1` feeding from `plug-gate` (feeding starts when `legOpen`; lay completion still requires `plug-gate`) and assign seats 2+ to feed while seat 1 approaches the plug.
  - `test/railway-leg4-rules.test.ts` (and gated-frame rule tests if generalized) + `test/loop-graph.test.ts`: assert pre-feed while shut, no lay before gate, immediate lay on `rail.gate`, and conservation invariants.
- **World bump:** **No `WORLD_NS` bump needed.** No component schema, wire shape, halt id, or save format changes; every existing save remains valid under the relaxed invariant. (Ship server and client together as usual so a client predicting `legStock` on a shut gate isn't refused by an older server.)
- **Risks:** `railway-check-route.ts` and existing gate-refusal unit tests (`test/railway-leg4-rules.test.ts`, leg 2/3/5/6 gate tests if generalized) expect `legStock` to return 0 while shut—update them in the same commit. Verify `legKitNeed` / `legRackNeed` (already read `row.logs`/`row.rails` without checking `sec.gate`, so kit conservation holds automatically).

## Done means

- **Look 1 (shut plug, full frame):** `--rail-seed cave-open` with the plug still shut (or a fresh `bay-2` room before `rail.gate plug`), after feeding 20 logs + 20 rails into frame 1 via `--eval`: frame 1 shows full stacks, intake shut, no Feed prompt, and the pointer/text pointing at the plug barrier; `Leg.start === -1`.
- **Look 2 (instant lay on pop):** From Look 1, press `rail.gate` on the plug: barrier clears and section 1 begins laying immediately on the same tick (`Leg.start === tick`), with no extra Feed press needed.
- **Loop check:** `npm run loop -- run --players N --order canonical --no-probes --json` (N = 1, 2, 3): **1p `plug-gate` + `cave-1` elapsed unchanged (≤ 0 s regression)**; 2p and 3p `plug-gate` + `cave-1` combined unassigned idle drops substantially.

## Open questions

1. **Apply pre-feeding to all gated greybox frames, or only the sea-cave plug?**
   - **All gated greybox frames (Recommended).** One rule matches Line 2 (`d-2026-11-08-fill-a-gated-stretch-before-its`) and cuts co-op idle at `canopy-gate`, `deep-gate`, `notch-gate`, and `causeway-gate` too.
   - Only `plug` (`cave` section 1). Smaller test diff, but leaves inconsistent rules between gates.
   - Answer: ___
2. **Can a player at West Landing with the room's shared `pick` open the plug as soon as `bay-2` lays, even while Player 1 is still at Canopy?**
   - **Yes, keep today's rule (Recommended).** `pick` is already a shared room grant and `cave` already opens at `bay-2` (`order-choice`), so co-op rooms that split up can both feed and pop the plug without waiting.
   - No, require Player 1 / cloth first. Reverses `order-choice` and adds waiting.
   - Answer: ___
3. **Should the full-frame-waiting-on-gate cue use the existing `finished-deposits` pointer style (no new HUD), or add a world sign line?**
   - **Existing pointer + short placeholder label on the frame ("Waiting on the plug (placeholder)") (Recommended).** Keeps HUD clean (principle 11) and reuses `d-2026-11-17-finished-deposits-read`.
   - Pointer only, no text. Cleaner, slightly less explicit in greybox.
   - Answer: ___

## Parked

- **Slapstick plug-clearing prep (Job 3):** 2–3 sandstone wedges or timber props on the cave mouth that friends can pry/knock loose together with physics tumble, saved for the dedicated "breaking the plug" depth brainstorm (`greybox-leg4.md`).
- **Cave apron Roundhouse prompt:** Once the cave line's Quick/Strong trade ships (`order-choice`), a small fingerpost or board at West Landing pointing back to Home's Roundhouse so a player waiting on a friend notices the cave line can be tuned before Port Quay.
