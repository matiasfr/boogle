---
name: brainstorm
description: Flesh out a seeded feature idea before it is built. By default one agent looks at it through three lenses (play designer, systems architect, creative director) in a single pass and writes one short brief with suggestions and at most five open questions; `--panel` runs the full three-panelist, two-round version for a big new area or mechanic. The brief goes straight to building on its recommended answers. Use when the owner seeds an idea to explore, says /brainstorm, or asks to flesh out, amplify or pressure-test a feature idea.
argument-hint: '<name> [--panel] <the idea>'
---

Brainstorm `$0`. Seed: $ARGUMENTS

You are the director: you write the brief and make no design decisions the owner hasn't. Models come from
`npm run models` (the brainstorm row). Owner, 9 November: lighter by default, and nothing waits for a playtest.

1. **Seed.** If the seed names a parked line in `docs/ideas.md`, use the owner's words from it. Add only facts the
   panel can't find itself (a playtest moment, a reference game the owner named). Don't pre-answer the idea.
2. **Light (default): one pass.** One agent (the brainstorm row's model) reads the three role files in `roles/`
   (design, systems, creative) and the docs they name, then writes each lens's three strongest ideas and the tensions
   between them, in one report.
   **Panel (`--panel`, for a new area or a big new mechanic):** three panelists, one per role file, run independently
   in the background; when all three finish, each reads the other two reports and revises once. In withCodex mode
   they are `node dev/codex/run.ts brainstorm $0-<role> --role <role> "<seed>"` jobs (resume each for the second round);
   in normal mode, Claude subagents given the same role files and seed. At a usage limit, stop and tell the owner.
3. **Write the brief.** Run `npm run inflight` for branches touching the same files and the game-direction skill's fit
   and ordering check. Write `docs/brainstorms/$0.md` for an owner who reads it in two minutes, starting with
   `> **Status: proposed (YYYY-MM-DD).**`, then:
   - **Pitch**: the idea in a short paragraph, and the DESIGN.md principle it serves (one it bends is a question).
   - **Gut question**: the one feeling a playtest answers.
   - **Best suggestions**: the strongest, ranked, each tagged with its lens and one line on why. Note real tensions
     with your recommendation.
   - **Shape**: sync kind, the code it reuses, the smallest first build, and its risks, in a few lines.
   - **Done means**: the moments the builder captures with `look` (each with its spawn or `--eval` setup) and what
     should be visible or measurable there.
   - **Open questions**: at most five, each with a recommended answer first and a free field (`Answer: ___`).
   - **Parked**: good ideas for later, one line each.
4. **Show the owner, then build.** Give the pitch, the top three suggestions and the open questions in chat, with the
   file path. Don't wait: the brief builds on its recommended answers, each logged in its topic's table in `docs/agent-calls.md` (owner,
   9 November); only direction, unapproved scope or something irreversible waits for the owner. Commit the brief ("Brainstorm: <name>"), have the designer agent review it, and hand it to the implementer
   (or a Codex `task` in withCodex mode) citing `docs/brainstorms/$0.md`. Record the owner's answers in the brief
   whenever they come, and adjust what was built. Parked items the owner wants kept go to `docs/ideas.md`. Remove any
   `.look/codex/$0-*` folders once the brief is committed.
5. **Track it.** Status `building` when the build starts, `live` when it ships, `answered` with the owner's verdict
   after they play it.
