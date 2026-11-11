#!/usr/bin/env bash
# npm run ship-queue -- <worktree> [--wait] [--dry-run] [--reviewed "<stamp> <who, what they found>"]
#   [--orchestrator-read "<what changed in the tests>"] [--nightly-known "<why>"] [--main-known "<why>"]
# The orchestrator's merge queue, for Claude or Codex: one ship at a time across every session on this machine.
#   1. The review trigger is dev/review-stamp.ts (its REVIEW_PATHS and test rules; each file's rule is printed). Refuses
#      a branch with a file that needs review unless --reviewed starts with the review stamp of exactly those files'
#      diff, recomputed here before any rebase, so a fix pushed after the review needs a new review (orchestrate skill,
#      "Review"). A branch whose review-path files are only tests with no assertion change needs --orchestrator-read.
#   1b. Holds a review-path branch (either kind) while the last scenarios verdict (the weekly job, or `npm run daily --
#      scenarios` by hand) is not a pass, unless --nightly-known says why, and while a `red-main` issue is open, unless
#      --main-known says why (it is the fix, or unrelated).
#      --dry-run stops after these checks.
#   2. Takes a machine-wide lock for the local part only (rebase, gate, push), so the next ship can start while CI runs.
#   3. Runs dev/codex/ship-branch.sh from the trusted checkout (../boogle-trusted, detached at origin/main), never from
#      the branch being shipped; a missing or broken trusted checkout is exit 1.
#   4. With --wait, polls up to 30 minutes for the commits on origin/main, and starts CI once if none ran for the push.
# Exit: 0 shipped (with --wait: on main; with --dry-run: checks passed), 1 cannot ship (no trusted checkout), 4 needs
# review, the stamp is stale or the orchestrator's read is missing, 5 not on main after the wait, 6 held by a red
# nightly, 7 held by a red main, otherwise ship-branch's status.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
wt=$(cd "${1:?worktree path}" && pwd) || exit 1
shift
wait=0 dry=0 reviewed='' known='' read='' mainknown=''
while [ $# -gt 0 ]; do
  case "$1" in
    --wait) wait=1 ;;
    --dry-run) dry=1 ;;
    --reviewed) reviewed="${2:?--reviewed needs a note}"; shift ;;
    --orchestrator-read) read="${2:?--orchestrator-read needs a note}"; shift ;;
    --nightly-known) known="${2:?--nightly-known needs a reason}"; shift ;;
    --main-known) mainknown="${2:?--main-known needs a reason}"; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done
# The pinned Node (.nvmrc) from nvm, first on PATH: the one lookup is dev/node-version.ts.
if bin=$(node "$here/node-version.ts" --bin); then PATH="$bin:$PATH"; fi
main=$(git -C "$wt" worktree list --porcelain | sed -n '1s/^worktree //p')
trusted=${BOOGLE_TRUSTED:-$(dirname "$main")/boogle-trusted}

git -C "$wt" fetch -q origin
# One line per review-path file: `review <file>: <rule>` or `read <file>: <rule>` (dev/review-stamp.ts owns the list).
verdicts=$(node "$here/review-stamp.ts" "$wt" --files --no-fetch) || exit 1
risky=$(grep '^review ' <<<"$verdicts" || true)
if [ -n "$risky" ]; then
  # Computed before ship-branch rebases; dev/review-stamp.ts says why a rebase onto unrelated main commits keeps it.
  stamp=$(node "$here/review-stamp.ts" "$wt" --id --no-fetch) || exit 1
  given=${reviewed%% *}
  if [ -z "$reviewed" ]; then
    echo "ship-queue: needs an independent review before it ships (rule per file):"
    echo "$risky" | sed 's/^review /  /'
    echo "Review it (orchestrate skill, \"Review\"), then pass --reviewed \"$stamp <who, what they found>\"."
    exit 4
  elif ! [[ "$given" =~ ^[0-9a-f]{12}$ ]]; then
    echo "ship-queue: --reviewed must start with the review stamp of the code that was read (npm run review-stamp -- $wt)."
    echo "  got: $reviewed"
    exit 4
  elif [ "$given" != "$stamp" ]; then
    echo "ship-queue: the reviewed files changed after the review (stamp $given, now $stamp): re-review, then pass the new stamp."
    echo "$risky" | sed 's/^review /  /'
    exit 4
  fi
  echo "ship-queue: reviewed: $reviewed"
elif [ -n "$verdicts" ]; then
  if [ -z "$read" ]; then
    echo "ship-queue: tests on the review paths changed with no assertion change (rule per file):"
    echo "$verdicts" | sed 's/^read /  /'
    echo "Read them yourself, then pass --orchestrator-read \"<what changed in them>\"."
    exit 4
  fi
  echo "ship-queue: orchestrator read: $read"
fi
if [ -n "$verdicts" ]; then
  # The newest scenarios verdict, scheduled or by hand (dev/daily/verdicts.ts, the heartbeat's reader too).
  verdict=$(env ${BOOGLE_DAILY_DIR:+BOOGLE_DAILY_STATE="$BOOGLE_DAILY_DIR"} node "$here/daily/verdicts.ts" scenarios 2>/dev/null | tail -1)
  if [ -z "$verdict" ]; then
    echo "ship-queue: no scenarios run recorded; not held."
  elif ! [[ "$verdict" =~ ^Daily\ scenarios:\ passed\. ]]; then
    echo "ship-queue: the last nightly scenarios run was not a pass:"
    echo "  $verdict"
    if [ -z "$known" ]; then
      echo 'Review-path ships wait for a green scenarios run (weekly, or npm run daily -- scenarios). Look at the evidence; if it is unrelated or already tracked, pass'
      echo '--nightly-known "<why this failure is unrelated or already tracked>".'
      exit 6
    fi
    echo "ship-queue: nightly known: $known"
  fi
  # Red combinations are why main CI runs: a review-path ship waits for a green main (ci.yml's red-main job closes the
  # issue). If GitHub cannot be read, say so and do not hold.
  if ! red=$(gh issue list --label red-main --state open --limit 1 --json number,url --jq '.[] | "#\(.number) \(.url)"' 2>/dev/null); then
    echo "ship-queue: could not read red-main issues (gh); not held."
  elif [ -n "$red" ]; then
    echo "ship-queue: main is red ($red)."
    if [ -z "$mainknown" ]; then
      echo 'Review-path ships wait for a green main; ci-autofix bisects and opens a claude/fix-main-* PR. If this branch is the fix or'
      echo 'the failure is unrelated, pass --main-known "<why>".'
      exit 7
    fi
    echo "ship-queue: main known: $mainknown"
  fi
fi
if [ "$dry" = 1 ]; then echo "ship-queue: dry run, checks passed; nothing locked or shipped."; exit 0; fi
# The trusted checkout must be a checkout of its own with the ship script, or nothing could ship: never report success.
if ! [ -f "$trusted/dev/codex/ship-branch.sh" ] ||
  [ "$(git -C "$trusted" rev-parse --show-toplevel 2>/dev/null)" != "$(cd "$trusted" && pwd -P)" ]; then
  echo "ship-queue: no trusted checkout at $trusted: git -C $main worktree add --detach $trusted origin/main"
  exit 1
fi

lock=${BOOGLE_SHIP_LOCK:-/tmp/boogle-ship-$(id -u).lock}
until mkdir "$lock" 2>/dev/null; do
  holder=$(cat "$lock/pid" 2>/dev/null || true)
  if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
    echo "ship-queue: clearing a dead ship's lock (pid $holder)"
    rm -f "${lock:?}/pid" && rmdir "$lock" 2>/dev/null
    continue
  fi
  sleep 5
done
echo $$ >"$lock/pid"
unlock() { rm -f "${lock:?}/pid"; rmdir "$lock" 2>/dev/null; }
trap unlock EXIT
if ! { git -C "$trusted" fetch -q origin && git -C "$trusted" checkout -q --detach origin/main; }; then
  echo "ship-queue: could not move the trusted checkout $trusted to origin/main; nothing shipped."
  exit 1
fi
bash "$trusted/dev/codex/ship-branch.sh" "$wt" 2>&1 | tail -6
status=${PIPESTATUS[0]}
unlock
trap - EXIT
[ "$status" = 0 ] || exit "$status"
[ "$wait" = 1 ] || exit 0

sha=$(git -C "$wt" rev-parse HEAD)
left() { git -C "$wt" fetch -q origin; git -C "$wt" log origin/main..HEAD --oneline | wc -l | tr -d ' '; }
for i in $(seq 1 90); do
  [ "$(left)" = 0 ] && { echo "ship: on main"; exit 0; }
  # A push sometimes gets no CI run ("workflow file issue" on Auto-merge, seen 9 November): start CI once by hand.
  if [ "$i" = 12 ] && [ "$(gh run list --commit "$sha" --workflow ci.yml --json databaseId -q length 2>/dev/null)" = 0 ]; then
    branch=$(git -C "$wt" branch -r --contains "$sha" | sed -n 's|^ *origin/\(ship/.*\)$|\1|p' | head -1)
    [ -z "$branch" ] || { echo "ship-queue: no CI run for $sha; starting ci.yml on $branch"; gh workflow run ci.yml --ref "$branch"; }
  fi
  sleep 20
done
echo "ship: not on main after 30 minutes. Runs for $sha:"
gh run list --commit "$sha" -L 6 2>/dev/null
exit 5
