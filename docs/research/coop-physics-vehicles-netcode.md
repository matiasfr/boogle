# Co-op physics: vehicles, riders and carried objects

_Gap-fill pass, 2026-11-01 (later the same day). I searched again for first-party material on the six games listed
below as second-hand, plus R.E.P.O. and Tears of the Kingdom. New findings carry markers: **[V]** fetched and the wording
matched; **[S]** from a search summary, wiki, forum, or a modder's notes, not checked against the original; **[K]** well known, not re-checked. Still no
first-party netcode material for Sea of Thieves, Human Fall Flat, Fall Guys, Deep Rock Galactic or GTA Online. New
evidence came from Gang Beasts' own patch notes, Semiwork's account of R.E.P.O. on Photon's blog, a R.E.P.O. networking
mod that documents the stock behaviour, and Nintendo's GDC 2024 talk on Tears of the Kingdom's physics. Changes:
recommendation 1 is marked shipped (`riding`, `ac0a672`); 5 is sharpened (grab locally, arbitrate after); 14 and 15 are
new. The rest stand._

_2026-11-01. How shipped games network vehicles, players standing on moving things, and objects that change hands, for
2–8 friends in a room our server hosts. It builds on [netcode-browser-physics.md](netcode-browser-physics.md),
[shared-state-at-scale.md](shared-state-at-scale.md) and [deterministic-sim-at-scale.md](deterministic-sim-at-scale.md)
and doesn't repeat them. Read first-hand: Jared Cone's GDC 2018 Rocket League slides (text layer), Glenn Fiedler's
articles, the Halo: Reach GDC 2011 slide summary, Unreal, Unity and Photon Fusion docs, Rapier's determinism page and
Rust's Cargo Ship devblog. I found no first-party material for Sea of Thieves, Human Fall Flat, Gang Beasts, Fall Guys,
Deep Rock Galactic or GTA Online; what's said about them below is marked as second-hand. The web search budget ran out
before a second pass on those. Code read at `8ebb618`._

## Summary

1. A player standing on a moving thing should be sent **in that thing's frame** (deck-relative position plus which
   deck), not in world space. Unreal, Unity and Photon all do this. It fixes the known bug in `src/proto/wagon/`, where
   remote riders trail the deck by about 100 ms.
2. Timetabled vehicles are a pure function of the tick, so every tab can place the deck "now". That makes remote
   riders free and exact: a deck-local pose composed with the local deck.
3. Boarding and leaving need a short blend between world space and deck space, or buffered snapshots pop.
4. Player-driven vehicles stay **Owner** (the driver's tab), as the soapbox already is. Your own vehicle needs no
   prediction because you are its authority. Rocket League's server-authoritative prediction costs 24 re-simulated
   frames per correction at 200 ms ping, which a co-op browser game doesn't need.
5. Riders on a remotely driven vehicle see it about 120 ms late, while they stand on it in the present ("two
   timelines"). Seats sidestep this. Standing on a driven deck needs the deck pushed forward to the present.
6. Grabbed and carried objects: Fiedler's split of **ownership** (a grab: exclusive until release) from **authority**
   (a touch: whoever simulates it) is the clean general form of the ball's epoch rule. With the server relaying
   everything, the server can arbitrate claims. Grabs should still take effect locally at once: R.E.P.O.'s host
   approves every grab, which adds a round trip to each one.
7. A held object is not physics on the wire. Send its pose relative to the holder's hand, inside the holder's presence.
8. For fast remote vehicles, interpolate with velocity (Hermite). Extrapolate only briefly, then blend corrections
   (small errors slowly, big ones fast). Fiedler's rule of thumb puts a 20 Hz buffer near 150 ms; `INTERP_MS` is 120.
9. On mobile, bandwidth is per receiver and grows with players × rate × bytes. JSON presence costs 112 kbit/s
   downstream per 100 bytes in a full room. Prioritize by distance (Halo), flag objects at rest, and measure before
   compressing.
10. Rapier's `-deterministic` JS build is documented as identical across browsers, and one project reports matching
    hashes in Chrome, WebKit, Firefox, Safari and Node. That makes a cross-browser hash test cheap; it's not a reason
    to make physics Lockstep.

## Findings by source

### Rocket League (Psyonix, GDC 2018)

[Slides](https://media.gdcvault.com/gdc2018/presentations/Cone_Jared_It_Is_Rocket.pdf),
[talk](https://www.gdcvault.com/play/1024972/It-IS-Rocket-Science-The).

- Bullet physics at a fixed **120 Hz**. A higher rate makes hits consistent, but corrections get more expensive.
- The server is 100% authoritative, and input delay was ruled out. The server doesn't wait for client input, because
  that desyncs hits on moving objects. It **buffers** each client's per-frame inputs instead and tells the client to
  run slightly faster or slower to keep the buffer short (the same trick as Overwatch).
- First attempt: the client predicts its own car and interpolates the server's ball. The car and the ball then live in
  **two different timelines**, so hits went wrong.
- What shipped: the client **predicts everything** (its car, the ball and the other cars). When the server's state for
  a frame differs from the client's history, the client rewinds every physics actor to that frame and re-simulates to
  the present. This works well for the ball, which is predictable, and less well for cars, which aren't. The cost is
  stated plainly: 200 ms ping at 120 Hz means 24 re-simulated frames per correction.
- The vehicle-tuning half matters for feel more than for netcode: no transmission, constant mass, simplified friction,
  forces applied at the centre of mass, and physics presets kept separate from the visuals.

### Glenn Fiedler (Gaffer on Games)

[Networked Physics in VR](https://gafferongames.com/post/networked_physics_in_virtual_reality/),
[State Synchronization](https://gafferongames.com/post/state_synchronization/),
[Snapshot Interpolation](https://gafferongames.com/post/snapshot_interpolation/).

- **Authority and ownership** (VR cubes, host plus guests, every packet through the host). Cubes start with default
  authority. Touching one gives you **authority**, and you simulate it and send its state. Grabbing one gives you
  **ownership**, which nobody else can take until you let go. Each cube carries an authority sequence (bumped on each
  take and when a player's cube comes to rest) and an ownership sequence (bumped on each grab). Ownership beats
  authority. The host accepts or overrides guest updates by these numbers. It won't hand out ownership of a cube a
  guest holds, but authority can still be taken, so a guest can knock over someone's stack.
- **Coming to rest.** A guest keeps authority over a cube that has come to rest until the host confirms it, so the
  final resting pose isn't lost to packet loss. A cube that hasn't moved much in 16 frames is forced to rest.
- **Held objects** are dropped from the physics updates (priority −1). The avatar's state carries the held cube's id
  and its pose relative to the hand, and the receiver attaches it when that state arrives.
- **Priority accumulator.** Each object's priority is added to its accumulator every frame. The highest accumulators
  fill the packet and are reset, and the rest wait. Example weights: player 1,000,000, interacting cubes 100, resting
  cubes 1. Objects that just collided or were just thrown get a boost. Lowering the priority of resting cubes made
  things worse.
- **Budget.** The VR demo targeted under 256 kbit/s per player (four players in 1 Mbit/s at the host) and fit.
- **Quantize on both sides.** The sender and the receiver quantize state before each step, so their extrapolations
  agree. State sync needed 4,096 position steps per metre and 15 bits per smallest-three quaternion component (versus
  512 and 9 for snapshot interpolation). An at-rest bit skips velocities.
- **Visual smoothing.** The simulation is snapped to the received state. Rendering adds an error offset that decays by
  about 0.95 per frame for errors of 25 cm or less and about 0.85 for 1 m or more, so small jitter fades slowly and
  big pops are fixed fast.
- **Extrapolation** is fine for about 50–250 ms of mostly straight motion and breaks at collisions: things go through
  floors, then snap back. **Interpolation buffer:** about 3× the packet interval to survive two lost packets, plus
  jitter: 300–350 ms at 10 Hz, 150 ms at 30 Hz, 85 ms at 60 Hz. **Hermite** interpolation using velocity removes the
  wobble that linear interpolation shows on curves; for rotation, slerp is enough.

### Halo: Reach (Bungie, GDC 2011, "I Shot You First")

[Slide summary](https://slidetodoc.com/i-shot-you-first-gameplay-networking-in-halo/),
[Edgegap write-up](https://edgegap.com/blog/game-backend-deep-dive-halo-reach-netcode-host-migration).

- There are three kinds of data. **State** is host to client, and only the latest value matters (positions, health).
  **Events** are unreliable one-offs ("I'd like to get into this Warthog"). **Control data** is frequent and
  best-effort (stick values, a client's own position).
- Priority is per object and per client: distance and direction first, adjusted for size, speed and damage. Packets
  fill in priority order, and only a few objects per packet may take "panic" priority.
- Numbers: about **1 kbit/s** to replicate one player to one client at combat quality, at most 45 kbit/s from the host
  to one client, and at least **10 Hz** for solid play. An idle grenade updates about 3 times a second. Not networking
  ragdolls saved 10–12% of bandwidth.
- Nothing on vehicle prediction surfaced. A boarding request being an event is the one vehicle detail.

### Unreal Engine: Character Movement and moving bases

[Networked movement docs](https://dev.epicgames.com/documentation/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine),
[forum: jitter on moving platforms](https://forums.unrealengine.com/t/players-jitters-on-moving-platform/551011),
[forum: smooth interpolation on platforms](https://forums.unrealengine.com/t/multiplayer-how-to-get-smooth-character-interpolation-on-moving-platforms-without-jittering/108500).

- The owning client predicts by saving each move. It sends the newest move plus the oldest unacknowledged one over an
  **unreliable** RPC, and replays its unacknowledged moves when the server corrects it. Other clients smooth toward
  replicated positions.
- When a character stands on another actor, it replicates **based movement** (its position relative to that base)
  instead of world position, and corrections name the base. Forum reports say this holds up while the base only
  translates; most of the remaining jitter comes from the base's **rotation** differing between machines. A common
  workaround is to stop replicating the platform's transform and replicate its start time, so every machine computes
  the platform's motion itself.

### Unity Netcode for GameObjects

[NetworkTransform](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/components/helper/networktransform.html),
[parenting](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.4/manual/advanced-topics/networkobject-parenting.html),
[ownership](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/terms-concepts/ownership.html).

- Elevators and platforms are named as the usual case for **server** authority.
- A transform can sync **in local space**. **Switch Transform Space When Parented** exists to stop popping: when an
  object gets a new parent, the snapshots already buffered are still in the old space, so it converts them to the new
  one. Parenting the same object many times in one frame is discouraged.
- The suggested starting point for the interpolation buffer is a maximum of 0.5 s. Bandwidth options include half
  floats (2 bytes per axis), 4-byte compressed rotations, per-axis change thresholds, and a full refresh about once a
  second when deltas are unreliable.
- With distributed authority, an object can be **Transferable** (claim at once) or **RequestRequired** (ask first; it
  stays locked after the transfer). GitHub issues against the experimental 2.0 reported velocities left inconsistent
  across clients after a transfer ([#2903](https://github.com/Unity-Technologies/com.unity.netcode.gameobjects/issues/2903))
  and errors when claiming a moving object
  ([#2897](https://github.com/Unity-Technologies/com.unity.netcode.gameobjects/issues/2897)). A forum suggestion is to
  decide up front whether contact transfers at once or locks for about one round trip.

### Photon Fusion 2

[Advanced KCC features](https://doc.photonengine.com/fusion/current/addons/advanced-kcc/features),
[Forecast physics](https://doc.photonengine.com/fusion/v2/manual/physics/physics-forecast),
[Forecast vehicle sample](https://doc.photonengine.com/fusion/v2/technical-samples/advanced-forecast-vehicle-physics).

- **Platforms.** A per-player platform processor tracks the platforms a character touches and carries it along. It
  blends between world space and platform space over configurable times when you board or leave. The update order is
  fixed: platforms move first, then the processor, then player input, then the character controller, so the character
  always collides with this step's platform. In host mode, platform motion must be computed on every machine; the
  example platform derives its pose from networked state on every client.
- **Forecast physics** projects remote rigidbodies forward to local time from their last position and velocity, capped
  by a maximum extrapolation time. Errors fall into bands: a deadzone (about 2% of the object's size), smooth
  correction (through velocity by default), and a snap above a maximum. On a real impact, correction pauses briefly
  and then ramps back, so local physics isn't fought. Known weaknesses: it doesn't see obstacles, sharp bounces show
  the most, and it gets worse as ping rises. For player-driven physics like cars, the docs suggest sending the inputs
  to every client.
- **Vehicle sample.** Each driver has authority over their car. Loose objects (cubes, a ball) go to **whichever car is
  closest**, which calls `RequestStateAuthority()`, so the player hitting something usually simulates it too. Moving
  something by setting its transform looks right to its authority but gets corrected elsewhere; teleports go through
  the network API.

### Rust: the Cargo Ship and parented movement (Facepunch)

[The Cargo Ship Update](https://rust.facepunch.com/news/the-cargo-ship-update),
[Devblog 132](https://rust.facepunch.com/news/devblog-132), commit logs on
[commits.facepunch.com](https://commits.facepunch.com/andre/rust_reboot/main/cargo_ship).

- "Parented entity movement" lets players, AI and physics objects get on and off moving objects smoothly and inherit
  their velocity. The developer spent most of a month on it and calls out many special cases.
- Follow-up fixes (from devblog and search summaries, not reread in full) show where it bites: the anti-cheat kicked
  players who jumped off moving entities; angular velocity was estimated wrongly far from the parent's origin; and
  nested parented entities missed their parent's network-group changes (relevance), which leaked entities. Jumping
  from one moving boat to another is described as nearly impossible, so boarding uses ladders.

### Valheim (Iron Gate): zone ownership (second-hand)

[Valheim mod docs, HostOwnerValheim](https://github.com/tbsj1ga/HostOwnerValheim),
[server-zone-ownership mod](https://github.com/bpage-dev/valheim-server-zone-ownership),
[zones explainer](https://gamever.io/knowledge-base/how-valheim-loads-the-world-zones-zdos-and-why-big-bases-cost-performance).

- Every networked object has one owner, the machine that runs its logic and physics. Ownership goes by proximity: the
  first player in an area keeps most of it until they leave. One mod's docs say that since 1.0 the server hands out
  ownership every 2 s, and that clients never claim. The sources disagree and none is official. Zones are 64 m, and a
  player loads 5 × 5 of them.
- What it shows: owner-by-proximity scales co-op without server physics. The price is that the world feels like the
  owner's connection, and mods exist to move ownership onto the dedicated server.

### R.E.P.O. (Semiwork, Unity + Photon PUN)

[Photon blog on R.E.P.O.](https://blog.photonengine.com/r-e-p-o-multiplayer-success-powered-by-photon/),
[NetworkingReworked mod](https://github.com/Ian0526/NetworkingReworked),
[PUN ownership docs](https://doc.photonengine.com/pun/current/gameplay/ownershipandcontrol).

- **The developers' own account [V].** Semiwork: "Making all the physics feel smooth for clients was something we
  struggled with for a long time." PUN is "not providing much for dealing with multiplayer physics out-of-the-box", and
  for next time they "would recommend using Fusion". The post is Photon's marketing, but the quotes are Semiwork's. It
  says nothing about how grabs or the cart are synced.
- **Stock behaviour, per a modder's reverse-engineering [V for the README's wording, S for the game].** "Only the
  MasterClient has full authority over physics objects", so a client grabbing, moving or throwing something waits "a
  full round trip delay while the host approves it". Carts, doors and throwables feel "laggy, stuttery, or even
  desynced", and a release or throw gives "a brief jitter" as the object realigns with the host. A second mod page
  describes the game as heavily host-authoritative, with `PhotonView.TransferOwnership` the place where grab fix-ups
  happen [S].
- **What the mod tried [V, README].** Each client gets "predictive authority over physics objects as if they were in
  singleplayer". After a release, a soft sync "gradually reconciles" the object back to the host's state. Unheld,
  untouched objects are plain interpolation. Two players grabbing at once still make ownership "bounce briefly". The
  author calls it discontinued and says it "sort of worked".
- **PUN's rule [V, docs].** An object with no owner is controlled by the master client, and an owner who leaves hands
  it back to the master client. Ownership can be taken at once or requested, with the current owner answering.
- **What it shows.** The 2025 co-op physics hit shipped the simplest model: the host simulates every grabbed thing,
  and clients feel one round trip on every grab. Players bought it anyway, which says the bar for co-op is lower than
  competitive play. The fixes people reach for are the ones in recommendations 5 and 6 below: simulate your own grab
  locally, reconcile softly on release, and settle simultaneous grabs with one stable tie-break.

### Gang Beasts (Boneloaf, Unity)

[0.3.3 post and online beta](https://gangbeasts.game/posts/2017/5/30/patch-notes-for-the-gang-beasts-033-unstable-build-and-information-on-the-gang-beasts-online-multiplayer-beta),
[0.5.7 beta notes](https://gangbeasts.game/posts/2017/6/29/patch-notes-for-the-gang-beasts-057-beta),
[Steam announcements](https://store.steampowered.com/news/?appids=285900&feed=steam_community_announcements),
[MCV interview](https://mcvuk.com/business-news/when-we-first-started-we-didnt-really-know-what-we-were-doing-how-gang-beasts-became-an-international-success/).

- **Server-hosted, stage by stage [V].** The online beta was built with Coatsink. Keys went out in batches "as server
  capacity is scaled", and only the "most optimised stages" were online at first. The 0.5.7 notes cut physics work
  "to significantly lower the frequency of physics calculations made per frame", and list collider problems on the
  wheel stage's pier as "online only". Later posts name Multiplay as a partner and promise "more stable network
  schemes" (2022) [V].
- **Separately synced parts drift apart [S].** The 1.0.7 notes (search summary) admit the Elevators stage's guide
  wheels "will often desync and move independently of the elevator cars online", and describe "changes to the way we
  sync objects online". Update 1.14 shipped a temporary fix for the elevator that "does cause some visual peculiarities
  when played online", and update 1.13 rebuilt the Wheel stage "to work online" [S].
- **Why physics.** They had no animator, so they used physics to animate. A later Unity physics upgrade, adopted for
  speed, broke their physics [S, MCV].
- **What it shows.** Even a physics-first studio rebuilt stages one by one to make them work online. The specific bug
  is general: a part that belongs to a moving assembly but is synced as its own object drifts off it. That supports
  composing attached things from their parent's pose (recommendation 14).

### Tears of the Kingdom (Nintendo, GDC 2024): kinematic bodies against physics

[GDC Vault abstract](https://gdcvault.com/play/1034667/Tunes-of-the-Kingdom-Evolving),
[Shacknews recap](https://www.shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap),
[Zelda Dungeon recap](https://www.zeldadungeon.net/tears-of-the-kingdom-developers-discuss-the-challenges-of-programming-a-physics-based-world/).
Not netcode, but it is about the body type Boogle's decks use.

- **Non-physics objects broke Ultrahand [V, recap quoting the talk].** Lead physics programmer Takahiro Takayama: the
  "non-physics driven objects" (moved along scripted paths) "caused daily problems all over the land of Hyrule". Early
  builds launched things: a stone thrown onto a cart sent the cart and horse into the air, and falling objects sent
  "poor wagon merchants flying into space".
- **The fix was to make everything physics-driven [V].** For a Breath of the Wild cog that misbehaved, "We connected
  the two fixed cog wheels with a constraint to transfer velocity and moved one of them with a motor." Gates, scripted
  before, became physics objects too, so an Ultrahand box can prop one open.
- **Why [S].** A secondary write-up frames it as kinematic bodies having effectively infinite mass, so they break
  when real physics objects (Link, a glued vehicle) hit them. The recaps I could fetch don't use that phrase. It is
  how Rapier treats kinematic bodies too [K].
- **What it shows for Boogle.** `platforms.ts` decks are kinematic on purpose, because every tab must compute the
  wagon from shared time. So Nintendo's fix (motors and constraints) doesn't transfer to timetabled decks. The
  problem does: a dynamic prop (the ball, a crate, a barrow) caught between a kinematic deck and the ground gets
  whatever velocity the solver needs. See recommendation 15.

### Still second-hand: Sea of Thieves, Human Fall Flat, Fall Guys, Deep Rock Galactic, GTA Online

- **Sea of Thieves.** Still nothing first-party on netcode. Rare's programmers, in a 2017 engineering Q&A, said
  "updating physics objects is probably one of the most expensive things we do" and "the ship is one great big physics
  object containing lots of other little ones!", and that physics for chests trades against "allowing us to support
  more ships" [V, [Wccftech on the Q&A](https://wccftech.com/rare-big-ambitions-ai-sea-of-thieves/)]. Rare's Jon Holmes
  gave an Unreal Fest Europe 2019 talk on batching ticks to scale servers
  ([Unreal page](https://www.unrealengine.com/en-US/events/unreal-fest-europe-2019/aggregating-ticks-to-manage-scale-in-sea-of-thieves));
  I found no summary that mentions ships. Forum posts say ships are server-controlled, and one recalls Rare running
  hidden proxy ships for AI to walk on [S, unverified]. "The ship as a parent of many small things" fits deck-relative
  positions, which is still a hypothesis.
- **Human Fall Flat.** Wikipedia says Sakalauskas first thought online play impossible and then found a way using
  Nvidia technology [S]. A Steam workshop guide lists a client desync fix where the truck's steering wheel
  disappeared [S], and players say a lagging host lags everyone [S], which fits host-run physics. No developer
  description.
- **Fall Guys.** The Multiplayer Group says it co-built the prototype with Mediatonic: "client/server model, physics,
  animation and player character control", for up to 60 players, on a hand-modified UNet [S, search summary of
  [their case study](https://www.themultiplayergroup.com/case-studies/fall-guys); the page wouldn't load as text]. Where
  physics runs and what clients predict isn't stated anywhere first-party.
- **Deep Rock Galactic.** Community threads quote a developer saying host migration isn't supported because the
  terrain-deformation state would be too much to keep synced [S]. The wiki notes that no part of the drop pod counts
  as terrain [S]. No developer statement on moving platforms.
- **GTA Online.** Nothing new. Still undocumented by Rockstar.

### Rapier determinism

[Rapier JS determinism](https://rapier.rs/docs/user_guides/javascript/determinism/),
[npm](https://npmjs.com/package/@dimforge/rapier3d),
[a project's cross-browser test](https://github.com/davetashner/thevesperbell/pull/72).

- The `-deterministic` npm build is documented as identical across browsers, operating systems and processors. The
  main build (`@dimforge/rapier3d`, which Boogle uses at 0.19.3) is deterministic only on one machine. Determinism also
  needs the same version, the same parameters, bodies and colliders added in the same order, and initial values free
  of `Math.sin`/`cos`.
- Verification is `world.takeSnapshot()` plus a hash after the same number of steps. One project reports identical
  hashes after a 600-step script in Chrome (twice), WebKit, Firefox, Safari and Node, snapshot/restore included. This
  updates netcode-browser-physics.md, whose verifiers rejected the claim in October: it's now one independent test
  result, still not a guarantee for us.

## What this means for Boogle

Today: `src/physics/platforms.ts` carries the local player on kinematic decks. The wagon (`?proto=wagon`) is a pure
function of the tick (`wagonAt`), the ride flatbed (`?proto=ride`) is Local, the soapbox is Owner (presence `soapbox`),
the ball is Owner with an epoch rule, remote poses use `createSnaps` at `INTERP_MS = 120` with presence every
`SEND_MS = 50`, and the server relays JSON presence over a WebSocket with latest-wins backpressure. The server runs no
physics yet (net-roadmap phase 3).

Each recommendation names the smallest prototype or test that would settle it.

1. **Send riders in the deck's frame.** While `carry.on` is set, publish a small field (for example `{ deck id,
   local x/y/z, local yaw }`) in place of, or beside, the world pose. The receiver composes it with its *own* current
   pose of that deck. For timetabled decks (the wagon), every tab computes the deck from the shared tick, so the rider
   lands exactly on the deck with no added lag: Unreal's based movement without the rotation drift, because nobody
   replicates the deck. _Prototype:_ two tabs on `?proto=wagon`, one rider. A two-tab scenario samples the remote
   rider's height above the deck and its offset from the deck over a lap: today vs deck-frame, at the wagon's top speed
   and through the corners. This is the "Remote riders" fix the wagon's header already sketches.
   _Status (gap-fill pass):_ shipped in `ac0a672` as the `riding` presence key (`src/netplay/net.ts`,
   `registerPlatform({ id, shared })` in `src/physics/platforms.ts`). The two-tab measurement is still worth adding as
   a scenario.

2. **Blend when changing frames.** Boarding and leaving switch a remote's samples between world and deck space. Either
   convert the buffered samples to the new space (Unity) or cross-fade over about 0.1–0.2 s (Fusion's transition
   durations). _Test:_ a pure unit test for `createSnaps` (or a small wrapper beside it) that pushes world samples,
   then deck samples, and asserts the sampled pose never jumps more than a set distance at the switch.

3. **Keep player-driven vehicles Owner, without prediction or rollback.** The driver's tab is the authority, so its
   own vehicle already responds instantly. Rocket League's predict-everything model pays 24 re-simulated frames per
   correction at 200 ms and exists for competitive play under a server-authoritative vehicle, which net-roadmap rules
   out ("co-op, not PvP"). Revisit only if vehicles ever move to server Rapier. _Check:_ none needed. Record the
   decision with the soapbox's game-design file when vehicles stop being a prototype.

4. **Seat passengers on driven vehicles, or forecast the deck.** A passenger on someone else's soapbox or handcar sees
   that vehicle about 120 ms in the past but stands in the present. Two options:
   - **(a) Seats.** Riders are attached to a seat, pose computed from the vehicle's interpolated pose, with no physics.
     This is what the soapbox already does for its own driver.
   - **(b) Forecast.** For standing on a driven deck, extrapolate the deck to local time from its velocity, Fusion
     style, with error bands and a cap, or forward the driver's input so riders can simulate the deck. Fusion
     recommends input forwarding for cars.

   _Prototype:_ a two-seat soapbox behind a flag, comparing (a) against (b) on a `/look` motion sheet from the
   passenger's tab.

5. **Split ownership from authority for grabbable things.** Generalize the ball's epoch rule into Fiedler's pair: an
   **ownership** sequence (grab: exclusive until release; the holder sends nothing physical) and an **authority**
   sequence (touch or kick: you simulate it; it returns to the default owner when it rests and the server has
   acknowledged the rest pose). Since every packet now passes through the server, the server can be the arbiter
   Fiedler's host was: it accepts the higher sequence, refuses to give away a held object, and echoes the winner.
   _Test:_ a pure unit test of the claim resolver (simultaneous grabs, grab versus touch, holder leaves), plus a
   two-tab `dev/peer-test` check where both tabs grab one object within 50 ms and both end up agreeing on one holder
   with no teleport.
   _Revised after R.E.P.O. (gap-fill pass):_ the grab must take effect locally at once, with the server's verdict
   arriving after. R.E.P.O.'s stock model, where the host approves every grab, costs a round trip per grab and is what
   players and modders complained about. The mod that grabbed locally still saw ownership "bounce" on simultaneous
   grabs. So the resolver needs a sticky rule: the first claim the server receives wins, a held object can't be
   claimed until release, and the loser's tab blends the object back to the holder's hand over about 0.15 s instead of
   snapping. Add to the unit test: a claim that arrives while another claim is unanswered never flips the holder twice.

6. **Carry held objects as a hand-relative pose in the holder's presence.** Today `hd` sends only which item is held,
   and the receiver draws it in the avatar's hands. Make that the rule for carts, crates and tools too: while held, the
   object has no physics packet of its own, receivers attach it to the holder's avatar, and a pose relative to the
   hand is added only for things that swing or drag. On release, the holder becomes its authority and sends its
   physics state with a boosted priority until it rests. _Check:_ audit `hd` and the ball's held path against this;
   a `/look` still of a remote carry.

7. **Two pushers on one cart: the closest pusher simulates it.** Fusion's distance-based authority gives each loose
   object to the nearest player. The others' pushes are sent to that owner as small input messages (Fiedler's
   "authority to whoever interacts", with the server breaking ties). This is the open question behind the "two-pusher
   crate" in ambitious-mechanics.md. _Prototype:_ a greybox crate behind `?proto=`, two tabs pushing from opposite
   sides, logging authority changes per second. Thrashing above about 1/s means a hand-off delay of about one round
   trip is needed, which is the forum advice for Unity.

8. **Smooth fast remotes: Hermite, a measured buffer, adaptive correction.** At 20 Hz, Fiedler's 3× rule plus jitter
   suggests about 150–180 ms, against today's 120 ms. The soapbox already sends its signed speed and its rotation,
   which give a Hermite tangent, so Hermite interpolation costs nothing extra on the wire. Cap extrapolation (`over`
   in `createSnaps`) at about 100–250 ms, then hold. Fade corrections with Fiedler's adaptive decay (slow below
   25 cm, fast above 1 m). _Test:_ a unit test that feeds
   `createSnaps` a curved 10 m/s path with 5% dropped and jittered samples and reports the error for linear versus
   Hermite at 120 and 160 ms. `telemetry.ts` already reports each join's `rttMs`; adding how often `over` is non-zero
   would show from real rooms whether 120 ms is too short.

9. **Let the vehicle claim what it hits.** Your soapbox hitting the ball, which a remote owns, is Rocket League's
   two-timelines problem. The cheap co-op answer is the ball's existing walk-into claim, extended to vehicles: on
   contact the driver claims the ball and simulates the hit. Pause the remote correction for a short impact window
   (Fusion) so the claimant's local result isn't pulled back. _Scenario:_ two tabs, a scripted soapbox run into a ball
   owned by the other tab, asserting the ball leaves in the hit's direction on both tabs.

10. **Measure bytes per receiver, then prioritize.** A client in a full room receives 7 players × 20 Hz × the presence
    size: 112 kbit/s per 100 bytes of JSON, before WebSocket, TLS and TCP overhead. For scale, Halo's figure is
    1 kbit/s per player per client, and Fiedler's budget was 256 kbit/s per player. When phase 6 arrives, the levers
    in order are:
    - a per-receiver priority accumulator in the relay (Halo, Fiedler), since `hosted-room.ts` already queues latest
      wins per source;
    - an at-rest flag that drops velocities;
    - quantization (Unity's half floats, smallest-three rotations).

    _Prototype:_ have `npm run load` print bytes per second received per client and the average presence size, with
    and without a soapbox and a ride in play, before any codec work.

11. **Check speeds relative to the deck.** Rust's anti-cheat kicked players jumping off moving entities. When phase 4
    adds presence checks (speed and teleport limits), a rider's speed must be measured relative to the deck they're
    on, using the deck field from recommendation 1, and a jump-off may carry the deck's speed. _Test:_ a unit test for
    the future validator: a rider on a 6 m/s deck, a jump-off, and a real teleport, of which only the teleport is
    refused.

12. **Run the cross-browser Rapier hash test before any plan that relies on it.** Swap in
    `@dimforge/rapier3d-deterministic` in a `dev/` harness only, run a fixed scripted scene (a soapbox, a ball, a deck)
    for 600 steps in Chromium, WebKit and Firefox through Playwright and in Node, and compare the `takeSnapshot()`
    hashes. Measure the step time against the current build. A pass makes server-side replay checks (phase 4) or
    shared vehicle physics possible later; it doesn't change "physics is never Lockstep" by itself.

13. **Later, with chunks: riders follow their vehicle's relevance.** Rust's leaks came from parented entities missing
    their parent's network-group changes. When phase 5 adds interest management, a rider's chunk is the vehicle's
    chunk. _Test:_ a chunk-membership unit test in that phase's plan.

14. **Draw attached parts from their parent; never sync them separately.** _(New, gap-fill pass.)_ Gang Beasts'
    elevator guide wheels, synced on their own, drifted off the cars online, and Human Fall Flat shipped a fix for a
    truck's steering wheel vanishing on clients. In Boogle, anything that belongs to a moving assembly (soapbox
    wheels, a barrow's load, crates on a flatbed, a seat passenger) gets its pose from the parent's pose every frame,
    with at most a small Local wobble on top. The wagon's crates already work this way. _Check:_ when a vehicle or
    barrow leaves `?proto=`, list its parts and confirm that only the root has a presence field.

15. **Keep dynamic props from being launched by kinematic decks.** _(New, gap-fill pass.)_ Tears of the Kingdom's
    scripted, non-physics objects launched carts and merchants until Nintendo made everything physics-driven. Boogle's
    decks must stay kinematic, because every tab computes the timetabled wagon from shared time. So the guard goes on
    the props instead: a dynamic body (the ball, a future barrow or loose crate) that touches a moving deck gets its
    velocity clamped to the deck's speed plus a small margin (start from 2 m/s) for that step. Or, while it rests on a
    deck, it is carried like the player (`carry`) rather than shoved by contacts. _Scenario:_ park the ball on the
    wagon's track and on its flatbed, run a lap, and assert the ball's speed never exceeds the wagon's top speed plus
    the margin.

Not recommended, given what was found: rollback or full client prediction of shared physics (Rocket League's cost, no
PvP), Valheim-style ownership of whole areas by the first player present (the world would feel like that player's
connection, when the server is right there), and world-space rider positions with heavier smoothing (that treats the
symptom; every engine that handles platforms uses base-relative positions).
