#!/usr/bin/env bash
# npm run ship: rebase your commits onto the latest main, run the checks, push them to a ship/<you>-<sha> branch.
# CI runs on that branch. Green: automerge.yml opens a PR, merges it into main and deploys. Red: ci-autofix.yml has
# Claude push a fix to the branch. main itself only takes PRs.
# Runs the fast checks (check) here; CI runs the heavy ones (server tests, headless network test) on the branch.
# `npm run ship -- --wait` waits until your commits are on main.
set -euo pipefail

# On a rebase conflict, ship asks Claude Code (if installed) to resolve it, keeping both sides' changes.
# SHIP_NO_AI=1 turns that off.
resolve_with_claude() {
  command -v claude >/dev/null 2>&1 && [ -z "${SHIP_NO_AI:-}" ] || return 1
  local tries=0
  while [ -d "$(git rev-parse --git-path rebase-merge)" ] || [ -d "$(git rev-parse --git-path rebase-apply)" ]; do
    tries=$((tries + 1))
    [ "$tries" -le 10 ] || return 1
    local files
    files=$(git diff --name-only --diff-filter=U)
    if [ -n "$files" ]; then
      echo "ship: asking Claude to resolve conflicts in: $(echo $files)"
      claude -p "A git rebase stopped on conflicts in: $files. Resolve every conflict so BOTH sides' changes are kept (they are usually independent features; combine them, never drop either side). Follow AGENTS.md. Remove all conflict markers, then git add the resolved files. Do not run git rebase --continue or commit." \
        --permission-mode acceptEdits --allowedTools "Read,Edit,Write,Grep,Glob,Bash(git add:*),Bash(git status:*),Bash(git diff:*)" >/dev/null || return 1
      if git diff --name-only --diff-filter=U | grep -q . || git grep -nE '^(<<<<<<<|>>>>>>>) ' -- $files >/dev/null 2>&1; then
        return 1
      fi
    fi
    GIT_EDITOR=true git rebase --continue >/dev/null 2>&1 || true
  done
  echo "ship: conflicts resolved by Claude; checks will verify the result."
}

ship() {
  local wait=0
  [ "${1:-}" = "--wait" ] && wait=1

  cd "$(git rev-parse --show-toplevel)"
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "ship: you have uncommitted changes. Commit (or stash) them first." >&2
    exit 1
  fi

  git fetch -q origin main
  if ! git rebase -q origin/main && ! resolve_with_claude; then
    cat >&2 <<'EOF'

ship: your commits conflict with changes a friend shipped.
  1. Fix the files git lists as conflicted (or ask Claude: "resolve the rebase conflicts, keep both changes").
  2. git add <files> && git rebase --continue
  3. npm run ship again
(git rebase --abort puts everything back the way it was.)
EOF
    exit 1
  fi

  if [ -z "$(git log --oneline origin/main..HEAD)" ]; then
    echo "ship: nothing to ship; you're up to date with main."
    exit 0
  fi

  npm run --silent check

  # A new branch per ship. Shipping again before the last one merged opens a second PR that also carries the
  # first's commits; both merge cleanly (merge commits keep your commits as they are), and automerge.yml closes a PR
  # whose commits are already on main.
  local who branch n repo
  who=$(git config user.name || true)
  who=$(printf '%s' "${who:-someone}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-*//;s/-*$//' | cut -c1-20)
  branch="ship/${who:-someone}-$(git rev-parse --short=7 HEAD)"
  n=$(git rev-list --count origin/main..HEAD)
  git push -q origin "HEAD:refs/heads/$branch"

  repo=$(git remote get-url origin | sed -E 's#\.git$##; s#^.*[:/]([^/]+/[^/]+)$#\1#')
  cat <<EOF
ship: pushed $n commit(s) to $branch.
  CI runs on it now (a minute or two). Green: a bot opens the PR, merges it and deploys. Red, or in conflict with
  main: Claude pushes a fix to the branch (twice at most, then the PR @mentions you).
  CI: https://github.com/$repo/actions?query=branch%3A${branch//\//%2F}
  PR: https://github.com/$repo/pulls?q=is%3Apr+head%3A${branch//\//%2F}
EOF
  [ "$wait" = 1 ] || exit 0

  # Merge commits keep our commits as they are, so "on main" is plain ancestry.
  local head
  head=$(git rev-parse HEAD)
  for _ in $(seq 1 60); do
    sleep 15
    git fetch -q origin main
    if git merge-base --is-ancestor "$head" origin/main; then
      echo "ship: merged into main; the live site updates in about a minute."
      exit 0
    fi
  done
  echo "ship: not on main after 15 minutes; check the PR link above." >&2
  exit 1
}

ship "$@"
