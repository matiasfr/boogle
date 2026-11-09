# Plan: the hook shot in the production game

Prepared 8 November 2026 against `origin/main` `8b98e8b4`. Planning only; no code changed. Implementer: Codex
(`gpt-6.1-sol`); the orchestrator checks the visuals (section 9).

## Goal

The production railway gets the hook-shot move its device already promises ("Pull yourself to a ring."): a press pulls
you along a zip line to the ring nearest the middle of the view. Needle Bell gets Place's seven floating slabs and eight
rings, so the player can climb it by hook pulls to the summit deck where B4 puts the sea switch.

Binding calls:
- **8 November, "the hook shot comes into the game".** The decision commit `a2585411` (branch
  `claude/codex-workhorse`, shipping as `ship/matias-franco-084b86b`) may not be on main yet. Rebase onto main once
  it lands.
- **8 November, the playtest checkpoint.** Development pauses after the hook shot and B4.
- **5 November.** The hook stays a zip-line pull to its target; the swing was rejected.
- **Owner calls.** Every input gets instant feedback, and co-op abilities use option E.

Serves DESIGN **7 Telegraph everything** (the rings and slabs are visible from the start) and **8 Enjoyable alone and
together** (one shared fact; a friend sees your cable). It also serves **11 Show, don't tell** (the first pull is done for
you after the card), and the technical rule **Clear authority** (no new shared state). It bends no principle.

Out of scope: B4 itself (Q5, `rail.seaSwitch`, the sea gate, Far Head), the glider, hook upgrades, and Place's other
rings (nook, alcove, loft, stack-return).

## 1. Where it goes

| Piece | From (Place) | To (production) |
| --- | --- | --- |
| Path, pick and step maths, as plain numbers with no three.js | `src/proto/place/moves.ts`: `overLip`, `cr`, `buildPull`, `pathAt`, `stepPull`, `cancelPull`, `scoreOf`, the hysteresis in `pickRing` | **new** `src/entities/railway/hook-path.ts` |
| The move: picking, the press, the fixed step, controls, presence | `moves.ts`: `fireHook`, `pickRing`, `whyNot`, `clearFor`, `syncControls` (hook half), the `back` wrap | **new** `src/entities/railway/hook-shot.ts` |
| Slabs, rings, posts, halo, cable, arm, glyph chip, sounds, remote cables | `tech.ts` `buildPads` (ring pads only), `buildRings`, `updateRings`; `moves-view.ts` `makeCable`, `drawCable`, `showChip`, the hook half of the frame loop and of `placeMove` | **new** `src/entities/railway/hook-view.ts` |
| Numbers | `tech-layout.ts` `PADS`, `ringAt`, `MOVE` (hook keys), `SEA_SWITCH` | **stay in Place's `tech-layout.ts`**, read through the existing dynamic `import()`, as `line2-view.ts` and `tools.ts` already do for `PILLARS`, `DEVICES` and `SERVICE_ROUTES`. One source, so it ports 1:1 with no copy to drift. |
| Arm pose | `gear-models.ts` `armToRing` | reused through the dynamic import `tools.ts` already makes |
| CSS | `place.css` `.place-key`, `.tbtn.place-hook-btn`, `body.place-has-hook` | reused unchanged. Production already loads `place.css` (`arrival.ts`), so no new CSS is needed. |

**What stays in Place:** `moves.ts`, `moves-view.ts` and `tech.ts` are unchanged; Place keeps its own copy and its bot.
Production must **not** import `moves.ts`, `moves-view.ts`, `tech.ts` or `job.ts`: they carry Place's campaign
owner. The `tools.ts` header states this rule. Merging the two copies later is a follow-up, not part of this plan.

**Lint boundaries:**
- The new files are entity files under `src/entities/railway/`.
- They import `src/player/`, `src/physics/`, `src/render/` and `src/netplay/` statically (as `tools.ts` does) and
  reach `src/proto/` only through `import()`.
- No new `onFrame`, `addBody` or `scene.add`. All frame work runs through the railway entity's
  `prePhysics`/`fixedPre`/`update`, and meshes go on `owner`.
- `hook-path.ts` imports nothing but types, so Node tests can load it.

**Wiring (`src/entities/railway/view.ts`, a few lines):**
1. After `createRailwayLine2(...)`, call `const hook = await createRailwayHook(adapter, owner)`, a single factory in
   `hook-shot.ts` that builds `hook-view.ts` inside it.
2. `prePhysics: () => { sources.prePhysics(); hook.prePhysics(); }`.
3. `fixedPre: () => { if (!hook.fixedPre()) reward.fixedPre(); }`. While a pull owns the body, the second jump's step
   is skipped, as Place's `stepPull` returned early.
4. Call `hook.update(dt, now)` in `update`, after `line2.update(dt)`.
5. Add `hookShot: hook.inspect()` to `inspect`, and its type to `RailwayViewInspection` in `state.ts`.
6. Pass the demo forwarder into line2: `createRailwayLine2(..., reward.youGot, () => demo())`, where `let demo = () => {}`
   is declared before line2 and becomes `demo = hook.demo` once the hook exists.

## 2. Who owns what

| State | Sync kind | API | Authority |
| --- | --- | --- | --- |
| Having the hook | **Server**, existing | `rail.hook` / `adapter.inspect().line2.hook`, predicted on the press | server |
| The pull (your body along the path) | **Owner** | your own `me.body`; the position goes out in the existing `p` presence | you |
| Which ring you're pulling to | **Owner** | `addPresenceField('railwayHook', () => pull ? pull.ring.id : null)` (new key, a pad id string) | you |
| Pick, range, hysteresis, latch | **Local** | none | you |
| Slabs, posts, rings and their colliders | **Local** static view, identical numbers on every tab | `land.addStatic` / `land.addStatics` with `owner` | none |
| Cable, arm, halo, colours, glyph chip, sounds | **Local** cosmetic | none | none |
| A friend's cable and arm | **Local** view of their Owner presence | `onRemotePresence`, `onPeerRemoved` | them |

**No new sim state, op, rule, tunable or `WORLD_NS` bump.** The hook numbers stay Local constants in `MOVE`, not host
tunables. `railwayHook` is an additive presence key; older tabs ignore it. A missing key means "not pulling".

## 3. Input and feedback

**Action.** Call `registerAction('hook', { pad: 'rb', key: 'KeyF', label: 'Hook shot, at a ring', touch: { label:
'Hook', className: 'place-hook-btn' }, group: 'move', order: 2, down: () => active?.press() })`.
- Register it lazily, the first time the latch (below) says you have the hook, as Place's `syncControls` does. Do it
  from a module-level guard in `hook-shot.ts`, so a railway view rebuild never registers it twice.
- `active` is the current view or `null` after dispose.
- Toggle `document.body.classList` `place-has-hook` with the latch.
- RB is free in `src/` (registry, 8 November: only `src/proto/place/moves.ts` claims it). After this, LB, D-pad ↑, ↓ and
  → stay free, so `updates.ts` keeps D-pad ↑.
- Add the row to `docs/game-design/controls.md`.

**Let go.** Jump, Back, or pressing the button again during a pull ends it:
- **Jump:** `hook.prePhysics()` runs at railway prePhysics −59, after `player-intent` (−80) and before any fixed step.
  It calls `cancel()` when `me.jumpQueued > 0` during a pull. The queued jump then falls through: to the ground jump
  if you're touching something, or to `tools.ts`'s second jump at fixedPre 43 if you have the charge. This matches
  Place's order-22 step.
- **Back:** `onStart(() => wrapAction('back', { down: (next) => (active?.pulling() ? active.cancel() : next()) }))`
  at module level in `hook-shot.ts`.

**The latch** (`createHookLatch()` in `hook-path.ts`, pure):
- `owned` turns true the first time `ready && line2.hook`, including from the press's own prediction.
- It turns false only after `ready && !line2.hook` has held for 2 s (a fresh world).
- A resync or a disconnect never clears it, so the button doesn't vanish and a pull never ends because the mirror
  flickered. This copies the `missing` debounce in `ability-arrival.ts`.

**Targeting**, `pick(now)` in `hook.update`, ported 1:1 from `pickRing`:
- Candidates: rings within `MOVE.hookRange` (24 m) and inside `MOVE.hookCone` (25°) of `camForward`.
- Skip the ring of the slab you're standing on.
- Score each as angle × 1.4 + distance / 90.
- Raycast from chest height to 1.2 m short of the ring (`GROUP.SCENERY`, `skipBackfaces`), and both-sphere
  `clearFor` sweeps to the lip.
- Hysteresis: a challenger must score 20% better and hold for 150 ms.
- Ring colours: brass before the latch, teal when in range, hot (`#d6fff5` × 1.6, pulsing scale 1.18) plus the halo
  when picked or pulling.

**Feedback on the press**, all on the press frame, before the next physics step:
- **A ring is picked:**
  - the `hookFire` sound;
  - the cable starts reaching (70 ms) from `hand_r` to the ring;
  - `armToRing(root, ring, 0.9)`;
  - the body follows on the next fixed step, under 17 ms later;
  - on arrival or let-go, `hookLatch` plays and the cable winds back (110 ms).
- **Nothing picked** (new; the owner call needs it, since Place gave only a faint `pop(0, 0.25)`):
  - `pop(0, 0.25)`;
  - a 1.5 m cable flick along `camForward` (out 70 ms, back 110 ms);
  - one 200 ms blink on every ring in range (if any), so a near miss shows where to aim.
  - Count it as `denied`.
- **Glyph chip:** `showChip('hook', pick.at)` on the picked ring for the first three pulls, as in Place. Touch shows
  the button instead.

**Fixed step**, `hook.fixedPre()`, which returns true when it owned the body:
- With no pull, return false.
- If `fallArrival.active || me.swimming || inputState.seated || me.down || !me.body`, cancel and return false.
  `inputState.held` is **not** a cancel during a pull (see section 6).
- Otherwise run `stepPull`:
  - accelerate at 60 to a cruise of 16 m/s, braking at 70 to arrive at rest;
  - set the velocity toward the path point, capped at 22.4 m/s;
  - `b.force.y = PLAYER_MASS * GRAVITY`;
  - `me.wish.set(0,0,0)` and `me.coyote = 0`;
  - stall when the error stays above 1.1 m for 0.18 s, then cancel;
  - finish within 0.05 m of the end, with velocity zero.
- Return true.
- A cancel caps velocity at 9.5 m/s horizontal and 3 m/s up. It never adds speed or refills the second jump
  (`jump-upgrades.md`: "hook cancels never refill").

## 4. The Needle Bell route

Built by `hook-view.ts` from the start, like the `p2` pad (DESIGN 7: you see the climb before you can do it).

**Rings:** `HOOK_CLIMB = ['p2', 't0', 't1', 't2', 't3', 't4', 't5', 'summit']`.
- One ring per pad at `tech.ringAt(pad)` (plus `ORIGIN`); each pulls you **to** its pad.
- The landing point is `(pad.x + ox, pad.top + PLAYER_R + 0.2, pad.z)`.
- `p2`'s ring is the last step down. The pad itself is already built by `line2-view.ts`: don't rebuild it.

**Slabs**, ported 1:1 from `PADS`, local metres with world x = local + 1000:

| id | x | z | top | half size | look |
| --- | --- | --- | --- | --- | --- |
| t0 | 8 | 8 | 24 | 3 × 3 | float |
| t1 | −7.6 | −1 | 37 | 3 × 3 | float |
| t2 | −7.6 | −19 | 50 | 3 × 3 | float |
| t3 | 8 | −28 | 63 | 3 × 3 | float |
| t4 | 23.6 | −19 | 76 | 3 × 3 | float |
| t5 | 23.6 | −1 | 89 | 3 × 3 | float |
| summit | 15 | −6 | 102.4 | 5 × 4 | wood |

**Slab geometry:**
- Float slabs are 0.9 m thick, built with Place's `stonePad`; the summit is a 0.4 m wood box `#8a6238`.
- Colliders are tiles of at most 1.5 m, as Place's `buildPads` makes for ring pads. Thin tiles keep the camera arm
  from pulling in under a slab.
- Each float slab has a teal glow strip underneath.
- Ring posts: an `InstancedMesh` of `0.22 × 1 × 0.22` with box colliders. Rings: an `InstancedMesh` torus
  `0.55/0.09`, plus a `readableUnlit` halo, as in `buildRings`.
- Use `readableGlow` and `readableUnlit` exactly as Place does. At the 0.12 surface gain, a plain standard material
  reads near black (`place.md`, 6 November).

**Summit:** the deck covers local x 10–20 and z −10 to −2. `SEA_SWITCH` (11.8, −6) is on it, and B4's switch stands
there. Keep a 2 m radius around it clear of posts. The summit ring hangs off the east edge (x 22.2) with its post
standing in air below it; that's Place's design. Port it, and the orchestrator checks it (shot 4).

**Things that might be wrong, so check them, don't change them silently:**
- Production adds the Q2 hook walkway, frames, rack and cart near p2, which Place didn't have. Each hop must still
  report `whyNot === 'nothing'` (the bot proves it, step 6).
- If a production mesh blocks a hop, move that mesh, not the ring. Record it in `place.md`.

## 5. Co-op

- The hook is one shared fact (option E): no change to `ability-arrival.ts`, and a friend gets the flourish.
- The demo pull (step 5) is the finder's alone, triggered from the card's `done`.
- **A friend sees the pull:**
  - the puller's body moves through the ordinary `p` presence, which the remote avatar interpolates;
  - `railwayHook` names the ring;
  - `hook-view.ts` keeps `others: Map<peer, { cable, ring }>`;
  - each frame it draws the friend's cable from their avatar's `hand_r` to `ring.at`, with `armToRing` on their
    avatar.
- Validate each value as `typeof v === 'string' && ringById.has(v)`; anything else means off.
- When the value goes off, wind the cable back. `onPeerRemoved` removes the cable mesh and the map entry.
- Two players pulling to one slab is fine. A stall from a body in the way just lets go above the slab.

## 6. No stranding

- **Missing a ring:** a press with no pick never moves you (denied feedback only). You can't leave a slab by
  mistake.
- **Letting go or a stall mid-air:** you fall with capped speed. There's no fall damage in production. Below Needle
  Bell is the gorge.
  - **Proof** (step 7): from `t3` and from the summit, the bot walks off the edge and lands. It then walks to the deck
    at quarry `s = 84` (the hook walk's start) without `getUnstuck`.
  - If that walk is impossible, stop and report. Don't add geometry: it's an owner call.
  - From the ground, the `p2` ring (about 5 m over p2) is also a hook back up if it's in range. Report whether it is.
- **A reveal mid-pull:** `inputState.held` blocks new presses but doesn't cancel a pull in progress, because the
  pull finishes in under 2 s. Place cancelled here, which would drop you 60 m.
- **Reconnecting mid-pull:** the pull is Local physics and continues. The latch keeps the hook through
  `ready=false` and a resync. The presence getter resumes when the room does.
- **Reloading mid-pull:** `return-spot.ts` saves only `me.coyote > 0` spots, and the pull holds `me.coyote = 0`.
  So a reload restores the last slab you stood on, where the latched hook pulls you back down once the mirror is
  ready.
- **A fresh world with you on a slab:** Respawn / `getUnstuck` (`arrival.ts`) searches the ground, sweeping from
  h + 128, and skips points under a slab.

## 7. The bot

All in `dev/look/bots/railway.ts`, using ordinary inputs:
- aim by setting `cam.yaw` / `cam.pitch`, as Place's `hookTo` does;
- press with `triggerAction('hook', 'down')` then `'up'`;
- no teleports and no direct `press()` calls into the module.

**Probe:** `hook-shot.ts` registers a read-only probe through `state.ts`, `registerHookProbe(fn)` and
`hookWhyNot(id): string`, following the `registerRailwayRecovery` pattern. The bot logs why a hop failed.

**After `hook taken`** (the `k === 1` branch):
1. Dismiss the card. The demo pull fires 0.3 s later.
2. Wait for it to end and land on `t0`: `coyote > 0`, |y − PLAYER_R − 24| < 1, within 4 m of the land point.
3. Move `checkpoint('hook taken')` to after that landing.
4. `hookTo(id)` for `t1 … t5, summit`:
   - aim with yaw at the ring and pitch at `atan2(dy, d) − 0.3`, capped at 0.85;
   - wait until `inspect().hookShot.pick === id`, at most 3.5 s, else fail with `hookWhyNot(id)`;
   - press, then wait for `!pulling` and a landing on that pad;
   - `require` each hop.
5. Require the summit standing at |y − PLAYER_R − 102.4| < 1, then call `checkpoint('needle bell summit')`.
6. Come back down with `returnFromTower`, ported: for `t5 … t0, p2`, walk toward the edge until you're 1.5 m lower and
   the ring is picked, then press.
7. Rejoin the existing walk back down the walkway from `p2` and carry on to Q3 unchanged.
8. `noJump('hook climb')`: the climb needs no air jump.

**Co-op (`second`):** while the friend waits for the gate, it collects the leader's `railwayHook` values. Require at
least 5 distinct ring ids, and `hookShot.remoteCables ≥ 1` seen at least once.

**Inspection** (`hook.inspect()`), detached scalars:
`{ owned, pick, pulling, ring, pulls, denied, ended, rings: [{ id, x, y, z }], remoteCables, chip }`.

**Photo frames** (`dev/look/evals/railway-photo.ts`):
- update `'hook taken'`, since Buddy is now on `t0`;
- add `'needle bell summit'`, a camera east of and above the summit looking west over the deck.

## Steps

Each step leaves `npm run check` green, and Codex commits per step. The visual judgement is the orchestrator's
(section 9). Codex reports what it captured and saw but does not sign off on looks.

- [ ] **0. Preflight.**
  - Rebase onto main that contains `a2585411` (the decision).
  - Run `npm run registry -- --json`: confirm `rb` is in no `src/` (non-proto) `pads` entry, and that the presence key
    `railwayHook` and the fixedPre orders are free.
  - Run `npm run check` (baseline).
  - **Proves:** a clean start and a free slot. If `registry` counts Place's `rb` against production, stop and report;
    don't pick another slot.
- [ ] **1. `src/entities/railway/hook-path.ts` + `test/railway-hook-path.test.ts`.**
  - Write the pure functions:
    - `hookRings(pads, ringAt, ox)`;
    - `overLip`, `buildPull(from, ring)`, `pathAt`;
    - `stepPull(pull, pos, MOVE) → { v, done, stall }`, `cancelVelocity(v, MOVE)`;
    - `ringScore`, `holdPick` (the hysteresis);
    - `createHookLatch()`.
  - Tests:
    1. The `HOOK_CLIMB` ring positions equal `ringAt` for the same pads, and the slab numbers equal the table above.
       This is the 1:1 guard.
    2. Each hop's distance (previous landing to next ring) is at most `hookRange`.
    3. The path starts at `from`, ends at `land`, and its length is monotonic.
    4. A full `stepPull` run stays at or under 16 × 1.4 m/s and ends at rest within 0.05 m.
    5. A stall over 0.18 s cancels.
    6. `cancelVelocity` caps at 9.5 and 3.
    7. `holdPick` needs 20% better for 150 ms.
    8. The latch survives `ready=false` and a 1.9 s `!hook`, and clears at 2 s.
  - **Proves:** the maths ported unchanged.
- [ ] **2. `src/entities/railway/hook-view.ts`, static part.**
  - Build the slabs, glow strips, posts, rings and halo (section 4), owned by `owner`. Wire the factory in `view.ts`,
    with no move yet.
  - Verify:
    - `npm run check`;
    - `npm run perf` before and after, and report the frame-ms delta;
    - one `npm run look` still from the trestle at the hook walk, looking up the spiral. Codex lists what it sees;
      the orchestrator judges.
- [ ] **3. `src/entities/railway/hook-shot.ts`: the move.**
  - Write the latch, `pick`, `press`, `prePhysics` cancel, `fixedPre` step, `cancel`, the lazy `registerAction`, the
    `back` wrap, presence, `inspect`, the probe, and the `view.ts` wiring (section 1).
  - Feedback (section 3): the cable, arm, sounds, colours, chip and denied flick in `hook-view.ts`.
  - Verify:
    - `npm run check` and `npm run test:net`, which must be unchanged;
    - the registry shows `rb → src/entities/railway/hook-shot.ts:hook`.
- [ ] **4. A friend's cable.**
  - Add the `onRemotePresence` / `onPeerRemoved` handling in `hook-view.ts` (section 5).
  - Verify: `npm run check`. The co-op proof comes in step 6.
- [ ] **5. The demo pull.**
  - In `line2-view.ts`'s `rail.hook` branch, add `done: () => hookShown?.()` to the existing `youGot({...})`. The new
    optional last parameter of `createRailwayLine2` is `hookShown`.
  - `hook.demo()` waits 0.3 s, then calls `press(ringById('t0'))`, only if you're standing on p2 and `t0` is clear.
  - Verify: `npm run check`.
- [ ] **6. The bot climbs** (section 7).
  - Run the solo route: `npm run playthrough -- --long --eval dev/look/evals/railway-job.ts --query 'shot=play'`.
    It must pass every earlier beat, plus `hook taken` on t0, the six hops, `needle bell summit`, the descent and
    Q4 as before.
  - Run it with two players: `npm run look -- --players 2 --eval dev/look/evals/railway-job.ts --query 'shot=play'
    --until window.__placeDone`. Both peers finish, the remote-hook witness passes, and the mirror hashes agree.
  - Report game time to the summit and the extra minutes over the last run's Q4.
- [ ] **7. No-stranding proofs.**
  - Add a query branch `hookDrop=t3|summit` to the bot after `needle bell summit`: walk off the pad's outer edge, land,
    then walk to quarry `s = 84` with `bot.walk`, which throws on recovery. Run both.
  - Run a reload mid-pull with `dev/look/bots/railway-reload.ts`'s pattern (save `stage: 'hook'`, then
    `location.reload()` during a pull from t2 to t3). After reload, you stand on t2 (the last spot you stood), the
    latch is set once ready, and a pull to t1 works.
  - Report each result. On a failed drop walk, stop for the orchestrator.
- [ ] **8. Docs.**
  - `docs/game-design/place.md`: the production line-2 section gets the hook shot, rings, climb, demo pull and denied
    feedback.
  - `docs/game-design/controls.md`: the hook row, and RB is no longer free.
  - `docs/plans/line2-part2-greybox.md`: one line under B4 saying the summit is reachable, with checkpoint
    `needle bell summit`.
  - `docs/plans/production-core.md`: the slice note.
  - Verify: `npm run check`.
- [ ] **9. Captures (section 9), the orchestrator's review, then `npm run ship`** with the summit still in the body.

## 8. Checks

| Check | When | Must show |
| --- | --- | --- |
| `npm run check` | every step | green |
| `test/railway-hook-path.test.ts` | step 1 onward | the 8 cases above |
| `npm run test:net` | steps 3 and 9 | unchanged pass (no wire change except an additive presence key) |
| `npm run playthrough -- --long …railway-job.ts` | steps 6 and 9 | every beat to Q4, including the climb and descent; no errors |
| two-player `npm run look -- --players 2 …` | step 6 | both finish; remote-hook witness; hashes agree |
| `hookDrop` runs, reload mid-pull | step 7 | walk home without recovery; reload on the last slab, pull works |
| `npm run perf` | steps 2 and 9 | frame-ms delta reported (8 instanced rings and posts, about 110 static tile colliders, 7 meshes, per-frame raycasts for at most 8 rings) |

## 9. Captures for the orchestrator

Codex can't judge these. It produces them, opens each one and names what it sees; the orchestrator decides.
1. **Rings before and after.** A still at `Q2 laid` (brass rings, slabs visible up the spire) and at `hook taken`
   (teal rings, t1 picked with its halo). Question: do the rings and the teal undersides read at the 0.12 gain, from
   the trestle and from p2?
2. **The press**, real time: `npm run look -- --real … --video`, one pull from t0 to t1. Question: does the cable
   start on the press frame, does the arm reach, does the body come over the lip and onto the slab without clipping,
   and does it read as a zip line rather than a teleport?
3. **The denied press**, real-time video, pressing with no ring in view. Question: is there a visible and audible
   answer at once?
4. **`needle bell summit` still.** Question: is the deck clear where the sea switch will go? Does the summit ring's
   post look wrong hanging off the east edge?
5. **The descent**, a video of the step back down from t1 to t0. Question: does the camera arm stay out from under the
   slab, with the ring visible?
6. **A friend's view**, a two-player video from peer 2 while the leader climbs. Question: is there a cable from the
   leader's hand to the ring, and does the leader's travel look smooth rather than jerky at 20 Hz?
7. **Touch layout**, a touch-mode still after the hook. Question: is the Hook button clear of Jump and Grab?
8. **The glyph chip** on the picked ring, with keyboard F and pad RB glyphs, for the first three pulls only.

## 10. Risks

- **Room safety ("Don't").**
  - Leaving a presence field set: `railwayHook` returns `null` the moment a pull ends, cancels, or the view is
    disposed (set `pull = null` in dispose).
  - Patching another module's action by string: use `wrapAction('back', ...)` from `onStart`, never `actionById`.
  - Nothing goes into apply, and no op changes.
- **Not stuck on a resync.** Never cancel a pull or unregister the action because `line2.hook` read false: use the
  latch.
- **Second-jump interplay.** `tools.fixedPre` is skipped during a pull. Check that a cancel by Jump in mid-air spends
  the second jump if charged, and that landing a pull on a slab refills it (`coyote > 0` on the next step).
- **Ground jump during a pull.** Without Place's order-22 seam, the prePhysics cancel must run before the fixed steps
  of the same frame; `kind railway prePhysics −59` does. Don't add a new entity kind for it.
- **Hotspots.** `line2-view.ts` (1008 lines) and `src/adapters/railway.ts` stay untouched except the `done` callback.
  `view.ts` gets wiring only. The new code lives in three new files.
- **Place leak.** Importing `moves.ts` or `tech.ts` would drag in Place's `job` and campaign. Lint won't catch a
  dynamic import, so review imports.
- **Mixed builds.** Only the additive presence key; no `WORLD_NS` bump, no op, no catalogue change.
- **Performance.** Static tile colliders and per-frame pick raycasts and sweeps run only for rings within 24 m (at most
  2–3 at once on the climb). Measure with `npm run perf`.
- **In-flight work.** `npm run inflight` (8 November) shows no open branch touching `src/entities/railway/`,
  `dev/look/bots/railway.ts` or `src/player/controls.ts`. Only the decision branch (`ship/matias-franco-084b86b`:
  `owner-calls.md`, `decisions.md`) is open. B4 follows this plan and will edit `line2-view.ts` and the bot after it.

## 11. Open questions for the owner

1. **Place's two tower secrets (the box on t0 and the nook side slab off t3):** leave them out of production?
   *Recommended: yes.* Production has no secrets system yet. The summit's reason to climb is B4's sea switch, and the
   nook can come with the secrets later.
