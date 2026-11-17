# Process eval

Ten past Boogle tasks, rebuilt by a route and scored on the tests their merged version shipped with. It answers one
question: does a change to how work is run (a row of `dev/models.ts`, a folded agent, a new skill) do the same work as
well, with fewer rounds? Owner call "Fold roles into the builder" (16 November 2026), after Anthropic's
[article on folding subagents](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop):
measure, change one thing at a time, and keep what holds up.

It checks the process, not the game. Nothing here ships: eval branches are named `eval/…` and never go to main.

## Run a comparison

1. Name the two routes, for example `planner-then-sol` (the old one) and `sol-own-plan` (the new one). A route name
   stands for everything about how the task was run: who planned, who built, which model and effort, which skills.
2. For each task and each route, twice:
   - `npm run process-eval -- prepare <task> --route <name>` makes a worktree at the commit before the task's merged
     version and prints the brief.
   - Hand that brief to the route exactly as it would run real work (a delegate, a planner first, the main session).
     The builder must not see the reference commit or its tests.
   - `npm run process-eval -- score <task> <worktree> --route <name> --rounds <n> --findings <n> --minutes <n>` runs the
     known-good tests on the worktree's committed HEAD and appends a line to `results.jsonl`. `--rounds` is how many
     times the work went back before it would have merged, `--findings` the review findings that were real,
     `--minutes` the wall-clock time; `--note` holds anything else worth keeping.
3. `npm run process-eval -- report --compare <routeA> <routeB>` prints passes over runs for every task and lists the
   tasks that flipped. Read each flip before keeping the change: a route can lower rounds and still break a task that
   used to pass.

Remove an eval worktree and its `eval/…` branch once it is scored. Commit `results.jsonl` with the route change it
supports.

## Rules

- **One change at a time.** Two edits to the table between runs can't be told apart.
- **Each task twice per route.** A break often shows in one run of two; the report refuses to compare a task with
  fewer than two runs on either side, and shows `mixed` when a route's own runs disagree.
- **Flips beat totals.** Nine of ten on both sides can hide one task that started failing and one that started passing.
- **Passing the tests is the floor.** The tests cover what the merged version proved, not how the change looks or
  feels; a player-visible task still gets its proof look, judged by whoever scores it and written in `--note`.
- **A different shape can fail honestly.** The tests import the names the merged version used, so each brief states
  that interface. A run that solves the task under other names fails here; say so in `--note` and count it as a brief
  to fix, not a route that lost.

## The tasks

`npm run process-eval` lists them; they live in [tasks.ts](tasks.ts). Each is a merged commit small enough to rebuild
in one sitting, with a unit test that fails on the commit before it and passes on it. `npm run process-eval -- verify`
proves that for every task (run it after adding one). The set mixes lockstep rules, view logic a player sees, and
tooling, because a route that suits one kind can fail another.

To add a task: pick a merged commit that changes at least one `test/*.test.ts`, write a brief that states the ask as
the owner or a finding would, the files in play and the interface the tests need, and run `verify`. Retire a task when
the code it touches is gone and its base no longer resembles the game.
