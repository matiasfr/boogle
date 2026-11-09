> **Status: proposed (2026-11-09).** Seed (owner, 9 November): "glider should be introduced towards the earlier side of the game, since it could be used later in the game and upgraded. We should find a good place for it mechanically and in terms of progression." Light brainstorm (one agent, three lenses). Builds on its recommended answers, logged in [agent-calls](../agent-calls.md); the owner may revisit any.

# The glider: Home's last find

## Pitch

The glider is Home's closing find. You see it dark on Needle Bell's summit when you climb for the sea switch. When Q5
lands at Far Head, a teal shaft rises from the summit. You hook back up and step off, and your first flight shows you
everything you've built. It reopens Home's glide secrets and shortcuts, gets one real job at Ring Island, and grows twice
later: faster cloth from Canopy fibre, then lift over the machines you've built. The double jump moves to Split-rock's
ankle rings straight after, so it arrives as the glider's best friend. Serves **7. Telegraph everything** (seen
sealed, woken in view, then taken) and **8. Enjoyable alone and together**. It bends nothing.

## Gut question

**"Did the first flight off Needle Bell make you want to go back and fly from somewhere else?"**

## Best suggestions

1. **The summit return** (design). The device sits on Needle Bell's summit, sealed until Q5 completes, and the hook
   climbs back to it. It comes about 20–30 minutes in, after Q3, Q4 and Q5's construction, so it isn't a 49-second
   burst.
2. **Port, don't archive** (systems). Port Place's glide as a hook-style trio (`glide-step`, `glide`, `glide-view`)
   with a `rail.glide` grant, and run it before D1. The BotW tuning, stop and reopen, and jump-while-gliding come
   across unchanged.
3. **The flight is the reveal** (creative). There's no card text to explain it. The camera eases to 5.2 m and Home
   lies below. Telegraph: the dark device and canopy vane on the first climb, then the teal shaft on Q5's completion
   edge, visible from Far Head.
4. **Hook → glider → double jump** (design). Build job E (ankle rings on the Split-rock walk) right after, so the third
   ability extends glides.
5. **One tier, one mode order** (systems). `Rail.glide` is a tier (0–3); per-player constants derive from it. Hook
   beats glide, and glide beats jump, in one place.
6. **What it reopens** (design). The village balcony and Far Head sea-stack secrets return to the world, Needle Bell
   becomes a one-step descent, Split-rock's rim gives an optional glide into the bowl, and Ring Island has one
   main-line use.
7. **Upgrades** (design and systems). G1 fast cloth (Canopy fibre, F3: 10 → 12.5 m/s). G2 lift over the plumes of
   machines you've lit (Sail Tower; optional, first to cut).
8. **Partners see it** (creative). The folded roll shows on every back from shared state, and a partner's open canopy
   comes from presence `railwayGlide`.

## Shape

- **Sync kind:** `Rail.glide` tier is Server, from accepted railway state. It's granted by a `rail.glide` device take
  after Q5, applies room-wide, is saved and is inherited on join. Flight is Owner, with presence `railwayGlide` (open
  or closed). Plumes, camera, sound and particles are Local, derived from accepted machine facts. It needs a
  `WORLD_NS` bump: share the next one, and never ship it during an owner session.
- **Reuses:** Place's `toggleGlide`/`openGlide`/`closeGlide`/`stepGlide` and `MOVE.glide*` (as `rules.tune` ids), and
  `moves-view.ts`'s canopy pose and glide camera. Also `gear-models.ts`'s `makeCanopy`/`placeCanopy`;
  `place-sfx.ts`'s `gliderOpen`/`gliderClose`/`pickupGlider`; `tools.ts`'s device, reveal and every-back pattern;
  `ability-arrival.ts`'s flourish (option E); `reward-data.ts`; `tech-layout.ts`'s `summit` pad; and the
  `sheet-glide.ts` eval.
- **Smallest first build:** the port, the device on the summit (sealed, then woken on Q5's completion edge with a teal
  shaft), the `rail.glide` grant, the canopy visible to partners, and Jump-in-air opens it. Not in the first build:
  upgrades, plumes, the secrets' return (that comes with F2) and the load-scaled sink.
- **Risks:**
  - Three modules writing the body (`tools.ts` fixedPre 42, `hook-shot.ts`, `glide.ts`). Settle the order in one place.
  - The long first glide's landing and camera. Keep broad, dry landings on the table, and make a sea landing just a
    swim.
  - A hitch the first time the canopy opens. Warm it behind loading, as Place did.
  - Crowding the summit pad. Keep the device clear of `t5`'s landing and the switch handle.
  - A glide that skips construction. Hold to the route contract.

## Done means

Each capture uses `node dev/look/look.ts`:

- **Sealed:** `--rail-seed q4-done`, camera on the summit. The device is dark under its vane, and the tools probe
  reports it as not available.
- **Woken:** `--rail-seed q5-finishing`, then the finish, camera at Far Head facing Needle Bell. The teal shaft appears
  on the completion edge and reads at phone size.
- **First flight:** `--rail-seed q5-done --eval dev/look/evals/railway-glide-first.ts` (ported from `sheet-glide.ts`),
  starting on the summit. Take the device, then step off. The canopy is open within 0.1 s. Samples show a sink of
  3.2 ± 0.3 m/s and 10 ± 0.5 m/s at full stick. Flight lasts about 20–25 s, ends on a dry landing, and the camera holds
  5.2 m. Stills show Home's line, forge and pier in frame.
- **Co-op:** `--players 2 --rail-seed q5-done`. The finder gets the card and the other player gets the flourish where
  they stand, then opens the canopy at once. Each sees the other's canopy and back roll.
- **Combo** (after job E): one air jump while the canopy is open, and the canopy catches again. Toggling never refills
  a charge.
- **Reload:** the glider persists across reload and rejoin (a `railway-hook-reload.ts` analogue).
- **Reach:** `npm run level-check` shows no glide-only place reachable before the grant, and the village balcony
  reachable after it.
- **Performance:** no frame spike the first time the canopy opens (`npm run perf` at `q5-done`).

## Open questions

1. **Where is it found?** Recommended: on Needle Bell's summit, sealed until Q5 lands at Far Head, then climbed back
   to by hook. Alternative: Far Head's pad, as in Place. Answer: ___
2. **Does the double jump move to Split-rock's ankle rings (job E) straight after, so Home's order is hook → glider?**
   Recommended: yes. Answer: ___
3. **Does the glider gate a main-line step?** Recommended: not at Home; one main-line use at Ring Island, decided in
   that plan. Answer: ___
4. **Which upgrade path?** Recommended: G1 fast cloth from Canopy fibre, as the economy model has it. G2 lift over
   your lit machines at the Sail Tower, independent of G1, optional and first to cut. Answer: ___
5. **How does it open?** Recommended: Jump in the air opens it once air jumps are spent, and the LB/Q/touch toggle
   stays. Answer: ___

## Parked

- The footing plummet and load-scaled sink: slapstick, and a lesson in why the train carries footings (after a yes).
- Glide off Needle Bell onto a passing train: the clip (after a yes).
- Gulls falling in beside a gliding player.
- Co-op stoking: one player stokes the kiln so its plume rises higher for a friend (with G2).
- Drafting behind a friend for less sink. It's too precise for DESIGN 10 for now.
- A bell note when the summit wakes; previz of the summit step-off with `/codex`.
- Stamina for the glide: rejected by the research. Don't add depletion just to have something to sell.
