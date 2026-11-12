Before delegating work or choosing a model or effort, read this.

## Models and effort

[`dev/models.ts`](../../dev/models.ts) is the single source of truth for which model and effort each kind of work uses,
in two modes: **normal** (Claude only) and **withCodex** (Codex is the workhorse, Claude is saved for Opus). `npm run models` prints the active mode and its table; read that rather than a copy of it anywhere else.

- **Switching:** `codexFrom` in `dev/models.ts` is the local date withCodex starts (null: stay normal). Only the owner
  switches modes; an agent that hits a Codex limit in withCodex mode pauses and tells the owner.
- **Enforcement:** in normal mode `dev/codex/run.ts` and `npm run queue` refuse Codex jobs except previz, which is
  still tried because only Codex paints; at a limit, images wait and the owner is told. The `planner`, `implementer`, `designer` and `Explore`
  frontmatter must match `agents` in `dev/models.ts` (`test/models.test.ts`).
- **Opus at medium** (owner, 9 November: "use opus medium instead of opus high, unless we encounter bugs or opus
  medium is not sufficient to solve the problem"): every Opus route runs at medium. Raise a single task to high, as
  the Agent tool's `effort`, only when it hits bugs medium couldn't fix or medium's result falls short, and say so in
  the report. Opus `max` only when the owner asks.
- **Escalating** (10 November, from Anthropic's model guide of 9 November; owner: "update our model routing if
  appropriate"): before raising effort, check the task can verify its own work (a failing test, a build, a look, a
  bot segment) and give it that; it is often cheaper than more effort. Then raise one level. Past `high`, Opus
  `xhigh` costs about 2.5x `high` for about 1.4 points on SWE-bench Pro, so a task that `high` can't solve goes back to
  the orchestrator, not to xhigh.
- **Implementer on Sonnet** (owner, 10 November: "Sonnet 5.5 Medium Implementer makes sense if it's working off an
  existing plan"): the `implementer` agent runs Sonnet 5.5 at medium and only builds an approved plan or written brief.
  Work with no plan (fixes, tooling) goes to an Opus medium general-purpose subagent. High-risk implementation
  (server, sync, `src/world`, `src/net`) stays on Opus: spawn the implementer with `model: opus`, an orchestrator
  default logged in [agent-calls](../agent-calls.md). A Sonnet implementer that stalls on a plan step reports back;
  the orchestrator reruns that step on Opus. Deep research stays on Opus medium (owner: "we try planning on and
  deep research on Opus Medium still"); planning has since moved to Fable (below).
- **Fable at medium where taste or judgment decides** (owner, 11 November,
  [call](owner-calls.md#fable-where-taste-decides)): player-visible implementation, the visual review of it, the
  independent review, brainstorms and the hardest design work. Spawn the implementer with `model: fable` for
  player-visible work; mechanical work stays on Sonnet.
- **Explore on Haiku** (same source): the built-in Explore agent otherwise runs on the session's model, Fable or Opus
  here. `.claude/agents/Explore.md` pins it to Haiku 5.5 for searching, finding files and reading logs, where a wrong
  answer is cheap to spot. Code edits and judgment calls stay on Opus or the main session.
- **Orchestrator** runs Opus medium, Opus high or Fable medium (owner, 9 November: "orchestrator can use opus
  medium, high, or fable medium").
- **Fable for the orchestrator, the planner and the design review** (owner, 9 November, after measuring that Fable
  5.2 uses the weekly limit about 2.9x as fast as Opus 5.5 per million output tokens, and fills its own Fable limit
  too): Fable runs only where its work is short and steers the rest. The main session, and the independent review at
  medium on Fable or Opus (owner, 9 November: "so can the independent review"). The `planner` and `designer` agents
  run Fable medium (owner, 10 November: "Fable medium right now, since it's bounded and won't have back and forth to
  generate the plan. Fable excels if it can finish the task quickly"). The hardest design, research and
  second-opinion work, and every `/code-review`, run on Opus. Per-task savings at API prices (the Fable 5.2 system
  card) don't carry over to a subscription, where the limit is what runs out.
- **Code review** runs in an Opus medium general-purpose subagent with `/code-review medium`, never in the main session.
- **Fable tops out at high** (owner, 10 November: "don't use fable xHigh, fable high should be the absolute top
  used"). No route, spawn or review runs Fable at xhigh or max (`fableTopEffort`, `test/models.test.ts`), and it
  doesn't run at low either: the Fable 5.2 system card shows low saving about 15% of medium's cost for a clear drop
  in score and fewer test runs.
- **Brainstorm:** light by default, one subagent covering the three role files in `.claude/skills/brainstorm/roles/`
  in one pass; `--panel` runs three, one per role, for a new area or big mechanic (owner, 9 November).
- **Design review:** every plan or brief with gameplay calls gets the `designer` agent before it is built (owner,
  9 November).
- **Independent review** (owner, 9 November): the reviewer of a lockstep, net, world or server change is a fresh
  agent with none of the author's context; any model on the route will do, including the author's (owner: "i dont
  think that blind spot is too real, the context matters more"). Where a suspected defect can be shown by a test, the
  reviewer writes the failing test instead of only describing it.
- **Runner** (owner, 9 November): a built branch that only owes proofs (a rebase, bot runs, stills, tick marks) goes
  to the runner route, not an implementer. A runner that hits a failure reports it; it doesn't change design or game
  code.
- **Strongest model for the few calls that steer the rest** (9 November, the orchestrator's reading of the owner's
  "let's do 1-8"; logged in [agent-calls](../agent-calls.md)): the main session, the planner and the independent
  review ran on Fable. Narrowed the same day to the main session and the independent review (see "Fable for the
  orchestrator, the planner and the design review" above).
- **Daily jobs** (`dev/daily/jobs.ts`) stay on Codex; at a limit they fail and report rather than spend Claude usage
  unattended.
- **Changing a route:** edit `dev/models.ts` and record the owner's words in
  [owner-calls](owner-calls.md#owners-standing-calls), "Models and effort".
