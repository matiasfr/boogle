> **Status: planned (2026-11-09).** One implementer (Opus), one sitting, or two jobs split after step 6 (see "Size and
> split"). Base: `origin/main` at `ccaab6b4` or later. No `WORLD_NS` bump. Must land before place-retirement D1.

# Playtest jump-ins

## Goal

The owner opens a link such as https://boogle.club/?from=hook-earned, or picks a stage from a menu, and lands on the
live site in a new private room that the server has seeded at that stage of progress. A friend joins through the
room's invite link. Nothing touches the shared `boogle` world or its saves, and "From the beginning" stays one tap
away.

Owner, 9 November: "We should also make sure there's a system for playtesting where we can jump in to certain levels
of progress and test certain segments without me having to start everything from the beginning, although that will be
useful sometimes." (Recorded as a requirement in [decisions](../decisions.md#process).)

**Principles served.**
- **How we work: playtest constantly.** A segment can be played in minutes instead of after an hour of route.
- **8. Enjoyable alone and together.** A seeded room is an ordinary room, so a friend joins it with the invite link.
- **9. Leave something for the next visitor.** The shared world is never seeded, reset or written by this feature.
- **Clear authority** and **Server hosts every room.** The server builds and writes every seed and enforces every
  guard. The client only asks.

Nothing bends.

**Sources.**
- Owner calls: "Nothing waits for a playtest", "Pick and log, don't ask", "No old builds in development", "Compare to
  standard engines", "The Mac and mobile are the targets".
- Decisions: Controls, **2026-11-02, a return goes straight in, and you start fresh from the pause menu** (Start fresh
  resets the person, not the world), and **Get unstuck … invite links wait** (the Room page's Copy invite link is
  what exists today).
- [place-retirement](place-retirement.md) D1c, which deletes `src/debug/dev/fixtures.ts` "since production setups are
  `--rail-seed`".
- [glider-b-home-flow](glider-b-home-flow.md) (on `claude/glider-b-plan`), step 5, which adds the `glide-earned` seed at
  `WORLD_NS` v23.

**Research.**
- [dev-menu-plan](../research/dev-menu-plan.md). This plan uses three of its precedents:
  - Source's `sv_cheats`: the authority that executes enforces the gate, so the server, not the page, decides what
    may be seeded.
  - Unreal's BugIt: named, returnable positions, which become the landing spots.
  - "Keep cheats in disposable tests": every jump-in is a fresh private room.
- [sharing-and-joining](../research/sharing-and-joining.md), recommendations 1 and 2. A link beats a code, so the entry
  is a URL, and a friend gets in with the existing invite link. The default room is public, so the shared room can
  never be a seed target.
- [returning-player](../research/returning-player.md). Starting over resets the person, not the world. "From the
  beginning" makes a new world and leaves your identity alone; Start fresh stays the way to become someone new.
- [playtest-telemetry](../research/playtest-telemetry.md), recommendation 1 (a handful of signals tied to a question).
  The session gets one new field, `seed`.

**Standard engines.** Unreal maps take URL options (`open Map?Key=Value`, parsed in `AGameModeBase::InitGame` with
`UGameplayStatics::ParseOption`), and a QA build's chapter select usually loads a save slot through the normal
`USaveGame` path. Unity and Godot leave this to the game: a debug menu loads a save through the same serializer the
game uses. Boogle follows that shape: a URL option picks the start, and the seed is a real save loaded by the server's
normal recovery path, with no parallel skip code.

Boogle departs in one place. Its seeds are not authored save files kept in the repo. The server builds them from
accepted actions through the real rules. Committed saves would break at every `WORLD_NS` bump, and the "No old builds"
call forbids migrating them. The build already exists: it is the `--rail-seed` path.

## Design

### What exists and what moves

`--rail-seed <stage>` (`dev/look/rail-seed.ts`) builds a railway world from accepted sim actions. It uses the builders
in `test/helpers/railway-q2.ts`, `railway-trains.ts` and `railway-works.ts`, driven through `test/railway-live.ts`'s
read-only live view. It then saves the world through a real `createRailwayWorldHost` into a local data directory.
`npm run checkpoints` times the builds on the M1 Max:

| Stage | Build time |
| --- | --- |
| `awake` | 0.1 s |
| `q1-done` | 2.4 s |
| `hook-earned` | 2.8 s |
| `q5-done` | 5.0 s |
| `trains-on` | 5.2 s |
| `crossing-done` | 5.7 s |

These are synchronous CPU work.

The production server image (`server/Dockerfile`) copies only `server/src`, `src/world`, `src/sim`, `src/ecs` and two
`src/net` files. It cannot import `test/`. The production VM is `shared-cpu-1x` with 512 MB (`server/fly.toml`), so a
5 s build on the live process would stall every room's 60 Hz step, the shared `boogle` room included. Shared-CPU
throttling makes repeated builds worse.

**Decision: the builders move into `src/sim/`, the save path moves into `server/src/seeds/`, and the production image
builds the stages at image build time.** Taking each part in turn:

- **Builders, in `src/sim/`.** They are pure sim drivers that use accepted ops only, so they belong with the sim and pass
  its determinism lint. The test helpers become re-exports, so ~20 importers keep working unchanged.
  - `src/sim/railway-live.ts`: `test/railway-live.ts` moved as-is (the live view over an E world). `node:assert` is
    replaced by a local `need(cond, msg)` that throws `Error`. `test/railway-live.ts` becomes
    `export * from '../src/sim/railway-live.ts';`.
  - `src/sim/railway-seeds.ts`: `railway-q2.ts`'s and `railway-trains.ts`'s builders (`act`, `advance`, `logs`,
    `rails`, `railwayAtQ2`, `railwayAtQ4`, `railwayAtQ5`, `railwayAtTrains`, `type World`, `type RailSeedStage`,
    `TRAIN_STAGES`, `type TrainStage`). It also takes the per-stage dispatcher that is now inline in
    `writeRailSeed`, as:
    - `export const SEED_STAGES`: every stage `rail-seed.ts` accepts today, in route order (30 ids);
    - `export type SeedStage = (typeof SEED_STAGES)[number]`;
    - `export function buildSeedWorld(stage: SeedStage): World`.
  - `src/sim/railway-seed-works.ts`: `railway-works.ts`'s builders (`chopTo`, `advanceWorks`, `railwayAtWorks`,
    `WORKS_STAGES`, `type WorksStage`). It is a separate file only to keep each under ~250 lines.
- **Host save path, in `server/src/seeds/build.ts`:**
  `export async function buildSeedDoc(stage: SeedStage): Promise<{ tick: number; data: unknown }>`. This is
  `writeRailSeed`'s host half, unchanged:
  1. a temp store under `os.tmpdir()`;
  2. `createRailwayWorldHost({ roomId: railwayRoomId('seed'), tick: false, pidOf: () => 'a' })`;
  3. step it past `w.t`, `whenDurable`, load the built snapshot with `railwayCheck`, `touchAll`, and close with save;
  4. read the doc back, delete the temp directory, and return `{ tick, data }`.

  The recovery envelope holds `version`, `namespace`, `catalog` and `checkpoint`, with no room id, so one doc serves any
  room under the same `RAILWAY_PLAY_NS`. `dev/look/rail-seed.ts`'s `writeRailSeed(dataDir, room, stage)` becomes
  `buildSeedDoc` plus `store.write`. Look, playthrough and checkpoints keep one path with the server.
- **Production builds nothing at runtime.** `server/src/seeds/prebuild.ts --out server/seeds` runs as a `RUN` line in
  `server/Dockerfile`, after the source `COPY` lines. It writes `server/seeds/manifest.json`
  (`{ ns: RAILWAY_PLAY_NS, stages: [...] }`) and one `<stage>.json` per **offered** stage (the `JUMPS` catalog below,
  about 11). That is roughly 30 s on the image builder, not on the VM.
  - The server loads a prebuilt doc lazily and caches it in memory per stage (well under 1 MB in all).
  - Anywhere without a prebuilt doc (local `npm run dev`, look stacks, `test:net`, server tests), the server builds on
    demand in a `node:worker_threads` worker (`server/src/seeds/worker.ts`, the `review-image-worker.ts` pattern), one
    at a time, then caches.
  - Production sets `JUMP_BUILD=prebuilt` in `fly.toml`. A stage with no prebuilt doc is then refused (503), never
    built on the VM.

### The stage catalog (owner-readable)

`src/world/railway-jump.ts` is headless. The game imports it, and so does the server, since the image copies
`src/world`. It imports `type SeedStage` (erased, so no builder code reaches the client bundle) and the layout constants
for landings.

```ts
export type Jump = {
  stage: SeedStage | 'start';
  label: string; // owner-readable, shown in the menu and in playtest summaries
  line: string; // one short line under the label
  land?: { x: number; z: number; yaw?: number }; // metres; omitted = the usual spawn
};
export const JUMPS: readonly Jump[];
export const jumpOf: (stage: string) => Jump | undefined;
export const JUMP_ROOM_RE = /^[a-z0-9-]{1,15}-[a-z0-9]{6}$/;
export function jumpRoomName(stage: string, suffix: string): string; // `${stage.slice(0, 15) minus trailing -}-${suffix}`
/** POST /jump (wire shape). */
export type JumpRequest = { stage: string; ns: string };
export type JumpReply = { room: string; stage: string };
/** `seed` on GET /rooms/:id/host, and the playdata session's `seed` field. */
export type RoomSeed = { stage: string; at: string };
```

The room name is readable, `hook-earned-k3x9qa`. That puts the stage in the Room page, in the invite link and in every
playtest summary for free. `jumpRoomName` keeps the name at 22 characters or fewer, so `railwayRoomId` never hashes it
(`rail-v22-` plus 22 is 31). `boogle` can never match `JUMP_ROOM_RE`, because it has no `-xxxxxx` suffix.

Proposed rows, in route order (designer review: labels, which stages and landings):

| Label | Stage | Line | Lands at |
| --- | --- | --- | --- |
| From the beginning | `start` | A fresh world, nothing built | the usual spawn |
| Just woke | `awake` | The track layer is awake at Home | the usual spawn |
| Line two begins | `q1-done` | Line one done, forge lit, Q1 laid | Q2's station (`LINE2_STATIONS[1]`) |
| Quarry gate | `q3-done` | Q3 laid; the quarry lever is next | beside `LINE2_LEVER` |
| Hook earned | `hook-earned` | The hook shot is yours; Needle Bell waits | Needle Bell's foot (`LINE2_HOOK`) |
| Sea switch | `q4-done` | Q4 laid; the summit switch is next | Needle Bell's foot (`LINE2_HOOK`) |
| Boiler waiting | `q5-done` | Q5 laid; the boiler sits on its pedestal | beside `LINE2_BOILER` |
| Glide earned | `glide-earned` | The glider is yours (after glider B, v23) | Needle Bell's summit (`LINE2_SEA`) |
| Trains running | `trains-on` | The boiler is fitted and both lines run | the usual spawn (Home's station) |
| Pier reached | `q6-done` | Q6 laid to the pier facing Ring Island | beside `PIER_STOP` |
| Works open | `works-open` | Split-rock Works is open; the kiln is cold | beside `WORKS_KILN` |
| Crossing built | `crossing-done` | The Split-rock crossing is complete (J5) | beside `PIER_FRAME` |

- `land` is computed in `railway-jump.ts` as `near(ANCHOR, dx, dz)`: the sim layout is in centimetres on world axes, so
  `x / 100 + dx`. The offset is a few metres onto open ground, chosen and checked with a still per row (step 7).
- A row whose stage is not yet in `SEED_STAGES` on the implementer's base (`glide-earned` before glider B lands,
  `crossing-done` before J5 lands) is left out. The job that adds the stage adds the row (see "Adding a stage").
- Look-only stages (`q2-arriving`, `q5-finishing`, `works-stocked` and the rest) stay in `SEED_STAGES` without a row.
  Locally, `?from=<any seed stage>` works. Production offers only the rows.

**Adding a stage, as content lands.** The header of `src/sim/railway-seeds.ts` and `docs/agents/test-details/bot-segments.md` say:
1. Add the id to `SEED_STAGES` and its case to `buildSeedWorld`, using accepted ops only, as today.
2. If the owner should be able to jump there, add a `JUMPS` row with a label. Its wording goes to the designer, and the
   call is logged in `docs/agent-calls.md`.
3. Run `npm run checkpoints -- <stage>`. With no arguments, checkpoints builds the routed stages and every `JUMPS`
   stage.

The production image picks the new row up at its next server deploy. Nothing is stored or migrated.

### Sync kind and authority, per piece

| Piece | Kind | Authority and API |
| --- | --- | --- |
| The seeded railway world | **Server** (replication; the railway's existing kind) | The server writes the doc into the room's file before anyone joins; the first join loads it through `recovery.read` → `railwayCheck`, the normal path. No new op, state or replicated field. |
| Which stage a room was seeded at | **Server**, room metadata outside the world | Sidecar `DATA_DIR/jumps/<roomId>.json` (`{ stage, at, build }`), written by the server only; read through `GET /rooms/:id/host`'s new optional `seed`. Not in the world, not hashed, not replicated. |
| The request | HTTP (`POST /jump`), not a room message | The client asks; the server validates, names the room, writes it and answers. |
| Landing at the segment | **Owner** (your own avatar) | `onEntered` → `teleport(me.body, …)` once, for the tab that launched the jump (sessionStorage record). |
| The Jump in page, the splash note | **Local** | DOM only. |
| `seed` in playdata | **Local** (telemetry) | One field in the `session` event. |

### The server: `POST /jump`

`server/src/jump.ts` exports `addJump(app, cfg, { store, roomHost, limit })`. `server.ts` calls it with one line after
`addPlaydata`.

The request is `{ stage, ns }`, sent as `text/plain` JSON, so there is no CORS preflight (the `/report` pattern):
`express.json({ limit: '1kb', type: ['application/json', 'text/plain'] })`. In order:

1. Per-IP rate limit, `createRateLimiter({ perMinute: cfg.jumpRatePerMin })`; the default is 6. Over it: 429 with
   `Retry-After`.
2. Shape checks:
   - the body is an object with string fields `stage` and `ns` and no others: anything else gets 400. A `room` field
     gets 400, so a client can never name the room;
   - `stage` is `'start'` or in `SEED_STAGES`, else 400 `unknown stage`;
   - in `prebuilt` mode, `stage` is `'start'` or has a prebuilt doc, else 503 `stage not built`.
3. Namespace: if `ns !== RAILWAY_PLAY_NS`, answer 409 `{ error: 'world changed', ns: RAILWAY_PLAY_NS }`.
4. Daily cap: an in-memory count per UTC day, against `cfg.jumpMaxPerDay` (default 100). Over it: 429.
5. Name and reserve the room, up to three tries:
   - the suffix is six base-36 characters from `crypto.randomBytes`, and `id = railwayRoomId(name)`;
   - the sidecar is written with `fs.writeFile(…, { flag: 'wx' })`. EEXIST means try another name. The sidecar is the
     reservation.
6. `seedRoom(id, stage)`, the guarded core, exported for tests. It refuses (409, sidecar removed) unless:
   - the plain name matches `JUMP_ROOM_RE`, which also excludes `boogle` and every hand-named room;
   - `currentRoomId(id)` holds;
   - `!roomHost().room(id)`: the room is not loaded;
   - `!store.known(id)`: it has no save.

   For `start` it writes no doc. Otherwise it gets the doc (memory cache, then prebuilt file, then worker build if
   allowed) and calls the new `store.create(id, { tick, writerId: SERVER_ID, data, updatedAt: now })`.
   - **`updatedAt` is always stamped now, never taken from a prebuilt file.** The away credit counts from it, so a seed
     joined seconds later gets no credit and a funded job does not finish by itself.
7. Answer 200 `{ room: name, stage }`. Log `jump <stage> -> <id>`.

`store.create(id, doc)`, in `server/src/store.ts`, never overwrites a save. Under `withLock(id)` it:
- answers 409 if the file exists or `knownRooms.has(id)`, and 507 past `maxRooms`;
- writes the temp file, then `fs.link(tmp, final)` (EEXIST → 409), then unlinks the temp file;
- adds the id to `knownRooms`.

The worker build runs one at a time, with at most one more stage waiting (503 `busy` past that).
`resourceLimits: { maxOldGenerationSizeMb: 192 }` caps it, and a 60 s timeout terminates it with a 500. A worker
error is never written. The cache holds a doc only after a build succeeds.

`GET /rooms/:id/host` gains `seed?: RoomSeed`. The handler merges `jumps.seedOf(id)` into `roomHost.status(id)`.
`seedOf` reads the sidecar file and caches hits, so a sidecar written by look's `writeRailSeed` after boot still shows.

On boot, `addJump` deletes sidecars whose id fails `currentRoomId` (an old namespace). `server/src/save-inventory.ts`
adds `'jumps'` to `DIRS`, so the inventory doesn't list it as unknown.

New config in `loadConfig` and `ServerConfig`, with `server/README.md` rows:
- `JUMP_RATE_PER_MIN` (6);
- `JUMP_MAX_PER_DAY` (100);
- `JUMP_BUILD` (`any` | `prebuilt`; default `any`). `server/fly.toml` sets `JUMP_BUILD = "prebuilt"`.

Add `server/seeds/` to `.gitignore` and `.dockerignore`: the image builds its own and never copies a stale local one.

### The client: `?from=<stage>`

`src/boot/index.ts` gets one line before `import('../main.ts')`:

```ts
const from = new URLSearchParams(location.search).get('from');
if (from !== null) await (await import('./jump-in.ts')).jumpIn(from);
```

Nothing heavy has loaded yet, and `flags.ts` and `net.ts` read the room only when `main.ts` evaluates. So rewriting
the URL here needs no reload.

`src/boot/jump-in.ts` exports `jumpIn(stage)`:
- If the address has `proto=`, warn and return: jump-ins open the current game only.
- `jumpOf(stage)` finds the label. An unknown id still goes to the server (a local look-only stage), and the server is
  the judge.
- The splash label reads "Setting up Hook earned…", through a new `splashNote(text)` in `src/boot/splash.ts` that
  sets `.splash-label`.
- `fetch(new URL('/jump', import.meta.env.VITE_BOOGLE_SERVER), { method: 'POST', body: JSON.stringify({ stage, ns:
  RAILWAY_PLAY_NS }), signal: AbortSignal.timeout(90_000) })`.
- **200:**
  - store `sessionStorage['boogle.jump.v1'] = { room, stage }`, for the landing;
  - `history.replaceState(history.state, '', url)`, where `url` keeps the path and deletes `from`, `room`, `fresh`
    and `coop`, then sets `room`;
  - return, and boot continues into the seeded room. A reload re-enters the same room and never seeds again.
- **Failure** never returns. It shows the reason in the splash label, with three buttons (44 px; plain DOM in
  `.splash-foot`):
  - "Try again" (`location.reload()`);
  - "From the beginning" (`/?from=start`);
  - "The shared island" (`/`).

  The reasons:

  | Answer | Splash text |
  | --- | --- |
  | 409 `world changed` | "Boogle just updated. Reload to jump in." |
  | 429 or 503 | "The server is busy. Try again in a moment." |
  | 400 | "There's no jump-in called …" |
  | network | "Couldn't reach the server." |

Joining needs nothing new. The plain room name maps to `railwayRoomId(name)` under the page's own namespace, which the
409 check made equal to the server's. The invite is the Room page's existing **Copy invite link**: `roomInviteQuery`
copies only `v`, `coop` and `room`, so a friend gets `?room=hook-earned-k3x9qa` and never a `from`.

### Mixed builds and `WORLD_NS`

- The server builds or prebuilds every seed from its own `src/sim` and saves it under its own `RAILWAY_PLAY_NS`. A seed
  can't exist for any other namespace.
- The request carries the page's `RAILWAY_PLAY_NS`, and a mismatch is a 409 that the page answers with "Reload". So a
  stale tab never gets a room name it would map to a different id.
- Prebuilt seeds are made inside the image, from the same commit, and the server ignores a `manifest.json` whose `ns`
  differs. The memory cache lives as long as the process, and a deploy restarts it.
- At glider B's v23 bump the image rebuilds every seed for v23, with no change here. Old seeded rooms become old-ns files
  that boot cleanup already trashes, and their sidecars go with them.
- Wire changes are all additions: a new endpoint, an optional `seed` on host status, one playdata field. Under "No old
  builds in development" there are no fences, version checks or migrations.
- This feature never bumps `WORLD_NS`, so it can ship while the owner is mid-session.

### The menu: Pause → More → Jump in

`src/features/jump-in.ts` is eager and small.

**The page** is registered only when `devEnabled` (`src/dev-preferences.ts`; opened once per device with `?dev=1`)
and `productionRailway`:

```ts
pausePages.push({ id: 'jump-in', label: 'Jump in', mount });
```

Pause's More page already lists every registered page (`renderMore`). The page shows:
- A header. In a seeded room: "This room started at **Hook earned**", from `roomSeed()`. In any other room: "Jump in
  opens a new private room. This world stays as it is."
- One `.pause-btn` per `JUMPS` row, label and line, "From the beginning" first. A tap does
  `location.assign('/?from=<stage>')`. The first press needs no confirmation: leaving loses nothing, because the world
  keeps its own progress.
- In a jump room, a last button "Back to the shared island" (`/`).

No new action, pad slot, key or guide row: Pause's existing `pause` action opens it, and pause pages handle focus and
Back.

**Landing** applies to everyone who opened a `?from=` link, not only with Dev:
- `onEntered`: read and delete `sessionStorage['boogle.jump.v1']`.
- If its `room === getRoomId()`, `!isFirstVisit()` (a first visit's fall lands where it lands), and `jumpOf(stage)?.land`
  is set, then:
  - set `y = groundHeight(x, z)` and require `y > SEA` and `|x|, |z| ≤ SOFT_WALL`, else keep the spawn;
  - `teleport(me.body!, x, y + 1.2, z)`, zero the velocity, and set `cam.yaw` if given.

  The same checks as `return-spot.ts`'s `trusted()`, without its PROTO skip.

`src/netplay/room-seed.ts` exports `roomSeed(): Promise<RoomSeed | null>`. It makes one memoized
`GET /rooms/<railwayRoomId(getRoomId())>/host` and returns `seed`, or null. It is used by the page and by playdata.

### Playtest tie-in

- `src/proto/playdata/record.ts` adds `seed: ''` to `sayWho()`'s fields and, once at start,
  `background(roomSeed().then((s) => { seed = s?.stage ?? ''; sayWho(); }), 'playdata seed')`. The session event then
  has 22 fields, under the server's `MAX_FIELDS` of 24, and `sayWho` re-sends only on a change. A friend who joined
  through the invite gets the same `seed`, because it comes from the room, not from the URL.
- In `dev/playtest/summary.ts`, after the `When:` line:
  - `Started: jump-in "<label>" (<stage>), a seeded private room, not a first run`;
  - for `start`: `Started: from the beginning, in a fresh private room`.

  When `seed` is set, the "never found" or missing-beat lines are prefixed with "(seeded: beats before <label> were not
  played here)". `compare()` gets a `Start` row.
- `dev/playtest/cli.ts`'s `printList` appends `from <stage>` to seeded rows, so a jump-in is visible before it is
  downloaded.
- `docs/playtests.md`'s header gets one line: sessions marked "Started: jump-in" began seeded, so read their beats as a
  segment, not a first run.

### Ordering and D1

- **Before D1.** D1c deletes `src/debug/dev/fixtures.ts`, Place's in-game way in. This plan is the production
  replacement, so it lands first.
- **Glider B** (`claude/glider-b-plan`, running) adds `glide-earned`, `q5-shelved` and `q5-arriving` to
  `dev/look/rail-seed.ts`, and so does step 1 here.
  - If glider B lands first, step 1 ports those three cases into `buildSeedWorld` mechanically, and step 3 adds the
    "Glide earned" row.
  - If this plan lands first, glider B's step 5 adds the three cases to `src/sim/railway-seeds.ts` instead, plus the
    `JUMPS` row.

  Tell its implementer either way.
- **Split-rock J5** (running) may edit `test/helpers/railway-works.ts`. Step 1 moves that file, so on rebase apply J5's
  hunks to `src/sim/railway-seed-works.ts`.
- **What D1c then deletes or keeps.** Replace D1c's last sentence ("`fixtures.ts` goes, since production setups are
  `--rail-seed`") with:
  - **Delete:**
    - `src/debug/dev/fixtures.ts`;
    - `src/debug/dev/scenarios.ts` (the dock's Tests panel) and its `registerDockPanel` line;
    - `src/debug/dev/destinations.ts`, whose Start test, Go and Return are Place-only;
    - the TEST badge and `dev-launch` block in `src/debug/dev-menu.ts` (the `fixture()` and `VERSION` imports);
    - `setup`, `fixture`, `test`, `scenario` and `destination` from `dev-preferences.ts`'s `debugFlags`, and its
      `boogle.dev.launch.v1` clear.
  - **Keep:** `src/features/jump-in.ts`, `src/boot/jump-in.ts`, `src/world/railway-jump.ts`, `src/sim/railway-seeds*.ts`,
    `server/src/jump.ts` and `server/src/seeds/`. People's setups are jump-ins; agents' setups are `--rail-seed`, and
    both come from `buildSeedWorld`.

  Step 9 makes this edit in `place-retirement.md`.

## Steps

Branch `claude/playtest-jump-in` from `origin/main`. Each step is one commit and leaves `npm run check` green.

- [ ] **1. Seed builders into `src/sim/`.**
  - `git mv test/railway-live.ts src/sim/railway-live.ts`, then:
    - replace `assert.equal(w.hash(), …)` with `need(w.hash() === …, 'restore: hash')`;
    - add the header "Seed and test driver over an E world; never imported by the game, rules or adapters";
    - write a new `test/railway-live.ts`: `export * from '../src/sim/railway-live.ts';`.
  - Create `src/sim/railway-seeds.ts`:
    - the contents of `test/helpers/railway-q2.ts` and `railway-trains.ts`, with `assert.*` replaced by `need`;
    - `SEED_STAGES`, `SeedStage` and `buildSeedWorld(stage)`, holding every stage branch now in `writeRailSeed`
      (`awake`'s wake and ticks, `q3-stocked`, `q4-stocked`, the arriving loops, `q5-carry`, `hook-earned`,
      `works-stocked`).
  - Create `src/sim/railway-seed-works.ts` from `test/helpers/railway-works.ts` in the same way.
  - The three `test/helpers/railway-*.ts` files become re-exports of the same names.
  - Verify:
    - `npm run lint -- src/sim/railway-live.ts src/sim/railway-seeds.ts src/sim/railway-seed-works.ts` (determinism
      rules; `src/sim` imports only `../ecs/index.ts` and siblings);
    - `npm run check`;
    - `npm run checkpoints -- awake q1-done q3-done hook-earned q5-done trains-on q6-done works-open crossing-done`,
      all ok, with times within 20% of the table above.
- [ ] **2. One host save path.**
  - `server/src/seeds/build.ts`: `buildSeedDoc(stage)`, as in Design.
  - `dev/look/rail-seed.ts`: `writeRailSeed(dataDir, room, stage)`:
    1. `buildSeedDoc(stage)`;
    2. `createStore({ dataDir, maxRooms: 2 })`, `init()`;
    3. `write(railwayRoomId(room), { ...doc, writerId: SERVER_ID, updatedAt: new Date().toISOString() })`;
    4. throw on a status other than 200.

    Unknown stages throw `Unknown railway seed` as today. Its CLI usage is unchanged.
  - `server/src/seeds/prebuild.ts`: `--out <dir>` (default `server/seeds`) and optional stage names (default: every
    `JUMPS` stage, once step 3 exists; until then `['awake']`). It writes `manifest.json` and `<stage>.json` and prints
    each stage's time.
  - Add `server/seeds/` to `.gitignore` and `.dockerignore`.
  - Verify:
    - `npm run checkpoints`;
    - `node server/src/seeds/prebuild.ts --out "$TMPDIR/seeds" awake q1-done`: two files, and their `data.namespace`
      equals `RAILWAY_PLAY_NS`;
    - `npm run look -- --rail-seed q3-done --hud`: the still shows Q3 laid, the same as before.
- [ ] **3. The catalog.**
  - `src/world/railway-jump.ts`, as in Design, with the rows whose stages exist on the base.
  - `land` stays unset in this step; step 7 fills it.
  - `prebuild.ts` defaults to `JUMPS` stages.
  - `dev/look/checkpoints.ts` defaults to `['awake', ...Object.keys(RAIL_FROM), ...JUMPS stages]`, deduplicated and
    without `start`.
  - New `test/railway-jump.test.ts` (fast, pure). It checks that:
    - stages and labels are unique;
    - every stage is `start` or in `SEED_STAGES`;
    - the rows follow `SEED_STAGES` order;
    - `jumpRoomName(stage, 'abc123')` matches `JUMP_ROOM_RE` and is at most 22 characters, so
      `railwayRoomId(name) === `${RAILWAY_PLAY_NS}-${name}``;
    - `JUMP_ROOM_RE.test(DEFAULT_ROOM)` is false.
  - `dev/checks-for.ts`: changes to `src/sim/railway-seeds*.ts`, `src/sim/railway-live.ts`, `src/world/railway-jump.ts`
    or `server/src/seeds/` route to `npm run checkpoints`.
  - Verify: `npm run check`; `npm run checkpoints`, where every row's stage builds.
- [ ] **4. `POST /jump` on the server.**
  - `server/src/store.ts`: `create(id, doc)`, and its line in the header comment.
  - `server/src/jump.ts`: `addJump`, `seedRoom`, `seedOf`, the doc source (cache, then prebuilt, then worker) and boot
    sidecar cleanup.
  - `server/src/seeds/worker.ts`: posts `{ ok: true, doc }` or `{ ok: false, error }`.
  - `server/src/server.ts`:
    - `addJump(...)`;
    - `/rooms/:id/host` merges `seed`;
    - config fields.
  - `server/src/save-inventory.ts`: `'jumps'` in `DIRS`.
  - `server/Dockerfile`: `RUN node server/src/seeds/prebuild.ts --out server/seeds`, after the `COPY src/net` line.
  - `server/fly.toml`: `JUMP_BUILD = "prebuilt"`.
  - `server/README.md`: the endpoint row, the env rows and `DATA_DIR/jumps/`.
  - New `server/test/jump.test.ts`, with a `createService` on a temp dir and `jumpBuild: 'any'`. Cases:
    1. `{ stage: 'q1-done', ns }` gives 200, and:
       - the name matches `JUMP_ROOM_RE`;
       - `rail-…json` exists;
       - a `createRailwayWorldHost` on that store shows `line2.jobs[0].completion === 1`;
       - `GET /rooms/<id>/host` has `.seed.stage === 'q1-done'`.
    2. A second `q1-done` request reuses the cache: an injected build counter (`cfg.jumpBuildDoc` test seam) stays
       at 1.
    3. `seedRoom(railwayRoomId(DEFAULT_ROOM), 'awake')` is refused, and the shared room's file (written first by a
       short host run) is byte-identical afterwards.
    4. `seedRoom` on a pattern-valid name that already has a save gives 409, with the file unchanged.
    5. On a loaded room (`roomHost().room(id)` present) it gives 409.
    6. A `room` field in the body gives 400. An unknown stage gives 400. A wrong `ns` gives 409 with
       `ns === RAILWAY_PLAY_NS`.
    7. With `jumpRatePerMin: 2`, the third request gives 429.
    8. With `jumpBuild: 'prebuilt'` and no prebuilt doc, it gives 503 and no file is written.
    9. `{ stage: 'start' }` gives 200, a sidecar and no room file; a join creates an ordinary fresh room.
    10. A boot over a sidecar named for an old namespace deletes it.
  - Verify: `npm --prefix server test`; `npm run check:full`. Run `docker build -f server/Dockerfile .` if Docker is
    available, and check that the log lists each `JUMPS` stage; otherwise CI's deploy-server build is the proof, so say
    so.
- [ ] **5. The `?from=` link.**
  - `src/boot/jump-in.ts`, the `src/boot/index.ts` line, `splashNote` in `src/boot/splash.ts`, and
    `src/netplay/room-seed.ts`.
  - `test/invite-flags.test.ts`: `roomInviteQuery('hook-earned-k3x9qa', '?room=hook-earned-k3x9qa&dev=1')` is
    `?room=hook-earned-k3x9qa`.
  - New eval `dev/look/evals/jump-in.ts`. It waits for `inspectRailway()` to be ready and asserts:
    - `getRoomId()` matches `JUMP_ROOM_RE` and isn't the look room;
    - `location.search` has no `from`;
    - Q3 is complete and Q4 is not;
    - the host status `seed.stage === 'q3-done'`.

    It sets `__jumpResult` and `__jumpDone`.
  - Verify:
    - `npm run look -- --query from=q3-done --eval dev/look/evals/jump-in.ts --until window.__jumpDone --hud`: the
      eval passes, and the still shows the Q3 stretch built (open it);
    - `npm run look -- --query from=nope --hud`: the still shows the failure text and three buttons.
- [ ] **6. Two players in a seeded room (`test:net`).**
  - `dev/peer-test/ws-railway.ts`: `railwayJumpIn(c)`.
    1. `POST http://127.0.0.1:${c.port()}/jump { stage: 'q3-done', ns: RAILWAY_PLAY_NS }`.
    2. Open two pages, `room=${railwayRoomId(room)}&pid=jump0` and `pid=jump1` with `adapter=1`.
    3. Both mirror `line2.jobs[2].completion === 1` and agree.
    4. `jump0` chops a source (`act(…, 'source')`), and `jump1`'s mirror shows that source one lower.
    5. `c.restart()`; both rejoin with the chop kept, since the seed is an ordinary save.
    6. Check that `rail-…-boogle.json` was not created or changed.
  - `dev/peer-test/ws-run.ts`: call it after `railwayChecks`.
  - Verify: `npm run test:net`, all PASS.
- [ ] **7. The Jump in page and landings.**
  - `src/features/jump-in.ts` (page and landing), as in Design. It uses `.pause-btn` and needs no CSS file.
  - Fill `land` for each row in `railway-jump.ts`.
  - Verify each with a still:
    - `npm run look -- --query 'from=<stage>' --hud` for every row with `land`: the avatar stands on open ground facing
      the segment. Fix the offsets until each passes.
    - The page with Dev on, on desktop and at `--size 375x812`, from the shared room (`--query dev=1 --action` opening
      Pause → More → Jump in) and from a jump room (`--query 'dev=1&from=hook-earned'`), so the header reads "This room
      started at Hook earned".
    - Without `dev=1`, More has no Jump in entry.
- [ ] **8. Playtest tie-in.**
  - `record.ts` `seed`; `summary.ts`, `cli.ts` and `compare()` lines; the `docs/playtests.md` header line.
  - Verify:
    - `npm run check`;
    - write a session file by hand in the scratchpad (a `session` event with `seed: 'hook-earned'`) and print
      `summarize(parseSession(...))` with a short `node -e`: it shows `Started: jump-in "Hook earned"`;
    - the step 5 look run's page console shows the session re-sent with `seed`.
- [ ] **9. Docs.**
  - `docs/game-design/dev-menu.md`: a "Jump in" paragraph with the full links, for example https://boogle.club/?from=hook-earned
    and https://boogle.club/?from=start.
  - `docs/agents/test-details/bot-segments.md` and `docs/agents/tools.md`: where seeds live now, and "Adding a stage".
  - `dev/look/README.md`: one line.
  - `docs/plans/place-retirement.md` D1c: the replacement text from "Ordering and D1".
  - `docs/agent-calls.md`: the calls below as adopted after the designer review.
  - Verify: `npm run check`. Then ship with `npm run ship -- --full`, with step 7's stills in the commit body.

**Proofs, collected.**
- Step 5's look run lands at Q3 complete through `?from=q3-done` on a local stack.
- `server/test/jump.test.ts` cases 3–5 refuse `boogle`, an existing save and a loaded room.
- `npm run test:net`'s `railwayJumpIn` has two players in one seeded room, through a restart.
- `npm run checkpoints` builds every offered stage.
- On boogle.club after deploy, https://boogle.club/?from=hook-earned lands in a new `hook-earned-…` room, and the shared
  room's `/rooms/rail-v22-boogle/host` tick keeps advancing only from its own players. Report this as checked only if it
  was opened.

### Size and split

About 1,000 new lines, plus about 460 moved. One Opus job can do it in order. To run two jobs, split after step 6:
- **A** (steps 1–6): the link works end to end with server proofs.
- **B** (steps 7–9): menu, landings, playdata, docs.

Both land before D1.

## Risks

- **Room safety ("Don't").**
  - *Save or serve unverified state.* Seeds come only from the real host save path, a hash-verified checkpoint, and load
    only through `recovery.read` with `railwayCheck`. A build error, worker crash or timeout writes nothing, and a
    prebuilt file that fails to parse gives 503.
  - *Malformed input must not crash a room.* The body is capped at 1 KB, validated field by field and handled inside
    `try`; the worker runs off the room thread.
  - *Never overwrite a save.* `store.create` uses `fs.link` under the room lock, and `seedRoom` refuses loaded, saved and
    non-pattern ids.
- **The shared world.** The server picks the name and the body can't carry one. `boogle` fails the pattern, and the
  case 3 test pins its file byte-for-byte.
- **CPU on the 1-vCPU VM.** Production builds nothing at runtime (`JUMP_BUILD=prebuilt`). Locally, the worker keeps
  builds off the room thread.
- **Image build time.** Prebuild adds about 30 s to each server image build (CI's `docker build` and Fly's remote
  build) and grows with stages. If it passes about 2 minutes, prebuild only the latest few stages and allow worker builds
  for the rest at low rate.
- **Abuse.** The endpoint is unauthenticated (open call 6). It is bounded by 6 per minute per IP, 100 per day, the
  store's `maxRooms` (507) and `maxHostedRooms` (20 loaded; seeded rooms unload after `roomIdleMs`). Seeded rooms stay
  on disk until the next `WORLD_NS` bump trashes them; each is a small file.
- **What a seeded room shows.** Entering one is a late join into earned progress, so the owner sees the late-join
  flourishes for shared upgrades (hook, pack, glider). That is the real late-join path, and worth seeing. The seed's
  builder accounts `a` and `b` stay in the world with no sessions (the roster allows 256).
- **Hotspots.**
  - `src/boot/index.ts` (the entry) and `server/src/server.ts` get two lines each.
  - `server/Dockerfile` and `server/fly.toml` get one line each.
  - `test/helpers/*` and `dev/look/rail-seed.ts` collide with glider B and J5 (see "Ordering and D1"), and
    `docs/decisions.md` and `place-retirement.md` with the in-flight `ship/matias-franco-542797b`. All are rebases, not
    redesigns.
- **Mixed builds.** All wire changes are additions. The namespace check turns a stale page into a reload.
- **Performance.** No meshes, lights or tick work, so no `npm run perf`. Boot adds one fetch, only with `from`.

## Open questions and calls for the designer review

These are recommendations, not owner answers. Each is logged in `docs/agent-calls.md` once adopted.

1. **Labels and stages.** The twelve rows above, including "Line two begins", "Quarry gate", "Sea switch" and "Boiler
   waiting". These names are mine; the owner gave "Just woke", "Hook earned", "Trains running" and "Works open".
2. **Where the menu lives.** Recommended: Pause → More → Jump in, shown only once Dev is on for the device (`?dev=1`
   once), while `?from=` links work for anyone. Alternatives: show it to everyone, or put it on the Leave page
   (`/menu/`).
3. **Landing.** Recommended: at the segment (the "Lands at" column), not the usual spawn.
4. **"From the beginning".** Recommended: a fresh private room with your identity kept, with no fall unless the device
   is new. Start fresh in More stays the way to become someone new.
5. **Marking a seeded room.** Recommended: the readable room name, `hook-earned-k3x9qa`, plus the page header, and no
   HUD badge.
6. **No sign-in for `POST /jump`.** Recommended: none, bounded as in Risks. A token would make the owner's phone
   harder to use than the risk justifies.
