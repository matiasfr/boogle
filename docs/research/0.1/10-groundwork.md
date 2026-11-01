# 10. v2 groundwork: identity, persistence and the first milestones

Read on origin/main @98c072e (2026-10-31). All paths are relative to the repo root. Where this brief disagrees with
briefs 7–9, the code wins, and the corrections are flagged **(correction)**.

---

## 1. Identity and persistence today

### 1.1 Identity

| Thing | Where it comes from | Lifetime | Who trusts it |
|---|---|---|---|
| `selfId` | `rand(10)` once per page load, `src/net/peer-room.ts:79` (`SELF_ID`). It is deliberately not the PeerJS id. | One page load. A reload is a new player. | The host takes it from the DataConnection's `metadata.selfId` (`peer-room.js:435`) and checks only its format, `okId` = `^[a-z0-9]{1,32}$` (`:82`). |
| PeerJS id | The host is `boogle-<room>-host` (`:184`); clients are `boogle-<room>-c<rand>` (`:728`). | One connection. | Transport only. Never in game messages. |
| Name, colour | localStorage `boogle.name` / `boogle.color`, read in `src/player/hud.ts:136-137` and written on Jump in (`src/player/player.ts:96-97`). | Global per browser. | Owner presence `n`, `c` (game-design `multiplayer.md` 8.3). Not in any Lockstep state. |
| Edit author | `submitEdit` adds `p: selfId` (`src/world/sync.ts:199`). The host overwrites it with the real sender: `{ ...edit, p: from }` "never trust a client-supplied p" (`sync.js:174`). | Per edit. | Adapters check `edit.p === room.selfId` in `onApplied` to give effects (such as an item into the hotbar) to the submitter only (`src/world/README.md`, onApplied). |

**Nothing identifies a person across reloads.** No Lockstep state holds a player id. The `p` field lives only in
edits in flight and is never stored.

### 1.2 Personal data (all Local, all client-trusted)

| Data | Key | Scope | Code |
|---|---|---|---|
| Hotbar | `boogle.hotbar` (migrated once from `boogle.pocket`) | global, every room | `src/player/inventory.ts:11-45` |
| Boogler friendship | `boogle.boogler.<room>` | per room | `src/boogler/play.ts:35-47`; published as presence `bg` |
| First-run card seen | `boogle.firstRun.<kind>` | global | `src/features/first-run.ts:20` |

The hotbar is filled in `onApplied` of `gift.take` for the submitter. Nothing on the host knows what anyone carries,
so a tab can throw items it never picked up. That is fine among friends (`multiplayer.md` 8.6, "Trust").

### 1.3 World state

```
 tab A (host)                         tab B (client)                     server (Fly, boogle-server)
 ─────────────                        ──────────────                     ───────────────────────────
 submitEdit ─► stamp(e, from)         submitEdit ─► w:edit ──────────►   (host relays every message)
   validate(e,{from,tick,env})  ◄──────────────────────────────────
   queue at tick+3 ─► w:edits ──────► apply at the same tick, seq order
 every 20 ticks: w:hash {h, hs} ────► compare; mismatch ─► w:need ─► w:snap chunks (7,000 chars)
 every 30 s and on pagehide:          every 30 s, only on a tick whose
   localStorage boogle.world.<room>     hash just matched (verifiedTick)
   PUT /rooms/<room>/snapshot ───────────────────────────────────────►  stored unless stored.tick > body.tick (409)
                                                                         one JSON file per room, 256 KB max
 becomeHost() with no live state: loadPersisted() = newest by tick of (localStorage, GET snapshot, 3 s timeout)
```

- **Save rules** (`sync.js:25-38`, `persist` at `:552-576`): any ready peer saves to localStorage. Only the host PUTs,
  and only bodies under 250 KB. The pagehide PUT uses `keepalive` only under 60 KB (`:570`).
- **Migration** (`becomeHost`, `:604-628`): a host that is already in sync keeps its live state, bumps `seq` by 1000
  and hashes soon. A tab without state, or with an unverified fallback, loads the newest saved copy. With no copy at all
  it sets `world.epochMs = now` (`:626`).
- **Versions**: per-state `version` + `migrate` (`:150-160`, `:343-356`). A state from a newer build sets `newerSave`,
  and that tab never persists again.
- **The server is live.** `deploy.yml:33` passes `VITE_BOOGLE_SERVER`, and `multiplayer.md` 8.5 names the Fly app.
  **(correction)** Brief 8 calls the snapshot server "unbuilt infrastructure". The snapshot store exists. What is
  shelved is the *server-as-host* plan (`docs/plans/server-host.md:3`).
- **The server trusts any writer.** The PUT checks only the shape and that the tick is not older than the stored one
  (`server/src/server.js:255-280`). `writerId` is the host's `selfId`, kept for debugging.
- **Seed** is the constant 20261028 (`sync.js:64`). `epochMs` is saved and loaded but never read (`multiplayer.md` 8.6).
- **Per-player rate limits do not exist.** `sync.js:51` talks about "the 2-tick per-player op rate limit", but no
  rules module has one (grep `ctx.from` in `src/world/rules/`). New ops that pay out must limit themselves.

---

## 2. Do we need accounts?

v2 puts a player id **into Lockstep state** for plaques, tiers, pity counters and discovery credit. That id has to
outlive a reload, so it can't be `selfId`, and it is the first per-person value the world stores.

| | (a) Random pid in localStorage | (b) (a) + transfer code / QR | (c) Light accounts (magic link, passkey, OAuth) | (d) Per-room claimed names |
|---|---|---|---|---|
| What it is | `boogle.pid`, 10 chars from `crypto.getRandomValues`, matching `okId` | The same pid shown as a code or QR in the pause view. Entering it on another device adopts it. | The server issues a signed token. The pid is the account id. | The name is the key. The first tab to use a name in a room owns its tally. |
| Spoofing among friends | Copy someone's pid from devtools and pour in their name. Harmless: credit only, nothing to steal. | Same: the code *is* the identity (a bearer token). | Hard. The host would need to verify tokens, and a browser host can't keep a secret, so the server has to sign. | Trivial: type "Ana". |
| Clearing browser data | Becomes a new player. The old plaque lines stay under the old name; only your tier restarts. | Recoverable if you saved the code. | Recoverable. | Recoverable by retyping the name. |
| Several devices | Different people. | One person after a 10-second link. | One person. | One person if the names match. |
| Same person, two tabs | Same pid: two avatars, one tally. See 2.1. | Same. | Same. | Same. |
| Privacy | Nickname + random id in the room snapshot on Fly. No PII. | Same. | Email or OAuth subject on our server: a privacy policy, deletion requests, a DB. | Same as (a). |
| Server stores | Nothing new (names ride in the snapshot) | Nothing new | Users table, sessions, email sending or an OAuth app, token checks | Nothing new |
| Effort | S | S (+1 pause card) | L. It breaks "PeerJS only, small and readable" (DESIGN.md:90-95) and pulls in half of server-host.md. | S, but renames orphan credit, and two Sams collide. |

### 2.1 Details that matter whichever option

- **Bind pid like `p`.** The host stamps `e.u = pidOf(from)` from its own table and never trusts an edit's `u`, the same
  way it treats `p` (`sync.js:174`). `p` stays the session id, so every existing `edit.p === room.selfId` check keeps
  working. Two ways the host can learn `pidOf`:
  - **(i) Connection metadata** next to `selfId` (`peer-room.js:578`). It is reliable and arrives before any edit, but
    it changes `src/net/`, and `test:net` needs a new check in `dev/peer-test/`.
  - **(ii) A reliable `w:id {u}` message** sent in `becomeClient` beside `w:need` (`sync.js:631-640`). It is re-sent
    after every migration, stays inside `sync.js`, and is ordered before the client's first edit on the same reliable
    channel.
  - **Lean: (ii).** `room.send` reaches every peer, so every tab builds the `selfId → pid` map and a migrating host already has it. Presence (`u`) is unreliable and could lose the race with a first edit. Also publish the pid in
    presence as `u` so renderers can map avatars to pids.
- **Names must enter Lockstep.** **(correction)** A plaque `[[pid, pts]]` can't print "Ana" once Ana has gone home,
  and names live only in presence today. Add a small `roster` state, `pid → {name, colorIdx}`, set by `who.set {n, c}`.
  Sanitize with the lobby's own `sanitizeName` (`src/math.ts:13`), keep the last value, rate-limit it, and fire it on
  Jump in and on rename. Pids get a dense index in order of first sight (Uint16). Every other table stores the index,
  never the string, so hashes stay integer folds.
- **Two tabs in one browser** share `boogle.pid`, and with it the stack (section 3). The fix is S: the
  `navigator.locks.request('boogle.pid', { ifAvailable: true })` Web Lock. A tab that can't take the lock plays as a
  session guest pid (sessionStorage) and says "second tab: playing as a guest".

### 2.2 Recommendation

- **First slice: (a), with the Web Lock guard, and the transfer code from (b) designed in but unbuilt.** The pid
  generator accepts an injected value, so (b) is later just a pause-view card plus a text field.
- **Ship (b) when** a playtester changes device or clears data and asks for their tier back. It is about half a day.
- **Move to (c) only on server-host.md's own triggers** (`docs/plans/server-host.md:3-12`): public playtests with
  strangers, or cheating that matters. Add a third: personal unlocks that cross rooms and must survive a cleared
  browser. Accounts only make sense once the server is also the host, because a browser host can't keep a signing
  secret.
- **Reject (d)** as the key. Keep its one good idea as a recovery path (open decision 3).

---

## 3. Where personal progress lives

| Data | Lean | Why |
|---|---|---|
| Plaque tallies, tier | **Lockstep, per room, keyed by pid index.** The tier is *derived*: every tab can compute anyone's tier from the plaques. | Brief 8's design. Deriving it means no `tr` presence field is needed, and the tier can't drift from the plaques. |
| Haul stack contents (count + rare pieces) | **Lockstep, per room, keyed by pid index** (not localStorage, as briefs 7 and 8 proposed) | (1) Pickups are already ops (`pile.take`, `src.take`), so crediting `stack[u] += n` in apply costs nothing. (2) `site.stock` can then validate `n <= stack[u]`, so pours are host-checked and can't be invented. (3) The material is per age, and ages are per room: a global localStorage stack would carry wood logs into a maglev room. (4) No two-tab duplication. (5) It survives reload, cleared storage and device changes along with the pid. The cost is about 500–600 ms before a pickup counts (3-tick DELAY plus 1.5–3 ticks of client lag), which is hidden because the pieces are still flying to you (Local). |
| Pity counters, rarity rolls | **Lockstep per pid**, rolled in `apply` with `mulberry32` seeded from `(world.seed, a take counter in state)` | Never per-peer counters (AGENTS.md, "Don't"). Rolling in `apply` also makes the rolls replay-tested. |
| Discoveries + finder credit | **Lockstep** bitset + finder pid index (+ co-finders within 10 m, listed in the op and checked by the host) | Brief 8, section 5. |
| Rare finds you keep (on your back, figurines) | Laid into the track: Lockstep. Carried: part of the stack state. | Same reasons as the stack. |
| Earned cosmetics you wear everywhere (hats, mini-game knacks) | **localStorage**, global, + presence for what you wear | DESIGN.md principle 6. Cross-room by nature, and nothing in the sim reads them. |
| Hotbar (toys) | Unchanged: Local, global | Toys stay toys. Material never enters the hotbar. |
| Server profile | **None in v2** | Revisit with (c). |

**Snapshot budget: aim for 60 KB, not 250 KB.** **(correction)** The pagehide upload only gets `keepalive` under
60 KB (`sync.js:570`). Over that, the last save before a tab closes is best effort, and the 30 s periodic save becomes
the backstop. Today's fixture is 16 KB (`test/fixtures/snap-pre-version.json`). Brief 8 estimates about 5 KB for v2's
new state. Hold per-pid tables to about 64 B per player, cap the roster at 256, and prune emitter taken-sets by age.

---

## 4. Groundwork milestones (in order)

Each milestone is one or more PRs that leave `main` green. **The full conversion is milestone 1. After it, every
later milestone ships to a live room with mixed builds**, so the rules go back to "additive only, append to `RULES`".

### M1. Clean break: new world namespace, retire what conflicts (M)

- **How.** Add `worldRoomId() = 'w2-' + getRoomId()` and use it for the room and for `attachWorld`
  (`src/netplay/net.ts:284`, `:304`). That one change moves:
  - the PeerJS host id (`peer-room.js:184`),
  - the localStorage key (`sync.js:549`),
  - the server snapshot key.

  Old tabs never meet v2 tabs: they keep their own room until `updates.js` reloads them. That makes the cut **free of
  mixed builds**. It also avoids a trap: a reset world restarting at tick 0 under the old key would get **409 forever**
  from the server's stale-tick rule (`server.js:270`). The URL `?room=` and the pause title (`pause.js:48`, `:249`)
  keep the plain name. A boot step deletes the old `boogle.world.<room>` keys.
- **Retire, in the same commit (safe only because of the namespace):**
  - The `terrain` and `water` stub states (`src/world/rules/terrain.js`, `water.js`). They exist only for old saves.
  - `proto` (`src/sim/proto.js`, `rules/proto.js`, `src/adapters/proto-flags.js`). SETTLED says no prototype flags, so
    hard-wire `feel`, `fish`, `gulls`, `fireflies` and `shadows` on (the 5 files listed by `grep proto.on`).
  - The `test/fixtures/snap-pre-version.json` load test. Replace it with a v2 fixture captured after M4.
  - `docs/game-design/prototype-flags.md`.
- **Keep:** `mushrooms` (a toy, and a bounce up to monorail balloons), `gifts` (fruit, frisbee perch, thrown things),
  the hotbar, the Boogler.
- **Lean: gifts keeps its version-0 format.** Its legacy fields (`washed`, `nextWash`, `SRC.SHORE`; `src/sim/gifts.ts:9-16`)
  could go in a v1 format, but it isn't worth the churn in M1.
- **Result:** `RULES = [mushrooms, gifts]` and the doors open for appending.
- **Files:** `net.js`, `rules/index.ts`, the retired files, test fixtures, `multiplayer.md` 8.3–8.5, the `rules/README.md`
  modules table.
- **Tests:** `check:full`. Update `world-snapshots.test.mjs` and `world-replay.test.mjs` (fewer modules).
- **Risks:**
  - Everyone loses mushrooms and the Boogler friendship key unless it stays on `getRoomId()`. Lean: let it stay.
  - Any bookmarked `?room=` still works.

### M2. Stable pid + roster (M)

- **Pid source:** `src/player/identity.js` (new): `boogle.pid`, the Web Lock guard, and a guest fallback.
- **sync.js:** `w:id` message; the host's `selfId → pid` map; stamp `u` next to `p`. Edits from a peer with no known pid
  are rejected (it re-sends `w:id` on reconnect). Local mode uses its own pid.
- **New rules `roster`:** op `who.set {n, c}`; state `[[pid, name, c], …]` in index order; API `indexOf(pid)` and
  `nameOf(idx)`.
- **Presence `u`** (`addPresenceField`).
- **Kind:** Lockstep (roster) + Owner (`u`) + a sync-level wire change.
- **Tests:**
  - `test/roster.test.mjs`: round-trip, hash, name sanitizing, cap.
  - `world-sync.test.mjs`: the host ignores a client-supplied `u`, and `u` survives a host migration.
  - A `dev/peer-test/` check if option (i) is chosen.
  - `check:full`.
- **Risks:**
  - The race between `w:id` and the first edit after a migration. Held edits are released after `becomeClient`, so send
    `w:id` before `releaseHeld`.
  - The test helper `test/helpers/net.mjs` needs pids.

### M3. Ground piles (S–M)

- **Files:** `src/sim/piles.js` + `test/piles.test.mjs`; `rules/piles.js`; adapter `src/adapters/piles.js` (hands and
  the stack read it).
- **Ops:**
  - `pile.drop {i, j, k, n}`: k is the material kind; it merges into a pile of the same kind within 2 cells.
  - `pile.take {id, n}`: partial takes allowed; the result is `{kind, n}`.
- **Limits.**
  - Integer counts, Uint16.
  - A per-pile cap of 64. Over it, a new pile spawns beside it.
  - A room cap of 128 piles, **separate from gifts' `MAX_ITEMS = 48`** (`src/sim/gifts.ts:8`).
  - When full, merge into the nearest pile of that kind instead of failing, so nothing is ever lost.
  - No ageing: nothing decays (SETTLED).
- **Invariants:** total units are conserved apart from drops and takes; ids are unique; caps hold.
- **Replay generators** for both ops.
- **Risk:** piles merging changes ids under a player who is walking toward one. The adapter re-targets by cell.

### M4. Haul stack (M)

- **Files:**
  - `rules/stacks.js`: state `stack[idx] = {k, n, rare: [...]}`.
  - Credit happens inside `pile.take` and `src.take` apply, via `rules.stacks.add(u, k, n)`, so `stacks` registers
    **before** `piles` and `sources`. Since M1 empties `RULES`, choose the order deliberately:
    `roster, stacks, piles, sites, sources, bank` (runs are not a module: their `t0` lives in `sites`, M7).
  - Op `stack.spill {i, j, n}` moves units to a pile (a jump past the soft cap; Owner decides, Lockstep applies).
- **Local:** `src/features/haul-stack.js` draws the wobble mesh, the predicted count and the spill animation.
- **Owner presence** `st` for the sway phase, only if remote stacks need to wobble in sync. Remote counts come from
  Lockstep.
- **No control slot.** Pickup is walk-over or the existing Interact button (`registerInteractable`, AGENTS.md). Pouring
  is walking into a ring. Neither needs a `registerAction` (`src/player/controls.ts:1-40`).
- **Tests:** add, spill and conservation; the soft cap is a visual and spill rule, never a reject.
- **Risk:** latency feel. Keep the Local fly-in animation as the instant feedback.

### M5. Work sites + plaques (M)

- **Files:** `src/sim/sites.js` + test; `rules/sites.js`; adapter + `src/features/work-sites.js`.
- **Static layout:** a preset route as JSON (`src/world/route.json`), read like `land.layout`.
- **Op `site.stock {s, ring, n}`.**
  - Validate: `n <= stack[u].n`, the right material for the age, and the site is open.
  - Apply: move units from the stack to the ring, add `floor(n·100·SCALE / cost)` points to `plaque[s][u]`, and keep
    the remainder per pid, so integer rounding never loses credit.
  - Because the stack is in Lockstep, the adapter needs no inventory bookkeeping.
- **State:** per site, the stock in each ring, plus plaque rows `[[idx, pts]]`.
- **Tier:** a pure function of the summed points (`src/sim/tiers.js`).
- **Invariants:** stock equals the sum poured minus what runs consumed; the sum of plaque points equals the normalized
  stock.
- **Risk:** proximity to the ring isn't checked by the host (reach is unchecked everywhere today, `multiplayer.md` 8.6).
  Accept it.

### M6. Sources (M)

- **Files:** `src/sim/sources.js` + test; `rules/sources.js`; adapter.
- **Static layout:** trees, boulders and so on, from `land.layout` extended. Trees are already there (`land.layout.trees`).
- **State:** `Uint8 charges[]`.
- **Op `src.take {id}`:** decrements a charge. The result `{k, n}` goes straight onto the taker's stack. Overflow past
  the haul cap drops as a pile.
- **Refill:**
  - **R1:** `rules.sites` calls `rules.sources.refillAge(age)` when a section completes. `sites` comes before
    `sources` in RULES, so sources can't import from it; instead sites exposes `onSectionDone(fn)`, which sources
    subscribes to at install.
  - **R2:** a seeded tick every 200 ticks picks an empty source with `mulberry32(seed ^ tick)`.
- **Palm shake:** today's palm shake (`fruit.drop`) and logs need one gesture. Lean: the interactable submits both
  ops; fruit stays the toy.
- **Risk:** source arrays grow per age. Store charges only for the current age's sources.

### M7. Scripted runs (S)

- **Files:** `src/sim/scripted-run.js` + test. This is a pure helper, not a rules module.
  - `runAt(script, t0, tick)` returns `{phase, progress /*0..1000 int*/, done}`.
  - The script is integer keyframes.
  - Lockstep-safe (`+ - * /` only), like `src/sim/sky-clock.ts`.
- **Visuals** read `src/netplay/shared-time.ts:17` for a smooth fractional tick.
- **The machine run:**
  - Op `site.run {s}` (anyone, when stocked) stores `t0` in the site state.
  - An `onTick` in `sites` completes the section at `t0 + script.len`: it lays the track, fires R1 and awards 5 points
    to the starter.
- The same helper drives stateless emitters (sparks, balloons) with a per-window taken-set.
- **Risk:** a late joiner mid-run. The snapshot carries `t0`, so it is fine by construction.

### M8. Offline helper bank (S–M, needs sync.js and `check:full`)

- **(correction)** `setEnv` facts are validate-only (`src/world/rules/README.md`, "ctx.env"), so the bank can't read
  `env.elapsed` in apply, as brief 8 implies.
- **The mechanism:**
  1. On `becomeHost` from a save (`sync.js:624-627`), the host computes
     `gap = now − (epochMs + tick·TICK_MS) − bank.creditedMs`. This works because ticks don't run while nobody
     hosts, and `epochMs` is the wall time at tick 0. The total keeps growing across every gap, so `creditedMs`
     subtracts what has already been banked.
  2. It calls `setEnv({ gapMs: gap, hostSelf: room.selfId })` and submits `bank.wake {ms: gap}`. Right after, it
     calls `setEnv({ gapMs: null })`.
  3. Validate: `ctx.from === ctx.env.hostSelf` and `e.ms === ctx.env.gapMs`. A missing env key throws, which rejects
     the edit.
  4. Apply: `credit = min(ms, cap)` turned into helper output for the current site's Track ring, capped at one section.
     Then `creditedMs += ms`.
- **Why the guards.** Every stamped edit is broadcast in `w:edits`, so without the `from` check and the cleared
  `gapMs`, any client could replay the payload and bank twice.
- **Keep `creditedMs` in the hashed `bank` state, and don't mutate `world.epochMs`.** `epochMs` is in the snapshot
  (`sync.js:324`) but not in the hash: `combine` folds only state hashes (`:367-370`).
- **Risks:**
  - Host clock skew. Clamp at 0, and the cap absorbs the rest.
  - The sky clock is a function of `tick`, not `epochMs`, so it doesn't jump. Check `src/render/sky.ts:328`.
  - Hidden-host gaps (background catch-up is capped at 5 s) count as offline. That's fine.
  - This finally meets principle 9 (DESIGN.md:43) and PLAN Phase 5, "Growth from timestamps" (`PLAN.md:116`).

### M9. Snapshot budget check (S)

- Add `test/world-size.test.mjs`. It fills every state to its caps (256 roster entries, every site's plaques, every
  pile and taken-set) and asserts the serialized snapshot is under 60 KB.
- Report the size in `worldStatus()` so telemetry can watch it.

**Sizes:** M1 M, M2 M, M3 S–M, M4 M, M5 M, M6 M, M7 S, M8 S–M, M9 S. M1–M5 are the minimum for a pour-and-plaque
playtest (M7 is small and can ride along). M2 is the only milestone that touches `sync.js`'s wire; M8 is the other
`sync.js` change.

---

## 5. Open decisions for the designer

1. **Identity for the first slice.**
   - (a) A pid in localStorage.
   - (b) (a) + a transfer code now.
   - (c) Accounts.
   - **Lean: (a)**, with (b) when someone asks.
2. **Where the stack lives.**
   - (a) Lockstep per pid per room.
   - (b) localStorage + presence (briefs 7 and 8).
   - **Lean: (a)**: host-checked pours, no two-tab duplication, and stacks stay per room.
3. **Recovery after clearing data.**
   - (a) None: a fresh tier, and old plaque lines stay.
   - (b) "That's me" claim: a new pid can merge an *absent* roster entry's tallies (`who.claim {idx}`, allowed only
     when that pid isn't in the room, once per day). Spoofable, and harmless among friends.
   - (c) Transfer code only.
   - **Lean: (c)**, with (b) as a nicety if (c) is never used.
4. **The clean break.**
   - (a) A namespace bump (`w2-`) plus retiring proto, terrain and water.
   - (b) Keep the namespace and bump every state's `version` with wiping migrations.
   - **Lean: (a).** (b) leaves mixed v1/v2 rooms and the server's 409 trap.
5. **What leftover stack material does at an age change.**
   - (a) It pours itself into the last site automatically.
   - (b) It converts to the new material at a fixed rate.
   - (c) It stays as a "legacy" stack you can only drop.
   - **Lean: (a).** It credits the plaque, so nothing is lost, with one material on your back.
6. **Do names in snapshots need a "forget me"?**
   - (a) No: nicknames only.
   - (b) An op that blanks your roster name.
   - **Lean: (a) now**, (b) before any public room.
7. **Second tab in the same browser.**
   - (a) Guest pid (Web Lock).
   - (b) The same pid, two avatars, one stack.
   - **Lean: (a).**
8. **Rate limits.**
   - (a) Add a generic per-pid op budget in `sync.js` `stamp`.
   - (b) Rely on state checks (stacks bound pours; charges bound takes).
   - **Lean: (b)** for v2's ops. They are self-limiting once the stack is in Lockstep. Fix the stale comment at
     `sync.js:51`.
