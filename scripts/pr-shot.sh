#!/usr/bin/env bash
# scripts/pr-shot.sh <image>...: upload screenshots for a PR and print Markdown that shows them.
# The images go to the pr-shots branch (its own history, never merged; CI and deploys ignore it), under a folder per
# upload, so main stays free of them. Paste the printed lines into your commit body (ship PRs are built from commit
# messages), a `gh pr create` body, or `gh pr comment`.
set -euo pipefail
[ $# -gt 0 ] || { echo "usage: scripts/pr-shot.sh <image>..." >&2; exit 1; }
for f; do [ -f "$f" ] || { echo "pr-shot: no such file: $f" >&2; exit 1; }; done

cd_back=$PWD
cd "$(git rev-parse --show-toplevel)"
branch=pr-shots
dir="$(date -u +%Y-%m-%d-%H%M%S)-$(git rev-parse --short=7 HEAD)"
repo=$(git remote get-url origin | sed -E 's#\.git$##; s#^.*[:/]([^/]+/[^/]+)$#\1#')
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Build the commit with plumbing in a scratch index, so your working tree and branch are untouched. Retry if a friend
# pushed screenshots at the same moment.
for try in 1 2 3; do
  parent=
  git fetch -q origin "$branch" 2>/dev/null && parent=$(git rev-parse FETCH_HEAD)
  export GIT_INDEX_FILE="$tmp/index"
  rm -f "$GIT_INDEX_FILE"
  if [ -n "$parent" ]; then git read-tree "$parent"; else git read-tree --empty; fi
  for f; do
    blob=$(cd "$cd_back" && git hash-object -w "$f")
    git update-index --add --cacheinfo "100644,$blob,$dir/$(basename "$f")"
  done
  commit=$(git commit-tree "$(git write-tree)" ${parent:+-p "$parent"} -m "Screenshots $dir")
  unset GIT_INDEX_FILE
  git push -q origin "$commit:refs/heads/$branch" 2>"$tmp/push.log" && break
  [ "$try" = 3 ] && { cat "$tmp/push.log" >&2; echo "pr-shot: push to $branch failed" >&2; exit 1; }
done

for f; do
  name=$(basename "$f")
  echo "![${name%.*}](https://raw.githubusercontent.com/$repo/$branch/$dir/$name)"
done
