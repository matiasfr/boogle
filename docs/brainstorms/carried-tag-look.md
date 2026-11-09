> **Status: ready to playtest (approved by owner, 2026-11-04).**

# The carried tag's look

## Pitch

Replace the brown pill beside Buddy's load with a small block of slots: four rows of four, with no background, one slot per place on your back, and the empty ones showing how much room is left. Picking something up should feel good: slots fill with a visible little pop as pieces land, so the tag celebrates the load growing. Placement, triggers and the 2-second hold and fade are approved and don't change. Serves DESIGN.md 11 (Show, don't tell) and 7 (Telegraph everything).

The panel recommended a cream cargo label. The owner compared mocks and chose this direction instead: [slot mocks](https://claude.ai/artifact/69C1hhY1z6bQNsmb6MLCjg) (private to the owner), "Four rows of 4".

## Gut question

**Does watching the slots fill feel satisfying, and can you tell how much room you have left at a glance?**

## Owner's calls

- **Layout:** four rows of 4, on no background. Filled slots use material colours, empty slots stay visible.
- **Capacity:** shown by the empty slots. No `16/16`; "Full" appears only when you're full.
- **Fade:** the current fade is fine and stays.
- **Pickup:** more animated as the slots fill.

## Shape

- **Sync:** Local presentation, with no ops, presence or saved state.
- **Reuses:** `tickCarry()` and `placeCarry()` in `src/features/haul-stack.ts`, the `CarryReadout` from `chop.ts`, and the `.carry-*` rules in `haul-stack.css`. DOM only, so no new draw calls or textures.
- **Slots:** filled in a fixed material order, the same on every update. Without the frame, capacity 8 is two rows of 4; the frame adds the other two rows.
- **Pickup animation:** each newly filled slot pops in (a quick overshoot scale, about 150 to 250 ms). A burst, such as several logs from one stroke, cascades one slot after another, with a short stagger, instead of filling together. Slots fill as pieces land, following the readout's existing landing and pending meaning, so a slot never fills ahead of its piece or lies about what's aboard. Rapid pickups extend the existing tag without restarting finished pops or flickering.
- **Becoming full:** "Full" appears when the last slot fills. A small extra beat on that last slot is fine; no alarm colour or new sound.
- **Drops and deposits:** slots empty simply, with no new flourish, and the tag still shows per the approved triggers.
- **Materials:** logs, rails and stone must be easy to tell apart at actual size. Rails and stone are close in the current palette, so adjust the slot colours as needed and report what you chose. Don't add icons to the slots: the owner chose the plain layout.
- **Big cargo:** the beam and boiler don't use slots. They keep an icon and name, styled the same way with no background.
- **Text on the world:** "Full" and the big cargo name use the game's display font with a thick dark outline, as in the mock.
- **Exact counts:** keep them in the pause readout, since a slot block means counting cells to match a bill.
- **Reduced motion:** no pop or stagger; slots simply fill and stay readable.
- **Other protos:** classic Haul keeps its chip.
- **Risks:** the taller block overlapping Buddy or the load (`placeCarry()` measures its box, so keep pops from changing layout, using transforms only); the phone dock's reserved height; empty slots disappearing against grass or sand; the cascade lagging behind real pickups in a long burst.

## Done means

Capture with `--query 'proto=place&shot=forge&carry=<mode>' --eval dev/look/evals/carry-tag.ts --action carry-tag-act.ts --hud`, extending the eval as needed:

- **Mixed and full (`carry=mixed`):** 10 logs, 5 rails and 1 stone fill all 16 slots and "Full" shows. The three materials are distinct at actual size.
- **Part full:** empty slots are clearly visible on grass, sand and sky. Sand needs its own still.
- **No frame:** two rows of 4 at capacity 8, then four rows with the frame.
- **Pickup in motion:** real-time video and consecutive frames of a single pickup and of a multi-log burst during real harvesting. Slots pop in order, in step with pieces landing, with no flicker, jitter or tag movement from the animation. Report frame-numbered defects.
- **Drop and deposit:** slots empty correctly with each input you can drive, and the tag fades on the existing timing.
- **Big cargo:** beam and boiler show an icon and name, with no slots.
- **Portrait with touch controls (`carry=touch`, under 600 px):** the block docks in the upper-left lane, clear of the roster, Drop and Ping.
- **Reduced motion:** no pop or stagger.
- **Full bot:** the place playthrough still completes.

## Parked

- A stamped "Full" outline, if the plain word doesn't stand out.
- Icons inside slots, or counts beside them, if players struggle to match bills.
- Sound on each slot filling.
- The cream cargo label, from the panel.

## Disposition

**Bounded experiment, proceeding on the owner's answers.** The tag shipped in [#914](https://github.com/matiasfr/boogle/pull/914) and the owner asked for this pass. It's presentation only, so it doesn't reopen the bills, carry limits or the [no-sway bundle decision](../decisions.md). It doesn't change the flow under test, so it passes the "Stop at the owner's playtest" rule. The ideas parked under [HUD](../ideas.md#hud), such as moving counters into the world, stay parked.
