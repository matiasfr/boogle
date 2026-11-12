# First visit, screenshots only

Question: **Does the world show you what to do next?** This is a first-visit test of DESIGN.md 11,
Show, don't tell. Record confusion; do not repair the game during the run.

Use a fresh agent context when possible. Read this brief, not gameplay source, bot routes, saves,
previous findings or design plans. A harness author running it must disclose that prior knowledge.
Never use coordinates, `eval`, `--at`, debug state, inspect, source code or a known walkthrough.
No targets or controls inferred from filenames or implementation. Read world signs only in screenshots:
the observer's painted-text history includes things you may never have seen.

```sh
npm run session -- start
npm run session -- still first
npm run session -- state --blind
```

Open every PNG before choosing the next action. `state --blind` transcribes currently visible DOM
text, with the offered prompt and objective, without position. The picture is authoritative: text
extraction cannot establish whether an object or world sign is in your view. Ignore the prototype
tester panel, verdict bar and debug tools. Use only controls the game has actually shown you.

Allow **60 decision steps**, or the director's smaller budget (30 for a quick run). One step is one
chosen action, followed by a still and optional blind state. Initial observation counts as step 1.
No action batches chosen without looking. Prefer 0.25–2 seconds of movement near unfamiliar things;
wait longer only for something you can see happening. Stop at the budget, a clear ending, or a
technical failure. Do not spend extra steps to improve the outcome.

Commands (the notation is tool syntax, not permission to use an undiscovered game ability):

- `keys KeyW 1` holds a real keyboard key for one game second. Multiple keys: `keys KeyW,ShiftLeft 1`.
  Use `Space`, `Escape`, `KeyE`, etc. only after the game teaches them. Releases always happen after the step.
- `press` presses the interact key for 0.1 game seconds; use when the game offers that interaction.
- `look 20 -10` turns right 20 degrees and down 10, relative to your current camera. It consumes one frame.
  Negative yaw turns left; positive pitch looks up. Use after discovering the camera control.
- `step 1` waits one game second without input. Commands accept at most 60 seconds, rounded up to 1/60 s.
- `still step-02` prints the PNG path; `state --blind` reads the visible text. Neither advances page time.
- `stop` closes this session. Do not reload during a first-visit run unless a failure requires it; record that break.

After each step append one line to your report:

`02 | action and seconds | image path | I see …; I think I should …; because …`

Keep observation, interpretation and reason separate. If an action failed, say what you expected and
what the next picture actually showed. Mark **lost**, **misunderstood**, and **not noticed** when they
occur. Do not quietly correct an earlier mistaken explanation. A feature never encountered is
“not encountered within this budget,” not proof that it is absent or undiscoverable.

End with 3–5 findings tied to step numbers: what the world explained, what needed text, what you
misread or missed. Suggest spatial, visual or cause-and-effect improvements before adding helper
copy. No automatic code fixes. Include the log, commands, command wall times and limitations.
Page time pauses while you think, but the server and socket traffic do not. Fixed-step screenshots
cannot judge real-time feel, smoothness, sound or co-op. This is an agent legibility test, not a human playtest.

If the sandbox prevents a persistent browser or local socket, report the exact failure and leave the
run to the director. The existing `dev/codex/see.ts` broker handles one-shot captures, not sessions;
do not start another broker, bypass its restrictions or substitute a route-aware bot for this test.
