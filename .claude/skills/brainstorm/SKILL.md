---
name: brainstorm
description: Flesh out a seeded feature idea before it is built. Three Codex panelists (play designer, systems architect, creative director) work it independently, read each other, and Claude synthesizes one brief with suggestions and at most five open questions for the owner; the approved brief goes straight to implementation. Use when the owner seeds an idea to explore, says /brainstorm, or asks to flesh out, amplify or pressure-test a feature idea.
argument-hint: '<name> <the idea>'
---

Brainstorm `$0`. Seed: $ARGUMENTS

You are the director: Codex runs the panel (docs/agents/owner-calls.md, "Codex first"), you write the synthesis and
make no design decisions the owner hasn't. If Codex hits a usage limit, stop and tell the owner.

1. **Seed.** If the seed names a parked line in `docs/ideas.md`, use the owner's words from it. Add only facts the
   panel can't find itself (a playtest moment, a reference game the owner named). Don't pre-answer the idea.
2. **Round 1, independent.** Start all three in the background (Bash `run_in_background: true`), same brief:

   ```sh
   node dev/codex/run.ts brainstorm $0-design --role design "<seed>"
   node dev/codex/run.ts brainstorm $0-systems --role systems "<seed>"
   node dev/codex/run.ts brainstorm $0-creative --role creative "<seed>"
   ```

   Roles are in `roles/`. Each job reads this checkout read-only with live web search; its contribution is
   `.look/codex/<topic>/report.md`.
3. **Round 2, cross-read.** When all three finish, resume each with the other two reports' paths:
   `node dev/codex/run.ts resume $0-design "Round 2. Read .look/codex/$0-systems/report.md and .look/codex/$0-creative/report.md."`
   (and the same for the other two). This is where ideas compound; don't skip it.
4. **Synthesize.** Read all six reports, then run the game-direction skill's fit and ordering check on the result
   (decision index, rejected ideas, current gate, "Stop at the owner's playtest"). Write `docs/brainstorms/$0.md`,
   starting with `> **Status: proposed (YYYY-MM-DD).**`, then:
   - **Pitch**: the amplified idea in three sentences, and the DESIGN.md principle it serves (one it bends is a question).
   - **Gut question**: the one feeling a playtest answers, and 2–3 variants that differ in one thing.
   - **Best suggestions**: at most six across the panel, ranked, each tagged with its lens and one line on why.
   - **Tensions**: where the panelists disagree, with your recommendation.
   - **Shape**: sync kind, the code it reuses, the smallest first build, and its risks, in a few lines.
   - **Open questions**: at most five, each with a recommended answer first and a free field
     (`Answer: ___`). Recommendations aren't owner answers.
   - **Parked**: good ideas for later (polish after a "yes", follow-on features), one line each.
   - **Disposition**: from game-direction (proceed, prerequisite first, bounded experiment, defer, owner decision).
5. **Show the owner.** Give the pitch, the gut question, the top three suggestions and the open questions in chat,
   with the file path. Stop and wait.
6. **Build.** Record the owner's answers in the brief, set its status to `approved (owner, YYYY-MM-DD)`, and commit it
   ("Brainstorm: <name>"). The brief is the build spec: hand it to a Codex `task` citing `docs/brainstorms/$0.md` (the codex skill); no separate plan unless the
   owner asks for one. Parked items the owner wants kept go to `docs/ideas.md`. Remove the panel's
   `.look/codex/$0-*` folders once the brief is committed.
