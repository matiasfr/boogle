# Dev menu

The shared tuning gate treats `dev=0` as off even alongside `tune=1`; the dock, tuning API, recording, water uniforms and pause behavior use that same visit decision.

Open `?dev=1` once per browser/origin. Water controls and Looks work on Place and crossing; the retired `water=new` parameter is unnecessary. Dev stays enabled across reloads, builds and rooms; nothing is shared with friends or another device. `tune=1` also opens the dock for that visit without enabling remembered Dev. `?dev=0` and **Turn Dev off** override storage, clear only Dev/Water/Looks preview preferences, release input/camera, and reload without debug instrumentation. Game saves and identity remain. Unsupported preference fields are discarded while enablement survives.

The always-visible DEV strip shows the build, Free cam, Return while flying, Report, Tools, Play and Off. Report copies immediately, with visible status and a selectable-text fallback. All tools live in a non-modal dock: left, right, bottom or collapsed, remembered locally. Desktop side docks are at most 300 CSS px wide, with short Water / Camera / Inspect / Perf / Room / Report / Looks tabs and exactly one mounted panel. Tools opens the remembered supported tab or Water. A compact position selector and Collapse remain above it. Info/More holds prose, diagnostics and rare actions; unavailable actions and mutation restrictions stay visible. No backdrop or room pause. Phone/coarse-pointer layouts use a tool selector in the same header row, a short bottom sheet, safe areas and 44 px controls; camera buttons stay outside. Typing/dragging consumes avatar input; clicking or tapping the scene restores game focus. **Play · `for mouse** closes the dock, returns the camera and takes pointer lock when supported.` (the tilde key) frees the mouse and keeps it free (scene clicks don't re-lock) until pressed again, which takes the lock back; Esc also releases the mouse without opening Pause, but a second Esc opens Pause; Menu still opens Pause, whose Dev entry opens the dock.

The separate-page island picker (Starting area, Lower home island, Current home island) was removed with classic home (6 November): the classic island is in the same world. Island reloads never grant player teleport authority.

1. **Water** mounts the production-water panel in the dock. Fresh groups start collapsed. Search matches group names, labels and binding keys, temporarily expanding results without changing remembered open groups. Each individual control has a star to move its live row into Pinned at the top; known pinned keys and open-group names persist in `boogle.dev.water-ui.v1`, while search stays transient. Numeric controls place label, range and number inline; colors and bloom enable remain native controls, and AgX look selection stays in Post. Only changed bindings show a small reset; group/global resets under More skip unchanged setters. Changed counts remain visible. More holds explanatory copy, rare Quality controls, copy/paste and unavailable controls. Both Dev and `tune=1` visits create editable uniforms at load and use this dock. Visits without tuning offer **Reload with tuning**. Edits auto-save; closing/switching/collapsing retains appearance, and Dev/tuning visits restore supported settings even when collapsed unless a named Look takes precedence. Unsupported saved keys/values are dropped; explicit pasted JSON stays strict, including bloom's 0/1 toggle. Off clears the exact Water UI key alongside Dev-owned appearance preferences.
2. **Free camera** is a global Local session toggle, independent of dock/tool visibility. Scene drag looks; WASD moves, Space/Shift moves up/down, held touch buttons move, and pad sticks move/look with LB/RB down/up and B Return. Speed is adjustable. It suppresses avatar movement/actions before gameplay input runs, clears held input on blur, and restores the saved camera pose/FOV on Return/Off/leaving. Friends see the ordinary avatar at its physical location; the body may still be affected by normal physics. Camera commands never teleport it. Named classic-island viewpoints (refused in the live game) and six saved, validated route-specific bookmarks are available; live camera state is never saved. There is no player teleport.
3. **Inspect** samples entity costs/counts, player/place state, water runtime and synchronous water body/query validity/age only while shown. Optional outlines show at most 64 nearby static box/sphere colliders and decks within 30 m. Heightfields and moving platforms are not outlined. No GPU readback is enabled by inspection. Closing removes sampling and geometry.
4. **Performance and startup** retains the developer-only Load details and Copy last load view, backed by the same boot marks even without profiling. It also reads the existing CPU window, copies data and runs the existing five-second hardware measurement when `prof=1` was enabled at load. Reload buttons enable profiling/startup or disable capture. Unsupported GPU values and actual presentation time stay unavailable; reload does not establish a cold Metal cache.
5. **Room health** reads connection, transport, local lead status, observed builds, queue/drop/hash status and, in the live game, the railway's server authority. Unexposed rejection and remote-lead identifiers are labelled unavailable. It sends no diagnostic messages. In the live game the same tab holds [Replace room with stage](#replace-room-with-stage).
6. **Copy test report** includes build, world namespace, effective flags, player/camera pose, loaded tool settings, inspection, room health and the last 40 command outcomes. Clipboard failure leaves selectable text and a JSON download. PNG download captures the existing game canvas, excluding menu DOM. It is not exact world replay. Existing `record=1` input trace controls remain optional and are not a complete world snapshot.

Place's Go to, Test scenarios, disposable TEST runs and setup links were deleted with Place (11 November,
[ecs-m12-m13](../plans/ecs-m12-m13.md) M13e). People's setups are jump-ins; agents' are `--rail-seed`.

**Sync kinds:** dock, camera, preferences, tools and reports are Local. There are no new wire operations, Host mutations or Lockstep writes. Without explicit or remembered opt-in, the tiny eager gate imports no Dev chunk/CSS and creates no Dev DOM, entity, sampler or frame hook. Normal invite links carry only the room and strip all Dev/debug flags.

**Agent API:** `boogle.dev.tools()`, `open(tool?)`, `run(tool, command, args?)`, `snapshot()` and `close()` use the same bounded tool descriptors and result path as the UI. Tool ids are `water`, `camera`, `inspect`, `performance`, `room`, `report`, `tunables`, `graphics`, `looks`. No arbitrary scripting or property setter is provided.

## Replace room with stage

The owner's way to a later stage is to replace the room he is in, on the server, for everyone in it
([plan](../plans/room-fast-forward.md); owner call "One live game; fast-forward the room instead of jump-in rooms").
Only the holder of the server's dev key can do it, for any room, the shared island included where the server allows
it. Serves **How we work: playtest constantly** and **Clear authority**.

- **The control** is in Dev → Room, in the live game: the four things a replacement loses (the world; what is carried;
  what is personal to the room in each browser, wardrobe and finds included; what an operator restore does), a list of
  the stages (the Jump in catalog's seed rows, in route order), a field to type the room's name, a Key field and the
  button "Replace this room with <label>". With others in the room it says "N others are here now" with a checkbox
  "Replace it under them"; alone, the typed name is the confirmation. On the shared island it adds "This is the shared
  island. Everyone who plays here gets this world." A "New empty room" button opens a fresh private room and replaces
  nothing. The same command is `boogle.dev.run('room', 'replace', { stage, confirm, override })`, and operators have
  `npm run server -- replace` ([server/README.md](../../server/README.md#operator-tools)). There is no action, key,
  pad slot, touch button, guide row or URL flag for it.
- **The key** is the server's `ADVANCE_KEY`. The Key field keeps it in that tab's `sessionStorage` only, so the reload
  a replacement causes does not ask again; closing the tab forgets it. It is sent only in the `Authorization` header
  of the one request. It is never in a URL, an invite, a command's arguments or result, the dock snapshot, a report,
  playdata, a save or a log, and the API cannot be given one.
- **Refusals** are the server's, shown in plain words under the button: wrong key; wrong room name; the room is
  already being replaced; players are here and the box is not ticked; the shared island is not enabled; the stage is
  unknown, unavailable or failed the server's check; the room was already replaced with a later stage (going back is
  an operator restore of the pinned backup); too many attempts; no key set on the server. A refusal changes nothing
  and tells nobody.
- **The countdown.** Everyone in the room, and anyone who joins during it, sees one notice in the notification lane,
  counting down each second: "This room will be replaced with <label> in 10 seconds. What you carry and your finds
  here will be lost." The room then closes. If the server cancels, the notice leaves by itself 8 s after zero.
- **After.** Each browser that was in the room reconnects, finds the new world and reloads by itself, so nothing held
  or ridden carries over. That load forgets what was personal to the room (the existing room reset), skips the fall
  and the card, lands the player at the stage's landing as a jump room does (the usual spawn for a stage with none),
  and shows one line: "The shared island was replaced with <label> for testing. The world changed for everyone, and
  what you carried and found here is gone." (a private room: "This room was replaced…"). A browser that was never in
  the room gets the normal arrival and no line.
- **Playtests.** A session in a replaced room records the stage and is summarised as "Started: a room replaced with
  "<label>"".

**Sync kinds:** the world change is the railway's Server kind, through the room's save; the countdown is a one-off
event from the server (`replacing`, which no client can send); the control, the notice, the landing and the line are
Local. No op, no lockstep state, no `WORLD_NS` change.

Files: `src/debug/dev/room.ts`, `src/debug/dev/room-replace.ts`, `src/features/room-replace.ts`,
`src/features/room-reset.ts`, `src/netplay/replace-countdown.ts`, `src/netplay/room-seed.ts`; proof:
`npm run scenario -- room-replace`.

## Jump in

Jump in rows stay until the owner has replaced a room himself ([plan](../plans/room-fast-forward.md), step 7).
Replaced jump rooms leave the automatic expiry pool.

A playtest jump-in opens a fresh private room on the real server, seeded at a stage of the route, so a beat can be played without replaying everything before it ([plan](../plans/playtest-jump-in.md)). The shared `boogle` world is never touched: the server refuses any room that isn't a new jump room, has a save or is loaded. Links work for anyone and land in a new room each time, for example https://boogle.club/?from=hook-taken (right after the hook, before Q3), https://boogle.club/?from=hook-earned (the quarry gate) and https://boogle.club/?from=start (from the beginning, a fresh private room with no fall). Pause → More → **Jump in** lists the same rows; it shows with Dev on, and inside any jump room, where its header reads "This room started at …" with a way back to the shared island.

- **Rows** (`src/world/railway-jump.ts`, in route order): From the beginning, Just woke, Cart starts, Hook earned, Quarry gate, Sea switch, Boiler waiting, Glide earned, Trains running, Pier reached, Works open, Crossing built, Deck laid, Gap footed, Ring joined. Each names its stage, a one-line description and where you land.
- **Landing.** Anyone with no saved pose in the room, including a friend who joins by invite on their first visit to Boogle (a jump room skips the fall), lands at the row's segment, standing on the terrain, pad or deck it names (the railway arrival checks the surface is there under the spot's centre, else the usual spawn). A friend already standing there moves you 1.4 m aside. A saved pose wins after that, as anywhere.
- **Marking.** The room's name starts with the stage (`hook-earned-k3x9qa`). Each device sees one line per room, through the notification lane: "A test room, started at <label>. The shared island is unchanged." No HUD badge. A jump room nobody has played in for three days is deleted with everything built in it.
- **Your things.** A jump room starts with an empty wardrobe, and a hat or scarf from a crate opened there stays in that room: the shared island's wardrobe never gets it.
- **Failure.** The splash stays up with the reason (Boogle just updated, no such jump-in, can't reach the server, a server too old for jump-ins, too many test rooms, no more jump-ins today for everyone or from this address, too many at once, the server is busy) and three buttons: Try again, From the beginning, The shared island.
- **Limits.** `POST /jump` takes 6 a minute and 30 a UTC day per address (an IPv6 /64), and 500 a day for everyone; only a jump-in that makes a room counts. Jump rooms idle three days are deleted, and at most 200 exist at once.
- **Playtests.** A session in a jump room is summarised as "Started: jump-in "<label>"", so its beats read as a segment.

**Sync kinds:** the seed is a server save (the railway's Server kind) written once by `POST /jump` before anyone joins; the stage label is room metadata from `/rooms/<id>/host`; the page, landing and arrival line are Local. No new wire operations.

## Tunables agent proof

Shared URL edits wait for both appearance restoration and the initial authoritative room snapshot, then submit once. A later snapshot or reconnect never repeats that intent. Local-only URL edits do not wait for the room.

The bounded `tunables` API has no new panel. `boogle.dev.run('tunables', command, args)` lists owner-adjacent definitions, reads effective values, validates and sets values, checks a queued request's status, exports a snapshot or defaults diff, and resets Local settings. `post.centre` changes only this browser's exposure; `feel.spring.stiffness` is owner-written cosmetic state captured at the next action; `railway.regrowMinutes` requests a server command. An action already underway keeps its captured profile. The API's queued result is not an accepted change: inspect `status` before reporting success. Confirmed server rejection is distinct from an unknown outcome after disconnect or timeout. A defaults diff is review material, never an automatic change to source defaults.

`npm run tune -- list --json` lists authored defaults without starting anything. Add `--session` to read the existing harness session. For example, `npm run tune -- set post.centre 0.18 --session --expect-revision 0` uses the same validator. `--wait` observes a shared request until it resolves; rejected, pending and unknown results exit nonzero. `--broker` uses the job's existing browser broker for an explicitly fresh capture; Local changes last only on that page. `--query 'proto=place&tune=1&t.post.centre=0.18'` and `--out .look/tuning.json` make its setup and output explicit. It never silently starts a persistent browser.

Tuning visits record complete resolved snapshots, including defaults, build identity, room revision and starting setup, through the existing playtest stream. Owner rows include the configured and active value/revision, action and chop latch. Accepted changes and action activations have separate events. Playtest summaries verify entry counts, unique IDs, required fields and the configured-value checksum; incomplete segments are marked **INCOMPLETE** instead of being treated as a reproducible configuration. This records settings and setup, not a world checkpoint: changing a value back does not undo earned logs or built track.

The production T1 supply timers use the same API: `railway.regrowMinutes` (default 31) and `railway.recoveryMinutes` (default 21), integer minutes from 1 to 1440, both Server kind. Their execution owner is `src/sim/railway-supply.ts`, accepted through `src/world/rules/tune.ts`'s server command boundary; their effective values and revision are saved as `railTune` and mirrored through replication. They are discoverable everywhere but writable only on the production railway route, in a tuning-enabled prototype room with the host-designated controller. A changed interval applies at the next accepted supply-maintenance pulse while retaining earned progress. Regrowth's later shoot, sapling, young and mature stages still need separate accepted minutes outside finished track; drop recovery still waits until nobody is near.

For an existing T1 tuning session, `boogle.dev.run('tunables', 'set', {id: 'railway.regrowMinutes', value: 2, expectedRevision: 0})` returns a request ID; use `status` until the host confirms `applied`, then read the value and revision. A fresh broker capture can use `npm run tune -- set railway.recoveryMinutes 1 --broker --room proto-supply-review --query 'classic=0&tune=1' --expect-revision 0 --wait --json`. The CLI forwards `--room` (or a single room query parameter) through the broker's room option, so its generated room cannot shadow it. URL intent also works as `t.railway.recoveryMinutes=1`, after the initial authoritative snapshot. Queued, rejected, stale, unknown and applied outcomes retain the existing receipt contract; setting a timer never grants logs or rewinds the room.

Rail tuning uses the railway session's ordered request sequence, with no client simulation. `tune.commit` checks the controller and rail revision, applies on arrival, and reports acceptance only after its checkpoint write succeeds. A reconnect resends the same pending identity; a duplicate applies once. Request IDs keep the existing 1–80 character validation. At v40 the eight unused `haul.*` entries and classic transport are removed; shared catalog entries are labelled Server. The remaining panel controls keep their appearance and permitted settings.

Every tuning peer records changes and a complete resolved snapshot from the replicated rail configuration. The sender's receipt only settles its request; it does not record the change again. Repeated packets and unchanged reconnect snapshots add no change event.

## Looks

**Looks** registers a ninth dock tool on Dev/tuning visits. On Place and crossing it compares five one-click presets on the procedural frozen sky: **Current** (production fixed-gain Neutral, owner call 5 November), **Clean toys** (Neutral with a brighter trim), **Sunny toys** (AgX with an 8% highlight-protected display-linear midtone chroma lift), **AgX Punchy** (the Post panel's 1.35 power / 1.4 saturation), and **Sunshine water** (Clean toys plus the water retune). Toy sky is unsupported here. Current always uses trim 1; candidate exposure trims are recorded in EV and can be adjusted. The initial Clean/Sunshine trim is `1 / 0.771116` (about +0.375 EV); Sunny/Punchy start at 0 EV.

Choose A and B, then press **A/B** or **backslash** while the Looks panel is open. The same 44 px button works on touch. **Water → Post** exposes fixed gain (0.01–2) and underwater offset (0–2 EV), with numeric fields, sliders, reset and copy. The Looks summary shows surface gain/EV and underwater EV. There is no adaptive lock; the legacy lock command remains a capture compatibility marker and cannot freeze the depth adjustment. Every curve is part of one prewarmed output shader, so selecting a look changes uniforms instead of compiling a pipeline. No extra scene pass, simulation or meter is created. The optional live tile board is deferred: the composed underwater HDR needs another target/pass, and Sunshine's water changes cannot be recovered from one shared image.

Selections, A/B slots and candidate trims are Local in `boogle.dev.looks.v1`; a saved named Look is applied before the loading warm draw and takes precedence over older Water overrides. Opening Water does not reapply them. Selecting a look resets appearance bindings to their shipped defaults before its changes; device resolution stays separate. Water/Post edits remain usable and are marked **modified** in Looks. **Copy look** includes build, curve, lift, trim, fixed surface gain/EV, underwater EV, fully submerged gain and effective water/post/light values, with selectable JSON if clipboard access fails. The legacy meter sample is null. It does not change the game's default.

Sunshine uses saturation **1.1**, reflection gain **0.9**, reflection cap **0.8**, foam brightness **0.8**, glitter **0.6**, FFT energy **0.25**, absorption **[0.48, 0.055, 0.032]** and scatter **[0, 0.06, 0.1]** (linear RGB). The optical adjustment was compared against the sand with exposure locked; it uses the existing depth law, with no second tint. Existing FFT, shore, caustics and foam remain. Water's **Light fill** group offers bounded key/fill gain and tint on the existing frozen-sky sun/hemisphere, without a new light or sky rebake. A warm-key/cool-fill trial made no clear improvement over the procedural lighting in the inspected town/tree views, so the preset retains identity lighting controls. Compare manual light edits with exposure locked. Ordinary visits do not load the Looks module, create its uniforms, or alter their output graph.

The API uses `run('looks', 'select', {id})`, `slots` with `{a,b}`, `swap`, `lock` with `{locked}`, `trim` with `{ev}` (-2 to +2, candidates only), `settings`, and `copy`. IDs are `current`, `clean`, `sunny`, `punchy`, `sunshine`. A gated `lookPreset=<id>` reproduction URL selects without overwriting saved choice; it has no effect outside Dev/tuning visits.

`close()` collapses the dock without returning free cam. `registerDockPanel({ id, label, load })` from the lazy shell adds a panel before or after installation; `load()` returns `{ tool }`, whose `mount(parent, context)` returns a disposer. Optional `dispose()` releases session resources on removal/Off. The returned unregister callback removes the panel. Future comparison tools use this seam without a new shared switch.

Files: `src/features/dev-menu.ts`, `src/debug/dev-menu.ts`, `src/debug/dev/`, and the shared `src/player/pause-pages.ts` seam. Approved basis: [Dev menu restrictions](../research/dev-menu-plan.md), [persistent dock spec](../research/dev-tools-agentic.md#persistent-dev-and-an-unobstructed-camera), [persistent dock plan](../plans/persistent-dev-dock.md), [compact dock plan](../plans/compact-dev-dock.md). Principles: **Toys before chores**, **Clear authority**, **Small and readable**.
