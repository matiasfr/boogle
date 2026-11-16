# C7: hook and glider controls

Owner-approved 15 November 2026; G17, G18 and G26. Built from `9e8f9be6c36167bba83201ef9c4a21802249a8bf`
on `t3/grant-c7-controls`. Commit-only handoff; no ship or push.

## Changes

- The existing railway interaction provider offers the picked, reachable ring as **Hook**. E, pad X and the main
  touch button call the existing pull handler. F/RB and the dedicated touch Hook remain available. The ring's
  F/RB glyph no longer retires after three pulls; pad glyphs also work when the device retains its touch class.
- Jump closes the open canopy before the controller or air jump consumes the press. With it shut, the existing
  air-jump-first opening behavior remains. Q/LB and touch Glide remain toggles. Keyboard repeat cannot reopen the
  canopy while Space stays held. The first-fall teach uses Jump's glyph, and the generated guide names Jump too.
  [Owner call](../agents/owner-calls.md#jump-is-the-gliders-button).
- G26 was reproduced on t1, looking toward t2 at pitch 0.9: the lens rested below the slab and its underside filled
  the view. The climb's 1.5 m collision tiles count as thin posts, ignored except within 0.7 m of the lens. The
  camera now sweeps the whole downward arm against thin shapes. Its upward arm retains the previous behavior.
  No platform geometry, walkable height, collider, hook-clearance rule or shared state changed.

## Evidence

Artifacts are in this worktree's ignored `.look/`. The before camera capture is clean base `9e8f9be6`; the after
uses the same staged t1 position `(992.4, 37.65, -1)`, yaw 0 and pitch 0.9 with the production follow camera.
Both captures passed WebGPU/frame/error health checks and were opened. Before: almost the entire view is the
slab's underside. After: Buddy, sky, tower and the next rings are visible; the camera is close behind Buddy.

- `.look/c7-platform-before-still.png`
- `.look/c7-platform-after-still.png`
- `.look/c7-interact-r2-motion.png` and `.look/c7-interact-r2-realtime.webm`: opened the sheet and landing still.
  At 0/0.574 s the E Hook and F prompts are visible after six prior pulls; at 1.142–2.287 s Buddy and the cable
  travel to t2, then Buddy lands on the deck. Keyboard, pad-slot and touch-handler assertions all passed, including
  the dedicated Hook alternates.
- `.look/c7-jump-close-r2-motion.png` and `.look/c7-jump-close-r2-realtime.webm`: opened the sheet and final still.
  The canopy is open in the first two frames and folded by 1.142 s; Buddy continues falling past the climb.
  All three input modes passed closing with an unspent air jump, retaining that jump, then Jump-opening after
  spending it. Q/LB/touch Glide toggles and ignored keyboard repeat passed too. The final still is after the fall,
  looking past nearby geometry; the motion sheet, not that final still, shows the close.
- `.look/c7-jump-teach-r2-motion.png`: opened; Space pulses at Buddy's back for the first 1.143 s, then retires.
  The helper took a fresh glider through the normal device and dismissed its card before this first fall.
- `.look/c7-jump-teach-still.png`: opened; the shortened 0.2 s capture retains the Space glyph clearly at Buddy's back.
- `.look/c7-touch-motion.png` and `.look/c7-touch-still.png`: opened at 844×390. Jump, Hook, Glide, Ping and the main
  action button fit and are separated. The main button reads Hook while targeted, fires the pull, then returns to
  Grab. The separate Hook/Glide alternates remain visible. All handler assertions passed again at this width.

All successful captures reported WebGPU, advancing completed game frames, no page/console errors and no graphics
errors. Each has its adjacent `*-verdict.json`; real-time recordings exist for the two requested motions.

Camera reproducer (setup and action are retained beside the evidence):

```sh
npm run look -- --rail-seed glide-earned --eval .look/c7-platform.ts --action .look/c7-camera.ts --warm 1 --hud --name c7-platform-after --question 'Does aiming up from t1 keep the follow camera above its slab?'
```

The committed `grant-c7` capture helper stages room progress and positions; inputs then run through real
keyboard listeners, registered pad slots, and DOM touch-button handlers. Each mode checks Interact and the
dedicated Hook, or Jump-close with an unused air jump, the subsequent air jump, Jump-open and alternate toggles.
The hook capture starts after six successful pulls to check that the prompt persists. The glider fixture takes
the optional jump through its actual device because `glide-earned` does not grant it. The teach uses `hook-taken`
and takes a fresh glider, so its one-time teach has not already happened at the seed's spawn.

```sh
npm run look -- --real --rail-seed glide-earned --query c7=hook --eval dev/look/evals/grant-c7.ts --action dev/look/evals/grant-c7-action.ts --warm 0 --video --seconds 4 --hud --name c7-interact-r2
npm run look -- --real --rail-seed glide-earned --query c7=glide --eval dev/look/evals/grant-c7.ts --action dev/look/evals/grant-c7-action.ts --warm 0 --video --seconds 4 --hud --name c7-jump-close-r2
npm run look -- --real --rail-seed hook-taken --query c7=teach --eval dev/look/evals/grant-c7.ts --action dev/look/evals/grant-c7-action.ts --warm 0 --frames 2 --seconds 0.2 --hud --name c7-jump-teach
npm run look -- --real --rail-seed glide-earned --query 'c7=hook&c7Input=touch' --eval dev/look/evals/grant-c7.ts --action dev/look/evals/grant-c7-action.ts --warm 0 --seconds 4 --size 844x390 --hud --name c7-touch
```

Staged input checks are not
physical gamepad, phone or tablet tests. Real-time motion is unverified; the motion sheets establish sampled
poses only. No owner playtest or full campaign claim.

The initial fixture attempts' logs are retained (`c7-teach.log`, `c7-glide.log`; the initial hook failure is in
`c7-interact-verdict.json`): the initial hook fixture on t0 failed its fire assertion beside the first box;
the earned-glider seed lacked the optional jump, and the first-fall teach was not caught.
The passing reruns use t1→t2, explicitly acquire the jump/fresh glider, and keep setup at real time too.
No production change was made in response to those fixture failures.

## Checks

- Owning hook/glider tests: 21 passed (six files, `.look/c7-owning-tests.log`).
- `npm run check`: passed, including 2,227 unit passes, 65 skips, one todo, no failures; registry, level, assets,
  prefabs and build passed (`.look/c7-check-final.log`). The first attempt stopped at missing eval command headers;
  those were corrected before the passing rerun. Later fixture edits received fresh scoped lint and typecheck.
- `npm run playthrough -- --to t1-done --name c7-short-route`: passed, no errors; report, verdict and end still
  inspected in `.look/playthrough/c7-short-route/`. This is only the opening through T1, not the hook climb.
- `npm run checks-for`: requires `check` and the short route above.
- No `src/sim`, `src/net`, `src/netplay`, `src/world`, `src/ecs` or `src/entity` edits; review stamp not triggered.

The Boogler's copy is unchanged. No suspect lines found in the affected controls/teach copy.
