> **Status: approved (owner, 2026-11-06).** Builds after the line 2 playtest.

# Gate puzzles

## Pitch

**The machinery remembers your help.** Each new stretch of railway is guarded by one big, readable machine that
construction finishes and players operate. A pawl catches, a load sits safely parked, a brace stays under compression: any
partial solve survives a friend leaving. The approved rigs support solo completion in sequence and overlapping work by friends.
Each destination gets one physical idea and a lasting result. Split-rock Works **opens solid ground** (a broad breach in a
visible seam). Ring Island **supports something that would otherwise block freight** (raise the aperture and brace it).
The payoff is the first loaded train passing through. Serves **Enjoyable alone and together** and **Show, don't tell**
in [DESIGN](../../DESIGN.md), and the [route contract](../research/route-contract.md): movement
may shortcut travel, but construction and machinery stay required.

**Owner review, 7 November:** evaluate solo viability and cooperative quality alongside each other. Review whether
complementary tasks make operating the machinery together more satisfying; friends merely overlapping a solo sequence
is no longer a universal design constraint. The approved rigs and durable partial progress remain until a specific
revision is approved. This review does not authorize new mechanisms.

## Gut question

**"Did opening the way for each other make moving the load more fun?"**

Variants that differ in one thing:

1. **Ring, single aperture:** raise it, the pawl holds it, install the brace, freight passes.
2. **Ring, opposed shutters:** the same rig with one linkage changed, so a carrier parks the load while a friend changes its
   route.
3. **Split-rock, bare strike versus captive splitter:** one generous strike on a visible seam, against seating two captive
   shoes and then one big split.

## Best suggestions

1. **Every partial state is safe to inherit** (all three). Persistent detents, recoverable cargo and permanent
   installations: a survivor thinks "I can finish that", never "I need them back".
2. **Show construction completing a visibly incomplete machine** (creative, systems). An early scout sees the disconnected
   drive, the handle and the obstruction together, so pulling early obviously does nothing, and exploring early is still
   welcome.
3. **One authoritative mechanism state** (systems). *Blocked → service opening → permanently secured* drives the handle,
   linkage, colliders and freight permission together. It explains why a person can pass before the railway can.
4. **Distinct destination verbs, not a recurring switch ritual** (design, creative). Split-rock splits, Ring braces,
   Needle Bell keeps its climb-and-release. Some stretches simply let players build; no puzzle at every station.
5. **The first loaded train through is the proof** (all three), without taking the camera or controls away.

## Tensions

- **Split-rock: captive splitter or bare strike?** Creative dropped its two-shoe splitter (it risks turning Split-rock into
  another installation puzzle before Ring); design and systems say test it against the strike, keeping two shoes only if
  their positions explain how the wall opens. **Recommendation:** start with the broad strike on a visible seam; test
  the captive splitter as the comparison.
- **Ring: one aperture or opposed shutters?** All three now agree the shutters are a challenger, kept only if friends
  voluntarily park and help, not just save a walk. **Recommendation:** single raise-and-brace first.
- **Gliding with cargo.** Creative: don't secretly disable faster routes to protect a puzzle. If movement makes staging
  irrelevant, prefer the simpler rig; the installed support and connected railway still gate freight.

## Shape

- **Sync:** one durable mechanism fact per gate (blocked, service opening, secured), changed by a request carrying the
  expected revision rather than a blind toggle, so two friends pressing together can't undo each other. Installations are
  durable; settings are reversible.
- **Reuses:** the quarry lever and Needle Bell switch patterns in `src/proto/place/tech-layout.ts`, accepted railway
  state, the recovery rack for parked loads, the shared particle pool for the crack and the clunk.
- **Smallest first build:** one rig in greybox, Ring's single aperture or Split-rock's strike, with solo recovery and
  cooperative operation evaluated alongside each other. A shared helper comes only after a second mechanism shows matching behaviour.
- **Risks:** readability at phone size; two friends racing the same handle; a puzzle that is really an invoice (identical
  fetches).

## Done means

Capture with `look` (`?proto=place`, greybox rig at its destination):

- Before, partial and after poses of the mechanism, read from the approach without text.
- Solo: one player completes the whole sequence; a helper leaves mid-way and the survivor finishes.
- Two players pressing the handle at once: no undo, one accepted change.
- The first loaded train passing through, with consecutive frames.
- Early arrival by glide or jump: the player passes, but freight stays blocked until construction finishes.

Whether opening the way together is fun stays the playtest's question.

## Open questions

1. **Ring's rig:** recommended: the single raise-and-brace first; opposed shutters only as a comparison. Answer: as recommended (owner, 2026-11-06).
2. **Split-rock's action:** recommended: a broad strike on a visible seam; test the captive splitter against it. Answer:
   as recommended (owner, 2026-11-06).
3. **Comedy pass:** recommended: after a yes, the aperture settles onto the brace with a heavy clunk and one tiny squeak,
   and a nearby critter ducks. No new Boogler dialogue. Answer: as recommended (owner, 2026-11-06).

## Parked

- Opposed shutters with staging, if the comparison earns them.
- A shared gate helper module, after a second mechanism.
- Comic reactions and critters, after the functional proof.

## Disposition

**Bounded experiment, after the destination choice.** Depends on the owner picking Split-rock Works and Ring Island (the
next-destination research) and on the [route contract](../research/route-contract.md) repairs for the quarry and the
first hook.
