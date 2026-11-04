# Round 4 behaviour follow-up — 3 November 2026

## 1. Camp halt trap

The supplied session records train unlock at t=912.4, followed by the player pinned near (1010,30,-144) until Get unstuck at t=926.9. Camp's platform is centred at (1009.638,31.02,-146.1), above terrain around 30.22. The new back ramp appears around the player's body immediately when the halt builds. Rapier pushes the overlapping player down against the terrain; it cannot lift them onto the ramp. This reproduced locally: the player settled at y=30.446, visibly sunk into the ramp.

`halts.ts` now tests both spheres of the local player's actual collision body against the newly added rotated boxes, including pitched ramps. An overlapping player moves onto the clear middle lane, retaining their longitudinal position. Every tab handles its own player, including when a partner triggers the unlock. The same protection covers snapshot restoration. Clear players are not moved. No shared state or wire changes.

[Before](../../.look/evidence/1793773652130-41721/evidence.json) and [final](../../.look/evidence/1793774361181-67509/evidence.json): the recorded position now relocates to (1010,31.52,-146.1), then settles at y=31.468 on top. All five halts passed build and snapshot checks, plus unchanged-position checks outside the new solids. Opened before, after and final Camp stills: buried lower body before, whole player upright on the deck after. This is local geometric coverage, not a replay of the original network session.

## 2. First-use hitches

[Full measurements](round4-first-use.md): actual first-use synchronous pipeline calls fell from **1 to 0 for rails**, and **2 to 0 for glider cloth/shadow**. Detached objects now participate in the existing loading warm-up; temporary canopy objects are removed before play. The 16-second escape deadline is unchanged.

Warm-cache local callback maxima were **16.8 ms before and after**. Navigation-to-interactive was **2.094 to 2.294 seconds**, with a second unchanged baseline at 2.424 seconds. This does not establish a noticeable load regression or prove the original 400–677 ms stalls were compiler-owned. No original Safari/iPhone device measurements were obtained. Opened the final first-use still: rails, canopy and shadow remain intact.

## 3. Junction turn

`moveCar` previously treated an abrupt desired heading as a teleport. Ordinary heading changes now turn the actual collider at at most 2 rad/s, easing the last part; drawing and rider transport use that same heading. Large positional corrections and explicit snapshot relocations retain the existing anti-launch path. Cart cargo code is unchanged.

[Junction evidence](../../.look/evidence/1793773984729-54110/evidence.json): off-centre rider attached for **241/241 physics steps**, max turn **1.9997 rad/s**, max rider speed **9.07 m/s**, zero vertical launch. Opened the motion sheet, curves and eight consecutive video frames extracted with ffmpeg: heading advances progressively with the rider on deck. Real-time smoothness remains unverified. The initial fixture stopped before the junction; its capture is excluded from this conclusion.

## 4. Track layer boarding

The current flatbed already has a solid collider and registered moving platform. A held normal jump from beside it boarded successfully and remained attached in two captures. [Stable-tree capture](../../.look/evidence/1793774034249-55537/evidence.json). Opened its still: player on the flatbed behind the cradle. No collider or jump-tuning change was justified. The reported inability to board was not reproduced; other approach angles, loaded surfaces and original-device controls remain unverified. The first capture's manifest was rejected when a documentation file changed, so it is not the accepted verification.

## 5. Update prompt

- Old: **Boogle was updated – reload to stay in sync with friends**
- New: **Boogle was updated – reload for the latest version**

Only the notification sentence changed. [Production evidence](../../.look/evidence/1793774287500-63895/evidence.json) exercised the actual update listener using a local version response. Opened the still: sentence and Reload button fit and are legible. The Boogler's lines are unchanged.

## 6. Start fresh in co-op

Keeping the room required one small existing-hook edit: 4 added / 7 removed source lines including warning/comments. It now reloads the same URL, clears local saves and identity as before, and receives an existing partner's railway through normal newcomer synchronization. Alone, the local railway resets. The warning states both cases. There is no shared reset, new persistence format, transport change or freshly manufactured snapshot. Existing late-write guards remain intact.

[Two-player actual reload](../../.look/evidence/1793774153299-59369/evidence.json): URL unchanged; no local saves returned after calling save; the old authority departed; the survivor kept the open path and recovered the uniquely carried boiler; the new identity joined the same room. Opened both players' stills and their motion sheet: fresh identity card with partner in roster, and survivor still in the developed village. The new card remained unclicked, so the subsequent Jump in was not exercised.

## Verification scope

Prettier ran on every changed file. `npm run check` passed after the final collision correction: lint, typecheck, 292 tests, registry, five level checks, assets and production build. The existing golden physics replay matched within 0.01. Full bot and scenario results are reported by the final handoff and its evidence manifests. No new unit tests or scenarios were added.

One coordination departure: `npm run inflight` was started before noticing that its live lookup conflicts with the local-network-only instruction, then interrupted without a result. No remote coordination state was used. A warm-up baseline was also rejected because the launcher's checkout changed during capture; its replacement passed. No push or ship.

DESIGN.md: **10. Slapstick over precision**, **8. Designed for drop-in, drop-out**, and **Small and readable**.
