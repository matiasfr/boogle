# Great beam carry: Godot lab comparison

8 November 2026. Read-only comparison with
`/Users/matiasfranco/Developer/boogle-godot-lab/godot-lab`. No lab files were changed and nothing there was built or run.
The owner says the current production carry is fine except for the floating rope, and liked the lab's carrying.
That authorizes the hand attachment repair; the options below await the owner's choice.

## What the lab does

Press **F** near the beam to grab the nearest point along its length; press F again to release. Your Buddy reaches
immediately and a yellow ring/line shows the pending grab. The server checks reach and confirms it, turning the
indicator green. The physical pull starts only after confirmation. The target called the hand is a gameplay offset
0.95 m above the feet and 0.55 m forward, rather than the animated hand bone. Buddy's arm reaches toward the grip.

The beam is a **12 kg server-owned Jolt rigid body**, 3.2 m long. Each grip pulls a point on it toward that player's
hand with a damped spring: stiffness 520 N/m, damping 95, capped at 420 N. Pulling away from its centre makes it
rotate; gravity, ground contact, friction and inertia let the other end drag, lag, swing and settle. A stretched grip
breaks beyond 2.6 m. This is physical weight in the object, rather than a movement-speed penalty: Buddy's base speed
stays 5.5 m/s. The local Buddy ignores the delayed beam's collision while gripping, so its own load cannot shove it.

Up to **two players** can attach independent springs to the same body. Both hands influence its position and angle;
there is no scripted shoulder-to-shoulder lift and no cooperative speed bonus. Your movement runs locally immediately,
without server reconciliation. The server receives player poses at 30 Hz and simulates at 60 Hz; beam snapshots arrive
at 30 Hz and normally have a 100 ms presentation buffer. F4 extrapolation can reduce visible lag but can overshoot.

The owner's 6 November feedback was that carrying “feels great.” The plausible contributors are the immediate reach,
the visible connection between hand and load, and the beam reacting to turns and lifting rather than being rigidly
placed beside Buddy. This explanation is inference, not a measured attribution or a fresh playtest. The session's
player count and RTT were not recorded. RESULTS reports a stretched-grip break during a two-player 200 ms capture;
two-person feel under latency remains unproven. The later remote-rider sliding report concerns the platform and is
not evidence of a carry regression.

Sources inspected: lab `README.md`, `RESULTS.md`, `PLAYTESTS.md`; `project/scripts/lab.gd` (`hand_pos`,
`clamp_beam_local`), `client.gd` (`grab_press`, `beam_presentation`, `_physics_process`, `_update_grip_visuals`),
and the relevant `server.gd` body, grab-validation and spring-force sections.

## Against the production railway

| Aspect | Boogle railway | Godot lab |
| --- | --- | --- |
| Grab | Contextual Pick up; predicted railway action, server accepts the unique item claim | F chooses a point along the body; immediate cosmetic reach, server-confirmed spring |
| Hand connection | This repair uses Buddy's existing animated held-item socket and a taut gold rope | Gameplay hand offset plus procedural arm reach and a grip line |
| Solo motion | 5.4 m visual rod, near end beside the hip, far end follows terrain and eases around turns | Rigid body with gravity, angular momentum, collisions and spring lag |
| Weight | Fixed 2.2 m/s solo, sprint disabled; Local scrape/dust feedback | 12 kg body resists its spring; player movement remains immediate |
| Friend | Owner presence says Help carry; Local 0.3 s lift spans two shoulders; carrier gets 5 m/s while within reach | Two physical springs influence one beam, without a speed multiplier |
| Authority | Server owns claim, material, delivery and recovery; each tab derives the decorative rod from smoothed avatars | Server owns every beam pose; clients buffer snapshots; player poses remain owner-local |

Current owners: [line-cargo.ts](../../src/entities/railway/line-cargo.ts),
[beam-drag.ts](../../src/entities/railway/beam-drag.ts),
[railway adapter](../../src/adapters/railway.ts),
[railway systems](../../src/sim/railway-systems.ts),
[server railway](../../src/world/railway-server.ts), and
[as-built carry](../game-design/place.md#the-run).
The attachment fix changes only presentation. Help carry, speed, reach, accepted inventory and delivery remain as built.

## Three options, smallest first

Costs are rough engineering estimates including targeted evidence, not commitments. All retain the railway's unique
server-accepted beam and material accounting. A visual beam pose must never decide delivery or create another item.

1. **Give the visual rod spring lag and a clearer grip pose.** **Sync: Local**, derived from existing Owner avatar/helper
   poses and Server claim state. Add a small damped visual response at the hand-side end and angular settling on turns;
   retain terrain drag, existing movement speeds and helped lift. Files: `src/entities/railway/beam-drag.ts`,
   `line-cargo.ts`; if a new arm pose is needed, `src/player/buddy/life.ts` and `rig.ts`; update `docs/game-design/place.md`.
   **Cost: 1–2 days.** Risks: the trunk can clip scenery, spring motion can stretch the rope, independent tabs can show
   different swings, and excess bounce could make the currently acceptable carry worse. It cannot supply shared pushing
   or physical resistance. Compare one conservative variant against the repaired current carry, solo and with a friend.

2. **Make solo hauling an Owner physics object; keep Help carry's authored lift.** **Sync: Owner pose for the solo body,
   Server for claim/delivery, Local for presentation**. Use Rapier for a solo beam pulled by a capped hand spring; stream
   its pose through the existing room/presence interface, smoothing on other tabs. On Help carry, suspend solo physics
   and return to the existing scripted two-shoulder view; the helper must not apply a second physical force to an Owner
   body. Files: a new `src/entities/railway/beam-physics.ts`, `beam-drag.ts`, `line-cargo.ts`, `src/physics/engine.ts` as
   needed for an owned body; existing `src/netplay/owner-sync.ts` integration; `docs/game-design/place.md`.
   **Cost: 3–5 days.** Risks: pickup/drop/reconnect cleanup, beam collision with the carrier, snapping between solo physics
   and the helped pose, and different solo/co-op feel. Does not deliver the lab's central two-spring interaction. This is
   an intermediate option with an explicit remaining path, rather than a complete physical-carry upgrade.

3. **Make co-carry a shared physical beam.** **Sync: Owner for solo physics and Buddy movement; Server for a two-grip
   body and accepted claim/delivery; Local for rendered ropes/poses**. Transfer the solo body to the server when a second
   grip joins, and back when it leaves, using an epoch/transition fence and continuous pose/velocity. Keep the existing
   railway claim as the single material identity. The server applies capped springs at two grip points; clients smooth
   snapshots and immediately show reach. Files: `line-cargo.ts`, `beam-drag.ts`, a new owned beam-physics view,
   `src/adapters/railway.ts`, `src/world/railway-server.ts`, `railway-replicate.ts`, `railway-wire.ts`, new server physics
   ownership under `server/src/host/`, and the beam component/action owners in `src/sim/railway-world.ts` and
   `railway-systems.ts` where claims or persisted ground pose need extending. Update the namespace if the saved shape
   breaks; no migration. `src/world/room-clock.ts` supplies the existing fixed clock; verify integration rather than
   inventing another loop. **Cost: 1–2 weeks for a bounded proof, longer to integrate/recover robustly.** Risks: delayed
   hands, opposing springs launching or breaking the load, terrain collision parity, transition races, disconnects,
   save/rejoin semantics and extra server CPU. Requires scoped network assertions, broker net/world-inputs evidence and
   a blind owner comparison at 0/100/200 ms. Deterministic carry-island prediction is a later measured alternative,
   not part of the first implementation. Physics must stay out of lockstep rules.

## Recommendation and subsequent owner decision

**8 November owner decision:** try option 1 as the bounded Local comparison. The implementation and its tunable
control are described in [the run](../game-design/place.md#the-run); the owner's feel verdict remains pending.

Keep the hand fix and offer **option 1 as a bounded comparison**, then stop for the owner's solo/co-op verdict. The
owner already finds this carry acceptable; visual inertia is the cheapest way to test whether the lab's swing is the
missing quality without changing railway authority or progression. Ask one question: **does the beam feel connected
to your hand and pleasantly heavy when you turn, alone and together?** Do not call it physical carrying.

Skip option 2 unless solo collision itself proves valuable: it introduces an authority and mode transition without
providing the lab's two-person spring play. If the owner specifically wants both hands physically steering one beam,
choose option 3 as a separately planned proof, not an engine migration. Its prerequisites are a reviewed physics/claim
boundary and handoff protocol, terrain collision coverage and latency/recovery evidence; the existing fixed room clock
is present, but an integrated shared-beam physics service is not established by this comparison.

This serves [DESIGN 11, Show, don't tell](../../DESIGN.md#11-show-dont-tell),
[8, Enjoyable alone and together](../../DESIGN.md#8-enjoyable-alone-and-together), and **Clear authority**. The later
[6 November decisions](../proposals/boogle-2.md#process) supersede DESIGN's older sync table for new shared state:
Local/Owner/Server, responsive personal movement, and server physics when multiple people act on one object.
The [shared-physics research](shared-physics.md) already compares standard-engine approaches and recommends server-only
first; its historical measurements are not refreshed here. `docs/direction.md` is dated 3 November, so it is not used
as current milestone authority. Options 2 and 3 remain unapproved. No external network research
was performed under this brief's loopback-only restriction.
