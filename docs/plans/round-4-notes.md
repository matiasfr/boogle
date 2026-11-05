# Round 4 playtest notes: tracker

Every note from Matias and Grant's call of 3 November ([log and evidence](../playtests.md)). Owner: "pretty much all the notes we had are valid, so I just want to make sure that we're tracking them all." So nothing here is dropped without the owner saying so. Tick a note only when it has shipped or the owner has closed it. Unticked notes with no job are the next work to pick from.

Serves DESIGN.md 11, Show, don't tell, and 1, Toys before chores.

## Fixed and shipped (still to be played)

- [x] Grant's freeze: forge rack overflow fixed and instance counts capped. Not proven to be Grant's exact case; Grant's video still to come.
- [x] Launched into the sea from the cart.
- [x] Thrown off trains with two players.
- [x] Partner's cart invisible, partner walking in place.
- [x] Partner's beam, boiler, rails, logs, stone and pet not shown.
- [x] Gates 90 degrees off.
- [x] Get unstuck going to the old island.
- [x] Cinematics, item cards and the town camera closing on movement, including jumping.
- [x] Whistle for the cart only working when the far end needs something.
- [x] "Stand on a platform" flickering, trains called repeatedly.

## Shipped overnight, 4 November (to be played)

- [x] `little-guys-rails`: little guys bring rails from Line 2 station 4, with a 13 m/s bonus on a cart you load and ride. Shipped. Splitting pays by only 2 to 4 s at station 5: judge on the replay.
- [x] `no-objective`: remove the objective marker. Shipped.
- [x] `tree-tiers` and `trees-any`, shipped: any ordinary tree, plus two hardwoods; replay decides if the hunger survives. Was: (research): any tree can be attempted; tougher trees read as a different kind. Bands go with it. Why it's awkward now: "you have to go all the way there to get logs".
- [x] `place-bugs-look`, shipped (jump wobble and the recovery loop not reproduced; check the Z-fighting spot): square shadow; double-jump rings; floating rails; Z-fighting at the canyon platform; pack floating and load outside it; no way back from Happy Clam, and the water-recovery loop there; boxes on the train not solid; wall parts disappearing in the cutaway; jump wobble.
- [x] `place-bugs-run`, shipped (track layer boarding not reproduced): pinned at the Camp halt; first-use hitches; cart junction snap; boarding the track layer; false reload prompt; Start fresh splitting a co-op room.

- [x] Call feedback routine and silent flag (M, D-pad right; none on touch), shipped; first real use is the replay.
- [x] World cues, shipped; the forge's rail pickup and the great tree from a straight-in walk stay weak.
- [x] Two-player route, first chop to pier with a reload and a leave-and-rejoin, passed by bots seated on trains ([record](coop-route-verification.md)); standing rides are being tested.

## Solo play, 4 November (owner on iPhone, not yet triaged)

Answers are being collected on the [review page](https://claude.ai/artifact/4MQmeWfAe2nw57T85B7juu). Sessions `mw38b15m`, `mw38s7vf`, `mw390tiz`.

**Owner decisions, 5 November**

- The great trunk can't be shouldered until Station 3 needs it. A dropped log that can't be reached respawns.

**Bugs**

- [ ] Great log soft-lock: shouldered with Station 1 active, no Drop, no room for logs, kept on reload (fix in progress, `codex/big-cargo-drop`).
- [ ] Ping marks a point about 700 m away: its ray stops at 90 m and falls back to a far point along the view.
- [ ] D-pad during conversations: across options still need down, and left and right appear to fire Ping and Flag (all 7 flags came in town).
- [ ] Try-on: the whistle wouldn't go on or back. Top hat worked.
- [ ] Sprinting into a wall and jumping wobbles left and right.
- [ ] NPC line split: "Out there", then "the ground does that" after next.
- [ ] Scarf at Station 3: star rarity not visible, maybe portrait layout.
- [ ] Landscape on mobile: wasted space on top, pause menu doesn't fit when scrolled.
- [ ] Update banner cut off, and shows D-pad on touch.
- [ ] Double jump is performed for you on getting it. Discover it yourself instead.
- [ ] Glider reveal and the other island's cinematic overlap. Sequence them.
- [ ] GPU error on returning from the background at 48:17 (`createCommandEncoder`). Possibly related to Grant's freeze; unproven.

**Looks and clipping**

- [ ] Dark particles (crystal, chest, box) and station names, and odd exposure (research: `dark-unlit-exposure`). Owner wants to test fixed exposure or no HDR, with Dev controls.
- [ ] Shallows look square (fix in progress, `codex/sea-colour-edge`).
- [ ] New chop: looks buggy, hat stays still while the head moves. Prefers the floating axe from before #924. Leans away from skeletal animation for now.
- [ ] Clips: straw hat, multi-axe, great log and tall hat with the head; little guys through the train; boiler hides the character.
- [ ] Jump puzzle platforms cut through terrain and trees; tan platform cuts through the trestle and cliff.
- [ ] Z-fighting: chest cylinder, tower floor.
- [ ] Dark brown rectangle on trees. Stones float at stations and should pile on the ground.
- [ ] Worker's text overlaps Talk; talk camera ends low over the water; dialogue card covers Ping and Jump.
- [ ] Bench at the first station faces the wrong way and is too near the track. Rotunda needs polish.
- [ ] Firebox on the track layer's back flashes and reads as a bug. Bell by the bridge read as a reaction to falling in.
- [ ] Water and sky may be too good next to the world. Performance dipped: 2x down to 1.2x from 18:11, up to 568 draw calls.

**Design**

- [ ] Signs feel heavy handed ([brief](../brainstorms/signposts.md)). Entry into town isn't curated: maybe start at a dock.
- [ ] Yellow and blue crystals: unclear difference and purpose.
- [ ] Money: why you earn it, a goofier currency, icon and number display.
- [ ] Dropped resources despawn; cut trees respawn.
- [ ] Boiler: nothing says where it goes, and the old train doesn't look incomplete.
- [ ] Switch gate isn't in front of the train; maybe hint where the rail continues.
- [ ] Whistling for the cart is unclear (used twice); had to return to the forge for the final rails.
- [ ] Catching the track layer: slower start or similar. Maybe a distinct machine from the engine you unlock.
- [ ] Log pickup: scale up and back as each slot fills. Stand prompt fades after sitting.
- [ ] Hook tower chests are invisible until you land on them; proper axe easy to miss; hanger swapping unclear.
- [ ] HUD: name and Live count into pause, options button on mobile only, fewer pause stats.
- [ ] Proper seats with preset poses; enterable finished buildings; museum zoom; hat buyer's reaction (for The Boogler).

**Liked**

- Forge coming together from train supplies, zoom-out on connecting town, "thanks for playing" cutaway, jump puzzle, museum, NPCs (especially the free hat), the water and shallows, crystal pickup animation and sound.

## No job yet

### Co-op and carrying

- [x] Great beam: carrying should be slower, and it should sit further from the station. Implemented and verified in [beam weight](beam-weight.md), branch-only; not shipped.
- [x] Find out whether two people can actually co-carry the beam, and make that the point. The great beam had no assist; the optional village seesaw is separate. [Beam weight](beam-weight.md) owns the implementation and proof.
- [x] Mark `did something together`: it never fired in 33 minutes of co-op.
- [x] Say when a shared unlock arrives: Grant earned the multi-axe and Matias got it with no idea how.
- [ ] Crates give each player different things, and Grant got something else where Matias got the pet. Confirm it's wanted. Two trinket shelves also puzzled Matias at first.

### Trains and cart

- [ ] Cart first, trains as its upgrade (leans yes). Starts after `little-guys-rails`.
- [ ] A clear pull to fit the boiler and start a second train: "I don't know why I want to set up another train".
- [ ] Subtler train timer sign.
- [ ] Pier kit surviving reloads is fixed. Still open: trains get only 3 min 19 s before the end of the run.
- [ ] Gate puzzles between stations: one switch moving two gates, "fun friction".

### Abilities and movement

- [ ] Spread abilities out: hook to glider was 49 s. Double jump later in the game.
- [x] A real double-jump challenge where you first get it, not one higher ledge. Implemented on `codex/double-jump-challenge`: eight broad warm stone blocks, dry recovery below, existing reward and unlock timing. [Plan and verification](double-jump-challenge.md); remains unticked until shipped or closed by the owner.
- [ ] Hook as a swing (Just Cause, Spider-Man), releasing into the glider, instead of an on-rails pull. Prototype.
- [ ] Jump upgrades later that also benefit the glider, since double jump while gliding felt good.
- [ ] Glide on L1 or jump: open, because jump clashes with double jump.
- [ ] Device cinematic goes only to whoever takes it, and suggests you can glide to the island when you can't. Decide whether that's right.

### New water

- [x] Swimming: wave bobs crossed the physics swim threshold 24 times in a 16 s Place capture (33–216 ms gaps, never grounded), restarting `Jump_Start` up to 99% weight. Buddy presentation now bridges those gaps for 0.3 s, clearing immediately on ground or a rising swim jump; physics, water and presence are unchanged. Focused regression covers bobbing, real falls and swim jumps. Committed locally for review; not shipped, not tested on a device.

### Controls and feedback

- [x] Ping back on its own button beside drop.
- [x] Item reward: more anticipation and camera movement.
- [x] Chop also on square, not just R2.
- [ ] Dropped items: maybe expire on a long timer. Keep picking up the whole stack.
- [ ] Fade on respawn rather than a teleport (a far-off nit).
- [ ] "N s! The long way round took you X s" confused both: cut it, or make it real route times (Burnout Paradise).

### Look

- [x] Train rust looks out of place: nothing else is textured that way, so make it a real material.
- [x] Blue shafts at spawn feel heavy-handed: cut or soften.
- [x] Festival Overalls read as a barrel; the blue thing on the front is unclear; "a lot of accessories".
- [x] Red flag on the hook course means nothing.
- [x] Blue concrete platforms don't fit the world's style yet. The platforms themselves stay visible from the start: seeing what you can't reach yet is good.
- [ ] Night: Matias likes the lamps but asked whether night cycles are staying.
- [ ] Build out what you see through the telescope: the peek at unreachable places is liked.

### Still to find out

- [ ] Town barely played: shop 7 s, house 5 s, museum never, `Talk` never pressed. Look at it properly next time.
- [ ] Blind first-time player: everything about what's obvious, especially with the objective marker gone.
- [x] Re-check `water=new` after the #775 cold-start fix: it stalled 37 s before it. On 4 November the owner saw no stall from their link; the phone session's worst frame was 230 ms.
- [ ] Physical gamepad and real touch dragging for the dismissal changes.
- [x] Grant's freeze video: received 4 November; it fits the logged instance overflow (see playtests.md). Not committed, as it's a private recording.
- [x] Matias's survey: too cumbersome, replaced on 4 November by the call routine in `.claude/skills/playtest-notes/SKILL.md`.
- [ ] Unclear from the audio: Grant first loaded "an old version" and needed Start fresh; "annoying separate pop-ups" just before starting.

## Liked: keep these

Co-op chopping. Little guys arriving. Rails delivered by train. Hook shot. Glider, including stop and reopen. Double jump while gliding, and outrunning the cart that way. Drop, with a whole stack picked back up. Walls animating away indoors. Rail wood texture. Pylons beside the rails. Little guys talking and rumours ("never once blinked"). Telescope. Fireworks at the end. Seamless reload. Gates for the train as an idea.
