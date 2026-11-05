# Load screen build assessment

## 4 November: restore the original after the owner's mock review

The [owner's answered brief](../brainstorms/load-screen.md) supersedes the public status-strip proposal below.
The original art, title, bar and gear remain with one changing draft label. Public groups, room row, details/copy
and post-entry notices are removed. Pause's developer record and telemetry remain; only the unused `bootStatus`
export and public UI/CSS were deleted. No assets, entry gates, deadlines or awaits changed.

Literal `/` selects Place and its frozen sky. Added `sky-start` / `sky-ready` marks bracket that existing bake;
“Baking the sky” therefore precedes shader warm-up. Other warm-up drafts follow aggregate precompile progress,
not invented per-resource percentages. New labels are at least two seconds apart. After owner follow-up, the
current line stays visible during that hold even if its phase finishes; fast phases are skipped without delaying
entry. Only failure hides the label. The earlier blank-line captures below predate this follow-up.

### Follow-up: keep text through the readability hold

Fresh [phone-viewport manifest](../../.look/evidence/1793861585250-71206/evidence.json) supersedes the earlier
blank-line evidence. Literal `/`, 375×812: 49 pre-entry DOM samples, zero blank labels; first play at 5.094 s.
Labels changed from “Loading the game” to “Baking the sky” to “Filling the sea”, with sampled changes 2.367 and
2.053 seconds apart. Capture health passed with no page, console or graphics errors.

Opened `phone-hold-early.png`, `phone-hold-late.png` and `phone-hold-225-consecutive.png` beside that manifest.
The first two sample video at quarter-second intervals across loading; the last shows six consecutive encoded
frames starting at 2.25 s. Every inspected pre-entry frame contains label text, including “Loading the game” at
the previously blank hold. No strip or overflow is visible. `npm run check` passes, including all 323 tests.
The runtime and capture action were unchanged after this run; subsequent edits only clarified these docs.
Physical-phone/Safari behavior and real-time smoothness remain unverified; no Place bot was needed or run.

### Original restoration verification (before the hold follow-up)

`npm run check` passed (lint, types, unit tests, registry, level/assets and build). Formatted changed files with
`npx prettier --write`. No new tests or scenarios. The Place bot was not run; no bot result or real-time feel claim.
`npm run inflight` was omitted because it fetches from GitHub and this task permits only local-server networking.

Broker manifests: [initial baseline](../../.look/evidence/1793860991538-58090/evidence.json),
[matched refreshed baseline](../../.look/evidence/1793861325712-63444/evidence.json),
[desktop](../../.look/evidence/1793861202120-62385/evidence.json),
[375×812 phone viewport](../../.look/evidence/1793861270686-63072/evidence.json),
[retained Dev record](../../.look/evidence/1793861369217-63844/evidence.json).
First play (`boot:interactive`, entered verified): baseline 5.210 then 4.965 s; final desktop 4.928 s and phone
viewport 4.938 s. Desktop's −37 ms against the matched refresh is within the observed 245 ms baseline drift.
This is local capture noise, not statistical equivalence or a device-speed claim. Baseline refresh temporarily
restored only this task's runtime edits; SHA-256 verified exact final-source restoration afterwards.

Opened the initial baseline motion sheet; desktop sky, bake and warm-up consecutive sheets; phone bake and
warm-up consecutive sheets; and the Dev-details still. The six-frame sheets were extracted at 2.1, 2.4 and 4.4 s
(desktop) and 2.4 / 4.4 s (phone) from each manifest's video, beside it. They show the original unobstructed art,
title, bar and gear, with “Baking the sky” changing to “Filling the sea”, no strip, controls or overflow. The early
desktop sheet shows the reserved blank line between phases. Logs also record “Loading the game”. Dev copy
matches every retained timestamp and reopening preserves its expanded preference. All captures passed WebGPU,
advancing-frame and no-error checks; all manifests report no source changes during capture.

These are literal default-page loads in a same-origin iframe, with the parent's render loop paused during boot.
The phone run is a narrow Chromium viewport, not DPR/coarse-pointer emulation, Safari or a physical device.
Encoded consecutive frames and parent motion curves do not establish display smoothness. Synchronous world
labels and the full slow-load warm-up vocabulary were not visually exercised by these fast local runs.

## Earlier status-strip implementation (historical)

Ready to playtest the approved brief. The four groups and separate room row read the existing boot timeline;
they add no scheduler, asset, gameplay step or entry wait. The decorative bar and gear remain, with no numeric
percentage, including accessibility attributes. Graphics completes only after `warmup-complete` and `first`;
the shader escape does not complete it. Buddy's existing deadline remains unfinished until `buddy-ready`.
Failures never show Ready. Pause → Dev → Perf reuses the same details view and copy payload. The owning graphics
and Dev-menu sections are updated. DESIGN.md principle: **Small and readable**.

The player's avatar implementation, readiness promises, 16 s graphics escape, 45 s avatar escape, retries,
animation and lag fix are unchanged. Buddy's feature adds diagnostic marks only. The Boogler's copy is untouched;
no suspect Boogler lines arose in this work.

## Evidence and observations

All captures used the supplied broker, local production builds and `dev/cold-start/boot-fault.ts`, through the
existing look action `dev/look/evals/load-screen.ts`. Desktop is 960×600; phone is 375×812, coarse pointer and DPR 2
on Mac Chromium, not mobile Safari. An iframe makes a real fresh boot visible while the parent remains available
for capture-health checks. Its parent rendering loop is stopped during loading and restored afterwards.
No boot marks or UI states are synthesized. The root-page run below also navigates the child to literal `/`.

| Question | Desktop manifest | Phone manifest | Observed result |
| --- | --- | --- | --- |
| Do groups follow actual work? | [Normal](../../.look/evidence/1793855161798-6363/evidence.json) | [Normal, reduced motion](../../.look/evidence/1793855563076-13704/evidence.json) | Waiting groups become Preparing and then Done in mark order. Room completes separately. No percentage. |
| Does slow graphics remain unfinished across entry? | [Graphics](../../.look/evidence/1793855161818-6364/evidence.json) | [Graphics](../../.look/evidence/1793855161830-6365/evidence.json) | Real pipeline promises are held for 26 s after Buddy readiness. Entry occurs at 20.524 / 20.370 s; the notice persists until actual warm-up completion at 30.554 / 30.434 s. |
| Does the 45 s avatar escape stay honest? | [Avatar](../../.look/evidence/1793855161900-6366/evidence.json) | [Avatar](../../.look/evidence/1793855161963-6367/evidence.json) | Buddy's HTTP response remains pending. Deadline fires 45.002 s after `buddy-wait` on both profiles. Entry at 46.693 / 46.819 s shows the existing capsule and “Your character still preparing”. Releasing the asset permits `buddy-ready` at 51.819 / 52.035 s and removes the notice. |
| Does failure preserve disabled entry? | [Failure](../../.look/evidence/1793855099296-4318/evidence.json) | [Failure](../../.look/evidence/1793855099294-4319/evidence.json) | Three actual HTTP 503 responses, World Failed, no interactive mark, disabled entry, existing reload explanation and Loading failed. |
| Are retained and copied numbers identical? | [Details](../../.look/evidence/1793855161893-6370/evidence.json) | [Details](../../.look/evidence/1793855161883-6368/evidence.json) | Copy payload marks equal the timeline exactly, every timestamp appears in the view, and reopening Perf retains the expanded preference. |
| Do expanded details fit without motion? | — | [Expanded](../../.look/evidence/1793855563075-13705/evidence.json) | No horizontal overflow. Every recorded splash state reports zero animations. Gear remains still; bar updates jump only when work advances. |
| Does the literal default page work? | [Literal `/`](../../.look/evidence/1793855161869-6369/evidence.json) | — | Entered at 5.040 s, no remaining notice, WebGPU and advancing game frames. |

I opened the normal desktop motion sheet, the desktop and phone failure stills, both retained-details stills,
the literal-default still, the phone graphics and avatar end stills, and native video extractions for graphics
and avatar carry notices on both profiles. I also opened the expanded reduced-motion phone frame and six
consecutive encoded-frame sheets for normal completion, pending graphics and reduced motion. These show a
readable dark strip, two columns on the small phone, separate room status, and quiet unfinished notices that
disappear after recovery. Details have a scrollable timestamp area and a reachable copy button.

Opened final-source supplemental PNGs are `.look/proof-graphics-desktop.png`, `proof-graphics-phone.png`,
`proof-avatar-desktop.png`, `proof-avatar-phone.png`, `proof-normal-consecutive.png`,
`proof-graphics-consecutive.png`, `proof-reduced-consecutive.png` and `proof-reduced-expanded.png`.
They were extracted with ffmpeg from the linked manifests' videos; times were 21 / 23 s for graphics carry,
48 s for avatar carry, 4.7 s / 30.4 s / 3.9 s for the consecutive sheets, and 4 s for expanded details.

Files begin downloading in the entry task, so their first painted state is already Preparing. Synchronous
transitions can fall between captured frames, and reduced motion removes the splash immediately at handoff.
The ordered marks and DOM observations retain these transitions; no waiting frame or completion flourish was
inserted to make a screenshot. The bar remains decorative, not measured aggregate progress.

## Cost and checks

`npm run check` passes on Node 26.13.0: lint, typecheck, 323 unit tests, registry, level checks, asset checks and
production build. Changed files were formatted with `npx prettier --write`. No new unit tests or scenarios.
This boot-only change did not run the full Place bot; there are no Place-bot results to claim.

All successful proof runs report WebGPU, advancing completed frames and no page/console/graphics errors.
The two failure probes deliberately exit 1 because the harness treats injected HTTP 503 and startup errors
strictly; their explicit failure assertions pass. The first attempted outage was invalid because the parent's
service worker served the cached WASM. The corrected action unregisters that disposable origin's worker and
asserts three failed requests and disabled entry. The first reduced-motion shim applied CSS too late; its
replacement enables the existing media rule before first paint, and both affected captures were repeated.

Time to first play is navigation to `boot:interactive`, with `me.entered` verified. Fresh-origin production
loads, same default route and broker; no true-cold Metal-cache claim:

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial baseline, earlier in the session | 5.001 s | — |
| Original source remeasured under later machine conditions | 5.222 s | — |
| Final source, three runs | — | 5.257, 5.305, 5.264 s |
| Final median compared with refreshed baseline | 5.222 s | 5.264 s (+42 ms, 0.8%) |
| Eager entry JS + CSS, raw decimal kB | 19.031 | 23.121 (+4.090) |
| Same files, gzip level 9, decimal kB | 9.649 | 11.157 (+1.508) |
| Eager entry JS/CSS resources | 11 | 11 |

The 42 ms difference is small beside the observed 221 ms baseline drift, and entry waits are unchanged.
This is a local comparison, not a statistical equivalence or phone-performance claim. Entry cost includes the
HTML entry's complete static JS import closure and CSS, not just its facade. Existing art/models are unchanged;
the view shares the existing timeline chunk, so it adds no asset request. Raw accounting:
[entry-cost JSON](../../.look/load-entry-cost.json).

Timing manifests: [initial baseline](../../.look/evidence/1793854288351-90665/evidence.json),
[refreshed original source](../../.look/evidence/1793855688877-15325/evidence.json),
[final 1](../../.look/evidence/1793855395134-10822/evidence.json),
[final 2](../../.look/evidence/1793855563079-13706/evidence.json),
[final 3](../../.look/evidence/1793855563084-13707/evidence.json).
The baseline refresh temporarily reversed only this task's tracked patch. Every changed tracked file was
restored byte-for-byte against saved SHA-256 hashes before finishing.

Manifests retain their actual tested trees and all say `changedDuringRun: false`. Runtime source is identical
through the final proof matrix; subsequent edits were probe-only reduced-motion timing and this report/status.
The failure proof predates only the details probe's final scrolling step. Evidence is local/ignored and must
travel with the launcher's handoff, not be inferred from a later HEAD.

## All new on-screen words are drafts

The full vocabulary and composition rules below cover the splash, retained view and clipboard fallback:

- Group names: “Game files”, “Your character”, “World”, “Graphics”, “Room connection”.
- States: “Waiting”, “Preparing”, “Done”, “Failed”, “Stopped”, “Still preparing”. Stopped means an unfinished
  started group after a fatal boot failure; it does not assign that failure to an unrelated group.
- Status line and room row: `<group name>: <state>`; normal handoff: “Opening island”; fatal handoff: “Loading failed”.
- Post-entry notices: “Graphics still preparing”, “Your character still preparing”; the general fallback uses
  `<group name> still preparing` or `<group name>: Failed`, joined by “ · ” if several remain unfinished.
- Details/control text: “Load details”, “Times in ms since navigation”, “Copy last load”, “Load copied”,
  “Select the record to copy”.
- Diagnostic rows use `<mark name>: <milliseconds>`. Exposed mark names are `html`, `entry`, `files-start`,
  `modules`, `world-start`, `terrain`, `props`, `room-start`, `room`, `graphics-start`, `gpu`, `rapier`,
  `buddy-wait`, `buddy-start`, `buddy-assets`, `buddy-clips`, `buddy-ready`, `buddy-late`, `buddy-skipped`,
  `buddy-failed`, `buddy-deadline`, `frame-pipelines`, `warmup-complete`, `shaders`, `first`, `interactive`,
  `world-failed`, `graphics-failed`, `failed`.
- Clipboard fallback exposes the same JSON schema: `groups`, `name`, `state`, `build`, `nav`, `sw`, `ua`,
  `marks`, `t`, `detail`, `spans`, `req`, `net`, `body`, `fromSw`, and existing timing/detail keys such as
  `ms`, `programs`, `pipelines`, `wgsl`, `shaderModule`, `gltfParse`, `bakeMs`. Values are real recorded data.

A real iPhone is untested. Safari, real phone clipboard permission, display presentation smoothness and whether
the wait feels shorter remain unverified. Clipboard validation intercepts the button's payload rather than
writing the host clipboard. The shader throttle delays real API-promise settlement; it is not a slow-device
benchmark. Encoded frames and parent capture-health checks do not prove real-time feel. The owner playtest's
one question remains: “When the game was loading, did you know what it was doing, and did the wait feel shorter?”
