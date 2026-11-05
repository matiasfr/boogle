> **Status: ready to playtest. Approved (owner, 2026-11-04): "Yeah let's proceed", all four recommendations as written.**
>
> Built and checked on desktop and 375 px Chromium profiles. [Evidence, timings, draft words and device limits](../reports/load-screen.md). A real iPhone is untested.

# Load screen you can read

## Pitch

The loading screen says what it's actually doing. One calm status strip over the key art shows four groups (Game files, Your character, World, Graphics), each waiting, running, done or failed, with the room connection shown apart. Timings live in an expandable details view, and the same record stays open in Pause's Dev tools after the screen has gone. Nothing waits longer because of it. Serves DESIGN.md **Small and readable**; no principle bends.

## Gut question

"When the game was loading, did you know what it was doing, and did the wait feel shorter?"

Variants, identical in timing, differing in how much shows by default:

1. One literal status line, such as "Preparing graphics".
2. That line plus the four compact groups (recommended).
3. The four groups plus timings always visible.

## Best suggestions

1. **Four factual groups, with no invented percentage.** (Design, backed by all) Readable after a glance away, and honest about the room connection, which races the GPU.
2. **One retained load record.** (Systems) The screen and Pause's Dev tools read the same timeline, so a hitch can be looked up after the screen has gone. No second recorder.
3. **Truthful states and handoff.** (Systems, Creative) Show "preparing" only when work has really started. A deadline or failure never earns a checkmark, and a failed load never flashes "Ready".
4. **Carry unfinished work across entry.** (Design) If graphics are still preparing after entry, one quiet "Graphics still preparing" stays until it's truly done, so a stutter has a visible reason.
5. **Copy last load.** (Design) A copyable record from a real phone, which is what tonight's report needed.

## Tensions

- **One line, or four groups?** Design leaned to one line after the first round; Systems and Creative back the groups. Recommendation: four groups, since you asked to see the states, with timings folded away.
- **Who sees it?** The panel shows the groups to everyone and leaves details to those who look. Recommendation: the same. This is your call (question 1).
- **A completion flourish?** Creative proposed one, then cut it. Recommendation: none in this build; nothing may delay entry.

## Shape

- **Sync:** Local only. Nothing is shared, saved to a room or sent over the wire.
- **Reuses:** `src/boot/splash.ts` and its stages, `src/boot/timeline.ts`'s marks and export, Pause's Dev tools, and the telemetry from `phone-entry-avatar-lag`, which owns when entry is safe and how avatars behave.
- **Smallest first build:** add the few missing start marks, map marks to four groups, draw the strip in `splash.ts`, and add the retained view. No task scheduler or new recorder.
- **Risks:** the strip must stay cheap on a busy main thread, since the splash is the first few kB; group definitions can drift from what's loading; and this depends on the avatar and lag job's final signals, so it starts after that lands.
- **New on-screen words** are drafts for your review, listed in the build's report. None are The Boogler's.

## Done means

Captured with `look`, at phone and desktop profiles, using the boot-fault tooling in `dev/cold-start` to slow or fail each step:

- **Normal load (`--query ''`):** consecutive frames show each group go waiting, running, done in true order, with no overall percentage. Timeline marks match what's shown.
- **Slow room or slow graphics (throttled):** room connection is shown apart, and the running group stays running rather than appearing done.
- **Forced failure or deadline:** no checkmark and no "Ready"; the failure reads as a failure and entry behaves as today.
- **Still preparing after entry (forced):** the quiet status stays until the real completion mark, then goes.
- **After entry:** Pause's Dev tools shows the same record, and copying it gives the same numbers.
- **Cost:** time to first play is unchanged within noise; no extra asset downloads; the entry bundle's growth is reported in kB.
- **Reduced motion and small phone:** the strip fits a 375 px width with no overflow, and no animation runs under reduced motion.

Not a real iPhone, so your phone is the real check. Whether it feels better stays the playtest's question.

## Questions, answered

1. Who sees the status strip? **Everyone sees the four groups; details open on request.** Answer: as recommended.
2. How much detail on the screen by default? **Four groups, with timings folded away and your choice remembered.** Answer: as recommended.
3. How should the words sound? **Plain and literal for now ("Preparing graphics"), with a Boogle voice later if wanted.** Answer: as recommended.
4. Should the bar stay? **Keep the bar and gear as they are, with the strip under them.** Answer: as recommended.

## Parked

- A completion sound or gear flourish, if the information proves useful.
- A loading toy: the trolley and fall already are the arrival toy.
- Showing what's being downloaded and its size on slow connections.

## Disposition

**Proceed; `phone-entry-avatar-lag` has landed (#918).** It's a Local systems change that doesn't alter the flow under test, so owner-calls allows it around the replay. The panel's round 1 reports were overwritten by round 2, so this draws on round 2's final positions and what they say about round 1.
