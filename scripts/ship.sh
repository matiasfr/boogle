#!/usr/bin/env bash
# npm run ship: rebase your commits onto the latest main, run the checks, push. Retries if someone pushed meanwhile.
# Runs the heavy checks too (check:full) when your commits touch networking, world sync or the server.
set -euo pipefail

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
  if ! git rebase -q origin/main; then
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
