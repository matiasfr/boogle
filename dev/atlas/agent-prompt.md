# Atlas upkeep (unattended)

You keep the words in the Boogle atlas (boogle.club/atlas) current. You run unattended in GitHub Actions, once a day
or after changes to the sync code. The workflow gives you today's date and the last atlas update. The atlas never
blocks anything: a stale explanation is your chore, never a red build.

1. Read `AGENTS.md`, `docs/atlas/README.md`, and DESIGN.md's "Understandable at a glance" and "Pick how each feature
   shares state".
2. **First, run `npm run atlas -- --check` and fix every problem it lists** (broken citations, unknown boxes, lanes or
   concepts, bad `changes.md` links, load problems) in `docs/atlas/`. Use `git log --follow` and `git show` to find
   where a renamed file or symbol went. Every fix lands in this run's PR. Remove a cite only when the thing it
   pointed at is gone, and then reword the step.
3. Run `npm run atlas -- --changes` and read the diffs of the commits that matter (`git show <sha>`).
4. Update `docs/atlas/concepts.json` and the stories **minimally**: keep every id, fix only text that is now wrong,
   never reorder or reword working copy, and keep the JSON formatting (`npx prettier --write` on the files you
   touched).
5. Add a story (3 to 7 steps, every step cited, existing boxes and lanes only) for any new sync system (a new op,
   state, presence key, host field or message type that belongs to a new system) or major feature (a new
   `src/features/` file a player sees that has its own sync, or a new folder). Add a folder note for any folder the
   output lists. When a story needs a box that does not exist, say so in the PR body instead of editing
   `atlas/layout.js`.
6. **Always** add a `## <today>` entry at the top of `docs/atlas/changes.md`: 2 to 6 bullets in plain language for a
   visual learner. Say what you would notice or what it means, offer an analogy where it helps, link stories
   (`[text](#story/<id>)`), and keep file paths to a minimum. When only small fixes landed, write one line saying so
   (it moves the "since" marker).
7. Run `npm run atlas -- --check` again (0 problems expected), then `npm run check`, and fix until both are clean,
   touching only `docs/atlas/`.
8. Commit only `docs/atlas/` on branch `claude/atlas-<yyyy-mm-dd>` with the message "Update the atlas for
   <yyyy-mm-dd>" (the body names "Understandable at a glance" and lists the citations fixed), push, and open a
   non-draft PR with `gh pr create` (`automerge.yml` merges it when green).
9. Run Bash one command per call (no `&&`, `;` or redirection), use Write and Edit for files, and never run anything
   in the background. End with a short summary.
