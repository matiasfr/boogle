# Status rides the ship (proposal, 18 November 2026)

**Status: superseded, binds no one** (18 November 2026). The decision
[five jobs and fewer bookkeeping ships](../decisions-process.md#d-2026-11-18-five-jobs-fewer-bookkeeping-ships), made
the same day, already batches bookkeeping into one ship per turn and stops shipping a job's in-between states. It also
rules out part 2: a work branch never edits the state file or the backlog, after #2051, a work branch that carried its
own state and backlog edits, conflicted and had to be reshipped. The owner dropped part 1 (claim refs): with batching in
place it would save about one ship per job, which isn't worth a new tool. Only part 4 was applied: the state file has no
"Updated" line, and the orchestrate skill says not to add one back. The rest of this file is the proposal as it was
written.

Principle: iterate fast. Every merge to main costs one CI run, one Pages deploy and one smoke. Bookkeeping merges also
take orchestrator turns and cause rebase conflicts.

## What it costs today

Measured on main's first-parent history, 11 to 18 November 2026, 506 merges in all:

- **41 merges (8%) touched only status files**: `orchestrator-state.md`, `orchestrator-log.md`,
  `orchestrator-leftovers.md`, `backlog.md` and `agent-calls.md`. Each one still ran CI and deployed (`deploy.yml` runs
  on every push to main).
- Another 173 merges changed only docs or agent instructions. Most of those are real records (decisions, plans, owner
  calls) and are kept as they are; this proposal does not touch them.
- A typical job leaves this trail. Home-flip D3, the forge's west door, had one code merge (#2049) and four bookkeeping
  merges: claimed (#2040), in independent review (#2042), a pause because of it (#2047), and on main (#2050).

The saving is smaller than the first estimate in chat (20–25%): about 40 fewer deploys a week, plus fewer conflicts on
the state file. It's worth doing because it's cheap, not because it changes throughput much.

## Why the trail exists

The decision of 17 November makes the "Jobs in flight" row the cross-session lock. A session can't see a delegate
before its branch has a commit, so the claim ships to main in the turn the job starts, and the three-job limit is
counted from it. The other status ships (in review, on main, row deleted) follow from that table living in a file on
main.

## Proposal

1. **Claims are refs, not commits to main.** A new `npm run claim -- <topic> --row "<backlog row>" --by "<who>"`
   pushes the branch `claim/<topic>`: one empty commit on `origin/main` whose message holds the row's fields (job,
   backlog row, branch, started by, started, state). No CI runs (`ci.yml` runs only on main, `ship/**` and pull
   requests), and nothing deploys.
   - The push is atomic, so a second session that tries the same topic is refused, which is the lock the table was for.
   - A state change (`--state review`, `--state blocked: <why>`) pushes one more empty commit on top. That's a
     fast-forward, never a force-push, and the newest message wins.
   - `npm run ship` and `ship-queue` delete the claim for the branch they land, the way `ship` already deletes `wip/`.
     A dropped job deletes its claim with `npm run claim -- <topic> --drop`.
   - `npm run heartbeat` prints the table from `refs/heads/claim/*` instead of the state file, counts the limit from it,
     and flags a claim whose branch has had no commit in four hours. `npm run inflight` lists claims beside `wip/`,
     `ship/` and `claude/`.
   - The "Jobs in flight" table leaves the state file. The rule stays the same: claim before the first commit, and never
     start a backlog row someone has claimed.
2. **A job's status ships in its code merge.** Before `ship-queue`, the orchestrator commits the backlog row's new
   status and next step, or the row's deletion, on the job's own branch. The PR that lands the work lands its record.
   "Built and in independent review" lives only on the claim.
3. **Other state-file edits wait for the next ship.** Open owner questions, lessons and leftovers ride the next ship of
   any kind, as section 8 of the orchestrate skill already asks. They ship alone only at a session's end, a pause or an
   owner decision. Owner decisions still ship the turn they're made ("Decisions live in the repo").
4. **The state file drops its "Updated:" line.** Git records who changed it and when. Every parallel edit rewrites that
   one line, so it is where most of the file's rebase conflicts start.

## What would change

- `dev/claim.ts` (new, or a `claim` mode in `dev/inflight.ts`), `dev/heartbeat.sh` (reads claims), `scripts/ship.sh`
  and `dev/ship-queue.sh` (delete the landed claim), and the `claim` script in `package.json`.
- The orchestrate skill: section 2 (claim with the command), section 8 (status rides the ship), and steps 4 and 6 of
  section 9.
- `docs/agents/orchestrator-state.md`: the table and the "Updated:" line come out.
- A test for the claim command's refusal of a taken topic and its fast-forward state change.

No game code and no wire format change. The review stamp does not mark these paths, so they ship without an
independent review.

## Risks

- **Claims aren't in the files.** An agent that reads only the state file sees no jobs. The state file would point to
  `npm run heartbeat`, which every orchestrator run starts with anyway.
- **Stale claims.** A crashed session leaves its claim behind. The heartbeat's four-hour flag catches it, and deleting
  a ref is one command.
- **Backlog conflicts move into code ships.** Two branches that edit different backlog rows rebase cleanly (each row is
  one line). Two that edit the same row conflict, but two jobs never share a row.
- **Codex and branches outside T3.** No change: the orchestrator claims, not the child.

## Questions for the owner

1. Take all four parts? Recommended: yes. Part 1 is the one that needs tooling; parts 2 to 4 are instruction changes
   only and could go first on their own.
2. Who builds it? Recommended: one tooling job on the "Fixes, tooling and captures-driven tasks" row of
   `npm run models` (Codex, gpt-6.2-sol medium), under the three-job limit like any other job.
