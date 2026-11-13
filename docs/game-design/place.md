# 6.28 Prototype: a real place (`?proto=place`)

**Deleted (11 November 2026, [ecs-m12-m13](../plans/ecs-m12-m13.md) M13e).** `src/proto/place/` and the
`?proto=place` entry are gone; `?proto=place` now opens the live game. The source is at the tag `archive/place`
(`a6fc476fb`; local until the owner pushes it). What follows is the prototype's record: its files, flags, rooms,
saves and evals are history, and the live game's parts are in `src/place/`, `src/entities/` and their own sections.

_A throwaway greybox, round 4 ([plan](../plans/round-4.md)): "Did you get hungry for a better way, and did finding one feel great?" The owner and Grant after round 3: "the only thing asked of me was to just chop 1 or 2 trees, so I wasn't feeling hungry for more efficiency yet"; "seeing a path between two areas open up which was previously tedious was satisfying"; the trains were "too much too soon". So: a good slog by hand, a path you can walk, a ladder of relief, and trains last. Chop, carry, stacking and laying keep their feel from round 2 ("it felt like my work became the track"), and the crates and little guys from round 3 stay. The decision log's rules bind it: nothing consumed and vanishing, construction that drops into place, what looks solid is solid, a small prompt is direction enough, first gifts are cosmetic.
Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor). Layout:
Threefold Reach (`.look/previz/home-redesign/`, section 3). Research: [construction you can watch](../research/construction-you-can-watch.md),
[harvest feel](../research/harvest-feel.md), [big walk level design](../research/big-walk-level-design.md), [maximal rewards](../research/maximal-rewards.md) (Gift Freight), [growing towns](../research/growing-towns.md). The stations are
Death Stranding's auto-pavers; the look of the frame, feeder and cradle follows `.look/previz/visible-materials/`; the little guys take the stubby proportions of Castle Story's Bricktrons, as our own character._

**Entry (4 November):** the bare `https://boogle.club/` opens round 4 with the clean tester view and co-op enabled in the shared room `boogle`. Its pause title is **boogle**, and its invite is the bare URL. Alone, you still do the whole job; co-op snapshots are skipped until a partner is present. `?classic=1` opens the old island in `beach`, retaining its existing saved world; headless tools also default to `beach`. Explicit `?proto=` and `?play` links keep their behaviour, `?room=` always wins, and explicit `fresh` or `coop` values override the defaults. The protos page stays available. Explicit `?proto=place&coop=1` still uses `proto-place-coop`, and `?proto=place` alone still uses `proto-place` without the clean-view/co-op defaults. Old `?room=proto-place-coop` invites still open that room. `src/features/proto-place.ts` still imports `src/proto/place/`; retiring it and reviewing the architecture come later.

**Progress (owner follow-up, 4 November):** there is no progress migration into `boogle`; the owner starts a new railway there. The old `boogle-place-coop-v2:proto-place-coop` save is simply unused by `boogle`, not deleted. Saves and saved poses remain scoped to their own rooms; later visits to `boogle` restore only that room's progress, and co-op partners still share its railway normally. Identity is already global, and visit memories stay in their original rooms. Installed apps reopen their exact current bookmark; the old-default room rewrite was removed under the 5 November current-build-only call. Playdata and reports record/group the actual room, including `boogle`.

**First run and restart:** a new player gets the existing name/colour card on the sky trolley, falls through the timber BOOGLE lettering and lands on a simple timber dock on the west shore at local `(-199,10)`, facing inland. The village is reached along the existing 130 m dirt path: a broad ramp and cottage bend lead to the threshold worker's five-second invitation; `&greeting=off` removes the line. The low hop rock now stands on the shoulder, clear of the walk. The shore is the default on the bare URL and `?proto=place`, including Node level tools. `?proto=place&v=village&intro=1` retains the previous coast and village landing in its own `proto-place-village` room (`proto-place-village-coop` with `&coop=1`); room-only invites select that comparison too. Classic keeps its original arrival and terrain. The opening is shared with classic, with Place supplying its landing, facing and ground height. Returning players skip it and resume their safe saved position. Non-intro starts, joining players without a safe personal position, Start over and invalid/older saved positions all use the same landing. Saves reject moved ground, water and scenery obstructing the landing above terrain, including the dock's shallow-water portion and relocated yard props; Get unstuck shares that clearance check and retains its nearby-ground/path recovery. Automated tools skip the fall unless `intro=1` requests it; `intro=0` explicitly skips it. `fresh=1` remains the clean view, including on explicit `?proto=place` links. The pause menu's More page has confirmed **Start fresh**, which clears this device's solo and co-op saves, every personal slice and character identity before replaying the opening. Solo restarts the railway in this room. Co-op reloads the same room as a newcomer and receives an existing partner's railway through the normal snapshot; with no partner, the railway starts fresh too. No shared reset is sent, and the warning explains both cases. The tester controls in the pause view include solo **Start over**, which resets Place directly; **Start over (both)** keeps its existing separately confirmed shared reset message. Neither needs a tuning op, so both work in `boogle`; public rooms still reject tuning and `open.lay` ops. Rules, wire shapes and the world namespace are unchanged.

**Arrival and fork (5 November, approved [signposts brief](../brainstorms/signposts.md)):** both fork boards and their post/board colliders are removed outright. The timber and quarry paths, slab, lever and progression are unchanged; an early quarry visit is welcome. The dock reuses the existing solid plank geometry over the unchanged coast, with a seven-metre-wide deck and dry inland landing. No terrain or art-style pass. The washing line, fence and optional straw-hat gift sit behind the cottage at `(-123,19)`, leaving the approach open; the gift keeps its identity, unlock and saved discovery. These are Local scenery and Owner collision changes, with no new shared state. Serves DESIGN.md 11 (Show, don't tell) and 8 (Designed for drop-in, drop-out). Phone-framed agent evidence cannot establish first-time discovery or real-time feel; those need the owner. Not tested on a device.

Playtest reports label the default visit as `place` and include its effective flags. Update notices keep reloading the current address, preserving either entry and any explicit flags.

## Production T1 branch (5 November 2026)

**Production visibility repair (8 November).** The depot's log pile commits its visibility and matrix/colour uploads
with its accepted stock, using the same `commitPieces()` path as loose piles; an empty pile hides again. Spending
your second-jump charge emits the existing 14 ivory-gold star glints below your feet, as the prototype does.
Reduced motion suppresses the burst. These are Local presentation repairs: stock, jump physics,
shared unlocks and wire data retain their owners. The cart/shelf/rocket WebKit report still needs an iPad check;
the restricted Chromium profile is a validation check, not a WebKit emulator. [Investigation](../research/safari-render-gap.md).

**Depot and carried-material visibility (8 November iPad playtest repair).** Q2–Q5's depot logs stand in the
existing prototype's timber rack form, 3.4 m toward the approach from the active frame, outside the parked
machine and frame footprint. Q4/Q5's rail shelf stands at the frame's forward outer corner (3 m along the line,
1.5 m outward), clear of the sea-gate posts. Both full pickup zones fit inside the existing 7 m server reach
around the frame. Delivered log batches commit visibility and instance colours as well as their counts; the nearby rack
offers the existing **Pick up** interaction. Rails from the forge or shelf use the existing worn steel model
for every mirrored player account, independently of the log bundle, so unloading logs leaves remaining rails
visible. These are Local views over existing accepted stock; supply, bills, capacity and copy are unchanged.
Serves DESIGN.md **7. Telegraph everything** and **11. Show, don't tell**.

**Q5 rules and the sea switch (8 November; B4 job A).** Production line two now reaches Q5: 24 logs and 24 rails
fund the 260 m trestle from the rim to Far Head (286 → 546 m, 96 rail pairs). Laying waits for the Server-kind
`rail.seaSwitch`: the first reached summit pull opens it, and the server checks the actor's reach and height at Needle Bell's summit
(world 1011.8, 102.4, −6 m). Your pull is predicted; a friend's earlier pull stands without a correction effect.
The cart serves Q5 as soon as Q4 completes, even with the gate up; its 24 rails take two trips of 16 and 8, moved
from the forge. Leftover shelf rails return to the forge when Q5 funds. The sea flag and fifth station persist
through restart; `WORLD_NS` v20 resets development worlds. The gate/switch views and summit access are separate
jobs; this rules slice adds only the frame's deposit guard. Serves DESIGN.md **Clear authority** and **Enjoyable
alone and together**. Not tested on a device.

**Supply continuation, `codex/slice2-supply` only, unshipped:** eligible drops move to the owner-selected `recovery-rack.glb` on the forge courtyard's town path at world `(905,1)`, by default after 21 host-stamped minutes and with every fresh known player more than 12 m away. It is open before the forge; ordinary Interact pickup uses the eight-log back and the model's visible-stock anchor. Its structural collider comes from the model, and its 0–3 displayed logs represent the fully counted rack account. After roughly 30 minutes, pale stumps gain shoots, saplings, young trees and finally mature harvestable trees on separate accepted minutes. The owner's later 5 November call removes the visibility requirement: growth can happen in view, occupied rooms and after T1 completion, but completed track clearings remain bare. Maturity adds exactly 10 counted production units. The existing tunables catalog exposes `railway.regrowMinutes` (31) and `railway.recoveryMinutes` (21), in integer minutes from 1–1440, through controller-authorized accepted edits. Existing main rooms retain their full saved tuning values through the explicit version upgrade; mismatched builds are refused. Frozen v0 recovery is verified before the bounded supply upgrade and atomic replacement. Great-log/boiler respawn remains in the later-slice contract. See [supply branch record](../plans/production-core.md#supply-branch-integration-5-november) for proof scope and limits.

On `codex/production-core-slice-2`, the default entry now uses server-owned T1 construction in isolated `t1v02` rooms. The historical full Place behavior below remains available through explicit `?proto=place`; classic is unchanged. This branch must not land before the owner and Grant's round 4 replay.

The same finite ordinary trees, eight-log back, 24-log first frame, wake animation, feeder and solid 41 m laid stretch use verified railway state. Local flights depict accepted transfers and cannot spend material. Carry survives under the player's identity; snapshots rebuild stock and progress without historical sounds or reward reveals. The T1 conductor-hat entitlement is stored separately with an atomic browser-locked personal claim. Later stations, stone, great beam and later personal boxes are outside this slice.

**The paused world (owner, 6 November, "economy principles amended"; built 7 November).** A room simulates only while someone is in it: 30 s after the last player leaves (a reload or a hidden tab doesn't count as leaving) it stops ticking and saves. The next join applies one away credit before anyone sees the world: the forge's rack and the depot cart fill H × (1 − e^(−away/H)) of production time (H = 2 h: 10 min away credits 9.6 min, 1 h credits 47 min, 8 h credits 1 h 58 min, a weekend just under 2 h), never past the rack's 24 rails or the stretch's log bill, and (slice 5, once the trains run) the Camp's timber yard and the Quarry's stone yard a crate per 15 s and 30 s of that time, never past their 8; a funded stretch that was mid-laying finishes (an absence shorter than the 30 s grace, such as a quick deploy, only advances it); nothing new starts. Tree regrowth and drop recovery catch up on the same join, up to 24 hours. Both rates are so quick that any real absence comes back to a full rack and a loaded cart. Code: `src/sim/railway-away.ts`, `server/src/host/world-host.ts`. Serves DESIGN.md 9 (Leave something for the next visitor).

**Freight (slice 5, 11-12 November; [plan](../plans/slice5-town-economy.md)).** Once the trains run, the Camp's timber yard makes a crate every 15 s and the Quarry's stone yard one every 30 s, each up to 8; both start full. Line 1's train stands at the Camp every trip and loads what it has room for; a train standing at a yard heading home always loads, whatever it stopped for, and its crates land in the Village's count at its line's Village platform. Line 2 makes one stop for freight: from the moment the pier's twelfth footing is set, a homeward train that is empty and on no build errand (not the footing wagon's, no kit aboard, no kit owed) stops at the Quarry's down platform when a whole trainload of 8 waits, dwells as usual and takes all 8; never while the footing wagon is still owed footings (from Q7 laid to the ring's last). Before the footings, while a kit is owed or while the wagon is owed footings, stone moves only when a lever or rider ask stands a train there. The deliveries stake the Village's plots (8, 24, then 40 timber with 16 stone, two staked at once). Freight is its own count: it never becomes logs, stone or rails anyone carries. No view yet (V1 draws the crates and stakes). Code: `src/sim/railway-sys-trade.ts`, `railway-queries-trade.ts`, `railway-trade-layout.ts`.

**Line 2, part 2's first playable: the pack and Q4 (7 November; [plan](../plans/line2-part2-greybox.md), B1-B2).** The pack frame's chest stands beside the forge once its first bill (24 logs) is in; whoever opens it opens it for everyone, so every back carries 16 from then on (the card for the opener, a flourish for the rest, as with the axe). Q4 (16 logs, 16 rails, 178 → 286 m, to the rim) waits behind the quarry gate: its frame takes nothing until the lever has dropped the slab. Its depot cart runs as soon as Q3 is laid: eight logs a trip, as before, and from Q4 on it also takes up to 16 of the stretch's rails off the forge rack onto a low shelf beside the log rack ("Take rails"), so the forge rack drops by what the shelf gains: rails are moved, never made. Rails left on the shelf when the frame funds (someone brought rails by hand) go back to the forge rack. A survey stake with a teal flag marks the rim where Q4 ends. For now the cart has no body: its loads appear (B3 gives it its trip). The away credit runs the shelf too. Once it is open every Buddy wears the open timber carry frame on the back (the same frame as Place's, with its shelf under the logs; yours and every friend's, derived from the shared pack flag, no presence field), and the haul bundle sits on it. Code: `rail.pack`, `rail.depotRailTake` and the depot in `src/sim/railway-systems.ts`; views `tools.ts` (the chest and the worn frame) and `shelf-view.ts`. `WORLD_NS` v18. Not tested on a device.
**Line 2, part 2's first playable: the pack and Q4 (7 November; [plan](../plans/line2-part2-greybox.md), B1-B2).** The pack frame's chest stands beside the forge once its first bill (24 logs) is in; whoever opens it opens it for everyone, so every back carries 16 from then on (the card for the opener, a flourish for the rest, as with the axe). Q4 (16 logs, 16 rails, 178 → 286 m, to the rim) waits behind the quarry gate: its frame takes nothing until the lever has dropped the slab. Its depot cart runs as soon as Q3 is laid: eight logs a trip, as before, and from Q4 on it also takes up to 16 of the stretch's rails off the forge rack onto a low shelf beside the log rack ("Take rails"), so the forge rack drops by what the shelf gains: rails are moved, never made. Rails left on the shelf when the frame funds (someone brought rails by hand) go back to the forge rack. A survey stake with a teal flag marks the rim where Q4 ends. The away credit runs the shelf too. Code: `rail.pack`, `rail.depotRailTake` and the depot in `src/sim/railway-systems.ts`; views `tools.ts` (the chest) and `shelf-view.ts`. `WORLD_NS` v18. Not tested on a device.

**The depot cart's real trip (8 November; [plan](../plans/line2-part2-greybox.md), B3).** The cart now has a body and a road: from its stop at the timber camp (line 1, 196 m from the turntable) down line 1, over the turntable beside the forge, and out along line 2 to a stop 13 m behind the waiting machine, by the active frame's rack. It loads up to 24 logs at the camp (Place's load; the depot mints them there, counted as production), stops at the turntable, and from Q4 on waits there for the stretch's rails off the forge rack (up to 16; an empty forge keeps it waiting, and the rack's tag says **Waiting for forge**), then runs out, heaves its load onto the rack and shelf in a stream and goes home. It runs at 9 m/s and eases in and out of every stop at 3 m/s²: about 70 s for a round trip to Q2, 88 s to Q3 and 101 s to Q4. The rack's tag reads **Loading**, **On the way** or **Unloading**, with **More coming**, while it serves the stretch. There is no call handle: the amber **Call cart to forge** handle by the turntable was cut (owner, 9 November; [decision](../decisions.md#trains-and-the-world)), since the cart already serves the next rack by itself; its op and the cart's `recall` field went with `WORLD_NS` v25. To ride out, board it at the forge stop while it takes rails (about 3 s). You can ride it anywhere along its road; a partner sees you on it. There is no ridden speed bonus in this build (owner, question 3). The server owns the trip: the cart is sent only when its phase changes, and every tab places it from its estimate of the server's tick, so its pose is the same everywhere. A load that set out for a stretch someone filled by hand goes on to the next stretch's rack. The away credit lands the load under way and runs whole trips for what is still owed. Code: `src/sim/railway-cart.ts` (the pose), `rail.cartTick` and `rail.cartCall` in `src/sim/railway-systems.ts`, the view `src/entities/railway/cart-view.ts`. `WORLD_NS` v19. Not tested on a device.

**Instant feedback (replication R1b, 6 November; owner call "Input gets instant feedback").** Your own chop, mine, pickup (pile, recovery rack, forge rails, depot), drop and deposit play their result on the press, before the server answers: the stroke's logs or stone fly to your back, the tree shakes or falls, a dropped pile appears, the frame fills, the carry tag counts. Waking the machine starts its 3.1 s wake on the press, and the server starts the wake at the tick you pressed, so the machine is ready exactly as its animation ends; pulling the quarry lever swings it at once. Partners still see your action about one round trip later, as before. A stroke the rules would not take yet (the machine still waking) bounces off with the rebound sound and sends nothing; a full back keeps its full cue. When the server refuses or someone else got there first (the last log in a pile), what you were shown goes back physically: the pieces lift off your back and arc to whoever got them, or back to the tree, rock, rack or pile; a pile you dropped onto shrinks as they return to you; a tree that fell in your view stands back up with a shake. A stroke unanswered after a second shows the stall cue: the axe hangs at the bite, wobbling, until the server answers. Bills completing and the forge lighting are left to the server: the frame shows full at once, and the machine starts when the server confirms it (one round trip). Serves DESIGN.md 7 (Telegraph everything) and 11 (Show, don't tell).

**Keeping your load (6 November evening; owner: "you keep your load, or it goes down where you stood; you're never pulled back").** Hiding the tab, a reload or a dropped link no longer takes anything from you. While the connection is gone the world stays as you last saw it (your carried logs stay on your back, a laying machine keeps laying) and your actions wait; when it is back, the world eases to the current state instead of rebuilding. The great beam stays yours while you are away, up to three minutes (`railway.beamGraceS`): come back in time and you are still carrying it. Stay away longer and it lies on the ground where you last stood, ready to pick up again; a beam you put down anywhere on line one's ground stays there too, instead of going back to the great tree. One left out of everyone's reach still returns to the tree after 21 minutes. Serves DESIGN.md 8 (Designed for drop-in, drop-out).
**Setting the load down (10 November; owner: "I was carrying extra resources and had to drop them in place"; [station-deposit](../brainstorms/station-deposit.md) build 0).** A tap of Drop (right click, pad R3, the touch Drop button) still puts one piece down. **Hold Drop for 0.4 s** and the whole back goes down as tidy piles of eight at your feet; the throw's charge bar fills while you hold, and a release before it fills is the tap. A back with one piece or none, or a footing, acts as a tap at once. **A big load is never refused for a loaded back:** pressing Shoulder a footing (Works rack, pier rack, a footing pile), Pick up the great beam or Pick up the boiler with logs, stone or rails on your back puts that load down as piles beside you, on the side away from the big thing so it doesn't win its prompt, then takes the big load. It is composed on the client from the existing drop and take ops (no new op, wire shape or save): the host spaces drops by 90 ms, so a back of 16 is two piles 100 ms apart, and the boiler and beam are taken once the host has settled the drops (a moment, not a second press). "Empty your back first" stays only where a load is not the whole story: a footing, the great beam or the boiler already on your back, or something in your hand. Not placed away from the rails or the platform yet: a pile can land across a track.

The original opening terrain, village/camps, forge scaffold, signs and locals share their render constructors. Interiors, discoveries, later town growth and forge work are not promoted. The telescope and the buoys are (below, after Far Head). The former local/co-op save descriptions below do not describe production T1: production never imports their saves. Personal return poses use the original ground/footprint safety policy and cadence under a separate namespace/room/pid key. Solo and two-player T1, one personal claim each, standing on track and a solo layer ride passed real-input broker runs. Browser reload and complete opening parity remain unverified. See the [slice record](../plans/production-core.md#slice-2-branch-record-5-november-2026-technical-proofs-in-progress) for technical evidence and departures; no pacing retune is implied.

**The production forge reads finished (6 November evening playtest).** Its bill stands before the frontage, out past the scaffold poles, so the second bill's walls never hide the count (a board on posts since 9 November: Signs at the stations and racks, below). Lit, it keeps the prototype's furnace opening in the front boards, so the glowing mouth shows; the chimney smokes; and each rail the server pours flies out of the mouth onto the rack, where the rails stay visible until taken. The forge finishes when it lights (owner, 10 November: "Forge should finish when the player finishes building it"; its last hand-fed bill is the walls and chimney): the moment the forge lights, eight roof beams drop onto a stack beside the village halt, two village little guys carry them to the forge's ends in pairs and lift each pair on as a truss, a quarter of the roof's boards follows each, the scaffold poles come down, the chimney gets its cap and Place's walk-in workshop, its interior, opens (about 20 s; Local, snapped finished on a reload or for a late joiner; no train is involved; Place's freight crates and doubled pour are not ported; [works-late-game](../plans/works-late-game.md), step 6). Every receiver's feeder bed is fitted to its 0.7 m span and collider, so it no longer runs back through the receiver's side. Local presentation over the mirrored forge; serves DESIGN.md 7 (Telegraph everything) and "Machines show their work physically".

**Built (owner, later on 10 November 2026): "Forge should finish when the player finishes building it btw, and it should have an interior."** The finish is the forge's last hand-fed stage and the workshop is its interior, furnished on the owner's "Furnish it" (10 November; the earlier "existing workshop is enough for now" was the orchestrator's reading and is replaced: [furnished](../decisions-rail.md#d-2026-11-10-furnish-the-forge-s-workshop); [decision](../decisions-rail.md#d-2026-11-10-the-forge-finishes-when-the-player), [confirmed](../decisions-rail.md#d-2026-11-10-the-forge-s-finish-is-its-last)). The roof show takes about 19 s after the forge lights (measured at real speed: the first truss on at about 8 s, the second at about 16 s, the poles down and the workshop open at about 19 s; the crew carries at a trot and both guys use the village-side end, since the far end is walled off by the rack and the bill board, where a guy used to stand stuck for the whole 12 s leg; a restore when the machine begins to cross, a few seconds after the lighting, no longer snaps it finished mid-show), so for those seconds it stands lit with its roof going on; it never waits for a later point in the game. The workshop's door stays on the front for now (town-layout step 4b moves it).

**The workshop's furnishing (10 November).** A smithy, built from the stool's vertex-coloured kit material in one merged mesh (one added draw call, no new shader program; the lanterns' glass reuses the furnace mouth's glow): a plank floor over dark seams with a flagstone apron before the furnace; the chimney's brick breast with a sooty hearth opening in the back-left corner, so the chimney stands on something; an anvil on a stump with a hot bar and a hammer, and a quench tub, a few metres in front of the furnace's mouth lane; bellows on a trestle against the furnace's right side with its nozzle into the wall; a workbench along the back wall with a vise, bar stock, a horseshoe and a hammer, and a tool rack above it (hammers and tongs); a stack of logs against the right wall; six finished rails leaning on the left wall by the door; two wall-bracket lanterns. Solids exist for the breast, anvil, tub, bellows, bench, logs and rails, the way the furnace guards already do; the racks, tools and lanterns on the walls have none. The furnace, its guards, the stool and its exit are unchanged, and the lanes stay clear: the door (x -4.3..-1.65), the 1.6 m strip before the furnace mouth, the stool's exit spot. View-only (no sim, wire, save or `WORLD_NS` change). Both the finished production forge and Place's walk-in forge show it (they share `workshop.ts`). Checked with `dev/look/evals/railway-forge-walk.ts` (a player walks door, furnace, stool, bench, rails, hearth and out over the real colliders).

**Town greeter (8 November playtest note).** Sleeves, the yellow shore worker, stands beside the dock-to-town path at the town entrance. Within 8 m he faces and waves at this player; within 3.3 m Interact offers Talk through the existing townsfolk conversation card. Repeated conversations rotate three short lines per stage: asleep/waking, awake before the forge lights, forge lit before Q2, Q2 onward (Needle Bell), and the sea gate open. Each new stage starts with its current direction. Entirely Local, reading the railway mirror; no progression, saved state or Boogler copy changes. Serves DESIGN.md 7 (Telegraph everything).

## Production line 1 continuation (5 November 2026, slice 3 branch)

**Single-press wake (8 November solo playtest fix).** The six-metre “Wake it up” prompt and the server's existing
ten-metre allowance now share the parked machine's centre. Previously the server measured from the receiving frame, so a visible prompt on
the far side could start a predicted wake and then be refused. One E tap starts the existing 3.1 s show; no hold
or repeat is needed. Unready connections keep the existing connecting status and offer no wake action.
Serves DESIGN.md 7 (Telegraph everything).

**Current branch, unshipped:** the integrated slice-2 base is `f0be49a3`. The [slice-3 plan](../research/slice3-plan-2.md) now continues the same accepted material authority through T1's 24 logs, T2's 32 logs + 8 stone, and T3's 40 logs + one unique great beam. Stations accept only their own outstanding bill in order; a funded station pins its feed and departure/lay schedule. Local swings, flights, piles, stock displays and the one machine display accepted state. Rejoining reconstructs that state without replaying historical sounds or rewards. This entry supersedes the T1-only scope above for this branch; the earlier records remain historical evidence.

**Materials and recovery:** logs and stone share eight back slots. Each of three rocks supplies eight stone, two per accepted hit with either axe. Spent rocks re-form on the same slow `railway.regrowMinutes` control as trees, adding exactly eight counted stone production units per rock; departed players retain their carried units. The three-departed-carrier witness in `test/railway-line-authority.test.ts` exhausts all 24 initial stone into absent players' backs, renews the rocks and finishes T2 with another player. Drops of either material can age into the existing courtyard recovery rack. Ordinary tree renewal remains counted and leaves completed track clear.

**Earned tool and beam:** neither T2 nor T3 grants the proper axe: since the 7 November great beam pass its chest waits on a stand by the forge once the forge is lit, and opening it grants the shared tool. Proper hits supply up to five logs and five work, bounded by free carry and source stock. The first proper hit counts an ordinary tree's five extra units once; subsequent mature renewal supplies fifteen. The two authored hardwood reserves are available only to the proper axe. The great tree needs twelve accepted hits of any axe once Station 3 is open, and creates exactly one beam; beam and logs fund T3 in either order. An empty back is required to claim it. Its holder identity, session epoch and revision fence competing takes, drops, departures and stale releases; accepted T3 delivery wins over later recovery. Unsafe or orphaned cargo returns to the same source anchor, never a second beam. Solo carry defaults to 2.2 m/s; a nearby empty-backed helper can bring it to 5 m/s without claiming another item. These speeds, construction pacing and the optional jump's movement values use the tunables interface.

**Chop restoration (5 November iPhone playtest):** production calls the exact floating curve from morning commit
`1b19093f` through `applyFloatingChopPose`, also used by legacy Place and the asset stage. It retains the 120 ms
linear wind-up/contact, 35 ms bite hold, pull-back ending at 300 ms, 240 ms restart and 900 ms visible tail.
The production-only +0.28/-0.5 rad body pitches and full-back body lean are removed; the socket no longer adds
those motions to the axe. Proper-axe refusals use the original recoil. Current production axe geometry, tool
unlock rules, accepted yields and beam behaviour stay unchanged. The same floating summon/vanish sparkle now
also follows production visibility edges, with reduced-motion suppression and no extra sparkle on repeat strokes.
All motion and sparkle are Local; accepted contacts still own harvest sounds, chips and material flights.

**Rewards and the walk:** T1 retains the conductor hat with claims scoped to the current world; T2 adds an independent scarf claim through the same atomic personal-profile lock. Shared tools and path completion are separate from personal cosmetics. T3 finishes the solid line to the existing village stub, derives the lamps and additional locals/commuters once, and leaves the machine at its safe village waiting point. Two solid timber approaches at line positions 14 m and 30 m connect the grass bypass beside the parked machine to the raised track bed; each reaches deck height before crossing the bed’s side, so the walking route needs no jump. The first jump device is optional: reaching it permits shared acquisition without requiring path completion, and walking home requires no jump upgrade. No forge, depot, boiler, hook, glider, pack or trains are promoted. The hook remains a zip-line pull in the later-slice contract.

**World identity and integration (updated 5 November):** the current-build cleanup starts fresh at `WORLD_NS = v10`, with production rooms under `rail-v10`, disjoint from classic `v10-<room>` names. Saves and personal claim keys use the current world; no old-build admission, migration or historical claim-key mapping remains. The isolated `t1v01` development spine remains. The Slice 3 evidence below records its earlier `v09` build and is not proof of this cleanup. Production uses the shared flanged-wheel machine, magazine and rigid trolley/hoist/clamp choreography from “Commit track and stock in whole panels”. Accepted integer panel contacts commit visible track and supporting colliders together and decrement the single twelve-panel allowance, partitioned 3/3/6. The continuous head retains its captured departure integral; the cars initially wait behind the committed frontier, then roll forward after closure. Quiet snapshots reconstruct the accepted cursor and body setback without contact effects. The final village waiting point and timber approaches remain. Fresh broker evidence below covers the integrated panels.

**Proof boundary:** fresh solo/co-op runs on the integrated main build pass T2/T3, the earned axe, unique beam and both path walks; both co-op players ride all three panel stretches and exercise helped beam carrying. The [production acceptance ledger](../plans/production-core.md) links the inspected T2, T3, helped-beam and walk-home stills, every failure/repair, and measured segment wall times. The panels and village approach are readable; one beam spans both players, though their hands remain down and grip feel is unverified. Static checks pass with 396 unit tests and ten grounded placements without problems; server tests pass 104/104 and queued network assertions pass 196/196. The trusted `world-inputs` run passes classic only; production parity and the listed T1 acceptance gaps remain open. Timing under load does not establish responsiveness, smoothness or feel. Not tested on a device. Stop for the owner's first-path verdict: “Did finishing this line make the walk home feel worth the work?” The Boogler's copy remains untouched. New prompt lines for owner review: “Empty your back first”, “A proper axe first”, “Help carry” and “Let go”.

## The place

**Track-layer clearance (5 November iPhone follow-up).** With no first panel target, the empty boom now parks
along the track instead of pointing through its own origin and cutting sideways into the camp chimney. The
working trolley, flanged wheels and whole prefabricated panels retain their model, dimensions and choreography.
Station frames stand 7.5 m from the centreline; their short feeders stop 5.8 m out, clear of the loaded magazine
and curved carried panels. Reward crates follow the frames. The first jump pillar and its existing course move
4 m outward together, preserving every jump gap and recovery ramp. The drum seats across the pad, away from
passing stock. Its flat lip overlaps the completed deck; production reveals its mesh and collider only after
accepted panels and the whole local machine have passed (before T3 finishes), preserving the optional early
device visit. This avoids a low magazine passing through the walkway on the steep grade. Authoritative centimetre anchors
follow the three frames, attached axe stand and drum.
The production level check decodes the current machine and sweeps all 56 rail-pair cycles, closure returns and
the village approach against authored buildings, full station stock, standing trees, rocks, racks, the jump pillar,
its construction-derived lip, path lamps and opening props. Actual curved carried-panel triangles and tapered
pillar bands avoid phantom contacts; a new panel never sweeps from the previous panel’s settled position.
It samples choreography at 0.001 phase, bounds interpolated rigid-transform steps to 10 cm and expands obstacles
by 25 cm. This is an offline clearance envelope, not device or real-time motion proof; players, dropped cargo
and falling trees remain outside that static-route check. Serves DESIGN.md 11 (Show, don't tell).

**Production foundations (5 November repair).** Completed opening buildings retain their permanent foundation slab,
matching Place's completed construction state; only the temporary scaffold poles disappear. The level check in
`npm run check` samples the rendered terrain triangles over every production building/forge footprint at at most
25 cm spacing, including rotated edges. It rejects exposed foundation gaps or terrain above the seating surface
over 5 cm. The authored below-ground foundation skirt is intentional.

The rail-bed cut takes precedence over station support-pad blends, including the descending T3 trestle approach.
Connected station frames/feeders are capped at the adjacent rail-bed datum; already lower assemblies retain their
height. Padding cannot lift terrain through the track. At a skipped cliff edge, bed protection extends one metre
beyond the pad blend to cover its adjacent terrain triangle; unrelated path/rail crossings keep their authored terrain.
The audit executes both panel and continuous `buildTrack` geometry and samples the full transformed sleeper/deck top
and rail underside footprints (including tilted ends). Terrain penetration over 5 cm fails; open space under elevated
track is intentional. The tree-catalog snapshot remains before these terrain adjustments.

The audit also checks opening prop supports, attached arch/cart/lookout pieces, crane and rack feet, decoded recovery-rack
and station-kit feet, cove supports, bridge bank bearings, both settled station reward crates and every standing tree root. Connected scenery shares one
assembly height; piers reach down to terrain, and the cart rests on a small level shoulder. Tree centres use the actual
terrain triangle instead of the catalog's rounded grid height. Batched root skirts reach the downhill edge while the
uphill soil may bury the lower trunk. Root shoulders stay capped when the narrower felled stump is exposed. The audit
selects named crane/rack bearing meshes independently of their height and requires their expected counts, so a raised
or missing post cannot silently disappear from the check. Tree identity and catalog ordering stay unchanged; these are Local geometry and
collision changes. Moving cargo, vehicles, floating collectibles, distant landforms and future town growth are outside
this static support audit.

An island about 440 m across, 1 km east of today's, in the crossing's sea. A Y-shaped gorge, with walls about 16-30 m high
and a river at the bottom, splits it into three lobes: the village (west, 18 m), the timber camp (north ridge, 30 m) and the
quarry (east table, 24 m). Needle Bell, a leaning 105 m spire, stands where the gorge forks. Two low footbridges cross the
river, each just spanning the water: a 3.4 m deck with a low arch, landing on the sand a metre or two past each
waterline (further where the bank slants across it), with rails on stout capped posts that stop short of both ends so
you can step off sideways (owner, 10 November). Past the quarry, across about 170 m of sea, is **Far Head**, a low headland you can't walk to until the line gets there. Across the sea to the north, about a kilometre out and out of reach, stands a dark island with a broken ring on it
and a bright shard in the ring's middle. Two physical things point at it: a line of orange buoys straight out from the end of the pier, and an old brass telescope on the ridge's top, aimed at it; **Look through it** (Interact).

**The lookout in the live game (job F3, 9 November; `src/entities/lookout/`).** Both stand in production with no flag.
Seven orange buoys (lifted off as the railhead reaches them, from 11 November: see "The railhead and the gap") bob in a line from where the pier ends towards Ring Island, 62 m apart, the last about 20 m off its
waterline (Place had twelve; on the production map the last five stood inside the island's hills). The telescope stands on
the ridge's top at Place-local (-15, -207), 15 m east of Place's spot, which was among pines that blocked the view. Its
barrel points where its view looks. **Look through it** cuts to the one fixed view from the eyepiece: Ring Island, ring and
shard left of centre, and the buoys as small orange dots running in from the right towards it (2× makes them plain). The
pier itself is just off the right edge, so this view doesn't yet show construction changing (the brief's recurrence test).
Camera and zoom reset on every visit. The view never pans (owner, 6 November; the live game has neither the v1 fly-out nor `v=pan`); +/−,
shoulders or the onscreen buttons zoom up to 2×. Interact, Escape, pad B/Menu or **Step back** exit immediately. The view
takes local input while the world continues. The cut is immediate and nothing drifts, so reduced motion needs no variant.
Local only: no shared state or friend-following; construction and remote poses remain the scene's owners. Tuning is
`telescopeTuning` in `src/entities/lookout/view.ts`. The [brief](../brainstorms/telescope.md) remains proposed;
recurrence/fun needs the owner's playtest. `?proto=place` keeps its own copy until D1.

## The run

**Owner decision, 8 November: great-beam visual inertia (option 1 of [the Godot comparison](../research/beam-carry-godot-comparison.md)).**
The existing rope drag and Help carry now have a Local horizontal/turn spring, derived only from the existing smoothed
Owner avatars and helper state. Terrain pitch, the 0.3 s helped lift, speeds, claim, collision and progression stay as built.
The response starts from the lab's 520 stiffness / 95 damping / 12 kg ratio (43.33/s² and 7.92/s), with centre lag capped
at 0.2 m and yaw lag at 0.12 rad. A 5.4 m trunk's endpoints therefore stay within 0.524 m of the unsprung visual pose;
even the tunables' maximum bounds stay under 0.84 m. Pickup, restore and relocation start without stored
momentum; set-down hides and resets the spring. Reduced motion uses the unsprung pose. The rope still samples the final
animated hand, and attaches to the rendered trunk's near tip. Buddy braces its right arm when pulling; a helper raises
its right forearm under the lift. Those pose flags are Local and clear when the view stops carrying.
`beamCarry.stiffness`, `.damping`, `.maxLag`, `.maxAngle` and `.grip` use the existing tunables interface on the next frame.
Set the last three to zero for the comparison control. This is visual weight, not shared physical carrying.
Serves DESIGN 11 (Show, don't tell), 8 (Enjoyable alone and together) and Clear authority.
The owner's question: **does the beam feel connected to your hand and pleasantly heavy when you turn, alone and together?**

Seats use the deck's actual cargo-top surface and refresh it while sitting. A loaded train no longer pulls a seated player toward the bare deck and silently ends the seat (and its Stand up prompt) when that error grows.

A seated rider keeps the previous carry vertical speed until the ordinary carry controller applies the deck's next motion. This prevents a sharp slope or snapshot correction from looking like a jump during carry detection. Jump/Interact still release the seat first; no contact thresholds or shared state change.

Empty train cars have two fixed deck-sitting slots instead of chairs (owner, 5 November). Their IDs and longitudinal spacing stay the same; the anchors sit 0.2 m inside the side edge so the existing simple seated pose hangs its legs over the side. There are no chair meshes or chair solids on these cars: the original single deck box supports both sitting and standing. Body height is deck height plus the player radius, 0.55 m lower than the former chair anchors. Proper passenger seating is deferred to an upgrade; the track-layer machine's operator chairs remain a separate branch's work.

Resting places retain their safe aisle exits, with body height clamped above the platform's current `topAt` surface. Movement stays Owner and transient claims stay Host; no presence or grant shape changes. The floating **Stand up** hint stays visible for three seconds, then fades over 0.35 seconds; the target and Interact/Jump exits remain available. Sitting again restores the hint. On a room lead change, transient claims release and occupants stand at their authored exits; they can sit again after the new lead assigns a fresh claim.

The remaining workshop chair's four rigid parts share one vertex-colored geometry and material: one color draw and one shadow draw per visible chair. Removing the four train chairs removes four meshes and eight chair solids across the two empty cars; each car retains its deck collider. The chair builder and shared seated/carry/remote-rider code remain unchanged for other seating.

Cosmetic reveals show rarity stars on their own row beneath the name, alongside the complete original gift line. A line no longer replaces the stars (including the scarf); the text column can shrink and wrap on portrait phones.

The sleeping machine and old trains use solid, dull oxidized paint and iron, with no spatial rust pattern. Their existing wake uniforms restore paint roughness and the wheels' steel response. Timber decks and sleepers retain their grain while the engine sleeps. This is Local material presentation (DESIGN.md 11, Show, don't tell); wake timing and shared progression are unchanged.

**Trees, 3 November (owner's approved comparison):** 391 trees now share one harvest catalog:
388 ordinary conifers, two optional hardwoods and the great tree. The original 29 IDs stay fixed;
the 362 former scenery positions append as IDs 29–390. Hardwood IDs **209** and **232** stand
at world **(898.824, −46.766)** and **(921.228, −45.184)**, north of the forge on the return route.
They have broad crowns, forked thick trunks, ridged grey-brown bark and a small fallen branch
with a pale end. Starter contact rebounds without output or a deepening notch. The proper axe
fells either in three productive swings for **15 ordinary construction logs**: a remembered
source close to later work, not a new material or a required gate. The great tree still takes
twelve proper-axe strokes and yields its beam only while Station 3 is active and still needs it. Earlier attempts rebound without work. Rock bands stay, identifying breakable rocks.

Ordinary work uses integer fifteenths: starter adds 3, proper adds 5. The starter extraction
ceiling is 10; a proper-axe hit on an unfinished tree raises it to 15 minus already issued logs.
A clipped bag payout leaves its remainder on the standing tree; it fells only when work and
output are complete. Thus the eight-slot proper-axe example yields **5 + 3**, then after unloading
**5 + 2**, rather than losing two logs. A full bag advances nothing. There is no regrowth,
bill increase, carry reduction or new ordinary-tree tier. This follows [tree-tiers](../research/tree-tiers.md).

The internal `objective.ts` label is now **“Chop an ordinary tree.”**, replacing the false
**“Chop a tree with an orange band.”** with the owner's authorization on 4 November.
This telemetry-only correction is complete; no copy is held for a later change. No conflicting
resident or Boogler tree-band line was found; their player-facing copy is unchanged.

**Beautiful-corner rough kit comparison (3 November):** `&corner=1` adds two existing timber runners beneath Station 3's feeder, giving the receiver-to-machine link a stronger silhouette. They reuse the kit's bottom pivots and fit inside the existing feeder collider, below the exposed rollers. This is Local presentation only; the default round, route, costs, material travel, saves and co-op are unchanged. The [approved plan](../plans/beautiful-corner.md) records the baseline/contact audit and stops after steps 1–2; final banks/materials wait for the real sea, demo-sky/AgX bake and terrain decision.

All numbers are hypotheses until played, set with `node dev/economy/model.ts round4` and recorded in [round-4.md](../plans/round-4.md). The model's walking-only floor for the first path is 6.4 min; the target is 6-9 min of real play.

1. **The world gives direction** (DESIGN.md 11; owner's decision after round 4, 3 November). There is no objective text box, orange objective beacon or screen-edge arrow, including after idling or pressing Interact with nothing nearby. The internal objective calculation and `objective` playdata events remain for progression reporting and checkpoints; those strings are not displayed. The dock faces the wide path into town; at the town threshold are a half-built forge with little guys hammering on its poles, a crane, a rail stub, and the **curio shelf**: shapes under dust sheets and a row of dull crystals. The pause view shows **the player name, Live count, money and any current carry**. When money increases, its count also appears at the top right, ticks up, and fades after two seconds without another increase.
2. **Walk and wake.** The path winds north, down the wall, over a footbridge under where the trestle will go, up and round the ridge: 431 m, about 78 s, with gold finds, crystals and a rock arch (the "moment of discovery": nothing marks it). The machine sits at the camp end of line 1, rusty and dusty, a rusted train behind it. **Wake it up**: about 3 s, and you keep control: shudder, rust shaking off, the boiler coughing faster, the wheels slipping, a burst of steam, the headlamps, a whistle.
3. **By hand, and it gets long.** Your back holds 8. All **388 ordinary conifers**, including former decorative land trees, work with the equipped starter axe: **5 productive strokes**, **2 logs** per full stroke, **10 logs** total. Trees have no orange bands. **Click / RT** chops directly; **E / X / Square** also chops with empty hands when there is no ordinary interaction in reach. An ordinary interaction, even a blocked one, takes priority over a tree. Touch uses that same priority and its label and the floating Interact glyph describe what will run. Trees stay finite and felled trees stay felled. Partial work and unclaimed output persist; a full bag spends neither. Nearby sources now participate, so the lengthening carries are a playtest question, not a guaranteed pacing claim:
   - **Station 1:** 24 logs. The grove's about 20 m off.
   - **Station 2:** 32 logs and 8 **stone**, from rocks with an orange band near it (click: **Break**, once you have the multi-axe; 4 strokes, 2 stones each; sparks, and a lump comes off with each stroke).
   - **Station 3,** at the rim: 40 logs and **the great beam**. The great tree stands apart, twice the size, at local `(-4, -138)`, about 53 m from the receiver, and takes 12 strokes of your first axe; it comes down slowly and shakes the ground. From the moment Station 3 opens, its frame shows two empty timber saddles with loose gold lashings, and the great tree wears the same gold rope round its trunk, over broad buttress roots; before that a swing at it rebounds. Logs and beam go in either order: whichever arrives last starts the feed. **Pick up** the trunk and you drag it on a taut gold rope from Buddy's animated right-hand held-item socket (sampled after the final walking, jumping and landing pose on both the carrier's and friends' views, including Help carry), the near end at your hip and the far end scraping the ground behind with small dust puffs, **2.2 m/s solo**, no sprinting, with an empty back. In co-op, an empty-handed partner uses **Help carry** at the dragging end: it lifts over 0.3 s and the same beam spans both shoulders and its owner walks at **5 m/s** while the helper stays within 5 m and 2 m vertically. **Let go**, moving apart, or either player leaving releases the helper. The helper moves independently; there are no chained physics bodies and the beam never changes owner. Helper departure leaves a solo carry; carrier departure returns the unconsumed trunk to its source through the existing recovery rule. It lands across the frame's saddles with a thud and the lashings tie round it. This source move changes beautiful-corner's old 29 m approach composition, not its receiver, feeder, machine, crossing or landing fit. The separate village seesaw remains unchanged.
     **The multi-axe** comes when the machine first wakes, as its show ends, since nothing can be chopped before then: "You got the multi-axe!", with a pick on the back of the axe's head. Rocks offer **Break** only once you have it. It's a rung (`job.rung.multi`), shared in co-op like the others.
     **Drop:** right click (pad R3, the touch **Drop** button while something's on your back) puts one piece on the ground in front of you, rails first, then stone, then logs. Dropped pieces stay in a pile where they land, saved with your back; Interact there (**Pick up**) takes back what fits. Your own, not shared in co-op.
     **Ping:** G, middle click and D-pad left retain their own action. Its touch button sits beside Drop, including fresh play, and stays available with an empty back.
     Each frame's logs stack up, roll along its feeder into the machine's cradle, and it drives, dropping sleepers and rails; bents go in ahead of it over the gorge. You can ride it or stand on the fresh track. Stations 1 and 2 each hand down a **box** (below).
4. **The first path opens, with no train.** Station 3's stretch is the whole trestle and the run home, and when the machine gets there: whistles wherever you stand, the view shakes, a big "A way across!", rockets down the gorge and over the village, the pull-out (about 4 s; only Interact ends it, once its glyph shows at 0.8 s; nothing else does, 9 November), lamps coming on one by one along both edges of the deck from the near rim, the village pouring out, and five little guys running out across it (from then on they walk it, there and back, all day). The new way from the village to the machine is **191 m against 431**. The first end-to-end crossing records its time and plays the fanfare, without a comparison banner (owner, 5 November).
5. **The ladder.** Each rung is earned, physical and arrives as you start wanting it:
   - **A proper axe:** the lit forge's first made thing (7 November): an iron-banded chest with a low blue glimmer on a solid pale stand beside the forge frame, on the side of the two hardwoods it opens. Station 3 and the path no longer grant it. Already-upgraded saves do not receive it again. Ordinary trees remain **3 strokes, 5 logs a stroke** (2.5x the logs a swing, half again the logs a tree), with more chips and a little kick. The axe remains a shared rung inherited by late joiners.
   - **The forge, by hand:** its frame stands by its north wall. Logs roll in and its pieces drop, no scaling: 24 logs for the timber frame. The oak and former decorative trees on this side can supply it; which nearby trees remain changes the next carry.
   - **A pack frame:** a chest when the frame's up. An open timber frame with shoulder straps and a shallow canvas cradle, proportioned to Buddy and below the head so it stays clear of the follow view, **16 on your back**. Then 32 logs for walls and chimney, and the forge lights, roofless, and pours rails. The machine turns on the turntable for line 2.
   - **Line 2, station 1:** 16 logs and 6 rails: finite nearby trees for logs, the forge for rails. When it's laid, **the depot**: the camp builds its sawmill, and two little guys start shoving a cart of 24 logs down your track, over the turntable, to **a rack by the next frame**. You do the last carry. Rails stay yours to fetch from the forge through station 3, unless a partner loads the cart.
6. **The long second route.** Four more frames, each bigger: 24 logs and 12 rails, over the stem of the gorge; 16 and 12, to the quarry; 16 and 16, across the table; 24 and 24, out over the sea, 260 m of trestle in one go, all the way to Far Head. **From station 4, the little guys bring rails too:** the same cart stops at the forge, loads real forge stock onto its logs, and heaves both onto the frontier rack. Rails land on their own low timber shelf beside the log cradle, visible even after the logs are taken. You still take the pieces and carry them into the frame. The cart holds 16 rails: station 4 fits one mixed shipment; station 5 gets a second rail shipment unless a partner brings the balance. An empty forge makes the cart wait for production. Bills, automatic-cart speed (9 m/s) and forge output are unchanged; a manually loaded cart with a rider now earns the co-op bonus below. Machine speeds rise, 5 m/s on line 1 to 9 m/s on the sea. Far Head gets rockets at both ends, a big "Far Head!" and lamps along the trestle.
7. **Trains come last.** The forge has cast a boiler. It waits on the open apron beside the rail rack and return track, at local (-81, 5.4), rather than behind the forge. The mesh and pickup share that position. It's 546 m home, about 98 s, and the walk is meant to be felt. **Pick up** the boiler and haul it on the great beam's gold rope over your bridge to the old train at the camp (its nose at your hip, its tail dragging and scuffing dust, sprint off, 3 m/s; a friend's **Help carry** lifts it between you and the pair walk at 5.4 m/s, about a free walk; boiler-first-choice plan, step 6), **Fit the boiler**: it wakes as the machine did, with steam, wheels and whistle, and no words. Then the biggest show since the first path: **TRAINS**, and the stations drop into place all along both lines. Line 1's train runs camp to village, line 2's village to quarry to Far Head, at 20 m/s. Trains stop on request (owner, 10 November): a train stops at a middle halt only when someone asked it to, from the halt's lever or aboard, and otherwise runs straight through (step 8 and "Stop on request" below). **Station 6 waits for the train** (boiler-first-choice plan, steps 1 and 3; owner, 9 November): until trains run, its frame takes no logs or rails by hand and shows no bill, its rack and rails shelf offer no **Pick up** or **Take rails** (leftover logs from station 5 stay on the rack and count towards the kit), and the forge rack offers no **Take rails**. The rack's sign shows the old train's own loco side-on, its missing boiler a dashed gold outline in the rope's gold, pulling one wagon heaped with a log and a rail; no number. Walk into the frame's reach carrying anything and the sign answers once, wordlessly: one bob, one steam puff from the drawn chimney and a soft tick (the puff only under reduced motion); it answers again only after you leave. The first train's unload is when the sign flips back to the log count and the frame takes its kit: a station 6 part-filled by hand before this keeps its stock and the train brings the rest.
8. **Stations and asking a train to stop.** There are no platforms until there are trains, so what they're for is obvious: a platform with a bright edge, a roof, a bench, a signal, a request lever and a board, one at each stop. **Pull the lever at the foot of the signal mast** (**Request stop**): the handle stays over, its lamp lights, the signal's arm drops with a clank, and the next train heading your way stops. A middle halt (the quarry, and Far Head once the pier is open) has two handles, each on a plaque naming the end it goes to. Aboard, Interact offers **Request stop: <halt>** for the next halt the train can still brake for; the bell rings for everyone aboard and an amber lamp lights on the engine's cab roof until it stops. Standing on a platform no longer calls anything. Otherwise trains run end to end with their cargo.
9. **Cargo.** Timber crates land on the dock and the crane lifts each onto the forge: 8 of them put its **roof** on, the poles come down, and it pours rails twice as fast (hands started it, trains finish it). After that timber goes to the village's heap and the town answers at 6 and 16 crates, buildings rising on scaffolding. Stone from the quarry builds the stone street the same way. A crate sails to the first plot of each step-up.
10. **The pier.** The first train out of the village carries the whole kit, 8 crates, to the rack at Far Head: 32 rails and 32 logs, a short carry to the last frame. The machine lays the pier north over the sea towards the shard. Rockets, and a pull-out down the buoys to the island, with "Thanks for playing!". The pier and buoys point toward the shard and nothing stops: the trains keep running.

Train cargo survives saves and corrective co-op snapshots, including boarding and unloading: a crate stays reserved until its destination receives it. Restoring settles outstanding cargo back onto its train, then the ordinary stop delivers it once. This includes timber on the sleeping train, stone, and the dock crane's reserved timber (returned to the dock when its flight is cancelled). `trainCargoV1` and `craneCargoV1` are additive shared save slices inside the existing prototype authority/localStorage model; animation remains Local. Inventory corrections restore cargo, train motion and destination stock together. Old saves without cargo records recover only the missing pier-kit logs and rails, subtracting surviving rack stock, Q6 stock and this save's personal bag; a completed pier is never refilled. Old lost timber/stone cannot be reconstructed from their unrecorded loads, but future shipments persist. No bill, timing or copy changes (DESIGN.md 8, Designed for drop-in, drop-out; 9, Leave something for the next visitor).

Along the way, seven **crystals** are tucked at spots worth stopping at, the same blue as the far island's shard: a lookout, an arch, a river bank, the top of the ridge, behind the old kiln, by the old cart, the far table. Walk near one and it comes to you, slowly then all at once, with a chime, and a stub on the shelf's bottom row lights up. They do nothing yet.

**Boxes** (DESIGN.md 11's world, not a menu; numbers from [cosmetic rarity](../research/cosmetic-rarity.md), hypotheses): cosmetic only, seven in the run, handed down by the machine: Common, Common, Rare, Common, Rare, Common, Wonder. You can tell a box before you open it: one, two or three marks on its face, the seal's shape (round, diamond, spike) and its colour. Odds across Common, Rare and Wonder items: Common box 60/30/10, Rare 0/70/30, Wonder 0/0/100. The first is the conductor's hat and the second the scarf; a Wonder by the third; an outfit by the fourth if you've none; never more than five in a row without a Wonder, counted in the save, which is written before the show. No repeats. The lid rattles for 0.12, 0.18 or 0.3 s by tier, then the reward starts with a **0.45 s anticipation beat**: a gathering glow while the camera approaches to frame you and the item. The item rises for **0.45 s**, then its existing **"You got \___"** name, line and fanfare arrive. You face the camera and hold it up with both hands, turning and glowing in a fan of light. You stand still until you put it away (E, Enter, pad X, a click or a tap outside touch controls, after the reveal has been readable for 0.6 s, 1.5 s total; an already-held press, movement, jump mashing and looking do not dismiss it; Escape opens the menu over it instead, and the card is still there when the menu closes); then it goes on the shelf, and on you if its slot's empty. The camera eases back when dismissed. Reduced motion preserves anticipation and deliberate dismissal but disables camera travel, item spin/bob/scale travel, decorative reward particles and card/hint animations. The same show comes for every new thing that isn't a counted find: chests (the proper axe, the pack frame), the multi-axe, the three devices (their demo plays after you put it away), secrets and shop items. Logs, stone, rails, money, crystals and gold finds don't get one. **Slots:** hat (conductor's hat, beanie, teacup), accessory (scarf, round glasses, headphones), outfit (work overalls, raincoat, festival overalls), and the stowaway has its own. An empty slot puts the new thing on; a slot with something in it keeps it. **The curio shelf is your wardrobe:** what you've got stands on it, what you haven't is under dust sheets (two shapes never come out this run), and Pause's You page, not the shelf, changes what you wear (10 November). Train ornaments wait for the roundhouse. In co-op your partner sees your equipped hat, accessory and outfit; gifts remain personal (DESIGN.md 6).

**Shared unlock arrival** (the Place prototype; the production railway follows "Shared abilities" above) (DESIGN.md 4 and 11): when a partner earns the multi-axe, proper axe, pack or movement device, your own copy appears above you through the same reward queue, with its existing name and model. Partner devices do not replay the local tutorial. A newly accepted snapshot transition also presents it, so a snapshot arriving before the event cannot make it silent. Local presentation keys prevent duplicate shows within the run, including a regressed snapshot followed by recovery; reset clears those keys. Initial join/reload snapshots silently remember existing unlocks. No new prose, messages or saved fields; earning remains shared state and the show is Local.

**Shared abilities on the production railway** (co-op abilities, option E, [brief](../brainstorms/coop-abilities.md); DESIGN.md 6, 7 and 9): the second jump and the hook are one shared railway fact each, so whoever finds one gives it to everyone in the world at once. Only the finder gets the "You got" card. Everyone else gets a flourish where they stand that never holds input or stops them in the air: a teal puff at the ankles, the pickup's two notes and the charge mark lit. The charge mark is a small filled teal ring under Buddy's feet, shown only briefly after a flourish and in the one-time first-jump teach; nothing is drawn under you on an ordinary jump, first or second, and the second jump's under-foot glints are its only effect (owner, 9 November). An unlock that arrives mid-flight never adds a jump to that flight: the mark stays hollow and fills on landing. The jump device keeps its faint locator only while unclaimed; taking it removes the shaft without the former three-second beam flare. The finder's common reward reveal (also shared with Place) gathers 32 glints towards Buddy, bursts a 40-glint ring as the card appears at 0.9 s, and settles a short trail onto the prize. Hook glints are blue, second-jump glints violet, the pack coral and both axes gold, with ivory accents. Emission ends by 1.1 s and all glints expire before the existing 1.5 s dismissal threshold; waiting on or dismissing the card adds no particles. Reduced motion suppresses the sequence. The anticipation, rise, card, fanfare and dismissal timing stay unchanged. These are Local births in the shared particle pool, as are the production second jump's existing under-foot glints. A friend who was away (offline, or joining later) gets the same flourish once on their first landing, one per ability gained meanwhile; a reload doesn't repeat it. The first jump after a friend's find pulses the mark at its top with the Jump glyph, once per player. Home keeps a trophy: a greybox stone plinth at the village's finders' bay holds the jump prize once the room has it. The first time each player passes within a few metres, it plays for them: the prize spins up and sparkles and folk nearby hop; with a friend beside them it is bigger, with the village bell and confetti. The finder gets the crowd there, never a second card. What each player has been shown is Local (a list per railway room in the browser's storage); the plinth is never required. The multi-axe and the proper axe follow the same rule (no new plinth): whoever pressed wake, or opened the forge's chest, gets the card; the multi-axe's card waits for the server to accept the wake (the machine's wake animation still plays at once from the prediction, and a refused wake settles it back asleep with no card). Everyone else gets the flourish with the pickup's metal strike, and a small model of the axe pops up over their head and settles away in about a second and a half (no charge ring), for the multi-axe as the wake ends, for the proper axe when it is taken. A friend who was away gets one flourish per axe on their first landing; a reload doesn't repeat it. The boiler is the same (boiler-first-choice plan, step 9): whoever fits it on the old train has the wake and the trains, everyone else gets the flourish with a small boiler over their head when the fit is accepted, a friend who was away gets it once on their first landing, and a world whose trains already ran before this shipped gives each player one late one.

Waiting crates and tool chests have a soft 1.8 m glimmer just above the lid, replacing the 34 m columns. Their physical seals, bob, sparkles and landing flare remain; the brief opening burst is unchanged. Secret crates still have no glimmer. The tool chest's rounded lid overhangs the body ends by 2 cm, keeping their faces out of the same plane. This is Local presentation only.

Shop clothes use the same remote validation as box gifts, so a partner also sees the paper hat and other shop stock.

**Money** is a comic score: $15 a log, $25 a stone, $40 a rail, $1,500 for the beam, $500 a stretch. It buys nothing: the shop's tags chase it (below). `earn`, `spend`, `money` and `onMoney` are in `score.ts`, for The Boogler's prices.

**Trail finds** (5 November owner choice, [solo design pass topic 1](../research/solo-design-pass.md)): yellow finds are flat stamped brass trinkets with a short metallic clank. Their existing personal IDs fill a small board beside the crystal row, including after reload. Blue crystals retain their specimen silhouette, magnet and chime. Neither collection awards currency, is spent, or gates progress. Presentation is Local; save ownership is unchanged.

**The little guys** are mostly life, not labour; the depot's two are the one exception, a real but small job (the owner's "hungry" ladder). Round and stubby, in six colours, carrying logs, hammering at scaffolds, riding the machine and the trains' cab roofs, strolling, waving and following you for a few seconds (at most two at a time), and hopping at milestones. They stand on the ground at the frames. The village's number is how many you can see, up to 28, with someone new coming out of a cottage door each time it rises; three more at each camp, two helpers, four riders, five walking the first path, two at the cart. They walk round buildings and plots not yet built, by the nearer corner, give up on a goal that takes far too long, and have no colliders. Their walk is a waddle driven by how fast they really go: a rock from foot to foot, a bob over each step, feet that lift, hands swinging against them.

Their boots stay planted during each stance while the other foot returns, separately from the torso's smaller rock and bob; soles follow the ground or their existing deck. Idle weight shifts and bounded glances at a nearby player are Local poses. A wave raises its hand first; milestone cheers stagger a crouch, a small hop and a soft landing with a grounded pause between hops. Workers give one brief cheer when their building finishes. These poses follow existing routes and construction facts; they change no deliveries, costs or round timing (DESIGN.md 11, Show, don't tell; little-guys research recommendations 3 and 7).

Machine helpers sit on the clear cab roof during waking and travel, outside the flatbed's cutter guard. Both machine and train riders follow the rendered roof's full transform, including wake shudder and track pitch. Other little guys are kept outside visible car envelopes when their heights overlap; someone below an elevated train is left alone. This is Local visual clearance, preserving routes, train physics and shared state.

The track layer's firebox has a dark iron frame and grate over amber embers. Once awake, its glow varies slowly by at most eight percent instead of flashing by fifty percent. Wake timing, smoke and the surrounding lighting are unchanged. The crawler art pass retains those hooks and body shudder, but its rollers are static: the old locomotive's spinning wheels and drive rods are no longer drawn during the wake.

Their hammering is a small tap, heard only within 16 m and at most five a second, so distant work stays quiet.

Now and then two of them near you stop and **chatter**: two to four short lines of babble, turn about, facing each other, with whoever's speaking bobbing and talking with a hand. It's the same babble as The Boogler's (`src/render/npc-voice.ts`), small and high, about 15 dB under him and with a pitch of its own for each, and it ducks nothing. One exchange at a time, none in the first 10 s, 20-38 s of quiet after each, only struck up within 11 m of you, silent past 13 m and hushed while a crate opens or a cheer goes up. Numbers: `CHATTER` (`chatter.ts`), `TALK` and `WALK` (`folk.ts`).

**The town and camps are solid**: every building has a collider, its walls from when its frame is up. Standing in a plot when they go up moves you to the nearest edge.

**Everything that looks solid is solid** (round 4 audit): trees and stumps, a felled tree's bare trunk (its crown bursts into leaves as it lands, so a cut grove shows what you've done), crate stacks as far as they're stacked, frames, feeders, rail bearers, survey stakes, bridge rails, and scaffold poles and walkways while they stand. An empty material frame has a low 0.56 m base and four 1.52 m posts; its log collider rises with the visible rows and goes away when empty. There is no head-high invisible block across the empty frame at the first path's opening. Little guys and pickups aren't solid; gift crates open when you walk into them.

**The day moves.** One day is 28 minutes of play (`DAY`, `look.ts`): mostly the accepted look's daylight with the sun swinging across, then a short golden hour, a brief moonlit night and a dawn. `&day=off` holds the morning.

**The stowaway rides.** It stays small, and on a moving deck it hops up onto your shoulder, rather than chasing the train along the ground. Partners see the same follower and shoulder pose through Owner cosmetic presence `placePet`; its animation follows their interpolated avatar.

**You can sit.** Each train's middle, non-freight car has two visible side-facing chairs. With nothing nearer to press for, Interact reads **Sit** and requests the nearest available chair. The room lead assigns each chair to one request before the Owner-driven avatar snaps into its platform-local position/facing; simultaneous requests for the same chair can take the other free chair. Request tickets prevent a cancelled request accepting an old grant. Claims are transient, released on standing, departure or disconnect, and never saved. The existing Buddy Driving_Loop supplies bent knees and resting hands; the chair supports the torso. Steering stops while seated, the camera stays free, and Interact (**Stand up**) or Jump exits into that chair's adjacent aisle position. The same seat registration supports the forge's stationary chair.

The machine's 2.2 by 3.2 m flatbed retains its forward cradle. The 5 November branch-only art pass replaces the rear cutter housing with two chairs using the existing seat claims and Buddy pose. Following the owner's same-day follow-up, both face forward toward the gantry and new rails. The chairs rotate around their unchanged hip anchors (X ±0.55/Z -0.9): their mesh centres move back 0.5 m to Z -1.15 so the seated knees clear the cradle wall. Each still exits onto its own side of the broad rear step at Z -1.85; there is no central walking aisle. Collision, stand points, step and two-second ease-out are unchanged by owner constraint: these chairs are visual sitting targets, with nonblocking backs. Their granted local and remote avatars draw at the interpolated seat anchor: without a seat collider, the seated capsule is above standing support and ordinary world-presence interpolation trails the moving deck. This cosmetic opt-in leaves bodies, seat/exit poses and native train chairs unchanged. No new presence fields or saves; older-build leads cannot assign these new seat IDs. Station benches remain with the parallel `solo-clips-looks` work.

**The finished forge is a workshop.** Once its eighth freight crate finishes building the roof, the sealed construction collider gives way to hollow walls, with one 2.8 m doorway left of the furnace output. Two shallow steps reach the existing foundation floor. A guarded furnace faces the visitor and a chair faces the outside rail rack. Entry has no new payment. The roof and camera-side upper walls cut away locally using the town room reveal timing and camera collision group, with a shadow-only shell; physics walls remain. The original mouth/output opening, rail flight, external pickup, production intervals, rack capacity and freight route are unchanged. Construction completion still comes from the existing shared forge slice, and furnishings/occlusion are Local.

**The decks hold you.** Stop at the edge of a train's or the machine's deck and you're eased a few centimetres back inside, so standing never takes you off, moving or not. Push the stick off the side or jump and you leave as ever; there are no railings.

Settled train crates use the same idle edge hold on their own top footprint. A standing rider at a crate's edge is eased inward before the sphere-shaped player can slide off its rounded contact, even while still inside the wider flatbed. Walking and jumping still release that hold. This remains Owner player physics derived from the existing cargo, with no new presence, save or train-speed state. [Standing co-op verification](../plans/coop-route-verification.md) records the reproduced loss and the distinction between uncommanded knock-offs and missed jump landings.

When a halt appears, anyone intersecting its new foundation, ramps, bench or posts is moved onto its clear middle lane, at the same place along the platform. Each player's tab checks their own body, including when a partner unlocks trains or a snapshot restores a halt. Players already clear of the new solids stay put.

Benches face arriving trains from the platform's outer edge. Each shelter sits 4.8 m along from the middle rear ramp, keeping the entrance and track-side aisle clear. The bench and posts' colliders follow the visible pieces.

The track layer's flatbed is standable. Following the owner's 5 November choice (solo design pass topic 5), each laying departure eases out to its existing speed over two seconds. The pale rear boarding step is 2.8 m wide by 0.6 m deep, with its kinematic collider top exactly level with the visible deck. The machine snapshot carries bounded departure elapsed time. The branch-only art pass gives it a chunky power pack on two steel rail bogies, an open orange gantry and cream magazine using existing material presets, authored in `assets/src/track-layer.py` and assembled in `machine-model.ts`. Its power-unit top still covers the existing 1.75 m stand surface. Cargo anchors, capacity, fork motion, smoke/lamp/fire hooks, collision and departure code are retained; no steam locomotive shell or drive rods remain on the machine. Trains retain their own appearance. Boarding without sprinting still needs a person's playtest; not tested on a device.

The shared rail builders keep an explicit continuous mode for the classic railway's counted-supply slice. That mode retains its original track geometry, falling pieces, collider thresholds, 2.4 m machine setback, twelve-rail rack and owned view lifecycle. Place alone selects the panel machine, hoist and deck seats; this integration changes no slice-2 shared or saved state.

The owner's bounded previz follow-up clarifies orange/cream/teal/dark-steel blocks using existing presets, adds one-segment 15 mm bevels to big forms, and fits two cream grab rails beside the existing rear step, four dark stripes on its rear vertical lip and an 8-degree exhaust-cap tilt. Small repeated parts retain 8 mm bevels. Grab rails stay within the step's 2.8 m width, with a 2.51 m clear middle and both existing exits inside it. Step and chair shells now use the built asset's material batches, preserving their dimensions and transforms: chairs retain the body frame without deck pitch or shudder; the step retains the deck frame. The previz's front step, larger rollers and Buddy workwear are not adopted. No lighting, post-processing, effects or gameplay changes accompany this treatment.

The owner’s rail-running revision replaces the crawler with eight separately pivoted, flanged steel wheels: two simple two-axle bogies beneath the power pack and deck, centered on the existing 1 m track gauge. The gantry reaches over unlaid ground without front wheels. Each body’s signed actual travel distance drives its wheels at a 0.13 m tread radius; a stopped body stops its wheels, and explicit placement snaps reset only the travel sample.

The coordinator's 5 November panel decision changes committed track itself: the head moves continuously, while renderer and colliders advance together only when a complete panel lands. Each accepted panel consumes one magazine unit, with an exact station closure. L1's 12 panels use 3/3/6 per station, nominal 14.333333 m (2.866667 s at cruise), with shorter closures; L2 uses each stretch's existing rail-stock count. The trolley, three-stage hoist and two jaws carry the upcoming rail/sleeper compound, release at that boundary with clunk/dust, and return empty. The original sleeper fork remains. To keep the bogies on committed rails, the body is 16.733333 m behind the head; local collision shapes, seats, exits and step stay unchanged, but its station-relative position and L1 decrement timing change. An additive shared/saved `trackPanelsV1` cursor and full-precision motion slice plus authority commit message preserve restore/late-join frontiers; the stable `placeCoop` tag names participating peers without a build fence. This shared-state change requires the coordinator's independent review. Validation is pending; not tested on a device.

Seat arbitration, registrations, boarding and rear-step exits retain their current behavior. The former frozen-v07 rejection and `mixedSeats` fixture were removed under the 5 November current-build-only call; no old seat lead is supported. The ordinary two-rider fixture remains.

The track-layer chairs use a 6 cm slab on four narrow legs, open underneath and at the front for Buddy's seated legs.
The slab is 0.44 m wide to clear the hanging hands and 0.46 m deep, centred 0.13 m behind the rider anchor;
its front edge is 0.10 m ahead of that anchor. The 8 cm square legs sit at X ±0.15 m and Z −0.26/+0.02 m relative to it.
The backrests are removed entirely, leaving plain stools (owner playtest, 8 November). Seat tops remain 0.32 m above the deck. Buddy's capsule anchor remains at seat top
plus 0.63 m, X ±0.55 m and Z −1.15 m; the station hands retain their seat-height offset. This is Local mesh geometry.
The shared workshop seat builder also has no back. Each production train has one passenger car and one cargo car
behind it (owner, 10 November: "if there's cargo then it shouldnt have seats I think"). The cargo car, the one whose
deck takes the crates, has no stools and never offers Sit, loaded or empty. It carries dark stakes up both long sides
with low boards between them (`cargoFittings`, src/render/wagon-look.ts; cosmetic, no solid, outside the crate slots),
so the two read apart at a glance. The crates it carries are solid (owner, 10 November: "the cargo should have
colliders so we dont clip through it"): each settled crate is a box on the car's own kinematic body, so it rides with
the platform, blocks a player walking into it on the deck and carries one standing on top
(src/entities/railway/train-load.ts, `solidTrainLoad`). A crate in flight never collides. When a crate lands under a
standing rider they are lifted onto its top, and when one leaves from under them they are lowered to what is beneath,
both by the height change only, never by a launch. The stakes and boards stay without a collider: the car's deck edge
is where the old rides already end, and a 0.2 m board would only catch feet. A train therefore seats four. The passenger car is a knifeboard (owner's pick pending between candidates Four and Six
in the [previz](../plans/passenger-car-previz.md); Four is built as the default): one back-to-back bench down the middle of
the deck, two seats a side, riders facing out over the halt decks, at Z -0.85 and 0.45 m either side. The seat keeps the
low stool's numbers (seat top 0.32 m over the deck, rider anchor `lowStoolAnchor`, 0.45 m from the middle, hips on the seat,
feet on the deck), so Buddy sits as at the track layer. The car is still the flatbed's 3.2 m by 2.2 m: the first car is
natural wood and dark iron with boarded end panels, rails at hand height and a board under each side of the deck (the
`passenger-car` kit asset, `car_fit`, src/entities/railway/car-kit.ts). The upgrade (red and brass, a canopy roof with a
cream fringe, two lamps: `car_upgrade`) is built and switched off, as no upgrade rule exists yet; `PASSENGER_CAR_UPGRADED`
in train-view.ts is its hook. Like the track layer's, the bench has no solid: walking and the bots' boarding pass through
it. Stand up puts you 0.4 m out in front of your seat, on the deck by its edge. A seated rider is drawn 0.16 m
further out than the seat (`BENCH.forward`, the seat's view-only `forward`; owner, 10 November: "slightly forward"), so
no part of Buddy reaches into the backrest or its cap rail; the seat, capsule and wire keep the anchor. A rider's
stowaway sits on the bench beside the seat, 0.62 m to their right (the seat's `perch`, a view-only height). The freight cart has no chair.

**The track layer's chairs work in the production railway (owner's 6 November order, item 4).** Aboard the machine with nothing nearer to press for, Interact reads **Sit**; seated, it reads only **Stand up** (Jump also stands). The press sits you at once with a soft pop, in a live room too: the lead's existing `placeSeatGrants` then confirm the chair, slide the loser of a race for one chair into the free neighbour, or step them off onto their rear-step exit when both are taken or the lead says nothing for 2 s. A confirmed sitter whose chair the lead gives to someone else also steps off. The sitter rides the deck through the whole laying, and a deck that snaps to its accepted place (a restore or catch-up) carries them along instead of dropping them where the chair was. Network loss, a lead change and standing all release onto the exit, as before. Friends see you seated through the existing presence pose. The two station hands who ride the chairs while it lays give a chair up to a player: that hand waits at the station frame (or beside the deck, with no frame) instead. No new presence key, message, saved or simulated state; claims stay Host kind. Not tested on a device.

**Piece-by-piece laying off a small rail stack (owner playtest, 6 November).** The two 14 m side magazines and their saddles are gone; the header narrows to the deck. A small stack of rails sits on two shelf bars over the gantry's side beams (six columns by up to six layers each side, left rails left and right rails right), one pair per held stock unit, so Line 1 starts with two short columns a side that empty as the line is laid. Each panel cycle the gantry returns, reaches down, grips the top pair, lifts it to gauge, runs out to the start of the pending panel and sweeps along it: every sleeper, plank, rail and trestle piece of that panel falls into place as the trolley passes, in the original laying order and with the original fall heights, thumps, clanks, dust and deck bump. The hoist then seats the pair it carried exactly where its committed rails go, and the accepted contact hands over to the committed pair. The beam is 17.5 m because the deck still runs 16.7 m behind the laying head. Commit timing, colliders, stock, setback and saves are unchanged; both railway views share `Machine.layPanel`. Known limits: one stack pair stands for one stock unit (as the original rack did), so more pieces fall than leave the stack; pieces show up to about 1.1 s before their panel's colliders commit; trolley speeds are set by the panel cadence. Laying every rail off a small stack at the original pace needs a one-pair commit unit and the original 2.4 m setback, which is a rule change for the coordinator.

**One rail pair per commit (owner, 6 November: "drop smaller chunks of rail so it doesn't have to extend so far").** Each stock unit now commits and lays as its rail pairs: round(length / 3 m) equal pairs, so line one's twelve units are 56 pairs (14, 12 and 30 per stop; 2.67-3.08 m each) and line two's Q1-Q3 rails are 12, 24 and 24 pairs (2.92, 3.33 and 2.33 m). Each pair is one rail a side with its sleepers or deck, and every rail comes off the stack: the stack holds one pair per pair still to lay, drawing up to 36 (line one's stays full until 36 remain, during T2). The gantry's beats are unchanged in order (return, lower, grip, lift to gauge, run out, sweep, seat, contact) with more of each cycle given to the pick and seat; a cycle lasts about half a second (0.39-0.62 s at cruise, against 0.8-2.9 s for the old panels). The deck rides the longest pair plus 2.4 m (5.78 m) behind the head instead of 16.73 m, so the beam is 5.8 m instead of 17.5 m; the trolley runs at most 4.9 m out. Unchanged: rails per metre and stock per stretch, stock-unit boundaries, the head's two-second departure and cruise, total laying time per stretch, wire and save shapes (the committed count is still derived from accepted ticks). Contact dust stays once per stock unit; the clank plays per pair. The jump-pillar lip still waits for ten stock units. Not tested on a device.

After a closure, the cars roll forward on committed track to the former 2.4 m station setback, clearing the reward approach. The following departure holds the bodies there while the continuously advancing head builds the full panel setback; the head's original two-second integral stays. The additive motion snapshot saves setback and parking state. Feed arrival callbacks are scoped to their feed epoch, so a delayed follower cannot restore already-spent stock. An accepted frontier survives restore even when presentation head lagged behind it. These changes affect physical machine motion and still need the coordinator's independent review and a device playtest.

The wheel-readability follow-up adds pale hubs/spokes within each existing wheel mesh and two cream coupling rods on the power bogie. Each rod follows the two axle crank pins as one rigid piece; a chamfered lower power-pack skirt exposes the running gear while retaining its broad standing top. Radius, gauge, collision, seats and exits are unchanged. The rods share the actual-distance wheel angle, so they stop with the wheels.

First-use carry meshes and the glider's cloth and shadow pipelines warm behind loading; temporary canopy samples are removed before play. The 16-second escape deadline is unchanged. See [first-use measurements](../research/round4-first-use.md) for warm-cache counts and device limits.

**The way back.** The first bridge has its reveal, edge lamps and commuters. Far Head has rockets at both ends and lamps sequencing along the trestle toward home. With the rockets, every player's camera pulls out for 6 s (9 November, the owner saw no show): from 24 m above the trestle 64 m back from its end and 22 m to the side, drifting out, looking 32 m over Far Head, where the ten rockets burst; it plays to the end like every pull-out, with the one highlighted Interact skip. The rockets, the fanfare and the shot wait behind a reward card on that player's screen; the lamps and whistle don't. A seated player or reduced motion gets the rockets without the camera; the village's five are not in the shot. The continuous track is the lasting route home. Rails remain visible at the forge rack and its nearby Interact prompt remains **Take rails**. No replacement arrow, new instruction or marker was added. The Boogler's copy, gift lines, other prompts and banners are unchanged.

Station stone bills form a low pile: six stones rest at their own terrain heights and support the two above. Deposit flights and the settled stock use the same positions.

### Guidance after removing the objective

**Boiler repair (5 November, solo design pass topic 2).** The old train exposes empty brass saddles matching the carried boiler's two bands. The boiler waits on a low pedestal at the forge apron; fitting seats the same part before the existing wake. This supersedes the earlier relationship weakness recorded below. Local presentation follows existing boiler/trains state; carrying, drop ownership and delivery stay with the cargo work.

The 5 November prop art pass gives that shared boiler broad end bevels, two matching golden bands and sparse shining motes while waiting on its pedestal. While it waits, the forge's call (a tall pale steam plume and a whistle when it's cast, `forge-call.ts`; [home-flow](../reviews/home-flow.md) finding 2) rises from the forge's chimney, not the boiler: the owner found a steaming boiler that can't yet be taken read as an engine already running (9 November). The boiler first steams as the old train's chimney once fitted. Within 3.6 m the boiler always shows **Pick up** (the great beam's prompt; it was "Shoulder the boiler" until it moved onto the rope); with anything on your back or in your hand it is greyed with "Empty your back first", as for the great beam and footings. The train has solid saddle feet and posts supporting its existing roof. The low cart's grip now connects to its sidewalls, with shallow bearers under the existing four-log rows; every counted log still uses its original cargo transform. The Blender-authored rigid shells keep all existing world positions, collision, capacity, timing and train wheel/rod motion. [Art measurements and evidence](../research/boiler-cart-art.md).

**Walking-in composition, 4 November:** Station 3's existing bill sits on the source side of its pile so
the unchanged `great beam 0/1` row stays visible. The 53 m uphill great-tree source, receiver, feeder,
machine and crossing fit are retained; seeing the source still requires turning uphill. The proper-axe
chest sits on the forge side of the oak, and the pack sits beside the receiver's feeder, so their pickup
approaches face the next work. The forge's existing bill sits on the frontage above the work. Its output
rack and mouth retain their original positions: moving the rack changed cart-cycle pacing in the full
comparison, so the rail-pickup sightline remains unresolved. The hook pedestal sits toward the first floating
slab, keeping its ring and onward railway in the approach view. The camp's large shed moves south of the
boarding approach, exposing the locomotive and platform. These are Local placement changes using the
existing objects, materials and colliders, with no new copy, markers, rules, bills, unlocks or timing.
The depot rack sits 3.4 m behind its frame along the approach tangent, with its log ends facing the path.
This keeps its entire pickup zone inside the existing server reach. A small log glyph and stock count distinguish
the source from the frame's own bill; the rails shelf has the matching steel badge. Both are boards on posts, as is
the bill (Signs at the stations and racks, below).
The cart retains each waiting
piece until its unload flight launches, and the receiving stock appears as those flights land. Taking flies logs
from the pile to the carrier. Cart stops, route, pushers and arrival sounds stay unchanged; a restored still
cannot show the fresh arrival or explain the wait by itself. [Walking evidence and remaining limits](../plans/world-cues.md).

Stage-by-stage audit of what the objective text or marker used to explain. These are physical cues already in the round unless a change is stated. A cue's existence does not establish that a blind player understands it.

| Stage / former direction                         | What in the world points there now                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening: follow the path to the sleeping machine | Wide path, existing Timber Camp sign, footbridge, camp smoke and rusty machine at the path's end.                                                                                                                                                                                                                                                                           |
| Wake the machine; start chopping                 | Machine and its nearby interaction, physical multi-axe reward, consistently choppable ordinary conifers. Tree bands are removed; rock bands remain.                                                                                                                                                                                                                         |
| Station 1: carry logs to the receiver            | Nearby grove, visible back load, frame's material board and feeder leading into the machine.                                                                                                                                                                                                                                                                                |
| Station 2: find logs and stone                   | Next receiver, material board, banded rocks and pieces breaking off under the multi-axe.                                                                                                                                                                                                                                                                                    |
| Station 3: fell and shoulder the great beam      | Oversized tree standing apart, receiver's existing great-beam bill, then the fallen trunk and shoulder interaction. Recognition without the former sentence needs playtesting.                                                                                                                                                                                              |
| Feeding, laying and moving                       | Logs roll through the feeder; machine moves and builds track. No extra cue.                                                                                                                                                                                                                                                                                                 |
| First path: walk home                            | Reveal toward the village, rockets, continuous bridge, edge lamps and commuters.                                                                                                                                                                                                                                                                                            |
| Proper axe and pack frame                        | Physical reward chests with low blue glimmers over their lids.                                                                                                                                                                                                                                                                                                              |
| Double-jump device                               | Pillar beside the new path, device and its existing demonstration.                                                                                                                                                                                                                                                                                                          |
| Forge frame and chimney                          | Scaffolding, receiver/feeder and pieces assembling as the player supplies logs.                                                                                                                                                                                                                                                                                             |
| Turn onto line 2; get rails                      | Turning machine and forge pouring rails onto the familiar rack.                                                                                                                                                                                                                                                                                                             |
| Line 2 station 1                                 | Receiver and material board, rail stub and survey stakes.                                                                                                                                                                                                                                                                                                                   |
| Line 2 stations 2–3                              | Log cart travels to the frontier rack; next receiver and laid track show the destination. Players still fetch rails from the forge unless a partner loads the cart.                                                                                                                                                                                                         |
| Hook and quarry gate                             | Device by the route, rings, slab and lever mechanism.                                                                                                                                                                                                                                                                                                                       |
| Line 2 stations 4–5; glider and sea gate         | From station 4, the little guys' cart brings forge rails with its logs and visibly unloads them onto the separate rail shelf beside the frame. The player does the final carry; the cart waits when forge stock runs dry. Next receivers, tower's rings and summit device, sea gate and visible Far Head remain the route cues.                                             |
| Far Head: head home                              | Rockets at the home end, continuous laid trestle and lamps running homeward. The route persists after the celebration; the reason to return remains a question. The optional Happy Clam sea-stack detour now has a visible return hook beside the trestle, within hook range and at rail height; it solves leaving the stack without a swim, not the reason to travel home. |
| Find and shoulder the boiler                     | **Changed:** the actual boiler and pickup move from behind the forge to the open apron beside the rail rack and return track. No new text or symbol.                                                                                                                                                                                                                        |
| Carry boiler to the old camp train               | Existing rusty locomotive and nearby Fit the boiler interaction. The distant relationship between pickup and receiver is still weak; placement alone does not explain the repair.                                                                                                                                                                                           |
| Trains unlock; stand on a platform               | Wake/reveal, platforms appearing, signals and arriving trains.                                                                                                                                                                                                                                                                                                              |
| Use the second train to Far Head                 | The pier kit physically loads at the village and unloads into the Far Head rack. That shows its cargo payoff once witnessed; its value before boarding remains unresolved.                                                                                                                                                                                                  |
| Supply and build the pier                        | Delivered logs and rails beside the last receiver, followed by the familiar construction sequence.                                                                                                                                                                                                                                                                          |
| End: look toward the shard                       | Pier, buoys, distant shard and existing ending pull-out.                                                                                                                                                                                                                                                                                                                    |

**Owner questions:** round 4's “that's my objective” was carrying the late stretch. Boiler discovery is easier to inspect after relocation, but recognizing the old locomotive as its destination, wanting the second train before seeing its delivery, and wanting to return from Far Head still need a human playtest. A full bot run follows known destinations and cannot verify a blind first-time run. These gaps have not been filled with new helper text. That earlier guidance pass left bands and tree rules unchanged; the approved tree comparison above supersedes those two details. Cart/train naming remains unchanged; crate glows are described above.

**Pre-rebase verification (3 November; historical):** `npm run check` passed (292 tests). The full solo place bot finished all expected beats, saved 77 checkpoints and reported no graphics or page errors. Its on-screen text log contained no objective elements while its internal objective timeline retained nonempty labels and empty transitions. Inspected stills covered the opening after 18 seconds idle, receivers/great tree, first bridge, forge, hook platform/tower, Far Head return, relocated boiler, platforms/train and finished pier. They showed no objective box, orange objective beam or edge arrow; other HUD and world copy stayed visible. The boiler was visibly clear of the rail, rack and crane. The restored train checkpoint showed an empty deck: train cargo is not restored with its saved pose, so these stills do not verify the moving cargo payoff. The full live bot did finish the pier. These results predate the rebase onto `0e4376b1`; use the follow-up job's new manifests for the combined build. Blind discovery, real-time feel, co-op and device play remain unverified.

Falling is harmless: in the water, or down on a shore or a river bank more than 20 m from any path or laid track, Interact reads **Back up the path**. The default shore walk counts along its sampled length: recovery returns to the nearest shore-path point when it is closer than the village paths or laid track. The village comparison keeps the previous recovery paths. **Get unstuck** on the pause view's More page searches nearby dry, level ground using the same safety validator as rejoining, with a clear landing checked against solid scenery. It falls back to the nearest path or laid track if no safe ground is found within 40 m. Classic mode keeps its spawn reset. **More** also holds Start fresh and the volume slider. On non-fresh Place links it opens **Debug**, which has Start over, Skip the walk, Skip chop and carry (fills the current frame), and Skip to the first path, to line 2, to the tower, to Far Head and to trains. The main pause view has mute and fullscreen icons, money and any current carry, Resume, Controls, Graphics, Room, More and Leave.

**The tester's link** adds `&fresh=1`: no tester controls and no Honk touch button. The prototype bar is removed from all pages. Ping has its own touch button beside Drop. Money continues to run and appears in the pause view. On touch, the main button dims while nothing's in reach. On every `?proto=place` page the pause view's controls (every tab, and the drawn pad) list only what this place uses, without the ball, Use, Toss or the guest's Crouch and Punch, and with a Chop row for E/left click, X/RT and touch. The numbers wait until you're in. Objective presentation is absent on both the default URL and explicit place links.

**Two players, one railway** (default entry in `boogle`; explicit `?proto=place&coop=1` remains in `proto-place-coop`): waking the machine, trees and rocks felled, every deposit, the machine's run, laid track, the bills, the rungs (one chest, for you both; a newcomer inherits them), the money, the cart and rack, the forge, the boiler, trains and the town are shared, and the costs stay the same. Your back, chopping response, crates and gifts (each of you gets your own crate), crystals and gold finds are yours; you see your partner's logs on their back and them on your copy of a moving deck. Calling a train calls it for you both. The oldest visible tab decides what a deposit gets and when a run starts, so the last log can't start two, and what doesn't fit stays on your back; if it leaves, the next tab takes over. How: `src/proto/place/coop.ts`, reliable room messages and a whole-state message once a second, built from the slices in `job.ts`. Serves DESIGN.md 4 (Cooperation is automatic).

Completing the forge's first bill places the waiting pack chest on both peers as the bill event arrives. Receiving that event after a snapshot or after the pack was opened does not create another chest.

The forge rack holds 24 rails, including reserved slots for rails still flying out of its mouth. When a co-op correction replaces the rack, older flights no longer add rails to the corrected stock. Its visible stack updates immediately, and production continues from the corrected count.

*`?proto=place` only: the live railway's handle is cut (owner, 9 November); this one goes when Place is retired.* After the depot opens and before trains, a chunky amber handle beside the turntable stop offers **Call cart to forge**, in solo and co-op. A loaded delivery finishes unloading before returning; the handle drops immediately and reads **Call sent** while awaiting the authority, then **After unloading / Then back to forge** when accepted. An empty cart returns directly. Its round trip can be ridden in either direction, loaded or empty. **Load the cart** sends up to 16 needed rails from the forge rack onto its logs; it leaves three seconds after loading (eight seconds if empty). Rails fly onto the frontier rack, and a partner can ride the cart. A cart loaded by hand runs at **13 m/s while ridden**, accelerating at the existing 3 m/s²; automatic loads and unridden carts keep **9 m/s**. Manual eligibility lasts only until unloading. Bills stay fixed.

The frontier rack's persistent status distinguishes **Loading**, **On the way**, **Unloading** and **Waiting for forge**, with **More coming** while service remains. **Delivered / Ready on the rack** appears only after cargo and unloading flights are empty and the rack covers the remaining automatically served bill. This Local view reads phase, cargo, pending unloads and rack stock beside the cart in `depot.ts`; zero `railsOwed()` alone never means delivery is done. At station 5 it stays active between the 16-rail and final shipments, including after the player takes the last rail. This is approved cart-whistle variant A: no frontier request or helper salute; capacity, bills and speed are unchanged.

The prototype authority accepts `cartRecall` requests and broadcasts `cartRecallAccepted`; simultaneous requests are idempotent. `depot.recallQueued` snapshot/save state carries the accepted call through correction and authority departure. All peers finish their own cargo flights before returning. Capability negotiation and the immediate `cartCall` fallback are removed. Presentation acknowledgement is Local; it never claims an unaccepted request completed. Device readability and whether the player trusts the next shipment remain owner playtest questions; not tested on a device.

Automatic rail loading at Q4/Q5 uses that same cargo and loading path in solo and co-op. The co-op authority alone transfers forge stock; existing reliable take/load events carry it to partners. An explicit whistle takes over automatic dispatch, preserving the manual split. All participating peers run automatic service; no capability presence gates it. Already loaded cargo finishes safely. This is prototype shared state and Local presentation, not lockstep. Snapshots include rails still unloading, invalidate stale landing callbacks and reconcile frontier rail counts as well as logs, so a correction cannot duplicate an in-flight shipment.

Ride corrections preserve the rider's place on the deck. A car pose change faster than 1.5 times its cruise speed
(13.5 m/s for an ordinary cart, 19.5 m/s during its ridden bonus, 30 m/s for trains) is a relocation, never a collision
velocity to inherit on leaving. Ordinary turns follow the new heading at at most 2 rad/s and ease into it, rather than snapping at a junction. The physical deck and its drawn pose turn together, so riders follow that same bounded turn. Explicit snapshot relocations still move the rider with the deck and clear correction velocity. The cart reconciles progress, leg, load and speed on every authority snapshot, so a
partner rides the cart everyone sees. Routine reconciliation adjusts motion, leaving delivery transitions to the existing
events and settled-inventory correction. Riders follow the cargo deck's height when it unloads. Snapshot cart speed and
train express status are current snapshot fields, with malformed values rejected or safely defaulted. Train corrections also retain velocity
and dwell, so a follower does not independently stop at an intermediate halt while the authority runs express.
The objective and automatic train call share one halt detector: entry keeps its existing bounds, while leaving requires
another 0.4 m of clearance. Moving along the detection edge does not repeatedly ring the bell; leaving and returning does.

Historical Q5 measurement (3 November, local two-tab broker, real inputs, fixed 24-log/24-rail bill): solo 162.40 s; two walkers 115.14 s; split 80.90 s. The mixed-cart remeasurement uses the same bill and starting positions: solo at the forge, both two-player modes one at each end, empty backs and frontier rack. The forge-side walker/solo player still takes available rails before leaving, then uses frontier supply. The porter loads 16, takes nine on their back as the forge replenishes, double-jumps aboard, rides, and jumps off before walking to the frame. No teleports after positioning. Authority times, at measured 1x, one successful trial per strategy:

| Q5 strategy | Historical before | Mixed cart |   Change |
| ----------- | ----------------: | ---------: | -------: |
| Solo        |          162.40 s |    73.78 s | -88.62 s |
| Two walkers |          115.14 s |    69.16 s | -45.98 s |
| Split       |           80.90 s |    75.80 s |  -5.10 s |

**That mixed-cart baseline lost the split advantage:** 6.64 s slower than walkers and 2.02 s slower than solo. The owner subsequently authorized a 12–13 m/s manually loaded, ridden-cart comparison. The implemented choice is **13 m/s**, the smaller tested speed that consistently beat walkers. Same real-input fixture, fixed 24/24 bill and starting positions, measured at 1x; authority times in seconds:

| Ridden bonus |  Solo |  Two walkers |        Split |
| ------------ | ----: | -----------: | -----------: |
| 12 m/s       | 73.75 |        68.40 | 68.94, 69.08 |
| 13 m/s       | 73.73 | 71.52, 69.02 | 67.02, 67.28 |

At 12, both splits lost to the fresh walkers. At 13, both won: even the slower split beat the fastest walker across all trials by 1.12 s, and the fastest walker at 13 by 1.74 s. The payoff is modest, not a large separation; walking varied by 3.12 s across trials. All split runs actually loaded by hand, carried nine extra rails, boarded and dismounted through real input, and recorded zero lost-contact samples on the trip. No bills, forge rates, capacity, copy or tree code changed. Full manifest IDs and limitations are in the [plan's follow-up](../plans/little-guys-rails.md#ridden-cart-follow-up-4-november).

The bonus is prototype Host-like shared state under the existing co-op authority, not lockstep. Owner presence `placeCartRide` is true while riding and absent otherwise; the existing authority freshness rules still determine active riders. Only the authority chooses and reliably broadcasts `cartRide`; followers accept it only from that authority. Additive validated `manual`/`boost` snapshot fields preserve eligibility and the decision, and existing speed/position reconciliation keeps the carts together. Missing or malformed rider flags mean off. There is no old-build speed fallback. The existing `moveCar`/`snapCar` and bounded junction turn remain unchanged; the correction threshold follows the current or just-prior cruise so ordinary boosted motion is not mistaken for a relocation.

Fresh before-build attempts are retained rather than substituted for the historical numbers: solo observed 160.86/162.46 s, but the manifests were invalidated by a plan-file write and then an external harness-checkout change respectively; walkers twice fell after an accidental cart ride, and split missed the forge stop. The new code fixes the forge-stop target under snapshot nudges. The existing split fixture now uses a real jump to dismount before asking its ground path planner to walk; its first after-run failed there. Successful after manifests: split `1793774770414-85885`, walkers `1793774914460-89372`, solo `1793775002116-91592`, under `.look/evidence/`. These fixture times are not whole-run estimates or human playtest timings.

Deposit replies are matched to their sender and request, even after the active frame or temporary authority changes. A stalled tab does not refund accepted goods: rejected pieces (including the great beam) return once, and unanswered requests return when their authority actually leaves. This prevents a five-second stall from leaving the same logs both on a back and in the frame.

**Putting big cargo down.** Right click, R3 or the existing touch **Drop** button puts the great beam or boiler on dry ground in front of its carrier. The button stays visible with big cargo. Either player reclaims it through the same **Shoulder the trunk/boiler** interaction. Dropping a helped beam releases the helper; whatever was left behind when shouldering remains unchanged. A footprint over water, outside the map, too steep, obstructed or separated from the carrier's ground height uses the existing return-to-pickup recovery instead. This conservatively includes roofs and bridges above terrain; the cargo never becomes a personal dropped pile.

Pickup and Drop are revision-checked requests to the existing co-op authority. Only an accepted pickup changes a back, so two contenders cannot both receive the cargo or lose their ordinary load. The additive saved/shared `bigCargoV1` slice records the holder and optional ground pose; `placeBig` remains Owner presentation. The stable `placeCoop` identity names participation. Every current save includes the accepted cargo ledger; revision-zero personal-shoulder adoption from old saves is removed. New cargo decisions wait while a connected peer is stale or hidden, so a temporary freshness election cannot grant a competing claim. Actual departure removes that gate.

If a partner leaves holding the great beam or the boiler, it returns to its original pickup spot so the remaining player can finish. Already delivered beams and fitted boilers stay consumed. Departure uses the accepted holder, rather than a late `placeBig` packet; dropped cargo stays where it was put. Snapshots propagate ground poses and returns and clear stale shoulders. Reconnecting tabs rejoin behind the surviving authority, including when the carrier used to be the authority. Orphaned saved holders recover after room initialization. A lone/transient reconnect retains its cargo when nobody reclaimed it; unanswered/accepted deposits still use their existing request settlement. Serves DESIGN.md 8 (Designed for drop-in, drop-out).

**Owner decision, 5 November (topics 8–9):** Station 3 still costs **40 logs and one beam**. Its great tree has broad buttress roots, pale ridged bark and a split crown. Every standing tree can be attempted: without the proper axe, or while Station 3 is inactive or no longer needs its beam, contact rebounds without shared work. Felling requires all three conditions; its effort stays twelve strokes. Shouldering still requires Station 3 active and needing the beam. Solo and the co-op authority apply the same harvest gate. Current accepted cargo can still be dropped to free the back; historical save recovery is no longer maintained. The axe stand is derived from Station 3's placement; no save or message fields were added. Serves DESIGN.md 7 (Telegraph everything), 8 (Designed for drop-in, drop-out) and 11 (Show, don't tell).

**Owner decision, 7 November (the great beam pass, [brief](../brainstorms/great-beam-clarity.md)):** supersedes the paragraph above's axe gate. The first axe fells the great tree as soon as Station 3 opens, and logs and beam arrive in either order; the rule and the client share one check (`railBeamChoppable`), so a stroke it would refuse rebounds on the next frame with its sound and no chips. Station 3's frame shows two empty saddles with loose gold lashings that tie off when the beam lands, and the great tree wears the same gold rope from the moment Station 3 opens. The trunk is dragged on that rope: a towed-rod follow with its far end on the ground (Local presentation from the carrier's smoothed pose, no new presence), and a friend's Help carry lifts the end level between two shoulders, with a thump when they let go. Your own Pick up takes the rope on the press, before the server answers. The proper axe moves to a stand by the lit forge (`LINE1_AXE_STAND`, Place's `AXE_STAND`). World reset to `v16`. Serves DESIGN.md 7 (Telegraph everything) and 11 (Show, don't tell).

Big-cargo requests retain their original revision, generation, destination authority and drop position until answered. A follower retries that same request once a second while synchronized, including after a short reconnect's same-generation snapshot; changed revisions, generations or authority end the old request instead of manufacturing a new claim. A retry can spend the original revision only once. Ordinary logs, rails and stone unload independently of pending big cargo, so even missing replies cannot lock their delivery; a beam deposit or boiler fit still waits for its competing Drop to settle. No wire or save shape changed for this recovery.

**Owner recovery decision, 5 November:** a dropped beam or boiler that becomes unreachable or loses its available state returns to its original pickup spot through the existing return path. Solo or the existing co-op authority checks grounded cargo once a second for a dry, level in-map footprint, overhead clearance and an unobstructed standing approach. This also covers loaded ground poses; holders and delivered/fitted cargo are excluded. Partners receive the same accepted return, and the Station 3 pickup gate still applies to a returned trunk.

**See a partner's load.** Logs, rails, stone, the great beam, boiler and upgraded pack use the same worn meshes and avatar frame as your own. Logs keep `placeBack`, big cargo keeps `placeBig`, and the additive Owner cosmetic field `placeLoad` carries bounded rail/stone counts and the pack flag. None enters lockstep. Missing or invalid fields hide that part, and departure removes attachments and pets. Presence validation and missing-as-off semantics remain for current peers. Serves DESIGN.md 11 (Show, don't tell).

**Great-beam verification, 4 November:** actual full-bot solo pickup-to-deposit rose from **5.1 s to 21.7 s**. The same 15 m segment took **7.574 s solo / 3.416 s assisted**. Both carrier departure roles and helper departure passed recovery checks; follower-carrier and helper-departure runs also waited for accepted delivery to open the crossing. Final full bot had no missed expected beats or errors. Opened carry stills, motion, curves and consecutive frames show one beam spanning both shoulders; source and `corner=1` feed views retain the receiver fit. Real-time feel and device testing remain unverified. [Full evidence, compare times, failures and limits](../plans/beam-weight.md#verification-record--4-november).

The optional **9 m beam** starts at the village's west edge (868, -30). **Lift** an end or **Let go** with Interact. Alone, one end lifts while the other stays planted; two people carry it at walking speed. Being more than 11 m apart for a second drops it. A departing partner leaves it at its last midpoint, saved, with the remaining player's grip intact. Carrying its midpoint within 5 m of (944, 6) sets it on a fulcrum. Nothing in progression requires it or pays for it. Once set, it is a see-saw: land from a jump on one end to launch a partner on the other at 15 m/s (pads 3.6 m from its centre, 1.6 m reach; minimum landing speed 5 m/s; 0.5 s cooldown). Alone it only tilts and thumps. The neutral beam is solid; tilt is local and cosmetic, and each tab launches only its own player.

Both beam grips use `currentCoopPeer` from `coop-identity.ts`, the same bounded participation-tick check as railway peer election. The stable `placeCoop` presence/message tag is not a build version. Existing co-op look fixtures check malformed ticks, release and departure; generation checks and beam ownership remain unchanged. Saved beam runs use `saved=1` and real movement after checkpoint restoration.

### Production Needle Bell hook climb (8 November 2026)

The production bot now marks `hook taken` after the demo lands on t0, requires the six remaining upward pulls and a dry `needle bell summit` landing, then returns through t5–t0 and p2. Each pull uses the registered action and requires a clear path and landing; climb and descent spend no air jump.

**Falling and returning:** the gorge has an existing exit. From its low floor, follow the low quarry footbridge and graded quarry path up the east bank. Round the north side of Q3's frame and the parked track layer, then use a normal jump over the raised timber track edge at s=112 and walk back to s=84. A summit fall can land on the upper bank and join this route directly. Both drop returns have passed without relocation recovery; no new stair, ramp, ladder or other exit geometry was added. Surface swimming is allowed in the bot's return mode, while the successful t3 route needed walking and a ground jump. The p2 ring is outside its 24 m range at the observed drop landings (about 62 m from t3's floor landing, 44 m from the summit's bank landing).

**Reload limitation:** production railway arrival currently remembers terrain positions, rejecting saved positions beneath tower slabs. A real reload during the t2→t3 pull did not restore the last standing slab, so the plan's t2 return and downward-pull proof remains unmet. The hook implementation has not changed that Local save policy.

Only the finder gets a demonstration: 0.3 s after dismissing the hook card, standing on p2 with a clear body path automatically pulls them to t0. A friend gets the existing shared-ability flourish and chooses their own pulls. The demo never runs from a late join or a reconstructed unlock.

A friend's nullable `railwayHook` presence names a known ring, with every other value treated as off. The Local view draws a cable from their interpolated avatar's right hand and poses that arm toward the ring. Missing presence winds the cable back; leaving removes the mesh, and a railway rebuild clears the view. The existing position presence remains the only body travel state.

The room's existing hook fact grants everyone a zip-line pull to the ring nearest the middle of the view: 24 m range, 25° cone, 16 m/s cruise with 60 m/s² acceleration and 70 m/s² braking. Picking uses chest ray clearance, both body-sphere sweeps and 20%/150 ms hysteresis. Jump, Back or a second press lets go with horizontal speed capped at 9.5 m/s and upward speed at 3 m/s; cancelling never refills the air jump. A pull skips the second-jump step. Reveal input holding blocks new pulls but lets a current pull finish. Ownership survives disconnect/resync and clears only after two ready seconds without the shared fact.

The press immediately starts its sound, 70 ms reaching cable and arm pose; arrival/let-go sounds and winds the cable back over 110 ms. A denied press gives a quiet pop, 1.5 m cable flick and 200 ms blink on nearby rings without moving the body. The picked ring shows the F/RB glyph for the first three pulls, with touch using its Hook button. Targeting and cosmetics are Local; the pull is Owner physics carried by ordinary position presence, with an additive nullable `railwayHook` pad id. No new shared operation or state is added.

The production railway shows eight rings from the start: p2, t0–t5 and the summit. Rings are brass before ownership, teal when owned or in range, and bright when picked or pulling. Six 0.9 m floating stone slabs have teal undersides; the 0.4 m wooden summit deck is at 102.4 m. Positions and ring placement read Place's `tech-layout.ts` directly. Thin 1.5 m collider tiles preserve the camera's view beneath the next slab. The existing p2 slab is reused. The t0 secret box, t3 side slab and all other Place rings stay out of production. The summit ring and its post retain Place's off-deck east-edge placement for the orchestrator's review.

### Production Q5, the sea gate and Far Head (8 November 2026)

Job A supplies Q5's Server state: the summit switch opens the sea gate whenever reached; Q5's
24-log/24-rail bill still waits for Q4 to complete and Q5 to become active. The active Q4/Q5 frame accepts logs and rails before its gate is down (owner playtest call, 8 November).
Hand-carried and depot-cart materials stock the bill; a full gated frame keeps its physical stock and counters,
with “Pull the lever / switch to start”. The cart's “More coming” board hides when the bill is full.
Pulling funds a full bill; otherwise the last deposit after the pull funds it.
Automatic unloading retries in reach at the ordinary cadence, logs then rails, without a drop/pickup cycle.
The Server rule and client prediction share this acceptance rule; funding stays authoritative. Existing partly
stocked gated saves remain valid with the same world namespace.
The cart stocks the rack even before the switch is pulled; it carries 24 rails a trip since glider piece B (it was
16, two trips), so Q5's rails come in one shipment. The bot now reuses the Needle Bell climb and descent after Q4, pulls `railway-sea-switch`, unloads logs
before taking shelf rails, funds Q5, waits for laying and walks the 260 m trestle with dry support checks every
3 m. Checkpoints are `sea gate`, `Q5 funded`, `Q5 laid` and `Far Head`; a friend witnesses Q5 completion.

The Local gate slab, switch drum and posts read accepted `sea`; the switch lights the posts
down to the gate. Far Head's lamps follow Q5 completion; rockets play only on the live completion edge, never
on rebuild, reload or late join. C reads B's pinned `sea`, `seaGateSolid`, `farHead` and `trestleLamps` inspection
fields. After B merged as `bfe5cf30`, both seeded halves passed without recovery: sea gate 38.8 s;
Q5 funded 123.9 s, laid 153.9 s, Far Head 208.3 s. The bot follows the laid track across the gorge and rounds
the solid parked machine on Far Head's broad ground. Physical seam walks at s=351 centre/right, 416 left and
481 left remained supported, with minimum foot clearance 0.087 m above rail height; no collider repair was needed.

The finishing fixture now leaves 45 s for mounting, and the look waits for the moving head before recording.
Opened frames show final rail pairs completing (184→188), 10 rockets over Far Head and five over the village,
and lamps sequencing to 54. The summit, rim and reverse Far Head stills show the switch/gate approach and a
continuous trestle; daylight reduces the distant lamps' contrast. These are targeted seeded proofs, not a full
campaign or real-time smoothness verdict. The long route and owner playtest remain with the orchestrator.
`WORLD_NS` v20; not tested on a device.

### Production glider (9 November 2026, piece B)

[Plan](../plans/glider-b-home-flow.md); [placement brief](../brainstorms/glider-placement.md). The glider waits
sealed on Needle Bell's summit at world (1016, 102.4, −4.5), 4.5 m from the sea switch: a dark drum with a brass cap
and a short mast carrying a furled vane in dark cloth, pointing west at the forge. It has no ring, no light, no shaft
and no prompt, so on the first climb it reads as a thing that isn't on yet.

Q5's completion wakes it, on the same edge that casts the boiler (no summit cinematic). The vane takes the worn roll's
teal and cream, Place's two rings and core light up and turn, and a teal locator shaft rises 70 m (radius 0.45,
breathing between opacity 0.2 and 0.32, held at 0.26 under reduced motion), a few pixels wide from the village and
line 2. It used to be as faint as the jump device's (0.1 m, 0.1), and in the owner's 10 November co-op playtest the
glider woke about ten minutes in and nobody in the room noticed it. On the live edge only the vane unfurls once over
0.6 s, the shaft flares (opacity 0.85, 2.5 times as wide, easing back over 4 s) and every client in the room shows
the moment banner "The glider is awake" / "Up on Needle Bell's summit" (draft copy for the owner; not a Boogler
line), each from its own accepted edge; a reload or a late join snaps it to woken with no flare or banner. While it
waits, every halt's map display marks the summit with a small teal canopy in the device's teal and cream (displays
stand once trains run, so a group that left it behind sees it there). The route up stays the hook rings and teal
undersides of the first climb, which read from the foot without a sign.
The hook brings you back up. **Take it** (Place's verb) is one shared take, `rail.glide`, a Server op on the railway
world, heard within 3.2 m across and 2.6 m of the summit's height and only after Q5: whoever takes it takes it for
the room. It is predicted, so the finder gets Place's card ("The glider" / "Open it in the air."), the
`pickupGlider` sound and the folded roll on the press; partners get the ability-arrival flourish (teal puff, sound,
the glider badge) and no card. Taken, the device keeps its drum and loses its lights.

The first time you fall faster than 4 m/s with the glider shut, the Glide action's glyph (LB / Q; nothing on touch,
like the jump teach) pulses at your back until you open it or land. It shows Glide, not Jump, because at Q5 Jump
spends the double jump first. The flight is piece A's, now read from eight room tunables (`railGlideSpeed` 1000 cm/s,
`railGlideSink` 320 cm/s, `railGlideAccel` 1800, `railGlideBrake` 1200, `railGlideOver` 800 cm/s², `railGlideTurnTau`
120 ms, `railGlideTurnMax` 360°/s, `railGlideDeploy` 100 ms).

Taking it faces you west over the device toward the forge, where the plume stands over the new boiler, so the natural
step-off heads home. The first flight lands on the forge apron only if you let go of the stick over it: letting go
brakes you in under a second and you sink onto broad, dry ground. Holding full stick carries you about 250 m, over the
forge and the village and into the cove, which is a swim.

The cart now carries 24 rails a trip (16 before), so Q5's whole rail bill comes in one shipment. The production bot
plays in a player's order: it opens the pack at the forge before Q1, pulls the sea switch on the first climb, waits
at the rim for Q5's single shipment, and after Far Head climbs back up, takes the glider and glides to the boiler;
`&botOrder=legacy` keeps the old order. Seeds `glide-earned`, `q5-shelved` and `q5-arriving` replace the dev grant
`&railGlide=1`. Code: `rail.glide` in `src/sim/railway-systems.ts`, `Rail.glide`, the view
`src/entities/railway/glide-device-view.ts`, the flourish and teach in `ability-arrival.ts`. `WORLD_NS` v23. Not
tested on a device.

### Production boiler, trains and the pier (8 November 2026)

Q5 completion casts one communal boiler on the forge apron. An empty-backed player shoulders it and walks
line one's finished track to fit it at the old camp locomotive. Accepted fitting starts the wake (rust clearing,
steam and whistle) and drops five Local halts into place. These effects do not replay on restore. While the boiler is
held the server follows where its holder stands, once a second, as it does for the great beam; a holder back within the
grace (`railBeamGraceS`, 180 s) still holds it, and one away longer has it put down where they last stood, or back on
its pedestal if that was outside the haul area (boiler-first-choice plan, step 5; the beam's rule, owner 6 November).

**The boiler on the rope** (boiler-first-choice plan, step 6; owner, 9 November: "like the great log, but maybe a
little faster"). The held boiler is drawn as the great beam is: a short, fat rod whose nose hangs a rope's length behind
the hauler's hip, the gold rope running from their hand to it, the tail resting on the ground and swinging wide on turns,
with the beam's dust and scrape. On a deck, a bridge or a car the tail rides at the hauler's feet height rather than
dropping to the terrain below. The hauler takes the beam's rope pose, has sprint off and walks at 300 cm/s
(room tunable `railway.boilerSoloSpeed`; `railway.boilerHelpSpeed` is the helped pace). A friend with an empty back within 5 m of the grip (where the dragging end rests, from the hauler's pose) presses **Help carry** there and the boiler
lifts between the two shoulders; the hauler then walks at 540 cm/s and the helper has sprint off; **Let go** ends it (an
Owner value, `railwayBoilerHelp`, the holder's pid; it goes stale after 1.5 s). Once helping, the claim holds out to 8 m
from the grip with 3 m of height, and the helper is eased toward the grip so they follow without steering; the beam and
the footings share the same helper (`help-carry.ts`; [works-late-game](../plans/works-late-game.md), step 4). The take shows on the press, before the
server's answer. Drop puts it down where it is drawn, on the heading it was hauled on; outside the haul area it goes back
to the pedestal. While the boiler is hauled, the old train's empty saddle shows a dashed gold outline of it (the rope's
gold, the station 6 sign's dashes) with a few of the pedestal's motes; it goes once the boiler is down or fitted.

**The fit** (boiler-first-choice plan, step 8). On the frame the hauler presses **Fit the boiler** the boiler leaves the
rope and arcs into the old loco's empty saddle in 0.45 s (0.8 m apex), with a thump at the hauler and a clank and a
dust ring as it lands exactly where the loco's own boiler sits; it waits there for the answer. Accepted, the loco's own
boiler takes its place (a fast answer lets the flight finish first), two of the camp's little guys run to the loco's
side and hammer at it for about five seconds (never less than two after they arrive), and the wake plays. Refused, or
1.5 s with no answer, it hops back onto the rope in 0.3 s with the deny sound. Everyone else hears the clank when the
fit is accepted and gets the boiler flourish. **The mark:** the gold rope stays lashed round both locos' boilers
whenever trains run, two rings a few centimetres clear of the bands and a knot, so it is there after a reload and for
every later visitor. The fitter's "You got" card ("Steam", "Trains run both lines.") is built but off until the owner
approves the copy (`BOILER_CARD`).

**The engine** (10 November; [engine previz](../plans/engine-previz.md), owner's pick: A, the stubby toy, with a cab
that fits Buddy). Both lines lead with engine A at 1.25×: a 4.0 m frame (4.68 m over the buffers), two 0.95 m drivers
on the kit's wheel batch, and a walk-in cab 1.79 m wide inside, its floor 1.29 m and its roof's underside 3.2 m over
the rail. Each side has a doorway at the back of the cab, 1.0 m wide and 1.78 m high, with a step halfway up from the
halt deck; its door is drawn shut and stays shut (owner, 10 November: "park that functionality"; the swing on
approach is kept behind `DOORS_SWING`, off, in train-view.ts). The door was never solid, so you walk in through it as
before. The cab's two front windows, either side of the boiler, and each door's window are open, each with a thin dark
frame (no glass pane; owner, 10 November: "Open frames, as built"), so the driver on his stool shows from the platform, from the track ahead and through the door. Inside, the boiler's back end is the backhead (regulator, gauges, firebox door) and a
little guy drives from a tall stool beside where Buddy stands. Before the fit the body is rusted and the saddles
empty; the fitted boiler (the same part as on the pedestal and the rope, `assets/src/engine.py`) and its lashing come
with the fit. The engine is a compound of client platform colliders: the deck to the cab floor, the cab's walls either
side of each doorway, the roof and steps, and the boiler once fitted; you ride whichever top your feet are on (cab
floor, boiler top or roof). The front of each train stands 1.0 m further on than before at every stop; the stops are
unchanged (`TRAIN_OFFSETS`, client constants). The longer-boiler upgrade's meshes are built (`engine_*_long`) but not
in the game. While you're in a cab or its doorway, the cab is cut away on your screen alone, as the town's rooms are:
its roof lifts off and each wall within 0.8 m of the camera's side (or past it) sinks to a kerb a tenth of its height in
0.24 s (at once with reduced motion), a door with its wall, and comes back once the camera is 1.5 m inside it or you're
out. Colliders stay and a shadow-only shell keeps the cab's shade. A friend outside sees the cab whole. Local, no state.
Not tested on a device.

**Stop on request (10 November 2026; [works-late-game](../plans/works-late-game.md), step 1; `WORLD_NS` v25).** A
train stops at a halt only when that halt has a request in the train's direction, at an end of its line, or at a
service stop the sim decides; otherwise it runs straight through at cruise. A request is one digit per halt per
direction on the train's row (`req`, a safe integer with room for 26 stops); an end halt has one, its way out. The
lever's handle and a passenger's press set the same digit, so a repeat or a friend's same ask moves nothing, and a
later request never replaces an earlier one (until 10 November each line held one call and a later call replaced it).
The server takes `rail.call {id, dir}` from the halt's platform or aboard: within 10 m of the train's pose now, plus
its length (7.4 m) and what it travels in a 10-tick lag window (a coarse line path in `src/sim/railway-line-path.ts`),
and the train's own tick clears the digit as it leaves the halt that way.
A request made mid-run replaces the leg from the train's pose that tick, at its speed, when it can still brake for the
halt (about 57 m at cruise); inside that it waits for the next train that way, and the passenger's prompt already
names the following halt. A leg row holds its start, entry speed and destination in cm (`from`, `v0`, `dest`), and the
pose reads only the row, so a stop that moves never makes a running train jump. With requests only behind it a train
turns back early at the next halt it can stop at (LOOK, as lifts do); with nothing asked anywhere it sweeps end to end.
The service stops need no request: the village going home while the Q6 kit is owed and none is aboard, Far Head while
it is aboard, the quarry going out while the footing wagon has room and the pier still needs footings, and the pier
while the wagon carries footings; the wagon's roll-out counts as a request at line 2's village end. While anything is
asked, a service stop ahead that wants the other way is where the train turns, so an ask never turns it back short of
an errand it still owes (the independent review found a Far Head lever pressed again and again starving the kit, and
the wagon the same way). Dwell is 5 s at every stop (the 1.5 s call dwell is gone), and a
request at the halt a train stands at, leaving that way, restarts its dwell. Owner calls behind it: "Stop on request"
and the passenger request (decisions, 10 November); the two handles, LOOK turn-backs and replanning are recommended
details logged in the plan. Not tested on a device.

The two Server-owned lines run at
20 m/s: camp–village, and village–quarry–Far Head. Owner platform carry keeps a rider
aboard; train schedules receive no away credit. The first line-2 service moves Q6's kit from the forge: 32 minted
logs and 32 already-poured rails, aboard the train, then atomically onto Far Head's rack and shelf. Every unit
stays in the existing conservation accounts. The bot reads those counts from state, independently of rack artwork.

Two sixteen-unit carries of each material fund Q6's 32/32 frame. The machine lays the last stretch to the pier;
the live completion edge fires rockets over the pier and village, without a banner. The production bot continues
after Far Head through `boiler`, `TRAINS`, `train called`, `train ride`, `Q6 stocked`, `Q6 funded`, `Q6 laid` and
`pier`; its friend observes Q6 completion. The final parked machine requires ordinary grounded hops over its low
deck, with dry support checked every 3 m. Earlier route waypoints and checkpoints are unchanged.

Both accepted-seed halves pass without recovery. The boiler half reaches boiler at 3.1 s and TRAINS at 46.9 s;
an additional first-line ride reaches the camp call at 47.7 s and village at 72.9 s. The Q6 half reaches call at
14.7 s, ride at 78.0 s, stocked at 78.6 s, funded at 93.0 s, laid at 120.8 s and pier at 157.1 s. These are seeded
bot times at 1×, not first-visitor pacing. Opened photos show the carried boiler, wake puffs and arriving halt
pieces, the completed pier with rockets, and the northward Ring Island view (`greybox=sickle`).
[B8's record](../plans/line2-part2-greybox.md#b5b8-proof-record-8-november) links the manifests and limitations.
`WORLD_NS` v21; not tested on a device. The orchestrator owns the long final pass and owner playtest guide.

### The second track, drawn (10 November 2026, generic-lines step 2)

Both lines are drawn double track ([generic-lines](../plans/generic-lines.md), step 2): the up track runs 4 m left of
today's (left-hand running) from merge to merge, line 1 s 36–182 and line 2 s 34–556, easing in and out over a 20 m
stub turnout at each end, so the turntable, both Village platforms, the Camp end and the pier stay one track. Far Head
has a facing crossover at s 490–512, up track to down, while it is line 2's end. On the ridge, gorge and sea trestles
the deck spans both tracks (7.6 m) on bents that reach out under the up track. The track layer lays both tracks of
each panel in one trip: the gantry lifts the top two pairs off its stack, seats today's track's pair, lets go, crosses
4 m and sets the up track's pair down, so its stack empties by two a panel (bills, panel counts and timing are
unchanged; the beam is 7.0 m). Quarry and Far Head each get an up platform outside the new track (Quarry's s 154–174.5,
clear of the Q4 frame, with no ramp off that end) and a plank crossing over both tracks: at Far Head by today's
platform's end ramp, at the Quarry (whose two platforms overlap along the line) just before the up platform's start
ramp, its planks running on to a pad at that ramp's foot so you step straight onto it; they drop in with today's halt and have no lever, signal or board yet. To make room the hook pillar p2 and its
walk stand 11 m out at s 89.5 (the hook device moved with it, accepted there by the server; the walk rises round
the pillar's far side from t0, so t0 still needs the hook), p1's lip ends at the
wider deck's edge, both line-2 gates span both tracks (slab 10.4 m, centred 2 m left) and the ridge trestle's left
lamps stand at its new edge. Trains still run on today's track only (step 4). No `WORLD_NS` bump; not tested on a
device.

**The wing, modelled (11 November, behind `?layer=wing`).** The second hand is a built model, `assets/src/track-wing.py`
(`assets/built/track-wing.glb`, 2,636 triangles, 32 KB): a post with a header on a truck that sets down on the up rails once the
gap beside the flatbed is 1.8 m and lifts as it closes, a three-stage telescoping arm from the flatbed header's end to the post
(above head height, 3.55 m up), and a platform for the up stack that slides between the tracks, carrying its own beam, trolley,
hoist and jaws at the 5.8 m reach. Orange frame, cream moving parts, as the machine. View only: no collider ("after a yes the
wing is solid" is a later step), no rule, wire or `WORLD_NS` change, nothing without the flag. The owner can turn it and scrub
it in the asset viewer: `/character/?asset=track-wing` ([brief](../brainstorms/track-layers-double.md#the-wing-model-11-november-2026)). Not tested on a device.

**Line 2 goes out: the views of v27 (11 November 2026, R4a; [ring-island-build1](../plans/ring-island-build1.md), step 4a; owner/designer calls 53-65).**
The rules went out to Ring Island in v27 (Q7, the Railhead, Ring Island, three trains); this is what a player sees of
them. **The Pier is on the east side** of the down track, from Q6: its platform (s 719-741, lat +1.65 to +4.15), shelter,
bench, board, signal mast and one-handle lever (plaqued Village) mirror the old west ones, the one ramp up from the
trestle's deck at the landward end (s 713-719), and the pier rack on its seaward edge. Nothing stands on the west
side. Past the platform's north end the pier head's side deck shrinks to a **pad** (s 741-746) that carries the jib, 0.68 m
under the platform's north end (a drop going out, a plain jump coming back); the jump-ins land on the platform's
south end. South of the ramp a **piled deck** (s 703-713, lat +1.8 to +6.0) carries **Station 7**'s frame (the
sim's, s 710), its log rack, the rails' shelf and its box; Q7's kit unloads there from the train that stands at the
Pier, and the frame, rack and shelf stand once the pier is laid. **Q7's double deck** is laid over bents 1-6 a panel at
a time (planks across both tracks, both tracks' rails, stringers, a 1.5 m plank footway along its east edge from the
pad to where the railhead's walkway begins; solid as it is laid), with a finger board "Railhead" at the pad's corner.
When Q7 is done the pier's **up track** drops in from the old merge out to the pier head as plain double track (the
turnout before s 556 is taken out of the picture). Trains run past the pier head on the ring's own path (the layout's
line does not reach it), take the up track's 4 m offset from the open end's stub (the Pier's, the railhead's, sliding
a bent with `head`) or crossover (Far Head's, Ring Island's), and a train Q7 turns at the Pier eases onto the down
track instead of jumping across (it once jumped 4 m for a tick). The levers of the **Railhead** (east: way home, live
once Q7 is laid, sliding with the railhead and offering no prompt while it moves; west: chained until the rivet) and
**Ring Island** (east: way home, live from the rivet; west: chained) are drawn on those platforms; a chained lever's
plaque names the halt that opens next. Not yet: the laying machine does not travel out onto the deck (it stays parked
at the pier head while the deck drops in, then leaves the scene once Q7 is laid: line 2 runs through where it stood), the halt displays' map keeps v26's six stops (the Railhead's and Ring
Island's names do not fit the 320 x 256 faces beside the Pier's). Not tested on a device.

**The railhead and the gap (11 November 2026, R4b; step 4b; calls 14, 16, 49, 51).** Once Q7 is laid line 2 runs on
from the pier head over **bents 7-13** (u 140-260 m, bowing down 4% to 14.7 m), and every metre a train can stand on has
its deck and rails drawn. The next bent's two sockets glow on the sea floor and a taller gold-topped stake marks it;
stakes at the bents after it are a line of small orange posts running on toward the island. Each footing the jib sets
goes up on its rope, out over the stakes and down into a socket with a splash; the second stands the bent (posts, braces,
cap), the span (planks, stringers, both tracks' rails, the side walkway) drops onto it from the old end outward, and
the railhead's **platform, rack, jib and buffers slide out** along it in about 3 s. The platform is 25 m long, 0.9 m
over the deck, east of the down track (lat +1.8 to +6.3) with a yellow safe line; **its 25 m stay behind as the side
walkway** (deck height, 4.5 m wide, from u 95), so nobody on the platform is ever left over the sea: while it moves
it has no collider and whoever is on it drops 0.9 m onto the walkway, and the rack's and the jib's prompts wait for
the slide. The deck ends on a yellow and black striped beam and buffers on both tracks (a pair of points 50 to 30 m
short of the end puts the up track on the down track; the up track runs on to its own buffer, so nothing has to appear
when the rivet makes the line a through one: the buffers and the stripes go then). The wagon's loads hop to the rack
(three layers of six), a footing is shouldered at the rack and set at the jib with the pier's prompts ("Shoulder a
footing", "Set the footing"; none once fourteen are set). With bent 13 come the **hook pile** 276 m out (three timbers
and a mast to its ring, which joins the hook's rings once the fourteenth footing is set), the **gold land pad** and the
take-off rail on the platform's last 5 m, and the **joint's west platform** (u 235-260) with its plank crossing over
both tracks at u 240. **The lookout's buoys lift** as the railhead reaches them: 1 and 2 from the start, 3 at bent 8,
4 at bent 11, 5 to 7 on the rivet, each rising off its mooring with a splash; the crane's little guy does not bow
(not built). Once Q7 is laid the island's near view stays mounted at any distance, so the Way is there under the trains;
the leaf's own view now swings it (below). Not tested on a device.

**The bridge leaf (11 November 2026, R4c, first part; calls 8, 9, 35).** The leaf rests raised (78 degrees) on its pawl.
Braced, each counterweight footing hung dips it a quarter (0.7 s); the last one, or the pawl knocked out with all four
hung, swings it down onto the bents in 2.5 s, ease-in, with a thump at the toe. A page that loads after the leaf is down,
or after the rivet, sees it flat at once, with no swing. One view (`leaf-view.ts`) writes the pose, from the accepted
rows; nothing else does. **The prompts (R4c, second part).** At the gold strut on the brace platform, once the gap is footed and the pawl is in,
the prompt is "Knock out the pawl"; it braces the leaf. At the jib, with a footing on your back, the prompt is "Set the
footing" while bents are still being footed and "Hang the weight" once the gap is footed: it hangs a counterweight
footing, until four hang (the owner's two labels, 11 November). Either order; the fourth with the leaf
braced, or the pull with four hung, brings it down. Anyone standing under the toe's landing (the last metre and a half of
the railhead's deck) is walked back along the deck, away from the hinge, as the leaf comes down (its last swing, not a
counterweight's dip), and is never pinned.
**The pennant (11 November, owner: "it should maybe be on it's own pole").** The cream pennant that makes the raised leaf
readable from Home is not on the leaf: it flies from its own fixed pole on a footing in the sea beside the hinge pier
(island side, out past the Way's left edge), never moves, and stays up after the Meet. Local presentation, no collider.
**Not built yet:** the splash, the creak on the pawl, the lit bracket, the rivet's glint, and a tumble for the one walked
clear. Not tested on a device.

**The steel works, a greybox (12 November 2026; [ring-island-build2](../plans/ring-island-build2.md), V1).** On the
island halt's works yard, east of the east platform, from v31: a grey open shed stands over the drop hammer with a
doorway facing the platform, a box loader and a rack stand beside the platform's south half, and two pallets lie on
the open deck between the tarp and the shed. Once the rivet is struck a bill sign under the shed's roof reads
"logs 0/8  rails 0/12"; the first train out unloads the kit onto the pallets. **Take logs** and **Take rails** at the
stacks put them on your back ("Your back is full" when it is); **Feed the works** at the doorway puts your logs and
rails into the bill, and with an empty or wrong back shows blocked with "Bring logs or rails". When the bill is full the
server lights the works: the sign reads "lit  steel n/12" and orange steel blocks appear on the rack, up to six, for
the next train's kit car. Every label here is a placeholder. No sound or effect yet. **On the train (V2):** steel
rides home as orange blocks on the kit car of whichever line 2 train took it, up to six; a train that has taken the
longer boiler at the Village wears the longer engine (a longer frame and barrel ahead of the same cab), drawn only:
its collider is the short engine's. **At Home (V3):** from the rivet a grey pallet and a post stand on the open ground
east of the Roundhouse table, between line 2's two roads. Steel that has come home lies on the pallet as orange blocks,
up to twelve, and the post's lamp turns orange. Standing by the post, "Install the longer boiler" is a hold of 1.2 s
(the post's bar fills; a tap reads "Hold to install"); while the footing wagon is rolling out it shows blocked with
"The table's busy". Nothing is predicted: when the server accepts, every page in the room shows the banner "Longer
boiler installed / Line 2's trains take it at the Village", the lamp and bar go green and the prompt is gone; each
line 2 train takes the boiler the next time it stands at the Village. The steel stays on the pallet (nothing spends
it yet). No sound, no camera move. **The garage at today's table (garage-install-moment, G1 and G2, 12 November):**
once the footing wagon has coupled and the shunter is back in its stall, a works copy of the engine and its first car
stands on the table along the bridge, solid, wearing the room's boiler (the longer one with its four bolts once it is
installed). On a live tick it arrives behind a puff of steam with a whistle; a reload or a late join just finds it
there. The grey post is now the garage's lever post, with a knob that is brass, orange while steel waits and green
once the longer boiler is on. A jib and a stand are south-east of the table, off the deck; when steel is home the
longer boiler lies on the stand under the jib's hook and two crew figures wait by the mast. Interact at the post opens
the garage ("Look at the engine") on a camera from the east-south-east, and the deck turns the copy for it; it is not
offered while steel waits, when the post carries the plain "Install the longer boiler" hold above (its bar is gone
with the grey post). In the garage the Longer boiler tile reads "Needs steel", then "Ready", then "Installed", and
the old Boiler "Replaced"; the button is still Try it. The garage's own Install, and the moment for everyone, are the
plan's next steps. Not tested on a device.

**The stack line to High Gorge, a greybox (12 November 2026; [greybox-route](../plans/greybox-route.md), leg 1 step
4).** Every label below is a placeholder, grey and readable, with no sound or effect. **On Ring Island** the tracks
divide two bills: the steel works east (its sign now headed "STEEL WORKS", the counts under it) and the line on west.
On the west platform stand a rack with a "KIT 1" plate, an empty frame 7 m north of it and a bill sign: "LINE TO HIGH
GORGE / SECTION 1 OF 4 / LOGS 0/20  RAILS 0/20 / KIT: ON A TRAIN" (then "ON THE RACK", then "LAYING THE SECTION"),
with the section's number in a black square on the sign and the plate. A train sets the kit on the rack; **Take logs**
and **Take rails** at the rack, **Feed the frame** at the frame (blocked with "Bring logs or rails" on an empty back).
The island's run-off now curves west onto the stack line through a rock cutting in the hillside; its buffers stand at
the line's end with a board, "LINE TO HIGH GORGE / UNDER CONSTRUCTION" once the rivet is struck. **A section laid**
grows the deck out over its 30 s lay clock: a grey slab with two tracks on bents over the sea, 510 m a section. At
each railhead stand a 25 m platform on the right going out with a lever home, a ramp down into the sea, the rack and
plate, the frame and its bill (now "SECTION 2 OF 4" and "KIT 2"), and the buffers and board at the deck's end. A
railhead passed keeps its platform for one more section, then only a signal post between the tracks ("SIGNAL / TRAIN
AHEAD", its arm red while a train is held there); the third stays as a request stop both ways. **High Gorge:** two
40 m platforms in the split, buffers, a concourse behind them, a gangway to the north wall and a stair of four long
flights with pale parapets up to the rim, 81 m above; on the rim a post, "POWERED PICK / NOT YET" until the fourth
section is laid, then **Take the powered pick**. Behind the south platform a red barrier, "BARRIER: THE INCLINE",
which reads "Needs the powered pick" and then "No line beyond yet" (the incline is leg 2). West of the gangway a pad
with two grey boxes, three staked plots and a board is the stand-in town. A slipway climbs from the split's water to
the gangway. The stacks themselves are the horizon's shapes, made solid while you are within 400 m. Not built yet:
the halt map and Home's line map do not show the line past Ring Island, kit cars carry no number, a joining train
appears without its one-second scale-in, and the kit does not hop from the train to the rack. Not tested on a device.

### Production Split-rock Works and the Roundhouse (9 November 2026)

After the pier the forge casts its third thing, the **breaker**, onto the boiler's old pedestal under the forge's
plume and whistle. **Take the breaker** is once for the room; like the boiler before it, its prompt measures to the
pedestal's edge, so logs set down against the pedestal don't take the prompt from it (12 November). **Strike the seam** at the cracked slab by Home's
turntable opens the old Roundhouse stall (two empty sockets, a tarped shunter and wagon); at the quarry halt the same
strike topples the split rock's throat and opens the haul cut. **Fill the kiln** at the cut takes 16 logs and 16
stone (the bowl's two limestone rocks give 8 each); once lit it casts a footing every 8 s down the roller road onto
the halt rack, at most six on the rack and exactly fourteen in all (sixteen until 10 November).

A footing (**Shoulder a footing**) fills your back and slows you to its own pace, 3 m/s alone (a sprint goes 1.3 times
that) and 5.4 m/s with a friend's **Help carry** (no sprint), the `railway.footSoloSpeed` and `footHelpSpeed` room
tunables (until 10 November it borrowed the great beam's 2.2 and 5 m/s). The plain jump works; the second jump, the
glide and the hook are off while you carry one, so a work item opens no new travel edge. Two go home by hand, the
deliberate "before": they raise the stall frame and pull its tarp off. The cradle takes only its eight forge rails
(**Fit the cradle**), which turn it brass (it took two footings too until 10 November;
[works-late-game](../plans/works-late-game.md), step 2). **Turn the table** is accepted only when ready (owner, 10
November): once the cradle is fitted and before the wagon rolls out, so the one turn there is sends the shunter
pushing the wagon out to wait on line 2. Earlier, while it rolls out, and after line 2 couples it, a turn is refused
and the prompt isn't offered (until 10 November a turn before the fit was accepted and did nothing, and after
coupling the table was a toy). From then the wagon is line 2's fourth car: arriving at the quarry, up to six
footings hop from the Works rack onto its cradle; arriving at the new **Pier** halt (open once Q6 is laid), they hop
onto the pier rack. Line 2 stands there 3.5 m short of the halt's middle, so its engine stops clear of the
track layer parked at the rails' end (engine A, 10 November: 1.0 m nearer than the old loco, and at least the 1 m wanted
with the longer boiler; `test/railway-works-layout.test.ts`) and the wagon stands at the halt's
landward end. The pier rack is a timber row of six (two high)
along the halt deck's seaward edge, leaving the track side free to walk and board; it stands once the kiln has cast
its first footing. At the pier head a jib swings each set footing out over the stakes and lowers it on a rope into
its socket on the sea floor; each pair raises a trestle bent to its deck height, and the twelfth set
gives the crossing's finale once the last bent stands. The bents are built for the double track ([generic-lines](../plans/generic-lines.md),
step 3): each carries a 7.6 m deck whose middle is 2 m west of line 2's track, its two footings 3.3 m either side, and
their decks bow down from the pier head at the 4% ruling grade, 24.3 m at the first bent to 20.3 m at the sixth
(nothing is laid on them until Ring Island). The last bent is 121 m from the pier head, so the whistle's
range is sized from that distance (about half its gain at the jib and on the halt); until 10 November it had the
machine sounds' 45 m and was silent for everyone on the pier (in the owner's playtest he heard and saw no finale).
The finale is a promise, not an ending (10 November: the owner thought the run had stalled; Ring Island is next, and
the Split-rock plan's gut question is whether it made you want to set off): after the whistle, every player who sees
the twelfth footing live gets a 7 s camera pull-out, from 34 m over the pier head's seaward end 20 m east of the line,
along the six bents just over their decks to 27 m up just short of the last, looking out over their far end to Ring Island's broken
ring the whole way. Ten rockets go up from the sea past the last bent, each leaning about 14 m out toward the island
(a little bigger than Far Head's, as they're seen from further), and the fanfare plays with a banner,
**Next stop: Ring Island** over *The crossing has begun* (UI copy, flagged for the owner). It plays to the end like
every pull-out, with the one highlighted Interact skip from 0.8 s; the shot, rockets, fanfare and banner wait behind a
reward card, the whistle doesn't. A seated player or reduced motion gets the rockets and banner without the camera.
A late joiner or a reload restores the crossing standing, with no finale. Until 10 November it was two small rockets
for 2.5 s, partly behind the jib's mast, and no words.
The playtest data marks `crossing footed` (the edge, as the page saw it) and `crossing finale` (it played, with the
camera's distance to the bursts, whether they were on screen as it began, and whether this page took the shot).
The jump-in **Crossing almost finished** (`crossing-finishing`: ten set, two on the pier rack) replays it.

Every footing has one home at a time (Works rack, back, ground pile, wagon, pier rack, stall, cradle, sea), and
`footingTotal === poured` holds every tick; a leaver's footing returns to the Works rack after the beam's grace, so
every partial state is safe to inherit. Effects play on the press, accepted events and live edges only; a reload
snaps the stall, the cradle, the wagon, the bents and the racks. Serves DESIGN.md **7. Telegraph everything**, **8.
Enjoyable alone and together** and **9. Leave something for the next visitor**. `WORLD_NS` v22; not tested on a
device. Bot times and stills: [the plan's J5 record](../plans/split-rock-roundhouse.md#job-j5-the-footing-wagon-the-pier-and-the-crossing-the-bot-and-the-record-after-j3-j4-and-b5b8s-b-and-d).

**Signposting: gold means "this is for that"** (9 November, [works-signposting](../brainstorms/works-signposting.md),
suggestions 1 and 2). While the breaker is out, every seam it hasn't struck trickles the pedestal's gold motes up its
crack, on the face you come from (the stall's toward the pedestal, the throat's toward the halt; larger than the
pedestal's so a trickle reads at 10 m, only specks from the halt), and the breaker glints on your back while a seam is
left. From the throat strike until the kiln lights, the missing load shows as dashed `GOLD_ROPE` ghosts: a log in the
cradle and a stone in the hopper for each one still wanted, each going as its real piece appears, and the bowl's two
limestone rocks give off the same gold motes while the hopper wants stone. The kiln's logs lie side by side across
the cradle, four to a layer (they had stacked end to end in one column). The
throat shot starts high on the halt side, aims through the cut at the bays and holds on them after the
slabs have sunk (4.8 s). All Local over accepted state, so a friend and a late joiner see the same ghosts and motes;
the shot is a shared moment (10 November): everyone in the room gets it on the accepted strike, a late joiner does
not. No words; motes are off under reduced motion, the ghosts stay. The ghosts are one
instanced draw (`src/render/ghost-outline.ts`, shared with the boiler plan's saddle echo).

**From the quarry halt to the kiln** (9 November, the designer's answer in the same brief; words and beacons are
allowed sparingly, [decisions](../decisions.md)). Once the breaker is taken (part 2 moved it from the throat strike,
so a player who strikes the stall first is sent up the road too) a trodden path, paler sand 1.6 m wide,
runs beside the roller road from the platform end by the rack up to the throat floor, and a painted fingerpost
reading **Kiln** stands where it leaves the platform, its arm pointing up the road. The path has no collider: the bot
route and the route contract are unchanged. Path, post and arm board ride the Works box batch; only the painted arm
face is a draw of its own.

**Part 2: the second seam, the sockets and the kiln's ask** ([plan](../plans/works-signposting-2.md), built on its
recommended answers; the owner may revise them). While the breaker is out every halt's map display carries a small
gold zigzag at each seam not yet struck, at its real place and over the train markers; from the throat strike until
the kiln lights a dashed gold square marks the kiln (kept whole on the face). Still, no blink, the same under reduced
motion; two instanced quads on top of the displays' draws. When the stall slab falls, each empty socket shows a
dashed gold ghost footing, a little smaller than a footing, each going as its footing is set. From the throat strike
until the kiln lights a station-style bill stands 4 m back from the path's end beside its last leg, facing down it:
**Kiln** / **logs 0/16  stone 0/16**, its counts rising as the kiln fills (no collider, no shadow). Pressing at the
kiln with nothing it wants on your back shows **Fill the kiln** greyed, "Bring logs or stone". A resident in the
street says once, after the breaker is taken: "That big hammer's for cracks. One by the turntable, and a jealous one
past the quarry." (a town-side fact, `breaker`, newest after the pier, so the residents' own pier notices are then
quiet). The kiln's logs come from the grove 30–46 m outside the throat; `npm run loop` no longer counts the trees the
Works clears inside the rock. All Local over accepted state.

**Departure boards at the halts** (owner, 9 November: "a real sign rather than a big floating text countdown"). The
big hovering countdown over each halt's centre is gone. It shipped first as a split-flap countdown, then as a bare
strip of the halt's own line; the owner preferred a map ("The line strip board looks less nice than the old
prototype one, where you could see the other stations like a map") and picked **"Island map"** from four 2D boards
([decisions](../decisions.md)), then asked for it "on a little display at the station" instead of up the signal
mast (10 November). Every standing halt has a **map display**: a free-standing stand at reading height, two short
legs, a dark frame whose back is a plain panel, and a roof-red cap, its 1.0 × 0.8 m face centred 1.35 m above the
deck. It stands at the platform's back edge under the shelter roof, between the bench and the shelter post nearer
the rear ramp, facing the rails: you read it where you wait, and it is out of the aisle and the train's clearance.
It has no collider, so it can't trap anyone or block the railway bot. The Home island (`?home=b`) has one display
for both edges, in the middle of the deck between the canopy posts, facing the head ramp you come up, with both its
stops ringed. The mast carries only the signal arm (and, on an island edge, its destination plaque). Each face draws
**the island's railway as a map**:
both lines along their real track (simplified to 1.5 m, so the curves read), line 1 gold and line 2 teal, every
station dotted and named (Village, Camp, Quarry, Far Head, Pier), unlaid track dashed and its station dim (line 2's
pier stretch until Q6 is laid), this halt ringed in red, and both trains as small markers gliding at their live
positions. The face is turned for whoever stands in front of it: what lies beyond the display is up the map and
their right is its right, so geography stays true and the names stay upright. Each face places its own names: every
name takes the side of its stop that keeps it off the other names, the face's edge, every ring and a train standing
at a stop, and as far as it can off the track (a unit test checks every display, both layouts, at every stage below). While a train is heading to a ringed
stop that ring blinks; under reduced motion the ring stays lit and the markers step once
a second. Line 2's wagon rides with its train (no marker of its own); the shunter isn't shown. **The map grows with line 2** (ring-island build 1, calls 66-70; owner, 11 November: names "Yes, smaller is fine" and Ring
Island "From the Pier laid"). Until the Pier is laid it is as above, line 2 ending at the dim Pier. When Q6 lays the
Pier every display refits to the whole of line 2 at true scale: the 465 m sea line runs on, dashed, to Ring Island
(dim, named) and every mark (track, dots, rings, names, train markers) shrinks to 0.7 of the early map's, a name about
18 px on the 256 px face, so the crossing fits and the island keeps its true shape. There is no Railhead dot or name
until Q7 is laid; from then it is a lit, named stop at the end of the solid track, and it moves out one bent at a time
(one redraw per bent footed, no animation) while the dashed line to Ring Island shortens, so every display shows how far
the line has got. Until Q7 completes the solid track ends at the Pier. When the rivet is struck the line is solid to
Ring Island and its name lights; the Railhead stays where the last bent put it. Halts only stand once
trains run, so there is no "before trains" board. Standing in front of it the names read, on a phone too (in
portrait at 1.5 m the face is wider than the screen; a step back shows it whole). At a halt the display is not seen
from far off, so the signal arm is the cue from a distance. Built from `src/render/island-map.ts` (shared with the
Home hall's board) in `src/entities/railway/island-boards.ts`: every face is a 320 × 256 cell of one canvas atlas
(1280 × 512, about 3.5 MB with mipmaps) drawn once and again only when line 2's stage changes (the Pier laid, Q7, each bent, the rivet); the trains and the blinking
rings are two instanced quad meshes over the faces, so a moving train never redraws a texture. One draw per display
in view plus two for all the markers and rings. Local over accepted train state. Not tested on a device.

**Signs at the stations and racks** (owner, 9 November: signs in the world before hovering text; the second pass after
the halts). The station bills, the depot rack's stock count, the rails shelf's count and the cart's service tag were
labels hanging in the air, turned to the camera. Each is now a painted board in a timber frame on its own post or
posts, fixed in place (`src/render/sign-board.ts`): face, frame and posts are one mesh in one material, so each sign is
one draw, as each label was, and casts no shadow, like the village's stake boards. Both faces carry the paint. Their
words are unchanged.
- **A station's bill** ("Station 2", "logs 0/24  rails 0/12"; "Pull the lever / switch to start" when a gated frame is
  full) is ink on a cream 2.2 × 1.1 m board on two posts, its bottom 1.5 m up, at the frame's far end, facing along
  the line, so it reads over the low frame as you walk up past the depot rack. T3's still stands 4 m out beside its
  pile. The forge's first bill (F1) stands on its posts 1.3 m in front of the frontage, facing out, instead of above
  the wall tops (not yet looked at in game). Q5's bill is no longer lifted over the sea-gate lamp cap: it no longer
  sits where the lamp post crossed it.
- **The depot rack's board** (log glyph and count; the train drawing on a train-fed stretch) is a dark 1.3 × 0.65 m
  board on one post beside the rack, facing its open log ends and the approach; it replaces the rack's old bare sign
  post. A nudge rocks the post once in the board's plane instead of bobbing the label; the steam puff is unchanged.
- **The rails shelf's board** is the same board beside the shelf's end, facing along the line.
- **The cart's service tag** ("Loading", "On the way", "Unloading" or "Waiting for forge" in its colour, "More coming"
  under it) is a dark 1.6 × 0.7 m board on a post at the rack's other side, facing the same way as the rack's board,
  instead of a 6 m label 4.8 m above the rack. It is read at the rack, not from afar.
Not tested on a device.

## Ancient technology (round 4, exploring)

The glider's sea-gate cinematic waits until the player dismisses the reward reveal and any queued reward cards. The shared unlock, gate state, save and broadcast still happen immediately; only the local camera waits. Reset cancels a pending cinematic.
**Quarry route continuity (5 November, solo design pass topic 3).** A 40 m strip of graded earth follows the authored railway through the switch gate, with paired alignment stakes at 8 m and 16 m on each side. It remains earth before delivery: no rails, rail collider, station-cost or lever-reach change. Local scenery explains what the gate blocks.

The platforms remain visible from the start. Warm stone bodies, pale landing caps and brass corner keys match the island stone and device brass; the existing hook rings and teal undersides identify puzzle surfaces. The relief shares each pad's existing draw call. Device shafts use 0.1 opacity instead of 0.32, keeping a quiet distant cue in the spawn view. The tower nook's red cloth was a screen in front of its cosmetic crate, not a finish/checkpoint flag; it is removed so the crate and hook ring explain the side trip. These material changes are Local presentation; the optional double-jump course below replaces the first pillar's old reward ledge. Serves DESIGN.md 7 and 11.

The jump rings track the animated calf pivots, including during a running jump. The first pillar's approach lip sits 4 cm below its landing top, avoiding overlapping coplanar faces. The sea-stack secret has a return hook slab beside the trestle, within 24 m of the stack; the hook returns you to rail height so leaving does not require a swim. Recovery selects existing track surface colliders, including stubs, rather than treating an open line's unfinished pier as built.

Course landings and the lower return clear intersecting tree crowns while retaining harvest IDs. The alcove catwalk and its goggles box sit at local `(-40, -80.5)`, clear of the cliff and trestle, with the original bank approach outside its footprint so the slab cannot mask the hook ring. Height, hook access and the jump puzzle's gaps are unchanged. Needle Bell has one summit deck; the older overlapping lookout floor is removed.

Numbers and places: `src/place/tech-layout.ts`. Research: [movement abilities](../research/movement-abilities.md), [BotW glide target](../research/botw-glide-target.md). Connecting a line gets you to where a device is; you still go and take it (**Take it**, Interact). Devices are one family: a stone drum, turning rings of teal light and a thin teal shaft you can see across the place. All three are shared; what you wear for them shows (rings at the ankles, a spool on the forearm, a pack).

The worn equipment uses the same pure builders and attachment transforms as [Buddy's asset stage](asset-stage.md). Chunky teal bands sit close around the ankle above the foot dome and follow the calf through motion (deep leg folds still produce body intersections); a brass/teal spool sits outside the right forearm on a cuff. The glider folds into a cream roll with teal panels and its brass bar. Without the frame it sits between the shoulders; with the frame the smaller roll is tucked against the underside of the shallow cradle, visible under a full load. It disappears while the canopy is open. The open frame shares the existing bone-driven load socket: narrow rounded straps curve over the shoulders and tuck under the arms with small toggles; its shelf seats a more compact log bundle. Short grey rails with broad flanges lie crosswise in shallow rows in the cradle instead of hiding the head, and stone is seated closer to the body. Full logs still cover the lower edge of the head from behind. All of this is presentation: capacities, costs, unlocks, saves and presence fields are unchanged. Known limitation: partners see the existing shared frame/cargo presentation, but not the rings, spool or folded glider; `moves-view.ts` still owns only one local set of worn technology meshes.

1. **A second jump.** On a pillar beside the first path's deck, seen from the footbridge on your first walk, with a stone lip reaching for where the trestle will go. Taking it unlocks the move; dismissing the reveal never jumps for you. Press Jump in the air: at least 6.8 m/s up, once per take-off, back when you stand on something, and it turns you towards the stick. Near its top it floats at half gravity, held or not, and that float never adds to a still-rising first jump's own, so holding Jump always tops out (fixed 10 November: the two stacked into no gravity, and a held double jump climbed for good). Its old single higher ledge is now a eight-hop optional course folding west and south: eight 6 × 6 m warm stone blocks, level with the device, separated by 10 m clear gaps. Run, jump and jump again to reach the next broad landing. The existing lamp-cap box waits on the final block; its secret ID, personal ownership and missed-prize delivery remain unchanged. A dry stone ribbon 3.4 m below catches missed jumps, with a lower return walkway and a ramp to the starting pillar. The main route stays open beside it; ability acquisition and subsequent unlocks are unchanged. The short-course pacing target is 20–40 seconds for a competent player, to be judged in play. Serves DESIGN.md 3 (Side activities are never required), 10 (Slapstick over precision) and 11 (Show, don't tell); layout and recovery geometry are shared with the checks through `JUMP_COURSE` and `JUMP_RECOVERY` in `tech-layout.ts`.
2. **The hook shot** (RB, F, or the touch button). On a second pillar beside line 2 over the stem, 2.2 m above the deck, so it takes two jumps. Taking it pulls you across to the first slab, onto a box. A press pulls you to the ring nearest the middle of the view: 24 m, 25 degrees, 16 m/s, one press, no aim needed beyond that. Same ring everywhere: brass until you've got the hook, teal in range, bright when it's the pick. Jump, Back or the button lets go. The button's glyph shows on the ring for your first three pulls.
3. **The glider** (LB, Q, or the touch button: a toggle). On Far Head's broad landing at local `(367, -169)`, reached by a six-metre-wide walkable ramp after the existing 24-log/24-rail sea crossing. The landing is eight metres above the new track, giving an immediate short glide onto the route home. Pickup requires the crossing complete; no elapsed-time gate. Jump and hook keep their existing placements. Toggle in the air: 10 m/s at full stick, 3.2 m/s down moving or not, 18 m/s² up to speed, 12 m/s² stopping when you let go, heading up to 360 degrees a second, opening in 0.1 s from any fall, closing keeps your velocity. It never gives height back and has no boost. Landing, water or sitting closes it. The camera eases to Breath of the Wild's normal framing, 5.2 m and 50 degrees (`&glidecam=pull` or `off` to compare). The glyph shows under you if you're falling with it shut, until you've flown twice.

**Two gates on the line, both slabs across the track bed.** You can walk round one; the machine can't. Its frame stocks logs and rails while the slab is up, and waits for the pull before laying. _The quarry:_ a chain runs from the slab up to a lever on a ledge 2.2 m high, banded in the devices' teal (**Pull**). _The rim, before the sea:_ dark posts lead from the slab back to the tower. A separate summit switch (**Pull**) sends light down them and drops the slab, without granting the glider. The same hook rings provide the return descent. Building the sea crossing then reaches the glider; its reward is dismissed before the immediate glide home, and the distant-island reveal remains later at the pier. The `solo-input-hud` branch owns reward/camera sequencing; this change removes the gate/pickup coupling without duplicating its queue. Optional balcony and sea-stack routes remain accessible after earning the glider, with their existing missed-prize rules. The owner's 21–24 minute range is diagnostic only; no bill, movement speed or delay was added to meet it.

The first accepted summit Pull opens the sea gate immediately, even before Q4 (owner, 8 November; [puzzle order](../brainstorms/puzzle-order.md), suggestion 1). There is no jam or refusal line. The teal handle pivots at the drum's axle and pulls down toward the summit approach, holding that pose after reload. The server still checks the summit position; Q5 can take materials and fund only when it is the active stretch after Q4. This remains true with gated filling: a closed gate may hold an active frame's construction, but never permits deliveries to an inactive stretch. Existing saved sea flags remain valid; no saved shape or namespace changes.

The summit switch and the quarry lever each queue a 3.2-second Local camera move toward their gate, using Place's shared celebration pull-out and the railway's reward-card queue. It is a shared moment (owner, 10 November, "shared moments play for everyone"; `src/entities/railway/shared-moment.ts`): the puller's page plays it from the predicted pull, every other page in the room, near or far, as the server confirms it, and a reload or late join never replays it. The move waits until all reward cards are dismissed and blends back to the ordinary camera behind Buddy. Nothing ends it by accident (owner, 9 November): keys, clicks, taps, the wheel, the mouse, pad buttons and sticks leave it playing, and Buddy still moves underneath. From 0.8 s until it starts back, Interact's glyph shows bottom centre in a sun-ringed chip with a blinking ▸▸ (on touch the Grab button lights instead), and that one press skips: the view turns behind Buddy and blends home in 0.14 s, and the press does nothing else. A reward card opening mid-move puts the move back in the queue to play whole after it. It is cancelled in a seat, by a view reset, or when the server refuses the pull. Reduced motion skips the camera move. Gate state, lights and handle motion never wait for a camera or reward card. The hook shot keeps aiming from the player's own follow camera while a move plays, so hooking back down the tower during or right after the summit move picks the ring Buddy faces (fixed 9 November: the pick had used the move's camera and found no ring).

**Both gates hang their slab from a headstock (9 November playtest: riding through the open quarry gate, "the top here disappears which looks weird").** Two beams of the jambs' stone lie across their tops, 5.9 m over the rail, with a slot between them and a sheave over each end of the slab. A chain runs from an eye at each end of the slab's top up through the slot and over its sheave. At the quarry both chains then run over the winch-side sheave and down to the lever's winch; at the sea gate each runs in to its half of a drum on the headstock. The chains are drawn from the slab, so when the slab sinks its links ride down with it and pay out over the sheaves, the sheaves and the winch's crank wheel (or the drum) turning by the same length, and the chain's end stays on the slab, down in its slot once open. Nothing ends in the air, open or closed, and a rebuild or late join poses it from the slab. The headstock is solid; when each gate opens, and the slab's and jambs' colliders, are unchanged. Clearances measured on line two's train (9 November): the engine's chimney tops out 2.07 m over the rail and 0.99 m either side of the track's centre, the flatbeds 2.34 m (crates) and 1.7 m, a rider stands on a flatbed's deck at 0.70 m. Under the 5.9 m headstock that leaves about 3.2 m over a standing rider (allowing 2 m for Buddy and a hat) and 1.6 m over one jumping, and 1.1 m from the flatbeds to the hanging chains (2.77 m out). Sized for an engine up to 1.5 times today's height and width (owner, 9 November, undecided): its chimney would clear by 3.8 / 3.3 / 2.8 m at 1, 1.25 and 1.5 times, a rider standing on its boiler top by 2.2 / 1.7 / 1.3 m, and it would pass the chains by 1.8 / 1.5 / 1.3 m, so the jambs stay where they are. Only a rider jumping off a 1.5-times engine's boiler would bump the headstock. Local view over accepted `gateOpen`/`seaOpen` (`src/entities/railway/gate-rig.ts`); the frame is one draw with the jambs, the wheels one instanced draw, the links one. Not tested on a device.

Both sealed gates have paired stone leaves, recessed courses, pale edge strips and a brass circular seal over dim teal. The relief is merged into the existing face mesh, with a faint fill in shadow; no additional draw or light.

**Secrets**, each a cosmetic that comes only from its own place, outside the boxes' odds and order, with no shaft over it: _village:_ a yard behind a cottage, past the washing line (walk), a balcony on a column under a canopy-shaped vane (glide). _Timber:_ the final block of the first device's optional course (eight double jumps), a shelf by the lookout with a scarf on a branch (two jumps), a bell you hear from the footbridge, on the far bank (walk), a catwalk under the trestle (hook). _Tower:_ the first slab (hook), a side slab with a visible crate and ring (hook). _Quarry:_ up on the low rock (hook). _Far Head:_ a sea stack with a flag off the trestle (glide). **Missed prizes** turn up as boxes at the **finders' bay**, in the village across the path from the wardrobe, once you've gone on past: village and timber walks with the hook, the rest with the glider, trains or the end. Open either box and the other goes. The bay shows them under sheets until they're yours; you change what you wear from Pause.

**Shared:** `job.tech` and `job.gate`, so the save and the `&coop=1` snapshot have them, and `coop.tech` says so at once: a partner gets the ability and a small cue where they stand, and a newcomer inherits it. Physics is Owner; presence `placeMove` carries mode, ring and a puff count, so a partner sees the wing, the cable and the puff. Finds are personal.

**Reach:** `node dev/economy/place-level.ts` checks what each state of the run can stand on, and that nothing is reachable early. Known harmless skip: riding the machine across the stem as it lays gets you up onto the second pillar with one jump. The second device is still there on your way.

## Carried-resource display

**Pack steel (8 November).** With the pack, carried rails stand in two banks on its shelf beside the log bundle,
leaving both materials readable from behind and the side. Without it, the existing crosswise hold stays.
The same seating and independent steel count apply to the player and friends as they take and deposit;
capacity, accepted inventory and deposit rules are unchanged. DESIGN.md **11. Show, don't tell**.

**Approach feedback (5 November, solo design pass topic 10).** Tower secret chests stand 1 m higher on plinths, with the nook chest shifted toward the preceding platform and clear of its central landing. The shop highlights the selected hanger; both wardrobe interactions preview the next owned item's existing name or “Take it off”. Draft composite wording for owner review: `Swap [slot]: [existing item name / Take it off]`. No Boogler lines are changed. Only a newly filled log UI cell pulses 1 → 1.12 → 1 over 0.16 s; reduced motion retains the fill/count response without a pulse. No avatar or collider scales, and no axe placement changes.

Owner approved 4 November, following [the carried-tag look brief](../brainstorms/carried-tag-look.md), "Four rows of 4". Buddy's worn load is the continuous display. Place replaces the bottom-centre haul pill with a background-free block beside the load: four columns, two rows at capacity 8 and four with the frame at capacity 16. Cells are 19 px square with 3 px gaps, a 2.5 px dark border and a soft 2 px drop shadow. Empty cells stay translucent cream (`#fff3e099`); filled cells use logs `#c98a4b`, blue rails `#579fbc` and grey-violet stone `#a49bad`, in that fixed order. "Full" appears only when the last cell fills. Beam and boiler retain their icon and name, without slots or a background. Text uses the display font with a thick dark outline. Classic Haul and its variants keep their existing chip.

Pickup, Drop (right click, pad R3, touch Drop), deposit, restored contents and capacity changes refresh the same tag for **2 seconds**, followed by a **200 ms opacity fade**. Newly landed slots pop over **200 ms**, scaling from 0.6 through 1.2 to 1, with a **35 ms minimum stagger**. Rapid pickups extend the cascade without restarting finished cells. Drops and deposits empty cells without a flourish. A full-capacity refusal refreshes it; a selected capacity-blocked source keeps it readable. Quiet walking, including with a full load, lets it fade. Empty briefly shows the empty grid. Pause's main surface always provides exact carried contents and capacity.

Slots wait for the readout's landed materials; incoming pieces and reserved harvest do not fill cells early. Accepted tree logs already belong to the player while their cosmetic flight plays, matching the owner's inventory semantics; a Local flight handle delays their cell fill until landing and also handles cancelled flights. Pause retains the accepted exact counts and distinguishes incoming from reserved. Deposits remove pieces as they leave; the frame's own bill still changes as they land. No inventory, cost, capacity, presence, wire or save behavior changes.

Projection runs after the current camera/avatar update, anchored to a stable body/load envelope with 16 px clearance. Side choice persists until it no longer fits. The big cargo's bounds extend the avoidance envelope. Close/behind-camera and edge cases dock instead of clipping. Narrow portrait uses a safe-area upper-left lane, 16 px below the actual roster, clear of Drop and Ping. The tag is read-only; cell transforms never change its measured box, and the Full line reserves its height. Reduced motion fills slots immediately on landing, with no pop or stagger.

**What's new:** Slots pop as pieces land beside your load, with empty cells showing capacity, then fade out of the way.
**Playtest question:** Does watching the slots fill feel satisfying, and can you tell how much room you have left at a glance?

## Readable ink and rewards

Camera-facing labels divide linear RGB by the shared
**surfaceExposure** in `render/exposure.ts`. There is no separate 10.9195 multiplier. Crystal and gold pickup glints,
chest/box sparkles, reward-show sparkles, confetti and celebration fireworks use the same policy in the existing
particle pool, and since 10 November so do the sea's splash droplets (`src/render/splash.ts`; at intensity one they
drew dark grey on the lit sea). Dust, smoke, steam, cloth puffs and already-HDR impact stars retain intensity one.
Alpha, soft edges, fade/shrink, fog, depth occlusion and underwater attenuation are preserved; other routes retain
their original brightness. This is Local presentation, with no shared state or save change.

Implements recommendations 1 and 3 of `docs/research/dark-unlit-exposure.md`, joined to the owner's fixed-exposure
decision on 5 November. Compensation follows the authored surface gain in Dev and production; the explicit
underwater fog remains intentional. No scene/meter dependency or CPU GPU readback is introduced.
The material helper applies at most once per owned material. Sky and water settings are unchanged.
Serves **DESIGN.md 7, Telegraph everything**.

**Remote names (5 November, approved follow-up).** Player-name sprites use that same full surface-gain
compensation once, at `avatars.makeLabel`, matching station labels. The existing sRGB name canvas,
translucent backing, alpha, fog, depth and underwater composite remain.
Names are Local presentation, with no identity, presence or save change. The three-way main/.12-before/.12-after
readability comparison is in [colour defaults](../research/color-defaults.md#remote-name-follow-up).

The existing Dev Water/Post **fixed gain** control owns both exposure and inverse compensation;
`readable.referenceGain` is retired. Newly emitted reward particles pick up changes immediately;
living particles retain their spawn intensity until they expire. Smoke, dust and the pool's default intensity
are not compensated. No call site applies both the material helper and particle intensity.

**Glows, devices and markers (6 November).** The owner saw the jump device's teal gimbal render near-black
teal in daylight: unlit and emissive colours authored at display range were still multiplied by the 0.12 surface
gain, and the classic island's glows joined that gain when it became part of the one world. The same policy now
covers them. `readableUnlit` applies to the jump device glyph and beacon, path lanterns, `softGlow` (reward beams,
gift glows, train lamp beams, museum haze), work-site rings, the throw preview, ping rings, honk notes and
sparkles, gift and Boogler sprites, the off lighthouse lamp and cave glow stones. `readableGlow` divides only the
emission of lit glows (tech devices and apron band, crystals, the far shard, museum specimen, hook cable, forge,
workshop and loco fires, gold finds, Boogler orb/pops, cave pond); their albedo still takes scene light and live
`emissiveIntensity` changes still apply. Shaded-face fills (Buddy's colour fill, slab faces, room fill), airborne
and classic clouds, fish, contact blobs, already-HDR impact stars, dust and smoke are unchanged. Local
presentation only. Matched default-game stills: the gimbal went from sRGB 0,85,71 (the owner's screenshot reads
34,84,72) to 26,226,193 against authored #39e6c6, with the lit pillar top unchanged; work-site rings, cave glow
stones and the path lantern read in their authored colours. The far shard barely changes, since its sunlit albedo
dominates. Frozen stills only; not tested on a device.

**Railway rewards and line two (6 November playtest follow-up).** The production railway's T1/T2 boxes had copied
Place's box sparkles, confetti and opening dust without the reward intensity, so the conductor's hat burst drew at
the 0.12 gain: confetti measured sRGB 93,13,3 (red), 3,81,33 (green), 2,61,94 (blue). Every reward celebration
now comes from `render/reward-particles.ts`, which applies the inverse gain itself (Place gifts, the railway
boxes and the reveal's sparkle); the same burst reads 239,63,60, 56,213,109 and 35,131,240 against authored
#ff4f4f, #4fdc7a and #2f8cff. Line two's hook device and winch drive now use `readableUnlit` / `readableGlow`
like their Place originals: the hook gimbal went from 0,85,71 to 26,226,193, the jump device's value. Taking the hook device shows "You got the hook shot" through the
railway's one reveal queue, as the jump device does; before, it played only a sound. Box landing dust stays
ordinary contact dust. Frozen stills only; not tested on a device.

**Owner colour defaults (5 November, for now).** Real-sea Place and crossing use surface gain **0.12**, retained
underwater **+0.81 EV** (removed with Ultra on 10 November), key gain **1.12** and fill gain **3.2**. Place's grass pigment strength is **0.35** and
its albedo gain **0.7**. Selective green/timber/accent adjustments, the building instance palette and Buddy's
albedo-only saturation adjustment reproduce round five's pick at their material owners.
Production opening buildings, forge scaffold and source trees use those same material owners. Tapered gable
instances receive palette updates through the same piece-index routing as their transforms. The 5 November
repair restores the treatment omitted by the production extraction; it does not retune the sky, lights or exposure.
Physical painted boards and the shop price atlas use roughness-1, metalness-0 `MeshStandardNodeMaterial`,
the same sRGB canvas textures, scene lights and received shadows; no emissive floor or inverse-gain compensation.
Indoor paper is greyer than the former unlit paper. Sprite labels and rewards keep readableUnlit exactly once.
There is no `colourCase` route, restored research fork board or alternate preview path. TIMBER CAMP/QUARRY fork
signs stay retired. No copy, gameplay, shared state, save, water or sky parameter changes accompany this choice.

## The town you can go into

Nell stands clear of the station-whistle stand's approach. Previously her closer Talk target won over Try on from the aisle; the whistle's equip/keep/remove state worked when approached from the side. Its train unlock remains unchanged, and this fix does not change wearable geometry.

Corner posts sink with whichever adjacent wall is cut away, using the same reveal timing and easing. Roof lift, the retained bottom course, wall collisions and shadow proxies are unchanged.

An optional side activity: nothing here gates the job (DESIGN.md 3), and it adds no line to the objective. Serves DESIGN.md 1, 6, 9 and 11; research: [town interiors](../research/town-interiors.md). Open doors, in the same world, no loading.

**The house** stands from the start, by the spawn. **Pip**, the first resident, stamps a leaf the size of a tray at a very tidy desk beside an ordinary mug: "I just moved in here for the jobs." A bed, a very senior chair, a stove, a board that says JOBS, none yet. As the town grows, Pip's desk changes: a model of your bridge, a rail for a paperweight, a toy train and a suitcase, a second mug.

The room dressing stays on existing furniture footprints: a folded quilt, reading lamp, drawer pulls and kettle at home; folded cloth, hangers and a panelled counter in Fine Prices; brass-edged display cabinetry, reflector dishes and bench cushions in the museum. The shop's striped awning has a scalloped edge. Furniture shares one rough material with restrained ambient fill, and town walls retain their instanced construction mesh. This is visual dressing only: solids, prices, objectives and dialogue are unchanged.

Work and festival overalls have a fitted low waist, curved front/back bibs, open sides, shoulder straps and one small pocket. Festival overalls use pink cloth with brass buttons; the blue/green front blocks and contrasting yellow panels are gone. The raincoat retains its continuous hem, collar and pockets. They use a shared matte cloth material on the existing Buddy attachment. The pack's reward model and worn silhouette share an open timber frame, shoulder straps, buckles and a low canvas cradle. It uses the load's back socket with no extra stand-off, so logs remain visible inside the frame. Capacity and unlocks are unchanged.

**The shop, Fine Prices,** and **the museum** rise when the first path opens, each with a board on its plot till then (Fine Prices, coming soon; A museum, once there is something to show). You can tell them by their shape: an awning, a table of goods and a big tag; columns, a pediment and a sliver of blue through the door.

**Fine Prices.** Button the clerk, and Nell, who's been saving for eleven years. Five things on stands, none from a box: a paper work hat, a very large button, a sandwich board, then a very tall hat after the forge and a station master's whistle after the trains (under a sheet till then). Each tag has a real price, $8,000,000 to $3,000,000,000 **plus $1,000 for each dollar on your counter**, so it climbs as you earn, and says TODAY: $0 under it. Nothing touches the money. **Try on** (it's on you), **Take it: $0** (it's yours; a shop item doesn't count towards what the next box is), then **Wear it** or **Take it off**. The rail at the back swaps anything you own, boxes' finds too (`swapSlot`). Walk out still trying something on and it's yours anyway: Button shouts after you.

**The museum.** Moss the curator, and Wren, who has opinions. A stone split in two and shown side by side in a dark alcove: rough rock, bands of agate, a cave of blue crystal with light going slowly up through it, a shard in the gap. A table with the whole place on it at 1:120, from the land's own heights: every building standing or going up (scaled up so you can see a village), the track as far as it's laid, the machine and trains moving, trees still standing, the village's people, an orange pin for you. Nothing here is collected.

**Talking** is the shared talk input (`src/player/conversation.ts`); each has their own babble. First meeting, then the newest change in the town you haven't heard about from them, then an ordinary line in turn. **The Boogler?** is always an answer, and gives a rumour: a prophet, a mystic, powers. They contradict each other, nothing confirms any, and only the prices hint at what's coming. They also say a line out loud in a bubble without being asked: hello the first time you walk in, what's changed when you walk in after, and now and then someone in the street, about the newest change or a rumour (70-120 s apart, in the village only, and only someone you can see). Every word is in `town-lines.ts`, as drafts for the writing pass.

**The camera indoors** is still yours. The roof lifts away and any wall on the camera's side sinks to its bottom course over 0.24 s, for you alone; a shadow proxy keeps the room shaded and the walls stay solid. The arm ignores the cut-away walls (`ROOM_GROUP`) and still minds furniture and everything else. The pitch eases to -0.4 as you come in and any look of yours ends that; it goes back on the way out only if you never touched it. They come back once the camera's 1.8 m clear of the building. Numbers: `ROOM_CAM` (`rooms.ts`).

**Two players:** which buildings stand, and everything in the miniature, come from what's shared; cameras, cutaways, talks, what you've heard and what you've taken are your own. Nobody can spend anybody's money, since nobody spends any. In the live game a partner sees what you wear and what you're trying on (the wardrobe); in `?proto=place` only with `&coop=1`.

**In the live game (9 November 2026, place-retirement T1).** boogle.club has the town entity (`src/entities/town/`): the house, with the same cutaway, indoor camera and Pip's desk, and the shop's and museum's plots with their stake boards. The shop and museum stay boards until T3 and T5 open them on the first path; nobody lives in the house yet (T2 brings the residents). The town's facts are pure reads of the shared railway (`src/sim/town-facts.ts`): **path** when T3 is laid, **forge** when the forge is lit, **depot** at Q1, **head** at Q5 (Far Head), **trains** when the trains run, **pier** at Q6. **town** and **stone**, the cargo-built rows, stay false until train cargo arrives in production-core slice 5. Pip's desk follows path, forge and trains. The village sign and its walkers count 12 people, +8 when the path opens, +6 at Far Head and +6 at the pier (32). `?proto=place` mounts the same rooms and house through `place-rooms.ts` until it is deleted.

**Fine Prices in the live game (9 November 2026, place-retirement T5).** The shop rises for everyone when the first path opens (T3 laid), in place of its stake board; the museum keeps its board until T3's job. Inside it is Place's shop (`createShop` in `shop.ts`, mounted by the town entity): the same five stands, tags, counter and rail, and the same words. Each tag's list price is its real number plus $1,000 for each point of the shared score, and every tag says TODAY: $0; nothing is charged (the shop stays free until the shared wallet ships, 6 November). **Try on** puts it on you, and partners see it; **Take it: $0** makes it yours, with the "You got" card through the railway's one reveal queue; then **Wear it** or **Take it off**. The rail at the back swaps a hat, accessory or outfit you own (the stowaway goes with C2). Walk out still trying something on and it's yours anyway, card included. What you take is saved in your wardrobe, so it's still yours after a reload, and what you wear is shown to others. The very tall hat waits under its sheet for the forge, the whistle for the trains. Button says his lines when you take something and when you run out with it, through the residents (T2). Playtest marks `shop tried on`, `shop kept` and `shop swapped` are railway beats.

**Residents in the live game (9 November 2026, place-retirement T2).** Pip, Button, Nell, Moss and Wren stand in their rooms on boogle.club and talk as they do in Place (`residents.ts`, every word still in `town-lines.ts`). Pip is there from the start, Button and Nell once the shop opens on the first path, Moss and Wren when the museum opens (T3): a resident is drawn and offers **Talk** only near a building that stands. Each notices the newest town fact once per player, at a talk or as a bark when you walk in; the street's walkers bark the newest fact and, every 70-120 s, a rumour. Barks and the talk card are Local. What they told you (met, noticed, said, rumours, hello, street) is Personal Local, kept in `boogle.railway-town.v0:<railway room>:<pid>` (`src/entities/town/memory.ts`): it survives a reload and a world bump clears it. They hold their tongue while a conversation or a reward reveal is up, except for a line said straight to you: Button's when you take something comes with its own "You got" card. Production keeps Sleeves at the shore; Place's shore worker lives on in `shore-worker.ts` until Place is deleted. Playdata records `entered building …`, `talked to resident`, `rumour heard`, `rumour overheard` and `resident noticed`. To keep the town inside the phone's draw budget, stake boards are now one textured mesh with no shadow of their own, and a room's interior draws only while the camera is within 34 m of it (or you're inside), what's outside and over its door within 60 m (`ROOM_CAM`). At the bench's `town` view that is 228 → 218 draw calls on desktop and 136 → 126 on the phone profile, +8 over the village before the town; the residents add none (they're in the village's instanced folk).

**The museum in the live game (9 November 2026, place-retirement T3).** The museum rises for everyone when the first path opens (T3 laid), in place of its board, with Moss and Wren inside. It is Place's museum (`createMuseum` in `museum.ts`, mounted by the town entity): the split stone with its slow light and turning shard, the plaques, and the 1:120 table. In the live game the table reads the shared railway: the opening village and the town's three buildings, line 1's track by completed station plus the stubs at the camp and the village, line 2's by completed station from the turntable, the trees still standing (the great tree drawn bigger), the forge glowing once it's lit, the machine and, once they run, the trains, the village's people and an orange pin for you. Trees, the machine and the trains are sampled twice a second, and only while the interior draws, so a stretch being laid shows when its station completes, not while the machine is on it. The interior draws only within 34 m of the camera (`ROOM_CAM.drawWithin`). At the bench's `town` view the museum costs nothing (221 draw calls before and after on a fresh world; 279 → 278 at `q1-done`, where it stands); 18 m from it, inside the 34 m, its interior adds 23 (312 → 335).

### The wardrobe in the live game (9 November 2026, place-retirement T4)

One personal wardrobe holds every wearable in the live game: the T1 conductor's hat and T2 scarf now, and later the
shop's stock (T5), station boxes (C1) and secrets (F2). The catalog (names, lines, shapes, tiers, odds and fits) moved
verbatim to `src/render/cosmetic-parts.ts`; Place's `gifts.ts` reads the same one.

- **What you own** is yours alone and saved in this browser for this world (`boogle.railway-wardrobe.v0:<rail
  room>:<pid>`). A world bump clears it, as it clears your claims. A malformed save starts empty.
- **What you wear** is one thing per slot (hat, accessory, outfit), drawn on you and on every partner who can see you,
  including what you're trying on. Each item sits where Place put it: the conductor's hat on the Head bone, other hats
  on the head's centre, scarves at the neck, outfits on the chest. A partner who leaves takes their clothes with them.
- **The T1 hat and T2 scarf** are worn as they arrive, when their reveal card is put away. A claim from an earlier
  visit is put on the first time the wardrobe hears of it; after that, what you wear is the wardrobe's.
- **Try on, keep, wear, take off and swap** behave as in Place (`src/entities/wardrobe/state.ts`). Fine Prices (T5)
  uses them; the curio shelf (C1) brings the rest.

**Dressing from Pause (10 November).** Pause's You page (`src/entities/wardrobe/menu.ts`, [pause.md](pause.md)) steps each slot with `cycleSlot(slot, dir)`: what you own in catalog order with Nothing at the left end, wrapping both ways, applied at once. The curio shelf's and the finders' bay's Swap prompts are gone; they are display only.

Sync: ownership is Personal Local; what you wear is Owner presence `wardrobe` (`{ hat?, accessory?, outfit? }`, catalog
ids only, null when nothing is on). It replaced `railwayCosmetic` and `railwayScarf`. No `WORLD_NS` change.

### Station boxes and the curio shelf in the live game (9 November 2026, place-retirement C1)

- **Station boxes.** Every stretch whose catalog row hands a crate down leaves one personal box once it's laid: Q2, Q3,
  Q4, Q5 and Q6, as in Place (T1 and T2 are the hat and scarf claims; T3 and Q1 never had one). Their tiers are Place's
  order: Rare, Common, Rare, Common, Wonder. Each stands on solid ground by the next stretch's frame, by Place's
  `handCrate` search, but across the track from it: the frame's own side has its depot rack, and a box beside the
  rack took its "Take" press. Q6's, whose stretch ends on the pier, stands across from its own frame, out of the sea.
  Laid while you watch, it flies down from the machine's flatbed.
- **Your own roll** (owner question 3; design review finding 6). Each player opens their own box from the same shared
  stretch and rolls their own gift, so friends get different things. The rules are Place's: a Wonder by the third box
  (the Q2 box, if you have no Wonder yet), an outfit fourth if you've none, never more than five without a Wonder; no
  repeats, no finds, and never the hat or scarf.
- **Opening.** Walk into it (1.25 m) or press "Open the crate". The box is recorded as opened, with what's in it and
  the run without a Wonder, before the lid rattles, so a reload mid-reveal keeps it and can't roll again. The card
  goes through the railway's one reveal queue; when you put it away, it goes on you if its slot's empty, and on the
  shelf. Mark `crate opened`.
- **Late joiners and reloads** find an unopened box for every stretch already laid; an opened one is gone for you and
  still there for a partner who hasn't opened theirs.
- **The curio shelf** stands in the village by the forge, on its west wall line at (−91.6, 8.5), square to the street
  and facing west across it (10 November; `?home=b`: in the hall's front, facing the square): what you own of the boxes' gifts stands on
  it, the rest under dust sheets (and the two shapes that never come out of this run's boxes). A sheet comes off with a
  puff of cloth when a box's card is put away within 40 m. It is the display only: it has no prompts. You dress from Pause's
  You page (owner, 10 November; its four "Swap" prompts went). The stowaway's slot came with C2 (below); the finders' bay comes with F2.

Sync: Personal Local in the wardrobe store (`opened`, `dry`, `got`); eligibility is the server's accepted completion.
No new presence key, op or `WORLD_NS` change. Measured at the bench's town pose: 233 draw calls against 231 before.

### The stowaway in the live game (9 November 2026, place-retirement C2)

The stowaway (the pet slot's only gift, a Rare from a station box) is Place's follower. When its box's card is put
away it comes out beside you if the pet slot is empty, and hops along behind you and a little to the side, squashing as
it goes; on a moving deck (a train, the track layer), standing or seated on one of its stools, it sits on the deck
0.62 m to your right, hopping after you as you walk about the deck and beside your stool when you sit. It moves in
your frame, so the train carries it. It used to perch on your shoulder, but Buddy's head is wider than his shoulders
and it read as sitting on his head (owner, 10 November: "maybe on shoulder or just next to it on the
platform/surface"). Pause's You page, on its Pet row, puts it away and brings it back (it was "Swap pet" at the
curio shelf until 10 November); the shop's rail swaps only clothes. A reload keeps it out, or away. Partners see it follow you and sit beside you on a deck, and it goes
when you leave.

Sync: owning it is Personal Local in the wardrobe store, saved with what you wear (`worn.pet`). That it's out is Owner
presence `stowaway`, `{ riding: boolean }` (true on a moving deck or in one of its chairs), or null when it's away; the `wardrobe` presence
still carries only the clothes. Each tab animates its own copy of a partner's from that flag and their interpolated
avatar, so where it hops differs a little between tabs. No op or `WORLD_NS` change.
### Crystals in the live game (9 November 2026, place-retirement K1)

- **Seven crystals**, at Place's seven spots (a lookout, an arch, a river bank, the top of the ridge, behind the old
  kiln, by the old cart, the far table), the same blue as the far shard, turning and bobbing, with a sparkle now and
  then once you're within 40 m. Walk within 4.2 m (and 4 m of its height) and it comes to you, slowly then all at once
  in 0.34 s, and lands with a three-note chime and a burst. A dull stub on the curio shelf's bottom row lights up, in
  the order you found them. They do nothing yet, award nothing and gate nothing. Mark `crystal found`.
- **Yours** (owner question 2, 9 November: personal). Each player finds their own seven; a partner still sees theirs
  where you took yours. A crystal is saved the moment it starts to fly, so a reload mid-flight keeps it.
- **When pillars come** (open question 19's shared building crystals), these get a distinct name or look, or fold into
  them (place-retirement designer finding 4). Not now.
- **The curio shelf** (9 November): each gift stands on its board, and the top board is 16 cm higher than Place's, so
  the sheeted outfits no longer hang over the crystals' row.
- **Gold finds are cut** (owner, 9 November). F1 ported them with a finds board beside the shelf; both are gone. The
  crystals stay.

Sync: Personal Local, `boogle.railway-finds.v0:<railwayRoomId>:<pid>` (`crystals`; F2's `secrets` and `hubbed` share
the store; the cut gold finds' `finds` field is still parsed, unused), pruned by a world bump. No presence key, op or
`WORLD_NS` change.

### Secrets in the live game (9 November 2026, place-retirement F2)

As the designer fit check (9 November, [agent calls](../agent-calls.md)) set it:

- **Nine of Place's ten secrets** stand where Place had them (`tech-layout.ts`'s `SECRETS`), each a crate with a
  cosmetic only it gives, beside something that makes you look twice: laundry and a fence behind the cottage (yard),
  a scarf on a dead branch over the lookout shelf, a bell under a bracket you hear from the footbridge, the catwalk
  under the trestle (alcove, its ring facing the bridge), the tower's first slab (its east edge, out of the way back down) and its side nook (on plinths), a
  yellow block on the quarry's low rock (loft, its ring facing the camp), a weather vane on the village column
  (balcony) and an orange flag on Far Head's sea stack. Walk into a crate (1.25 m) or Open it (3.4 m across; at the
  bay, Open only), only up at its level: your feet no more than 0.6 m under its base, plus 0.3 m for each metre across,
  and no more than 2.2 m over it, so a crate on a ledge isn't offered from the ground beside the ledge (owner,
  10 November: the mossy scarf from the ground; `src/player/reach.ts`, Place's crates too). The station boxes'
  show and card play (one reveal queue, `src/render/crate-show.ts`), the gift is yours at once, and on you when you
  put the card away if its slot is empty. Cards are name-only: these gifts have no line. Mark `secret found`.
- **Not ported:** the jump course and its lamplighter's cap ("block") move to job E with the double jump; Place's Far
  Head glide pad and ramp are cut (glider B's device is on Needle Bell).
- **Abilities are production's:** the alcove, nook, loft and the way back up from the sea stack are hook rings after
  the climb's (`hook-path.ts` `HOOK_SIDE`); the lookout needs the double jump (its shelf raised to 20.0 m: a stone
  block you see from the first path and can't quite reach); the balcony needs the glider and its crate appears once
  the room has it (glider B, Needle Bell's summit). Two early ways in are accepted sequence breaks (designer,
  9 November): a drop from the plateau east of the alcove, and a double jump down from the stack-return slab onto the
  sea stack, whose crate therefore stands without the glider.
- **The finders' bay** stands across the square from the curio shelf, drawn with it (no draws of its own): on the
  shelf's centreline 16.3 m out at (−106.76, 18.88), facing 70° back at the hall, off the shore arrival and the street
  (owner, 10 November, "for now"; [curio placement](../plans/curio-shelves-placement.md)), in both layouts. The secrets'
  gifts under sheets until they're yours. A secret you went on past without turns up there as a second crate, in the
  order the abilities come: yard and bell with the hook; alcove and firstpull with the glider; nook and loft with the
  trains; the lookout once the double jump is yours and line 2 is complete; the balcony and the stack at the end of
  the run (line 2 complete). Open either crate and the other goes. Mark `secret at the hub`. The crates wait three by
  three in the bay's own frame, 1.5 to 3.7 m out and within ±1.1 m across, middle first; the jump trophy's plinth
  stands outermost, 5.3 m out on the bay's centreline at the street's edge. `test/curio-layout.test.ts` keeps the
  shelf, bay and plinth 2.5 m and the box block 3 m off every path centreline in both layouts.
- **Reach** (`npm run level-check`, Place's model): each secret is out of reach before its ability, except the two
  accepted sequence breaks above (the alcove from the plateau, the stack from stack-return), printed as facts.

Sync: Personal Local, the finds store's `secrets` and `hubbed`, each written the moment it changes. No presence key,
op or `WORLD_NS` change; a partner sees their own crates. Cost at the bench's `town` view: +7 draw calls (233 → 240).

## Departures from the brief

The machine doesn't come back by train: line 1 ends at the village, so it's already there, and a turntable hands it to line 2. The graybox turntable has a pale rim and paired dark rails within its existing disc footprint; collision and turning motion are unchanged.
Far Head and the extended grid aren't in `npm run level-check`, which doesn't know this land: `node dev/economy/place-level.ts` floods it from spawn at the player's slope limit and lists what's reachable in each state of the job.
Its cradle isn't solid, unlike the rest of it: a second shape on the flatbed's body made you fall through the deck (see below).
Most buildings are solid blocks you can't go inside; three you can (above).

## Measured

**Trees plus shipped rail cart, 4 November follow-up:** this supersedes the earlier tree-only
comparison below. Fresh main baseline was `37762c28`; while it ran, `origin/main` advanced to
`88c7c36b` with tooling/dependency changes only. The branch rebased onto that newer commit.
`git diff 37762c28 88c7c36b -- src dev/look` is empty: the measured main gameplay and bot are
identical to the rebase base. Installed the updated dependencies in this worktree.

| Beat                                    | Fresh main  | Rebased trees + cart |
| --------------------------------------- | ----------- | -------------------- |
| First path                              | 5:59.29     | 6:02.13              |
| Little guys / depot                     | 15:08.63    | 8:51.19              |
| **Path → little guys**                  | **9:09.34** | **2:49.06**          |
| Trains unlock                           | 24:19.33    | 18:01.81             |
| Pier / run ended                        | 27:09.04    | 20:51.53             |
| Entire bot, including the optional tour | 30:12.20    | 23:54.00             |

The hunger stretch loses **380.28 seconds (69%)**; **169.06 seconds (31%) remain**. First-path
time is effectively unchanged. The owner still needs to judge whether that remaining hauling
creates any desire for the little guys. No bills, carry quantities, forge rate, cart capacity,
cart speed, upgrade placement or tree yield were retuned. Both whole runs completed all expected
beats with zero runtime errors/water falls. Optional crystal/co-op marks were absent from the
after solo run. Both still waited **1:49 for Q5's second shipment**. Manifests:
[fresh main](../../.look/evidence/1793779930035-76662/evidence.json),
[rebased run](../../.look/evidence/1793781061236-48731/evidence.json).
Offline comparison: `npm run playthrough -- --compare .look/evidence/1793779930035-76662/run .look/evidence/1793781061236-48731/run`.

Q5 uses the existing real-input fixture at **1×**, unchanged 24-log/24-rail bill and starts:
solo at the forge; two-player strategies one at each end. Authority-clock seconds, one valid
trial per strategy. The split still manually loads 16 rails, carries nine, boards and dismounts
with actual input. It recorded zero lost-contact samples and reached the existing **13 m/s**.

| Q5 strategy |                                              Fresh main seconds |                                                 Rebased seconds |
| ----------- | --------------------------------------------------------------: | --------------------------------------------------------------: |
| Solo        | [73.74](../../.look/evidence/1793780071338-83449/evidence.json) | [73.78](../../.look/evidence/1793781272448-58229/evidence.json) |
| Two walkers |  [72.94](../../.look/evidence/1793780369968-3328/evidence.json) | [71.45](../../.look/evidence/1793781363546-62608/evidence.json) |
| Split       | [67.42](../../.look/evidence/1793780252718-95180/evidence.json) | [66.98](../../.look/evidence/1793781452107-65856/evidence.json) |

Split beat walkers by **4.47 seconds** and solo by **6.80 seconds** in the after trials. The
small before/after changes are within observed variation. This fixture sources logs from the
cart and does **not chop**, so it checks integration/strategy timing, not nearer-tree harvesting.

**Historical rebase proof, superseded for compatibility by the 5 November cleanup:** the rebase retained `placeRailCart`, `placeCartRide`, cart call/load/ride messages and automatic
rail waiting in the bot, within the `placeCoopTrees1` peer/message identity. Legacy beam grips
are now filtered by that identity too. Tree-capable peers missing a cart capability still get
the existing corresponding fallback; non-tree-version peers cannot alter this railway through
old messages or claimed cart/beam presence. Checks against the combined gameplay:

- [Tree co-op](../../.look/evidence/1793780766888-34935/evidence.json): finite final payout,
  duplicate receipt, pending-snapshot reservation, saves, both cart capabilities, old reset/chop/
  cart messages, and old-version ride/beam presence all passed.
- [Automatic cargo](../../.look/evidence/1793780784091-35405/evidence.json): both loaded 16 logs
  and 16 rails; a follower's pickup during an unload snapshot conserved 16 rails with no stale
  flight duplication.
- [Whole manual trip](../../.look/evidence/1793780986987-46094/evidence.json): follower whistled,
  loaded and rode; both reached 13 m/s, with zero rider-contact losses and 12 rails at both racks.
  Maximum sampled peer gap was 1.276 m / 0.35 m/s, within the existing fixture bounds.
- [Absent rail capability](../../.look/evidence/1793781558252-70669/evidence.json): both delivered
  16 logs / zero automatic rails. [Absent ride capability](../../.look/evidence/1793781619949-74526/evidence.json):
  both stayed at 9 m/s, lost no rider contact and delivered 12 rails.
- [world-inputs](../../.look/evidence/1793780762686-34768/evidence.json) passed. `npm run check`
  passed 293 tests, lint/typecheck, registry and build after installing main's dependencies.

Retained failures: the [first main walkers trial](../../.look/evidence/1793780156815-92379/evidence.json)
delivered in 68.48 s but failed world-clock health by about 3 s, so its timing is excluded above.
The [first manual-cart eval](../../.look/evidence/1793780856034-38596/evidence.json) timed out waiting
for the whistle target. A repeat passed without a gameplay change; its cause was not reproduced.
The fixture now prints target/position/cart state if that timeout returns. Initial check failures
were missing newly landed tooling dependencies and a fixture presence-spread type error; both
were resolved. No failures remain in the final selected runs.

Opened new PNGs: both full-bot end stills; main solo/split Q5 stills; rebased solo/walk/split Q5
stills; `rebased-tree-coop-still.png`; both `rebased-auto-rails-still.png` views; and both
`rebased-cart-trip-repeat-still.png` views. The Q5 board visibly reaches 24/24 logs and rails;
the rail shelf is empty after the conserved pickup while logs remain; the rider stays on the
unloaded cart deck in both trip views. The tree assertion view is obscured by neighbouring
crowns and does not establish felling quality. End stills contain debug overlays. Capture health
and numeric continuity passed; real-time feel/audio, device performance, actual old binaries and
the owner's hunger judgment remain unverified. Earlier tree-only stills/timings are historical.

**Earlier trees-only comparison, 4 November (historical):** broker runs on this worktree, compared with
`npm run playthrough -- --compare <before>/run <after>/run`.
The [before manifest](../../.look/evidence/1793776901007-75675/evidence.json) and
[after manifest](../../.look/evidence/1793778563313-67800/evidence.json) identify the tested trees;
both completed every expected beat. These are one run each, not human first-play times.

| Beat                                  | Before   | Universal ordinary trees + two hardwoods |
| ------------------------------------- | -------- | ---------------------------------------- |
| Equipped starter / awake              | 2:05     | 1:28                                     |
| First path                            | 6:38     | 6:02                                     |
| Awake → first path                    | 4:33     | 4:34                                     |
| Proper axe                            | 7:12     | 6:35                                     |
| Pack                                  | 9:49     | 7:09                                     |
| Forge lit                             | 12:37    | 7:48                                     |
| Depot / little guys                   | 15:53    | 8:51                                     |
| **First path → depot hunger stretch** | **9:14** | **2:48**                                 |
| Trains unlock                         | 26:56    | 19:52                                    |
| Pier / end                            | 29:45    | 22:42                                    |

The exact path→depot interval fell **554.4 → 168.4 seconds**, a **386-second (70%) reduction**.
Only about **2 minutes 49 seconds**, roughly one third of the historical eight-minute stretch,
remains. The earlier first path mostly reflects a shorter opening walk in this run: work after
waking was effectively unchanged. No bills, carry limits, upgrade placement or cart quantities
were retuned to recover the missing hunger. The owner still needs to answer:
**“Did you still want the little guys to take over, and did they help?”**

An [initial after run](../../.look/evidence/1793778199663-52346/evidence.json) failed one required
arrival across the gorge and fell in water three times. The bot now compares walkable route
lengths to eligible trees, rejects low river-shelf approaches and abandons repeated no-yield
swings. The final run had zero water falls/errors/missed expected beats, one tumble and two
recorded missed-train events. Optional crystal and co-op beats were not marked in that solo run.

**Frame samples:** same fixed village view, daylight 0.26, 960×600, Apple Metal WebGPU hardware,
three passes, 180 CPU/GPU samples each. Standing before/after use the same eval and cost action;
dense additionally settles all 390 non-great trees before sampling. Short captures are not a
benchmark or device-wide performance claim.

| Sample                                                                   | CPU avg / p95 ms | GPU avg / p95 ms | Frame typical / p95 ms | Draws / triangles |
| ------------------------------------------------------------------------ | ---------------- | ---------------- | ---------------------- | ----------------- |
| [Before](../../.look/evidence/1793777154862-90665/evidence.json)         | 3.91 / 4.20      | 1.70 / 2.00      | 16.7 / 17.4            | 247 / 657,427     |
| [Standing after](../../.look/evidence/1793779277620-20495/evidence.json) | 3.77 / 4.20      | 1.83 / 1.97      | 16.7 / 17.2            | 251 / 685,685     |
| [390 felled](../../.look/evidence/1793779314159-24160/evidence.json)     | 4.39 / 4.90      | 1.64 / 2.29      | 16.7 / 17.5            | 253 / 686,021     |

Standing tree collision is **391 shapes before and after**, but **30 → 391 static bodies**:
the 362 decorative colliders already existed on one compound body in this checkout. Afterward
they have removable individual bodies. The dense scene counted 1,088 static bodies / 2,379
shapes globally versus 714 / 2,005 in the standing fixture. Rendering remains instanced;
the extra draws are fixed species/notch batches, not one draw per tree.

**Acceptance and visual evidence:** the
[solo fixture](../../.look/evidence/1793779375555-31306/evidence.json) passed clipped payouts,
mid-tree upgrade, full bag, repeat rebound, partial/felled reload, accepted in-flight inventory,
the starter great beam, all catalog fall footprints and a player inside a settling log. At a
zero preferred yaw, 375 trees found safe long falls and 16 used compact collapse. All 32 sampled
great-tree approach headings retained a long fall. The
[two-player fixture](../../.look/evidence/1793779500291-45408/evidence.json) passed pending-snapshot
reservation, duplicate receipts, simultaneous final payout, legacy reset/chop isolation and
snapshot/local-save restoration. Its earlier opening-handshake timeout was fixed in the fixture.
[world-inputs](../../.look/evidence/1793779541900-48677/evidence.json) passed the existing core smoke
contract; it is not itself a place-harvest test.

Opened the [decorative stump](../../.look/evidence/1793778890091-81388/evidence.json),
[hardwood one](../../.look/evidence/1793778823191-80022/evidence.json),
[hardwood two](../../.look/evidence/1793778836256-79170/evidence.json),
[rebound](../../.look/evidence/1793778949498-82879/evidence.json),
[full bag](../../.look/evidence/1793778971540-83879/evidence.json) and
[bite](../../.look/evidence/1793779004999-81378/evidence.json) PNGs, plus consecutive video frames
for all three contacts. The chopped scenery tree leaves a pale stump and bare log clear of the
path; both hardwoods read as broad, forked, ridged-bark trees among conifers without paint bands.
The rebound lifts the blade back with a tiny fixed scuff; the bite emits splinters and wood with
a visible notch; the full bag pulls the hand back toward the bundle without wood or a notch.
Standing/dense village stills show clear routes. Solo/co-op assertion stills are partly occluded
by neighbouring crowns, so they are not the visual proof of felling. End-of-bot stills were also
opened. Audio balance, real-time feel, handheld performance, human species recognition and
hunger remain unverified. Actual old-binary play and crash/reconnect races were not exercised;
legacy messages and same-generation snapshot restoration were.

**Historical round-4 baseline below:** its grove distances and rung estimates predate universal
ordinary chopping. Keep it as design history, not the current pacing measurement.

`npm run playthrough`: a bot at a person's stroke rate that already knows the way, walking, never sprinting. So a floor for a first-timer, not an estimate; nothing here is a person's time yet. Seconds from its start; `node dev/economy/model.ts round4` said 6.4, 10.7 and 22.1 min for the first three milestones before it was run.

| Beat                           | Time                       | The work before it                                            |
| ------------------------------ | -------------------------- | ------------------------------------------------------------- |
| At the machine                 | 81                         | the long way, 431 m                                           |
| Station 1 laid                 | 115                        | 20 s chop and carry                                           |
| Station 2 laid                 | 201                        | 75 s                                                          |
| Felled the great tree          | 326                        |                                                               |
| **First path open**            | 357 (5:57)                 | station 3: 136 s                                              |
| Second jump                    | about 6:14                 | 13 s over the new deck                                        |
| Proper axe                     | 384                        | a walk across the new path                                    |
| Pack frame                     | 528                        | forge frame, 24 logs: 141 s                                   |
| Forge lit                      | 689 (11:29)                | walls and chimney, 32 logs: 159 s                             |
| Depot (line 2, station 1 laid) | 859                        | 158 s                                                         |
| Stations 2, 3, 4 laid          | 919, 977, 1110             | 44, 45, 117 s                                                 |
| The climb and the glide        | adds about 2:40 by the end | the hook after station 2, the lever, the tower                |
| **Far Head open**              | 1380 (23:00)               | station 5: 238 s; these rows' times are from before the climb |
| Walked home                    | 1533                       |                                                               |
| **Trains**                     | 1597 (26:37)               | boiler to the camp                                            |
| The pier out, the end          | 1772 (29:32)               | 27 s to carry its kit                                         |

**Mixed-cart model, 3 November:** `node dev/economy/model.ts round4 --json` retains the historical arithmetic; `node dev/economy/model.ts round4-cart --json` changes only Q4/Q5 to the 16 m rack carry and charges supply time. These are solo estimates in seconds from model start, not bot measurements.

| Model beat    |  Before | Mixed cart | Change |
| ------------- | ------: | ---------: | -----: |
| Q3 laid       |  875.46 |     875.46 |   0.00 |
| Q4 laid       |  970.74 |     966.01 |  -4.73 |
| Q5 laid       | 1230.02 |    1216.15 | -13.87 |
| Trains unlock | 1365.45 |    1351.58 | -13.87 |

This intentionally conservative variant starts each frame with the cart at camp and an empty forge, charges every shipment before the player's final carries, and credits no existing stock or overlap. Road lengths are 361/469 m; supply wait is `rails / 2 + (2 * batches - 1) * road / 9 + batches * 9.3`, with 24 logs/16 rails per cart and 3 s camp loading, 3 s forge departure and up to 3.3 s unloading. Q4/Q5 supply waits are 57.41/186.93 s; short-carry work is 16.71/25.06 s instead of 78.85/221.13 s. The small net gain exposes the cost of a second Q5 trip under that cold-start assumption. Real play can overlap delivery, production and carrying; the bot comparison below is the observation. The model also omits the ability detours. Train unlock is Q5 completion plus `546 / 5.6 + 190 / 5.6 + 4` for the trip home and boiler; the model's `trains.openS` includes the pier and must not be used as the unlock time.

**Mixed-cart full bot, 3 November:** measured through the local broker, same bills and full route. These station beats mark the **start of laying**, unlike the model's completed stations. Seconds from the saved game clock:

| Bot beat         |  Before | Mixed cart |  Change |
| ---------------- | ------: | ---------: | ------: |
| Q3 starts laying | 1047.62 |    1046.70 |   -0.92 |
| Q4 starts laying | 1160.03 |    1121.60 |  -38.43 |
| Q5 starts laying | 1452.20 |    1342.55 | -109.65 |
| Trains unlock    | 1578.42 |    1468.75 | -109.67 |

Both runs completed every expected bot action with no page or graphics errors. `npm run playthrough -- --compare .look/evidence/1793772548990-11068/run .look/evidence/1793774348050-66816/run` reproduces the comparison. The after bot uses frontier deliveries from Q4; earlier behavior is unchanged. Its walking share fell from 85% to 77%, but stationary time rose from 4:49 to 7:01, including a **1:49 Q5 shipment wait**. Thus the route is shorter overall, while the retained 16-rail capacity still leaves a noticeable second-trip wait. No capacity, speed, bill or forge-rate retune was made to hide that tradeoff. Whether seeing the shipment arrive feels like earned relief still needs the owner's playtest; this bot already knows where to go.

**Committed-build repeat:** `1793776017482-40382` tested clean commit `150d782e`, with all expected actions, no errors/falls and an inspected end still. The repeat includes more startup waiting; do not replace the first measured run or hide that variance. Raw checkpoint seconds and changes from the same baseline:

| Bot beat         | Baseline | Committed repeat | Change |
| ---------------- | -------: | ---------------: | -----: |
| Q3 starts laying |  1047.62 |          1088.38 | +40.77 |
| Q4 starts laying |  1160.03 |          1163.27 |  +3.23 |
| Q5 starts laying |  1452.20 |          1384.27 | -67.93 |
| Trains unlock    |  1578.42 |          1510.52 | -67.90 |

The repeat is already 41.68 s behind the first after-run at Q3. From Q3 to trains it takes 422.13 s, versus baseline 530.80 s and the first after-run 422.05 s: the affected interval improves by 108.67 s on the repeat. Q5 still waits 1:49; total stationary time is 7:54. Offline comparison: `npm run playthrough -- --compare .look/evidence/1793772548990-11068/run .look/evidence/1793776017482-40382/run`. The trusted harness changed between measurement rounds, with its exact version recorded in each manifest; these are observations, not a deterministic performance guarantee.

**Each rung, before and after** (from `layout.ts` and the model's sums; bills held fixed): the axe doesn't cut much time (a 24-log job 65 m out, 80 s to 77 s, 3%) and isn't meant to: **12 presses to 5**, 8 logs in 2 swings where it took 4, 1.6 trees to 2.4. The pack: the forge's 32-log bill 170 m out, **4 trips to 2, 253 s to 129 s (49%)**, with line 2's first bill (22 pieces) also down to 2. The cart: station 3's logs, 350 m to the trees against 16 m to the rack, **223 s to 104 s for the job's walking (53%)**.

**The train, door to door, Far Head to the village:** on foot 546 m, 98 s walking, 57 s sprinting. By train, measured with a called train at the far end (the worst wait): 31 s wait, 2 s to board, 3 s of dwell, 31 s ride: **68 s**. Already there: about 36 s. So it beats walking by 31 to 63%, and beats non-stop sprinting only when it's already near; the fair reason for it is cargo, and the sit. A missed train costs a return trip of about 70 s, less if you call it back at once. Camp to village: 18.6 s riding against 34 s walking.

Cost: not measured on an iPad this round. M1 Max held 60 fps in every capture (not a benchmark).

## Sound

### Local mix and Buddy contacts (5 November 2026)

The five authored buses are Music −8 dB, Ambience −12 dB, SFX 0 dB, UI −8 dB and
Voice 0 dB. Character and Work feed SFX at 0 dB; Social feeds it at −3 dB. The
Boogler retains his formant voice and a −12 dB phrase calibration. UI's former
0.4 helper gain is folded into its bus once. User category gains, voice ducking
and authoring trims are separate; master volume/mute follows processing. The
initial output calibration is −1.94 dB, not a whole-game loudness certification.
The existing Dev Tunables panel exposes bounded Local audio controls, actual
node readings, reset and named A/B mix snapshots. Nothing is sent to room state.

Buddy's common distance-driven walk/jog/sprint phase supplies alternating foot
contacts. Six procedural takes per material avoid the previous two takes;
pitch varies ±35 cents and level ±1.5 dB. Source contacts are calibrated to
−12 dBFS peak; walking uses −19 dB, running −16 dB (both 11 dB below #1019), deliberate first takeoff
−15 dB and normal landing −13 dB. These remain bounded Local dB tunables, with room to turn them down to −40 dB.
Landing strength follows the observed airborne
apex, interpolating soft −6 dB through normal to heavy +4 dB, with capped gain.
A landing consumes its contact moment. Swimming, airborne steps, seated/riding,
down, stationary, teleport and resume transitions suppress or reset contacts.
First-jump effort follows the local controller's accepted launch, so uneven
ground crests and rejected presses remain silent. Remote presence has no jump
intent; friends retain steps and landings without inferred takeoff effort.

Ground/support metadata selects grass, sand, wood, rail panel or shallow water;
decks above water keep their solid material. Unclassified supports fall back
to grass. Remote contacts use the existing smoothed Buddy motion, an additional
−6 dB trim, body-relative distance and camera-yaw pan. Steps fade from 1.5 to
18 m (landings reach 30 m), with two events per emitter and eight overall,
reserving two slots for local contacts. No per-foot network messages are added.

The 5 November owner replay found #1019 too loud and too much like white noise.
Contacts now use a softly attacked 80–300 Hz body, with a 5–10 ms window of random-phase
band-limited texture (modes below 1.8 kHz), rather than a sustained noise tail.
Grass is muffled brush, sand dull scrunch, wood hollow resonance, rail a damped inharmonic tap,
and shallow water adds a small descending bubble. The next contact reads `character.footstepStyle`:
**0 = A soft thump** (default), **1 = B textured**, **2 = C toy tick**. The numeric selector uses the
existing Dev Tunables interface; the source cache includes style. Take bags, pitch jitter, cadence,
distance rules and bus routing are unchanged. Intended balance: felt under other cues, with jump/land
a little more present; subjective approval still needs the owner's audition.

Render the matched pack with `node dev/audio/render.ts --offline-locomotion --out .look/codex/footsteps-v2/listen`.
It contains A/B/C and an offline-only v1 source snapshot: five surfaces × walk/run/jump+land, six identical
take seeds per file, 48 kHz mono float WAVs and FFmpeg peak/RMS/LUFS metrics beside each style.
The v1 snapshot is tooling only; it never enters a game build. No old build is launched. Source peaks
are calibrated; listening files are not normalized. These omit the live master/compressor and other
sounds, so cannot establish in-game masking or device balance. Not tested on a device.

Hot UI thunk, pickup, minigame and machine recipes are reduced before the bus;
the thunk's overlapping low body and tail are reduced, and clinks share their
coherent fundamental. Quiet work cues keep their intentional differences; the
pending wave recipe and The Boogler's copy are unchanged. All mix/variation
levels are Local tunables. Measurement commands, before/after tables, listening
files and limits are in [the build report](../research/audio-build.md).
Balance, fatigue and real-time feel remain owner listening questions. Not tested
on a device.

### Axe presentation and stage review

Earned hats use a common fit for local and remote wearers and shop try-on; the conductor hat follows Head rigidly with its hollow brim, as described in [player.md](player.md).
Shallow bases clear the forehead; enclosing shells retain their authored seating depth.
Reward reveals clear the current hat's actual bounds plus the
item's half-height and bob, with camera distance fitted to the whole show's height and
vertical field of view. Great beams sit
beside the shared brim envelope instead of crossing through it. These are Local visual
fits; clothing presence, cargo ownership and interactions are unchanged (DESIGN.md 11).

The boiler uses the same side-clearance envelope at a low carrying height, leaving the
face and hat visible instead of hovering above the crown. Its world pickup mesh, size,
ownership and fitting interaction stay unchanged; game and asset stage share this fit.

The equipped starter, multi-axe, proper axe and proper multi-axe share `axe-models.ts`
with the reward displays and Buddy's Local asset stage. Their handles are 0.64 and 0.80 m
(previously 0.80 and 1.08 m); the proper head remains broader, brighter and gold-edged.
The pick points out from an overlapping metal eye on the back of the head. These are
code-authored toy primitives, not a new GLB, skeleton or skin-weight pipeline.

`chop-motion.ts` defaults to the pre-#924 floating axe arc in the back socket, without
two-arm posing or extra body lean (owner: Start animation simple). The current axe meshes,
**0.12 s contact**, **0.24 s restart interval**, 35 ms bite hold and 0.90 s visible tail remain.
The experimental two-arm pose stays in `chop-motion.ts` (`chopPresentation.twoHanded`), but its Dev → Tests
toggle went with the Tests panel (M13e), so nothing turns it on; it is Local, off on every reload and never saved or sent. The asset stage
uses the same default floating arc and socket. Strokes, yields, costs and saved/wire state
remain unchanged. Full-back refusal lifts sideways; hardwood refusal recoils sooner.

**Floating axe summon (owner, 5 November):** the original floating axe stays. Four small ivory
twinkles at its head and handle mark appearance (115–160 ms); two smaller twinkles mark
vanishing (95–110 ms). Owner-approved particle research step 1 replaces the soft dots with
crisp ivory four-point SDF glints: a brief size/opacity pop and at most 0.32 radians of spin.
The existing pool and material carry this opt-in look; the summon itself adds no smoke,
puff cloud, second pool or post pass. Only visibility edges emit: repeated presses while it stays out
do not summon it again. Reduced motion suppresses these decorative particles. This is Local,
on the same axe presentation path; no new presence is added. The separate
`codex/chop-animation-timing` two-handed retuning trial is parked and remains unshipped.
The `/character/` chop loop uses the production pose and sparkle emitter, with an explicitly
inspection-only 0.2 s lead-in and 0.3 s hidden gap so both edges can be reviewed at speed 0.25.
The isolated stage hosts the same particle implementation; the game still owns one pool.
Stage `light=production` uses the frozen sky with production Neutral and 0.16 exposure;
`sparkle=round` is the old-dot inspection control. Compare both at speed 0.25 and check Place too.

**Appear, strike, return, vanish (owner playtest, 6 November):** "When it pulls back, it looks weird"; the
particles should last "as long as it's existing". `applyFloatingChopPose` now pops the axe in beside your right
side (scale 0.15 → 1.12 → 1 over 60 ms, a small upward cock, never behind the back), strikes in one accelerating
arc whose blade marker lands exactly on the bark contact on the unchanged 0.12 s beat (production: the cut's
radius and 1.1 m height facing you; legacy Place: its raycast hit; the stage: its trunk), holds the 35 ms bite, eases home by 0.40 s, floats with a 1.6 cm
bob, then swells, half-twirls and shrinks out from 0.72 to 0.90 s. Hardwood refusal kicks up and returns; a full
back lifts sideways and returns. A press while it is still out restarts the strike from where the axe is, with no
second pop. The grip stays at least 0.4 m out on the tree's side (right unless the tree is clearly left) and rests
beside the hip, so neither the path nor its trail crosses the face. `sparkleAxe` emits ten glints on appearance, a continuous ivory-gold-lilac aura and blade trail while
visible (36 a second plus 16 per metre of blade travel, at most 8 a frame, `readableIntensity()`), and eight on
vanishing: about 70 births a cycle in the shared pool. In production a partner's accepted chop, rock break or beam
stroke shows their axe from the contact beat, in step with the chips. All Local; contact timing, restart cadence,
rules and wire state are unchanged. Storyboard and review evidence are in the handoff.

**Contact particles (5 November):** accepted chops fling small tapered timber chips from the cut,
out toward the approach side. Their rotation, changing projected thickness, gravity and short ground
rebound distinguish them from glints. Rock contacts use grey quad fragments. Rock breaks and existing
cargo/construction thuds use low-alpha procedural billows with size, opacity and colour curves.
Logs dropped onto ground piles billow on flight completion, with two small timber chips.
An accepted great-beam set-down emits outward along seven sites on each side of its full contact length,
with six small chips. The denser, low lobes expand and roll, lose outward speed, then settle under gravity
as their opacity fades. Drop height scales count, size, spread and lifetime, capped at 4 m: logs use
release-to-contact height, beams estimate carried-centre-to-ground-centre height from the existing local
or remote carrier pose (1.6 m fallback when absent). Rock breaks use their radius as collapse height
and retain the strike's existing fragments. Rejected/repeated cargo requests and restored ground state do not emit.
This decorates the existing instantaneous set-down; it adds no beam fall animation or physics.
All use the shared 720-slot pool and one draw (256 births/frame); a beam requests 48–90 births, a proper
chop 18, a landing 4–12, a log 12–22. Reduced motion suppresses the new decorations. Timber/dust retain
intensity one under the readable-reward policy. Recipes live in `render/particle-effects.ts` with typed
Local authoring values; they do not change strokes, rewards, ownership, saves or wire state.

Local tree contact raycasts the real faceted trunk from the approach direction; accepted
chips/log flights use that same point. Arm reach is bounded to preserve Buddy's proportions:
the existing 3.2 m ordinary / 4.6 m great-tree interaction radius exceeds a natural held
axe reach, so distant valid presses can still award wood while the blade falls short.
No physics travel or interaction-range change is hidden in this presentation pass.
Partners retain the existing accepted tree/chip/audio effects; there was no remote axe
animation or chop-presence field, and this pass adds neither. Co-op success effects still
wait for the accepted receipt, so network-delayed effects are not guaranteed to coincide
with the local pose. The stage review measures grip, cutting-edge contact and shaft/head/
torso proximity; signed nearest-face samples are candidates, not collision proof.

Tree contact distinguishes three local cues: a dry bite with a low wooden body and splinters,
a short hard woody rebound with a blade ring, and a soft strap/wood rattle for a full bag.
The visible cut is a thin, pale, faceted wood bite seated partly in the bark, rather than a projecting dark box. Accepted work still widens it; a refusal leaves only the existing shallow scuff.
The bite holds the axe pose briefly, bends the trunk and delays the crown; the rebound pulls
the axe back and leaves one shallow scuff; the full-bag gesture points back toward the bundle.
Repeated refusals within a second are quieter. Neither refusal plays a collection melody or
changes tree progress. These cues use the existing procedural SFX bus; heard balance and feel
remain owner listening/playtest questions.

Round 4's action cues use the existing SFX bus (`src/render/place-sfx.ts`), with camera-distance falloff and finite procedural sources. They replace the generic sounds at the same presentation beats; no gameplay timing, costs, routes or copy changes. The cart's quiet wheel and paired effort cues follow its travel in the existing render update; snapshot jumps skip accumulated contacts. At most eight of these new cue events overlap (at most forty sources), separate from legacy audio. Rarity adds notes and tail length, not level. This follows construction-sound recommendations 1–5 and 10, audio-architecture recommendation 11, and collect-sounds' attack/body/bounce recipe; DESIGN.md **11. Show, don't tell**.

Listening list for the owner (the implementing agent cannot hear; timbre, balance in play and fatigue need a person's judgment):

| Moment                         | Intended sound                                         |
| ------------------------------ | ------------------------------------------------------ |
| Rock breaks                    | Dry stone crack, low body and a short scatter of grit. |
| Great tree starts falling      | Descending wooden groan with a splintering attack.     |
| Great tree lands               | Broad, dull trunk impact with a soft crown rustle.     |
| Trunk reaches your shoulder    | Wooden knock and a brief rising effort.                |
| Common box reveal              | One warm bell with a tiny bright bounce.               |
| Rare box reveal                | Root and fifth with a short metal sparkle.             |
| Wonder box reveal              | Three rising notes with a longer, quiet shimmer.       |
| Second-jump pickup             | Two rising elastic notes.                              |
| Hook pickup                    | Small metal strike resolving upward.                   |
| Glider pickup                  | Airy swell opening into a soft fifth.                  |
| Second jump used               | Short air puff with a subtle rising body.              |
| Hook fired                     | Tight cable zip dropping away from the hand.           |
| Hook released or pull finished | Dry metal tug.                                         |
| Glider opened                  | Cloth-like snap and a short breath of air.             |
| Glider closed                  | Small folding swish that settles quickly.              |
| Cart rolling                   | Quiet paired wooden wheel knocks.                      |
| Cart pushers                   | Two soft breathy efforts as they shove.                |
| Cart stops                     | Brief brake rub and a wooden settling knock.           |
| First path opens               | Restrained root, fifth and octave.                     |
| See-saw bounces                | Springy wooden creak rising into the launch.           |

Render the same recipes without normalization via `node dev/audio/render.ts --offline-place` using this job's browser broker. Its manifest distinguishes raw SFX-bus peaks from the live master mix; it cannot establish perceived loudness or speaker quality. The existing glide wind remains on the ambience bus.

Quiet ambience under everything, in the live game since 9 November as well as here (`src/render/ambience.ts`, started by `src/features/ambience.ts` in Place's world; on the ambience bus, so it starts with the first press, ducks under voices and follows the volume): slow swells of low-passed brown noise, one on each side on its own clock; far gulls every half a minute to two minutes (a lone mew, a pair, a long call, sometimes an answer), panned around; a faint wandering breeze that gives way to the sea at the shore. The sea is loudest within about 18 m of the shore, a little under that on the river bank, and fades by 150 m to 11 dB down, with height counting as distance; it leans towards the water's side as you turn. Numbers: `LEVELS` and `FEEL`. `&ambience=off` turns it off and `&ambience=-6` moves it in dB. Hear it away from the game: `node dev/audio/render.ts --only place`.

## How it's built

Static station kit batches and log pictograms use instance bounds for scene and shadow frustum culling.
Bounds refresh after placement and after asynchronous kit geometry replacement. Track kit batches invalidate
their sphere when a matrix changes, so the next render includes newly placed and falling pieces; settled
matrices incur no additional updates. Moving stock and terrain retain their existing culling policy.

The 6 November place-kit draw pass retains the existing shared-material batches, vertices, transforms,
instance indices and caster flags. Wood grain depends on local coordinates and instance index; regrouping
it would change pixels. The compatible feeder steel was already merged. This pass therefore enables bounds
on existing batches rather than introducing further merges or spatial-cell regrouping (art-kit-pipeline H5).
At matched solo production poses, named kit main + shadow draws fell from **18 + 14 to 14 + 3** at town,
**18 + 15 to 14 + 10** at T1 and **17 + 14 to 6 + 3** at cove. The existing
`dev/look/evals/place-draws.ts` measures actual backend calls; `place-kit-draws.ts` supplies the three poses.
Frozen same-state bounded/unculled comparisons changed **0 of 576,000 pixels** at each pose, with exact
repeat probes. These are Local presentation changes, with no collision, lockstep, shared-state or save change.
The full solo Place bot passed all expected beats with no graphics errors. No frame-time or device claim.

Trees remain instanced, with only active hit/fall poses updated. Standing trees have removable
static trunk bodies; this checkout already had the decorative colliders batched on one body,
so conversion adds body ownership rather than 362 previously absent trunk collisions.
The shared catalog retains planting exclusions. A fall tests its swept crown/trunk against
paths, future rails, station approaches, buildings and spawn, trying alternate directions.
Where no long footprint fits, an ordinary tree collapses at its base and leaves a low stump.
Settled logs are static; they are not a Rapier rigid-body pile. Contact blobs cover stumps
rather than retaining the old broad scenery-canopy patch.

Tree co-op stays inside the existing **prototype** authority/localStorage boundary. The stable
`placeCoop` message and presence tag names participating peers. The authority orders harvest, returns a matching request receipt,
and records issued wood/work. A follower reserves offered bag room and awards only an accepted
receipt once. Saved `treeHarvestV1` records contain all accepted tree work and felling; the duplicate legacy felled-ID/yaw representation is removed. Accepted logs
belong to the personal bag immediately; log flights only present that award, so a mid-flight
save retains it. This is not server-durable lockstep persistence: an authority crash before
replication/save remains a prototype limitation. Normal reload, duplicates, final-hit races
and snapshot restoration are checked through the existing look harness.

Round 4 visual repairs: the avatar uses its articulated sun shadow without a second square terrain patch. Short timber feet support sleepers at shallow ground transitions. Settled train crates have box colliders on the car's existing kinematic body; the carry surface follows each crate top while keeping the same platform identity. Loading and unloading under a standing rider adjust their support height without adding launch velocity; flying crates have no collision. Cart cargo behavior is unchanged.

Local, all of it, in localStorage per room (`boogle-place-v4` for solo, `boogle-place-coop-v2` for co-op; stable labels without migration). What's kept is in one place: `job.ts` holds `job` (the shared state, including `rung`, `score` and `ways`) and a list of **slices**: `sharedSlice(key, { get, set })` for what a `&coop=1` room has in common (saved and in the snapshot), `personalSlice` for what's this tab's own (saved only). Your position and facing are personal: while moving they save about every five seconds and on leaving. Reloading returns you to safe ground there; water, building footprints and moving platforms return you to spawn. Start over returns you to spawn. `index.ts` is thin; its comment maps the modules. Your back's log count is kept in `chop.ts` and drawn by the
game's bundle through `backSeam` (`src/features/haul-stack.ts`), with rails, a sack of stone, a pack frame and a big thing on your shoulder on the avatar. Pieces in the air are one instanced pool (`pieces.ts`, `send`); pieces joining a build fall from above
(`dropSet`), never scaled. Every building but the forge shares one construction set (`sites.ts`): its plan is the forge's, in a function. Boxes and the two tapered gable shapes use three instanced draws and three shadow draws for the town. Each house-plan gable keeps three roof-phase pieces: a base course and two tapered courses meeting the roof slopes. They fall separately, with the same build order, cutaway group and collider timing.

Gold pickups and secret-box discoveries save separately as bounded personal histories. The former `finds` key is no longer migrated. Opening a cosmetic box saves its reward and removes that box from the waiting list together, before the reveal finishes. Reloading during the reveal keeps the reward without reopening its box; other waiting boxes remain. These histories and cosmetics stay local to this browser and room, outside shared snapshots.

Each line's track is one instanced set sorted by where the machine drops each piece; 2 m slab colliders join as it passes. The
machine is the kit's look on two kinematic platforms; it advances in the physics step. Trains are the same kind of car on a small state machine (`rail.ts`: target stop, signed speed, dwell), not a clock, so a call can send one straight somewhere; `&coop=1` nudges it to the authority's. Pending local nudges are discarded on a full snapshot or authority election: a correction against the previous position must not move the restored train. A flatbed with a compound shape lost its deck collider in testing, so the flatbed stays a single box.

The land is one height function on a 2 m grid (`terrain.ts`, no three.js; 760 x 540 m with Far Head), drawn as one faceted mesh and collided as one heightfield. From the crossing: the
far plane and fog range (`src/proto/crossing/sky.ts`); production water owns the sea and frozen sky, the speed put back past the 237 m soft wall, the player's CCD
off. Numbers: `TUNE`, the bills (`LINKS`, `FORGE_BILLS`) and the plots (`TOWN`) in `src/place/layout.ts`. The run: `run.ts`. Rungs: `ladder.ts`. Cart and rack: `depot.ts`. Trains and cargo: `cargo.ts`; stations: `halts.ts`. Moments and the pull-out: `celebrate.ts`, through the existing `camConstraints` seam. Gifts, shelf and mounts: `gifts.ts`. Little guys: `folk.ts`. Crystals: `crystals.ts`. The town you go into: `town-life.ts` wires `rooms.ts`, `house.ts`, `shop.ts`, `museum.ts`, `residents.ts`, `talk.ts`, `growth.ts`; every word in `town-lines.ts`. Look evals: `dev/look/evals/place-job.ts`, `place-act.ts` and `place-town-coop.ts`.

The look (`src/place/look.ts`) is the default. It overrides `tod`. `&look=off` gives the old look; `&look=ground,light,contact,kit,mats,gtao` gives single layers (`all`, the default, leaves `gtao` out). To-dos: [look-pass.md](../plans/look-pass.md).

The staged [water graduation](../plans/water-graduation.md) registers the finalized `terrain.ts` grid after
`buildLand()`, through `water.ts`. Its valid world bounds are x 740–1520, z −280–260; the last row and column are
included explicitly rather than accepting `H`'s exterior −6 fallback as real ground. The Local shore atlas uses a
1024 m / 512² core and an 80-texel halo (2 m/texel); all eight resident layers are bounded, and an overflow reports
instead of evicting a visible shore. Bed/coast stays separate from projected obstacles used by wave shelter.
This registration supplies the production sea without reshaping Round 4 terrain.

The default page and `?proto=place` use the [production water](water.md), sampling the actual gorge/shore
provider. The old sea, crossing rectangles and separate demo are archived. `water=old` and `water=new` no
longer select a sea. The classic island, at the world's origin, shares this sea (6 November).
One late-morning atmosphere bake (`tod=0.24`) completes behind loading, with fixed-gain **Neutral** output.
It replaces the moving day/night sky, sun/moon billboards and faceted clouds; there is no sunset or night
on this path. Night-gated fireflies and lighthouse beams remain off wherever those systems are present;
future day/night-only activities need deliberately chosen times. Existing camera clip distances, fog range,
terrain remain; the 5 November colour defaults above own the palette. Swimming follows bounded asynchronous samples of those waves, and splash depth uses the registered
bed rather than the home island. Query-age limits, fallback and diagnostics are described with [home water](island.md).
The beach ball's existing home-island return bounds remain unchanged; this does not introduce a place ball toy.

Surface swimming is automatic. Fast falls (at least 14 m/s) retain downward momentum for a plunge, then
buoyancy returns the player to the surface; there are no manual dive controls or breath mechanics.
Since 10 November the camera under the surface sees one flat fog toward the sea's deep colour
([water](water.md#the-sea-10-november-2026)); marine snow and surfacing droplets were removed with Ultra.

With new water, the terrain includes its real submerged triangles and receives wave-driven caustics plus swash wetness
through material patches, preserving the look's colour/normal nodes. Only built trestle legs register water contacts;
resetting/removing their solids removes the corresponding contacts. Their analytic foam/spray footprints do not rebake
the shore atlas and never treat bridge decks as seabed. Dry bank/deck surfaces remain dry receivers.

### The shore: the west cove

**The west cove is the shore (6 November).** The owner chose it over the plain grey-box coast ("I really like the cove. It
looks a lot nicer."), so every Place entry has it: the default game, the production railway and the other Place variants
share one terrain, one collision surface and one sea. The earlier `terrain=cove` flag, its `proto-place-cove` room, its
prototype-card variant and the `coveView=shape|dry` art views are gone; there is no alternative coast. Its gameplay role is
a vista and natural boundary beside the arrival climb, not a new reward destination or required route. From the first turn
at world (813,10), the broad path leads toward (823,28) and town while the cove sits to the right. The low pocket remains
physically accessible for an optional pause and return; no reward, directed side path or invisible barrier is added. The
default playthrough bot walks the pocket beach dry and back up the climb as its first beat, which proves access, not
newcomer motivation. [Round-six rationale](../plans/terrain-pilot.md#round-6--gameplay-rationale-before-the-look)
records the source-backed choice before the look revision. Previz supplies reference, not a matching target.
One headland at local z 34–74 rises out of the beach and wraps into the positive-z cove shoulder;
the bounded inland blend stops before town and protects the complete landing fade, path shoulders and rail formation.
The heightfield owns the sandy pocket, submerged shelf and backing slope. A bounded one-metre patch at local
x -212…-160, z 16…78 refines the surface; the rest keeps its two-metre grid. Five disjoint heightfields match
the rendered surface, and protected route samples retain their original heights. One connected rounded cliff and
three low rounded waterline buttresses use two opaque cullable batches and the exact same
1,942 triangles for collision. The toe shares the face's skin and rounded cap, with no intersecting end-wall ramp or
small stepping fragments. The rear return and nose closure are fitted below the finished soil, retaining one
rounded mass without exposed end-wall slivers. The shore adds 6,778 render triangles in total (4,836 of them the fine patch).
Beyond local z48, the far cap begins its return earlier, easing into the buried backing across a wider shoulder;
the played toe and front lip retain their positions. This removes the steep exposed rear-return strip.
No added lights, post passes or per-frame terrain uploads.
The pocket has a gentler beach profile: the first 0.3 m above water spans about 1.9 m at local z 40.
Bounded carving and backing-height matching retain the complete route protection mask.
The owner's smooth Odyssey base and adjustable Sunshine strata follow the [revised pilot plan](../plans/terrain-pilot.md).
Island-aligned triplanar rock and planar turf pigment use three original 512² linear RGBA8 maps (4 MiB with mips).
Slope and elevation select semantic layers; authoritative path coverage stays separate from pigment. A broad soil-slope
field stabilizes coverage independently of lighting normals. An 80 × 70 R16F texture (11,200 bytes, no mips)
reconstructs a regular two-metre sampling of the soil slope with bicubic filtering, so protected coarse triangles do not
stamp square or diagonal corners into the pigment border. It uploads once and is disposed with its ground
material; it replaces the per-vertex slope buffer. Actual surface slope limits turf eligibility near the walkable
cutoff, without applying the full rock/turf selection a second time,
so steep barriers remain sandstone. Branch-free microheight blending keeps texture sampling outside divergent
per-pixel conditionals before a soft turf edge; original grouped blade
strokes and a restrained under-lip shade replace broad turf noise. The kit has a small
opaque cap overhang. Sand takes priority on low walkable beach slopes; turf is suppressed at the wet shoreline.
Golden sand, orange sandstone and richer green turf use unequal sediment beds, three related pigments by default,
slow lateral warp and slight edge erosion. Thin dark accent lines are removed at the owner's round-seven request;
the broad irregular warm beds remain. Bedding is restricted to exposed steep rock;
gentle shoulders stay plain. Defaults are strength 0.6, bed scale 2.4 m and irregularity 0.6; the rock/turf threshold
is normal-Y 0.8 with a 0.12 blend, and bedding fades at 0.68 with a 0.1 blend. The cap and soil share a bounded
static tangent field and semantic cap coverage at their join, avoiding a lighting crease or isolated painted strip.
Cap coverage stores the weight and its premultiplied turf contribution: zero-weight corners no longer pull an
interpolated target toward rock and create orange pinholes. These material repairs preserve the approved #1034
geometry, protected routes, two kit draws and 6,778 added render triangles. Total cove texture storage is
4,205,500 bytes, within the 4.33 MiB proof envelope; no extra light or pass is added.
These presentation fields leave the shared support positions and collision triangles unchanged.
All 63 look settings are local tunables
(`cove.*`); none changes collision or simulation. Idle Buddy cancels gravity tangent to actual walkable static support
while retaining normal pressure, so standing on the beach does not slide. Moving input, swimming, moving decks, jumps and
upward impulses keep their normal behavior. Seven sampled eight-second post-stop assertions remain in the motion fixture;
results are sampled, not exhaustive contact coverage.
The [prior assessment](../research/terrain-pilot-followup.md) preserves round-two evidence, which predates this geometry.
Water depth comes from the same terrain/solid surface. (Since 10 November there are no wave obstacles, swash, film or
sand foam: the receivers keep wetness, caustics, the damp band, pores and sheen; see
[water](water.md#the-sea-10-november-2026). The rest of this paragraph is history.) Existing receiver
wetness and caustics stay separate from water foam. Cove sand adds the Ultra Water demo's damp pigment,
footprint-faded ripples and thin-film sheen using the existing swash/drying clock. Persistent dampness and dynamic
drying contributions remain separate, so the static band cannot mask recovery between waves. The stronger drying
contrast uses the existing backwash clock; filtered sand-tinted foam covers sand only. Cove rock contact uses the
ocean's contact foam rather than the former dotted ground-swash lace. Submerged cove sand remains continuously wet
below the swash sampler's −0.3 m cutoff, avoiding an angular dry-colour contour underwater; exposed sand still dries
with the shared backwash clock.
Local presentation and static Owner collision; no new save or lockstep state, so `WORLD_NS` did not move. H uses the
actual grid triangles plus kit surfaces. The tree catalog is captured before the shore is shaped, so tree IDs, harvest
state, progression and The Boogler's copy are unchanged. Owner playtest and device validation remain pending.
Serves DESIGN.md 11, Show, don't tell. The cove's collision audit is `npm run level-check -- --cove` (its look eval
`terrain-cove.ts` was deleted in M13c).

*Deleted in M13e (a `?proto=place` address now joins a shared room, whose land must not change):*
`?proto=place&water=new&shelf=demo` was a Local geometry-only A/B experiment. It copied the owner's measured Ultra
Water bearing-95 beach profile onto the east shore at world (1219.513, 8.505), oriented 95° clockwise from north.
The exact-profile strip is 70 m wide, blending to unchanged terrain by 110 m; cross-shore blending runs from
−30 to −10 m inland and +60 to +90 m offshore. Its offshore bar is intentional. The finished 2 m height grid supplies
the existing faceted mesh, heightfield collider, ground lookup and shore bake. Colour rules and water code are unchanged.
Without both `proto=place` and `shelf=demo`, the original heights are retained. This is a comparison, not a new shore default.

## Production boiler and train authority (8 November 2026, job A)

Playtest marks record server-accepted boiler takes/fits and train calls, live train unlocks and Q6 funding/laying,
and Local train boarding and arrival within six metres of the completed pier end. Refilled shared state establishes
a baseline without replaying achievements; being near the pier while swimming or under its deck is not arrival.

Q5 completion casts one revision-fenced boiler at the forge apron. Its carrier needs an empty back; fitting it at the
old camp train enables two Server-kind train schedules at 20 m/s. Calls are judged from the actor's halt position and
height and take effect at the next stop decision. An absent carrier keeps the boiler through the existing beam grace;
a longer absence or an unreachable aged drop returns it to the apron. No new control or presence field is added.

The line-2 village train loads Q6's kit: up to 32 counted logs and 32 rails moved from the forge rack. At Far Head one
atomic arrival unloads both onto the depot rack and shelf. Players carry them into Q6 (546–742 m, 32 logs/32 rails),
which lays 64 rail pairs to the pier. Counts include cargo aboard, and trains receive no away credit. This is the
headless authority and adapter API; the boiler, halt, train and pier presentation follows in jobs B/C. WORLD_NS v21.
Serves DESIGN.md **Clear authority** and **Enjoyable alone and together**. Not tested on a device.

**Replicated mover time (job A clock correction).** Trains and the depot cart read the same `adapter.read.tickNow()`
presentation clock. A session sends `r:clock` twice a second; the server echoes the token with its precise 60 Hz room
step, rate limited by host steps. The tab anchors that step at the local round-trip midpoint, removing the one-way
latency offset between players. Small corrections slew at 90–110% clock rate so running decks do not jump. Action
prediction retains its conservative receipt-time clock. Remote riders retain the existing Owner `riding` coordinates
in the shared platform's frame, reconstructed on each tab's drawn deck rather than delayed world presence.

**Split-rock and the Roundhouse, dormant blockout (8 November; J2).** Default visits include a limestone ring
with a sealed throat, a narrow sea-facing walk-in cleft, a cold kiln, a roller road and a halt rack with a broken
sample footing. At Home's turntable, a low stall ruin holds a tarped shunter and wagon behind a cracked slab,
with two empty sockets. These are Local views with owned static colliders; there are no Works actions or stock
yet. `?works=0` disables both for comparison. The outcrop and stall each use one coloured box batch, plus one
boiler cylinder. The smaller 4 × 9 m stall clears the existing path and rotated hall; its road bends from the
table. Serves DESIGN.md **7. Telegraph everything** and **11. Show, don't tell**. Not tested on a device.

**Split-rock and the Roundhouse, live (9 November; J4).** The forge casts the breaker onto the boiler's old
pedestal: a 1.4 m broad-faced hammer with gold motes, under a tall steam plume, and a whistle that carries about
900 m on the frame it appears. The boiler uses the same call (`forge-call.ts`, Home flow findings 2 and 3). **Take
the breaker** slings it on your back; **Strike the seam** at either seam swings it (a raise, a short hit-stop at
contact, chips and a thump). The stall slab pops apart in three pieces; the throat's three slabs topple into the bowl,
land with a thump and dust, sink, and leave rubble, and whoever struck gets the sea switch's pull-out camera. **Fill
the kiln** at the open cut stacks logs across the frame and stone in the hopper. When it lights there are chuffs,
sparks, a rush up the chimney and a glowing mouth; each cast rolls a footing 4 s down the roller road onto the rack.
A footing (**Shoulder a footing**) is a pale block with an iron band, carried high on your back with a stoop. You
walk at a footing's own pace (3 m/s, sprint 1.3 times that), or 5.4 m/s when a friend uses **Help carry** (presence;
**Let go** ends it). Your drop control puts it down as a block on the ground. At the stall, **Set the footing** lowers
each one into its socket; the second raises the frame in 3 s of pieces and slides the tarp off. **Fit the cradle**
bolts the rail arms onto the wagon until they turn brass. **Turn the table** sends one choreography from the accepted roll-out
(works-late-game step 5, Local): the shunter pushes the wagon onto the disc, the disc turns 2 s with both on it, the
wagon rolls off onto line 2 to wait, and the shunter backs on alone, turns back and returns to the stall. Each vehicle
sits between its two bogies, so headings ease through every corner. The table no longer turns on the press; it is
offered only once the cradle is fitted (the sim refuses a turn before), and never while a turn is pending or once the
wagon is commissioned (owner, 10 November: only when ready, and not a toy after the wagon leaves). The stall's finished
roof pitches up to its ridge from eaves on the ruin's posts, its walls closed to the eaves. The bowl's trees are
cleared locally, and its two limestone rocks
are chopped like line 1's. Serves DESIGN.md **7. Telegraph everything** and **8. Enjoyable alone and together**. Not tested on a device.
