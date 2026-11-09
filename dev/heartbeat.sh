#!/usr/bin/env bash
# npm run heartbeat: everything an orchestrator checks each round, in one read-only report: model mode, main, open pull
# requests, the last CI, deploy and smoke runs, recent play sessions, the bot queue, the ship lock, machine load and
# every worktree holding unmerged or uncommitted work.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
for d in "$HOME"/.nvm/versions/node/v26*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
main=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
say() { printf '\n## %s\n' "$1"; }
git fetch -q origin
say "Mode"; node dev/models.ts 2>/dev/null | head -3
say "Main"
git log origin/main -3 --format='%h %s (%cr)'
echo "main checkout: $(git -C "$main" rev-parse --abbrev-ref HEAD), $(git -C "$main" rev-list --count HEAD..origin/main) behind, $(git -C "$main" status --short | wc -l | tr -d ' ') uncommitted"
say "Open pull requests"
gh pr list --json number,title,headRefName,mergeStateStatus,isDraft \
  -q '.[] | "#\(.number) \(.mergeStateStatus)\(if .isDraft then " draft" else "" end) \(.headRefName): \(.title)"' 2>/dev/null | cut -c1-150
say "Last runs on main"
for w in ci.yml deploy.yml deploy-server.yml smoke.yml; do
  gh run list --workflow "$w" --branch main -L 1 --json conclusion,status,createdAt,headSha \
    -q ".[] | \"$w: \(.conclusion // .status) \(.headSha[0:8]) \(.createdAt)\"" 2>/dev/null
done
say "Play sessions (newest first; a WORLD_NS bump waits while the owner is mid-session)"
(cd "$main" && node dev/playtest/cli.ts 2>&1 | head -6 | cut -c1-160)
say "Bot queue"
node -e '
const fs = require("fs"), dir = process.env.BOOGLE_BOT_QUEUE_DIR ?? `/tmp/boogle-bots-${process.getuid()}`;
const rows = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((n) => n.endsWith(".json")).flatMap((n) => {
  try { const t = JSON.parse(fs.readFileSync(`${dir}/${n}`, "utf8")); process.kill(t.pid, 0); return [t]; } catch { return []; }
}).sort((a, b) => b.held - a.held || a.number - b.number);
for (const t of rows) console.log(`${t.held ? "running" : "waiting"}${t.long ? " long" : ""} ${t.since ? Math.round((Date.now() - t.since) / 60000) + "m " : ""}${t.job.replace(/\/\S*\//g, "").slice(0, 120)}`);
if (!rows.length) console.log("empty");'
say "Ship lock and load"
lock=${BOOGLE_SHIP_LOCK:-/tmp/boogle-ship-$(id -u).lock}
[ -d "$lock" ] && echo "a ship holds the lock (pid $(cat "$lock/pid" 2>/dev/null))" || echo "no ship running"
uptime | sed 's/.*load averages*: */load: /'
say "Worktrees with unmerged or uncommitted work"
git worktree list --porcelain | sed -n 's/^worktree //p' | while read -r w; do
  [ "$w" = "$main" ] && continue
  case "$w" in */boogle-daily*|*/boogle-trusted) continue ;; esac
  ahead=$(git -C "$w" rev-list --count origin/main..HEAD 2>/dev/null || echo '?')
  dirty=$(git -C "$w" status --short 2>/dev/null | wc -l | tr -d ' ')
  [ "$ahead" = 0 ] && [ "$dirty" = 0 ] && continue
  echo "$(basename "$w") [$(git -C "$w" rev-parse --abbrev-ref HEAD)]: $ahead ahead, $dirty uncommitted, last commit $(git -C "$w" log -1 --format=%cr): $(git -C "$w" log -1 --format=%s | cut -c1-70)"
done
