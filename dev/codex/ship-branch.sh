#!/usr/bin/env bash
# Ship one finished job branch from its worktree: rebase onto origin/main, merge docs-only conflicts,
# then enqueue with `npm run ship`. Add --wait to wait for main explicitly. Docs conflicts resolve from diff3 markers
# (dev/codex/docs-union.ts): a row the commit only carried over is dropped when main removed it.
# Cancelled CI runs are rerun automatically (twice at most). Exit codes: 2 code conflict (nothing shipped, rebase aborted), 3 a commit became empty on rebase (aborted, check it
# isn't already on main), 4 conflict markers survived the docs union or one table row was edited on both sides (aborted:
# redo the edit on fresh main), otherwise ship's own status. Queued is not merged; --wait reports ancestry on main.
set -uo pipefail
# The queue captures this whole command at its call site. A standalone ship keeps its own log.
ship_branch() (
here=$(cd "$(dirname "$0")" && pwd)
cd "${1:?worktree path}" || exit 1
wait=0
for arg in "${@:2}"; do
  case "$arg" in --wait) wait=1 ;; *) echo "Unknown argument: $arg"; exit 1 ;; esac
done
git fetch -q origin || exit 1
node "$here/../rule-rebase.ts" . || exit $?
# A worktree whose node_modules is a symlink shares another checkout's install: `npm ci` would empty that checkout
# through the link (the main checkout lost its modules three times on 9 November this way). Drop the link first.
for link in node_modules server/node_modules; do
  if [ -L "$link" ]; then rm "$link"; fi
done
# `npm ci` only when node_modules is out of step with package-lock.json (dev/look/install-check.ts, from this script's
# checkout); a dropped symlink leaves nothing installed, so it reinstalls.
node "$here/../look/install-check.ts" . >/dev/null 2>&1 || npm ci --silent >/dev/null 2>&1
ship_args=(--silent ship --)
if [ "$wait" = 1 ]; then ship_args+=(--wait); fi
SHIP_NO_AI=1 npm run "${ship_args[@]}"
status=$?
[ "$status" = 0 ] || exit "$status"
if [ "$wait" = 0 ]; then
  echo 'ship-branch: queued; CI and merge still pending. Next branch can start now.'
  exit 0
fi
git fetch -q origin
left=$(git log origin/main..HEAD --oneline | wc -l | tr -d ' ')
# CI's browser install is sometimes cancelled; rerun only cancelled runs (never real failures), up to twice.
sha=$(git rev-parse HEAD)
for attempt in 1 2; do
  [ "$left" = 0 ] && break
  cancelled=$(gh run list --commit "$sha" --json databaseId,conclusion -q '.[]|select(.conclusion=="cancelled")|.databaseId' 2>/dev/null)
  [ -n "$cancelled" ] || break
  for id in $cancelled; do echo "rerunning cancelled run $id"; gh run rerun "$id" --failed >/dev/null 2>&1; done
  for _ in $(seq 40); do
    sleep 30
    git fetch -q origin
    left=$(git log origin/main..HEAD --oneline | wc -l | tr -d ' ')
    [ "$left" = 0 ] && break
    gh run list --commit "$sha" --json status -q '.[].status' 2>/dev/null | grep -qvx completed || break
  done
done
echo "unshipped commits: $left"
[ "$left" = 0 ] || exit "${status:-1}"
exit "$status"
)

if [ "${BOOGLE_QUEUE_CAPTURES_SHIP:-0}" = 1 ]; then
  ship_branch "$@"
  exit $?
fi
gitdir=$(git -C "${1:?worktree path}" rev-parse --absolute-git-dir) || exit 1
log=$(mktemp "$gitdir/ship-branch.log.XXXXXXXX") || exit 1
ship_branch "$@" >"$log" 2>&1
status=$?
tail -8 "$log"
if [ "$status" != 0 ]; then echo "full output: $log"; fi
exit "$status"
