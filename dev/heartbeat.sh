#!/usr/bin/env bash
# npm run heartbeat [-- --all]: everything an orchestrator checks each round, in one read-only report: main's CI
# verdict first (RED MAIN with its fix PR and issue), model mode, main,
# open pull requests, the last CI, deploy and smoke runs, recent play sessions, device runs not yet pulled, the bot
# queue, the nightly jobs and their open issues, the ship lock, machine load, test and check processes that have run
# long or stalled, and the worktrees holding unmerged or
# uncommitted work (those active in the last 48 hours and a count of the rest; --all lists every one).
set -uo pipefail
all=0
for arg in "$@"; do
  case "$arg" in --all) all=1 ;; *) echo "Unknown argument: $arg"; exit 1 ;; esac
done
cd "$(git rev-parse --show-toplevel)" || exit 1
for d in "$HOME"/.nvm/versions/node/v26*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
main=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
say() { printf '\n## %s\n' "$1"; }
git fetch -q origin
# First, because one green run merges (owner call "Fast ships"): main's own CI is the check on combinations.
say "Main CI"
# Cancelled runs are superseded ones (a newer merge queued behind them), not a verdict.
ci=$(gh run list --workflow ci.yml --branch main --status completed -L 20 --json conclusion,headSha,url \
  -q '[.[] | select(.conclusion != "cancelled" and .conclusion != "skipped")][0] // empty
      | "\(.conclusion) \(.headSha[0:8]) \(.url)"' 2>/dev/null)
case "$ci" in
  success*) echo "green at ${ci#success }" ;;
  '') echo "unknown (gh run list failed)" ;;
  *)
    echo "RED MAIN: ${ci%% *} at ${ci#* }. Fixing main beats starting something new."
    gh pr list --state open --json number,headRefName,title \
      -q '.[] | select(.headRefName | startswith("claude/fix-main")) | "fix PR #\(.number): \(.title)"' 2>/dev/null
    gh issue list --label red-main --state open --json number,url -q '.[] | "issue #\(.number) \(.url)"' 2>/dev/null
    ;;
esac
say "Mode"; node dev/models.ts 2>/dev/null | head -3
say "Main"
git log origin/main -3 --format='%h %s (%cr)'
echo "main checkout: $(git -C "$main" rev-parse --abbrev-ref HEAD), $(git -C "$main" rev-list --count HEAD..origin/main) behind, $(git -C "$main" status --short | wc -l | tr -d ' ') uncommitted"
say "Open pull requests"
gh pr list --json number,title,headRefName,mergeStateStatus,isDraft \
  -q '.[] | "#\(.number) \(.mergeStateStatus)\(if .isDraft then " draft" else "" end) \(.headRefName): \(.title)"' 2>/dev/null | cut -c1-150
say "Last runs on main"
for w in ci.yml deploy.yml deploy-server.yml smoke.yml unit-long.yml; do
  gh run list --workflow "$w" --branch main -L 1 --json conclusion,status,createdAt,headSha \
    -q ".[] | \"$w: \(.conclusion // .status) \(.headSha[0:8]) \(.createdAt)\"" 2>/dev/null
done
say "Play sessions (newest first; a WORLD_NS bump waits while the owner is mid-session)"
(cd "$main" && node dev/playtest/cli.ts 2>&1 | head -6 | cut -c1-160)
# Device runs (npm run device) are bot sessions, so they are not in the list above; unpulled ones can be evicted.
(cd "$main" && [ -f dev/device/cli.ts ] && node dev/device/cli.ts waiting 2>&1 | head -2 | cut -c1-160)
say "Bot queue"
node -e '
const fs = require("fs"), dir = process.env.BOOGLE_BOT_QUEUE_DIR ?? `/tmp/boogle-bots-${process.getuid()}`;
const rows = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((n) => n.endsWith(".json")).flatMap((n) => {
  try { const t = JSON.parse(fs.readFileSync(`${dir}/${n}`, "utf8")); process.kill(t.pid, 0); return [t]; } catch { return []; }
}).sort((a, b) => b.held - a.held || a.number - b.number);
for (const t of rows) console.log(`${t.held ? "running" : "waiting"}${t.long ? " long" : ""} ${t.since ? Math.round((Date.now() - t.since) / 60000) + "m " : ""}${t.job.replace(/\/\S*\//g, "").slice(0, 120)}`);
if (!rows.length) console.log("empty");'
say "Weekly jobs (last verdict; streak = consecutive runs that were not a pass)"
echo "scheduled: scenarios, Sundays only (owner, 10 November); on command: npm run daily -- long|perf|scenarios. Off: atlas, patch-video."
for job in scenarios long; do
  # Each verdict line names its evidence dir, <job>-<ISO time with dashes>-<pid>; the time is UTC. Runs by hand count
  # too (dev/daily/verdicts.ts reads each run's evidence, not only launchd's log).
  { env ${BOOGLE_DAILY_DIR:+BOOGLE_DAILY_STATE="$BOOGLE_DAILY_DIR"} node dev/daily/verdicts.ts "$job" 2>/dev/null || true; } | awk -v job="$job" '
    { line[NR] = $0 }
    END {
      if (!NR) { print job ": no runs"; exit }
      streak = 0
      for (i = NR; i > 0 && line[i] !~ /^Daily [^:]*: (passed|no changes|delivered)\./; i--) streak++
      v = line[NR]; sub(/^Daily [^:]*: /, "", v); sub(/\. Evidence: .*/, "", v)
      d = "?"
      if (match(line[NR], /[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]-[0-9][0-9]/))
        d = substr(line[NR], RSTART, 10) " " substr(line[NR], RSTART + 11, 2) ":" substr(line[NR], RSTART + 14, 2) " UTC"
      printf "%s: %s, %s; %s\n", job, v, d, streak ? "not passing for " streak " run" (streak > 1 ? "s" : "") (streak == NR ? " (every logged run)" : "") : "passing"
    }'
done
for label in scenarios performance; do
  gh issue list --label "$label" --state open --json number,title,updatedAt \
    -q ".[] | \"open $label issue #\(.number) \(.title) (updated \(.updatedAt[0:10]))\"" 2>/dev/null | cut -c1-150
done
say "Ship lock and load"
lock=${BOOGLE_SHIP_LOCK:-/tmp/boogle-ship-$(id -u).lock}
[ -d "$lock" ] && echo "a ship holds the lock (pid $(cat "$lock/pid" 2>/dev/null))" || echo "no ship running"
uptime | sed 's/.*load averages*: */load: /'
# Owner, 11 November: check for the bottleneck each round. Two full server-suite runs sat at 0% CPU for 62 and 83
# minutes inside one test file while their agents "waited", and that held a review and the views behind it.
say "Bottleneck: long test and check processes (STALLED = over 15 minutes and under 1% CPU now)"
found=0
while read -r pid etime cpu cmd; do
  secs=$(echo "$etime" | awk -F'[-:]' '{ n = NF; s = $n + $(n-1) * 60; if (n > 2) s += $(n-2) * 3600; if (n > 3) s += $(n-3) * 86400; print s }')
  [ "$secs" -lt "${HEARTBEAT_STALL_SECS:-900}" ] && continue
  found=1
  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sed "s|^$main/||; s|^\.claude/worktrees/||")
  # A test runner idles while its children work, so judge the whole process tree.
  tree=$pid kids=$pid
  while kids=$(for k in $kids; do pgrep -P "$k"; done) && [ -n "$kids" ]; do tree="$tree $kids"; done
  cpu=$(ps -o %cpu= -p "$(echo $tree | tr ' ' ',')" 2>/dev/null | awk '{ s += $1 } END { printf "%.1f", s }')
  mark=running
  awk -v c="$cpu" 'BEGIN { exit !(c < 1) }' && mark=STALLED
  echo "$mark: pid $pid, $((secs / 60)) min, ${cpu}% CPU with its children, in ${cwd:-?}: $(echo "$cmd" | sed 's|.*/bin/node |node |' | cut -c1-90)"
done < <(ps -Ao pid=,etime=,%cpu=,command= | grep -E 'node (.* )?--test |dev/migrate/rail-mutants|dev/level/check|dev/loop/cli|dev/look/|playwright|npm run (check|test)' | grep -v -E 'grep|--test-concurre|shell-snapshots')
[ "$found" = 0 ] && echo "none over 15 minutes"
echo "A STALLED run: find its test file (pgrep -P <pid>), rerun that file alone with a timeout, kill the run, tell its agent."
say "Worktrees with unmerged or uncommitted work$([ "$all" = 1 ] || echo ', active in the last 48 hours')"
since=$(($(date +%s) - 48 * 3600))
older=0 runs=0
while read -r w; do
  [ "$w" = "$main" ] && continue
  case "$w" in */boogle-daily*|*/boogle-trusted) continue ;; esac
  ahead=$(git -C "$w" rev-list --count origin/main..HEAD 2>/dev/null || echo '?')
  status=$(git -C "$w" status --porcelain 2>/dev/null)
  dirty=$(printf '%s' "$status" | grep -c . || true)
  [ "$ahead" = 0 ] && [ "$dirty" = 0 ] && continue
  # A daily job's own worktree is its evidence; the nightly section above reports the run.
  case "$w" in */.boogle/daily/runs/*) [ "$all" = 0 ] && { runs=$((runs + 1)); continue; } ;; esac
  if [ "$all" = 0 ]; then
    # Active: the last commit, or any uncommitted file's modification time, within 48 hours.
    latest=$(git -C "$w" log -1 --format=%ct 2>/dev/null || echo 0)
    if [ "$latest" -lt "$since" ] && [ -n "$status" ]; then
      m=$(printf '%s\n' "$status" | cut -c4- | sed 's/.* -> //; s/^"//; s/"$//' | (cd "$w" && tr '\n' '\0' | xargs -0 stat -f %m 2>/dev/null) | sort -n | tail -1)
      [ -n "$m" ] && [ "$m" -gt "$latest" ] && latest=$m
    fi
    [ "$latest" -lt "$since" ] && { older=$((older + 1)); continue; }
  fi
  echo "$(basename "$w") [$(git -C "$w" rev-parse --abbrev-ref HEAD)]: $ahead ahead, $dirty uncommitted, last commit $(git -C "$w" log -1 --format=%cr): $(git -C "$w" log -1 --format=%s | cut -c1-70)"
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
[ "$older" = 0 ] || echo "$older older worktrees with unmerged or uncommitted work; \`npm run heartbeat -- --all\` lists them"
[ "$runs" = 0 ] || echo "$runs daily-run worktrees under ~/.boogle/daily/runs (the jobs' evidence); --all lists them too"
