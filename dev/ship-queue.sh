#!/usr/bin/env bash
# npm run ship-queue -- <worktree> [--wait] [--dry-run] [--reviewed "<stamp> <who, what they found>"]
#   [--nightly-known "<why the red nightly is unrelated or tracked>"]
# The orchestrator's merge queue, for Claude or Codex: one ship at a time across every session on this machine.
#   1. Refuses a branch that touches src/sim, src/net, src/world or server/ unless --reviewed starts with the review
#      stamp of exactly those files' diff (npm run review-stamp -- <worktree>), recomputed here before any rebase, so a
#      fix pushed after the review needs a new review (orchestrate skill, "Review").
#   1b. Holds such a branch while the last scenarios verdict (the weekly job, or `npm run daily -- scenarios` by hand)
#      is not a pass, unless --nightly-known says why.
#      --dry-run stops after these checks.
#   2. Takes a machine-wide lock for the local part only (rebase, gate, push), so the next ship can start while CI runs.
#   3. Runs dev/codex/ship-branch.sh from the trusted checkout (../boogle-trusted, detached at origin/main), never from
#      the branch being shipped.
#   4. With --wait, polls up to 30 minutes for the commits on origin/main, and starts CI once if none ran for the push.
# Exit: 0 shipped (with --wait: on main; with --dry-run: checks passed), 4 needs review or the stamp is stale, 5 not on
# main after the wait, 6 held by a red nightly, otherwise ship-branch's status.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
wt=$(cd "${1:?worktree path}" && pwd) || exit 1
shift
wait=0 dry=0 reviewed='' known=''
while [ $# -gt 0 ]; do
  case "$1" in
    --wait) wait=1 ;;
    --dry-run) dry=1 ;;
    --reviewed) reviewed="${2:?--reviewed needs a note}"; shift ;;
    --nightly-known) known="${2:?--nightly-known needs a reason}"; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done
# The pinned Node (.nvmrc) from nvm, first on PATH: the one lookup is dev/node-version.ts.
if bin=$(node "$here/node-version.ts" --bin); then PATH="$bin:$PATH"; fi
main=$(git -C "$wt" worktree list --porcelain | sed -n '1s/^worktree //p')
trusted=${BOOGLE_TRUSTED:-$(dirname "$main")/boogle-trusted}

git -C "$wt" fetch -q origin
risky=$(git -C "$wt" diff --name-only origin/main...HEAD | grep -E '^(src/(sim|net|world)|server)/' || true)
if [ -n "$risky" ]; then
  # Computed before ship-branch rebases; dev/review-stamp.ts says why a rebase onto unrelated main commits keeps it.
  stamp=$(node "$here/review-stamp.ts" "$wt" --id --no-fetch) || exit 1
  given=${reviewed%% *}
  if [ -z "$reviewed" ]; then
    echo "ship-queue: needs an independent review before it ships (lockstep, net, world or server files):"
    echo "$risky" | sed 's/^/  /'
    echo "Review it (orchestrate skill, \"Review\"), then pass --reviewed \"$stamp <who, what they found>\"."
    exit 4
  elif ! [[ "$given" =~ ^[0-9a-f]{12}$ ]]; then
    echo "ship-queue: --reviewed must start with the review stamp of the code that was read (npm run review-stamp -- $wt)."
    echo "  got: $reviewed"
    exit 4
  elif [ "$given" != "$stamp" ]; then
    echo "ship-queue: the risky files changed after the review (stamp $given, now $stamp): re-review, then pass the new stamp."
    echo "$risky" | sed 's/^/  /'
    exit 4
  fi
  echo "ship-queue: reviewed: $reviewed"
  log=${BOOGLE_DAILY_DIR:-$HOME/.boogle/daily}/scenarios.log
  verdict=$(grep '^Daily scenarios:' "$log" 2>/dev/null | tail -1)
  if [ -z "$verdict" ]; then
    echo "ship-queue: no nightly scenarios run in $log; not held."
  elif ! [[ "$verdict" =~ ^Daily\ scenarios:\ passed\. ]]; then
    echo "ship-queue: the last nightly scenarios run was not a pass:"
    echo "  $verdict"
    if [ -z "$known" ]; then
      echo 'Risky ships wait for a green scenarios run (weekly, or npm run daily -- scenarios). Look at the evidence; if it is unrelated or already tracked, pass'
      echo '--nightly-known "<why this failure is unrelated or already tracked>".'
      exit 6
    fi
    echo "ship-queue: nightly known: $known"
  fi
fi
if [ "$dry" = 1 ]; then echo "ship-queue: dry run, checks passed; nothing locked or shipped."; exit 0; fi
[ -d "$trusted" ] || { echo "No trusted checkout at $trusted: git -C $main worktree add --detach $trusted origin/main"; exit 1; }

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
git -C "$trusted" fetch -q origin && git -C "$trusted" checkout -q --detach origin/main
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
