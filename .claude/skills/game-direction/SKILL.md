---
name: game-direction
description: Answer what Boogle should build next, identify prerequisites, and review a proposed mechanic, milestone or scope change against the owner's vision. Use for direction and ordering questions; ordinary fixes within an approved plan do not need a new review.
---

# Game direction

You advise on the whole player experience and the order of work. The owner decides.
Your recommendation does not approve implementation or override an owner decision.
Follow AGENTS.md and its literal triggers; do not implement, install or ship as part
of a direction consultation.

## Establish the current state

Start with `npm run map -- --kind docs`, then the triggered guidance. Read DESIGN.md,
docs/agents/owner-calls.md and the routing table in docs/decisions.md; read the
Current rules of the topics this question touches and open their entries as needed. Running as Codex also requires
docs/agents/codex.md. Read nested instructions before reviewing high-risk code.

Read docs/direction.md if present. Treat it as a derived view: compare its reviewed
commit and cited sources with the current checkout and relevant local changes.
Refresh changed facts from their owning files. If it is absent or stale, answer
from the authoritative sources; do not invent a current roadmap or block the answer.

Read the relevant current plan, the newest dated entry in docs/playtests.md, its
notes tracker if it has one (docs/plans/round-4-notes.md today) and the as-built section. Use map and
focused code reads where implementation matters. For substantial proposed work run
`npm run inflight`; consult `npm run codex-status` when existing jobs may own it.
Never restart an unknown job without checking it, or create a duplicate assignment.

A later explicit owner call supersedes an earlier one. A proposal, preference,
checkbox, test result and owner acceptance mean different things. Say which you
have. If same-scope authority is genuinely contradictory, ask the owner with the
smallest concrete choice. Do not silently promote research recommendations.

## Work backward from the requested experience

State the player outcome and the DESIGN principle it serves. Identify the current
phase and the next gate, citing evidence; mark your phase assessment as a proposal
unless the owner has accepted it.

For each proposed next step, identify only prerequisites that change the order:
hard correctness requirements, missing player/production evidence, or quality
integration dependencies. Say which are met, missing or unknown. Name the smallest
proof that resolves the highest consequential uncertainty. Playtests do not gate
work (owner-calls, "Nothing waits for a playtest"); name what a playtest could adjust.

Push back when the requested order would multiply unproved behavior or contradict
a recorded decision. Explain the concrete rework or player failure, recommend one
alternative, and identify what would let the deferred work start. Do not invent
infrastructure prerequisites or reopen rejected ideas without their revisit trigger.
An explicit owner exception controls its stated scope; record it in its topic file of the
decision log (docs/decisions.md routes them) when authorized, then follow it.

Distinguish an enjoyable toy, an integrated loop, a visual quality target, a
production slice and a finished campaign. Bots and stills support specific claims;
they cannot establish human fun, blind discovery, heard sound or real-time feel.
For a new deep facet use the existing research workflow before a build proposal.

## Answer compactly

Give one recommendation and no more than three immediate steps, unless the owner
asks for a broader roadmap. Include:

- Outcome and fit: what the player gains, with the decision/principle link.
- Now: phase, active gate and current evidence, including meaningful limits.
- Before X: A/B/C, dependency type and met/missing/unknown status.
- Next proof: smallest scoped work, owning files/plan, acceptance and stop condition.
- Parallel/deferred: authorized independent work and a specific revisit trigger.
- Owner choice: only if an unresolved choice blocks the dependent work.

Label the disposition: proceed within existing scope, prerequisite first, bounded
experiment, defer, or owner decision needed. A proceed result is not new authority.
For disagreements, consider the worker's counterevidence and correct the advice;
only the owner can change the binding design choice.

## Preserve continuity without a second decision log

Read-only by default. When asked to update direction, keep docs/direction.md, the one roadmap, a small
current view of phase, gate, next proofs and evidence links, with reviewed commit and
source revisions. Existing plans own tasks. DESIGN owns principles; docs/decisions.md owns
design decisions; owner-calls owns standing preferences; playtests and game-design
own observations and as-built behavior. Write an authorized decision to its owner
first, then refresh links. Never store binding decisions only in agent memory or
the Line Map. The Line Map is the owner's view of this: Claude keeps it current, and
it never outranks the repo.

Do not ask again for already-authorized work. Stop the dependent track only when a new
owner choice is required, with one recommendation, one alternative and the
consequence. Nothing waits for a playtest (owner-calls). At a Codex usage limit,
pause and tell the owner; do not shift the work to Claude.
