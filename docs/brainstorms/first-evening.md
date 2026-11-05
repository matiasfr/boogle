> **Status: proposed (2026-11-05).**

# The first evening

**Pitch.** Finish Station 3's trestle, hear the whistle, and let a short prepared fade turn the world warm while everyone keeps moving. The celebration is walking home together across what you built, among the little guys, with the old long route visible below. The owner's calls stay fixed: warm, shared, cosmetic and from one milestone. It serves DESIGN.md's **Show, don't tell**.

**Gut question.** Walking home across the trestle, did it feel like you'd finished something, or like the game had ended?

Variants differ in one thing: the same finished crossing, at **day** or **evening**.

## Best suggestions

1. **Station 3's completed crossing earns it** (all three). It's the first useful connection, and the unfinished forge still promises more. Far Head can earn a later moment.
2. **Players compose the moment** (all three). Replace the forced camera pull-out in this test, keep the completion whistle, and leave room for footsteps, water and honks.
3. **No timer, vote or attendance** (all three). Daylight returns from a progress fact, so nobody is rushed and nobody has to be present.
4. **Late arrivals inherit the room** (all three). They load straight into evening with no replay, and a friend can lead them across. After daylight returns, the crossing and its traffic remain.

## Tensions

- **What brings daylight back?** Design and creative chose **the start of line 2's first construction**, which leaves forge work, wandering and late arrivals inside the breather. Systems chose **the forge becoming operational**, which comes sooner and is a visible chapter. Recommendation: start of line 2's construction, returning gently and fully playable, since one active builder changes everyone's mood.
- **Keep the pull-out?** The panel would replace it, because it stacks with the evening. Recommendation: test without it behind the flag, and change the default only after you've judged it.
- **A Boogler nod?** The panel cut it from the first build, so no new copy is needed.

## Shape

- **Sync:** a bounded room phase and transition tick, with no general calendar. It's driven by accepted progress facts, and presentation stays local.
- **Reuse:** `openPath(L1)`, lamps, commuters, walking and honks; `evening-look` owns the look; `growth.ts` shows how to derive presentation from shared facts.
- **Prerequisites:** room-owned time after T1, and accepted line-1 completion from production slice 3. Today's `forge.lit` isn't an authority.
- **Smallest first build:** a flagged comparison on the current game, with no sync.
- **Risks:** feeling like an ending; a fade stacking on a crowded celebration; exposure values may change if the colour work is approved.

## Done means

- Flagged run at the finished trestle: the whistle plays, the fade runs, and input stays live, shown in real-time motion.
- Matched day and evening stills from the crossing: signs, rewards and particles stay readable.
- Two players: a joiner during evening loads directly into it with no replayed fade, and both see the same phase.
- The starting event for daylight returns both players to day without interrupting play.

## Open questions

1. Which milestone? **Recommended: Station 3's completed crossing.** Answer: ___
2. What brings daylight back? **Recommended: the start of line 2's first construction.** Alternative: the forge becoming operational. Answer: ___
3. Replace the camera pull-out at this moment? **Recommended: yes in the flagged test, and decide the default after judging it.** Answer: ___

## Parked

- A Boogler reaction or nod.
- Far Head's own later moment.
- A live moving sunset.

**Disposition:** prerequisite first for the real build (T1, room time, slice 3); the flagged comparison can come after `evening-look`.
