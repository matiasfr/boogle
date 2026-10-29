---
name: playtest-notes
description: Add a playtest entry to docs/playtests.md from what the user tells you about a play session.
argument-hint: '[what happened]'
disable-model-invocation: true
---

Add an entry to `docs/playtests.md` from: $ARGUMENTS

1. Read `docs/playtests.md` for the format, and PLAN.md for the current phase's playtest question.
2. Append a `## YYYY-MM-DD` section (today's date; add to today's section if it exists) with short bullets: who (first names), what was new, what was fun, what broke, and the answer to the phase question. Use the user's words; don't invent details. Ask once if who or what was new is missing.
3. If something broke, offer to file it as a bug or fix it. Commit with "Playtest notes YYYY-MM-DD" and offer `/ship`.
