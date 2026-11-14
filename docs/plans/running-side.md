# Running side and request levers

Planned 14 November 2026 from the owner's play session that day. Not built. Nothing here is decided until he answers
the three questions at the end.

**His words (verbatim; "query" is the Quarry halt, "peer" is the Pier halt):**

> "Another issue I noticed on the query, and in general on that route, it feels weird that the train then goes left-hand
> side instead of right-hand side towards the pier. And also, I feel like the lever that I pull on the right should,
> like, the basically the station directions should be swapped at the quarry, where the one that right-hand side goes
> toward the pier should go towards pier and the other one should go back to village."

> "The peer station is also confusing because it's one lane and I don't understand what the lever would do. I mean, I
> guess it does call a train to me that goes back to the village, but it feels like it's on the wrong side."

## Goal

Trains keep to the right-hand track in their direction of travel on every line, and every request lever stands where a
player can predict what it calls: on the platform its train stops at, at the end that train leaves toward, with the
destination on it. Serves principle 11 (Show, don't tell: the track a train is on and where a lever stands should say
which way it goes) and 7 (Telegraph everything). It bends nothing; one earlier owner call is touched (the Pier is
homeward-only, question 3).

**Research:** none relevant (docs/research's railway section covers ride feel and network depth, not running side).

## Diagnosis

### 1. The running rule today: left-hand, everywhere, on purpose

- `src/place/layout.ts`: `UP_LAT = -4`, and its comment says "each line's up track runs `UP_LAT` m left of today's
  (left-hand running, +s away from Home)". Negative lateral is left of +s: `x = P.x - P.uz * l, z = P.z + P.ux * l`.
  docs/game-design/place.md ("The second track, drawn") says the same.
- `src/sim/railway-lines.ts`: track 0 is "a train going +s", track 1 "-s". The sim's tracks are abstract (one number
  along the line each); it holds no lateral.
- The view puts track 0 on the offset track and track 1 on the original one: `latOf` in
  `src/entities/railway/train-view.ts` (`if (row.track) return 0`) and `line2Lat` in
  `src/entities/railway/line2-path.ts` (same line), and `RING_FORMATION.tracks = [-400, 0]` ("0 (down, track 1) and
  -4 (up, track 0)") in `src/sim/railway-ring-layout.ts`.

So on **line 2** a train heading out to the pier is on the **left** track of the pair in its direction of travel, from
the Home turnout (s 34) to the open end, the Quarry included; a train heading home is on its own left too. **Line 1**
(s 36 to 182, Home to Camp) is the same. The Railhead, Ring Island and the greybox stack line follow the same code. It
does not flip between sections: the game is consistently left-hand running. Nothing is broken; the convention is the
opposite of the one he expects.

The Quarry from above (world metres; line 2 runs due east there, +s toward the pier; from a scratch script over
`layout.ts` and `haltAttachmentPose`, not committed):

```
 Village  <----  -s                                             +s  ---->  Far Head, Pier
 z 31   [== north platform, s 154-174.5 ==]
           L2 (s 155, its Village end; plaque: the Pier's end)
 z 34   ======== offset track: today pier-bound, left to right as seen from the south platform ==>
 z 38   <== original track: today Village-bound, right to left ====================================
 z 41            [=========== south platform, s 166-186 (shelter, board, signal) ===========]
                                                        L1 (s 183, its pier end; plaque: Village)
   plank crossing at s 147 (x 1052)
```

### 2. The levers today

One lever per platform, one handle; it calls the next train going that platform's way, and the server checks you are
on that way's platform (`haltPlatform` in `railway-lines.ts`, called from `src/world/railway-server.ts`). Placement is
`haltAttachmentPose` in `src/prefab/halt-attachments.ts`: a main platform's lever stands at the platform's +s end
(1.4 m in), 0.45 m behind the platform's centre line, by the signal mast, whatever way it calls; a second platform's
lever stands at the end nearer its plank crossing.

At the Quarry, on the south platform facing the track, the pier is to your right. The lever (L1) is at your right-hand
end and calls the **Village** train, which runs on the near track right to left and leaves to your left. The pier train
runs on the far track left to right; its lever (L2) is across the crossing on the north platform, at that platform's
Village end. Both levers stand at the end opposite to the way their train leaves. This is his "the lever that I pull on
the right should go towards pier".

The Pier: one platform east of the single track (s 719 to 741), one lever at its seaward end (s 739.6), by the mast,
plaqued Village. It does what he guessed: it asks the next train to stop here heading back to the Village; while the
Pier is the end every train stops anyway. It reads as the wrong side because (a) it stands at the end where the line
used to go on, the far end from the ramp you arrive by and from the way the train leaves; (b) its prompt is the bare
"Request stop" (end halts do not name a destination in the prompt, `halts-view.ts` line 483), and (c) the platform is on
the right-hand side going out, which under the right-hand rule he expects is the outbound side.

Every lever against the rule "at the end its train leaves toward":

| Halt | Lever | Stands | Calls | Train leaves toward | Today | After this plan |
| --- | --- | --- | --- | --- | --- | --- |
| Village, line 1 and line 2 (island) | one per line | +s end of its edge | its own line, out | +s | ok | unchanged (knobs stay 3.70 m apart) |
| Camp | one | +s end (the buffers) | Village | -s | wrong end | moves to the -s end (step 1) |
| Quarry, south | one | +s end | Village | -s | wrong end | calls the pier train; no move (step 4) |
| Quarry, north | one | -s end | open end (Pier) | +s | wrong end | calls Village; no move |
| Far Head, east | one | +s end | Village | -s | wrong end | while the end: -s end, Village; once the pier opens: +s end, the open end |
| Far Head, west | one (chained until Q6) | +s end, by the crossing | open end | +s | ok | calls Village; moves to the -s end |
| Pier | one | +s end | Village | -s | wrong end | moves to the -s (landward) end, by the ramp (step 1) |
| Railhead, east (slides) | one | 6 m short of the +s end | Village | -s | wrong end | as Far Head east |
| Railhead, west (joint) | one (chained until the rivet) | u 253.5 | Ring Island | +s | ok | calls Village after the rivet |
| Ring Island, east and west | one each, both at u 457 (platform u 428-468) | toward +s | east Village; west chained | -s | east wrong end | east as Far Head east; west calls Village once a leg opens beyond |
| Stack heads (greybox) | homeward and onward on one east platform | homeward nearer home, onward 4 m further out | each its way | its own side | ok | unchanged (greybox: one platform for both tracks) |

What a lever already shows: a plaque with the end it goes to (live text, `label()`), a chained state with the next
halt's name, the handle standing over while its request stands, and the platform's signal arm down. The prompt names
the destination only at middle halts and the Home island.

## Design

### The rules proposed (question 2)

1. **Running:** each train keeps to the right-hand track in its direction of travel, on every line.
2. **Levers:** a lever stands on the platform its train stops at, in the half nearer the boarding edge, 1.4 m from the
   end that train leaves toward. Its plaque names where that train goes with an arrow pointing that way along the
   platform, and its prompt always names it. A single-track end has one lever, at the end the train leaves by.
3. **When a line grows past an end halt**, the end's platform becomes the onward platform: its lever is restood at the
   onward end with the new plaque as the new halt's pieces drop in, and the lever across the track unchains for home.

### Running side: swap which way runs on which track, not the geometry

Keep every rail, platform, deck, cutting, gate and pillar where it is. Trains going +s take the original track (lateral
0, the right-hand one going out); trains going -s take the offset track (lateral -4, the right-hand one going home).
The stubs and crossovers are the same pieces run the other way: at a crossover end the arriving train runs straight in
to the east platform and the departing one crosses to the offset track; the sim's end block already keeps the two
apart, since its tracks are abstract.

| Piece | Kind | Change |
| --- | --- | --- |
| Train lateral (`latOf`, `line2Lat`, `crossing`, the ring's `TRACKS` order) | Local, view | track 0 at lateral 0, track 1 on the offset; the end easing applies to track 1 leaving an end instead of track 0 arriving |
| `RailHalt.platforms` | Lockstep catalog, read by the server's lever check and `railway-jump.ts` only | the tuple becomes [+s platform, -s platform] = [original side, offset side]; `haltPlatform(halt, way, head, end)` gains `end`: at the line's open far end both ways use the +s platform |
| Lever ways, chains, plaques, signals | Local over `Line.req` | main platform: the way out at an end, +1 at a middle halt; second platform: -1, chained while its halt is the far end |
| Train rules, blocks, timetable, `rail.lever` op and its fields, saved state | Lockstep | none |

Authority is unchanged: the server accepts `rail.lever`; the lateral is cosmetic. No new op, state key, `edits`
generator, invariant or `env` fact. No new control: the action stays `railway.request-stop`.

**`WORLD_NS`:** the catalog's meaning changes (which platform the server accepts a lever from, and which track every
tab draws a train on), so it takes the next bump with a dated history line, no compatibility code. v45 is already
claimed by the Roundhouse rotunda, the turnouts work and level-pacing's great tree: share one bump (question 1's
follow-on, under Risks).

**Alternatives.**

- *Mirror the geometry (`UP_LAT = +4`).* The second track would move to the east side, where every main platform,
  shelter, board, yard, the Q frames, the Pier's deck and the railhead's platform stand. It moves terrain cuttings,
  all three trestle decks and bents, hook pillar p2, both gates, the lamps, the ring formation, the wing and every
  turnout's hand (J4 to J9). Weeks of level work for the same picture. Rejected.
- *Only line 2's pier section.* The sim's track index is per line, so a section that runs the other way needs a
  crossing where it meets the rest. More work than the whole swap and it leaves the Quarry as it is. Rejected.
- *Levers only.* A lever cannot be relabelled to the other way: it calls the train that stops at its own platform.
  Only placement and labels can move without the swap (step 1 and 2), which fixes the Pier and Camp and not the
  Quarry.

**Recommendation:** steps 1 and 2 now (view and Place data, no bump), then the swap (steps 3 to 6) on the shared v45.
Cost of the swap: one catalog and server change, one view change of about four functions, lever and signal ways, the
Pier's answer, bots and docs; no geometry.

## Steps

Models are `npm run models` rows (withCodex).

- [x] **1. Levers at the leaving end, ahead of the swap. Tier: view and Place data; no bump.**
      _Built 14 November, with two departures._ The lever already stood 0.8 m from the boarding edge (`+sign` is
      toward the rails, so `sign * (hw - 1.7)` below would have put it in the back half): only `ds` changed. The
      Railhead's east lever moved too, to its sliding platform's home end (it stood 3.2 m from the jib: the owner's
      footing report of the same day); it calls home in every state today, and step 4 restands it with Far Head's.
      `src/prefab/halt-attachments.ts`: for a main platform's lever, `ds = way * (half - 1.4)` with `way` the way it
      calls today (Camp and the Pier: -1; the island: unchanged), and `dl = sign * (hw - 1.7)` (0.8 m from the boarding
      edge). Regenerate the halt kit (`dev/prefab/halts.ts`). Camp and the Pier only: the Quarry, Far Head, Railhead and
      Ring Island levers wait for step 4, which changes their way. Test: `test/halt-lever-place.test.ts`, "Camp's and
      the Pier's levers stand within 1.5 m of the platform's -s end and within the server's reach of its centre".
      Proof look: a `/look` still on the Pier's platform from the ramp, the lever in the foreground.
      Row: player-visible implementation (implementer agent, fable medium).
- [x] **2. What a lever says. Tier: view; no bump.** `src/entities/railway/halts-view.ts`: the prompt names the
      destination at every halt (drop the `named` branch at line 483); `src/prefab/builders/halt-lever.ts`: an arrow on
      the plaque pointing along the platform the way the train leaves. Draft copy for the owner, not The Boogler's:
      "Request stop: to Village" (the existing middle-halt wording, now also at Camp, Far Head, the Pier, the Railhead
      and Ring Island). No other new text. Proof look: the Pier's and Camp's prompts in a still.
      Row: player-visible implementation (fable medium); visual review by a fresh subagent.
- [ ] **3. The catalog and the server's check. Tier: sim and world, high risk; `WORLD_NS`.**
      `src/sim/railway-lines.ts`: swap the `platforms` tuples of Quarry, Far Head, Railhead and Ring Island, rewrite
      the field's comment, `haltPlatform(halt, way, head, end)`; `src/world/railway-server.ts` line 232 passes whether
      the halt is its line's open far end (from `trainStops`); `src/world/railway-jump.ts` indexes (`QUARRY_LINE2`);
      `src/sim/railway-ring-layout.ts` `RING_FORMATION.tracks` comment and order; `src/world/namespace.ts` history
      line. Tests in `test/railway-running-side.test.ts`: "a pier-bound ask at the Quarry is accepted from the south
      platform and refused from the north", "a Village ask is accepted from the north platform", "at Far Head as the
      end the Village ask is accepted from the east platform", "the Railhead's and Ring Island's asks follow the same
      rule before and after the rivet". No change to train rules: `npm run loop -- run` must report the same waits.
      Row: high-risk implementation (gpt-6-astra high), then the independent review row (a fresh reviewer, a failing
      test per suspected defect).
- [ ] **4. Trains on the right, levers and signals to match. Tier: view; ships with step 3.**
      `src/entities/railway/line2-path.ts` (`line2Lat`: track 0 returns 0; track 1 takes today's end shapes, including
      a train turned short at the Pier easing out over the 20 m after its stop, which today is the 20 m before it; if
      the row does not carry enough to tell, say so and stop), `train-view.ts` (`latOf`, `crossing` on track 1),
      `src/entities/ring-island/view.ts` and `railhead-view.ts` where they pick a track by index,
      `halts-view.ts` (main lever `dir`, `upLevers` and the ring spots' ways, `chained`, `label`, the signals' way,
      restanding a far end's lever when its line grows on), `halt-attachments.ts` (second platforms' levers at the -s
      end), `kit-board.ts` and `src/features/voice.ts` where they read `row.track`. Update
      `test/railway-r4a-views.test.ts`, `test/review-v26.test.ts`. Proof looks: top-down at the Quarry with a train in
      each direction (pier-bound on the south track); the south lever pulled and the pier train stopping at the south
      platform; Far Head as the end with a train crossing out. Row: player-visible implementation (fable medium).
- [ ] **5. The Pier after Q7 (per question 3).** If (a): a third `UP_HALTS` row for the Pier (s 719 to 741, lateral
      -6.95, on piles, a lever and a plank crossing), its `RailPlatform` in the catalog, `only: -1` kept. Run
      `npm run level-check` on it before review. Tier: sim catalog plus view; same bump. Row: gpt-6-astra high for the
      catalog, fable for the view.
- [ ] **6. Bots, tools and words.** `dev/look/bots/railway.ts`, `railway-legs.ts`, `railway-ride.ts` (where they pick
      a platform or lever by way), `dev/level/check.ts`, `rail-map.ts`, `track-continuity.ts`,
      `home-passenger-bay.ts`; place.md's "The second track, drawn" and the halts' paragraphs, the comments in
      `layout.ts` ("left-hand running"), `generic-lines.md` and `turnouts.md`. A mechanical rename of `upLat`,
      `UP_LAT` and `UP_HALTS` (the offset track is no longer the up track) is its own later commit.
      Row: quick mechanical jobs (gpt-6.1-sol medium).
- [ ] **Checkpoint (steps 3 to 6, one ship with the v45 bump).** Proofs, once: `npm run loop -- run`; the railway ride
      bot from Village to the Pier and back; the three proof looks of step 4; `test:net`; `npm run level-check`.

Each step leaves `node dev/ship-check.ts` green.

## Level findings

`npm run level-check` on origin/main (14 November): exit 0, 13 reports, "track continuity: ok (18 tracks, 7 joins)",
"timber against track: 0 problems"; none of the reports is at a halt, platform or lever. Steps 1 to 4 place nothing
new and gate nothing: levers have no collider and stay on their platforms, inside the server's reach (platform half
length at most 12 m against a reach of 11.6 to 13.6 m; step 1's test holds this). Step 5's west platform at the Pier
is not checked: it has no data yet, and its check is owed before that step is reviewed (does it give a way round the
railhead's gap or onto the piled deck early).

## Risks

- **Room safety:** the server's acceptance changes (which platform a lever ask is taken from). No new effect, presence
  or save field.
- **Mixed builds:** dev phase, no compatibility code; an old tab would draw trains on the other track and have asks
  refused, which is what the bump is for.
- **Hotspots:** `halts-view.ts`, `train-view.ts`, `railway-lines.ts`. `npm run inflight` shows one stale branch on
  `halts-view.ts` (`ship/matias-franco-8b44fb2`, 102 hours old, island boards); nothing current.
- **Jobs in flight.**
  - *Turnouts (not built):* its geometry and junction hands (J4 to J9) do not change, so its drawing steps need not
    wait. Its routing step does ("an up train within 60 m sets the stub for the up track"): which trains meet each
    junction facing or trailing swaps. Build that step after step 3, or have it read the way-to-track mapping from one
    place.
  - *Roundhouse rotunda, level-pacing's great tree, turnouts:* all name v45. One bump for whichever are ready together;
    this plan's steps 3 to 6 can be that bump or join it.
  - *Track layer presentation fix:* unaffected; the machine lays both tracks at the same laterals. Only the words "the
    up track's pair" go stale (step 6).
  - *Home's east bay (decided, not built):* it "joins line 2's outbound track 54 m out", the offset track carried
    straight back. After the swap that track is the homeward one. The bay's place holds; its wording and which trains
    reach it need a look when it is built.
- **A lever that changes its job:** at Far Head, the Railhead and Ring Island the east lever calls home while the halt
  is the end and the onward train after (rule 3). The plaque is live and the lever is restood, but a returning player
  meets a changed lever.
- **Greybox stack heads** keep one platform for both tracks; the train across the far track is today the outward one
  and becomes the homeward one. Not made worse; not fixed here.
- **Performance:** no meshes, lights or tick work added by steps 1 to 4; step 5 adds one small platform.

## Open questions

1. **Right-hand running everywhere, by swapping which way runs on which existing track?** Recommended: yes. Every
   line, no geometry moved, on the shared v45 bump.
2. **The lever rule** (rules 2 and 3 above: on the platform you board from, at the end the train leaves toward, the
   destination and an arrow on it, the prompt always naming it; an end halt's lever changes to the onward train when
   the line grows on). Recommended: yes, with step 1 and 2 shipping first for the Pier and Camp. The draft prompt is
   "Request stop: to Village".
3. **The Pier once the line runs on past it (after Q7).** With right-hand running the homeward train is on the far
   track from the Pier's east platform, and the 10 November call makes the Pier homeward-only. (a) Add a small west
   platform for the homeward train and let the east platform go quiet after Q7; (b) make the Pier outward-only;
   (c) stop both ways on request, east out and west home. Recommended: (a), which keeps the 10 November call; (c) is
   the one to pick if a dead east platform bothers him, and it costs the same platform.
