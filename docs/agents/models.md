Before delegating work or choosing a model or effort, read this.

## Models and effort

[`dev/models.ts`](../../dev/models.ts) is the single source of truth for which model and effort each kind of work uses,
in two modes: **normal** (Claude only) and **withCodex** (Codex is the workhorse, Claude is saved for Opus). `npm run models` prints the active mode and its table; read that rather than a copy of it anywhere else.

- **Switching:** `codexFrom` in `dev/models.ts` is the local date withCodex starts (null: stay normal). Only the owner
  switches modes; an agent that hits a Codex limit in withCodex mode pauses and tells the owner.
- **Enforcement:** in normal mode `dev/codex/run.ts` and `npm run queue` refuse Codex jobs except previz, which is
  still tried because only Codex paints; at a limit, images wait and the owner is told. The `planner`, `implementer` and `designer`
  frontmatter must match `agents` in `dev/models.ts` (`test/models.test.ts`).
- **Effort at spawn:** where a route names an effort different from the agent's frontmatter (high-risk implementation),
  pass it as the Agent tool's `effort`. Opus `max` only when the owner asks.
- **Fable only for the orchestrator** (owner, 9 November, after measuring that Fable 5.2 uses the weekly limit about
  2.9x as fast as Opus 5.5 per million output tokens, and fills its own Fable limit too): the main session is the only
  steady Fable user. The independent review stays on Fable at medium because it runs rarely and the reviewer can't be
  the Opus that wrote the code. Planning, the hardest design, research and second-opinion work, and every
  `/code-review` run on Opus. Per-task savings at API prices (the Fable 5.2 system card) don't carry over to a
  subscription, where the limit is what runs out.
- **Code review** runs in an Opus high general-purpose subagent with `/code-review high`, never in the main session,
  which runs on Fable. Opus reviewing Opus-written code is fine for this check; the independent review below is the
  different-model one.
- **Fable tops out at high** (owner, 10 November: "don't use fable xHigh, fable high should be the absolute top
  used"). No route, spawn or review runs Fable at xhigh or max (`fableTopEffort`, `test/models.test.ts`), and it
  doesn't run at low either: the Fable 5.2 system card shows low saving about 15% of medium's cost for a clear drop
  in score and fewer test runs.
- **Brainstorm:** light by default, one subagent covering the three role files in `.claude/skills/brainstorm/roles/`
  in one pass; `--panel` runs three, one per role, for a new area or big mechanic (owner, 9 November).
- **Design review:** every plan or brief with gameplay calls gets the `designer` agent before it is built (owner,
  9 November).
- **Independent review** (owner, 9 November): the reviewer of a lockstep, net, world or server change is never the
  model that wrote it in the same session, and in withCodex mode it is the other vendor (Codex reviews Claude's code,
  Claude reviews Codex's), because an author and a reviewer on the same model share blind spots. Where a suspected
  defect can be shown by a test, the reviewer writes the failing test instead of only describing it.
- **Runner** (owner, 9 November): a built branch that only owes proofs (a rebase, bot runs, stills, tick marks) goes
  to the runner route, not an implementer. A runner that hits a failure reports it; it doesn't change design or game
  code.
- **Strongest model for the few calls that steer the rest** (9 November, the orchestrator's reading of the owner's
  "let's do 1-8"; logged in [agent-calls](../agent-calls.md)): the main session, the planner and the independent
  review ran on Fable. Narrowed the same day to the main session and the independent review (see "Fable only for the
  orchestrator" above).
- **Daily jobs** (`dev/daily/jobs.ts`) stay on Codex; at a limit they fail and report rather than spend Claude usage
  unattended.
- **Changing a route:** edit `dev/models.ts` and record the owner's words in
  [owner-calls](owner-calls.md#owners-standing-calls), "Models and effort".
