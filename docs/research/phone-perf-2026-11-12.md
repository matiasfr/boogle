# Phone performance causes, 12 November 2026

> **Verdict:** notes only, from recorded play data; phone performance was deprioritized by the owner mid-task.
> **Status:** parked. No code changed, no browser run. Not tested on a device.

Sources (untrusted browser data, read as data): iPhone sessions `mw9srryp-8uai0x6x` (9 Nov, Far Head freeze),
`mw9tccmz-b7flragy` and `mw9tfbu8-gshy9zyy` (its reloads), `mwehrkyx-1v12x8k5` (13 Nov, 5.3 s frame); device runs
`dv-aa0hq98i8tbht858i426hn4mei` and `dv-3xv0uvkdhzrl5x8yy0llaa9lzm` (phone, resolution 0.6, frame limit 30, all scenes pass).

## 1. Long freeze (9 Nov, Far Head, about 29 s)

- **What the data shows.** Landscape 1094x504 at DPR 1.2, draw calls 565-645 for the 30 s before (about 200 elsewhere;
  device run "head" 325 against 181-237). Last perf at t=885.5, then nothing until t=915: two "visible" marks 3 ms apart
  with no hide (queued visibility events from a blocked page) and a 504x504 canvas (a rotation mid-freeze). It drew 165
  frames, then stopped again for 45 s; at t=960 the tab hid and `src/features/updates.ts:49,100` reloaded it into the
  newer build (b076226 to e41d6be), which is the "page reloaded". No GPU error or device loss was recorded.
- **Likely cause.** The page's main thread blocked on WebKit's GPU process under memory pressure: about 1.2 M triangles,
  600 draws and, then, a 64 MiB sky cube, with a resize reallocating render targets. Confidence: medium-low (no memory
  reading exists on iOS). Already applied since: 512 sky cube (66affd06b, -48 MiB), `page stalled` mark
  (`src/proto/playdata/record.ts:539-556`). No stall at Far Head has been recorded since, but no phone has played there since.
- **Smallest next fix.** Count what Far Head adds at the Q5/Q6 spot (x 1370, z -180) and cull or merge it on touch;
  do not reallocate targets on every resize step during a rotation.
- **Confirm.** Owner's phone: `https://boogle.club/?device=new` on the iPhone that froze, tap Run, then
  `npm run device -- pull --new`; compare "head" calls and p95. Then play to Far Head and rotate the phone twice; a
  `page stalled` mark there confirms it.

## 2. Black sky after the reload

- **What the data shows.** The first reload (`mw9tccmz`) never left the lobby (61 draws, 655 triangles); the 9 Nov builds
  had no sky check. The bake check, one rebake and the flat fallback landed after that session
  (cced4a034, 754418d19): `src/render/water/frozen-sky.ts:258` (`healthy`), `:284` (`bake`), `:501` (`fallBack`),
  `:515` (`recheck` on return to visible). Every `sky baked` mark since (24 sessions) read the healthy values
  (fill 2.02, zenith 1.87, horizon 4.56); no `sky fallback` recorded.
- **Likely cause.** The cube baked black after the GPU-process trouble and nothing rechecked it. Confidence: medium.
  Fixed by the commits above, by reading; the dark shading and pale band fit the same black cube (fill and reflection).
- **Confirm.** Not reproducible on demand; the next phone session's `sky baked` / `sky fallback` marks show it.

## 3. Slow resolution recovery, and the 5.3 s frame

- **Recovery.** `src/render/resolution-governor.ts:44-46,137`: one 0.1 step up after 5 s calm, a failed probe doubling
  the wait to 40 s; floor 0.6 to full is four steps, so 20 s at best and minutes on a phone at the edge (the 9 Nov
  phone changed resolution 23 times in 16 min, 1.2-1.6 DPR). Confidence: high that this is the timing; whether it is
  wrong is a call. Smallest fix: let a step that held reset the wait sooner, or step up 0.2 when far from the cadence edge.
  Confirm: play the owner's phone 2 min at the arrival spot after Far Head, count `resolution changed` marks.
- **5.3 s frame (13 Nov).** `page stalled` 6569 ms in phase `interactive` with 1 frame drawn, between the avatar preview
  (t=29.4) and the first startup frame (t=34.8); the following frames still report `WGSL generation`. Likely the first
  game frame compiling pipelines the lobby-pose warm-up (`src/render/precompile.ts:460-473`) did not cover.
  Confidence: medium. Not a hide: no visibility event before t=116.9. Confirm: `?device=new&cold=1` on the phone and
  read "shader warm-up" and the first scene's stalls. The 9 Nov 7.1 s `max` (`mw9tfbu8`) equals its hide, not a stall.

Two phone sessions idled at the arrival spot (38 s and 44 s); nothing in their frames explains that.
