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
   checkboxes, and take a wrong step back to whoever sent you instead of redesigning it. A slip is not a wrong step:
   a figure the plan got slightly off, two of its lines that contradict each other, a check that rejects a valid
   state. Fix it yourself, correct the plan's lines in your branch and list each fix in your report; stop only when
   the fix changes what a player sees or does, or a recorded decision (25 November: two builders stopped on such
   slips in one hour, a ramp pitch of 8.84° against 8.89° and a rack bound that rejected a valid save; rule 75 in
   docs/agents/orchestrator-state.md).
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
   The look harness starting and stopping its own Vite and local game server is allowed under every brief: a brief's ban
   on background processes means ones you start or kill yourself (`Start-Process`, `taskkill`), not `node dev/look/shots.ts`
   or the capture commands. Skip a still only when the harness itself prompts or refuses, and quote its message.
6. **Edit, don't rewrite:** `Edit`, or `npm run patch` for many edits at once. No throwaway patch scripts and no
   whole-file `Write` of a file that exists, unless most of it really changes.
7. **Simplify.** When your code changes (not docs) are over ~3 files or ~150 lines, run `/simplify` on the diff
   before the last check and commit (docs/agents/shipping.md); it changes no behaviour, so re-run the touched checks.
8. **Commit** in small commits (docs/agents/shipping.md). Ship with `npm run ship` only if your brief says to; otherwise
   leave the commits for the caller. A session working directly with the owner ships finished work and reports it; it
   does not ask "want me to ship it?" (owner, 19 November, docs/decisions-process.md, "finished work ships"). The
   usual gates stay: the checks, a look, and an independent review where `npm run review-stamp` asks for one.
9. **Solids near players: lift or wait, never push.** When your change switches a solid on where a player can be (a lay,
   a mount, a kit, a door, an engine or copy appearing), lift the player onto it when their feet are within a small step
   of its top and the whole body fits there (headroom), otherwise leave every solid holding them off and undrawn, as one
   set, until they are clear. Never push sideways, never move a player to a spot with no ground, never switch a solid
   off on contact. An area that mounts far from players is an ordinary static: placing a returning or teleported player
   is `src/place/pose.ts`'s job. Use the shared helper: `liftOrWait` from `src/prefab/instantiate.ts` (`src/place/clearance.ts`). This one class cost
   three branches 2 to 5 review rounds each on 24 November (rule 67 in docs/agents/orchestrator-state.md). The reverse
   holds too: a solid that goes away on a schedule or a rule (a temporary head closing, a ramp retired, a deck moved on)
   stays solid and drawn while any player stands within a small step of it, and goes once they are clear. Search for
   every solid your change removes as well as every one it adds (greybox leg 5 step 5, 25 November: a closing Wall
   head dropped a player into the sea, a fix round). A visitor (another player's replicated body) holds a new solid off
   like a player, but never takes the local player's footing: test a visitor alone in the new solid, and the local player
   standing on it while a visitor overlaps it; `liftOrWait` covers both (Port Quay step 3, 27 November: three fix rounds,
   about two hours from built to its final check).
10. **Owed proofs are yours.** A rebase, bot run, still or tick mark your branch still owes comes back to this same
   thread; you have the context a fresh agent would lack.
11. **A test must be able to fail.** See a regression or proof test fail once on the code without your change (or with
   its subject broken) before you trust its pass. Assert exact values and compare with the source of truth (the server,
   the sim), not "more than zero" or "same as before", and run the real step in between. In a fix round, make the least
   change that turns the reviewer's tests green; when the defect is one writer of a value several paths write, check
   every writer in that pass (24 November: a reconnect proof passed with the inventory stuck at zero, and one rider snap
   took three review rounds, a narrower case each time; rule 70 in docs/agents/orchestrator-state.md).
12. **Jump landings load first.** A jump-in `land` (`src/world/railway-jump.ts`) in a greybox area that mounts by
   distance (the AREAS list in `src/entities/route-greybox/index.ts`) keeps the spawn: arrival probes the surface before
   the area is resident. Leave such a stage unlanded, as `canopy-reached` is, unless your step makes arrival wait for
   the area (leg 3 and twice in leg 6’s reviews, 25 November).

Report: the plan as built and where it changed, files changed, check results, the paths of the stills you looked at
with your one-line gut check, what is unverified, and "not tested on a device" where it applies.
