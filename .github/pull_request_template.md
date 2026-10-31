<!--
Most changes arrive through `npm run ship`, which pushes a ship/* branch; a bot opens its PR. Any non-draft PR from this
repo auto-merges when CI is green unless labelled `no-automerge`. One exception: a change by someone other than the owner
that touches networking, world sync, saves, the server, CI or dependencies gets `needs-owner` and waits for the owner's
approval (automerge.yml, "Owner gate").
-->

## What and why

<!-- One or two sentences. Which DESIGN.md principle does it serve, and does it bend any? -->

## How I tested

<!-- `npm run check`, plus `npm run test:net` for networking. Two tabs with ?netdebug=1 for anything multiplayer. -->

## Risk

<!-- Anything that could break everyone's island (wire format, snapshots, host migration)? Delete if none. -->
