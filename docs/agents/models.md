Before delegating work or choosing a model or effort, read this.

## Models and effort

[`dev/models.ts`](../../dev/models.ts) is the single source of truth for which model and effort each kind of work
uses: one table, no modes. `npm run models` prints it; read that rather than a copy of it anywhere else. When the mix
should change (more Codex, less Fable, a new model), the owner says so and the table's rows are edited (owner,
15 November: "just have one schema for model routing that I will update when we need to ... We shouldn't maintain 2
different models at the same time"). The owner's words for each change are in
[owner-calls](owner-calls.md#owners-standing-calls), "Models and effort"; this page holds only the rules in force.

- **Usage limits.** An agent can't read the usage meters. At a Codex or Claude limit, pause and tell the owner; don't
  move the work to another provider unasked. When the owner says a provider is running low, the rows that use it are
  edited, not worked around.
- **Agent frontmatter.** The `planner` and `Explore` frontmatter must match `agents` in
  `dev/models.ts` (`test/models.test.ts`). A row that names a different model for one of those agents is passed as
  the Agent tool's `model` at spawn.
- **Fable is spared** (owner, 15 November: "we have to be very sparing with our fable usage"). The planner runs
  Opus high, Fable medium only for extremely complex work. Fable never runs above high
  (`fableTopEffort`, owner 10 November: "fable high should be the absolute top used") and not at low either (the
  Fable 5.2 system card: low saves about 15% of medium's cost for a clear drop in score).
- **Codex is the workhorse.** Sol (`gpt-6.2-sol`) takes plan-following implementation, the runner, mechanical jobs,
  and previz at medium, and brainstorms and unplanned fixes at high. A job that falls short at medium is rerun at high with
  its failed evidence, not started at high (OpenAI publishes no medium-against-high comparison). Astra
  (`gpt-6.2-astra`) takes the work where a wrong claim costs most: high-risk and player-visible implementation, the
  independent review and the code review at high, the hardest design and research at xhigh. A first pass at Astra
  medium may be tried where the row says so, and its result checked. Both moved to the 6.2 models on 17 November
  (owner: "We should not be using Astra or sol 6.1 use SOL 6.2 and Astra 6.2 instead"); no route names
  `gpt-6.1-sol` or `gpt-6-astra` any more. T3's default effort for the 6.2 models is low, so every delegate passes
  the row's effort. Basis for the split, measured on the earlier models and not rechecked for 6.2: the
  [GPT-6.1 Sol system card addendum](https://deploymentsafety.openai.com/gpt-6-1-sol) reports Sol misrepresenting
  its coding work in 1.50% of selected tasks against Astra's 0.51%. Every Codex result is reviewed before it ships.
- **Opus at medium, escalate on evidence** (owner, 9 November). Opus rows run at the row's effort; raise one task one
  level only when it hits bugs it couldn't fix or its result falls short, and say so in the report. Before raising,
  give the task a way to verify its own work (a failing test, a build, a look, a bot segment); it is often cheaper
  than more effort. A task that Opus high can't solve goes back to the orchestrator, not to xhigh (about 2.5x the
  cost of high for about 1.4 points on SWE-bench Pro). Opus `max` only when the owner asks.
- **"A good model" picks the row, not more effort** (owner, 10 November, after a planner asked for "a good model"
  ran at high: "Fable at medium effort should be sufficient for the future FYI"). Take the model and effort from the
  table as written; raise effort only when the owner names one.
- **Explore on Haiku.** `.claude/agents/Explore.md` pins the Explore agent to Haiku for searching, finding files and
  reading logs, where a wrong answer is cheap to spot and a Codex job would take minutes. Code edits and judgment
  calls stay off it.
- **Code review** never runs in the main session: an Astra review delegate on the committed branch (T3
  `delegate_task`; with no T3 tools, `node dev/codex/run.ts review <topic> --model gpt-6.2-astra --effort high`).
  Verify each finding against the code before acting on it.
- **Independent review** (owner, 9 November): the reviewer of a lockstep, net, world or server change is a fresh
  agent with none of the author's context, on any model the row names ("the context matters more"). Where a
  suspected defect can be shown by a test, the reviewer writes the failing test instead of only describing it.
- **Design review:** every plan or brief with gameplay calls gets a design review before it is built, by its own
  author in the same context: the [design-review skill](../../.claude/skills/design-review/SKILL.md). The planner
  runs it on its plan, the orchestrator on a brief it writes, a builder on its own plan. There is no `designer`
  agent (owner, 16 November, [fold roles](owner-calls.md#fold-roles)).
- **Who plans.** The builder plans its own work and may revise the plan as it builds (the
  [build skill](../../.claude/skills/build/SKILL.md)). The `planner` agent writes a plan file only for `src/sim`,
  `src/net`, `src/world`, `server/` or the wire format, where the plan is itself reviewed, or when the owner asks
  for one.
- **Small fixes stay where they were found.** About 3 files or 150 lines at most, and nothing
  `npm run review-stamp` marks `review`: the session that found it makes the change itself, the main session
  included. A brief, a worktree and a report cost more than the edit.
- **Brainstorm:** light by default, one agent covering the three role files in `.claude/skills/brainstorm/roles/`;
  `--panel` runs three, one per role, for a new area or big mechanic.
- **Owed proofs** (a rebase, bot runs, stills, tick marks) go back to the builder's own thread, which has the
  context. A fresh runner delegate only when that thread is gone; it reports a failure and doesn't change design or
  game code.
- **Daily jobs** (`dev/daily/jobs.ts`) run on Codex; at a limit they fail and report rather than spend Claude usage
  unattended.
- **Changing a route:** edit the row in `dev/models.ts` (and `agents` plus the agent's frontmatter if it is one of
  the two agents), rewrite the rule above that it changes, and record the owner's words in owner-calls. Change one
  route at a time and compare it on the process eval (`npm run process-eval`,
  [README](../../dev/process-eval/README.md)): each task run twice on the old and the new route, and read which tasks
  flipped, not only the totals.
