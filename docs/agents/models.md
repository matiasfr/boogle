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
- **Agent frontmatter.** The `planner`, `implementer`, `designer` and `Explore` frontmatter must match `agents` in
  `dev/models.ts` (`test/models.test.ts`). A row that names a different model for one of those agents is passed as
  the Agent tool's `model` at spawn.
- **Fable is spared** (owner, 15 November: "we have to be very sparing with our fable usage"). The planner and the
  designer run Opus high, Fable medium only for extremely complex work. Fable never runs above high
  (`fableTopEffort`, owner 10 November: "fable high should be the absolute top used") and not at low either (the
  Fable 5.2 system card: low saves about 15% of medium's cost for a clear drop in score).
- **Codex is the workhorse.** Sol (`gpt-6.1-sol`) takes plan-following implementation, the runner, mechanical jobs,
  brainstorms and previz at medium, and unplanned fixes at high. A job that falls short at medium is rerun at high with
  its failed evidence, not started at high (OpenAI publishes no medium-against-high comparison). Astra
  (`gpt-6-astra`) takes the work where a wrong claim costs most: high-risk and player-visible implementation, the
  independent review and the code review at high, the hardest design and research at xhigh. A first pass at Astra
  medium may be tried where the row says so, and its result checked. Basis: the
  [GPT-6.1 Sol system card addendum](https://deploymentsafety.openai.com/gpt-6-1-sol) reports Sol misrepresenting
  its coding work in 1.50% of selected tasks against Astra's 0.51%. Every Codex result is reviewed before it ships.
- **Opus at medium, escalate on evidence** (owner, 9 November). Opus rows run at the row's effort; raise one task one
  level only when it hits bugs it couldn't fix or its result falls short, and say so in the report. Before raising,
  give the task a way to verify its own work (a failing test, a build, a look, a bot segment); it is often cheaper
  than more effort. A task that Opus high can't solve goes back to the orchestrator, not to xhigh (about 2.5x the
  cost of high for about 1.4 points on SWE-bench Pro). Opus `max` only when the owner asks.
- **Explore on Haiku.** `.claude/agents/Explore.md` pins the Explore agent to Haiku for searching, finding files and
  reading logs, where a wrong answer is cheap to spot and a Codex job would take minutes. Code edits and judgment
  calls stay off it.
- **Code review** never runs in the main session: an Astra review job on the committed branch,
  `node dev/codex/run.ts review <topic> --model gpt-6-astra --effort high` (or a T3 review delegate). Verify each
  finding against the code before acting on it.
- **Independent review** (owner, 9 November): the reviewer of a lockstep, net, world or server change is a fresh
  agent with none of the author's context, on any model the row names ("the context matters more"). Where a
  suspected defect can be shown by a test, the reviewer writes the failing test instead of only describing it.
- **Design review:** every plan or brief with gameplay calls gets the `designer` agent before it is built.
- **Brainstorm:** light by default, one agent covering the three role files in `.claude/skills/brainstorm/roles/`;
  `--panel` runs three, one per role, for a new area or big mechanic.
- **Runner:** a built branch that only owes proofs (a rebase, bot runs, stills, tick marks) goes to the runner row,
  not an implementer. A runner that hits a failure reports it; it doesn't change design or game code.
- **Daily jobs** (`dev/daily/jobs.ts`) run on Codex; at a limit they fail and report rather than spend Claude usage
  unattended.
- **Changing a route:** edit the row in `dev/models.ts` (and `agents` plus the agent's frontmatter if it is one of
  the four agents), rewrite the rule above that it changes, and record the owner's words in owner-calls.
