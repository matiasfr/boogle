#!/bin/sh
# Runs the suite N times (default 6), stopping at the first failure; logs go to $OUT (default ./repeat.log).
N=${1:-6}
OUT=${OUT:-repeat.log}
i=1
while [ "$i" -le "$N" ]; do
  node "$(dirname "$0")/run.mjs" > "$OUT" 2>&1 || { echo "run $i failed (see $OUT)"; exit 1; }
  i=$((i + 1))
done
echo "all $N runs passed"
