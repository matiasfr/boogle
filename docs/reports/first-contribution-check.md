# First contribution check

`npm run loop -- trace --since 2026-11-26` read 26 human sessions. Three recorded a first-fall start, and trace printed a row for each. The other 23 predate the fall-start metadata. Five of those show the opening trolley at y≈154 followed by a descent. The remaining 18 cannot be classified by the fall-start flag.

| Session | First contribution | Evidence |
| --- | --- | --- |
| `mwzgqoxx-st1vqcvu` | 235.1 s | Trace reported the mark. It coincides with the player's first server-accepted deposit at session time 262.1 s. |
| `mwzgqsjy-fk49yykn` | 240.9 s | Trace reported the mark. It coincides with the player's first server-accepted deposit at session time 289.1 s. |
| `mwzskdcs-erbfzjnw` | No contribution recorded | The iOS session logged a `navigator.gpu.requestAdapter` startup error. It ended before `entered`, with no accepted contribution. |
| `mwygknwz-n28cyrej` | Unavailable | Opening descent on a build before #2602. No accepted contribution appears in the upload. |
| `mwygkr6t-ckipctb7` | Unavailable | Opening descent on a build before #2602. No accepted contribution appears in the upload. |
| `mwygmm2b-6jb23w4i` | Unavailable | Opening descent on a build before #2602. No accepted contribution appears in the upload. |
| `mwygqva1-y3i7jj5w` | Unavailable | Opening descent and two server-accepted `yard left` events on a build before #2602. The upload contains no touchdown timestamp from which to calculate the measure. |
| `mwyko7gy-760uk96a` | Unavailable | Opening descent on a build before #2602. The recording ends at 17.0 s with no accepted contribution. |

## Bot proof

The fresh-room T1 segment at `76c81a918` used `timeout 240s npm run playthrough -- --to t1-done --query intro=1 --name first-contribution-fall --wall 180`. The first ground sample was on the Camp ridge at (988, 30, −162). Playdata flagged the session as a bot and a first fall. At session time 49.9 s it recorded the first server-accepted T1 log deposit and a **16.8 s** contribution mark. Tracing `.look/playthrough/first-contribution-fall/session.jsonl` directly reported **16.8 s**. The initial harness invocation omitted `intro=1`, so it exercised the harness's normal automation skip and produced no fall sample.

HOTBOX measured 19.99 → 17.73 busy logical CPUs against its threshold of 18. The queue marked the run shared and under load. The 16.8 s is the scripted bot's lower-bound reading and confirms the mark was recorded and reported. The loaded run supplies no timing evidence for a guest.

## Coverage and remaining gaps

The two measured human sessions predate the West and Camp landing changes. The current recorder arms on dry footing after descent, with a fallback when the intro clears, and emits once for a matching local action confirmed by the server. The allowlist includes deposits, yard drops, footings and material fed to work sites. A shared `stretch laid` mark has no local-player attribution, and automated train gifts do not provide a player action receipt. Neither establishes that a guest contributed. A reload or return that skips the fall does not open a new contribution clock.

No current recorder or trace miss was demonstrated in the downloaded sessions. This change adds the report only. The trace heading still says “after standing up”; dry landings use touchdown since #2608. West landing, independent gift and lay paths, and a successful iOS start remain unverified. These sessions do not establish the two-minute target for the current opening.

Not tested on a device.
