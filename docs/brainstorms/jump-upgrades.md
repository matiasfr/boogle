> **Status: proposed (2026-11-06).**

# Jump upgrades

## Pitch

Earn the extra jump together and let it change a place you remember. A shared expedition find (ankle rings) grants the
room an extra air jump. The first thing it does is put a player on a balcony they used to walk under. Up there, they pull a
visible lever that lowers a broad ramp for everyone. The expert keeps a playful upper loop; the learner gets a walkable way
up; both meet at the same worksite. Serves **Cooperation is automatic, not negotiated** and **Designed for drop-in,
drop-out** in [DESIGN](../../DESIGN.md): the capability is room-wide, so nobody is left behind by attendance, and the ramp
means nobody is left behind by skill.

## Gut question

**"Did you want another lap after the shortcut was already open?"**

Variants that differ in one thing:

1. **Double jump only:** one extra air jump, one remembered balcony, one lowered ramp.
2. **Double jump, then a later triple jump** on identical geometry with no prizes, to see whether another charge adds
   choices or just height.
3. **No ramp:** the same double jump, but the balcony only offers a view, to isolate whether the shared shortcut is what
   makes it feel generous.

## Best suggestions

1. **Earn together, try it personally** (design, systems, creative). A shared discovery grants the room's capability at
   once, including friends who were absent or arrive late; each player tries it safely beside the reunion point.
2. **Mastery leaves a useful trace** (all three). The first climb opens a permanent broad route; the upper loop stays
   available so helping a learner doesn't remove the expert's toy. Ability parity prevents exclusion and reunion geometry
   prevents separation.
3. **Let movement conquer old footpaths, never construction** (systems, creative). Each important connection names what
   stays required (building the railway, operating machinery) and which footpaths may become shortcuts. Jumping over a
   slab is fine when it doesn't grant the missing material service.
4. **One clear charge cue before character polish** (design, creative). Filled and empty marks near Buddy first; ankle
   ring animation, NPC glances and a little pop only after the movement verdict.
5. **The clip** (creative): overshoot the familiar balcony, spend the spare jump, glide back and land beside a friend at the
   lowered ramp. No scripted failure, no compulsory rescue.

## Tensions

- **Count comparison first, or remembered-place payoff first?** Design started with a three-count courtyard; systems and
  creative argue it can show preference but not that earning the move improves exploration. **Recommendation:** prove
  double jump's return-to-the-balcony payoff first; run the count courtyard as a side experiment in its own room, and give
  triple jump content only once it earns a distinct use.
- **Ankle rings as the only charge display?** Creative pushes back: small ankles may not read at play distance.
  **Recommendation:** keep the rings as identity, but use a minimal airborne charge mark for the proof.
- **Mid-air unlocks.** Systems: an unlock during flight takes effect on landing; canopy toggles and hook cancels never refill
  a charge. Creative: say so honestly, announcing availability in the air and showing "ready" on landing. Both, then.

## Shape

- **Sync:** one durable shared fact (the room's jump tier) through accepted railway state; the per-player charge limit
  derives from it and refills on landing. The ramp is one durable gate fact. Count variants live in separate rooms so
  friends never get different movement rules.
- **Reuses:** `rail.jump`, accepted railway state, `createRailwayTools().fixedPre()`, existing remote jump puffs (no
  per-charge networking), `place-level.ts` (extend past its boolean ownership and hardcoded two-jump envelope).
- **Smallest first build:** move the double-jump grant to an expedition find, author one familiar balcony with a lever and
  a lowered ramp beside the current route, and add a charge mark. First paper-check that first-hook access and the quarry
  lever still work, since today double jump opens the quarry ledge.
- **Risks:** re-gating the quarry and hook routes; the charge cue reading at phone size; triple jump becoming a precision
  test.

## Done means

Capture with `look` (`?proto=place` with a save at the expedition find, then at the balcony):

- The find moment: the room-wide grant visible to a second player who arrives later.
- One air jump from below the balcony, with consecutive frames showing the charge mark spend and refill on landing.
- Before and after of the lowered ramp from the ground, with both routes reaching the same worksite.
- Co-op: a confident player and a late learner reunite at the ramp without instructions.
- A paper route contract listing what stays required (construction, machinery) and which footpaths may shortcut, checked
  against the quarry lever and first-hook access.

Whether another lap is fun stays the playtest's question.

## Open questions

1. **Where does the extra jump come from?** Recommended: an expedition find (ankle rings) on the way to the next destination,
   instead of today's pillar after Line 1. Answer: \_\_\_
2. **Does double jump keep gating the quarry ledge?** Recommended: no; redesign the quarry lever approach so construction,
   not jumping, is the required dependency. Answer: \_\_\_
3. **Triple jump at all?** Recommended: only as a separate courtyard experiment until it earns a distinct use. Answer:
   \_\_\_
4. **Charge display:** recommended: a minimal mark near Buddy for the proof; rings stay as identity. Answer: \_\_\_

## Parked

- Ankle ring pop, NPC upward glances and custom jump animation, after the movement verdict.
- A boost or throw between players as a later co-op verb.
- Triple-jump route content, if the courtyard experiment earns it.

## Disposition

**Bounded experiment, after a paper route check.** The double jump exists today; this reshapes how it's earned and what it
changes. Prerequisite: the route contract for the quarry lever and first-hook access. Fits after the first-path verdict and
alongside the next-destination choice (the expedition find belongs on the way there).

Previz: `.look/previz/jump-upgrades/` (4 shots).
