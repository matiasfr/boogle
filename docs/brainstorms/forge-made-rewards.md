> **Status: answered (2026-11-17); the owner answered every question the same day (below). Live (2026-11-18).**

## Pitch

Make the forge's two bills feel like work that pays off right here, not gifts someone left nearby. The last of 24 logs finishes the timber frame and puts a carpenter's pack frame on show before the next log run. The next 32 finish and light the forge; its first made thing, the proper axe, waits on a stand like the larger parts will later. **Design 7, Telegraph everything**, and **11, Show, don't tell**: see what the work will buy, then see where it ended up. The claim still upgrades everyone (principle 6).

## Gut question

When the last load goes in, do I feel *we made that*, and know where to pick it up without being told?

## Best suggestions

1. **[Design] Put the pack on the first bill.** Use a frame-and-straps silhouette on the existing board; keep it visible as the 32-log bill takes over while the pack is unclaimed. A clue that vanishes at completion won't catch someone already turning toward the trees.
2. **[Creative] Give the two payoffs distinct sounds and a shared rhythm.** Last timber seats → a wooden knock and the pack settles on its support; forge lights → a hammer ring and the axe settles on its pale stand. Pose the actual items to read from the unloading approach; a generic closed crate can't tell either story.
3. **[Systems] Teach the pedestal without borrowing the whole show.** Let the axe's metal cue answer the forge's ignition at the existing stand. Reuse the boiler/breaker's *made here, waiting there* staging and quiet-restore pattern, not their crane, long whistle or camera cut. Keep the existing shared claim paths.

The actual heavy pedestal would teach the later route more literally, but moving a pickup changes server reach and may conflict with goods-yard work. Start with the same visual language, not the same coordinates. A persistent display helps someone who missed the sound more than a louder cue does.

## Shape

- **Verified:** `line2PackReady` reads the first bill from accepted forge state; `rail.pack` **claims** it, not spawns it. The offer sits about 8.5 m from the forge; the axe's `forge.lit >= 0` offer sits about 14.8 m away. Both views use `T1_CRATE_PARTS` and a 6 cm bob, with no offer-arrival beat. Both server pickup points have 3.4 m reach.
- **Smallest first build:** reuse `line2-view.ts`/`forge-finish.ts` for the source beat and bill board, and `tools.ts` for short rigid motion and a persistent, exposed item silhouette at each existing pickup. Reuse the pack and axe reward models. Frame source and destination along the normal approach; no prop flying across the yard. Reuse positional SFX with at most one small dust or spark accent per beat. Reserve steam, crane and cut for the [heavy handoff](../plans/forge-call-handoff.md), added after Grant missed the waiting breaker at the pier.
- **Authority:** Local presentation over accepted Server facts. Establish a quiet baseline on first ready and full restore/reconnect; cue once on a live threshold crossing, never on prediction or an unrelated refresh. Keep the prompt actionable at its existing point; animation never gates it. Keep the opener's `reward-reveal.ts` card and friends' `ability-arrival.ts` flourish on the accepted claim, not the offer. No new op, save field, wire change or `WORLD_NS` bump proposed.
- **Fit and ordering:** a readability pass on the live route, not new progression. First prove source → landing from the haul approach, then tune the quiet waiting pose and co-op split. The P3 [rail-rack move](../backlog.md) is a coordination point, not a prerequisite. `npm run inflight` and full file lists for its two reported branches (`ship/matias-franco-152cc59`, `ship/matias-franco-afe6946`) showed no overlap with `tools.ts` or the forge views. No playtest hold; a blind run could tell us whether to strengthen the board or the spatial link.

## Done means

Use a disposable production room. For the first two looks, use `--rail-seed awake` and a targeted `--eval` setup adapted from the railway bot's accepted route and haul. Pause at the indicated bill state and make the final real deposit via `--action` after warm-up. These are proposed setups, not existing evals. Inspect stills and 1× `--video`; listen in-game for material and timing.

- **Pack, 23/24:** spawn on the ordinary unload approach holding the last log. See the board clue, then the last timber, then the pack resting where you can walk to it. The forge stays cold. Turn toward the next trees: the 32-log ask doesn't erase the clue before claim.
- **Axe, 55/56:** spawn at the same approach, pack already claimed. Deposit the last log and face the hardwood-side stand. Ignition and the axe landing read as cause and effect at follow-camera height. The axe is readable without sound or a cut and stays offered after the beat.
- **Shared claim and restore:** repeat the setups with `--players 2`, one at the bill and one at the pickup; vary who opens. Each nearby live viewer gets at most one arrival beat; only the opener gets the card, the friend gets the flourish, both get the upgrade. Rejoin once while an offer is waiting and once after claim: waiting item or withdrawn offer as appropriate, no replay.

## Open questions

1. **Recommend spare timber from the framing job, not a cast pack.** Is timing and material enough to imply carpentry, or should a little guy visibly do the work? Answer (owner, 17 Nov): a little guy builds it.
2. **Recommend a silhouette on the board, including an unclaimed marker after the bill rolls over.** Is that enough, or should the physical board also name the pack? Answer (owner, 17 Nov): "Foreshadowing is a nice motivator when stations grant upgrades." Foreshadow it; the silhouette-and-marker form is the default, and the call reads wider than this board: a station that grants an upgrade shows what it grants.
3. **Recommend the existing axe stand with pedestal-like staging, no camera takeover.** Should the axe use the actual heavy pedestal instead, as separate placement and reach work? Answer (owner, 17 Nov): the real pedestal plus a short cut. This moves the axe's pickup (server reach; check mixed-builds) and overrides suggestion 3's "no camera cut".

## Parked

- A little guy straightens the pack after it lands, deadpan like a villager reacting in *Untitled Goose Game* ([comedy notes](../research/comedy-in-games.md#untitled-goose-game-villagers-as-props-and-pianist-as-commentator)); don't make the reaction necessary to read the reward.
- One stand for all forge products, coordinated with the rail-rack move and crane clearance. A `/codex` previz from the unload approach could compare stands if placement is reopened.
- **Copy watch:** no suspect line identified for The Boogler; leave his copy alone. The approved Sleeves lines and the rail-rack label are for the heavy handoff, not these rewards.

## Appendix: One pass, three lenses

- **Design:** foreshadow the pack on the bill; carry the unclaimed clue into the next bill; make the axe teach where later forge products wait.
- **Systems:** derive Local cues from live accepted crossings; reuse models, pickup anchors and claim effects; restore waiting items quietly without replaying any cue.
- **Creative:** seat timber and pack with a wooden knock; answer ignition with one metal ring and a clear axe silhouette; add a tiny worker reaction later, after the item reads on its own.
- **Tensions:** anticipation trades surprise for a reason to finish the bill; a literal shared pedestal trades clarity for placement and reach work; a worker or cut can sell authorship but also steal attention from the item. Keep the promise, the physical payoff and player control in the first pass.

## Design review (2026-11-17)

Run by the orchestrator after the owner's answers. Positions from `src/sim/railway-line2-layout.ts`: forge (922, -12), the pedestal `LINE2_BOILER` (922, -1.2), about 11 m south of the forge toward road 1; the axe's old stand `AXE_STAND` on the hardwoods' side, about 15 m from the forge; the pack's spot `LINE2_PACK` (914, -9).

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| A little guy builds the pack frame from the frame's last timber, on the 24th log's live edge | Decided | [Owner, 17 Nov](../decisions-rewards.md#d-2026-11-17-forge-made-rewards) |
| A station that grants an upgrade foreshadows it on its board; the forge's first bill shows the pack's silhouette, kept with an unclaimed mark after the board flips to 32 | Decided (rule); the silhouette-and-mark form is Default | Same entry |
| The axe waits on the forge's real pedestal, with a short camera cut as the forge lights | Decided | Same entry |
| The pack is shown as the actual frame, not a crate; the axe as the actual axe | Default | Brief suggestion 2 |
| A wooden knock when the pack is done; a hammer ring when the axe lands | Default | Brief suggestion 2 |
| Who sees the cut: only players near the forge on the live edge (the forge call's whistle reaches everyone else); never on a reload or a late join | New, recommended | The forge call's live-edge rule (`forge-call.ts`) |
| The cut composes with the lit forge's existing roof show (`forge-finish.ts`) instead of adding a second show | New, recommended | Avoid two shows on one edge |

**Findings.**

1. **First use in sight.** The home-flow review counts the axe as used in sight of where you get it, because its stand faces the hardwoods it opens ([home-flow](../reviews/home-flow.md), row 8). From the pedestal the hardwoods may be out of view. The plan checks the sightline from the pedestal with a `look` still and, if they're hidden, frames them in the cut's last beat or the camera's return.
2. **The pedestal is shared.** The boiler and the breaker wait on the same pedestal later; an unclaimed axe must not collide with a later cast. Recommended: the pedestal holds the axe until it's claimed and a later cast waits for a clear pedestal, or the axe moves to a rack beside it. The planner picks one and proves it on the bot's route.
3. **Not view-only.** Moving the axe's pickup moves the sim's point and server reach (`railway-server.ts`, 3.4 m), so read [mixed-builds](../agents/mixed-builds.md) for whether it needs a `WORLD_NS` bump; a bump never ships mid-session. The planner agent plans it; the pack and the board can ship ahead as view-only.
4. **The little guy.** Reuse the camp's existing little-guy rig and walk; the building is a short knock-together, not a new animation set. The pack must read with the animation skipped (reduced motion, a reload, a late join: the pack is just there).
5. **Co-op.** Unchanged: the opener gets the card, friends the flourish, every back the 16.

Suspect copy: none; no line of The Boogler's is touched.
