_Snapshot of the codebase as of 2026-10-29; may be out of date (e.g. pad slots changed in 07daef1)._

# Codebase inventory: what Boogle has now, judged against "fun together + communal progression, no grind, no fine control"

State as of `main` at `dbcdaae` (2026-10-29 10:27). All sources are repo-relative paths in /Users/matiasfranco/Developer/boogle; commit hashes refer to `git log`. Line counts are `wc -l`. "Shared" means registered world state or ops in `src/world/sync.js`; "presence" means per-player fields in the unreliable presence channel; "local" means cosmetic, never synced.

Note on the working tree: the task's git-status snapshot listed 8 modified files (`src/island/shape.js`, `src/pois/*/site.js`, `src/pois/windmills/index.js`, `src/props.js`, `src/boogler.js`, `src/island/README.md`, `dev/scenarios/dig-channel.mjs`). During this research they were committed to `main` as `dbcdaae` "Shrink the island and put the lighthouse on a hill in the middle" (HEAD moved from `7d49492`; concurrent work is happening on `main`). Only untracked items remain: `.claude/agents/` (planner.md, implementer.md), `.claude/skills/feature/`, `reports/`, `research_notes/`. Nothing was modified by this research.

## What features and systems exist, how big are they, what shared state do they add, and what do they serve?

### Takeaway
`src/` is about 14.2k lines. The shared, persisted world is small: five registered states (`terrain`, `water`, `mushrooms`, `gifts`, `proto`) and eight ops, all confined to the original 160 m "HOME" square. The biggest single cluster is The Boogler plus island gifts (~4.1k lines, ~29% of `src/`), whose progression is personal (localStorage), not communal. The together-moments are the ball, honk chords, ping, sand/water digging and mushrooms; the 12x-then-4x mainland with lighthouse and windmills adds traversal and scenery but no shared state.

### Cited Findings

**Registered shared state and ops (the whole deterministic/persisted world):**
- States: `terrain` (sand deltas) and ops `dig`, `pile`, `flatten` — [src/world/terrain-edits.js](../../../../src/world/terrain-edits.js) lines 45-48; `water` state and op `slosh` (ball slaps a pool), per-tick step — [src/world/water-world.js](../../../../src/world/water-world.js) lines 93, 128, 153; `mushrooms` state, ops `mush.plant`, `mush.water` — [src/mushroom-garden.js](../../../../src/mushroom-garden.js) lines 40-61; `gifts` state, ops `fruit.drop`, `gift.take` — [src/gifts.js](../../../../src/gifts.js) lines 56-78; `proto` (room-wide prototype flag bitmask) — [src/proto-flags.js](../../../../src/proto-flags.js). No other `registerOp`/`registerState`/`onTick` call exists in `src/` (rg over src).
- Sync mechanics: 10 Hz tick (`TICK_MS = 100`), edits stamped 3 ticks ahead, hash every 20 ticks with per-state hashes, snapshot chunks for late joiners, host save every 30 s (`SAVE_MS = 30000`) — [src/world/sync.js](../../../../src/world/sync.js) lines 1-31.
- Shared sim, digging and beach gifts are confined to `HOME = { x0: -80, x1: 80, z0: -80, z1: 80 }` (a 160 m square) on a 409-cell, 510 m grid — [src/constants.js](../../../../src/constants.js).

**Per-system inventory (main):**

| System | Files (lines) | Shared/networked state | Determinism & sync burden | Tests | Serves together? | Serves communal progression? |
|---|---|---|---|---|---|---|
| Beach ball: grab/throw with charge, steal, push, respawn, floats, surf drift, owner-epoch authority | `src/ball.js` (223), part of `src/physics.js` (192), `src/player.js` (190), `src/input.js` (259) | Presence (owner + pose); epoch rule | Low (float physics, owner-authoritative, not in sim) | none (physics) | **Strong** (DESIGN "the ball stays the star") | No |
| Ball impact pack + face-plant | `src/features/impact.js` (393) | Presence `kd` (knocked-down ms) | Local cosmetic | none | Yes: slapstick between players (face-plant from someone's throw) | No |
| Bump (V volleyball dig) | `src/features/bump.js` (75) | Uses ball claim path | Low | none | Yes (passing game). No pad slot (only key + touch) | No |
| Controller feel pass (jump shape, ground snap, dives, flops, squash/lean) | `src/features/feel.js` (299), hooks in physics/input | Presence `fl` (flop kind) | Local | none | Indirect: head-stomp/bonk flops are player-on-player slapstick | No |
| Social: ping (G / D-pad left) "Ball!/Dig!/Look!" markers; honk (T / Y), 3+ different players within ~1 s make a chord with sparkles | `src/features/ping.js` (259), `src/features/honk.js` (306), `src/sim/social.js` (57) | Reliable room messages `{t:'ping'}`, `{t:'honk'}`; no world state | Low (validated, rate-limited) | `test/social.test.mjs` | **Strong**: honk chord is the only mechanic that rewards *several different* players acting together (DESIGN 4) | No (nothing persists) |
| Sand: dig/pile/flatten, 5x5 brush, bucket 1600, conserved, ±150 cm, rate 5/s, hold-and-drag, target ring | `src/world/terrain-logic.js` (215), `src/world/terrain-edits.js` (337), `src/features/shovel.js` (36), `src/terrain.js` (263), `src/features/sand-fx.js` (290 cosmetic) | State `terrain` (persisted diff), ops dig/pile/flatten | Medium: integer, conserved, hashed; mesh/heightfield/height-texture flush | `test/terrain-edits.test.mjs` | Yes (parallel building, `dev/scenarios/two-player-dig.mjs`) | **Yes, today**: edits persist in snapshots, so sculpted sand survives sessions |
| Water: 2.5D integer column sim near the beach, active-cell list, sim surface mesh, splashes/ripples | `src/sim/water.js` (298), `src/sim/water-region.js` (81), `src/world/water-world.js` (242), `src/water-surface.js` (241), `src/water-render.js` (108), `src/water-field.js` (15), `src/splash.js` (168) | State `water` (depths), op `slosh` | **Highest**: integer flow, scan-order parity, hashing; the main desync risk | `test/water.test.mjs`, `test/water-region.test.mjs` | Yes (dig a channel, watch the sea run in) | Partly (water state persists) |
| Mushroom garden: stall gives 5 seeds + watering can; plant in a 20x20-cell dirt patch (spacing 3), water once, grows in 40 ticks (4 s) into a bouncy cap | `src/sim/mushrooms.js` (65), `src/mushroom-garden.js` (444), `src/features/mushroom-garden.js` (6), `src/features/critter-fireflies.js` | State `mushrooms`, ops `mush.plant`, `mush.water` | Low-medium (tiny integer state) | `test/mushrooms.test.mjs` | Yes: bounce pads for players and ball | **Yes, the only "garden"**: plots persist forever; no decay, no removal op, so the patch eventually fills (about 49 caps max at spacing 3) and nothing more happens |
| Island gifts: palms ripen fruit (regrow 2400 ticks = 4 min), shake or hit with ball; shore items wash up on a seeded schedule; items expire (shore 12000 ticks, fruit 6000); personal pocket of 6 | `src/sim/gifts.js` (152), `src/sim/gift-catalog.js` (211), `src/gifts.js` (570), `src/features/gifts.js` (10) | State `gifts`, ops `fruit.drop`, `gift.take`; pocket in localStorage `boogle.pocket` | Medium (seeded schedule, hashed) | `test/gifts.test.mjs` | Weak: items are first-come; ball knocking fruit is a nice ball verb | No (items are consumables feeding personal Boogler friendship) |
| The Boogler: host-driven wandering NPC (presence `g`), kinematic so ball bounces off him; flee/ridden modes | `src/boogler.js` (639), `src/boogler-hud.js` (114), `src/boogler-fx.js` (166), `src/features/boogler.js` (36) | Host presence `g`; per-player presence `bg` (act, wary, event) | Low (floats, host-owned, not in sim) | none | Some: riding him and getting launched is visible slapstick to everyone | No |
| Boogler friendship + dialogue: 6 levels (0→340 pts), pets/gifts capped per 10/20-minute windows, story chapters (Uzbekistan, mother, business dream), nosiness penalties, ride/launch, wary/flee | `src/boogler-friendship.js` (197), `src/boogler-talk.js` (301), `src/boogler-lines.js` (1138 lines of dialogue data), `src/boogler-dialogue.js` (218), `src/boogler-play.js` (332) | localStorage per room; presence `bg` | Low (personal, pure) | `test/boogler-friendship.test.mjs`, `test/boogler-talk.test.mjs` | Weak: a modal dialogue box swallows game input while open (`boogler-dialogue.js` header) — a solo activity | **Personal**, not communal; multi-session points ladder |
| Day/night: 20-min day, smiling sun, phased moon, lighting follows; shared clock | `src/sky.js` (392), `src/sim/sky-clock.js` (38), `src/features/day-night.js` (11), `src/shared-time.js` (20) | None (pure f(world.tick)) | Low | `test/sky-clock.test.mjs` | Ambient (everyone sees the same sky) | No; clock freezes when no one hosts (tick only advances while hosted) |
| Island shape + POIs: hub-and-spoke island ~23,300 m² (was 66,600), lighthouse on a central hill with spiral stair and dusk beams, windmill farm with solid sails that bonk players and bat the ball | `src/island/*.js` (shape 86, stamps 192, index 16), `src/pois/lighthouse/*` (317+22), `src/pois/windmills/*` (255+35), `src/props.js` (320), `src/lights.js` (59) — ~923 for island+POIs | None (pure terrain function, shared-clock animation) | Low runtime; adds draw calls and terrain stamps | none | Places to go together; sails batting the ball is a ball toy | No |
| Critters: gulls scatter when run at / ball lands, fish school in any deep water scatters from splashes, fireflies at night | `src/features/critter-gulls.js` (189), `critter-fish.js` (178), `critter-fireflies.js` (93) | None (local cosmetic; behind proto flags) | Low (local Math.random) | none | Ambient; gulls react to players/ball | No |
| Blob shadows at night | `src/features/blob-shadows.js` (46) | None | Low | none | Readability | No |
| Gamepad (Backbone), action registry | `src/features/gamepad.js` (152), `src/controls.js` (77) | None | Low | `test/controls.test.mjs` | Access for couch/phone play | No |
| Netcode | `src/net/peer-room.js` (820), `src/net.js` (344), `src/world/sync.js` (500), `src/world/background.js` (32), `src/world/clock-worker.js` (2), `src/world/legacy-grid.js` (21) | Everything | Core infra | `test/world-sync.test.mjs`, `test/background.test.mjs`, `test/legacy-grid.test.mjs`, server tests, `dev/peer-test/` | Infra | Infra (persistence lives here) |
| Dev tooling in game: prototype flags, desync overlay `?netdebug=1`, debug cam | `src/proto-flags.js` (20), `src/sim/proto.js` (37), `src/features/syncsafety.js` (66), `src/features/debug-cam.js` (29) | State `proto` | Low | `test/proto.test.mjs` | — | — |

**Cluster sizes (main):** Boogler + friendship + dialogue + gifts ≈ 4,084 lines (boogler 639, lines 1138, play 332, talk 301, dialogue 218, friendship 197, fx 166, hud 114, feature 36, gifts.js 570, gift-catalog 211, sim/gifts 152, feature 10); water ≈ 1,150; sand ≈ 1,140; netcode ≈ 1,720; island+POIs ≈ 920; social ≈ 620; ball+feel+impact+bump ≈ 1,030; critters ≈ 460; sky ≈ 460; mushrooms ≈ 515 — wc over the files listed above.

**Controls budget:** Pad slots in `PAD` include `view`, `l3`, `r3` ([src/controls.js](../../../../src/controls.js) lines 12-24). Used: jump, `x` use, `b` respawn, `lb` shovel, `rt` dig, `lt` pile, `rb` flatten, sprint, `up`/`down` zoom ([src/input.js](../../../../src/input.js) lines 221-240), `right` Boogler talk ([src/boogler-play.js](../../../../src/boogler-play.js) line 301), `y` honk ([src/features/honk.js](../../../../src/features/honk.js) line 293), `left` ping ([src/features/ping.js](../../../../src/features/ping.js) line 244), `menu` help ([src/features/gamepad.js](../../../../src/features/gamepad.js) line 136). Free: `view`, `r3`. Bump (V) has no pad slot ([src/features/bump.js](../../../../src/features/bump.js); also noted in [reports/Ambitious mechanics for Boogle.md](../../ambitious-mechanics.md)). Shovel alone takes 4 slots (lb/rt/lt/rb).
- Keyboard: E use, R respawn, F shovel, Q dig, Z pile, Shift flatten/sprint, H help ([src/input.js](../../../../src/input.js) lines 45-71), T honk, G ping, C Boogler talk ([src/boogler-play.js](../../../../src/boogler-play.js) line 299). The storm-tide branch's forecast also uses C ([PROTOTYPE.md on origin/prototype/storm-tide](https://github.com/matiasfr/boogle/blob/prototype/storm-tide/PROTOTYPE.md), "Hold C or D-pad →"), and D-pad right, both already taken on main.

**Built but unmerged: `origin/prototype/storm-tide`** (last commit 2026-10-29 09:22 UTC; +5,236 lines across 62 files vs main — `git diff --stat main...origin/prototype/storm-tide`). Its PROTOTYPE.md reports as working: M1 telegraphed tide (`src/sim/tide.js`, 6-min cycle, +60 cm, king tide +100 cm every 3rd cycle), M2 wet sand that slumps and erodes (`src/sim/wetsand.js`, new `wetsand` state), M3 ball smashes sand walls (op `sand.smash`), M4 telegraphed rain squalls (`src/sim/weather.js`), M5 king-tide crate that needs 2+ pushers (0.3 m/s alone, 1.8 m/s with two) and gives pushers a personal hat, M6 forecast ghost; plus a look pass (stylized sea, outlines, AO), night crabs, a Boogler utility brain with visible mood, and an opt-in procedural island generator (`?island=gen`) — [PROTOTYPE.md on the branch](https://github.com/matiasfr/boogle/blob/prototype/storm-tide/PROTOTYPE.md), `git log main..origin/prototype/storm-tide`. Already cherry-picked onto main: feel (`8768e65`), desync overlay (`5bb9fa8`), gulls/fish/fireflies (`924924d`), blob shadows (`d57a9be`), proto flags (`28920e0`) — `git log`.
- PROTOTYPE.md's own caveats: the beach is steep, so a king tide covers only "a 1-3 m strip of beach"; dry walls taller than ~65 cm sag right after building "which may feel punishing"; the crate solo "is a chore". — [PROTOTYPE.md on the branch](https://github.com/matiasfr/boogle/blob/prototype/storm-tide/PROTOTYPE.md)

### Inferences
- The game currently has three "together" engines: (1) the ball and its slapstick (impact, face-plant, bump, feel flops, windmill sails), (2) honk chord + ping, (3) shared sand/water editing. Everything else is either ambient (sky, critters, POIs) or personal (Boogler friendship, pocket).
- The Boogler cluster is the largest investment and the furthest from the new direction: its progression is a personal points ladder with windowed caps (`RULES` in `src/boogler-friendship.js`), its dialogue is a modal solo activity, and 1,138 lines are hand-written story text. Its *physical* half (riding, launches, ball bouncing off him, hearts others can see) is the part that serves play-together.
- Sand digging is the main fine-control-heavy system (4 pad slots, 3 brush ops, target ring, bucket management). It is also the only system whose output already persists communally. The tension for the new direction is exactly here.

### Gaps
- No telemetry exists on which verbs players use; usage claims are inferred from code and commits only.
- I did not measure frame cost per system (`npm run perf` was not run, per the read-only constraint).

## What persistence exists today, and what could carry communal progress across sessions?

### Takeaway
The host snapshots all registered state (terrain deltas, water depths, mushroom plots, gift items, proto mask) every 30 s to its own localStorage and, only if `VITE_BOOGLE_SERVER` is configured, to the snapshot server. A new host loads the newest of local/server copies. But **nothing advances while nobody is online**: `world.epochMs` is stored but never read, growth and regrowth are tick-based, and the tick only advances while someone hosts. DESIGN principle 9 ("growth is computed from elapsed time") is unimplemented. What persists today is a frozen diorama: sculpted sand, standing water, mushrooms and loose gift items.

### Cited Findings
- `persist()` (host only, skipped if the combined hash is unchanged) writes the snapshot JSON to `cfg.storage` (localStorage) and, if `cfg.serverUrl` is set and the body is under 250,000 chars, PUTs it to `/rooms/:roomId/snapshot` — [src/world/sync.js](../../../../src/world/sync.js) ~lines 340-361. `SAVE_MS = 30000` — same file line 31.
- `becomeHost()` loads the newest (highest tick) of the localStorage copy and the server copy (3 s timeout); if none, `world.epochMs = cfg.now()` — [src/world/sync.js](../../../../src/world/sync.js) ~lines 362-401.
- `serverUrl` is `import.meta.env.VITE_BOOGLE_SERVER` — [src/net.js](../../../../src/net.js) lines 229-232, 280; deploy builds read `vars.VITE_BOOGLE_SERVER` — [.github/workflows/deploy.yml](../../../../.github/workflows/deploy.yml) line 33; `.env.example` leaves it commented out — [.env.example](../../../../.env.example). PLAN.md's "Deploy `server/` (Fly.io) and add TURN credentials" is unchecked — [PLAN.md](../../../../PLAN.md) Phase 1.
- Server: Express + `peer`; `GET/PUT /rooms/:roomId/snapshot`, one JSON file per room, rejects older ticks (409), 256 KB cap, 30 PUTs/min/IP, `MAX_ROOMS` 1000 — [server/README.md](../../../../server/README.md), [server/src/server.js](../../../../server/src/server.js) (284 lines).
- `epochMs` appears only in `src/world/sync.js` (set, serialized, validated) and in the README's description "for offline growth" — never read by any sim — `rg epochMs src`; [src/world/README.md](../../../../src/world/README.md).
- Mushrooms: `GROW_TICKS = 40`; `tickGarden` increments growth per tick; no decay, no removal op — [src/sim/mushrooms.js](../../../../src/sim/mushrooms.js).
- Gifts: `REGROW_TICKS = 2400`, `LIFE = { shore: 12000, fruit: 6000 }` in ticks — [src/sim/gifts.js](../../../../src/sim/gifts.js) lines 7-14.
- Sky clock is a pure function of `world.tick * TICK_MS` — [src/sim/sky-clock.js](../../../../src/sim/sky-clock.js) header.
- Old snapshots are migrated to the new grid by `LEGACY_SHIFT` "so sand castles and gardens survive" — [src/world/legacy-grid.js](../../../../src/world/legacy-grid.js). The team already treats persisted sand as something worth keeping.
- Personal persistence (localStorage): name/colour (`boogle.name`, `boogle.color` — [src/player.js](../../../../src/player.js) lines 81-82), pocket (`boogle.pocket` — [src/gifts.js](../../../../src/gifts.js) line 106), Boogler friendship per room ([src/boogler-play.js](../../../../src/boogler-play.js) lines 47-56). On the storm-tide branch: beach hat in localStorage + `hat` presence field.
- Snapshots are capped (server 256 KB; edits max 1000 chars; snapshot chunking 7000 chars × max 400 chunks) — [src/world/sync.js](../../../../src/world/sync.js) lines 26-29, [server/README.md](../../../../server/README.md).

### Inferences
- The plumbing for communal progression is already there: any new integer counter or sparse grid registered with `registerState` is automatically hashed, sent to joiners and persisted. A communal "island level", a collective tally (e.g. total fruit delivered, honk chords landed, tides survived), or unlocked landmarks would cost one small state plus ops.
- Offline change ("the island changed while you were away") needs `epochMs` (or a stored wall-clock at save) to be *read* on host load to fast-forward or catch up a few systems (fruit ripe, mushrooms grown, shore items washed up). That is a small, well-scoped change and directly serves DESIGN 9.
- If `VITE_BOOGLE_SERVER` is unset in production, cross-session persistence depends on whichever player last hosted still having the localStorage copy; a different friend hosting next would start from an empty island. Communal progression should not be built before confirming the server is deployed and the variable is set.
- Today's persisted state has no notion of "progress": terrain edits and mushroom plots accumulate but nothing reads them as achievement, and the mushroom patch eventually saturates.

### Gaps
- Could not verify whether the GitHub Actions variable `VITE_BOOGLE_SERVER` is set or whether `server/` is deployed (`gh variable list` returned nothing visible; no deploy evidence in the repo besides the unchecked PLAN item).
- Unknown whether any live room snapshot currently exists on a server.

## What do DESIGN.md, PLAN.md, playtests and git history say about intent, what players enjoyed, and what fell flat?

### Takeaway
Intent is clear and already close to the new direction ("cooperation is automatic", "communal world, personal rewards", "leave something for the next visitor", "slapstick over precision"). Player evidence is nearly absent: one logged playtest and one playtest-driven commit, which says the big island felt empty and "the fun is playing together in a smaller space". Cuts so far (garden sim, keepy-uppy streak, hill spring) were design-pass decisions, not playtest results.

### Cited Findings
- Pitch: "a drop-in island for a handful of friends: one beach ball, sand you can shape, water that flows where you let it, and a shared garden that keeps growing while nobody is online." — [DESIGN.md](../../../../DESIGN.md)
- Principles relevant here: 1 "Toys before chores" (avoid "scores, timers or quotas as the reason to do something"); 4 "Cooperation is automatic, not negotiated" ("Prefer: bonuses for different people helping over bonuses for one person grinding"); 6 "Communal world, personal rewards" ("No shared wallets"); 9 "Leave something for the next visitor" ("Growth is computed from elapsed time"); 10 "Slapstick over precision" ("Prefer mechanics that produce funny moments between players over ones that reward precise execution") — [DESIGN.md](../../../../DESIGN.md).
- PLAN status: Phase 5 garden "On hold: crops and farming are cut for now while the design is reworked by hand"; only the mushroom stall is ticked. Phase 6 tide entirely unchecked on main. Visitor bonus ("each different player who waters a plant today adds a growth bonus"), growth from timestamps, harvest-and-launch, personal cosmetic rewards all unchecked — [PLAN.md](../../../../PLAN.md). Stretch list includes a "r/place garden" ("one-seed-per-few-minutes ... slow collective flower mosaic") and water polo — [PLAN.md](../../../../PLAN.md) "Later / stretch".
- Playtest log, entire content of observations: 2026-10-28, "Matias + friends", PeerJS multiplayer on the live site, "Connected and played; 'looks like it's working'." — [docs/playtests.md](../../../playtests.md)
- Playtest-driven change: "Playtest: the 12x island felt empty, and the fun is playing together in a smaller space." Land shrank from 66,600 m² to 23,300 m², hub-and-spoke around a central lighthouse hill, "Spawn to lighthouse is about 85 m (9 s sprint)" — commit `dbcdaae`.
- The 12x growth had just been added in `493ef26` ("Grow the island 12x and add points of interest") the same day — `git log`.
- Cuts: keepy-uppy co-op streak "Cut in a design pass" (`6d5c880`); garden sim removed, "garden design is being redone by hand" (`cee5df0`), crop water helpers trimmed (`b03828e`); hill spring "added code without earning its place" (`42a79e3`) — `git log`.
- Earlier team research ranked "Sandcastle vs Tide" first of twelve ideas — cited in [reports/Ambitious mechanics for Boogle.md](../../ambitious-mechanics.md) (from `docs/research/water-farming-multiplayer.md`). That report recommended the Storm Tide bundle and asked the open question "does a rising tide make friends build together, or make them anxious?"
- History pace: 101 commits on main, almost all 2026-10-28/29, many by Claude agents; contributors include Matias Franco and grantgliner (mushrooms `c8a2729`, Boogler friendship `ea29f9f`) — `git log`.

### Inferences
- The only real player signal favours density and proximity over content breadth, which supports cutting/condensing spread-out content and concentrating shared activity near spawn.
- The design doc already argues against grind and precision; the codebase has drifted from it in two places: the Boogler points ladder (personal, multi-session) and the precision of the shovel toolset.
- The cut keepy-uppy streak was the one prior "together score" mechanic; it was removed without a recorded playtest reason, so its value is unknown rather than disproven.

### Gaps
- No playtest notes on the Boogler, mushrooms, honk chords, ping, digging, or the storm-tide branch. Whether players enjoyed any specific mechanic is undocumented.
- Who else plays (number of friends, typical session size) is not recorded beyond "Matias + friends".

## Which features are fine-control/grind-heavy, isolated solo toys, cosmetic-only or high-maintenance with little play value, and which are the strongest together moments?

### Takeaway
Strongest together moments: the ball (throw/catch/bump/face-plant), honk chords, digging a channel and watching water rush in together, bouncing on mushrooms, riding/being launched by The Boogler. Fine-control heavy: the shovel toolset. Grind-ish/solo: Boogler friendship ladder and dialogue, gift pocket. Cosmetic-only: critters, blob shadows, sky polish, sand-fx, POI scenery. High maintenance for its play value: the water sim (biggest determinism burden) only if players don't use it; the 1,138-line dialogue file.

### Cited Findings
- Shovel: four verbs/slots (toggle, dig, pile, flatten), 5x5 brush with rim, bucket of 1600, rate limit, editable band, aiming ring that "turns red with a reason" — [PLAN.md](../../../../PLAN.md) Phase 3 "Sand fun pass", [src/input.js](../../../../src/input.js) lines 229-232, [src/world/terrain-logic.js](../../../../src/world/terrain-logic.js) line 12.
- Honk chord: "When honks from 3 or more different players land within about a second they play as a chord with a sparkle burst over everyone involved" — [src/features/honk.js](../../../../src/features/honk.js) header.
- Boogler dialogue box "swallows game keys and clicks, takes the gamepad, and frees the mouse pointer" while open — [src/boogler-dialogue.js](../../../../src/boogler-dialogue.js) header. Friendship windows: pets score max 8 per 10 min, gifts max 4 per 20 min, Best friend at 340 pts — [src/boogler-friendship.js](../../../../src/boogler-friendship.js) `RULES`, `LEVELS`.
- Ride/launch is visible to everyone: "every client plays ev on his model whenever that player's evN changes, so friends see the pets, hearts and launches too" — [src/boogler-play.js](../../../../src/boogler-play.js) header.
- Water is the main desync surface: the desync overlay was built to "name the subsystem behind a desync" (`5bb9fa8`), and the water sim's header documents scan-order parity and Gauss-Seidel live updates to stay bit-identical — [src/features/syncsafety.js](../../../../src/features/syncsafety.js), [src/sim/water.js](../../../../src/sim/water.js).
- Cosmetic-only by their own headers: critters ("Local Math.random is fine: nothing here is read by the sim"), blob shadows, sand-fx, splash, sky ("Everything here is cosmetic") — file headers in [src/features/](../../../../src/features/), [src/sky.js](../../../../src/sky.js).
- Windmill sails "are solid: they bonk players and bat the ball about" — [src/pois/windmills/index.js](../../../../src/pois/windmills/index.js) header. Lighthouse: spiral stair to a gallery "From the gallery you can see the whole island" — [src/pois/lighthouse/site.js](../../../../src/pois/lighthouse/site.js).
- Storm-tide crate: "one player moves it at 0.3 m/s, two at 1.8 m/s, three or more at 2.2 m/s" — a built example of automatic co-op with a personal reward — [PROTOTYPE.md on the branch](https://github.com/matiasfr/boogle/blob/prototype/storm-tide/PROTOTYPE.md).

### Inferences
- **Best "together" assets to build on:** ball + impact/feel slapstick; honk chord (the only "different players at once" detector in the codebase, a template for automatic co-op triggers); mushrooms (bounce pads everyone uses; a natural communal garden seed); digging-to-let-water-in as a group spectacle; crate-style "needs 2+ people" objects from the storm-tide branch.
- **Solo/grind:** Boogler talk chapters and the friendship ladder are a single-player visual novel bolted onto a co-op toy. The pocket/gift loop feeds that ladder rather than anything shared.
- **Fine control:** flatten and precise pile/dig aiming are the most precision-demanding verbs; the storm-tide wet-sand slump would make precise building *harder* (walls sag), which is consistent with "slapstick over precision" but works against "building" as progression.

### Gaps
- No frame-time or draw-call numbers per feature were gathered here (`npm run perf` not run).

## Concrete cut / simplify / merge candidates, and keep-and-build-on candidates

### Takeaway
Keep and build on the ball, honk/ping, mushrooms, the shared-state + snapshot plumbing, and a simplified dig. Convert the Boogler from a personal visual novel into a communal island character. Merge gifts into a communal delivery/tally loop. Fix offline time (read `epochMs`) before adding progression. Treat storm-tide pieces selectively: the tide clock and multi-pusher crate fit; wet-sand slumping and the forecast ghost add maintenance and precision for less "together" value.

### Cited Findings
- (Evidence for each item is in the sections above; this section is synthesis, so items are listed under Inferences with pointers back.)
- The plug-in architecture makes removal cheap: features are auto-loaded from `src/features/*.js` and POIs from `src/pois/<name>/`; "Add or delete a folder to add or remove a POI; nothing else on the island changes" — [src/island/index.js](../../../../src/island/index.js) header, [AGENTS.md](../../../../AGENTS.md).
- Prototype flags already gate `feel`, `fish`, `gulls`, `fireflies`, `shadows` room-wide (`?off=...`, `?proto=0`) — [src/sim/proto.js](../../../../src/sim/proto.js). This is a ready mechanism to A/B cuts in a playtest without deleting code.

### Inferences
**Keep and build on (serve together and/or communal progression):**
1. **Ball + slapstick layer** (`src/ball.js`, `impact.js`, `bump.js`, `feel.js`): the core together toy (DESIGN 2, 10). Give Bump a pad slot (`view` or `r3` are free) or fold it into "use" when near an airborne ball.
2. **Honk chord** (`src/features/honk.js`, `src/sim/social.js`): generalize its "N different players within a window" detector into the trigger for communal events (e.g. a chord at a landmark lights it permanently). Cheap, no fine control, rewards being together (DESIGN 4).
3. **Mushroom garden** (`src/sim/mushrooms.js`): the only persisted communal growth. Make it the communal-progression spine: growth from elapsed time (read `epochMs`), "visitor bonus" from *different* waterers (already in PLAN Phase 5), varieties unlocked by island milestones, a garden that can expand beyond the 20x20 patch. Low determinism cost (tiny integer state).
4. **Sync/snapshot plumbing** (`src/world/sync.js`, server): already persists any registered state. Prerequisite work: confirm `VITE_BOOGLE_SERVER` and server deploy; implement offline fast-forward.
5. **Storm-tide multi-pusher crate (M5)**: a working "needs two friends" object with personal reward; fits "together" and "communal world, personal rewards" directly.
6. **Telegraphed tide (M1)** as a shared clock/event rhythm (pure f(tick, seed), zero bytes on the wire). It could gate communal events (king tide delivers flotsam) even if wall-building is de-emphasised.

**Simplify:**
7. **Shovel**: collapse dig/pile/flatten into one context verb (dig where you stand; dump when bucket full or on a held press), drop flatten and the bucket number from the HUD. Frees 2-3 pad slots and removes the main fine-control system while keeping "dig a channel, the sea rushes in" (the spectacle). Persisted terrain stays.
8. **The Boogler**: keep the body (wandering, riding, launch, ball bouncing off him, hearts), and make his bond **communal**: one island-wide friendship that rises when *different* players pet/feed him (DESIGN 4), stored as a registered state. Cut the per-player nosiness/kick/wary bookkeeping and windowed caps. Shorten or gate `src/boogler-lines.js` (1,138 lines) so chapters unlock at communal milestones and play as speech bubbles everyone nearby sees instead of a modal box.
9. **Gifts**: keep fruit knocked down by the ball (a ball verb), drop the 6-slot personal pocket as a Boogler-points currency; instead deliver fruit/flotsam to a shared spot (Boogler, a cart, the stall) that raises a communal tally (PLAN's "Toss them into a cart for an island-wide total").

**Merge:**
10. Gifts + Boogler + mushroom stall into one communal loop: knock fruit/flotsam loose → carry or throw it to the Boogler/stall → island bond / garden unlocks rise. One loop instead of three parallel ones.
11. POIs as **milestone landmarks**: the lighthouse lamp and windmills currently animate on the clock regardless of play. Make them light up/start turning permanently when the island reaches communal milestones (a persisted unlock bit), giving the mainland a reason to exist and visible "what changed since you left" (DESIGN 9).

**Cut or park (low together/progression value or high maintenance):**
12. **Wet-sand slump + erosion (storm-tide M2)**: adds a new hashed per-cell layer, the highest tuning risk, and makes building more precise/punishing ("dry walls ... sag right after you build them, which may feel punishing"). Park unless wall-defence becomes the progression.
13. **Forecast ghost (storm-tide M6)**: a solo, precision-planning aid that clones the water sim each frame and collides with C / D-pad right on main. Cut.
14. **Procedural island generator (storm-tide M11)**: contradicts the playtest finding that a smaller fixed space plays better. Park.
15. **Critters, blob shadows, sky polish**: cheap, flag-gated, local; keep but freeze investment. Fish/gulls reacting to the ball are fine ambient support for DESIGN 2.
16. **Water sim scope**: keep, but resist new water mechanics unless they directly feed communal goals (e.g. water the garden). It is the costliest system to keep deterministic.
17. **Squall (storm-tide M4)**: only worth merging if rain waters everyone's mushrooms at once (PROTOTYPE.md notes rain "does not water mushrooms ... a natural follow-up: rain helping everyone's garden at once"); otherwise cosmetic drama with sim cost.

### Gaps
- None of the above is playtest-validated; the only player evidence is "felt empty" / "fun is playing together in a smaller space" (`dbcdaae`). Prototype flags allow testing cuts room-wide before deleting code.
- The storm-tide branch's mechanics were never logged in `docs/playtests.md`; their feel is reported only by the agent that built them.
