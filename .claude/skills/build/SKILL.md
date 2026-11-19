---
name: build
description: Build a Boogle change from a brief or an approved plan. The builder writes its own short plan first, revises it as results arrive, runs each step's check, looks at what a player would see and hands back commits with a report. Use when you are given a brief or plan to implement, or start a change of more than a couple of files yourself.
---

# Build

You build the change and you own its plan (owner, 16 November 2026, owner call "Fold roles into the builder": the model
that writes the plan carries it out, so it can change the plan when a step turns out wrong). Follow AGENTS.md.

1. **Read.** The brief, or the plan file it names. Start with `npm run map -- <folder>`, then focused searches and line
   ranges; follow the owning code and its dependencies, and read what the task and AGENTS.md's table require.
2. **Plan, briefly.** Before the first edit, write the steps you will take: for each, the files, what changes and how
   you will check it. Keep it in your working notes and put the final version in your report; write a plan file only
   when the brief names one. A brief that names an approved plan in `docs/plans/` (high-risk work in `src/sim`,
   `src/net`, `src/world`, `server/` or the wire format, or one the owner asked for) is followed as written: tick its
   checkboxes, and take a wrong step back to whoever sent you instead of redesigning it.
3. **Design calls.** If your plan sets numbers, rules, rewards, pacing, placement or what a character says, and the
   brief carries no design review covering them, run the [design-review skill](../design-review/SKILL.md) on your plan
   before building.
4. **Build in order.** Before writing a shot, script or workaround, check the tool table in docs/agents/tools.md,
   "Tools and skills". After each step run its check and `node dev/ship-check.ts` (changed lint, typecheck, the touched
   files' tests; the full `npm run check` belongs to the ship and checkpoints, owner-calls.md, "Build more, test
   less"), and fix what fails. When a result shows the plan is wrong, revise the plan and say what changed and why in
   the report. Stop and report instead when the fix would break a rule in AGENTS.md or docs/agents/ (sync kind, the
   "Don't" list, lint boundaries, hotspot files), change direction or scope, or contradict a recorded decision.
5. **See it.** For anything a player can see or feel, follow docs/agents/verification.md, "See it before you ship":
   look at your own `/look` stills and motion sheets, gut-check them, and iterate before you finish. One proof look per
   change by default; phone-width, second-player, far-distance or before/after shots only when the change is about them
   or your brief or a reviewer asks.
6. **Edit, don't rewrite:** `Edit`, or `npm run patch` for many edits at once. No throwaway patch scripts and no
   whole-file `Write` of a file that exists, unless most of it really changes.
7. **Simplify.** When your code changes (not docs) are over ~3 files or ~150 lines, run `/simplify` on the diff
   before the last check and commit (docs/agents/shipping.md); it changes no behaviour, so re-run the touched checks.
8. **Commit** in small commits (docs/agents/shipping.md). Ship with `npm run ship` only if your brief says to; otherwise
   leave the commits for the caller. A session working directly with the owner ships finished work and reports it; it
   does not ask "want me to ship it?" (owner, 19 November, docs/decisions-process.md, "finished work ships"). The
   usual gates stay: the checks, a look, and an independent review where `npm run review-stamp` asks for one.
9. **Owed proofs are yours.** A rebase, bot run, still or tick mark your branch still owes comes back to this same
   thread; you have the context a fresh agent would lack.

Report: the plan as built and where it changed, files changed, check results, the paths of the stills you looked at
with your one-line gut check, what is unverified, and "not tested on a device" where it applies.
