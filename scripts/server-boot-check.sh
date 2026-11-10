#!/usr/bin/env bash
# Boots a built server image with an empty temp data dir and requires GET /version to answer 200 with the image's
# build, so a boot crash (a missing module, a bad CMD) fails CI and the deploy job before flyctl replaces the machine.
# Usage: scripts/server-boot-check.sh <image> <expected BOOGLE_BUILD>. Used by ci.yml and deploy-server.yml.
set -euo pipefail
image=$1
want=$2
name="boogle-boot-$$"
data=$(mktemp -d)
# The container writes root-owned files into the data dir, so the runner can't always remove it; that must not
# turn a good boot into a failure.
trap 'docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$data" 2>/dev/null || true' EXIT

# Every failure names itself as a GitHub error and shows the container's last log lines (if it got that far).
fail() {
  echo "::error::$1"
  docker logs "$name" 2>&1 | tail -40 || true
  exit 1
}

docker run -d --name "$name" -p 127.0.0.1:9000:9000 -v "$data:/data" "$image" >/dev/null ||
  fail "docker run could not start $image"
for _ in $(seq 1 30); do
  if [ "$(docker inspect -f '{{.State.Running}}' "$name")" != true ]; then
    fail "the server image exited while booting"
  fi
  if body=$(curl -fsS --max-time 2 http://127.0.0.1:9000/version 2>/dev/null); then
    [ "$body" = "{\"build\":\"$want\"}" ] || fail "/version answered $body, expected build $want"
    health=$(curl -fsS --max-time 2 http://127.0.0.1:9000/healthz 2>&1) || health="no answer ($health)"
    [ "$health" = ok ] || fail "/healthz answered '$health', expected ok"
    echo "Booted: /version $body"
    exit 0
  fi
  sleep 1
done
fail "the server image did not answer /version within 30 s"
