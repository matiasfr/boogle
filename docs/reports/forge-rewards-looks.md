# Forge reward proof looks

Captured on HOTBOX from `d3c75d0a2` through the shared bot queue. All four proof captures used WebGPU, showed advancing game frames and logged no page, console or graphics errors. Visual verdicts below follow the [forge reward plan](../plans/forge-made-rewards.md), including its as-built notes. Raw recordings, motion sheets and verdicts are under `.look/forge-rewards-looks/`. The commands use scratch evals kept in this worktree's `.look/`.

## 1. Funded pack frame as Buddy walks up — Pass

```sh
timeout 1800s npm run look -- --real --hud --wall 180 --out .look/forge-rewards-looks \
  --rail-seed forge-frame-last --query 'carry=1&standX=916&standZ=-13.4&proof=pack' \
  --eval dev/look/evals/forge-rewards.ts --action .look/forge-proof.js \
  --video --seconds 16 --frames 20 --warm 1 --cam 913,22,-12 --look 922,19.5,-15 \
  --size 1200x750 --name pack-close --question 'Does the villager strap the funded frame as Buddy approaches?'
```

Buddy walked the last load into the receiver, then walked to the pack shelf and stopped without opening it. The fresh bot carried two logs, so its single deposit crossed the 24-log threshold from 23 to 25. The board changed from an outlined pack at 23/24 to a gold-dashed pack and axe outline at 1/32. An offcut lay by the forge frame and a bare pack appeared on the amber-post shelf. The green-capped hauler went toward the offcut, and the curved straps appeared as Buddy stood at the shelf with **Open** available. That matches the plan's funded-edge bare-to-strapped change and its as-built note that a log hauler can build it. The board hides part of the hauler's route and work spot from this camera, so the complete shoulder carry and hammer motion remain unverified.

Stills: [bare pack and offcut](forge-rewards-looks/pack-bare.png), [straps on](forge-rewards-looks/pack-strapped.png).

## 2. Axe arrival with reduced motion — Pass

```sh
timeout 1800s npm run look -- --real --hud --wall 180 --out .look/forge-rewards-looks \
  --rail-seed forge-lit-last --query 'carry=1&standX=919&standZ=-14.5&standYaw=0.2&proof=reduced' \
  --eval dev/look/evals/forge-rewards.ts --action .look/forge-proof.js \
  --video --seconds 10 --frames 16 --warm 1 --reduced-motion --size 1200x750 \
  --name axe-reduced --question 'Does the axe appear at lighting without taking over the camera?'
```

Buddy walked the last load into the receiver. The first lit sample showed the upright axe already visible and cooling, one arrival, no active or queued forge cut, and the roof show underway. The recording frames stay in the yard at the follow camera after the scripted setup camera is released. The glowing axe stands on the pedestal, the board shows its ready mark, and the roof crew starts work without waiting for the cut. The axe was still there when cool. The ready state matches the plan's live-lit rule. This look did not press **Open** on the axe.

Still: [axe glowing on its pedestal from the follow camera](forge-rewards-looks/axe-reduced.png).

## 3. Rejoin with both rewards claimed — Pass

```sh
timeout 1800s npm run look -- --real --hud --wall 180 --out .look/forge-rewards-looks \
  --rail-seed q1-done --query proof=reload --eval .look/forge-rejoin.js \
  --until "(sessionStorage.getItem('forge-proof-reload') && performance.getEntriesByType('navigation')[0].type === 'reload' && (window.__forgeAgain ||= import('/.look/forge-rejoin.js')), !!document.documentElement.dataset.forgeProof)" \
  --size 1200x750 --name rejoin --question 'Does rejoining preserve the rewards without replaying their reveals?'
```

On current main, `q1-done` seeds the proper axe and Rail yoke as already claimed, with the pack available. The bot opened the pack, dismissed its card and reloaded the same page at real speed. Buddy returned to the same spot by the finished forge wearing the pack and yoke. The replica still had the pack and axe, with capacity 16 logs. The pack and axe displays stayed hidden, and the post-entry samples showed no card, axe arrival or forge cut. The yoke is an additional frame on Buddy's back in this seed. This proves the restore from both claims in the room, with the axe claim supplied by the seed.

Still: [Buddy back at the forge after reload](forge-rewards-looks/rejoined.png).

## 4. Phone-width board and pack card — Pass with P3

```sh
timeout 1800s npm run look -- --real --hud --wall 180 --out .look/forge-rewards-looks \
  --rail-seed forge-frame-last --query 'carry=1&proof=phone' \
  --eval dev/look/evals/forge-rewards.ts --action .look/forge-phone.js \
  --cam 912.2,20.6,-14.4 --look 920.2,19.8,-14.4 \
  --video --seconds 14 --frames 18 --warm 1 --touch --size 390x844 \
  --name phone-framed --question 'Can a phone player read the board clue and the pack reward card?'
```

At 390 × 844 CSS pixels, the board's outlined pack and `logs 23/24` were readable from the plan's eight-metre camera. The action released that camera, walked the load in, and opened the pack. The follow camera showed the raised model and a full, readable “You got a pack frame!” banner with its down arrow. The accepted claim raised capacity to 16. The first phone capture used the default hill camera, so the framed run supplied the board and reveal evidence.

**P3 — Reward banner overlaps the Jump control.** The translucent banner leaves the edge of the round Jump control visible behind and below it. Likelihood is high for this 390 × 844 layout, where the overlap is visible in the captured card. Impact is low because the reward text, model and down arrow remain legible. Touch dismissal and other viewport sizes were unverified.

Stills with 390-pixel content at native scale and side padding: [board at 23/24](forge-rewards-looks/phone-board.png), [pack reward card](forge-rewards-looks/phone-card.png).

No P1 or P2 defects observed. Shared-machine recordings and sampled frames establish visible state changes. Motion cadence, audio, exact timing and the normal-motion co-op cut were unverified. **Not tested on a device.**
