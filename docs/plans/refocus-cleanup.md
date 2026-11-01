# Refocus cleanup: fewer systems, one throw, "you global, world per room"

## Goal

Cut what no longer earns its place, make throwing one module, let The Boogler's friendship be won without presents,
and save things the same way everywhere: the player globally per browser, the world per room. The cuts:

- fruit, the palm Shake, and the Boogler lines that only made sense with them;
- shore wash-up leftovers and retired catalog stubs;
- the crowded 8-slot hotbar.

The 0.1 haul stays, because it is part of the v2 redesign. Its logs stop depending on shaking palms. This serves
DESIGN.md 1 (toys before chores: presents stop being a chore on the way to Best friend) and "Small and readable" (no
stubs kept only for compatibility). It rewrites principle 2 on purpose, to "Physics toys first" (step 8), so the ball
becomes one physics toy among several.

**Owner decisions (2026-10-31, all final):**

- Fruit copy: trim it. Remove the fruit present lines, the fruit catalog entries, and every line that becomes untrue
  because fruit is gone, minimally repairing their nodes. Step 3 lists every removed line.
- Palm Shake: it goes. **Keep the haul**, and give it a log supply that doesn't depend on shaking palms. Remove only
  what was fruit-specific. Refactoring the haul is welcome.
- The `v02` bump wipes every world; fine.
- Friendship restarts with no migration; fine.
- The ball-rest rule as planned; fine.
- Principle 2 becomes a softened "Physics toys first"; step 8 has the final wording.

**Base.** Plan against `origin/main` (6c7eb3b at the time of writing), not the main checkout. That checkout's `main`
is about 55 commits behind, and several items in the request are already done on `origin/main`:

- **Item 1 (`feel`) is already done.** The `proto` rules module, `FLAGS` and every `proto.on('feel')` and `feelTune`
  branch were retired with the 0.1 namespace (PLAN.md "0.1 groundwork", M1). Feel is the only path today:
  `grep -rn "feelTune\|proto\.on\|FLAGS" src` finds nothing. What is left is one stale glossary row (step 3).
- **The `terrain`, `water` and `proto` RULES stubs are already gone** (`src/world/rules/index.ts`, "The list restarted
  with the 0.1 namespace"). Two docs still describe them as stubs (`digging.md`, `water-sim.md`); step 3 deletes them.
- **The registry escape hatch already exists.** `dev/registry/scan.mjs` `compareRegistries` skips the whole mixed-build
  rules comparison (removed ops, removed states, RULES order, state shapes) when `WORLD_NS` in
  `src/world/namespace.ts` differs from main's. Bumping it moves the PeerJS host id, the localStorage save and the
  server snapshot to a new room id, so old tabs can never meet the new world. Step 3 uses it (`v01` to `v02`), and
  step 1 writes down when that is allowed. The check is never turned off.

**Dev-phase policy (owner guidance, 2026-10-31).** Until public playtests, a clean break beats compatibility. Progress
may be lost, so there are no one-off localStorage migrations unless they cost nothing. Clean breaks beat stubs and
index-preserving hacks, and catalog indices may be renumbered. Only what stops a live room crashing stays. Step 1
writes this into AGENTS.md.

**Where to implement.** Use a separate worktree off `origin/main`, for example
`git worktree add ../boogle-refocus origin/main -b refocus/<step>`. Never touch, stage or commit the main checkout's
uncommitted owner work: `src/boogler/hud.ts`, `src/boogler/dialogue.ts`, `src/features/boogler.css`,
`dev/concepts/*`, `dev/scenarios/boogler-tag.mjs`, `test/chroma.test.mjs`, `DESIGN.md`, `package.json`,
`package-lock.json` and `.claude/skills/concept-art/SKILL.md`. No step edits any of those files except step 8
(`DESIGN.md`, see its note). Step 3 edits `src/boogler/lines.ts`, which the owner has not touched. This plan file sits
untracked in the main checkout: copy it into the worktree's `docs/plans/` and commit it with step 1.

## Design

### Sync kinds and authority

| Piece | Kind | API | Authority | Change |
|---|---|---|---|---|
| Hotbar contents | Local | localStorage `boogle.hotbar` (global) | you | 5 slots instead of 8 (step 2) |
| What you hold | Owner | presence `hd` (catalog index, -1 for empty hands) | you | indices renumbered at the namespace bump (step 3) |
| Thrown items | Local flight, Lockstep landing | `gift.toss`, `gift.take`; state `gifts` | host stamps | no fruit or shore in the state; new saved shape (step 3) |
| Fruit on palms, fruit items | removed | `fruit.drop` op and the five fruit catalog entries deleted | | step 3 |
| Palm Shake | removed | | | logs leave it in step 3a; the fruit half and the gesture itself go in step 3 |
| Log supply | Lockstep (unchanged wire) | op `src.take {id}`, state `sources` | host stamps | logs come from the log bundles, not a palm Shake (step 3a) |
| 0.1 haul (piles, stack, work sites, machine runs, helper bank, roster) | Lockstep (unchanged) | as today | host stamps | kept; only fruit-specific code and comments change |
| Boogler friendship | Local | localStorage `boogle.boogler` (one global key, was `boogle.boogler.<room>`) | you | step 4 |
| Throw (charge, aim, power, release, preview) | Local | new `src/player/throw.ts` + pure `src/player/throw-curve.ts` | you | step 5 |
| Ball in play | Owner (unchanged) | presence `b` | epoch owner | `throwBall(p, v)` takes a launch from the throw module (step 5) |
| Ball resting spot, saved per room | **Lockstep** | op `ball.rest`, state `ball` | host stamps; the ball owner submits | new (step 6) |

**Why the ball's resting spot is Lockstep.** Only Lockstep state persists (snapshots go to localStorage per room and to
the server). Host fields restart with the next host, and localStorage alone would be per browser, not per room. The
physics stays Owner. Only "where the ball came to rest" crosses into the world, as an edit, the same way a thrown item
reports its landing ("Crossing kinds goes through edits"). The state is three integers plus a tick, has no tick work,
and costs no bandwidth until the ball settles.

**Cosmetic (Local):** flights, the aim preview, the item-hand pose, the log bundles and their flying logs. The palm
wobble goes with fruit.

### Log supply without the Shake (step 3a)

Today the wood-age sources are the 36 home palm cells (`land.layout.trees`). Each holds 2 charges, drawn as a small log
bundle at the palm's foot by `src/features/log-sources.ts`, and they are taken by the palm's Shake in `giftTargets`
(`src/adapters/gifts.ts`). The rules side (`src/world/rules/sources.ts`, `src/sim/sources.ts`) knows nothing about
shaking: it is `src.take {id}` against a list of cells, with refills on a laid section and a seeded trickle.

The cleanest decoupling changes no rules, no wire and no saved shape. **The log bundle itself becomes the
interactable**: E (pad B, the touch action) on a bundle with charges says **"Take logs"** and submits the same
`src.take`. The bundles stay where they lie today, at the foot of the home palms. The palms are only where the wood
lies, not a gesture, so `layout.trees` stays the age-0 source list. Its meaning is documented as "the home palm cells:
where the wood age's log bundles lie".

- `log-sources.ts` already draws the bundles at `spot(p)` and plays the fly-to-your-back effect. It gains:
  - a `registerInteractable(logTargets)`, where `logTargets()` returns one target per source in reach (2.2 m from
    `spot(p)`) with `charges(id) > 0`: `{ id: 'logs' + id, verb: 'Take logs', at: spot + 0.5 m up, run }`;
  - a 1.5 s per-source pending guard, like gifts' `pending`, so a double press sends one edit.
- The rules keep validating as now. What doesn't fit on your stack drops as a pile beside the bundle.
- **Fruit-specific code goes, logs stay.** The palm part of `giftTargets` goes in two steps: its log half in 3a, the
  rest with fruit in 3. In step 3, `gifts` stops knowing about trees, and filling `layout.trees` moves out of
  `createGifts3d` into `log-sources.ts` (`onStart`, the same `trees.slice(0, 64)` cells), the only reader left. The
  `world-inputs` scenario reads the layout from a `window.boogle.land` handle set there, instead of
  `window.boogle.gifts.trees`.
- **Unchanged and still passing:** `test/sources.test.ts`, `test/sites.test.ts`, `dev/scenarios/haul-loop.ts` (it
  submits `src.take` directly), the replay test's `src.take` generator, and `test/world-rules.test.mjs`
  `SCRIPTS.sources`.
- **Rejected:** a separate `layout.logs` list of spots away from the palms. It means new land data, a new pinned
  fixture and a new meaning for `src.take` ids, for no gain in play. Walk-in pickup, as piles do, was also rejected:
  walking past a palm would take its logs by accident. If the v2 redesign wants spots elsewhere, `sourcesOf(age,
  layout)` is the one place to change.

### The clean break (step 3): what an old tab sees

`WORLD_NS` goes from `v01` to `v02`, so the world room for `?room=beach` changes from `v01-beach` to `v02-beach`.
`worldRoomId()` builds that one id, and the PeerJS host id, the localStorage save and the server snapshot path all
come from it.

- **An old tab (v01 build) left open** keeps connecting to `v01-beach`. It only meets other old tabs and keeps
  playing its own v01 world: fruit and the Shake still work for it, and it loads its v01 save from localStorage or
  the server. It never sees new players, their ball, their Boogler or their items, and new tabs never see it. There
  is no desync and no crash, because nothing is shared. It may keep uploading v01 snapshots to the server; new builds
  never read them. Within `CHECK_MS` (5 min) `updates.js` sees the new `version.json` and shows the toast. The tab
  reloads the next time it is hidden.
- **After the reload** it joins `v02-beach`, a fresh world for every room: no mushrooms or thrown items, and an empty
  roster, stacks, piles, work sites and helper bank (the 0.1 haul starts over; the owner accepted that). The frisbee
  is back on its perch, and every log bundle is full. A generalized `dropOldSave` deletes its stale
  `boogle.world.v01-*` keys. Global localStorage (name, colour, pid, hotbar, first-run flags) carries over. Fruit
  still sitting in a saved hotbar is dropped on load, because its id is no longer in the catalog.
- **Catalog indices** (`hd`, `gift.toss` `k`, items in the `gifts` state, the perch `kind` in `home-land.json`) are
  renumbered in the same commit. No v01 tab can be in a v02 room, so no index is ever read under the other numbering.
  Even if one were, `hd` and `gift.toss` are validated with `carryable(GIFTS[k])`, so the worst case is an item shown
  wrong or a toss rejected, never a crash.
- **Old saves.** v01 snapshots, on the server and in localStorage `boogle.world.v01-<room>`, are never loaded again
  (a different id). The v02 loader only has to survive junk, and `test/world-snapshots.test.mjs` already feeds every
  state junk. The pinned fixture moves to `test/fixtures/snap-v02.json`.

### Lockstep piece (step 6): `ball`

- `src/sim/ball-rest.ts` + `test/ball-rest.test.ts`. State
  `BallRest = { p: [x, y, z] | null, at: number }`: the spot in integer centimetres, and the tick of the last accepted
  rest. Exports: `REST_GAP = 20` (ticks, 2 s), `MAX_XZ_CM = 25500` (equals `HALF * 100`; the test asserts it against
  `src/world/grid.ts`), `MIN_Y_CM = -1500`, `MAX_Y_CM = 20000`, `createBallRest()`,
  `canRest(s, x, y, z, tick)` (all integers, in range, `tick - s.at >= REST_GAP` or `p === null`),
  `rest(s, x, y, z, tick)` (sets `p` and `at`, returns `p`), `serializeBallRest(s)` gives `{ p, at }`,
  `loadBallRest(s, json)` (throws on a bad shape, the way `bank` does, so sync starts it fresh), and
  `hashBallRest(s)` (fold `FNV_SEED`, then 0 or 1 for null, x, y, z, at; `src/sim/hash.ts`).
- `src/world/rules/ball.ts`: `name = 'ball'`. Op `ball.rest` with fields `{ x, y, z }` (plus `i: 0, j: 0` like
  `bank.wake`): validate is `canRest`, apply is `rest`. It registers state `ball` and no tick. It exports `edits`
  (`'ball.rest'`: `bad(r, 'ball.rest')` on `JUNK`, otherwise `{ op: 'ball.rest', i: 0, j: 0, x: r.int(-3000, 3000),
  y: r.int(0, 800), z: r.int(-3000, 3000) }`) and `invariants` (null, or `p` is three in-range integers). Type
  `BallApi = ReturnType<typeof install>` returns `{ ball, rest: () => ball.p }`.
- One appended line in `src/world/rules/index.ts`: `RULES = [..., bank, ball]` (plus its import). Add
  `ball: import('./ball.ts').BallApi` to `Rules` in `types.ts`.
- Adapter `src/features/ball-rest.ts` (it imports `rules` from `../world/game-world.ts` first):
  - **Save:** an `onFrame` (default phase and order) runs only while `ball.mine && !ball.held`. Once
    `ball.disp.v.length() < 0.3` has held for 1.5 s, the ball is more than 0.5 m from `rules.ball.rest()` (or that is
    null), and 3 s have passed since this tab last submitted, it calls
    `submitEdit({ op: 'ball.rest', i: 0, j: 0, x, y, z })` with `Math.round(m * 100)` of `ball.disp.p`.
  - **Restore:** in `onSnapshot`, the first time only, if `rules.ball.rest()` is not null, it calls
    `placeBall(x / 100, y / 100 + 0.05, z / 100)`.
- `src/physics/ball.ts` gains `placeBall(x, y, z)`. It returns false without doing anything if `ball.owner?.remote`
  (a live ball elsewhere wins) or `ball.held`. Otherwise it sets `disp.p`, zeroes `disp.v`, calls `teleport`, zeroes
  the body's linear and angular velocity, copies the mesh position, calls `sendPresence()` if `ball.mine`, and
  returns true.
- No `env`. Mixed builds: the change is additive. An old host ignores the unknown op, and an old client ignores the
  unknown state key (the hash checks cover shared states only, #129).

### Controls

- **Step 2 (hotbar).** No new action or pad slot. `describeControl('hotbar')` keys become `['Digit1-5']`. The `onKey`
  loop binds Digit1 to Digit5 because it runs over `SLOTS`. Pad LB and RB (`slot-prev`, `slot-next`) cycle through 5
  because `cycle()` uses `SLOTS`. Touch is still "tap a slot". The guide row and the pause view regenerate.
  `boogler-answer` keeps `Digit1-8`: those keys pick dialogue answers, not slots.
- **Step 3a (logs).** No new key: "Take logs" is an interactable on the existing interact button (E, pad B, the touch
  main button).
- **Step 3 (interact label).** The `interact` label in `src/player/input.ts` drops "shake a palm" and becomes "Talk,
  pick up, take". "Take" covers logs. The guide, first-run card and `controls.md` follow.

### Throw module (step 5)

- `src/player/throw-curve.ts` (pure, no three.js, unit-tested):
  `PROFILES = { ball, item, frisbee }`, each
  `{ power0, powerK, aimUp, lift, inherit, flight: 'ball' | 'plain' | 'glide' }`.
  Values are today's: ball and item `8, 20, 0.12, 1.5, 0.5`; frisbee `9, 15, 0.03, 0.5, 0.5`, `'glide'`.
  `CHARGE_MS = 900`, `AIM_DIST = 30`, `chargeOf(heldMs)` (clamped 0..1), `power(profile, c)`,
  `profileFor(id)` ('ball' gives ball, 'frisbee' gives frisbee, anything else gives item), and
  `launchVelocity(profile, c, dir, bodyV)`. That last one adds `aimUp` to `dir.y`, renormalizes (`Math.sqrt`), scales
  by `power`, and adds `bodyV.x * inherit`, `lift` and `bodyV.z * inherit`. It works on plain `{ x, y, z }`, so the
  numbers match `throwVelocity` in `src/player/player.ts` exactly.
- `src/player/throw.ts` (three.js side): `startCharge()`, `cancelCharge()`, `chargeAmount()`, `aimPoint(out)`,
  `launch(id, c)` (returns `{ p, v, profile }`), and the one aim preview, moved from `player.js` with the same
  `onFrame(updatePreview, { phase: 'late', order: -200 })`. The charge state stays in `me.charging` and
  `me.chargeStart`, because `prompt.js`, `bump.js`, `impact.js`, `input.js` and `hotbar.js` read or reset it. Only
  `throw.ts` starts a charge.
- The preview steps each kind with its own flight: `'plain'` and `'glide'` with `stepFlight` as today, and `'ball'`
  with a new `stepBall(p, v, dt)` in `src/physics/flight.ts` (gravity plus Rapier's linear damping,
  `v *= 1 / (1 + dt * BALL_DAMPING)`). Today the ball's preview uses item drag, so it promises a longer arc than the
  ball flies. `BALL_DAMPING = 0.12` moves to `src/constants.ts`, and `ball.js` uses it for `linearDamping`.
- Items keep the scripted `flyPath` and the lockstep `gift.toss` landing. The ball keeps physics. The frisbee keeps
  its `GLIDE` table in `flight.js` and its profile.
- `src/player/hud.ts` computes the charge meter with `chargeOf(performance.now() - me.chargeStart)` from
  `throw-curve.ts`. It must not import `throw.ts`: `player.js` imports `hud.js`, and `throw.ts` imports `player.js`,
  so that would be an import cycle.

## Steps

Each step is one commit, shippable alone with `npm run check` green. Steps touching `src/world/`, `src/sim/`,
`src/netplay/` or `server/` also run `npm run check:full` and carry the owner gate (ship them as the owner, or expect
`needs-owner`).

**Order and parallelism.**

- **Step 1** touches only `AGENTS.md` (and this plan): independent of everything.
- **Step 2** shares no code file with any other step. It meets step 3 only in `PLAN.md` and
  `docs/game-design/multiplayer.md`, on lines far apart, which git merges cleanly, so it can run in parallel with
  lane B. It does share an adjacent row of the multiplayer persistence table with step 4 (hotbar row, friendship
  row): ship 2 before 4, or keep both sides on rebase.
- **Lane B: 3a, then 3, then 5, then 6, then 7, then 8.** Each shares code or docs with the one before it:
  `src/adapters/gifts.ts`, `log-sources.ts` and `haul.md`; `ball.md` and `constants.js`; `ball.js`, the rules index and
  the fixtures; `game-design.md`.
- **Step 4 runs after step 3** (both touch Boogler tests and `boogler.md`). It shares no file with 5 or 6, so it can
  run in parallel with them.

---

- [x] **1. Write the dev-phase policy into AGENTS.md.** File: `AGENTS.md`, section "Mixed builds". Append one paragraph
  of three or four lines, roughly:
  > **Dev phase (until public playtests):** progress may be lost, so prefer a clean break over compatibility code. To
  > remove or reshape ops, states or catalog entries, bump `WORLD_NS` in `src/world/namespace.ts` in the same commit
  > and add a dated line to its history comment. Old tabs then live in a different room and never meet the new world,
  > and `npm run registry` skips its mixed-build comparison; this is the only way past that check. Skip one-off
  > localStorage migrations (a new key, or ignoring the old one, is fine). Still binding: `RULES` is append-only within
  > a namespace, a shape change without a bump needs `version` + `migrate`, and nothing may crash on another build's
  > messages, presence or saves.

  Also add `docs/plans/refocus-cleanup.md`. Verify: `npm run check`. CLAUDE.md imports AGENTS.md, so it needs no
  edit.

- [x] **2. Hotbar: 5 slots.** Serves 1 and "Small and readable". Files:
  - `src/player/inventory.ts`: `SLOTS = 5`. In `load()`, keep the first five filled known items:
    `saved.filter((s) => s && known(s.id)).slice(0, SLOTS).forEach((s, k) => ...)`. This compacts 8-slot saves for
    free. Delete the `boogle.pocket` branch, its `localStorage.getItem('boogle.pocket')` and the
    `removeItem('boogle.pocket')` in `save()`. If `saved` is not an array, start empty and do not save.
  - `src/features/hotbar.js`: the header says five slots and keys 1-5. `describeControl('hotbar')` keys become
    `['Digit1-5']`. Delete `GRIP.driftwood` (a retired item). Reword the `onRemotePresence` comment to "An unknown or
    uncarryable index shows as empty hands" (no shovel or seashell).
  - `src/features/hotbar.css`: change the comments "Eight slots" to five, and divide by `5` instead of `8` in both
    `--slot: clamp(...)` lines.
  - `dev/scenarios/hotbar.mjs`: change the check message "not eight" to "not five" (nightly only).
  - New `test/inventory.test.ts`: set `globalThis.localStorage` to a Map-backed stub before
    `await import('../src/player/inventory.ts')`. Seed `boogle.hotbar` with an 8-entry array holding nulls, an unknown
    id, `'ball'`, `{ id: 'seeds', n: 99 }` and enough known items (`can`, `frisbee`, more `seeds` entries) to overflow
    five. Use only ids that survive step 3 (`seeds`, `can`, `frisbee`) so this test needs no edit later. Assert there
    are 5 slots, they hold the first five filled known items in order, seeds are clamped to 20, `cycle(1)` wraps from
    4 to 0, and `select(5)` does nothing.
  - Docs: `docs/game-design/hotbar.md` (five slots; keys 1-5; drop the pocket sentence; Known issues becomes "One
    `boogle.hotbar` key for every room: you are global, the world is per room", with no comparison to friendship),
    the hotbar row in `docs/game-design/controls.md` (`1-5`), the hotbar row in `docs/game-design/multiplayer.md`
    (drop "old `boogle.pocket` migrated once"), and PLAN.md's Hotbar item ("one of five slots (keys 1-5)").
  - Verify: `npm run check`. Optionally `npm run scenario -- hotbar` and a `/look` still of the hotbar on desktop and
    on phone portrait. Read the stills, and put them in the commit body with `scripts/pr-shot.sh`.

- [x] **3a. Logs come from the log bundles, not a palm Shake.** Serves 1 (toys before chores: logs lie there to take,
  instead of hiding behind a fruit gesture). No wire, rules or saved-shape change, so no bump. Lane B first.
  - `src/features/log-sources.ts`: add `logTargets()` and `registerInteractable(logTargets)` (import from
    `../player/hands.js`), as in Design, "Log supply without the Shake". `run` is
    `submitEdit({ op: 'src.take', i: p.i, j: p.j, id })` (`submitEdit` from `../world/sync.ts`), with the pending
    guard. Rewrite the header: logs are taken from the bundle at a palm's foot, not by shaking.
  - `src/adapters/gifts.ts` `giftTargets`: the palm target offers fruit only. Delete the `logs` variable, the
    `src.take` submit and the "one shake, two drops" comment. The `rules` import goes if nothing else in the file
    uses it. The palm still says Shake while it has ripe fruit, until step 3.
  - Comments only: `src/sim/sources.ts` header ("the home palm cells (`layout.trees`), where the wood age's log
    bundles lie; taken from the bundle"); the `src/world/rules/sources.ts` header; `dev/scenarios/haul-loop.ts`
    header and line 33 ("takes logs from 15 bundles"); `dev/video/shots/haul.mjs` lines 66-67 (it takes a bundle
    with E).
  - Docs: in `docs/game-design/haul.md`, the "Sources" section becomes "a log bundle lies at each home palm's foot;
    E on a bundle with charges says Take logs and puts 4 on your stack; the ball never gives logs". Keep the 2 charges,
    the refills and the trickle text, and drop all mention of shaking and fruit. In `docs/game-design/gifts.md`,
    Controls drops "The same shake also takes the palm's logs".
  - Verify:
    - `npm run check` (sources, sites and replay tests unchanged);
    - optionally `npm run scenario -- haul-loop`, which must still pass, since it submits `src.take` directly;
    - a `/look` still of the "Take logs" prompt over a bundle for the commit body.

- [x] **3. Clean break: remove fruit and the palm Shake, shore leftovers and retired catalog stubs; `WORLD_NS` becomes
  `v02`.** Serves "Small and readable" and 1. This is the only step that changes the wire. Do it as one commit and run
  `npm run check:full`.
  - **Namespace.** `src/world/namespace.ts`: set `WORLD_NS = 'v02'` and add a history line to the header ("v02
    (2026-11): refocus cleanup: no fruit, no shore leftovers, catalog renumbered"). Fix the "hence 'v01'" wording.
  - **Catalog.** In `src/sim/gift-catalog.ts`, delete the five fruit entries (coconut, mango, banana, pomegranate,
    apricot, with their lines: see "Removed Boogler copy" below), the 17 `src: 'sea'` stubs and the `shovel`. Drop
    the `retired` concept: `carryable = (g) => !!g && g.src !== 'ball'`. The new order is seeds 0, can 1,
    frisbee 2, ball 3. Rewrite the header: there are no `'tree'` or `'sea'` sources, and "the index is on the wire
    (`gifts` items, `gift.toss`, presence `hd`): reorder only with a `WORLD_NS` bump."
  - **Item models.** In `src/player/item-models.ts`, delete the five fruit model builders (lines 28-45) and fix the
    header ("palm fruit", "retired").
  - **Gifts sim.** `src/sim/gifts.ts`:
    - Delete `MAX_TREES`, `REGROW_TICKS`, `NEVER`, `FRUIT_CYCLE`, `DROP_OFFSETS`, `treeFruit`, `isRipe`, `canDrop`,
      `dropFruit`, `LEGACY_FIELDS`, `ripeAt`, `washed` and `nextWash`.
    - Set `SRC = { TOSS: 0, PERCH: 1 }` and `LIFE = 6000` (a thrown thing lasts 10 min).
    - `Gifts` becomes `{ perches, perchAt, items, nextId }`. The gifts `Layout` type and `createGifts(layout)` use
      only `perches`. The world's `Land` type in `src/world/rules/types.ts` keeps `trees` for `sources`.
    - The saved shape is `GiftsJSON = { pa: number[], it: number[], n: number }` (7 fields per item as today, no
      `v`). `loadGifts` reads only that and ignores everything else, and `hashGifts` folds `[...pa, ...it, n]`.
    - Rewrite the header (ops `gift.take` and `gift.toss`).
  - **Gifts rules.** `src/world/rules/gifts.ts`: delete the `fruit.drop` op, `DropFields`, its generator and the
    `NEVER` invariant, and fix the header ("palms" goes). Tosses with `k` from `THROWABLE` now cover seeds, can and
    frisbee.
  - **Gifts adapter.** `src/adapters/gifts.ts`:
    - Delete the `fruit.drop` branch of `onApplied`, and `fx.falling` and `fx.wobble` (the fall in `makeVisual`
      becomes `y: null`).
    - Delete `HANG`, `fruitMeshes`, `buildTreeFruit`, `updateTreeFruit`, the matrix temps, `knockFruit`,
      `treeOfBody`, `knockedAt`, `KNOCK_SPEED`, `dropEdit` and `SHAKE_R`.
    - Delete the **whole palm part of `giftTargets`** (no Shake at all; only item pick-ups remain).
    - Delete the `ball`, `onPostStep`, `forEachContact`, `createPool`, `world`, `trees`, `canDrop`, `treeFruit`,
      `REGROW_TICKS` and `DROP_OFFSETS` imports (keep any still used).
    - `createGifts3d` keeps only the perch fill. It sets a `built = true` flag that replaces
      `if (!fruitMeshes.size) return;` in `updateGifts`.
    - Drop the "retired find" skip (`carryable` now only rules out the ball).
  - **Palm cells move to their only reader.** `src/features/log-sources.ts` gets an `onStart` that fills
    `land.layout.trees` from `trees` (`src/render/props.ts`) exactly as `createGifts3d` did: `trees.slice(0, 64)`,
    `i = Math.round((t.x + HALF) / CELL)`, `j = Math.round((HALF - t.z) / CELL)`. Import `land` from
    `../world/game-world.ts`, which that file already imports first. Also set
    `if (window.boogle) window.boogle.land = land; // debug handle`. In `dev/scenarios/world-inputs.mjs`, `READ` takes
    the layout from `land.layout` (already imported there) instead of `window.boogle.gifts`, and the ready wait
    becomes `window.boogle?.land?.layout?.trees?.length > 0`. The pinned trees must not change: the scenario fails if
    they do.
  - **Palms.** `src/render/props.ts`: **do not remove `t.hang` or any `rng()` call.** The three draws feed the seeded
    layout, and removing them would move later props and change `layout.trees`. Change the comment "Fruit palms" to
    "Home palms (their cells are the wood age's log spots, src/features/log-sources.ts)".
  - **Interact label.** `src/player/input.ts` line 223: the `interact` label becomes `'Talk, pick up, take'`.
  - **Removed Boogler copy.** These lines go from `src/boogler/lines.ts` and the catalog. Every node keeps at least
    two answers and no answer points at a deleted node (checked by `test/boogler-talk.test.mjs` "every message offers
    at least two answers and every link resolves").
    1. Catalog `coconut`: "A coconut. I have eaten four hundred coconuts on this island. This one is four hundred
       and one."
    2. Catalog `mango`: "Ooh, a mango! Sticky, sweet, and nobody else has one. That is called a monopoly."
    3. Catalog `banana`: "A banana! It comes with its own handle. Very good product design."
    4. Catalog `pomegranate`: "Anor! A pomegranate! In Samarqand every courtyard has one. You split it and it is full
       of little rubies."
    5. Catalog `apricot`: "O'rik! An apricot! Oyijon dried these on the roof every summer. The whole street smelled
       like honey."
    6. Chapter `biz2`, node `b`: delete the answer `{ say: 'I like fruit.', to: 'c' }`. Node `b` keeps "I like the
       beach ball." and "I like hanging out with you."
    7. Chapter `biz2`: delete node `c` entirely. It says "Fruit! The palms here grow all kinds of fruit, for free.
       Again with the free! This island has no idea how money works." and its answers are "You could sell fruit
       smoothies." (`set: { idea: 'fruit smoothies' }`) and "Free fruit is a good thing."
    8. Small talk `ball`: delete node `b` ("Here is a tip. Throw it at the palm trees instead. Fruit falls out! Free
       fruit. Again with the free.", answers "Good tip!" and "I'll aim better."). Repair node `a` by removing
       `to: 'b'` from both answers, so "Sorry, that might have been me." and "It's a very good ball." (still `pts: 1`)
       end the small talk.
    9. Small talk `fruit`: delete the whole topic. Node `a`: "Why does every tree here grow something different?
       Mangoes, bananas, pomegranates. On palm trees! Nothing on this island makes sense." (answers "It's a magic
       island." and "Does it matter?"). Node `b`: "If it is magic, it should grow apricots on every tree. And rice.
       And a qozon. Magic should be more practical." (answers "I'll file a complaint." and "Shake a few trees. You
       might get lucky."). Level 0 keeps the `ball` and `mushrooms` topics. A stale `'fruit'` in a saved
       `flags.recent` is harmless.
    10. Chapter `home4`, node `d`: delete the answer `{ say: 'Some trees here grow apricots, you know.', pts: 2 }`.
        Node `d` keeps "It'll be there when you get back." and "You'll go back someday."

    **Kept on purpose** (his lore, not a claim about what the island does): the coconut-diet lines (coconut osh,
    "Here I eat coconuts", coconut-shell letters, "Coconuts count", the coconut water stand), the "Osh and Coconut
    Emporium" in `biz3`, the apricot tree in his courtyard at home, the bazaar's dried fruit, the suzani pomegranates
    and the Mario melon talk. The `{idea}` default `'fruit smoothies'` in `talk.js` stays: no line reads `{idea}`
    today.
  - **Land data.** `src/world/home-land.json`: change the perch `"kind": 25` to `2` (the frisbee). The trees stay.
    Verify with `npm run scenario -- world-inputs` (CI-blocking).
  - **Fixtures.** `test/fixtures/world-inputs.json`: remove `"fruit.drop"` from `ops`.
  - **Old saves.** `src/netplay/net.ts`: generalize `dropOldSave(room)` to remove every localStorage key that starts
    with `boogle.world.` and does not start with `` `boogle.world.${WORLD_NS}-` `` (iterate `localStorage.key(k)`
    backwards, in try/catch). Call it where it is called now, and update its comment.
  - **Leftovers.**
    - Delete `HOME` from `src/world/grid.ts` (nothing imports it), and drop "HOME" from the comment in
      `src/constants.ts`.
    - In `src/sim/mushrooms.ts`, the `loadGarden` comment becomes "anything else loads as an empty garden" (no
      129-cell mention, comment only).
    - In `src/debug/netdebug.js`, the subsystem list in the header no longer names water or terrain.
    - `src/features/gifts.js`: the header has no fruit, and the `registerInteractable` comment says "Pick up".
    - `src/features/prompt.js` header example: "over the can" instead of "over a mango".
  - **Indices and fruit ids in tests and scenarios.** `grep -rnE "mango|coconut|banana|pomegranate|apricot" test dev`
    and `grep -rnE "k: ?[0-9]+|kind: ?[0-9]+|toss\([0-9]" src test dev`, then fix every hit:
    - `dev/scenarios/lib/world.mjs`: `toss(k = 1, ...)`, the can (index 0 is now seeds, which plant instead of
      landing). `dev/scenarios/smoke.mjs` `toss(0, ...)` becomes `toss(1, ...)`. `smoke` runs in `npm run ship` on a
      Mac and live after every deploy, so this one matters.
    - `dev/scenarios/hotbar.mjs`, `dev/scenarios/interact.mjs`, `dev/scenarios/pause.mjs` and
      `dev/scenarios/first-run.mjs`: `toss(1, 5)` now means the can, so fix its comments. Replace `I.take('mango')`,
      `pick('a mango')` and `held === 'mango'` with `'frisbee'` (`'a frisbee'`).
    - In `interact.mjs`, the "a watering can behind you does not hide the ripe palm you face" check re-aims at a log
      bundle: find a target whose id starts with `logs` instead of `palm`, and expect "Take logs" instead of "Shake".
      Its search over `trees` and `giftTargets()` becomes a search over the interact targets, through
      `interactTarget()` or the log targets. If that turns fiddly, re-aim it at the stall.
    - `test/world-snapshots.test.mjs`: `k: 3` becomes `k: 1`.
    - `test/world-rules.test.mjs` `SCRIPTS.gifts`: toss the can (`giftIndex('can')`), then `gift.take` the item with
      `src === SRC.TOSS`, then the seed toss. Also delete the `fruit.drop` line. `SCRIPTS.sources` is unchanged.
    - `test/boogler-friendship.test.mjs` "gifts score by taste": use seeds (like), can (meh) and frisbee (like).
      Assert like, then `Math.round(TASTE_PTS.like / 2)` on a repeat, then meh, then the cap. The round-trip test
      gives seeds instead of a banana.
    - `test/boogler-talk.test.mjs`: the key-item loop becomes `['ball']`, and any fruit `giftIndex` becomes
      `'seeds'`.
  - **Gift tests.** `test/gifts.test.mjs`: delete the fruit, regrow, drop-direction, shore and legacy-v1 tests, and
    keep take, toss, perch and cap. Add a serialize/load/hash round-trip of the new shape. Replace the "retired catalog
    entries" test with "only the ball is not carryable".
  - **Snapshot fixture.** In `test/world-snapshots.test.mjs`, read `fixtures/snap-v02.json` and update the header and
    test names. Delete `test/fixtures/snap-v01.json`. Write `snap-v02.json` with a throwaway script, not committed:
    on `createSync({ env: { canPlantAt: () => true } })` + `installRules(s, homeLand())`, submit `who.set` (Ana, c 2),
    `mush.plant` 228,200, a `gift.toss` of k 1 at 230,205 and an `src.take` of id 0, call `updateWorld(0.1)` 15
    times, then write `{ about, snap: s.snapshot(), hashes: s.stateHashes() }` pretty-printed. The `about` text says
    it is the v02 save captured at the refocus clean break.
  - **Dev tooling.** Delete `dev/video/shots/gifts.mjs` (it films fruit shaken off a palm).
  - **Docs (same commit):**
    - `docs/game-design/gifts.md`: rewrite as thrown things and the frisbee perch; ops `gift.take` and `gift.toss`;
      tuning 6,000-tick life, perch refill, 48-item cap; no fruit, Shake, shore or 129-cell note.
    - `docs/game-design/items.md`: a 4-row table (seeds, can, frisbee, ball) with the new indices.
    - `docs/game-design/haul.md`: drop "The ball still knocks fruit loose", and point the Sources code at
      `log-sources.ts`, with no Shake in `gifts.js`.
    - `docs/game-design/ball.md`: drop "knocks ripe fruit off palms".
    - `docs/game-design/island.md`: drop the HOME-square row, and change lines 24-25 to "up to 36 palms, each with a
      log bundle at its foot (6.19)".
    - `docs/game-design/glossary.md`: drop the `HOME` and `Proto flag` rows.
    - `docs/game-design/controls.md`: the interact row drops "shake a palm".
    - `docs/game-design/multiplayer.md`:
      - line 6 and line 87 say `v02-<room>`;
      - the line-54 row becomes "Thrown things, frisbee | ops `gift.take`, `gift.toss`";
      - the line-51 sources row says log bundles;
      - line 121 has no "fruit regrowth".
    - `docs/game-design/boogler.md`: the present row's note becomes "no live item is loved or disliked".
    - `docs/game-design/boogler-lore.md`: the small-talk list drops `fruit`, and the `idea` flag is set only to
      "ball insurance" (`biz2`).
    - `docs/game-design.md`:
      - Overview: "throw things at each other" instead of "pick up fruit and throw it".
      - Pillar row 2: no fruit.
      - Delete the index lines 6.2 and 6.3, and delete `docs/game-design/digging.md` and
        `docs/game-design/water-sim.md`.
    - `src/world/README.md`: the `home-land.json` line says "palm cells (log spots) and perch cells".
    - `src/world/rules/README.md`:
      - the modules table loses `fruit.drop`, and the `sources` row says log bundles;
      - the catalog note says "reorder only with a `WORLD_NS` bump";
      - the fixture name is `snap-v02.json`.
    - PLAN.md, intro paragraph line 5: "the ball, things you pick up and throw" (no fruit).
  - **Verify:**
    - `npm run check:full` and `npm run scenario -- world-inputs`;
    - optionally `npm run scenario -- interact`, `hotbar`, `haul-loop` and `smoke` (`check:gpu`);
    - a `/look` still of the home palms (no fruit, bundles still there) for the commit body;
    - `npm run registry` prints the "world namespace v01 -> v02: a clean break" note.

- [x] **4. Boogler: one global friendship; presents optional.** Serves 1 ("toys before chores"), 6 and 3 (nothing is
  gated on gifts). After step 3 (they share Boogler tests and `boogler.md`). It never touches `hud.js` or
  `dialogue.js`, and its only copy change is the pace sentence in the docs.
  - `src/boogler/play.ts`: `storeKey` is the constant `'boogle.boogler'`. Drop `getRoomId` from the import if nothing
    else uses it. The header says "saved in localStorage once per browser, shared by every room". **No migration**:
    everyone restarts at Stranger, and the old `boogle.boogler.<room>` keys are ignored.
  - `src/boogler/friendship.ts`: `RULES.petPts` 3 to **4**, `RULES.chapterPts` 6 to **8**. The gift window stores
    catalog ids, not indices: `giveGift` pushes `{ id: g.id, at }` and counts repeats by `id`, and `loadFriend` keeps
    entries with `typeof g.id === 'string' && GIFTS.some((x) => x.id === g.id)`. A future renumber then can't misread
    a saved window. `giveGift(f, kind, now)` keeps its signature.
  - New `test/boogler-pace.test.ts`, the model behind those numbers. A visit is 15 min: `pet()` every 2.5 min (6 per
    visit), and `openTalk` at 0, 5 and 10 min. Each talk picks the first thread (home, mom, biz) whose next chapter
    is unlocked, found by matching `THREADS[id].ask` in `talkView(t).opts`, or small talk (option 0) if none is. It
    then answers option 0 until `talkView(t)` is null. Visits are 24 h apart. Use `rng: mulberry32(7)`,
    `gifts: () => []`. Assert that with no presents Best friend comes at visit 4 or 5, and that giving seeds and the
    frisbee (`giveGift` at 3 and 8 min) takes no more visits than none.
    - Measured with the real talk engine while writing this plan, before step 3's line trims (which remove at most a
      point of small talk per visit):
      - today (3 and 6, a mango and a coconut): 5 visits;
      - today with no presents: 7 or 8;
      - 4 and 8 with no presents: 5 (also when always answering with the last option);
      - 4 and 8 with presents: 4.
    - If the test lands at 6 after step 3, raise `chapterPts` to 9 rather than changing the model.
  - `test/boogler-friendship.test.mjs`: the round-trip test still passes (ids now). Add a check that a stored
    `{ kind: 3, at }` entry from the old format is dropped on load.
  - Docs:
    - `docs/game-design/boogler.md`:
      - the sync kind is localStorage `boogle.boogler`, global;
      - the points table shows a pet as +4 and a chapter as +8;
      - the pace sentence becomes "a 15-minute visit (a pet every 2.5 min, a talk every 5) reaches Best friend in
        about five visits with no presents; presents (a seed, the frisbee) shave off about one";
      - Known issues: "per browser, shared by every room".
    - The friendship row in `docs/game-design/multiplayer.md`.
    - `docs/game-design/mismatches.md`: delete the "hotbar is global while friendship is per room" bullet, now
      resolved.
    - PLAN.md's Friendship item: "Pet him and talk to him (presents help but are never needed) ... kept in
      localStorage per browser".
  - Verify: `npm run check`.

- [x] **5. One throw module for the ball and every item.** Serves 10 (slapstick: every throw feels the same) and
  "Small and readable". Lane B, after step 3.
  - New `src/player/throw-curve.ts` and `src/player/throw.ts` (Design, "Throw module").
  - New `test/throw-curve.test.ts`:
    - `chargeOf(0) === 0`, `chargeOf(450) === 0.5`, `chargeOf(5000) === 1`;
    - `profileFor('frisbee').flight === 'glide'`, `profileFor('can').flight === 'plain'`,
      `profileFor('ball').flight === 'ball'`;
    - `launchVelocity` matches the old formula, copied into the test, for c in {0, 0.5, 1}, for the ball and the
      frisbee, with a body velocity of `{ x: 2, y: 0, z: -1 }`, to 1e-9.
  - `src/player/player.ts`: delete `aimDirection`, `chargeAmount`, `throwVelocity`, the preview block, its `onFrame`
    and the now-unused imports (`stepFlight`, sprites, `heldId` if unused). Keep `handPosition`, `throwFrom`,
    `carryPosition` and `camForward`.
  - `src/player/hands.ts`: `windUp()` becomes `canThrow() && startCharge()`. `releaseThrow()` calls `cancelCharge()`
    and then `throwHeld(chargeAmount())`. `throwHeld(c)` calls `const { p, v } = launch(id, c)`, then
    `throwBall(p, v)` for the ball, or `useOne()` and `throwItem(kind, p, v)` for items (with `take(id)` on failure,
    as now). Update the header (no "fruit") and the imports.
  - `src/physics/ball.ts`: `throwBall(p, v)` uses the given launch (same spin rule) and no longer imports
    `throwVelocity`. `releaseBall` and `respawnBall` call `cancelCharge()` from `../player/throw.ts`. `linearDamping`
    is `BALL_DAMPING`. `throw.ts` must never import `ball.js`.
  - `src/features/debug-handle.js`: `tossBall(charge)` becomes `grabBall(); const { p, v } = launch('ball', charge);
    throwBall(p, v);`, importing `launch` from `../player/throw.ts`. The nightly and live `smoke` use it, so check it.
  - `src/physics/flight.ts`: add `stepBall(p, v, dt = STEP)` (and list it in the header).
  - `src/constants.ts`: `export const BALL_DAMPING = 0.12`.
  - `src/player/hud.ts`: the charge meter uses `chargeOf` from `throw-curve.ts` (Design explains why not `throw.ts`).
  - `src/loop.ts`: the order comment "late -200 player.js: throw preview" names `throw.ts`.
  - Docs: `docs/game-design/throwing.md` (one module; files; the ball's preview now follows the ball's damping) and
    the Tuning line of `docs/game-design/ball.md` ("Throw: see 6.7").
  - Verify:
    - `npm run check`;
    - `npm run scenario -- hotbar`, whose frisbee landing check must still pass (numbers unchanged);
    - `smoke` through `check:gpu` on a Mac (`tossBall`);
    - a `/look` motion of a full-charge ball throw with the preview visible: the ball should land at the end of the
      dots. If it doesn't, check Rapier's damping formula in `src/physics/backend-rapier.ts` before tuning anything.

- [x] **6. Save the ball's resting spot per room (Lockstep `ball`).** Serves 9 (leave something for the next
  visitor) and "you global, world per room". Lane B, after step 5.
  - New: `src/sim/ball-rest.ts`, `test/ball-rest.test.ts`, `src/world/rules/ball.ts`, `src/features/ball-rest.ts`
    (Design, "Lockstep piece").
  - Edits:
    - `src/world/rules/index.ts`: one appended import and `ball` at the end of `RULES` (hotspot: those lines only);
    - `src/world/rules/types.ts`: the `Rules` entry;
    - `src/physics/ball.ts`: `placeBall`;
    - `test/fixtures/world-inputs.json`: `"ball"` appended to `states`, `"ball.rest"` to `ops`;
    - `test/world-rules.test.mjs`: `'ball'` appended to `CANONICAL`, and
      `SCRIPTS.ball = () => [{ op: 'ball.rest', i: 0, j: 0, x: 1200, y: 150, z: 2000 }]`;
    - `test/world-size.test.ts`: a set ball spot fits the budget.
  - `test/ball-rest.test.ts` covers:
    - `canRest` rejects floats, out-of-range values and a second rest within `REST_GAP`;
    - `rest` then `serialize`/`load` round-trips to the same hash;
    - `load` throws on `{ p: 'x' }`;
    - a null spot hashes differently from `[0, 0, 0]`;
    - `MAX_XZ_CM === HALF * 100`.
  - Docs:
    - `docs/game-design/ball.md`: Known issues replaces "The ball is not persisted" with how it is saved (rest after
      1.5 s under 0.3 m/s, restored on load unless someone is already playing with it); the sync kind adds "resting
      spot: Lockstep `ball.rest`";
    - `docs/game-design/multiplayer.md`: a Lockstep table row and a persistence note;
    - the modules table in `src/world/rules/README.md`.
  - Verify:
    - `npm run check:full`, where the replay test now exercises `ball.rest`, and `npm run registry`, which accepts it
      as additive;
    - `npm run scenario -- world-inputs`;
    - by hand on `npm run dev`: throw the ball, wait 3 s, reload, and the ball is where it stopped.

- [x] **7. Docs: the ball is one toy among several; note honk variation.** Lane B, after step 6. Docs only.
  - `docs/game-design.md`:
    - Overview: name the toys side by side (the ball, the frisbee, thrown things, mushrooms, the Boogler) instead of
      "one shared beach ball" as the frame;
    - Pillar row 2, "What it means in practice today" column: "One physics toy among several: floats, bounces on
      mushrooms, is thrown like everything else". Step 8 renames the row.
  - `docs/game-design/ball.md`: the lead sentence becomes "One of the island's physics toys: ...".
  - PLAN.md:
    - the Goal line drops "while the beach ball stays the main toy";
    - add one line under "Later / stretch": "**Honk variation:** more honk voices and patterns (per player, per
      mood, chords beyond three), building on `honk.js`; no new verbs needed."
  - Verify: `npm run check` (docs only).

- [x] **8. DESIGN.md: principle 2 becomes "Physics toys first".** Lane B, after step 7. One small commit; its body
  gives the reason: "the ball is one physics toy among several; the refocus cleanup made every throw share one
  module". Files: `DESIGN.md` and the pillar table in `docs/game-design.md`. The final wording:
  - **The intro sentence** (line 3), from "one beach ball, toys to throw, and a shared garden..." to:
    > Boogle is a drop-in island for a handful of friends: toys to throw, bounce and knock over, and a shared garden
    > that keeps growing while nobody is online.
  - **Principle 2**, which replaces the whole "The ball stays the star" heading and body:
    > ### 2. Physics toys first
    > Things you can throw, bounce and knock over are at the heart of the island: the beach ball, the frisbee,
    > whatever you pick up, the mushrooms you bounce on. New systems should usually add to them or play with them
    > rather than replace them.
    > - *Test:* does this give the toys something new to do, or at least leave them alone?
  - **Principle 3**, two phrases:
    - "Someone who only wants to throw the ball around" becomes "Someone who only wants to throw things around".
    - "*Avoid:* locking movement, areas or ball features behind farming progress" becomes "*Avoid:* locking movement,
      areas or toys behind farming progress".
  - **The pillar row in `docs/game-design.md`:** "| 2 | Physics toys first | ...", keeping step 7's text in the
    second column.
  - **Left alone:** the "core loop" paragraph ("Water is the glue between the ball and the farm...") is a history
    note about the removed water sim. It is out of this step's scope; flag it in the commit body as a candidate for
    the v2 redesign.
  - **Conflict note:** the owner's uncommitted `DESIGN.md` in the main checkout adds a new section, "Code first,
    images by approval", under "Small and readable". This step edits different lines, so it doesn't clash with that
    section. However, the owner's diff is against a pre-#126 base (the old networking principle), so the owner's own
    rebase will conflict with `origin/main` regardless of this plan. Make this edit in the worktree, never in the
    main checkout.
  - Verify: `npm run check`.

## Risks

- **AGENTS.md "Don't".**
  - Effects in `apply`: `ball.rest` apply only sets state; the ball move happens in the adapter (`onSnapshot`,
    `placeBall`). The log fly-to-back effect stays in `log-sources.ts` `onApplied`.
  - Treat `submitEdit` as done: "Take logs" plays nothing until `onApplied`, and the rest submit is fire-and-forget.
  - Leave a presence field set: no new presence.
  - Unverified saves: step 3 changes `net.ts` (save cleanup) but not the guards in `sync.ts`, and no step touches
    `sync.ts`.
- **Hotspots.** `src/world/rules/index.ts` (step 6: one import, one array entry). `PLAN.md` (one or two lines per
  step). `src/main.ts`, `index.html` and `src/style.css` are untouched.
- **Step 3 is the big one.** It is mostly deletions, but it renumbers the catalog (now only four entries). Every
  hardcoded index and fruit id must be re-checked: the greps in step 3, the `smoke` toss default, and
  `home-land.json`, because the CI scenario `world-inputs` pins it. Moving the palm-cell fill into `log-sources.ts`
  must produce the same trees, and `world-inputs` fails if it doesn't. Do not remove `props.js` rng draws. Edit the
  Boogler lines exactly as listed; the talk test catches dangling answers.
- **The haul keeps working.** Step 3a changes only the client gesture, and `src.take`, the `sources` state, the
  refills and the trickle are untouched. The haul tests stay unchanged: `test/sources.test.ts`, `test/sites.test.ts`
  and `dev/scenarios/haul-loop.ts`. Run `npm run scenario -- haul-loop` after 3a and after 3.
- **Wiping worlds.** The bump resets every room (owner: fine). Old tabs are isolated rather than desynced (Design,
  "The clean break"). Rooms go quiet for anyone still on an old tab until it reloads.
- **Server host in flight.** `ship/matias-franco-ab7ed27` (server snapshot store and upgrade router) and the
  server-host plan are landing now. If the server starts running the lockstep world before step 3 or 6 ships, those
  steps also need a server deploy: `deploy-server.yml` is meant to trigger on `src/world/**` and `src/sim/**`, so
  check that it does. The server's snapshot store keys by room id, so v01 snapshots stay on its disk unused (harmless;
  optional cleanup). No step edits `server/` or `src/world/sync.ts`.
- **Mixed builds.** Steps 2, 3a, 4 and 5 change nothing on the wire: `src.take` is unchanged, launches and velocities
  are identical, and `bg` and `hd` are unchanged. Step 6 is additive. Step 3 is the documented clean break.
- **Owner gate.** Steps 3 and 6 touch `src/world/`, `src/sim/` and `src/netplay/`, and 3a touches comments in
  `src/sim/` and `src/world/rules/`. Ship them as the owner, or they wait for `needs-owner` approval.
- **Performance.** Step 3 removes up to 5 instanced fruit meshes and a per-step contact scan, so it only gets cheaper
  (an `npm run perf` before and after is optional). Step 3a adds one interactable provider: 36 distance checks a
  frame. Step 6 adds no tick and no meshes. Step 5's preview keeps 48 dots.
- **Import cycles (step 5).** `player.js` imports `hud.js`. `throw.ts` imports `player.js` but never `hud.js` or
  `ball.js`, and `hud.js` uses the pure `throw-curve.ts`.

## Open questions

None: all resolved by the owner on 2026-10-31.

- Principle 2 becomes a softened "Physics toys first", with the intro and principle 3 updated in the same commit
  (step 8).
- Trim the fruit copy (step 3 lists every removed line, and the lines kept as lore).
- The palm Shake goes, and the haul stays, with logs taken from the bundles (step 3a).
- The v02 wipe, the friendship restart and the ball-rest rule stay as planned.
