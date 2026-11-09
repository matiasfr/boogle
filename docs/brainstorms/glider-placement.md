> **Status: proposed (2026-11-09).** Seed (owner, 9 November): "glider should be introduced towards the earlier side of the game, since it could be used later in the game and upgraded. We should find a good place for it mechanically and in terms of progression." Light brainstorm (one agent, three lenses). Builds on its recommended answers, logged in [agent-calls](../agent-calls.md); the owner may revisit any.

# The glider: Home's last find

## Pitch

The glider is Home's closing find. You see it dark on Needle Bell's summit when you climb for the sea switch. When Q5
lands at Far Head, a teal shaft rises from the summit. You hook back up and step off, and your first flight shows you
everything you've built. It reopens Home's glide secrets and shortcuts, gets one real job at Ring Island, and grows twice
later: faster cloth from Canopy fibre, then lift over the machines you've built. The double jump moves to Split-rock's
ankle rings straight after, so it arrives as the glider's best friend. Serves **7. Telegraph everything** (seen
sealed, woken in view, then taken) and **8. Enjoyable alone and together**. It bends nothing.

## Gut question

**"Did the first flight off Needle Bell make you want to go back and fly from somewhere else?"**

## Best suggestions

1. **The summit return** (design). The device sits on Needle Bell's summit, sealed until Q5 completes, and the hook
   climbs back to it. It comes about 20–30 minutes in, after Q3, Q4 and Q5's construction, so it isn't a 49-second
   burst.
2. **Port, don't archive** (systems). Port Place's glide as a hook-style trio (`glide-step`, `glide`, `glide-view`)
   with a `rail.glide` grant, and run it before D1. The BotW tuning, stop and reopen, and jump-while-gliding come
   across unchanged.
3. **The flight is the reveal** (creative). There's no card text to explain it. The camera eases to 5.2 m and Home
   lies below. Telegraph: the dark device and canopy vane on the first climb, then the teal shaft on Q5's completion
   edge, visible from Far Head.
4. **Hook → glider → double jump** (design). Build job E (ankle rings on the Split-rock walk) right after, so the third
   ability extends glides.
5. **One tier, one mode order** (systems). `Rail.glide` is a tier (0–3); per-player constants derive from it. Hook
   beats glide, and glide beats jump, in one place.
6. **What it reopens** (design). The village balcony and Far Head sea-stack secrets return to the world, Needle Bell
   becomes a one-step descent, Split-rock's rim gives an optional glide into the bowl, and Ring Island has one
   main-line use.
7. **Upgrades** (design and systems). G1 fast cloth (Canopy fibre, F3: 10 → 12.5 m/s). G2 lift over the plumes of
   machines you've lit (Sail Tower; optional, first to cut).
8. **Partners see it** (creative). The folded roll shows on every back from shared state, and a partner's open canopy
   comes from presence `railwayGlide`.

## Shape

- **Sync kind:** `Rail.glide` tier is Server, from accepted railway state. It's granted by a `rail.glide` device take
  after Q5, applies room-wide, is saved and is inherited on join. Flight is Owner, with presence `railwayGlide` (open
  or closed). Plumes, camera, sound and particles are Local, derived from accepted machine facts. It needs a
  `WORLD_NS` bump: share the next one, and never ship it during an owner session.
- **Reuses:** Place's `toggleGlide`/`openGlide`/`closeGlide`/`stepGlide` and `MOVE.glide*` (as `rules.tune` ids), and
  `moves-view.ts`'s canopy pose and glide camera. Also `gear-models.ts`'s `makeCanopy`/`placeCanopy`;
  `place-sfx.ts`'s `gliderOpen`/`gliderClose`/`pickupGlider`; `tools.ts`'s device, reveal and every-back pattern;
  `ability-arrival.ts`'s flourish (option E); `reward-data.ts`; `tech-layout.ts`'s `summit` pad; and the
  `sheet-glide.ts` eval.
- **Smallest first build:** the port, the device on the summit (sealed, then woken on Q5's completion edge with a teal
  shaft), the `rail.glide` grant, the canopy visible to partners, and Jump-in-air opens it. Not in the first build:
  upgrades, plumes, the secrets' return (that comes with F2) and the load-scaled sink.
- **Risks:**
  - Three modules writing the body (`tools.ts` fixedPre 42, `hook-shot.ts`, `glide.ts`). Settle the order in one place.
  - The long first glide's landing and camera. Keep broad, dry landings on the table, and make a sea landing just a
    swim.
  - A hitch the first time the canopy opens. Warm it behind loading, as Place did.
  - Crowding the summit pad. Keep the device clear of `t5`'s landing and the switch handle.
  - A glide that skips construction. Hold to the route contract.

## Done means

Each capture uses `node dev/look/look.ts`:

- **Sealed:** `--rail-seed q4-done`, camera on the summit. The device is dark under its vane, and the tools probe
  reports it as not available.
- **Woken:** `--rail-seed q5-finishing`, then the finish, camera at Far Head facing Needle Bell. The teal shaft appears
  on the completion edge and reads at phone size.
- **First flight:** `--rail-seed q5-done --eval dev/look/evals/railway-glide-first.ts` (ported from `sheet-glide.ts`),
  starting on the summit. Take the device, then step off. The canopy is open within 0.1 s. Samples show a sink of
  3.2 ± 0.3 m/s and 10 ± 0.5 m/s at full stick. Flight lasts about 20–25 s, ends on a dry landing, and the camera holds
  5.2 m. Stills show Home's line, forge and pier in frame.
- **Co-op:** `--players 2 --rail-seed q5-done`. The finder gets the card and the other player gets the flourish where
  they stand, then opens the canopy at once. Each sees the other's canopy and back roll.
- **Combo** (after job E): one air jump while the canopy is open, and the canopy catches again. Toggling never refills
  a charge.
- **Reload:** the glider persists across reload and rejoin (a `railway-hook-reload.ts` analogue).
- **Reach:** `npm run level-check` shows no glide-only place reachable before the grant, and the village balcony
  reachable after it.
- **Performance:** no frame spike the first time the canopy opens (`npm run perf` at `q5-done`).

## Open questions

1. **Where is it found?** Recommended: on Needle Bell's summit, sealed until Q5 lands at Far Head, then climbed back
   to by hook. Alternative: Far Head's pad, as in Place. Answer: ___
2. **Does the double jump move to Split-rock's ankle rings (job E) straight after, so Home's order is hook → glider?**
   Recommended: yes. Answer: ___
3. **Does the glider gate a main-line step?** Recommended: not at Home; one main-line use at Ring Island, decided in
   that plan. Answer: ___
4. **Which upgrade path?** Recommended: G1 fast cloth from Canopy fibre, as the economy model has it. G2 lift over
   your lit machines at the Sail Tower, independent of G1, optional and first to cut. Answer: ___
5. **How does it open?** Recommended: Jump in the air opens it once air jumps are spent, and the LB/Q/touch toggle
   stays. Answer: ___

## Parked

- The footing plummet and load-scaled sink: slapstick, and a lesson in why the train carries footings (after a yes).
- Glide off Needle Bell onto a passing train: the clip (after a yes).
- Gulls falling in beside a gliding player.
- Co-op stoking: one player stokes the kiln so its plume rises higher for a friend (with G2).
- Drafting behind a friend for less sink. It's too precise for DESIGN 10 for now.
- A bell note when the summit wakes; previz of the summit step-off with `/codex`.
- Stamina for the glide: rejected by the research. Don't add depletion just to have something to sell.

## Design review (designer, 2026-11-09)

Read against DESIGN.md (7, 8, 3, 10, 11), [owner-calls](../agents/owner-calls.md), [decisions.md](../decisions.md)
(index; The shape of the game; Process, 5–9 November), [direction.md](../direction.md), [playtests](../playtests.md)
(3 November round 4, 8 November solo runs), [find-the-fun](../plans/find-the-fun.md) (rules for every prototype),
[place-retirement](../plans/place-retirement.md) (D1, F2, its design review), [split-rock-roundhouse](../plans/split-rock-roundhouse.md)
(balcony section, J3, question 4), [ability-pacing](../plans/ability-pacing.md), and the research index's _Puzzles,
abilities and traversal_ section: [ability-upgrades](../research/ability-upgrades.md),
[botw-glide-target](../research/botw-glide-target.md), [movement-abilities](../research/movement-abilities.md),
[route-contract](../research/route-contract.md), [round4-first-use](../research/round4-first-use.md). Code read:
`src/sim/railway-systems.ts` (`rail.jump`, `rail.hook`), `src/entities/railway/{tools,hook-shot,ability-arrival,reward-data}.ts`,
`src/proto/place/{moves,tech,tech-layout}.ts`, `dev/look/bots/railway.ts`, `dev/look/rail-seed.ts`, `src/world/namespace.ts`
(`v21`). `node dev/playtest/cli.ts` doesn't run in this checkout (`playwright` isn't installed), so the playtest data
below comes from playtests.md.

**Fit and order (game-direction check).** The outcome is a movement reward that makes Home worth crossing again, and it
serves the owner's 9 November seed. The build is within approved scope: the glider was deferred, not cut (8 November),
and owner calls let gameplay ports skip a new brainstorm. Disposition: **proceed within existing scope, in two pieces**.
Piece A, the movement and its view, can start now. Piece B, the rules and the `WORLD_NS` bump, waits for Split-rock J3
to merge, because J3 is editing `src/sim/railway-*` and takes v22. Job E (moving the double jump) is a separate later
job with its own prerequisites (finding 3).

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The glider waits sealed on Needle Bell's summit, wakes when Q5 completes, and you climb back up by hook to take it | New | **Yes.** It answers the 9 Nov seed (earlier side), and it's the only Home spot high enough for a first flight worth having. ability-upgrades puts G0 at the starter area's departure, after a construction job. Far Head's pad (Place) is the fallback |
| 2 | Q3, Q4 and Q5's construction come between the hook and the glider, roughly 20–30 minutes in | Decided | 5 Nov design proposals: "a construction job between hook and glider". The 3 Nov playtest had only 49 s between them; owner seed, 9 Nov |
| 3 | The flight feel ports unchanged: 10 m/s, 3.2 m/s sink, 18/12 m/s² acceleration and braking, 0.1 s to deploy | Decided | Design Table, 1 Nov: "The glider matches Breath of the Wild as closely as we can"; botw-glide-target |
| 4 | Stop and reopen; an air jump while the canopy is open, then the canopy catches you again; toggling never refills a charge | Default | Place's behaviour. 3 Nov highlights: "The glider, stop and reopen", plus double jump while gliding |
| 5 | One mode order: the hook beats the glide (firing closes the canopy), and the glide beats the jump | Default | Place's `toggleGlide`/pre-step order |
| 6 | Shared: whoever takes it gets the card, everyone else gets the flourish where they stand. It's saved and inherited on join | Decided | 6 Nov "all progression is shared"; 7 Nov co-op abilities option E; DESIGN 9 |
| 7 | A friend who's in the air when it's granted can open it straight away. Unlike the second jump, there's no charge to hold back | Default | It catches a fall rather than adding height, so there's nothing to exploit |
| 8 | How it opens: Jump in the air opens it once air jumps are spent. LB/Q/touch Glide toggles it. Jump while it's open, with no charge left, does nothing | New | **Yes, with the last clause added** so mashing Jump never shuts the canopy. 3 Nov: "Glide on L1 or jump is open (jump clashes with double jump)". LB and Q are free in production |
| 9 | Pressing Glide as you step off still counts (180 ms) | Default | Place's `armUntil` |
| 10 | First use: on your first fall after the take, the folded roll pulses the Jump glyph, as the jump's teach pulse does. No auto-open | Default | Not in the plan (finding 6). DESIGN 11 |
| 11 | The card keeps Place's copy, "The glider" / "Open it in the air.", and the camera eases out to 5.2 m | Default | Place `tech.ts` NAMES/LINES. Every ability card has one line. The brief's "no card text" means nothing more than this (finding 7) |
| 12 | Telegraphs: the dark device under a canopy vane on the first climb, then a faint teal locator rising on Q5's completion edge | Default | DESIGN 7. Keep it as faint as the jump device's locator (opacity 0.1, no flare): on 3 Nov both players called the blue shafts heavy-handed |
| 13 | Q5's completion edge wakes the summit and casts the boiler together, and the player picks which to chase first | Default | B5–B8 casts the boiler on Q5. The glider is optional and the boiler is the main line (finding 8) |
| 14 | The first flight lasts about 20–25 s and ends on a broad, dry landing. Landing in the sea just means a swim | Default | (102 m − ~18 m ground) / 3.2 m/s ≈ 26 s at most; DESIGN 10 |
| 15 | The device stands clear of `t5`'s landing and the switch handle on the 10 × 8 m summit pad | Default | The brief's risk list |
| 16 | Carrying: you can glide with logs or rails on your back at normal sink, but a shouldered beam or boiler keeps the canopy shut | Default | Not in the plan (finding 5). The great beam's slowness is the point (3 Nov); the load-scaled sink is parked |
| 17 | The glider gates nothing on Home's main line. It gets one main-line use at Ring Island, decided in that plan | New | **Yes.** 2 Nov: "a few key gates on the main line, the rest optional"; DESIGN 3; route-contract rec 1 |
| 18 | What it reopens at Home: the village balcony and the Far Head sea-stack secrets return to the world, Needle Bell becomes a one-step descent, and Split-rock's rim gets an optional glide into the bowl | Default | Follows the logged F2 call (secrets wait at the bay until the glider). 7 Nov: judge upgrades by access to remembered destinations |
| 19 | The double jump moves to Split-rock's ankle rings (job E), so Home's order becomes hook → glider | New | **Yes, as its own job after this one, with its prerequisites first** (finding 3, owner question 1). Owner 3 Nov: "Matias wants double jump later"; route-contract rec 2; ability-upgrades rec 2 |
| 20 | G1 fast cloth, from Canopy fibre: 10 → 12.5 m/s with the sink unchanged | Default | The direction is decided (5 Nov: "glider speed" upgrades). The number and material are ability-upgrades' G1 trial. Deferred |
| 21 | G2 lift over the plumes of machines you've lit, at the Sail Tower: optional, independent of G1 and first to cut | New | **Yes, deferred.** It's ability-upgrades' "authored rising-air columns" (3 m/s up, 12 m cap) with machines as the columns |
| 22 | No stamina for the glide | Default | ability-upgrades: stop and reopen and fall arrest are existing behaviour, not tiers to sell |
| 23 | Build the glider now and port it before D1. This replaces the logged place-retirement call #31, under which D1 archives it | New | **Yes, but D1 doesn't wait for it.** Whichever lands first: port from the tree, or restore from `archive/place` (finding 4) |
| 24 | Partners see the folded roll on every back, from shared state, and an open canopy, from presence `railwayGlide` | Default | DESIGN 11; 3 Nov "Not shown to the other player" class of bug |
| 25 | The first build leaves out upgrades, plumes, the secrets' return, the load-scaled sink and the double-jump move | Default | Owner, 8 Nov: brief in small shippable pieces |
| 26 | Grant a weak "starter cloth" earlier (on the first summit visit, or at Q3) so that Q5 becomes an upgrade? | Default (owner asked, not decided) | **No: keep the full glider at Q5, and lengthen the ladder after Home (G3 on a later island).** Weighed below |

### Findings

1. **The production bot will fail on the first build.** `dev/look/bots/railway.ts` asserts
   `!registry().ops.some((op) => /^rail\.(glide|train)/.test(op))` ("no later railway ability is installed", about
   line 1352). Registering `rail.glide` trips it. Piece B has to narrow the assertion to "glide not yet granted" rather
   than delete it. D1's list of evals to delete includes `sheet-glide`, so whichever lands second must port it to
   `railway-glide-first.ts` and not lose it.
2. **Store a boolean, not a 0–3 tier.** A single tier can't represent G1 and G2 when they're independent (suggestion 7
   says they are: tier 2 is ambiguous). `jump` and `line2.hook` are booleans today. Ship `glide: boolean`, and let each
   upgrade add its own field with its own bump when it's built. Constants still derive in one place.
3. **What the early double jump still carries (question 2).** The main line doesn't need it. The bot's `noJump` guards
   prove the hook walk, the Needle Bell climb and descent, and the quarry ramp all take no air jump, and line 1's walk
   home is checked before discovery. These things do depend on it, and job E must fix them before it removes the
   line-1 device:
   - **Boarding the loaded cart** (about 2 m tall) uses the air jump ("up with the optional double jump, as Place's
     porter boards it", about line 1719). The cart serves Q4–Q6 before trains. E needs a step on the cart or a raised
     stand at the forge stop.
   - **The `earlyLedge` probe**, an optional skip onto the quarry apron, goes away.
   - **Home's trophy plinth** at the finders' bay holds the jump prize, and `ability-arrival.ts` has the `jump-taught`
     pulse. Both move with the find.
   - **F2's jump secrets** (the lookout shelf, the course's lamp cap) become returns after Split-rock. That's good and
     matches 7 November's "remembered destinations", but their missed-prize trigger at the bay must not hand them out
     before the jump exists.
   - **The bot's line-1 segment** ("optional jump used", the `line2=0` finish) and its checkpoint names.
   - **The playtest cost.** On 3 November "Jump is the toy" (2,374 presses, 404 double jumps). Moving it empties the
     first hour of its most-pressed move. The owner asked for it later anyway, so the move proceeds on the
     recommendation and goes to the owner as question 1.

   The split-rock plan's claim that "Line 2's run uses it" holds only for the cart. No `WORLD_NS` bump is needed: the
   fact stays `Rail.jump`, and only the device moves.
4. **Port before D1, but don't chain them.** D1 already waits on every port and X1. Adding the glider to that wait
   would hold the town port's last step on a movement job. Both orders cost about the same, because `archive/place`
   keeps the code. Record this as superseding place-retirement call #31's "returns in the movement slice". This build
   *is* the movement slice.
5. **The carry rule is missing.** Without it the canopy opens under the great beam or the boiler, and both were
   designed as slow ground carries (3 November: "carrying it should be slower"). See call 16.
6. **How you learn it is missing.** The hook has a demo pull after its card. The glider's first use is a 102 m step
   off. A player who doesn't press anything simply falls, so recovery means seven pulls back up. The glyph pulse (call
   10) costs little and follows an existing pattern.
7. **"No card text" contradicts option E.** The finder gets a card. Keep Place's line, which is already authored.
8. **Two rewards on one edge.** Q5 completing already fires the boiler cast, and the pier rockets come later on Q6.
   Waking the summit on the same edge sends the player two ways at once: the boiler back to the camp, the glider up
   Needle Bell. That's fine as a choice (6 November: a which-first choice a couple of times). In co-op it splits
   naturally. Don't add a cinematic for the summit; the faint locator is enough.
9. **`WORLD_NS` sequencing.** J3 takes v22. The glider's rules (piece B) branch after J3 merges and take the next free
   version (v23). They should ship in one batch with J3/J4 if those are close, so the owner sees one reset, not two,
   and never while the owner is mid-session. "Share the next one" in Shape is only possible by coupling to J3's
   branch, which isn't worth it.
10. **Reach after the grant.** "Done means" checks that nothing glide-only is reachable *before* the grant. Add a check
    *after* it: no glide from the summit or Far Head can fund, lay or open anything early (Split-rock's interior,
    Ring Island). Getting somewhere early is fine (route-contract rec 1).
11. **Suspect copy:** none. No Boogler lines are touched.

### Alternative weighed: an earlier "starter cloth" (owner asked, 9 November)

The proposal: a weak cloth (short, steep sink, unable to cross Home's designed gaps) granted on the first Needle Bell
summit visit, right after the hook. Q5's reveal becomes the cloth that actually carries you, followed by G1, G2 and
possibly G3. Taking the four checks in turn:

- **(a) Route, secrets and the bot.** The route survives if the starter cloth's glide ratio stays around 1:1 (for
  example 6 m/s forward and 6 m/s sink, against the full cloth's 10 and 3.2).
  - From 102 m that reaches about 80 m out. Far Head, Ring Island and the sea stack are out of range.
  - The quarry apron is probably in range, which is harmless: the `earlyLedge` probe already shows the lever does
    nothing before Q3 (route-contract rec 1).
  - The village balcony is unknown. It needs `npm run level-check` with a starter reach model, and "can't cross the
    designed gaps" is a promise every Home gap has to be checked against, now and whenever Home changes. That's the
    real cost.
  - The bot breaks the same way as in finding 1, plus a second bot change: the Needle Bell descent (`downFromNeedleBell`)
    would become a glide, or would need to assert that it doesn't.
- **(b) Overload at Needle Bell.** It overloads. The hook comes at Q2 and its demo leads straight into the climb, so a
  cloth on the first summit visit comes seconds after the hook. That recreates the 3 November 49-second burst and
  breaks the 5 November owner call, "a construction job between hook and glider" (call 2). Granting it at Q3 instead
  keeps the rule, but the starter cloth then has little to do: nothing sends you high again before Q5, and Q5 comes
  only one stretch (Q4) later. That's an upgrade about ten minutes after the grant, on a cloth you've barely used.
- **(c) State.** The 0–3 tier already doesn't fit independent G1/G2 (finding 2). With a starter cloth there are five
  or six states. Use a small linear int for the base cloth only (0 none, 1 starter, 2 full), and give G1, G2 and G3
  their own fields when each is built.
- **(d) The double jump.** The two moves are independent, but the starter cloth only works with job E. If the double
  jump stays on line 1, Home would hand out three abilities plus an upgrade in about 25 minutes. With E, Home has two
  movement finds plus one upgrade, which partly makes up for losing the jump toy. The cart boarding still needs its
  step; a cloth doesn't help you board.
- **Against the decided feel.** The Design Table call (1 November) is "matches Breath of the Wild as closely as we
  can", and BotW's first paraglider is the full one. A deliberately weak first tier is a percentage-style upgrade, the
  kind ability-upgrades warns against ("must earn its place through a new route or decision, not a percentage
  label").

**Recommendation: keep the full glider at Q5, and make room to upgrade after Home, not before Q5.** Q5 is about 25
minutes into a game of roughly six hours, so it's already early. G1 (Canopy fibre), G2 (machine plumes) and a G3 on a
later island fit in the remaining five-plus hours, each opening a remembered place. If the owner still wants an earlier
grant, the least-bad version is the starter cloth at Q3, with job E, and with level-check proving every Home gap. It
must not come on the first summit visit, which would undo their own 5 November call.

### Recommended first build (for the implementer)

- **Piece A, now (Owner and Local only, no `src/sim` edits):** port Place's glide into `src/entities/railway/`
  (`glide-step`, `glide`, `glide-view`), reading an adapter fact `inspect().glide` that stays false until piece B.
  - `MOVE.glide*` become `rules.tune` ids.
  - Register the `glide` action (LB / Q / touch Glide) on the grant.
  - Jump in the air opens the canopy when no charge is left, and does nothing while it's open.
  - The mode order lives in one place, beside `tools.ts`'s fixedPre 42 and `hook-shot.ts`.
  - The canopy pose, the 5.2 m camera, `gliderOpen`/`gliderClose`, warm-up behind loading, presence
    `railwayGlide`, and the folded roll on backs.
  - The carry rule from call 16.
  - Prove it with a `railway-glide-first` eval on a test room that grants the fact.
- **Piece B, after J3 merges:**
  - `rail.glide` op and `Rail.glide: boolean`. The take needs Q5 complete and the actor at the summit device.
  - The summit device: dark under its vane, a faint locator on Q5's completion edge, "Take it".
  - `GLIDE_REWARD` with Place's copy, an `ability-arrival` entry, and the first-fall glyph pulse.
  - A `glide-earned` seed, `WORLD_NS` at the next free version, and the bot assertion fix.
  - Done means: the brief's list, plus finding 10's reach check. The combo check can run now, because seeds past Q5
    already have the double jump.

### Owner questions

1. **Move the double jump to Split-rock's ankle rings, so Home is hook → glider?** *Recommended: yes, as job E after
   the glider.* It first fixes the loaded-cart boarding, the plinth and the jump secrets' bay trigger. The first hour
   loses the toy you pressed 2,374 times on 3 November. Alternative: keep it on line 1 and give Split-rock a second
   charge (J2) instead.
2. **Grant a weak starter cloth earlier, so Q5 becomes an upgrade?** *Recommended: no.* Keep the full glider at Q5,
   and add G3 on a later island for more upgrades. On the first summit visit it would undo your 5 November "construction
   between hook and glider". At Q3 it gets about ten minutes of use before Q5 replaces it. Alternative: a starter
   cloth at Q3, with job E and a level-check of every Home gap.
3. **Is the summit return right for the first flight?** *Recommended: yes.* The alternative is Far Head's 32 m pad,
   with no climb back, but its flight is about a third as long.
