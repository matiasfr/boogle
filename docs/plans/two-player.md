# Plan: two players in `?proto=place&coop=1` (round 4, step 7)

## Goal

Splitting up beats staying together, with an optional toy only two can make. Bills stay fixed and one person can always finish. Serves DESIGN.md 4, Cooperation is automatic, and 11, Show, don't tell (no new banners, tips or objective lines; a verb on an interact prompt is the only new text). Prototype code: Local plus the existing `placeCoop` messages, no lockstep. Nothing changes without `coop=1`.

## Design calls

**The split change: rails ride the cart.** Reasons, from the code and `place.md#measured`:
- A chop stack by the tree can't pay. Each log costs `1/chop + 1/haul` of a person's time, so two people both cycling move `2/(1/c + 1/h)`, and a chopper plus a porter move `min(c, h)`, which is never more.
- Only a vehicle's batch beats that. Trains can't carry it alone: they arrive at 26:37 of 29:32, with 27 s of carrying left.
- The cart runs from 14:19 and covers Q2 to Q5, the long stretch the round's notes already call empty. Its logs are free, so the bottleneck there is the walk home for rails. Q5 takes 238 s solo, and a second walker still needs a 196 s round trip.

**How it plays:** one person at the forge whistles for the cart, loads rails, and hops on (they ride the cargo) or stays. The other stays at the frontier chopping or feeding the frame. Estimated Q5: 110 s split, 200 s for two walkers, 238 s solo. A lone tab can still use it but must walk home first, so the hunger for trains survives.

**The beam: a 9 m long beam at the village's west edge, set up as a see-saw at the east edge.** It's a toy, not progress (research rec 6; DESIGN.md 1): nothing needs it and it pays no money.
- One person lifting raises one end. It pivots on the other, and you can't take it anywhere.
- Two lifting carries it, with no sprinting. Bring it within 5 m of the site and it thumps down as a see-saw, for good.
- Landing from a jump on one end launches whoever stands on the other, and they then land and launch you back. Alone it only tilts and thumps.

**A partner leaves mid-carry:** the beam falls where it is and stays there, saved. You keep your end and can pivot it or let go. Nothing is lost and nothing is owed. It can be picked up again whenever two people are there.

**A partner leaves holding the great beam or the boiler: it goes back to where it's picked up.** Today that strands the bill for whoever stays, which breaks "one person can always finish" (step 2).

## The deposit risk: real, but not as first described

Found by reading the code; step 1 reproduces it. The in-flight delivery itself is safe: `stock` and the `lines` and `forgeFrame` slices all send `have + coming`, so the authority leaving mid-arc loses nothing. The fault is in how the answer is matched:
1. `case 'stock'` returns on `amAuthority()` or `activeFrame() !== st` **before** `settle`. An accepted piece then gets refunded at 4 s, so it exists twice.
2. `PENDING_MS` was a 4 s clock with no ids. If either tab stalls past 4 s (shader compile, throttling), the refund runs and then the accepted `stock` lands: back and frame both have it. `allow()` could also silently drop a `stock`.
3. `refund('beam')` does nothing. A rejected or unanswered great beam is gone with `trunk.taken` still true, so T3 can never fill: a softlock.

**Step 1 evidence (3 November):** the old independent waits sometimes printed 8 even before fixing anything: the tabs' evals start at different times. The controlled `&deposits=1` leg starts with empty backs and an empty T1, signals the follower immediately before the authority's five-second stall, deposits exactly eight, then moves the follower away so refunds cannot be redeposited. Count **both personal backs plus one shared frame**, after flights settle; summing the two tabs' frame counts double-counts the shared stock. Baseline: **16 on both tabs** (8 frame + 8 refunded). The supplied first patch: **10 on both** (8 frame + 2 refunded), reproducing its insufficiency, though not the earlier 13/14/15. Its `settled && amAuthority()` refund was wrong: the five-second presence gap briefly elects the follower, even while acceptance replies arrive. Final: **8 on both** (8 frame, empty backs, zero coming), no graphics errors. Inspected `.look/coop-stall-after-{still,motion}.png` and the second tab's still: 8/24 on the frame and empty backs.

**Plan correction:** no timeout or presence-election refund. A slow reliable reply is not a rejection, and reclaimed refunds may already have been spent. Target each request at its chosen authority; match answers by sender, id and kind before frame/authority guards. Refund a matching rejection or unanswered request on actual peer removal. A targeted authority that has since stepped down answers `no`. Answers bypass the traffic budget, and over-budget requests get a rejection. This remains a prototype protocol, not a server transaction across an unrecoverable partition.

## State and messages

| State | Kind | How |
|---|---|---|
| `cart.rails`, `cart.called`, new leg `'forge'` | Shared, run on each tab | `depot` slice; authority's snapshot corrects |
| `job.longBeam = { x, z, yaw, set }` | Shared, saved | Field on `job`, so reset, save and snapshot come free |
| Who holds which end | Owner | Presence `placeLongBeam`: `0`, `1` or `null` |
| Great beam or boiler on your shoulder | Owner | Presence `placeBig`: `'beam'`, `'boiler'` or `null` |
| See-saw tilt, launch | Local | Each tab moves only its own body |

**Authority:** the existing coop authority alone decides `set`. Everything else is per tab.

New `placeCoop` messages (additive; old tabs ignore unknown `k`): `{k:"cartCall"}`; `{k:"cartLoad", n}`, up to `CART.rails`; `{k:"beamSet", x, z, yaw}`; `{k:"beamBounce", end}`, 0 or 1. `dep`, `stock` and `no` gain an integer `q`; a missing `q` means 0, which matches by kind and sender. `dep.to` names its chosen authority; older requests without it use the current authority.

**Controls:** interact verbs only, no new key or pad slot. Register them with `registerInteractable` in the new file, leaving `verbs.ts` alone.

## Starting numbers (hypotheses)

Add to `CART` in `layout.ts`: `rails: 16, forgeS: 8, leaveS: 3`. In `pair.ts`:

```ts
BEAM = { len: 9, from: { x: -132, z: -16 }, site: { x: -56, z: 6 }, reach: 3, liftY: 0.9, holdY: 1.0, dropAt: 11, dropS: 1, setR: 5 }
SEESAW = { padAt: 3.6, padR: 1.6, landV: 5, launchV: 15, tilt: 0.35, coolS: 0.5 }
```

Both sites are local coordinates; add `ORIGIN.x`. They were checked at flat ground (H 18.0), clear of the lines and of today's `TOWN` list. Launch: 6.25 m up, about 1.7 s in the air.

## Steps

Run `npm run check` after each. Don't edit `verbs.ts`, `town.ts`, `folk.ts`, `gifts.ts`, `land.ts`, `crystals.ts`, `sites.ts`, `objective.ts` or `signs.ts`: the abilities and town tracks work there.

- [x] **1. Fix deposit answers (`coop.ts`), proving it first.** Implemented with the evidence-based correction above, not the proposed 15-second refund or `takeBack`. Request ids and recipient matching settle accepted/rejected pieces once; beam rejections restore the shoulder. Verified the synchronized eval prints `COOP conserved 8` on both tabs.

- [x] **2. Return big things on departure (`coop.ts`).** `placeBig` Owner presence and the pickup message record the carrier. Departure returns an unconsumed beam or boiler and saves; reconciliation follows trunk availability in both directions. Clear stale shoulders after both full snapshots **and ordinary reconciliation**: a reconnect need not call `applyFull`. On connection loss, rejoin behind the survivors and take their snapshot; otherwise a returning former authority republishes its stale taken state. Guards preserve delivered beams and fitted boilers. Verified independently of step 6 with `npm run scenario -- place-coop-returns --no-trace`: authority and third-tab observer see beam `true → false`, boiler `2 → 1`; returning follower and former authority lose stale cargo; rejected beam returns to shoulder. Before: both items stayed taken and returning carriers kept them. After: all checks passed, WebGPU, `gfx errors: none`. Inspected the `returned-beam-still.png` and `returned-boiler-still.png` artifacts in `.look/scenarios/place-coop-returns/`: trunk at its tree and boiler beside the forge. Real-time motion remains unverified. Step 6 still checks the future co-carry beam's combined departure, but need not duplicate these return mechanics.

- [x] **3. Rails on the cart (`layout.ts`, `depot.ts`).** All of this is inert unless `cart.called` or `cart.rails` is set, and only step 4's `coop=1` verbs set them. Add `rails: 0, called: false` to `cart`, `forge: 'forge'` to `leg`, and `FORGE_D = L1_FROM` (the turntable, 7.5 m from the forge rack). `rest` starts on `owed > 0 || cart.called`. `load`: rest on `!n && !cart.called`. `out`: if `cart.called && cart.d < FORGE_D`, stop at `FORGE_D`, enter `forge` with `t = 0`. `forge`: `t += dt`; at `t >= (cart.rails > 0 ? CART.leaveS : CART.forgeS)`, set `called = false`, whistle, go to `out`. `back`: on reaching `FORGE_D` while `called`, enter `forge`. `drop`: fire on `cart.load > 0 || cart.rails > 0`. After the logs, rails go by `send('rail', here, rack.at, { dur: 0.45, delay, apex: 1.1, land: () => rackAdd(0, 1) })`. Add `cartRailsMesh`, an `InstancedMesh` of `BoxGeometry(0.12, 0.1, 2.4)` with `flat('#8d9299')`, stacked above the logs. Export `loadCart(n)` (clamps to `CART.rails`, sets `t = 0`), `callCart()`, and `cartPlatform = car.platform`. The `depot` slice gains `rails` and `called`, read with `count` and a type check; `snapCart`'s not-depot branch zeroes them. In `coop.ts`: add `(j.depot as { rails: number }).rails` to `volatile`, and `ids(cartPlatform, 'place:cart')` to `setup`.

- [x] **4. The verbs (new `src/proto/place/pair.ts`, `coop.ts`, `index.ts`).** In `coop.ts`, following `chopHooks`: `export const pairHook = { msg: null as ((m: Record<string, unknown>) => void) | null, busy: null as (() => boolean) | null }`. Add `coop.send = (m) => COOP && msg(m)`. New `onMsg` cases `cartCall`, `cartLoad`, `beamSet`, `beamBounce`: `if (ready) pairHook.msg?.(m)`. `coop.ts` must not import `pair.ts` (cycle). `index.ts`: one line, `import './pair.ts';`. `pair.ts` does nothing unless `COOP`. Its interactable needs `job.rung.depot && !job.rung.trains`, `activeFrame()?.spec.rack === 'cart'`, `need = st.wants('rails') - rack.rails - cart.rails > 0`, and the player within 5 m of the turntable. Leg `forge` and `min(need, CART.rails - cart.rails, forge.rails) > 0`: `{ id: 'place-cart-load', verb: 'Load the cart', at }`, which loops `rackTop` + `takeRail` + `send('rail', ...)` to the cart, then `loadCart(n)`, `coop.took('rails', n)`, `coop.send({ k: 'cartLoad', n })`. Otherwise, if not `cart.called`: `{ id: 'place-cart-call', verb: 'Whistle for the cart', at, run }`, which does `whistle`, `callCart()`, `coop.send({ k: 'cartCall' })`. `at` is above the turntable, so the nearest-target pick keeps "Take rails" at the rack. Verify with `/look`: both verbs, rails visibly on the cart, rails landing on the far rack, and a rider standing still on the partner's view of the cart.

- [x] **5. The beam (`job.ts`, `pair.ts`, `coop.ts`).** `job.ts`: add `longBeam: { x: 868, z: -16, yaw: 0, set: false }` (world coordinates of `BEAM.from`). `coop.ts`: `discrete` gains `q.longBeam?.set ?? false`. `reconcile`: `if (!pairHook.busy?.()) Object.assign(job.longBeam, theirs)` when `theirs` is an object. `pair.ts`, one mesh: a `BoxGeometry(0.5, 0.5, BEAM.len)` in `flat('#7a5430')`, on a stub fulcrum shown once `set`. Use `onFrame`, as `depot.ts` does. Verbs (after `job.awake`, not `set`, `!back.big`): `Lift` within `reach` of an end sets `grip = 0 | 1`; `Let go` while gripping. Presence `placeLongBeam` returns `grip`. Find the partner each frame: a `remotes` entry with that key, `visible`, and fresh, sampled by `r.snaps.sample(now - INTERP_MS)?.p`. While gripping, `input.sprint = false`. Alone: the far end stays where it is, your end at `liftY`; let go automatically past `len + 1.5`. Both: the beam centres on the midpoint at `holdY`, yaw along the pair, writing `job.longBeam`. Past `dropAt` for `dropS`, both let go. Grips ending or the partner vanishing (**mid-carry departure**): the beam stays at the last midpoint, on the ground, with `thump`, `dustRing` and `save()`. Your own grip continues as alone. Authority: both gripping and midpoint within `setR` of the site sets `set`, snaps it to the site, sends `beamSet`. Every tab clears `grip` on `set`. `pairHook.busy` is true while any grip is held. Verify with `/look`: lone tilt, carry, set.

- [x] **6. The see-saw and the checks (`pair.ts`, `place-coop.ts`).** Each frame, when `set`: if your body is over a pad and `velocity.y` went from `<= -landV` to about 0 since last frame, and `coolS` has passed, thump, tilt towards that end, and send `beamBounce {end}`. On `beamBounce`: tilt, and if your body is over the *other* pad and near the ground (`y - H < 1.4`), `velocity.y = launchV`, then `shakeView(0.1)`, `pop`. Tilt eases back over 0.5 s, cosmetic and local. New `place-coop.ts` legs, printing `COOP` lines:
    1. Skip to line 2 stage Q2. Player 2 at the turntable calls and loads, then prints `rack.rails` after the drop on both tabs.
    2. Teleport both to the ends, press `Lift`, walk together past the first building, print the beam's place.
    3. Player 2 lifts alone; print `grip` and that it hasn't moved.
    4. Teleport to the site, confirm `set`, player 1 jumps on a pad, print player 2's `y` rising.
    5. Last: player 2 shoulders the boiler, lifts the beam with player 1, then `location.href = 'about:blank'`. Player 1 prints `job.boiler === 1`, the beam at rest, and a still-usable `Lift`. If the harness complains about the blank page, read player 1's lines anyway.

- [ ] **7. Measure (`panel.ts`, new `dev/look/evals/place-split.ts`).** `panel.ts`: add `skipQ5()` beside `skipHead`, with `L2.stage = L2.stations.findIndex((s) => s.spec.id === 'Q5')` and the same snaps, `rack` emptied. Add `q5: skipQ5` to `coop.skips`. The eval takes `&mode=solo|walk|split`, starts with `coop.skip('q5', ...)`, plays with `makeBot` from `dev/look/bot.ts` (copy the rails fetch and deposit from `dev/look/bots/place.ts`), and prints `SPLIT <mode> <seconds>` from frame active to `st.full()`. `solo`: one player does all of it. `walk`: both fetch rails on foot. `split`: player 2 whistles, loads 16, takes 8 on their back and rides; player 1 stays at the frame, carrying from the rack. If `split` misses the target in "How to check", set `CART.rails` to 24 and measure once more; report whatever results.

- [ ] **8. Record it.** Update `docs/game-design/place.md` (cart rails, the beam, numbers from step 7) and the header comment of `coop.ts`. Update the `place` card in `protos/protos.ts` with one gut question, "Did splitting up beat staying together?", and one line on what's new. Tick "Two players" in `docs/plans/round-4.md` only once the checks pass.

## How to check

```sh
BOOGLE_QUERY='proto=place&coop=1' node dev/codex/see.ts --players 2 --real --eval dev/look/evals/place-coop.ts
npm run playthrough -- --name two-player
npm run playthrough -- --compare <base> two-player
BOOGLE_QUERY='proto=place&coop=1&mode=split' node dev/codex/see.ts --players 2 --real --eval dev/look/evals/place-split.ts
```

Steps 1–2 use `&deposits=1 --until window.__coopDone --warm 55` with `place-coop.ts` for the synchronized conservation leg (add `&trace=1` for requests/replies). The old railway tour requires `&railway=1`; without either flag this eval runs exploration. If no broker is available, `npm run look -- --query 'proto=place&coop=1&deposits=1' --players 2 --real --eval dev/look/evals/place-coop.ts --until window.__coopDone --warm 55` starts the same local stack directly.

Steps 1–2 validation (3 November): Prettier on changed files; lint, typecheck, 292 unit tests, registry, five level checks, assets, and production build passed. The shared `node_modules` symlink makes Vite's default config bundler try writing outside this worktree: plain `npm run check` failed there with `EPERM`, after its other checks passed. `npm run check -- -- --configLoader runner` passed the entire pipeline without that cache write. No dependency installation, push or ship. The supplied `see.ts` broker marker was absent, so the captures used the local look/scenario stack directly.

Run the last line for `mode=walk` too (2 players), and for `mode=solo` with `--players 1`.

- **Co-op:** both tabs' `COOP` lines match, `conserved 8`, no `gfx errors`, and open the stills.
- **Solo:** the playthrough finishes with beats within 2% of `<base>` (a run from before this work; Far Head about 1380 s), and no new text. `--compare` must show no gameplay change.
- **Split against solo:** on Q5, `split` at or under 0.6 of `solo`, and under `walk`. Report all three numbers. Bills are identical by construction: no number here reads the player count.
- **By eye in real time:** the launch and thump, using `--video`. Say what wasn't seen.

## Risks

- **Hotspots:** `index.ts` gets one line, `panel.ts` two, `job.ts` one field. The abilities and town tracks showed no `src/proto/place` changes against `main` when this was written, but rebase first; keep both sides on conflict.
- **Town:** `growing-towns` may build on a beam site. If so, move only `BEAM.from` or `BEAM.site`.
- **Mixed builds:** messages and presence are additive, and `job.longBeam` is filled in by `fill` from older saves and snapshots, so no save-key bump.
- **Bumps not handled:** two tabs can briefly both think they're the authority and accept the same deposit; the next snapshot settles it. Left alone in a throwaway.
- **Performance:** three small meshes and one small instanced stack. No `npm run perf`.
- **Not verified while planning:** nothing was run in a browser. The time estimates are sums from `place.md` and step 7 replaces them. The sites were checked for height and clearance only, so step 5's carry is the real test of the route between cottages.

## Open questions

None block the build. For the owner after playing: the cart lets a lone tab in a `coop=1` room skip some rail walking, a small softening of the walk-home hunger that leads to trains, in co-op only.
