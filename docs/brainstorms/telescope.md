> **Status: proposed (2026-11-06).**

# The telescope

## Pitch

**Same framing, changed railway.** The brass telescope on the ridge already looks out at the ring on the horizon. Make it
worth returning to: it always opens on the same authored composition, and each time you look, real supports, track and
passing friends have changed the picture. The pleasure is recognising change in a familiar view. Later telescopes add
viewpoints, not upgrades: from Ring Island you look back across the crossing you built to the ridge where you once stood,
and a friend still at home can jump beside the old telescope ("that tiny person is where I was"). A broken observatory's
working eyepiece shows one distant silhouette of the ending, without revealing The Boogler's encounter. Serves **Toys before
chores** and **Show, don't tell** in [DESIGN](../../DESIGN.md).

## Gut question

**"Did you want another look after something changed?"**

Variants that differ in one thing:

1. **Fixed framing:** the authored composition only.
2. **Gentle bounded panning:** the same composition, zoom and exit, with a little optional panning.

## Best suggestions

1. **Prove recurrence with construction that already exists** (all three). Look at the railway and village before and after
   a construction milestone. An imagined future crossing can't establish that today's telescope is worth revisiting.
2. **Open on something worthwhile, let the player own it** (all three). Restore the authored composition on every visit;
   immediate exit; reduced motion cuts straight to a usable static view (today `pullOut()` skips the view entirely, which is
   a bug to fix).
3. **Let friends supply the comedy** (design, creative). Frame a generous stretch of track; friends enter, tumble through
   and ride trains across it on their own. No automatic friend-following that steals the composition.
4. **Grow through places, not an upgrade tree** (all three). Ring Island looks homeward; the observatory previews the
   ending's silhouette.
5. **No new shared state for the first proof** (systems). Existing construction state and remote poses supply everything.

## Tensions

- **Close-up gags versus the optics.** Design proposed a giant Buddy face in the lens; creative a gull. Systems points out
  that the current view flies the camera hundreds of metres out, so nearby objects can't naturally block it.
  **Recommendation:** park lens gags until we choose between a telescope-position zoom and today's fly-out. Friends in the
  distant picture come first.
- **One view or two?** Creative wanted one out toward the ring and one back toward the railway; systems cut it to one
  strong composition. **Recommendation:** one composition containing the crossing and the destination for the proof.
- **"Someone's looking" lens glint.** Nice reciprocal visibility, but it needs a small Owner presence value with departure
  cleanup. **Recommendation:** after the first verdict.

## Shape

- **Sync:** none for the proof. The view reads accepted construction state and remote players' existing poses. A later
  glint would be one Owner presence value, never exclusive.
- **Reuses:** the existing ridge telescope and its "Look through it" interaction, the camera fly-out, remote players.
- **Smallest first build:** restore the authored composition on each visit, fix reduced motion, frame the existing railway
  so a construction milestone visibly changes it, and A/B fixed framing against gentle panning.
- **Risks:** a view that's only pretty once; friends too small to read at the chosen zoom.

## Done means

Capture with `look` (`?proto=place`, saves before and after a construction milestone):

- The same telescope composition before and after the milestone, pixel-matched camera.
- A friend riding a train through the composition, as consecutive frames.
- Reduced motion: the static view appears immediately and exits cleanly.
- Fixed versus panning variants side by side at identical zoom.

Whether you want another look stays the playtest's question.

## Open questions

1. **Panning:** recommended: test fixed framing against gentle bounded panning; keep the simpler one unless panning wins.
   Answer: \_\_\_
2. **Ring Island's homeward telescope:** recommended: yes, when Ring Island is built. Answer: \_\_\_
3. **Observatory glimpse of the ending:** recommended: one distant silhouette with the landmark left open, no repair or
   unlock. Answer: \_\_\_

## Parked

- Lens gags (a giant Buddy face, a gull) after the optics choice.
- "Someone's looking" lens glint.
- Brass creaks, critter reactions and new instrument models.

## Disposition

**Bounded experiment, small and independent.** It needs no new state and could ship before the next destination, using the
existing railway's milestones.
