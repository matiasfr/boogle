# Plan: remove sand digging, the water sim and beach wash-ups

## Goal

Clear the toybox around the ball before new gameplay: remove (1) sand digging and the shovel, (2) the lockstep water
sim, (3) junk washing up on the beach. Each one ships as its own commit and PR, in that order. The sea, swimming,
buoyancy, ball floating, splashes, critters, the cave pond, palm fruit, the frisbee, seeds, the can, mushrooms and
tossing stay.

Serves DESIGN.md "Small and readable", and play principles 1 (toys before chores) and 2 (the ball stays the star):
fewer systems competing with the ball. It bends the DESIGN.md intro and core-loop text ("sand you can shape, water that
flows"). Each step updates that text on purpose, with the reason in its commit body.

## Owner decisions (2026-10-30): these override anything below

- **Dive is removed altogether** (step 1). In `src/features/feel.js` delete `dive()`, `swimDive`, `diving`, `diveAt`,
  the dive/breach code in the physics `preStep`, the `SWIM.dive*` and `breachBoost` tunables, the `onKey('KeyQ')`,
  `describeControl('dive')` and `wrapAction('pile', ...)` blocks, the `padPile` / `setHold` underwater guards, the
  `dive` export and the header bullet. Do **not** register a `dive` action. Swimming itself (buoyancy, jump swims up)
  stays. Delete `dev/scenarios/dive.mjs` (and any CI/nightly reference to it); drop the dive shot from
  `dev/video/shots/feel.mjs` (or the file's dive part). Replace `dive` in every scenario run list with `caves` or
  nothing. Docs: game-design.md drops "Swim and dive"'s dive bullets and the dive control row; free pad slots after
  step 1 are LT, D-pad up, down and right. Nothing in the guide mentions dive.
- Open questions answered: (1) empty starting hotbar is fine; (2) moot, no dive; (3) accept only pomegranate and
  apricot as love gifts for now; (4) delete `holes` and `washups` small talk; (5) let old shore items age out;
  (6) delete the `clump` particle pool too; (7) edit the intro, core loop, and principles 1, 5 and 10 examples;
  (8) replace `two-player-dig` / `reconnect-dig` with `gift.toss` versions.

## Cross-cutting design (all three steps)

**Sync kinds.** Nothing new is added. Each step deletes Lockstep ops and state logic, but **keeps the state key**. The
order in `RULES` (`src/world/rules/index.js`: `terrain, mushrooms, gifts, proto, water`) never changes, and
`rules/index.js` is not edited in any step. A key stays as a **stub** rules module that:

- registers the same state key, at `version` 0 (the default);
- `load` accepts anything and never throws (old saves with sand deltas or water cells load cleanly, and the data is
  ignored);
- `serialize` returns a fixed document and `hash` a fixed constant;
- registers no ops, ticks or listeners, and exports no `edits` or `invariants` (the replay test fails on a generator
  for an unregistered op).

The stubs stay at `version` 0 on purpose. The terrain stub writes a document that is valid in the *old* format (see
step 1), so it is not a format change. For water, a version bump would buy nothing (see step 2).

**Authority.** Unchanged: the host stamps edits. A new-build host rejects ops it no longer registers (`stamp` in
`src/world/sync.js` returns false when `ops.get(op)` is missing). A new-build client that receives a retired op from an
old host skips the apply (`ops.get(e.op)?.apply`). Every remaining `onApplied` listener (`src/adapters/gifts.js`,
`src/adapters/mushroom-garden.js`) checks `e.op` before it reads the result, so nothing throws.

**Mixed builds (deploy window).** Tabs reload onto a new deploy through `src/features/updates.js`. It checks
`version.json` on start, every 5 minutes and when the tab comes back into view. A hidden tab reloads at once. A visible
tab shows a toast and reloads the next time it is hidden. So the window is at most about 5 minutes for hidden tabs, and
lasts until a visible tab is hidden or the player presses Reload. A hash mismatch makes a client ask for a snapshot,
reload it, and check again 2 s later. It never crashes, and a client saves only ticks whose hash matched. Each step
below says exactly which direction converges.

**GIFTS is append-only.** Ground items, the `hd` presence field and the old `boogle.pocket` all store the catalog
index. No entry is removed or reordered. Retiring an item adds a field to its entry; it never deletes the entry.

**The old-snapshot test.** `test/fixtures/snap-pre-version.json` already holds the old snapshot the owner asked for:
746 terrain deltas with 3 players' buckets, water cells over region `140,166,129,103`, and gifts with shore items
(`src` 0, ids 3 and 18) plus thrown shore kinds. Its `snap` block is **never edited**. Only its `hashes` block changes,
deliberately, in each step:

- step 1: `terrain` and `water`;
- step 2: `water`;
- step 3: `gifts`.

`test/world-snapshots.test.mjs` gets a new test in step 1, extended in each later step (spelled out below).

**Commands for every step.**

- `npm run check:full`: the steps touch `src/world/rules/` and `game-world.js`.
- `npm run perf` before and after (step 1 removes the settle and ring meshes, step 2 removes the water surface mesh
  and the water tick).
- The scenarios listed in each step.

Commit subject per step, imperative. The body names the principles above, and the PR body says what changed for
mixed builds.

---

## Step 1: remove sand digging and the shovel

### Design

- **Terrain stub** (`src/world/rules/terrain.js`, rewritten whole, about 20 lines):
  ```js
  // Retired 2026-10-30: sand digging is removed (docs/plans/cleanup-dig-water-junk.md). The `terrain` key keeps its
  // slot in RULES so state order and hashes line up across builds. It loads any save and ignores the sand deltas and
  // buckets older builds wrote. It always serializes the bare island in the old format, so an older build that loads
  // it gets no sand moved.
  export const name = 'terrain';
  // The old createTerrainState().hash() with no deltas and no players: just the FNV offset basis, so a new host and an
  // old tab that loaded its snapshot agree.
  export const BARE_HASH = 2166136261;
  export function install(sync, land) {
    sync.registerState('terrain', {
      serialize: () => ({ d: [], players: [], n: land.n }),
      load: () => {},
      hash: () => BARE_HASH,
    });
    return {};
  }
  ```
  `2166136261` is verified. Run this against today's code, before `terrain-logic.js` is deleted:
  `node -e "import('./src/world/terrain-logic.js').then(m=>{const s=m.createTerrainState({base:new Int16Array(25),n:5});console.log(s.hash(),JSON.stringify(s.serialize()))})"`.
  It prints `2166136261 {"d":[],"players":[]}`.
- **Water reads base ground only** (`src/world/rules/water.js`):
  - `copyGround` reads `land.base[g]` instead of `terrain.base[g] + terrain.delta[g]`;
  - delete the `TERRAIN_OPS` import, `groundDirty`/`dirtyGround`, the `'water ground'` `onApplied` listener and the
    dirty block at the top of the `onTick`;
  - keep `sync.onSnapshot(() => copyGround(...))`, which is harmless; deleting it is optional;
  - `invariants(api, rules)`: replace `rules.terrain.state` with the region's own `simTerrain[c]` (the ground never
    changes now), i.e. `start += Math.max(0, water.seaLevel - simTerrain[c])`.

  Water behaviour on a fresh room is identical. Loading an old save now sea-fills around formerly dug cells from
  `base` alone, so `hashes.water` in `snap-pre-version.json` changes.
- **Mixed builds, step 1.**
  - *New host, old clients:* an old client's next hash check fails. It loads the new host's snapshot, which holds
    pristine sand in the old format. Its own `lastLoaded()` redraws mesh, physics and texture, and its water copies
    `base + 0`. From then on every state matches. Its dig, pile and flatten edits are rejected by the host, so its
    shovel silently does nothing until it reloads.
  - *Old host, new clients:* the host keeps applying old clients' digs. New clients skip those edits and keep bare
    sand, so `terrain` (and `water` near holes) mismatch every 2 s and they resync each time. This ends when the old
    host's tab reloads; a new host then loads the newest save, which drops its deltas.
  - Nothing crashes either way. The reload mechanism covers the window; no extra code is needed.
- **The shovel in the catalog.** Keep `GIFTS[24]` (`id: 'shovel'`) and add `retired: true`. Readers:
  - `src/player/inventory.js` `known(id)` also requires `!g.retired`, so a saved hotbar with a shovel loads with that
    slot empty;
  - `src/features/hotbar.js` `onRemotePresence` maps `hd` to `null` when `GIFTS[pr.hd].retired`, so an old-build
    player holding a shovel shows empty hands, not a coconut (`itemModel` falls back to a coconut);
  - `src/world/rules/gifts.js` `gift.toss` validate rejects `GIFTS[e.k].retired`. This is a host-only check; apply
    is unchanged. Its replay generator `THROWABLE` also leaves out `g.retired`, or the replay test feeds it
    rejected edits.

  Keep its `taste`, `line` and `key` fields: The Boogler still refuses it if one ever shows up.
- **Dive control.** Dive was the `pile` action wrapped by feel.js, plus `onKey('KeyQ')`. Pad slots today:
  - taken: a, b, x, y, lb, rb, lt (pile), rt, up (flatten), view, menu, l3, r3, left;
  - free: down, right.

  This step frees lt and up. Dive becomes its own action on LT, in feel.js's existing `onStart`, replacing `onKey`,
  `describeControl('dive')` and `wrapAction('pile', ...)`:
  ```js
  registerAction('dive', {
    pad: 'lt', key: 'KeyQ', label: 'Dive', detail: 'While swimming', group: 'move', order: 3,
    down: () => swimDive() && dive(),
    up: () => (diving = 0),
  });
  ```
  Afterwards up, down and right are free, and `updates.js` still finds `freeSlots()[0]`. There is no touch dive
  today, and none is added (open question 2). The guide row is generated from this registration, and the pause view
  and first-run card follow it.
- **Ping.** Remove the `dig` kind from `PING_KINDS` in `src/sim/social.js`. `aimPing` returns `'look'` on ground. An
  old tab's `k: 'dig'` ping fails `validatePing` on new tabs and is dropped, which is harmless.
- **Cosmetic code removed:** the target ring, the shovel chip and reason, sand-fx spray and sounds, crater settle, and
  edit-driven sand colours. All of it is Local.

### Steps

- [x] **1.1 Pin the stub constant and add the old-snapshot test first.**
  1. Run the node one-liner above and confirm `2166136261`.
  2. In `test/world-snapshots.test.mjs` add the test `'an old snapshot with sand deltas, water cells and shore items
     loads cleanly and deterministically'`:
     - two `peer()`s each `loadSnapshot(copy(fixture.snap))`;
     - assert `loadErrors === 0` on both;
     - assert `stateHashes()` deep-equal across the two;
     - run 50 ticks on both with `for (let k = 0; k < 50; k++) s.updateWorld(0.1)`, then assert the hashes are
       equal again. One `updateWorld` call runs at most 5 ticks (`MAX_STEPS`), so loop.

     Leave the existing first test as it is.
  3. `npm run check` stays green: this step changes no behaviour.
- [x] **1.2 Replace the terrain rules with the stub.** Steps 1.2 to 1.7 are one commit: 1.2 deletes
  `terrain-logic.js` while 1.3 and 1.4 delete its importers. "Green" means at the end of the step, where 1.5 runs
  `check:full`. Rewrite `src/world/rules/terrain.js` as in the Design section.
  Edit `src/world/rules/water.js` as described.
  - Delete `src/world/terrain-logic.js`.
  - `src/world/rules/edit-gen.js`: delete `pickCell` if nothing imports it any more
    (`grep -rn pickCell src test`).
  - `eslint.config.js`:
    - remove `'src/world/terrain-logic.js'` from `LOCKSTEP_FILES`;
    - change the rules import regex to `'^(three/|\\.\\./(?!grid\\.js$|\\.\\./sim/[^/.]+\\.js$))'`;
    - update `rulesMessage` and the comment above the regex.
- [x] **1.3 Delete the game side.**
  - Delete files:
    - `src/world/terrain-edits.js`;
    - `src/features/shovel.js` and `shovel.css`;
    - `src/features/sand-fx.js`.
  - `index.html`: delete the `#shovel-chip` line (hotspot, one line).
  - `src/adapters/terrain.js`: delete `editDelta`, `visOff`, `setCellHeight`, `refreshRegion`, `startSettle`,
    `updateSettle`, `SETTLE_S`, `settle`, `easeBack`, the `DUG`/`DUG_WET`/`PILED`/`CREST` colours, and the
    `d`/`lap`/`edited` branches of `paintVertex`. `writeVertex` uses `h` with no `visOff`, and `paintVertex` drops
    its `lap` parameter. Keep `heights`, `groundHeight`, the tiles, `createTerrainMesh` and the holes. Fix the header
    comment ("terrain-edits.js adds player edits on top").
  - `src/physics/physics.js`: delete `refreshGround` (no other caller) and the comment line that points to it.
  - `src/render/water-render.js`: delete `updateHeightTexels`. `heightTex` is built once from `heights`.
- [x] **1.4 Controls and hands.**
  - `src/player/input.js`:
    - drop the `terrain-edits.js` import, and `ensureShovel` and `toggleShovelHand` from the hands import;
    - in keydown, drop `setFlatten`, `KeyF`, and the Q/Z hold;
    - in keyup, drop the Shift, `KeyQ` and `KeyZ` lines;
    - in mousedown, drop the shovel branch so that `if (e.button === 0) useDown();` remains;
    - in mouseup, drop `setHold(null)`;
    - delete `hold()` and the `pile` and `flatten` registrations, and the `shovel` and `dig` `describeControl`s;
    - in `releaseAll`, drop `setFlatten` and `setHold`;
    - fix the "Held keys" comment.
  - `src/player/controls.js`:
    - remove `['sand', 'Sand']` from `GROUPS`;
    - update the header comment (dive is no longer an example of an `onKey` key; the `wrapAction` example no longer
      names pile).
  - `src/player/hands.js`:
    - drop the `terrain-edits.js` import and `USE_VERB.shovel`;
    - `throwable = (id) => !!id`;
    - `onHotbarChange` no longer toggles the shovel;
    - `useDown` drops the shovel line, and `useUp` drops `setHold`;
    - `touchTarget = interactTarget`;
    - delete `ensureShovel`, `toggleShovelHand` and `beforeShovel`;
    - rewrite the header doc (`canThrow`, `touchTarget`).
  - `src/player/glyphs.js`: delete `alt` from `KBM` and `PAD_ACTION`, and from the header comment.
  - `src/features/feel.js`:
    - add the dive `registerAction` above;
    - remove `padPile`, the shovel import, and the two `setHold` lines in `onFrame`;
    - fix the header bullet ("swimming: Q and pad LT dive").
  - `src/features/hotbar.js`:
    - delete the `shovel` import, `GRIP.shovel`, the `dig` wobble, `ALT_VERB` and its use in `nameTag`, and the
      `no-shovel` toggle;
    - add the `retired` check in `onRemotePresence`;
    - fix the header comment.
  - `src/features/hotbar.css`: delete the `.shovel-chip` rule and the comment mention.
  - `src/player/inventory.js`: add the `known()` retired check, and stop seeding a shovel. A new player starts with
    an empty hotbar (fix the "start with just a shovel" comment).
  - `src/player/item-models.js`: delete the `shovel` builder. `src/player/item-icons.js`: delete line 24.
  - `src/sim/gift-catalog.js`:
    - add `retired: true` to the shovel entry;
    - extend the header: "retired: no longer obtainable; kept for its index. Saved hotbars drop it."
  - `src/features/ping.js` (`ping.css` has no dig-specific rule; checked): drop the `terrain` import and the `dig` test in `aimPing`, the `dig` note in `chime`, and
    the header mention.
  - `src/sim/social.js`: remove `dig` from `PING_KINDS`. In `test/social.test.mjs`, change line 11's `k: 'dig'` to
    `k: 'look'`, and add `assert.equal(validatePing({ t: 'ping', x: 0, y: 0, z: 0, k: 'dig' }), null)`.
  - `src/features/debug-handle.js`: drop the `terrain` import, the field and the header mention.
  - `src/features/mushroom-garden.js`: fix the comment "(-10) and shovel (0)".
  - `src/render/particles.js`: keep the `clump` pool (open question 6), and change its comment to say nothing uses it
    yet.
  - `src/boogler/lines.js`: delete the `holes` small-talk entry. Small-talk ids are kept only in
    `f.flags.recent`, so deleting one is safe.
- [x] **1.5 Tests.**
  - Delete `test/terrain-edits.test.mjs` and `test/terrain-water.test.mjs`.
  - `test/land.test.mjs`: delete the mask test and the `editableMask` import.
  - `test/water-idle.test.mjs`: keep only "the idle island sleeps" and "reloads sleep again". Delete the dig half,
    and rename the test.
  - `test/world-rules.test.mjs`:
    - delete `SCRIPTS.terrain`, `sandInWater` and the "flatten reaches the water sim" test;
    - keep the 129-cell test: it still asserts that `terrain` loads fresh;
    - update the purity regex to `/\/src\/(world\/rules\/[^/]+|world\/grid|sim\/[^/]+)\.js$/`.
  - `test/world-replay.test.mjs`:
    - replace `await play(8, 'flatten')` and its assertion with `await play(8, 'gift.toss')`;
    - fix the comments ("after a flatten").
  - `test/boogler-talk.test.mjs:152`: keep `['shovel', 'ball']`. The catalog entry still has `key: true`; if it
    fails, use `['ball']`.
  - `test/fixtures/world-inputs.json`:
    - `ops` becomes `["mush.plant","mush.water","fruit.drop","gift.take","gift.toss","slosh"]`;
    - delete `maskHash`.
  - `test/fixtures/snap-pre-version.json`:
    - set `hashes.terrain` to `2166136261`;
    - set `hashes.water` to the value the test now prints.

    Add a sentence to `about`: "hashes updated 2026-10-30: sand removed, deltas ignored".
  - Run `npm run check:full`.
- [x] **1.6 Scenarios and CI.**
  - Delete `dev/scenarios/dig-channel.mjs`, `flatten-water.mjs` and `two-player-dig.mjs`.
  - The scenario edit below is a raw `gift.toss` with no local flight. That is safe: on the submitting tab
    `claimFlight` (`src/adapters/gifts.js:185`) finds no flight with that nonce and replays one from `e.l`, just as
    every remote peer does, and `fx.arriving` is read with `?? null`. So no `[world] onApplied failed` appears, which
    smoke's last check would catch.
  - Add `dev/scenarios/two-player-edit.mjs`, adapted from `two-player-dig`, with window handles only:
    - B submits
      `{ op: 'gift.toss', i: 230, j: 205, k: 0, y: -1, n: Date.now() % 1000, l: [0, 100, 0, 0, 0, 0] }`
      (k 0 = coconut; the index is pinned by append-only);
    - A waits for `window.boogle.gifts.items.some((it) => it.src === 2 && it.i === 230 && it.j === 205)`;
    - both tabs then compare `window.boogle.sync.hashesAt(tick)`, as `smoke` does.
  - Rename `reconnect-dig.mjs` to `reconnect-edit.mjs`. Swap the dig for the same `gift.toss` and the depth check for
    the item check, and update its `about` and header.
  - `dev/scenarios/smoke.mjs`: replace the dig section with the same toss (the host sees the item). Update the
    header and `about`.
  - `dev/scenarios/world-inputs.mjs`:
    - read base from `(await import('/src/world/game-world.js')).land.base`, not `terrain-edits.js`;
    - drop `maskHash` from READ, the fixture writer and the checks;
    - update the header.
  - `dev/scenarios/dive.mjs`: rewrite around `actionById('dive')` and `KeyQ`. Keep "LT dives while swimming and
    breaches". Drop the pile-hold checks (parts 2 and 3) and `HOLD`.
  - `dev/scenarios/hotbar.mjs`: remove every shovel check:
    - "starts with a shovel", "trying to throw the shovel", "Boogler refuses the shovel" (keep "takes the mango");
    - touch "one slot (the shovel)" becomes "no slots";
    - "holding the shovel: Dig, Pile and Flatten", "without a shovel, Pile", "next to the ball, the shovel button
      says Dig".

    Where a check used the shovel only as "something else in hand", use a mango. Update the header.
  - `dev/scenarios/particles.mjs`: drop `DIG` and the pile line, the `clump` maximum, and their checks. Update the
    header.
  - `dev/look/perf.mjs`:
    - BUSY keeps the flood and drops the channel digging and `__perfEach` (and the `terrain-edits.js` import; ground
      is `land.base[g]` from `game-world.js`);
    - fix the label to `sim, busy water (N cells flooded)` and the header comment.
  - `dev/video/shots/feel.mjs`: dive through the `dive` action. Update the header.
  - `.github/workflows/ci.yml`: change `two-player-dig` to `two-player-edit`.
  - `.github/workflows/scenarios-nightly.yml`: remove `dig-channel`, and change `reconnect-dig` to `reconnect-edit`.
  - Run:
    - `npm run scenario -- world-inputs smoke two-player-edit reconnect-edit hotbar dive particles interact
      controls-guide pause`;
    - `npm run perf`;
    - `/look` stills of the beach and the court (the sand should look as before, with no dug colouring).
- [x] **1.7 Docs (same commit).**
  - `docs/game-design.md`:
    - §5: delete the shovel, dig, pile and flatten rows; dive becomes an action on LT/Q; free slots are D-pad ↑, ↓
      and →; delete the Q/Z/F note and the "LT and Q dive instead of piling" note;
    - §6.2: replace with "Removed 2026-10-30 (docs/plans/cleanup-dig-water-junk.md)";
    - §6.6: no shovel, empty starting hotbar;
    - §7.1: shovel row "retired";
    - fix every other hit of `grep -n "dig\|shovel\|pile\|flatten\|sand" docs/game-design.md` that describes the
      removed system (8.3, 8.4, 9, 10, 11, 12).
  - `PLAN.md` (hotspot):
    - under the Phase 3 heading add one line: "> Removed 2026-10-30 to clear room around the ball
      (docs/plans/cleanup-dig-water-junk.md); the items below are history.";
    - in the Hotbar item, drop "the shovel" and "but the shovel".
  - `DESIGN.md`:
    - intro: replace "sand you can shape" (keep the rest until step 2);
    - core loop: add "Sand shaping is removed for now (2026-10-30)."; drop "dig, pile" from principle 1's text, and
      "Sand walls ..." from 5 and "collapsing sand walls" from 10, keeping each principle's point;
    - "Today" column: Lockstep becomes "Water, mushrooms, gifts";
    - the physics bullet: "the ball rolls on dug sand" becomes "the ball reads the ground";
    - the crossing-kinds bullet: drop "A player digging";
    - "edit events (dig, pile, ...)" becomes "(plant, water, toss, ...)";
    - the authority row: "terrain edits" goes;
    - the `src/world/terrain-logic.js` mention in "Determinism" goes.
  - `AGENTS.md`:
    - line 21: input.js binds Space, E, R and the move keys by hand; dive is no longer the `onKey` example (keep the
      hotbar digits);
    - line 28: imports allowed are `src/sim/`, `../grid.js` and sibling rules;
    - delete the "Change ground outside the terrain ops" Don't bullet;
    - line 48: `two-player-edit`.
  - `src/world/README.md`: update the pieces table (no `terrain-logic.js` or `terrain-edits.js`; `game-world.js`
    example `rules.mushrooms`) and the "Integer units" line (water only).
  - `src/world/rules/README.md`:
    - the "on the ground" note reads `land.base[g]` and has no terrain ops;
    - the allowed-imports lines;
    - the replay paragraph: "after a flatten" becomes "after a toss";
    - the modules table: `terrain.js` row reads "none | `terrain` | `{}`: retired stub, keeps the slot (step 1 of
      docs/plans/cleanup-dig-water-junk.md)".
  - `src/island/README.md` lines 48-51: drop "sand digging" and the `EDIT_MAX_CM` POI rule.
  - `README.md`:
    - line 23: features example without the shovel;
    - line 51: drop "· F shovel".
  - `.claude/skills/look/SKILL.md`:
    - the CI list becomes `two-player-edit`;
    - `reconnect-edit`;
    - the example scenario uses the `gift.toss` above and `window.boogle.gifts`;
    - line 59: no shovel keys.
  - `docs/tech-plan.md`: add "(historical: digging removed 2026-10-30)" to A3, which digs.
  - `src/README.md` line 15: "terrain mesh and heights" stays.

### Risks (step 1)

- Hotspots: `index.html` (one line), `PLAN.md` (a few lines). `src/main.js` does not change: nothing there imports
  terrain-edits.
- Mixed builds: explained above. The only visible effect for an old tab under a new host is that its shovel does
  nothing.
- Determinism: the water ground copy changes from `base + delta` to `base`. Every peer on the new build computes the
  same thing, and the replay test and `check:full` cover it.
- Perf: fewer meshes (two rings), no settle and no edit flush. Compare `npm run perf` render and sim before and after.

---

## Step 2: remove the lockstep water sim

### Design

- **Water stub** (`src/world/rules/water.js`, rewritten whole):
  ```js
  // Retired 2026-10-30: the shared water sim is removed (docs/plans/cleanup-dig-water-junk.md); the sea stays. The
  // `water` key keeps its slot in RULES so state order and hashes line up across builds. It loads any save and
  // ignores the cells.
  export const name = 'water';
  export const BARE_HASH = 2166136261; // any constant works (old tabs cannot match, see below); same as terrain's
  export function install(sync) {
    sync.registerState('water', { serialize: () => ({}), load: () => {}, hash: () => BARE_HASH });
    return {};
  }
  ```
- **Readers of the water surface.** Keep `src/physics/water-field.js` with only `surfaceAt` (default `() => SEA`).
  `src/pois/caves/index.js:328` wraps it for the cave pond (level 3.0). Every reader goes through it, so all of them
  fall back to sea level or the cave pond with no change:
  - `src/features/feel.js:78`;
  - `src/features/critter-fish.js:28,88,159`;
  - `src/features/critter-gulls.js:47`;
  - `src/adapters/mushroom-garden.js:47`;
  - `src/adapters/gifts.js:196,222`;
  - `src/physics/flight.js:61`;
  - `src/render/splash.js:70`;
  - `src/physics/physics.js:96,155`;
  - `src/pois/caves/index.js:328`;
  - dev only: `dev/scenarios/dive.mjs`, `dev/video/shots/feel.mjs` and `critters.mjs`.

  Delete only `currentAt` and `onBallImpact`, and their call sites.
- **The ball in still water** (`src/physics/physics.js` ball block). The `inSim` branch also serves the cave pond. Keep
  it, renamed `still` ("a pond above sea level: no waves, no sea drift"), with `cx = cz = 0` and the same `grip`
  formula. Delete only the `waterField.currentAt` call. In the player block, delete the current lookup, `cur`,
  `PLAYER_DRIFT` and `cx`/`cz`.
- **Mixed builds, step 2.** The old water hash mixes the sim's own `tick`, which advances every step, so no stub can
  match an old tab.
  - *New host, old clients:* each old client fails its 2 s hash check on `water` and asks for a snapshot. Its old
    `water.load({})` throws `'water snapshot size mismatch'`, so it falls back fresh (`loadErrors`,
    `unverifiedFallback`) and mismatches again: one snapshot every ~2 s until the tab hides and reloads. While
    `unverifiedFallback` is set, such a tab never keeps or uploads that state if it becomes host; it loads the saved
    copy instead. This is the documented guard.
  - *Old host, new clients:* `slosh` edits are skipped. The water hash mismatches every 2 s and new clients resync
    until the host reloads.
  - Either way nothing crashes; it costs extra snapshot traffic for the length of the deploy window. A version bump
    would not help, so the stub stays at `version` 0.

### Steps

- [x] **2.1 Stub the rules, delete the sim.**
  - Rewrite `src/world/rules/water.js` as above.
  - Delete `src/sim/water.js` and `src/sim/water-region.js`.
  - `src/world/grid.js`: delete `homeBox` and its comment; keep `HOME`. Fix the `HOME` comment ("beach gifts stay
    inside it").
- [x] **2.2 Delete the game side.**
  - Delete `src/world/water-world.js` and `src/render/water-surface.js`.
  - `src/main.js`: delete `import './world/water-world.js';` (hotspot, one line).
  - `src/physics/water-field.js`: keep `surfaceAt` only, and fix the comment ("the sea; the caves add their pond").
  - `src/physics/physics.js`: as in the Design section.
  - `src/render/splash.js`: delete the `onBallImpact` line (76) and fix the comment at 70.
  - `src/render/water-render.js`: fix the comment at 104 (no `water-surface.js`).
  - `src/world/README.md`: the pieces table drops `water-world.js`.
- [x] **2.3 Tests.**
  - Delete `test/water.test.mjs`, `test/water-region.test.mjs` and `test/water-idle.test.mjs`.
  - `test/land.test.mjs`: delete the region test and its imports.
  - `test/world-rules.test.mjs`: delete `SCRIPTS.water`.
  - `test/world-replay.test.mjs`: nothing to change; there is no `slosh` generator once the module exports no
    `edits`.
  - `test/fixtures/world-inputs.json`: delete `region`, and delete `"slosh"` from `ops`.
  - `test/fixtures/snap-pre-version.json`: set `hashes.water` to `2166136261`, and extend `about`.
  - `test/world-snapshots.test.mjs`, the step-1 test: also assert `stateHashes().water === 2166136261`.
  - Run `npm run check:full`.
- [x] **2.4 Dev tools.**
  - `dev/look/lib.mjs:133`: wait on `window.__debugCam && window.boogle?.sync`. Every look and scenario waits here,
    so check that `debug-handle` sets `window.boogle.sync` in `onStart` before entering.
  - `dev/scenarios/world-inputs.mjs`:
    - drop `region` from READ, the writer and the checks;
    - wait on `window.boogle?.gifts?.trees?.length > 0` only.
  - `dev/look/perf.mjs`: delete BUSY and `FLOOD_*`, and the `water` and `active` reads in PROFILE. Sim reports the
    idle island only. Fix the header and the `profile()` label.
  - Run:
    - `npm run scenario -- world-inputs smoke two-player-edit caves dive interact`. `caves` checks that the ball
      floats on the pond; `dive` that swimming still works in the sea;
    - `npm run perf` before and after: expect one fewer mesh and lower tick ms;
    - `/look` motion of the ball in the surf and a splash.
- [x] **2.5 Docs.**
  - `docs/game-design.md`:
    - §6.3: replace with "Removed";
    - §6.1: no sim water or `slosh`;
    - §4 "Swim and dive": the sea and the cave pond;
    - 8.3, 9 (perf) and 12.
  - `PLAN.md`: the same one-line note under Phase 4. Phase 6 gets "> The water sim is removed (2026-10-30): the
    second bullet needs a new water model."
  - `DESIGN.md`:
    - intro: "water that flows where you let it" goes, and the core loop gets "and so is the shared water sim; the sea
      stays";
    - "Today" Lockstep becomes "Mushrooms, gifts";
    - the tide bullet: "can flood the water grid" goes;
    - "water as 0–255 units" becomes "item counts and ids" (or drop the example);
    - the authority row: "Water, garden, weather" becomes "Garden, gifts, weather".
  - `AGENTS.md`: lockstep examples without water.
  - `src/world/rules/README.md`: `water.js` row "retired stub"; `WATER_SIM` goes.
  - `src/README.md` line 21: "sea shader" (no sim-water surface); line 18: "the water-field bridge (sea and cave
    pond)".
  - `README.md` line 30: `sim/` example without water.
  - `src/island/README.md`: drop "The shared water sim".
  - `docs/tech-plan.md`:
    - A5 and C4: add "(historical: the water sim was removed 2026-10-30)";
    - the "Remove unused legacy code" item: the spring API and `dev/water-lab/` are already done (#28, #31);
      nothing further.

### Risks (step 2)

- Hotspot: `src/main.js` (one line).
- The cave pond depends on `water-field.js` staying a bridge; the `caves` scenario guards it.
- Mixed builds: resync churn for the deploy window (above). It costs bandwidth, not correctness.
- Perf: removes a mesh and the heaviest per-tick handler. Record the numbers in the PR body.

---

## Step 3: stop beach junk washing up

### Design

- **Sources.** Melon, teacup, book, abacus and doppi are `src: 'shore'`, and shore is their only source:
  - `FRUIT_CYCLE` holds only coconut, mango, banana, pomegranate and apricot;
  - the stall gives seeds and the can;
  - the perch gives the frisbee.

  So all 17 shore kinds (indices 5-21) stop appearing. Kept: palm fruit, the frisbee perch, seeds, the can, the ball,
  and player tosses.
- **Catalog.** Keep every entry, with its index, `taste`, `line` and `bonus`. Change each shore entry's `src` from
  `'shore'` to `'sea'` and delete its `weight`. Extend the header: "'sea' used to wash up (retired 2026-10-30); kept
  so held ones can still be given and thrown." They are **not** `retired`: hotbars keep them, The Boogler still takes
  them with the same taste, and tosses of them land as usual.
- **Gifts sim** (`src/sim/gifts.js`).
  - Delete `wash()`, `SHORE_KINDS`, `SHORE_TOTAL`, `MAX_SHORE`, `WASH_EVERY`, `WASH_EVERY_SPARSE`, `SPARSE` and
    `shoreCount`, and the wash block at the end of `tickGifts`.
  - **Keep** `SRC.SHORE` (0) and `LIFE.shore` with the age-out filter, so items saved before this step age out
    (12,000 ticks, 20 min of world time) on every build the same way. Recommended over dropping them at load: both
    builds then apply the same filter.
  - **Keep** `washed` and `nextWash` in state, serialize and hash, but pin `nextWash` to `NEVER = 0x7fffffff` in
    `createGifts` and in `loadGifts`, whatever `json.at` says. `washed` loads as before and never changes. Comment
    it: old builds that load our snapshot read `at` and so never wash either.
  - `createGifts` no longer reads `layout.shore`.
- **Mixed builds, step 3.**
  - *New host, old clients:* they load `at = 0x7fffffff`, never wash, age out the same items, and their hashes match.
  - *Old host, new clients:* a new client pins `at` when it loads the old host's snapshot, while the host carries its
    real `at`. So `gifts` mismatches at every 2 s check and the client resyncs each time, until the old host reloads.
    The items it washed up meanwhile age out afterwards.
- **The Boogler.**
  - Keep all catalog lines and tastes, so presents of already-held items still work.
  - Delete the `washups` small talk ("Things wash up on the beach all the time"); it is now false.
  - Keep the chapter lines in `biz2` ("A book washed up") and the melon lore. They are past-tense backstory, and
    chapter ids are stored in `f.learned`, so they must not be deleted.
  - Removing wash-ups leaves 2 of the 7 "love" gifts obtainable (pomegranate, apricot), and the doppi bonus becomes
    unreachable for new players. See open question 3.

### Steps

- [x] **3.1 Sim and rules.**
  - Edit `src/sim/gifts.js` as above.
  - `src/sim/gift-catalog.js`: change `src`, drop `weight`, and update the header.
  - `src/world/rules/gifts.js`:
    - update the header comment;
    - add to `invariants`: `if (gifts.nextWash !== 0x7fffffff) return 'wash schedule unpinned'` (export `NEVER` from
      sim/gifts.js and use it).
  - `src/world/game-world.js`: `layout: { trees: [], perches: [] }`.
  - `src/world/rules/README.md`: the `land.layout` description loses `shore`.
- [x] **3.2 Adapter.** `src/adapters/gifts.js`:
  - delete the shore-cell scan in `createGifts3d`, along with `SHORE_MIN_CM`, `SHORE_MAX_CM` and the now unused
    imports (`HOME`, `GRID_RES`, `obstacles`, `PATCH` if unused);
  - the twinkle sparkle and the bob keep `SRC.PERCH` only. Saved shore items lie still until they age out;
  - fix the header ("things washed up on the beach").
- [x] **3.3 Boogler.** `src/boogler/lines.js`: delete the `washups` small-talk entry.
- [x] **3.4 Tests.**
  - `test/gifts.test.mjs`:
    - delete "shore items wash up..." and "the tide takes old shore items back", and the `MAX_SHORE` import;
    - add "nothing washes up, and saved shore items age out": `loadGifts` a json with one `src: 0` item born at tick
      1 and `at: 5`, run to `LIFE.shore`, assert the item is still there; run past `LIFE.shore + 1`, assert it is
      gone; assert `s.nextWash === NEVER`, and that no `src: 0` item was ever added;
    - the `layout()` helper drops `shore`;
    - the "same ticks give the same island" test still passes (fruit only).
  - `test/fixtures/world-inputs.json`: delete `layout.shore`. `test/helpers/land.mjs` passes `fixture.layout`
    unchanged.
  - `test/fixtures/snap-pre-version.json`: set `hashes.gifts` to the printed value (`at` pinned), and extend `about`.
  - `test/world-snapshots.test.mjs`, the step-1 test: also tick both peers 12,100 ticks (the same `updateWorld(0.1)`
    loop; there is no water tick any more, so this is fast; if the file gets near a second, lower the count to just
    past `LIFE.shore` from the fixture's tick), then assert that no item has `src === 0` and that the hashes are still
    equal.
  - `test/boogler-friendship.test.mjs` uses `melon` and `shell` by index; it is unaffected (taste kept).
  - Run `npm run check:full`.
- [x] **3.5 Scenarios and docs.**
  - `dev/scenarios/world-inputs.mjs`: drop `shore` from `layout` and from `counts`.
  - `dev/scenarios/interact.mjs`: the "shore item" check uses a `gift.toss` of a mango at the player's feet (or a
    shaken fruit) instead of waiting for a wash-up. Update the header.
  - `dev/video/shots/gifts.mjs`: drop the wash-up segment and fix the header.
  - Run `npm run scenario -- world-inputs smoke two-player-edit interact hotbar` and `/look` a still of the home
    beach (no junk, fruit under palms).
  - `docs/game-design.md`:
    - §6.5 becomes "Gifts" (no wash-up tuning; the shore items' lifetime stays as age-out);
    - §7.1: the source column says "sea (retired: no longer washes up)", and the weights go;
    - §7.2 if it cites wash-ups.
  - `PLAN.md`: the Boogler "Island gifts" item gets " (wash-ups removed 2026-10-30)".
  - `src/world/rules/README.md`: the gifts row drops "washed-up".
  - `src/island/README.md`: drop "beach gifts" from "Home is special".
  - `src/world/grid.js`: the `HOME` comment (no user left but the island README; keep the constant).

### Risks (step 3)

- `world-inputs.json` `layout` is also what Node tests build land from; deleting `shore` must not break
  `homeLand()` (it passes `layout` through, and `createGifts` no longer reads `shore`).
- The pinned `nextWash` is a deliberate leftover for old builds. It can go in a later `gifts` `version: 3` once old
  builds are long gone.
- Determinism: only deletions in tick code, plus a constant. The replay test and the new age-out test cover it.

---

## Open questions for the owner

1. **Empty starting hotbar.** New players used to start with a shovel in slot 1; now they start with nothing (on
   touch, the bar shows no slots until they pick something up). OK, or seed something else (the frisbee?)?
2. **Dive on touch.** Dive becomes LT/Q only; there was never a touch dive. Add a touch "Dive" button shown while
   swimming? It needs a body class and is out of this plan unless you want it.
3. **The Boogler's love gifts.** Melon, tea bowl, book, abacus and doppi only ever washed up. After step 3 only
   pomegranate and apricot (trees) are "love" presents, and the doppi's +10 bonus is unreachable. Accept that, move
   some of them to `FRUIT_CYCLE` or a perch, or keep a rare wash-up of just those five?
4. **Retired small talk.** The plan deletes `holes` (step 1) and `washups` (step 3). Rewriting them instead is also
   possible.
5. **Shore items in old saves.** The plan lets them age out (at most 20 min of world time) rather than dropping them
   at load. Prefer instant removal?
6. **`clump` particles.** Only sand-fx used the clump pool. The plan keeps it as a shared particle style (an idle
   InstancedMesh). Delete it too?
7. **DESIGN.md wording.** Besides the intro and the core-loop paragraph, the plan edits the examples in principles 1
   ("dig, pile"), 5 ("Sand walls can be knocked down") and 10 ("collapsing sand walls"), keeping each principle's
   point. Do you want those principle texts touched, or only the intro and core loop (leaving the principles naming
   toys that are gone for now)?
8. **Scenario coverage.** The plan replaces `two-player-dig` (required in CI) and `reconnect-dig` with `gift.toss`
   versions rather than just deleting them, so two-player edit sync and held edits stay covered. OK?
