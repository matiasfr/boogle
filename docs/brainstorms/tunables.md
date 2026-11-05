> **Status: building (approved, owner, 2026-11-05: all four recommendations). First proof on `codex/tunables-build`.**

# Tunables

**Pitch.** One small system that makes every playtest value easy for agents to read, change and record. You say "try B" between attempts; the agent sets one value, puts you back at the same starting situation, and the playtest data records exactly which settings were in force. Afterwards, "keep B" becomes an ordinary reviewable change to the defaults. There is no new UI. This serves DESIGN.md's **Toys before chores**: we tune by playing, not by guessing.

Sources: the [design draft](../research/tunables.md), the [tuning practice research](../research/tuning-practice.md), and a three-person panel.

**Gut question.** During a playtest, could you ask for "B again" and feel the difference within a minute?

Variants differ in one thing:

- **A:** Values change only between attempts.
- **B:** Values change live, taking effect from the next action.

## Best suggestions

1. **Compare like with like** (all three). A comparison is baseline, A and B, with one changed value and the same starting situation. Resetting a value never undoes logs earned or track built, so repeating an experiment needs a fresh room or checkpoint.
2. **Record what was actually in force** (systems, research). Record resolved values including defaults, plus the build, not just the overrides. Two players with the same override can still have different defaults on different builds.
3. **Change at action boundaries** (systems, creative). An action keeps the settings it started with, so a chop's motion, sound and reward stay together. Late joiners get the running action's settings too.
4. **Say what each value means for the player** (creative, design). Name what starts and ends an interval and what the player notices, such as "time available to board". Otherwise an agent can tune the wrong beat: pull-away and stopping are different things.
5. **Definitions stay with their systems** (research, systems). Typed defaults sit beside the code that uses them, and one catalog makes them discoverable. Reads stay cheap; the catalog is never scanned every frame.

## Tensions

- **What should the first proof be?** Systems would prove it on the track layer, the most concrete complaint. Design and creative pushed back, and systems agreed: that machine still has its own prototype sync, so it would need another bridge. Recommendation: prove it first on haul yield (shared), exposure (local look) and one cosmetic spring (feel). Bring railway timings across with the production-core migration.
- **Coupled values:** creative warns that "everything scales with duration" erases anticipation and recovery. Recommendation: change related values together, and keep authored warning windows fixed.

## Shape

- **Sync:**
  - local and presentation values change on one client;
  - per-player values are owner-written;
  - shared game-logic values are accepted by the host, saved with the room, fingerprinted and refused for mismatched builds.
- **Value types:** numbers, booleans, choices and bounded vectors. Curves pick an existing curve and its parameters; nothing executable.
- **Agent interface:** query parameters, a browser hook for evals and an npm command, plus the existing playtest report path. The Dev panel is optional.
- **Reuse:** `rules.tune`, the Dev panel commands, `tune=1`, and per-feature tunables blocks.
- **Risks:**
  - defaults are missing from today's saves and hashes;
  - Place's separate prototype authority;
  - tuning the wrong beat from a vague name.

## Done means

- An eval sets haul yield through the API in a two-player room: both players read the same effective value, it's saved with the room, and a mismatched build is refused.
- Exposure changes locally from a query parameter, and that is recorded in playtest data.
- One cosmetic spring changes between attempts, and a chop already underway keeps its original settings.
- A playtest export lists the resolved values, the build and the starting setup. "Keep B" produces a defaults diff for review.

## Open questions

1. First proof? **Recommended: haul yield, exposure and one cosmetic spring, then railway timings with the migration.** Answer: ___
2. During playtests, may agents change values between attempts when you ask? **Recommended: yes, between attempts only, never continuously.** Answer: ___
3. When a value changes, when does it apply? **Recommended: from the next action, so actions underway finish as they started.** Answer: ___
4. Who makes a winning value the default? **Recommended: an agent opens the defaults change after your verdict; nothing becomes a default without it.** Answer: ___

## Parked

- Spreadsheets for bulk authoring, once there are many values.
- Remote config.
- A Dev panel view of the catalog.
- The Boogler's complaint, puff and launch as a timing showcase, after the first proof succeeds.

**Disposition:** bounded experiment after the owner answers; the first proof avoids Place's prototype authority.
