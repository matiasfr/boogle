#!/usr/bin/env bash
# Ship one finished job branch from its worktree: rebase onto origin/main, keep both sides of docs-only conflicts,
# then enqueue with `npm run ship`. Add --wait to wait for main explicitly.
# Cancelled CI runs are rerun automatically (twice at most). Exit codes: 2 code conflict (nothing shipped, rebase aborted), 3 a commit became empty on rebase (aborted, check it
# isn't already on main), otherwise ship's own status. Queued is not merged; --wait reports ancestry on main.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
cd "${1:?worktree path}" || exit 1
wait=0
for arg in "${@:2}"; do
  case "$arg" in --wait) wait=1 ;; *) echo "Unknown argument: $arg"; exit 1 ;; esac
done
git fetch -q origin
git rebase origin/main >/dev/null 2>&1
while [ -d "$(git rev-parse --git-path rebase-merge)" ]; do
  conflicted=$(git diff --name-only --diff-filter=U)
  if echo "$conflicted" | grep -qv '^docs/'; then
    echo "CODE CONFLICT in $1:"
    echo "$conflicted"
    git rebase --abort
    exit 2
  fi
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    python3 -I -c '
import re, sys
p = sys.argv[1]; s = open(p).read()
open(p, "w").write(re.sub(r"<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n", r"\1\2", s, flags=re.S))' "$f"
    git add "$f"
    echo "union: $f"
  done <<<"$conflicted"
  if ! GIT_EDITOR=true git rebase --continue >/dev/null 2>&1; then
    if [ -z "$(git diff --name-only --diff-filter=U)" ] && git diff --cached --quiet; then
      echo "EMPTY COMMIT at rebase: $(git log -1 --format=%s REBASE_HEAD)"
      git rebase --abort
      exit 3
    fi
  fi
done
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
SHIP_NO_AI=1 npm run "${ship_args[@]}" 2>&1 | tail -8
status=${PIPESTATUS[0]}
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
