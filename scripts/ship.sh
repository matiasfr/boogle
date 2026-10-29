#!/usr/bin/env bash
# npm run ship: rebase your commits onto the latest main, run the checks, push. Retries if someone pushed meanwhile.
# Runs the heavy checks too (check:full) when your commits touch networking, world sync or the server.
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

cd "$(git rev-parse --show-toplevel)"
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "ship: you're on '$branch'. Ship from main, or open a PR for this branch." >&2
  exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ship: you have uncommitted changes. Commit (or stash) them first." >&2
  exit 1
fi

for attempt in 1 2 3; do
  git fetch -q origin main
  if ! git rebase -q origin/main && ! resolve_with_claude; then
    cat >&2 <<'EOF'

ship: your commits conflict with changes a friend pushed.
  1. Fix the files git lists as conflicted (or ask Claude: "resolve the rebase conflicts, keep both changes").
  2. git add <files> && git rebase --continue
  3. npm run ship again
(git rebase --abort puts everything back the way it was.)
EOF
    exit 1
  fi

  if [ -z "$(git log --oneline origin/main..HEAD)" ]; then
    echo "ship: nothing to push; you're up to date with main."
    exit 0
  fi

  changed=$(git diff --name-only origin/main..HEAD)
  if echo "$changed" | grep -qE '^(src/net|src/world/sync\.js|server/)'; then
    echo "ship: networking/sync/server changed, running the full checks..."
    npm run --silent check:full
  else
    npm run --silent check
  fi

  n=$(git rev-list --count origin/main..HEAD)
  if SHIP=1 git push -q origin HEAD:main; then
    echo "ship: pushed $n commit(s). Live site updates in about a minute."
    exit 0
  fi
  echo "ship: someone pushed while checks ran; rebasing again ($attempt/3)..."
done

echo "ship: main keeps moving; try again in a moment." >&2
exit 1
