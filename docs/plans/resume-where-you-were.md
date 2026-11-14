> **Status: proposed (2026-11-14). Design only; nothing built.** Base: `origin/main` at `4a5d2b9ff`. Every step is
> Local (this browser's body and its own localStorage): no server code, no wire field, no op, no saved state and no
> `WORLD_NS` bump. Owner call: [A recent reload puts you back where you were](../agents/owner-calls.md#a-recent-reload-returns-you-where-you-were).

# A recent reload puts you back where you were

## Goal

A player who reloads or rejoins soon after leaving stands where they stood (or at the nearest safe spot to it), anywhere
on the built route, not only on Home island's open ground; after a long absence, or with no remembered place, they
arrive at Home. Serves DESIGN.md 8 (Designed for drop-in, drop-out: "joining, leaving, reconnecting must remain
reliable"). It bends nothing.

## The owner's words (14 November 2026, verbatim)

After playing the whole built route to High Gorge: "I really think if I'm just refreshing my browser in a recent enough
time, I should go back to where I was rather than the town. Because for now that the distances are pretty vast, we'll
want to remember where the player was, I think."

Reading: a player who reloads or rejoins soon after leaving returns to where they stood (or the nearest safe spot to
it), not to Home; Home is where you arrive when you have been away a while or have no remembered place.

## What exists today, and why he landed in the town

Read from the code, not reproduced in a browser (step 1 reproduces it first).

- A return spot is already built and already decided ([2 November, "a return goes straight in"](../decisions-controls.md#d-2026-11-02-a-return-goes-straight-in-and):
  "spawn in where they were", per room). On the live railway it is `src/entities/railway/arrival.ts`: every 5 s and on
  `pagehide` it writes `{ x, z, yaw, ground }` to localStorage `boogle.railway-pose.v0:<railwayRoomId>:<pid>`, and on
  load it restores it once the accepted state, a physics step and the scenery are ready.
- Its safety rule (`createPosePolicy`, `src/place/pose.ts`) accepts only: inside Home island's land or Ring Island's
  ground (`insidePlace`); terrain above 1.6 m; outside building footprints and room plots; and **nothing at all between
  128 m up and the ground**. So a laid deck, a platform, a bridge, the stack line's slab over the sea and High Gorge's
  platforms and stairs are all refused. `docs/game-design/first-run.md` says so ("not a deck, a seat or the water") and
  `place.md` records it as a known "Reload limitation".
- An unsafe capture **erases** the memory (`savedPose = ... ? p : null`, then `null` is written), so standing on a
  deck, riding a train or swimming for 5 s forgets the last good spot as well.
- A body found outside `insidePlace` when it is first placed is sent to the spawn (`atSpawn()`).
- There is no time limit: a spot on Home's ground restores after any absence.
- The route's colliders are resident by distance (`src/entities/route-greybox/index.ts`, `MOUNT.near` 400 m of the
  camera or body), so a spot at High Gorge cannot be validated from Home: its deck is not in the physics world until the
  body is near it.

So everything he played past Home's ground (the trestle, the Railhead, the stack line, High Gorge) was never
remembered, and the walk onto the first deck wiped what was.

## Where the memory lives: this browser (decided)

**Local, in localStorage, as today. The server keeps nothing and the wire does not change.** Reasons:

1. **The body is Owner state.** The server-owned-players work (v40 to v44) moved seats and The Boogler to the server;
   it kept "the body (position, `riding`)" with its owner, and its abuse table lists "Forged position: out of scope
   (movement validation)". The server never places a player: it only reads the `p` each tab publishes
   (`hosted-room.ts` `positions()`). A server-held spot would still be applied by the client to its own body.
2. **So a server copy buys no safety.** A client can already stand anywhere by publishing any `p`; remembering a spot
   locally grants nothing new. The basics the owner's "Don't over-engineer against attackers" call keeps are met
   another way: the stored value is parsed and bounded, and it is only used if this client's own physics finds a
   standable surface there now, the same test a jump-in landing passes.
3. **Only the client knows what "safe" was.** Grounded, swimming, seated, aboard a train or the cart, knocked down:
   none of it is on the server. The server would have to be sent the spot anyway (a new presence field), then keep it
   and send it back.
4. **Reloads mostly follow deploys.** Main auto-deploys and each deploy restarts the server. An in-memory server table
   is lost exactly then; persisting it means a new saved state and a `WORLD_NS` bump. localStorage survives both.
5. **Same reach.** The pid is itself a localStorage value: a different device or blocked storage is a new player either
   way, so the server copy would not follow you anywhere the local one does not.

Compared with engines: Unity Netcode, Unreal and Godot leave a client-authoritative transform's last position to the
owning client or to a save the game writes; the server stores it only where the server owns movement. Boogle's server
does not, so the memory stays with the owner. If movement ever becomes server-validated, the same record moves into the
player's server row then; nothing here blocks that.

**Research:** [returning-player](../research/returning-player.md), recommendation 3 ("survival and sandbox games bring
you back where you logged out; a spawn point is for people with no record"): this plan makes that true for the whole
route. It departs in one place: the owner's "recent enough" adds a time window that research does not have (question
1). [progression-flow-layout](../research/progression-flow-layout.md) ("nobody stranded"): the fallback chain always
ends at a spot a train or a walk leaves from.

## Design

All state below is **Local** (docs/agents/sync.md: "only this tab sees it"): no API, wall clock allowed. Authority: the
player's own tab, as for the body. Nothing is cosmetic-only except the fade. No controls change (no action id, pad
slot, key, touch or guide row).

### The record

Key `boogle.railway-pose.v1:<railwayRoomId>:<pid>` (per room, per player, per world namespace, since
`railwayRoomId` carries `WORLD_NS`). Value:

```ts
type ReturnSpot = {
  x: number; y: number; z: number; yaw: number; // y: the surface stood on (feet), metres
  at: number; // Date.now() when last seen in the room
  ride?: { x: number; y: number; z: number }; // where you were when last seen, if not standing (aboard, seated, swimming, falling)
};
```

No migration: a `v0` value is ignored and removed by the reset list. `ground` is dropped (the surface test replaces
it).

### What counts as recent

- **Window: 30 minutes**, measured from `at` (the last moment this tab was seen in the room: refreshed on every save,
  at least once a minute while playing, and on `pagehide` and `visibilitychange` to hidden) to the load. New Local
  tunable `railway.returnMinutes` in `src/tunables/catalog.ts` (`scope: 'local'`, units minutes, at "next load";
  default 30; 0 turns the return off).
- **Outside the window: Home**, the usual spawn at the village (`atSpawn()`), with the Welcome back card as today.
  The record is left in place and overwritten by the first capture.
- **The paused world does not matter.** A room stops 30 s after its last player leaves and saves; the memory is the
  browser's, so it survives the pause, the save, a server restart and a deploy. The away credit can only add deck
  (a funded job finishes), never remove the surface stood on.
- **Per room.** A spot in one room is never used in another.
- **Wiped by** a room reset, a room replacement or fast-forward, Start fresh and a `WORLD_NS` bump: the existing
  clear list (`src/player/world-reset.ts`) and the namespaced key already do this; the prefix widens to
  `boogle.railway-pose.` so `v0` and `v1` both go.

### What a safe spot is

One test, used both when saving and when returning, so nothing is saved that would not be accepted back:
`standableAt(x, y, z)`: the jump-in landing's `surfaceAt` (a sphere swept down meets a `GROUP.SCENERY` surface within
0.5 m of `y`, and a ray down the centre agrees), with the sweep starting `2 * PLAYER_R + 0.5` above `y` instead of
3 m (room to stand, so a slab under another slab counts), plus: the surface is above the sea (`y > 1.6` on terrain,
any height on a deck), and the spot is outside Home's building footprints and `ROOM_PLOTS`.

**Saving** (every 5 s, and on `pagehide` / hidden):

| You are | What is saved |
| --- | --- |
| Standing: `me.coyote > 0`, not `me.swimming`, not `me.down`, not `aboard()` (`src/physics/platforms.ts`: on a moving deck or in its chair), not seated at a fixed chair, and `standableAt` passes | `{ x, y, z, yaw, at }`, `ride` cleared |
| Anything else (mid-air, falling, swimming, knocked down, on a train, the cart, the track layer's flatbed or the sliding platform, in a chair, inside a room plot) | The last standing spot is **kept**; only `at` and `ride` (your position now) are updated. Never `null` |
| In the first-visit fall, or before the scenery is ready | Nothing is written |

Carrying a footing, the beam, logs or rails changes nothing: the spot is where you stood. A screen over the game (the
garage, the pause view, a shop) does not move the body, so the spot under it is the one saved.

**Returning**, in order; the first that passes wins:

1. **The spot itself**, if `ride` is absent or within 25 m of it (you had only just stepped off or jumped).
2. **A place beside it**: the landing's 1.4 m ring (also used when a friend is standing on the spot), then rings at
   3 m and 6 m.
3. **The nearest halt** to `ride` if present, else to the spot: the two nearest halts in `RAIL_LINES` that are
   standing now, nearest first. This is the answer for a reload on a moving train (you get off at the nearest built
   halt to where the train was), for the cart and the track layer, for a deck that is gone, and for the sea. A halt's
   landing is a checked catalogue landing when `JUMPS` has one within 30 m of the platform (Village, Camp, Quarry,
   Pier, Railhead, Ring Island, High Gorge today), else a probe of rings at 3, 4.5, 6 and 8 m round the platform point,
   taking the highest standable surface between 0.5 m below and 1.5 m above it at the smallest ring (the platform, not
   the rail bed).
4. **Home**, the usual spawn.

Never in water, never mid-air, never inside a collider: each candidate must pass `standableAt` in the live physics
world.

**Because colliders are resident by distance, each candidate is tried in place.** The body is moved to the candidate
and held there (re-placed each frame at `y + PLAYER_R + 0.4`, zero velocity) under the cover; the test runs once the
areas round it report mounted and one physics step has passed (`scenery.ready()` after a `sceneryRebuilt()` from the
mount), or fails after 2.5 s. Worst case (spot, two halts, Home) is under 8 s behind the cover; the ordinary case is
one step.

### What the return looks like

- No fall, no arrival crane, no Act card: those belong to a first visit and are untouched (`arrivalPlan`,
  `src/features/acts.ts`). The Welcome back card stays as it is.
- The loading cover stays up until placement has settled, then lifts as it does today: you are never seen at Home
  first and then moved. If the cover has already lifted when a late candidate settles, a 250 ms fade to black and back
  covers the move.
- Facing and camera yaw are restored; pitch is the landing's -0.14.
- Carried things follow the existing leave rules, unchanged: back logs and rails stay on you through a reload; the
  beam stays yours for `railway.beamGraceS` (3 min) and then lies where you last stood; a chair is freed 1.5 s after
  the socket goes.
- Co-op: nothing new is sent. The friend sees you appear where you return, because that is the first `p` your tab
  publishes after it enters; you are not shown at Home first.

### What does not change

- **First visit**: the card, the fall and the crane (`fallArrival.active` blocks both saving and returning, as now).
- **Jump-ins and the fast-forward** keep their own placement: a jump room lands you at its stage only when there is no
  record for that room, and a replaced room clears the record first, so its landing wins (both as today).
- **Respawn after a fall** and **Get unstuck**: unchanged, except that Get unstuck's "forget the spot" now writes the
  spot it found with a fresh `at`.
- The classic island's `src/features/return-spot.ts` is a different game mode's and is not touched.

### Wire, persistence and mixed builds

No presence field, message, op, replicated row, snapshot or save field. One localStorage key changes version (`v0` to
`v1`), with no migration (dev phase). **No `WORLD_NS` bump**; v45 stays free for the other planned bumps.

### Decided entry, drafted (the last step records it; `npm run decisions` then)

In `docs/decisions-controls.md`, top of "Decided", with its line in "Current rules" and an italic note on the
2 November rule's line ("narrowed 14 November: recent returns only"):

> - <a id="d-2026-11-14-a-recent-reload-returns-you-where"></a>**2026-11-14, a recent reload returns you where you
>   were; a long absence starts at Home** (owner: "I really think if I'm just refreshing my browser in a recent enough
>   time, I should go back to where I was rather than the town. Because for now that the distances are pretty vast,
>   we'll want to remember where the player was, I think."). A player who reloads or rejoins within the return window
>   (30 minutes, `railway.returnMinutes`) stands where they last stood in that room, on ground, a deck or a platform,
>   or at the nearest safe spot: beside it, else the nearest standing halt (also where a reload aboard a train puts
>   you), else Home. After the window, or with no remembered place, you arrive at Home. The memory is this browser's,
>   per room. Narrows [2 November](#d-2026-11-02-a-return-goes-straight-in-and), which had no time limit.

The window and the long-absence rule in that entry are the recommendations of questions 1 and 2 until he answers.

## Steps

Tiers from `npm run models` (withCodex). Nothing here is server, sync, `src/world`, `src/net` or `src/sim`, so no
step is the high-risk Astra row and the independent wire review is not owed; steps 1 to 4 are "implementation of an
approved plan" (Codex, gpt-6.1-sol medium), step 5 is player-visible (implementer on fable medium, then a fresh visual
review on fable medium). Steps 2 and 3 edit `src/player/world-reset.ts`: read `.claude/rules/state-consumers.md`
first. Each step leaves `node dev/ship-check.ts` green. Dispatch as two jobs: steps 1 to 3, then 4 to 6.

- [ ] **1. Reproduce and pin the gap** (sol medium). Add `dev/look/evals/railway-return.ts` on the pattern of
  `dev/look/evals/railway-reload.ts` (a real reload, re-attached by `--until`): in a `?from=gorge-reached` room, stand
  on High Gorge's north platform for 6 s, reload, and report `{ before, after, distance }` on
  `document.documentElement.dataset.railwayReturn`. Expected today: after is the village. No game code changes.
  Verify: the eval's output shows the failure this plan fixes; paste it in the report.
- [ ] **2. The surface test and the record, pure** (sol medium). Create `src/place/return-spot.ts`:
  `type ReturnSpot`; `readReturnSpot(value: unknown, now: number, windowMs: number): ReturnSpot | null` (finite
  numbers, `|x|, |z| <= 5000`, `-50 <= y <= 500`, `0 <= now - at <= windowMs`, `ride` validated the same way, else
  `null`; never throws); `captureReturnSpot(prev, state, now)` implementing the saving table from
  `{ standing: boolean; pos; yaw; standable: boolean }`; `returnCandidates(spot, halts)` returning the ordered list
  (spot unless `ride` is over 25 m away, then the two nearest halts to `ride ?? spot`, by horizontal distance);
  `haltLandings()` built from `RAIL_LINES` platforms (cm to m) with the `JUMPS` landing substituted when one lies
  within 30 m. In `src/place/pose.ts` add `standableAt(x, y, z)` beside `createPosePolicy` (move `surfaceAt` there from
  `arrival.ts`, with a `head` parameter: 3 for jump landings, `2 * PLAYER_R + 0.5` for returns) and
  `standableNear(x, y, z, radii)` (the ring search; highest surface at the smallest ring). Add the tunable
  `railReturnMinutes` (`railway.returnMinutes`, local, default 30) to `src/tunables/catalog.ts`. Widen the clear
  prefix in `src/player/world-reset.ts` to `boogle.railway-pose.`.
  Verify: `test/return-spot.test.ts` (no physics): fresh record kept; expired record `null`; `at` in the future
  `null`; malformed, non-finite and out-of-bounds values `null`; capture keeps the last standing spot and sets `ride`
  while aboard, swimming or mid-air; capture clears `ride` on standing; candidates skip the spot when `ride` is 26 m
  away and put the nearest halt first; `haltLandings()` has an entry for every halt in `RAIL_LINES`. Extend
  `test/railway-arrival.test.ts` (real physics backend, as it does now): `standableAt` accepts open ground, a deck
  12 m over ground, and a slab with another 2 m above it; refuses a spot under a 1 m ceiling, mid-air, and a deck that
  has been removed (after a step); `standableNear` finds the deck 3 m aside. `test/world-reset.test.ts`: a `v1` key is
  cleared.
- [ ] **3. Save everywhere you can stand** (sol medium). Edit `src/entities/railway/arrival.ts`: replace `poseKey`,
  `capturePose` and `savePose` with the record above (`captureReturnSpot`, `standing` = `me.coyote > 0 &&
  !me.swimming && !me.down && !aboard() && !inputState.seated`); write when the spot changes, at least every 60 s, on
  `pagehide` and on `visibilitychange` to hidden; never write `null`; keep skipping while `fallArrival.active` or
  scenery is not ready. Remove the `!insidePlace -> atSpawn()` on first placement only where a return is pending (a
  body with no pending return still goes to the spawn). `getUnstuck` writes the spot it found with a fresh `at`.
  `createPosePolicy.read` and the `ground` sample go; `posePolicy.safe` stays for Get unstuck's ground search.
  Verify: the step 1 eval now shows a `v1` record with High Gorge's coordinates after 6 s on the platform, unchanged
  after stepping onto a train (with `ride` set), and unchanged after 5 s in the sea.
- [ ] **4. Return in place, with the fallback chain** (sol medium). Edit `src/entities/railway/arrival.ts`: replace
  `restorePose` with a small state machine `returning: { list, k, since } | null`: on `loaded`, read the record with
  `readReturnSpot(..., Date.now(), tune.railReturnMinutes * 60000)`; if `null`, today's path (jump landing, else
  spawn). Else for candidate `k`: hold the body at it each update; when `areasSettled(x, z)` and `scenery.ready()`,
  test `standableAt`, then `standableNear` (rings 1.4, 3, 6 m; skipping spots `taken` by a remote); pass: place with
  `land()`'s teleport, restore yaw, finish; fail or 2.5 s: next candidate; list exhausted: `atSpawn()`. Add
  `areasSettled(x, z)`: export from `src/entities/route-greybox/index.ts` a `routeAreasPending(x, z): boolean` (an
  area within `MOUNT.near` of the point not yet mounted) and have its mount call the arrival's `sceneryRebuilt()`
  (through `src/entities/railway/view.ts`, which already calls it on snapshot); Ring Island uses
  `ringIslandNear.mounted` the same way; Home island's terrain is expected to be always resident (the implementer confirms, else it reports through the same call). A jump landing keeps `surfaceAt`
  with `head` 3 and runs only when no record was read.
  Verify: the step 1 eval reports `distance < 2` at High Gorge. New unit cases in `test/return-spot.test.ts` drive the
  state machine with a fake `standable` and clock: first candidate passes; first fails and a halt passes; all fail to
  spawn; a candidate that never settles times out at 2.5 s; an expired record goes straight to spawn. One more eval
  mode (`?mode=train`): reload while seated on a moving train between two halts and land on a platform of the nearer
  one.
- [ ] **5. Nobody sees the move** (implementer, fable medium; visual review, fable medium). Find where the loading
  cover lifts for the railway view and hold it while `returning` is non-null (expose `arrival.settling(): boolean`
  from `createRailwayArrival` and read it where the cover's lift is decided); if the cover has already lifted, play a
  250 ms fade out and in round the placement. Confirm the Act card and crane do not play on a return (they should not:
  `arrivalPlan`). Verify: `/look` stills at the frame the cover lifts, for a High Gorge return and a train return:
  Buddy is on the platform, facing as saved, with no frame at Home; a real-time capture of the lift for the visual
  review.
- [ ] **6. Docs and the decision** (sol medium). Update `docs/game-design/first-run.md` ("Returning visit": decks and
  platforms count, the window, the fallback chain; delete "not a deck"), delete `place.md`'s "Reload limitation" line
  and amend its T1 return-pose sentence, record the Decided entry drafted above with whatever the owner answered, and
  run `npm run decisions`. Add the pick-and-log rows to `docs/agent-calls.md` for anything still unanswered (window
  30 minutes; long absence to Home; a train reload gets off at the nearest halt).

**Checkpoint R (after step 5, before the ship).** The few proofs, once:

1. `npm run look` with `dev/look/evals/railway-return.ts`, three runs: High Gorge platform (returns within 2 m); a
   moving train (a platform of the nearest halt); `railway.returnMinutes` set to 0 (the village).
2. `npm run test:net`: one new case in `dev/peer-test/ws-railway.ts`, "reload returns in place": tab A stands on a
   laid deck, B is in the room; A closes and rejoins with the same pid inside the 30 s pause grace; B's first presence
   `p` for the rejoined A is within 2 m of the deck spot and B never receives a `p` within 30 m of the spawn. (The
   node player has no physics: the case asserts on what A publishes, driven by the same `readReturnSpot` and candidate
   order with a stub surface.)
3. A two-tab look: A reloads at the Railhead's platform while B watches from 10 m; stills from B at A's first frame
   back show A on the platform, and one with B standing on A's exact spot shows A 1.4 m aside.
4. `npm run check` and the first-run bot once, to show the first visit (card, fall, crane, Act 1) is unchanged.

## Level findings

The plan places nothing new in the world: no prop, secret or gate. The level check was not run for it (no planned
positions to give it). What it does choose are return landings, and these are the points for the designer:

- **Checked landings are reused where they exist**: `JUMPS` landings for the Village, Camp, Quarry, Pier, Railhead,
  Ring Island and High Gorge platforms, each already still-checked (playtest-jump-in step 7).
- **Halts with no checked landing within 30 m today** (measured from `RAIL_LINES` against `JUMPS`): Far Head; the
  Railhead's second platform; Stack heads 1, 2 and 3; Bell Rock; Original Island; West landing; Saltpan Halt; Port
  Quay; Canopy Town; Lantern Notch. These use the probe (highest standable surface within 8 m of the platform point).
  Of them only Far Head and the three Stack heads are on the route built so far; step 4's implementer takes a still
  of the probe's result at each of those four and lists it for the designer, who may rule a fixed landing instead.
- **Gating**: a return never opens anything. It only places you where you already stood, beside it, or at a halt
  nearer to where you were than Home is; a halt that is not standing in this room's world fails the surface test and
  is skipped. A reload aboard a train can put you at the halt ahead instead of the one behind (up to half a section
  forward of where the train was): the train was taking you there, and the halt must already be built.

## Risks

- **Room safety ("Don't" list)**: none of the listed breaks applies: no `apply`, no command, no presence field, no
  client-persisted room state (the record is personal placement, not room state), no server import. The stored value
  is validated and bounded on read and cannot throw.
- **Hotspot file**: `src/entities/railway/arrival.ts` (jump landings, Get unstuck and the fall share it). No
  in-flight branch lists it or `src/place/pose.ts` (`npm run inflight`, 14 November). Steps 3 and 4 are one job so
  the file is rebased once.
- **Holding the body while areas mount** is the one new mechanism. If an area never reports mounted the 2.5 s timeout
  moves on; the chain always ends at the spawn, which needs no residency.
- **Mixed builds**: a tab on the old build keeps writing `v0`, which the new build ignores: that tab's next load
  starts at Home once. Accepted (dev phase); no fence.
- **A train or the track layer parked exactly on the saved spot** passes the surface test if its deck is scenery:
  you return standing on it. Harmless.
- **Performance**: one sphere sweep and one ray every 5 s while standing, and a few during a return; one localStorage
  write a minute at rest. No meshes, lights or tick work; `npm run perf` is not owed.
- **Device**: `pagehide` is unreliable on phones, hence the hidden-tab save. Not tested on a device.

## Open questions

1. **How long is "recent"?** Recommended: **30 minutes**, tunable (`railway.returnMinutes`). It covers a refresh, a
   deploy, a crash and a short break; a new sitting starts at Home with the Welcome back card. The alternative is the
   same day (12 hours), which would make almost every return land out on the line.
2. **After a long absence: Home, or the nearest halt to where you were?** Recommended: **Home**, as his reading says:
   it is the hub, The Boogler and the Welcome back card are there, and a train takes you back out. The nearest halt
   would save the ride but starts a new sitting somewhere with no context; it is one constant to change later (the
   chain's step 3 without the window).

No designer fit check is owed (nothing is ported from Place), and no principle is bent.
