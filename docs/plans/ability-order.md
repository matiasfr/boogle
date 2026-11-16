> **Status: candidate A approved and implemented on 15 November 2026; validated for independent review, not shipped.**
> Owner picks: "fly first" and "Yes, for now". Recorded first in
> [the dated decision](../decisions-core-loop.md#d-2026-11-15-fly-first); supersessions and Current rules updated;
> `npm run decisions` passed. Independent review belongs to the parent.
>
> **Save / mixed-build exception:** the owner's explicit instruction to preserve progressed rooms replaces this
> proposal's namespace-reset item (review call 24). No saved shape, operation name or existing ring id changes;
> `WORLD_NS` stays unchanged. Hook-only and past-summit rooms can take the now-live device; owned gliders remain
> owned. An old `sea=true` at Q2/Q3 stays open and still cannot fund Q5 early. New pulls require Q4. The glider's
> old `done >= 5` load invariant is removed; checksum, atomic-load and conservation guards stay. Old tabs must
> reload: their summit sea-switch commands fail the new server's position check, and their old seal view remains
> stale until reload. New early-glider saves cannot be rolled back to the old validator; update server and clients
> together. No version fence, migration framework or promise of old-client presentation compatibility is added.
>
> **Designer items implemented:** empty socket from start; Q4 drum seating/ring swing and gate-post lights;
> far-jamb landing above double-jump interaction reach even from the headstock; first-climb faint glider with no
> shaft/seal/wake; forge-facing vane; Q5 retains boiler/Far Head; carry restrictions, shared take/flourish and Glide
> glyph retained; alcove/firstpull bay availability deferred to trains; loop orders, bot and seeds updated.
> Hook-to-glider timing and fun are not established by checks. The climb is optional and flight does not shorten
> subsequent hauling, as the owner accepted. G17/G18 remain their separately queued control work.

## Implementation evidence, 15 November

The namespace remains `v47`, following the owner's explicit save requirement. No saved field was added or moved.
Past-hook and past-summit saves load directly and may take the glider; previous Q5 gliders retain ownership;
previous early sea pulls retain their open gate and continue to Q5 only after Q4. Host tests cover restart,
old-summit position rejection, one shared Q2 take and duplicate requests; replica tests cover races and reload.

The seed golden changes **only `glide-earned`** (Q2, tick 1582, rather than Q5, tick 3099). The adapter trace is
re-recorded for the deliberate early-glider/Q4-sea rules and that seed: 33 client rows across fresh through
`glide-earned` change; later stages, prediction-only trace and all tick-order fixtures stay identical. This is
part of the owner's save-preserving rule-change exception, not a refactor golden refresh. The malformed-save
corpus drops only the removed Q5-glider restriction. The train-wait test now uses `q5-done`, and the host-read
expectation for `glide-earned` describes Q2. Independent review should check these keyed differences.

**Checks:** `npm run decisions` passes (no quote loss); `npm run check` passes (2,172 unit tests, lint,
typecheck, registry, level checks, assets, prefabs and Vite build); `npm --prefix server test` passes (387 tests);
`npm run checkpoints` passes (25 server-save seeds); `npm run loop -- run` passes all modelled orders;
`npm run test:net` passes 190/190 checks. The targeted line-two/replica tests passed 30/30 and host tests 8/8;
after strengthening the material-carry refusal probe, line-two passed 17/17. Final tooling edits passed lint
and typecheck again. After connecting the jamb masonry, lint, typecheck, prefab build, 15 prefab tests,
place level-check and Vite build passed again.

**Required level states:** `hook-glide-q2` passes with actual logs/rails carried: the balcony is reachable,
Far Head and the sea stack are not, and no later gate, boiler, kiln or Q4/Q5/Q6 bill starts early.
`second-jump-no-hook-q4` passes: even granting access to the machine gantry/headstock and nearby terrain,
the double-jump interaction ceiling is 36.98 m, below the 38 m switch; the hook pull is 17.57 m of its 24 m range.
This is a conservative reach bound, not a physics trajectory witness. `npm run level-check -- --place=place`
passes all 11 reports. Existing report-only z-fight rows and planned-track warnings remain; no new allowances.

**Rendered evidence:** solo `--to t1-done` passes; two-player `--to T2 --warp-speed 3` passes with 232
matching same-step hashes (`.look/playthrough/ability-order-t1` and `.look/playthrough/ability-order-coop`).
The co-op harness flags warp-clock drift; it is functional evidence, not timing/feel evidence. The first co-op
attempt timed out after both pages returned to spawn during tooling edits (suspected module reload); its report
is retained under `.look/playthrough/ffa19bc09`. The unchanged-source rerun completes. `world-inputs` passes.

The Q2 take-and-flight probe passes: finder card, one flight, dry landing 4.1 m from the forge apron target,
10 m/s full-stick speed and 3.2 m/s sink. The final gate probe passes with real input: one pull, dry jamb landing
at y 38.44 m, accepted switch and removed gate collider. Stills and motion sheets were inspected; real-time motion,
phone controls, the full fresh route through Q5 and live Q4 installation timing remain unverified.

**Still paths (relative to this checkout):**

- `.look/ability-glider-first-v2-still.png` — lit, unsealed first-climb prize at Q2.
- `.look/ability-gate-empty-final-still.png` — permanent empty mount, no drum/ring at Q2.
- `.look/ability-gate-final-still.png` — Q4 drum/ring on the connected far jamb, away from the machine.
- `.look/ability-summit-gate-final-still.png` — **yes, the sea gate is visible from the summit's east edge**.
- `.look/ability-first-flight-motion.png` and `.look/ability-first-flight-curves.png` — take and glide home.
- `.look/ability-gate-pull-final-motion.png` — one hook pull, then the gate drops.

Logs are retained in `.look/ability-order/checks/`. The initial incorrectly framed stills and the unenabled
prefab captures are superseded by the final paths above. The ring and drum placement, landing height and reach
anchor are shared with the level/authority checks; the masonry connector's top is below the headstock bound.

**Files touched by the implementation (the plan cherry-pick is separate):**

```text
content/built/prefabs.json
dev/economy/place-level.ts
dev/look/bots/railway.ts
dev/look/evals/jump-land-probe.ts
dev/loop/graph.ts
dev/loop/run.ts
docs/agent-calls.md
docs/decisions-archive.md
docs/decisions-core-loop.md
docs/decisions-process.md
docs/game-design/place.md
docs/plans/ability-order.md
server/test/railway-line-host.test.ts
src/adapters/railway-intents.ts
src/content/prefabs/railway.ts
src/entities/railway/glide-device-view.ts
src/entities/railway/halts-view.ts
src/entities/railway/hook-shot.ts
src/entities/railway/hook-view.ts
src/entities/railway/line2-view.ts
src/entities/railway/sea-gate-view.ts
src/place/tech-layout.ts
src/sim/railway-check-line2.ts
src/sim/railway-line2-layout.ts
src/sim/railway-seeds.ts
src/sim/railway-sys-line2.ts
src/world/railway-jump.ts
src/world/railway-server.ts
test/fixtures/railway-bad-worlds.ts
test/fixtures/railway-golden.json
test/fixtures/railway-m12-trace.json
test/railway-line2.test.ts
test/railway-m10c-review.test.ts
test/railway-m11-review.test.ts
test/railway-m12.test.ts
test/railway-replicate.test.ts
```

**Draft copy for the owner (not The Boogler):** removed “Sealed until the line reaches Far Head”, “The glider is
awake”, and “Up on Needle Bell’s summit”. Jump-in line changed from “Q4 laid; the summit switch is next” to
“Q4 laid; the sea gate switch is next”. Existing “Take it”, “The glider”, “Open it in the air.” and “Pull” stay.

# The order of the hook, the summit, the glider and the sea gate

## Goal

Each move is usable the moment you get it, has a job you can see at that moment, and nothing arrives before the
thing it is for. Serves DESIGN.md 7 (Telegraph everything) and 11 (Show, don't tell). Candidate A bends 7 lightly
(a switch that is not there until its line arrives), answered by the empty mount below. Owner calls
applied: "Grant's ideas are weighed on merit", "Place for the look, not the cost; terrain may change", "Playtest
before bespoke functionality" (no new mechanic here: the same four pieces, moved), "Save resets never block
development".

## The owner's words and the evidence

- Owner, 15 November: "it'd be weird if you aren't able to use it when you get it. So we still have to fix that
  design problem differently ... as soon as I'm able to get the hook shot, I want to use it and then I go up to the
  top and then I get the glider, but then I also unlock a gate, which feels like it should come later in the game. So
  anything's on the table as far as moving things, whatever we need to do for it to make sense as a good design."
- Owner, 14 November ([tracker](round-4-notes.md), row 31): "As soon as I unlock the grapple hook, the player wants
  to go up to the top of the pinnacle, but there isn't the glider to get there, which feels like weird pacing."
- Grant, 14 November (row G9): he wants to take the glider on the first climb.
- Owner, 9 November (the seed of [glider-placement](../brainstorms/glider-placement.md)): "glider should be
  introduced towards the earlier side of the game, since it could be used later in the game and upgraded."
- Against, all his: 3 November, "Spread abilities out: hook to glider was 49 s" (tracker, round-4 list);
  5 November, the decision that followed it, "Abilities: a construction job between hook and glider"
  ([core loop](../decisions-core-loop.md#d-2026-11-05-design-proposals-and-exposure), in force and built);
  8 November, the glider was "wanted ... later in the game"
  ([process](../decisions-process.md#d-2026-11-08-the-glider-is-deferred-not-cut)).

**"The gate" is the sea gate.** Line 2 has two: the quarry gate (a slab across the track at s 186, opened by the
lever on the quarry apron, `rail.lever`, only after Q3) and the sea gate (a slab at s 297, opened by the switch on
Needle Bell's summit, `rail.sea`, with no condition: `src/sim/railway-sys-line2.ts:295-322`, positions in
`src/place/tech-layout.ts` `GATES`, `LEVER`, `SEA_SWITCH`). The switch on the summit is the only gate control near
the glider (4.5 m from it), and it is the one Grant and the owner both pulled on the first climb.

**Grant's session** (`node dev/playtest/cli.ts mwh4pmui-mpbh7trk`, session clock):

| Clock | What |
| --- | --- |
| 15:27 | Q2 laid; 15:30 the hook |
| 15:32 to 16:10 | Eight pulls (the seven the climb needs and the nook); 16:11 the summit: **41 s after the hook** |
| 16:14 to 16:22 | "Sealed until the line reaches Far Head", four times; 16:18 the sea switch pulled |
| 20:49 | Q4 laid: the first moment the sea gate would have stopped the machine, **4 min 31 s after it was opened** |
| 23:31 | Q5 laid, Far Head, the glider wakes |
| 25:05 to 25:24 | The second climb, 19 s (94 s after Far Head); 25:26 the glider; 25:34 the first glide |

The owner's own run (`mwg52ang`): the hook at 3:01, the summit 34 s later, the switch 6 s after that.

## Diagnosis

Needle Bell's first slab (t0) hangs 16 m from the hook pillar (p2), the tower's eight rings have been in view since
the start, and the climb takes 19 to 41 s. **So in any layout where the tower can be entered, the summit is reached
within a minute of the hook.** That has now produced three complaints, each one a fix for the last:

1. 8 November: the switch on the summit did nothing until Q4 ("the sea switch did nothing",
   [puzzle-order](../brainstorms/puzzle-order.md)). Fix: it opens whenever it is reached.
2. 14 November: the summit then held a dark, silent glider (row 31). Fix: the seal, with a reason.
3. 15 November: the seal refuses you (G9), and the gate now opens two stations before anyone has met it.

The summit is reached at Q2; what stands on it is due at Q4 (the gate) and Q5 (the glider). Either the summit's
contents move to when the summit is reached, or the summit moves to when its contents are due. Those are the
candidates.

## The route today

Local metres (world x is local + 1000), from `src/sim/railway-line2-layout.ts` and `src/place/tech-layout.ts` by a
throwaway script; walking at 5.6 m/s, gliding at 10 m/s; glide budgets from `npm run level-check -- --place=place`
(exit 0 on this base).

| Place | Position | Notes |
| --- | --- | --- |
| The forge; its rail rack | (−88, −12); (−84.5, 10) | Q1 to Q3's rails are carried from the rack by hand; the rack is 101 m from the summit and 81 m from the tower's foot |
| Q2's frame | (−40, −2) | Laying Q2 builds the walk to p2 (41 m away) |
| The hook pillar p2 | (−4, 18) | `rail.hook`: after Q2 |
| Needle Bell: t0, then the summit | (8, 8) at 24 m; (15, −6) at 102.4 m | Six more slabs, 13 m a pull |
| Q3's frame | (28, 27) | 27 m from t0 |
| The quarry lever, and its gate | (97, 42); gate at s 186 | A 2.2 m ledge: two jumps. 12 m apart |
| Q4's frame | (82, 31) | Its stretch ends at s 286, 11 m short of the sea gate |
| The sea gate; Q5's frame | (180, −31); (167, −28) | **167 m from the summit** (glide budget 188 m); 176 m in a straight line from t0 (about 31 s; not a walked path). Level-check's flood reaches the gate on foot |
| Far Head (Q6's frame) | (373, −184) | 400 m from the summit (level-check measures 411 m to its own point): not flyable (budget 188 m) |
| From the summit by glide | the forge 103 m, its rack 101 m, the village 117 m (budget 203 m), the balcony secret 147 m (budget 187 m), the lever 95 m | |

Today's order: T3, the second jump · the forge, the pack · Q1 · Q2, **the hook, the summit, the sea switch (gate
opens), the glider refused** · Q3, the lever · Q4 · Q5, Far Head, the glider wakes · back 400 m, the second climb,
**the glider** · the boiler, trains · Q6, the pier.

## The candidates

Clocks are Grant's, shifted; they are estimates, not measurements. The second jump (after T3) and the quarry lever
stay where they are in all three: [Loop orders, 9 November](../decisions-core-loop.md#d-2026-11-09-loop-orders) is
untouched.

### A. Fly first: the glider is the summit's prize, and the sea switch goes down to its gate

| Piece | Where and when |
| --- | --- |
| The hook | Unchanged: p2, after Q2 (15:30) |
| The summit | Reached at once (16:11). It holds **the glider, lit and turning from the first minute of the game**, and nothing else |
| The glider | Taken on the first climb (about 16:15) and usable at once. `rail.glide` loses its "after Q5" condition; the seal, the bands, the wake and its banner go |
| The sea switch | Leaves the summit. It stands **at the sea gate**, on a ledge of the gate's jamb one hook pull above the deck, on the side away from the parked machine (or on the lintel). From the first minute the ledge shows a **visibly empty mount**: no drum, no ring, no prompt. When Q4 is laid and the machine stops at the slab (20:49), its arrival seats the drum and swings the ring out, the way Q2 builds the hook walk and Q3 connects the winch, and the gate's posts light. `rail.sea` gains "after Q4" |
| The sea gate | Opens when it is the thing in your way, where you stand, in front of you: about 21:00 instead of 16:18 |

**What each is for when you get it.**

- *The hook* (15:30): the tower, at once, as now; then the secrets it already reaches (the nook, the loft, the
  alcove); then the sea gate's ledge at Q4. It stays the only way up, so every flight starts with it.
- *The glider* (16:15): the way down. The device faces you west as it does today, so the first flight comes down by
  the forge rack (101 m), where Q3's 12 rails wait: the one time it helps the work. After that it is not a faster
  way to haul: a flight needs the climb first (19 s at best), which only beats walking past about 242 m, and nothing
  the summit reaches is beyond 203 m; hand-hauls from the forge end at Q3 anyway. Its other uses on Home are the
  balcony secret (147 m), the flight home to the boiler after Far Head (today's beat, which Grant liked, now a
  choice and never a refused climb), and then the crossing to Ring Island
  ([decided, 14 November](../decisions-rail.md#d-2026-11-14-gap-readability-answered)).
- *The sea switch* (21:00): the gate you have just been stopped by. One pull up, Pull, and the slab drops at your
  feet; the shared gate shot plays as decided.

**Times.** Hook to glider: 45 s. Glider to the gate: about 4 min 45 s. The gate costs about 10 s at Q4 (it cost
7 s at 16:18). The forced second climb (94 s back from Far Head, 19 s up) becomes optional. Route length within
±20 s of today.

**Why the switch needs a rule and not only a place.** With the glider owned at Q2, anything within about 188 m of the
summit can be reached early, and the sea gate is 167 m away; level-check's flood reaches the gate on foot as well.
Distance cannot make the gate "later"; only its own line arriving can. The 8 November complaint about a dead switch
does not come back, provided the ring is not offered before the drum: that switch ended a 102 m climb and offered a
prompt. Here an early visitor finds a mount with nothing on it and no way up to it, and the drum arrives where you
are standing.

**Risks.** (1) Hook and glider arrive 45 s apart: two cards and two new controls inside a minute, which is his
3 November note and his 5 November decision. (2) **Nothing on Home needs the glider, and after the first flight it
has no second job there** beyond the way down and one secret. By this doc's own goal it arrives before the thing it
is for (the crossing to Ring Island); question 2 puts that to the owner. (3) **The Needle Bell climb becomes
optional.** Today the sea switch forces it. Nobody is stranded by skipping it (a missed glide at Ring Island swims to
a ramp), and all three recorded sessions climbed within 41 s of the hook. (4) Reach is not checked. Two level-check
states must be added and pass before a build ships: `hook + glide, line at Q2` (the budgets say Far Head and the sea
stack stay out of range; nothing funds, lays or opens early), and `second jump, no hook, Q4 laid` with the switch's
ledge out of reach (the `q4-done` still shows the machine's gantry at about two thirds of the jamb's height beside
the right-hand jamb, so a second jump off it might reach a ledge on that side). (5) Not seen: whether the gate can
be seen from the summit's east edge; the ledge, mount and ring do not exist yet.

### B. One climb, when it is due: the hook moves to Q4

| Piece | Where and when |
| --- | --- |
| The hook | p2 stays where it stands, but **Q4** builds its walk instead of Q2, and `rail.hook` becomes "after Q4" (20:49). The pillar and the tower are a tease for the nine minutes before |
| The summit | Reached about 21:50: walk back from the rail's end (192 m, 34 s), the card and first pull, the climb |
| The sea switch | Stays on the summit, opens when pulled: now pulled while the machine is standing at the gate |
| The glider | On the summit, lit, taken on that climb, usable at once. `rail.glide` becomes "no condition" |
| The sea gate | Opens about 21:55, in the room's gate shot |

**What each is for when you get it.** *The hook*: the tower, at once, to open the gate the machine is waiting at.
*The switch*: that gate. *The glider*: the flight from the summit down to the open gate and Q5's frame, 167 m
(budget 188 m), where the next bill is. Every piece has a required job within a minute, in one beat.

**Times.** Nothing new from the forge (11:43) to Q4 (20:49): four stations of hauling with only the pack and the
lever. Then the hook, the gate and the glider inside about 80 s. Q5 funded about 90 s later than today. Hook to
glider: about 45 s, as in A.

**Risks.** (1) The first half of line 2 loses its only new move, in the stretch Grant already found short of
decisions (G5, G6, G21; [first-line-decisions](../brainstorms/first-line-decisions.md)). (2) The 167 m flight has a
21 m margin; a miss lands on the rim and walks. (3) It changes more: route v2's Q2 walk, the bot's order, the
`hook-taken` seeds, and the secrets that wait on the hook.

### C. Hook first, tower later: the hook keeps Q2 and gets the quarry; the tower opens at Q4

The 4 November [ability-pacing](../archive/plans/ability-pacing.md) proposal. The hook comes at Q2 and its first job is the quarry
lever's ledge at Q3 (a ring replaces the two-jump approach); Needle Bell's rings stay dark until Q4, then the summit
gives the switch and the glider as in B. It is the only candidate that keeps hook and glider five minutes apart.

**It fails on the evidence.** The tower can be kept shut honestly, by leaving out the first slab (t0, 16 m from p2)
until Q4 builds it, as the 4 November proposal said; no refusing ring is needed. It still loses. Row 31 and the
15 November answer both say the first want after the hook is the top, and this candidate denies that want for five
minutes (15:30 to 20:49) with the tower in view. Kept here for completeness; not recommended.

## Comparison

| | Today | A. Fly first | B. One climb at Q4 | C. Tower later |
| --- | --- | --- | --- | --- |
| The hook | 15:30 | 15:30 | 20:49 | 15:30 |
| The summit first reached | 16:11 | 16:11 | about 21:50 | about 21:10 |
| The glider usable | 25:34 | **about 16:15** | about 21:55 | about 21:15 |
| The sea gate opens | 16:18 | **about 21:00, at the gate** | about 21:55 | about 21:15 |
| Hook to glider | 9 min 56 s, with a refusal between | 45 s | 45 s | about 5 min 45 s |
| Something refuses you | The glider, 4 times | Nothing | Nothing | The tower, 5 min |
| Forced climbs of Needle Bell | 2 | 1 | 1 | 1 |
| New moves between the forge and Q4 | The hook | The hook, the glider | None | The hook |
| Needle Bell on the main line | Required (the switch) | Optional | Required | Required |
| Sim rules changed | | `rail.glide`, `rail.sea`, the switch's place | `rail.hook`, `rail.glide`, Q2's and Q4's walk | `rail.glide`, the lever's approach, t0 built by Q4 |

## Recommendation: A

A is the sentence the owner said, with the gate taken out of it: the hook, the top at once, the glider there and
working, and the gate later, at the gate. It is the smallest move (one device's condition, one switch's place and
condition) and it removes all three of the summit's complaints at the root, because nothing on the summit is early
any more. It also matches his 9 November seed that the glider belongs "towards the earlier side".

Its cost is real and is his to accept: hook and glider 45 s apart, which undoes his 5 November decision ("a
construction job between hook and glider") and the 3 November note behind it. What softens it: the hook stays the
glider's ladder (every flight from Needle Bell begins with seven pulls) and the hook alone opens the sea gate at
Q4. What does not: two cards and two new controls inside a minute, and a glider with nothing on Home that needs it.
B pays the same 45 s, moves the hook five minutes later into the stretch Grant found emptiest and bunches three
rewards into about 80 s; C keeps the spacing by denying the top. If he wants the construction job kept between
them, there is no candidate here that also gives him the top at once; B is the nearer alternative, not C.

Not proposed: updrafts over the water (Grant, G25). They would give the glider a required job on Home and are worth
their own brainstorm, but they are a new mechanic, and "Playtest before bespoke functionality" holds them.

## Recorded decisions each candidate changes

Nothing below changes until the owner answers; each stays in force.

| Decision or call | A | B | C |
| --- | --- | --- | --- |
| [Core loop, 15 November, answer 3](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered): usable when taken; the order may be redesigned | Carries it out | Carries it out | Carries it out |
| [Process, 8 November, "the summit switch opens early"](../decisions-process.md#d-2026-11-08-the-summit-switch-opens-early-switch): the first summit pull opens the sea gate whenever reached | **Replaced**: the switch is at the gate and opens after Q4. Its zoom shot stays | Kept in letter; "early" no longer happens | As B |
| [Process, 8 November, "the hook shot comes into the game"](../decisions-process.md#d-2026-11-08-the-hook-shot-comes-into-the): "the sea switch stays on the summit"; "rejected for now: ... a temporary switch at the foot" | **Changed**: the switch leaves the summit (to its gate, not the tower's foot) | Kept | Kept |
| [Core loop, 5 November, "design proposals and exposure"](../decisions-core-loop.md#d-2026-11-05-design-proposals-and-exposure): "Abilities: a construction job between hook and glider" (in force, built `9f986ad6`), from the tracker's 3 November "Spread abilities out: hook to glider was 49 s" | **Replaced**: 45 s apart, no job between. His 9 November seed ("towards the earlier side") is later and leans this way, but does not name the spacing | **Replaced**: 45 s apart | Kept |
| [Process, 8 November, "the glider is deferred, not cut"](../decisions-process.md#d-2026-11-08-the-glider-is-deferred-not-cut) ("wanted it later in the game"; about when it was built, not where it sits) | The glider comes about nine minutes earlier | About four minutes earlier | About four minutes earlier |
| The loop graph's free order "sea / Q4" (`dev/loop/graph.ts`) | **Fixed**: the sea gate after Q4 | Fixed in practice | Fixed in practice |
| [Process, 6 November, "start the line-2 move now"](../decisions-process.md#d-2026-11-06-start-the-line-2-move-now) ("Q2 hook walkway") | Kept | **Changed** with route v2 | Kept |
| [Process, 6 November, route v2](../decisions-process.md#d-2026-11-06-route-v2-and-the-cove-become): "Q2 builds the walkway to the hook pillar" | Kept | **Changed**: Q4 builds it | Kept; the lever's approach changes |
| [Process, 8 November, "fill a gated stretch before its switch"](../decisions-process.md#d-2026-11-08-fill-a-gated-stretch-before-its) | Kept: Q5's frame fills before the pull | Kept | Kept |
| [Controls, 10 November, shared moments play for everyone](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) | Kept; the shot now starts at the gate | Kept | Kept |
| [Core loop, 9 November, Loop orders](../decisions-core-loop.md#d-2026-11-09-loop-orders) (the second jump after station 3) | Kept | Kept | Kept; the lever stops needing it |
| [Rail, 14 November, gap readability](../decisions-rail.md#d-2026-11-14-gap-readability-answered) (the glide is the crossing) | Kept | Kept | Kept |
| Open agent calls ([agent-calls](../agent-calls.md)): the 14 November seal and its bands; the 10 November wake cue and banner "The glider is awake"; the 9 November glider-B calls (Q5's edge wakes the summit and casts the boiler together; the first flight lands at the boiler so Q5's two pulls are one trip; the bot's order; the halts' map canopy; "no weak starter cloth", kept); the 9 November secrets order (which box goes to the bay with which ability) | **Retired or re-derived**: no seal, no wake. The flight to the boiler stays possible and is no longer the first. Call 17 of glider-placement, "the glider gates nothing on Home's main line", is kept | As A, and the hook's secrets move later | As A |

**What a build of A would touch** (for the planner; no code here): `rail.glide` and `rail.sea` in
`src/sim/railway-sys-line2.ts` and their read helpers; `SEA_SWITCH` and the gate's jamb, ledge and ring in
`src/place/tech-layout.ts`; `line2Routes` (Q4's arrival seats the drum and ring); `glide-device-view.ts` (the seal
goes); the summit's post line; `SECRETS`' `after` for `alcove` and `firstpull` (to `'trains'`: `'glide'` would now
fire 45 s after the hook); the bot's order and the seeds `hook-taken`, `glide-earned`, `q5-*`; the loop graph's
order facts and `npm run loop -- run`; the two level-check states above; `docs/game-design/place.md`. A rule's meaning
changes, so one `WORLD_NS` bump. Sim tier: independent review before main.

## Owner questions

Two; the designer's review found no third that only he can answer.

1. **Take A: the glider is yours on the first climb, 45 s after the hook, and the sea switch moves down to its gate
   and arrives when the line gets there?** Recommended: yes. It replaces your 5 November "a construction job between
   hook and glider" and your 8 November "the summit switch opens early" and "the sea switch stays on the summit".
   Alternative: B, the hook waits until Q4 and one climb gives the gate and the glider together.
2. **In A nothing on Home needs the glider, and the Needle Bell climb becomes optional. Leave it that way for now?**
   Recommended: yes for now, with the sea switch one hook pull up the gate's jamb (so the quarry gate uses the second
   jump and the sea gate uses the hook). You said on 12 November that puzzles are not authored during the greybox;
   when they are, the sea gate is the first place for a short hook-then-glide lock. Alternative, not recommended: the
   switch reachable only by the 167 m flight from the summit (21 m to spare), which makes the climb and the glider
   required and costs about a 50 s walk and climb before the first try and about a minute on a miss.

## Design review (designer, 2026-11-15)

_Folded in (15 November): findings 1 to 6, the factual corrections and the reframed question 2 are now in the text
above. The review below is as written against the first draft, so where it says "the doc does not cite" or quotes a
phrase, that was the draft._

**Verdict: ready with changes.** A is the right candidate and I would not swap it for B or C. Five things should
change in the doc before it goes to the owner (findings 1 to 5); none of them changes the recommendation. Nothing
here is an owner decision.

Read against DESIGN.md (7, 8, 10, 11), [owner-calls](../agents/owner-calls.md), the Current rules and dated entries of
core loop, process, rail and controls, [round-4-notes](round-4-notes.md) (G5, G9, G17, G18, G25, row 31, the
3 November list), [level-pacing-1114](level-pacing-1114.md), [ability-pacing](../archive/plans/ability-pacing.md),
[glider-placement](../brainstorms/glider-placement.md), [puzzle-order](../brainstorms/puzzle-order.md), and the
research index: [progression-flow-layout](../research/progression-flow-layout.md),
[route-contract](../research/route-contract.md), [movement-abilities](../research/movement-abilities.md),
[ability-upgrades](../research/ability-upgrades.md). Code and data read: `rail.lever`, `rail.hook`, `rail.glide`,
`rail.seaSwitch` in `src/sim/railway-sys-line2.ts`; `src/sim/railway-line2-layout.ts`; `src/place/tech-layout.ts`.
Run on this base: `npm run level-check -- --place=place` (exit 0), `node dev/playtest/cli.ts` for `mwh4pmui-mpbh7trk`
and `mwg52ang` (node 26), `npm run loop`, a script over the layout modules for every distance, and three stills
(`q4-done` from the rim toward the gate, `q4-done` from the summit deck toward the gate, `hook-taken` from p2 toward
t0).

### What I checked and found right

- **Every clock time in Grant's table**, against the session: Q2 laid 15:27, the hook 15:30, eight pulls with the
  nook 15:32 to 16:10, the summit 16:11, "Sealed until the line reaches Far Head" refused four times, the sea switch
  16:18, Q4 laid 20:49, Q5 laid and the wake 23:31, nine pulls 25:05 to 25:24, the glider 25:26, the first glide
  25:34. The owner's run: the hook 3:01, the summit 3:35, the switch 3:41. One thing the table leaves out and A
  answers: Grant stood idle 21 s on the summit at 16:42, after the switch, with nothing pointing on.
- **Every position and distance in the route table**, from the layout modules: p2 (−4.3, 18.0), t0 (8, 8), 15.9 m
  apart; the summit (15, −6) at 102.4 m; Q2's frame to p2 41.1 m; Q3's frame 27.4 m from t0; the lever to the quarry
  gate 12.2 m; the sea gate at (179.9, −30.9); the summit to the sea gate 166.8 m, to the lever 95.5 m, to the forge
  103.2 m, to Q6's frame 399.5 m, to the balcony 146.8 m; the switch to the glider device 4.46 m. Budgets as
  level-check prints them: 188 m, 203 m, 187 m.
- **"Distance cannot make the gate later"** is right, and stronger than the doc says. The gate is inside the glide
  budget, and level-check's flood reaches it on foot as well, so a switch at the gate with no rule could be pulled
  from Q2 with or without the glider. The rule is needed either way.
- **The rules as described**: `rail.seaSwitch` has no condition, `rail.lever` needs Q3, `rail.hook` needs Q2,
  `rail.glide` needs Q5. A's "after Q4" on the sea switch is the quarry lever's own pattern.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The hook stays on p2 and comes with Q2 | Decided | [Process, 6 November, route v2](../decisions-process.md#d-2026-11-06-route-v2-and-the-cove-become); [8 November, the hook shot](../decisions-process.md#d-2026-11-08-the-hook-shot-comes-into-the) |
| 2 | The tower can be climbed the moment you have the hook; nothing refuses you | Decided | [Core loop, 15 November, answer 3](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered); row 31 |
| 3 | The glider is usable when taken; no seal | Decided | The same answer: "it'd be weird if you aren't able to use it when you get it" |
| 4 | The glider is taken on the first climb, about 45 s after the hook; `rail.glide` loses "after Q5" | New | **Yes.** It is his 15 November sentence. It replaces an owner decision the doc does not cite (finding 1). Owner question 1 |
| 5 | The sea switch leaves the summit and stands at the sea gate | New | **Yes.** Changes 8 November "the sea switch stays on the summit". Owner question 1 |
| 6 | The sea gate opens only after Q4 is laid (`rail.sea` gains "after Q4") | New | **Yes.** His "feels like it should come later". Replaces 8 November "opens whenever it's reached". Owner question 1 |
| 7 | The switch is reached by one hook pull to a ledge on the gate's jamb | New | **Yes, with a reach proof and on the jamb away from the machine** (finding 5). Keeps the loop graph's "sea after hook" true |
| 8 | The switch is "dark and sunk flush, with no prompt" until Q4, then the drum rises | Default | **Change it:** a mount that is visibly empty from the start, and Q4's arrival seats the drum and swings the ring out (finding 4) |
| 9 | The glider gates nothing on Home's main line, so the Needle Bell climb stops being required | New | **Yes for now.** The second half is a consequence the doc does not state (finding 3). Owner question 2 |
| 10 | The device is lit and turning from the first minute | Default | Keep it faint and without a shaft: on 3 November both players called the shafts heavy-handed |
| 11 | The seal, its bands, the wake cue and the banner "The glider is awake" go | Default | Follows from 4. Draft UI copy, none of it The Boogler's |
| 12 | The device still faces the forge | Default | Kept from the open 9 November call. At Q2 it points at Q3's 12 rails on the rack, which fits better than it does today |
| 13 | The glider's jobs on Home: the way down, "the fast way to work", one secret | Default | The middle one is not true (finding 2) |
| 14 | Q5's edge gives the Far Head show and the boiler only; the second climb is optional | Default | A gain: it takes a detour out of Grant's low stretch (Far Head to trains, 7 min, G4) |
| 15 | The gate costs about 10 s at Q4 | Default | Accepted. It is a formality, not a puzzle; see owner question 2 |
| 16 | Logs and rails still glide at normal sink; a beam or boiler keeps the canopy shut | Default | Kept from the open 9 November call. Checked: no haul gets shorter by air (finding 2), and the boiler carry is untouched |
| 17 | The secrets' bay order is re-derived | Default | `alcove` and `firstpull` are `after: 'glide'` today, which in A is 45 s after the hook. Move both to `after: 'trains'` |
| 18 | The glider's first-fall teach (the Glide glyph) is kept | Default | It now follows the hook's card by under a minute. G17 and G18 (the hook on F, stopping the glide) are queued fixes and matter more here |
| 19 | The shared gate shot plays for everyone, from the gate | Decided | [Controls, 10 November](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) |
| 20 | Q5's frame fills before the pull | Decided | [Process, 8 November](../decisions-process.md#d-2026-11-08-fill-a-gated-stretch-before-its) |
| 21 | The take is shared: the card to the finder, the flourish to the others, inherited on join | Decided | 6 November shared progression; the 10 November entry above |
| 22 | The second jump after T3 and the quarry lever are untouched | Decided | [Core loop, 9 November](../decisions-core-loop.md#d-2026-11-09-loop-orders) |
| 23 | Updrafts (G25) are not proposed here | Decided | Owner calls "Playtest before bespoke functionality" and "Brainstorm new gameplay first" |
| 24 | One `WORLD_NS` bump | Decided | "Save resets never block development or architecture" |
| 25 | B: the hook waits until Q4 | New | **No** (see "A against B") |
| 26 | C: the tower opens at Q4 | New | **No**, but for a corrected reason (finding 6) |

Nine decided, eleven default, six new (four recommended yes, two alternatives recommended no).

### Findings that should change the doc

1. **The decision A changes most is not in the table.** [Core loop, 5 November, "design proposals and
   exposure"](../decisions-core-loop.md#d-2026-11-05-design-proposals-and-exposure) says "**Abilities:** a
   construction job between hook and glider". It is in Current rules, and its audit line shows it built (`9f986ad6`).
   The doc cites the tracker's 3 November note and the 8 November "deferred, not cut" entry instead; the second is
   about which build the glider came back in, not where it sits. A and B both replace the 5 November decision; C keeps
   it. Add the row, and name it in owner question 1, because it is the thing he is being asked to undo. His
   15 November sentence is later and describes exactly this sequence, so I expect a yes.
2. **"The fast way to work" is not true, and risk 2 understates the glider's weakness.** A flight has to start with
   the climb. The fastest recorded climb is 19 s (Grant's second). Climb plus flight is 19 s + d/10; walking is d/5.6;
   they meet at 242 m, and nothing the summit can reach is past 203 m. From the tower's foot the forge rack is 81 m,
   14 s on foot against 29 s by air. Hand-hauls from the forge also end at Q3 (`npm run loop`: Q3's rails are one
   114 m trip by hand; from Q4 "nothing on the bill comes on foot"). So the glider helps the work once: the first
   flight, when you are already at the top and Q3's rails are on the rack it faces. After that its jobs on Home are
   the way down and the balcony. Say that plainly. It also means A fails its own goal line for one piece: the glider
   "arrives before the thing it is for" (Ring Island's crossing). The research states the pattern A misses:
   "the key's first use is in sight of where you get it; its second use is the lock you remembered"
   ([progression-flow-layout](../research/progression-flow-layout.md#placing-the-tease-the-gate-and-the-key)). In A
   the hook gets both uses (the tower, then the gate's jamb at Q4). The glider gets the first only.
3. **A makes Needle Bell optional, and the doc does not say so.** Today the sea switch forces the climb. In A the
   hook is still forced (the jamb), but the tower and the glider are not. Nobody is stranded by that: a missed glide
   at Ring Island swims to a ramp ([gap-readability](gap-readability.md), finding 3), and three sessions of three
   climbed within 41 s of the hook. It is still a change to what Home's tallest landmark is for, and with finding 2
   it is the real question behind the doc's question 2.
4. **The dead-switch question.** As written, A does not bring back the 8 November complaint in its original form:
   that was a handle with a `Pull` prompt at the end of a 102 m climb, pressed 18 times. Two gaps remain.
   - The doc does not say when the jamb's ring is live. If it is live from Q2, a player can walk or fly to the gate
     at about 16:30, pull up to a ledge and find nothing there. That is a small dead end of the same family. The ring
     should not be offered before the switch is.
   - "Dark and sunk flush, with no prompt" hides the control, which bends DESIGN 7 and "a shut thing says why it's
     shut" (flow rule 2). The game already has a way to show a missing part: the old train's empty saddle, the pier's
     empty sockets. Use it: the jamb carries a visibly empty mount from the first minute, and the line's arrival at Q4
     seats the drum and swings the ring out, the way Q2 builds the hook walk and Q3 connects the winch
     (`line2Routes` in `src/sim/railway-line2-layout.ts`). An empty mount cannot be pressed, and the wake becomes
     construction you watch instead of a state that flips.
5. **Reach at the gate is unproved, and the still shows why it matters.** After Q4 the gate slab, its two jambs and a
   chained lintel stand 13 m past Station 5's frame and racks, and the track machine parks beside the right-hand
   jamb with its gantry top at roughly two thirds of the jamb's height. The jamb's top is 5.4 m over the bed
   (`GATE_SLAB`); a second jump adds 3.0 m; the switch is heard within 3.2 m across and 2.6 m of height. A ledge on
   that jamb could be reached, or the switch pulled, from the gantry without the hook. "Sea after hook" is a decided
   order held by the world only (`npm run loop`). Put the ledge on the jamb away from the machine, or on the lintel,
   and add a second level-check state beside the doc's `hook + glide, line at Q2`: second jump, no hook, Q4 laid,
   the machine standing at the slab, switch out of reach. Without it the reach claim is a finding.
6. **C's stated reason is wrong; its rejection stands.** The tower can be kept shut without a refusing ring: take
   the first slab away, or out of range, until Q4. That is what [ability-pacing](../archive/plans/ability-pacing.md) proposed
   ("physically separating the hook lesson from the tower entrance"), and "terrain may change" allows it. I could
   not confirm "about 3 m over ground": t0's top is 24.0 m and p2's 22.9 m, and the still shows t0 hanging beside the
   upper bank at about bank height. Level-check agrees it needs the hook. C still loses, because a missing step
   denies the top for five minutes just as a dark ring would, and both the 14 and 15 November notes name the top as
   the first want.

### A against B, and what is not listed

**A is better than B.** B fixes the same sentence by moving the hook five minutes later, into the stretch Grant
found emptiest (G5, his biggest issue), and then gives the hook, the gate and the glider inside about 80 s, which
bunches three things where A bunches two. It delays the hook's three secrets. Its one advantage is that the glider
gets a required flight, and that flight is 167 m with 21 m to spare, about 11%, where a miss costs the walk back and
the climb.

**The 3 November note still applies to A.** The doc's answer, that the hook is the glider's ladder, is fair: the
hook keeps its jobs after the glider arrives (Grant used it at the loft at 21:40 and the stack return at 23:23, and
A adds the jamb). What the answer does not cover is the load on the player: two cards and two new controls inside a
minute, with a 102 m step-off as the second lesson. I accept that, because the owner's later words ask for the
sequence, but it should be put to him as a change to his 5 November decision and not argued away.

**Not listed, and not better:** the hook at Q3 (the tower is then climbed at once and the gate opens early again);
the switch kept on the summit but asleep until Q4 (puzzle-order's option A, which the panel and the owner turned
down on 8 November); a weak starter cloth on the first climb (weighed on 9 November; a percentage upgrade against the
Breath of the Wild target).

**Co-op and late join.** The glider take is one shared take, so a partner hauling at Q3 gets the hook's flourish and
the glider's inside a minute. That is fine, and the flourish exists for it. The split puzzle-order liked ("one
stocks while the other climbs") leaves the sea gate, since the switch is 13 m from the frame, and stays at the
tower: one climbs for the glider while the other carries Q3's rails. Every gate stays solo-safe. A friend who joins
after the gate is open sees it flat and inherits both moves; nothing depends on having seen the tower.

**Route contract.** With the glider at Q2 the early reach is the balcony (a secret, fine), the quarry apron (the
lever is held by `rail.lever`'s Q3 rule), the Split-rock throat (held by the breaker) and the sea gate (held by the
new Q4 rule). Far Head is 411 m against a 188 m budget and the sea stack 333 m. Nothing funds, lays or opens early.
The doc's new level-check state must still pass before a build ships.

### Flow, as legs (A)

| Leg | Distance | Time | Pull at the end |
| --- | --- | --- | --- |
| Q2's frame to p2 | 41 m | 7 s | The device faces t0 |
| p2 to the summit | 7 pulls (8 with the nook) | 19 to 41 s | The glider, turning |
| The summit to the forge rack, by air | 101 m | about 10 s, then the descent | Q3's 12 rails |
| The forge rack to Q3's frame | 114 m | 20 s | The frame |
| Q3's frame to the lever | 71 m | 13 s | The quarry gate, 12 m off |
| Q4's frame to the sea gate | 116 m | 21 s | The slab, Station 5's frame 13 m short of it |
| Station 5's frame to the switch | 13 m and one pull | 5 to 10 s | The gate drops; the trestle |

- **Rule 1, the next goal can be found:** holds. From Station 5's frame the gate fills the end of the rail (still).
  The summit now ends facing work, where today Grant idled 21 s.
- **Rule 2, a gate keeps its meaning:** holds once finding 5 is proved.
- **Rule 3, nobody is stranded:** holds. Every gate is solo, the hook's walk is built by Q2, nothing can be lost.
- **Lens 4, the key in sight of the lock:** better than today for the hook. Open for the glider (finding 2).
- **Lens 8, a place to meet:** Station 5's frame.

**What I could not see.** The gate from the summit's east edge: my still from the middle of the deck shows only the
deck, the sea and the ring post, so "the gate is teased from the summit" is unverified. The proposed ledge, mount
and ring do not exist yet. Nothing here was walked.

### Small corrections

- "Every flight from Needle Bell begins with eight pulls": seven are required (t0 to t5 and the summit, `PADS`).
  Eight is Grant's first climb with the nook; his second was nine with the pull onto p2.
- "176 m on foot from t0 (31 s)" is the straight line from t0 to the gate (176.2 m), not a walked path.
- Far Head "400 m" is the summit to Q6's frame (399.5 m). Level-check prints 411 m to its own Far Head point.
- The rail rack stands at (−84.5, 10.1), 22 m from the forge's (−88, −12) and 100.8 m from the summit.
- The decisions table also misses: the loop graph's free order "sea / Q4" (`npm run loop` cites 8 November; in A it
  becomes a fixed order); the open 9 November call "no weak starter cloth before Q5", whose reason was the
  5 November decision; the open 9 November call that Q5's edge wakes the summit and casts the boiler together; and,
  for B, [6 November "start the line-2 move now"](../decisions-process.md#d-2026-11-06-start-the-line-2-move-now),
  which also names the Q2 hook walkway.
- "What a build of A would touch" should add: the loop graph's order facts and `npm run loop -- run`; `SECRETS`'
  `after` for `alcove` and `firstpull`; `line2Routes`; the second level-check state from finding 5.
- "Bends none" should read "bends 7 lightly as written" until the empty mount replaces the hidden drum.

### Suspect copy

None is The Boogler's. Draft UI lines that A retires: "Sealed until the line reaches Far Head", "The glider is
awake", "Up on Needle Bell's summit". Kept: "Take it", "The glider", "Open it in the air.", "Pull".

### Owner questions

Two, as the doc has. The first is right and needs one addition. The second asks him to pick a placement, which is a
call the build can take on a recommendation; what only he can answer is the direction underneath it.

1. **Take A: the glider is yours on the first climb, about 45 s after the hook, and the sea switch moves down to
   its gate and opens once the line gets there?** Recommended: **yes**. It replaces your 5 November "a construction
   job between hook and glider" and your 8 November "the sea switch stays on the summit" and "opens whenever it's
   reached". Alternative: B, the hook waits until Q4 and one climb gives the gate and the glider together.
2. **In A nothing on Home needs the glider, and the climb up Needle Bell becomes optional (today the sea switch
   makes it required). Leave it that way for now?** Recommended: **yes for now**. The sea switch takes one hook pull
   at the gate, so the hook has its lock and the glider waits for Ring Island. On 12 November you said puzzles are
   not authored during the greybox; when they are, the sea gate is the first place to give the glider a small lock
   in sight of the gate (hook up, then a short glide to the switch, where a miss costs seconds). Alternative: make
   the switch reachable only by the flight from the summit now. I do not recommend it: 167 m with 21 m to spare, a
   50 s walk and climb back from the gate before you can try, and about a minute lost on a miss.

Nothing else here needs him. Calls 7, 8, 10 to 18 are logged in [agent-calls](../agent-calls.md) as proposed.
