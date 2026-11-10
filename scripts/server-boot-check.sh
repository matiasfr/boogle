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

docker run -d --name "$name" -p 127.0.0.1:9000:9000 -v "$data:/data" "$image" >/dev/null
for _ in $(seq 1 30); do
  if [ "$(docker inspect -f '{{.State.Running}}' "$name")" != true ]; then
    echo "::error::the server image exited while booting"
    docker logs "$name" 2>&1 | tail -40
    exit 1
  fi
  if body=$(curl -fsS --max-time 2 http://127.0.0.1:9000/version 2>/dev/null); then
    if [ "$body" != "{\"build\":\"$want\"}" ]; then
      echo "::error::/version answered $body, expected build $want"
      exit 1
    fi
    curl -fsS --max-time 2 http://127.0.0.1:9000/healthz | grep -qx ok
    echo "Booted: /version $body"
    exit 0
  fi
  sleep 1
done
echo "::error::the server image did not answer /version within 30 s"
docker logs "$name" 2>&1 | tail -40
exit 1
