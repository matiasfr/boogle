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

**Replay audit, 5 November:** checked against local `origin/main` `fd54894e`. A tick means implemented in the cited commit, not owner/device approval. Mixed items are split below so unfinished work remains visible. No design expansion is part of this replay preparation. [Combined replay evidence](../research/round-4-replay-preparation.md): solo and continuous co-op pass after bot repairs (`60838d35`, `320c0eb3`, `8c642ecf`, `f2d3710e`) and a co-op boarding-budget correction (`1599ed02`). Axe/Drop/respawn probes and world-inputs pass. Phone-profile render GPU is +5.4%; load is roughly unchanged. An intermittent grounding outage and transient train-position gaps remain unresolved; not tested on a device.

**Owner decisions, 5 November**

- The great trunk can't be shouldered until Station 3 needs it. A dropped log that can't be reached respawns.

**Bugs**

- [x] Great log soft-lock: early pickup gate, Drop and unreachable recovery (`1a5c17b7`, `8434c5c4`, `22e1a318`); proper axe before the beam (`2236d075`).
- [x] Ping's far fallback (`3470c329`).
- [x] D-pad conversations: restore missing `af0e4239` as local `5296357b`; all four directions belong to the talk, including horizontal repeat, without Ping/Flag. `ce5b3144` corrects the keyboard guide and adds focused acceptance captures. The earlier main audit correctly found this missing; it is now restored on the replay branch, not pushed. Standard/axes/hat D-pads and arrow keys pass; physical pad verification remains.
- [x] Whistle try-on aisle access (`6403073e`); top hat behavior retained.
- [x] Wall-jump wobble (`96445aae`).
- [x] Split NPC answer, "Out there" / "the ground does that" (`03fee5c2`).
- [x] Reward star rarity (`74362637`).
- [x] Landscape pause layout (`f9ebd059`); physical phone verification remains.
- [x] Update banner clipping and touch glyph (`cdc84269`).
- [x] Automatic demonstration double-jump removed (`45f4181d`).
- [x] Glider/cinematic sequencing (`ea180fda`), construction before glider (`9f986ad6`), gate reveal before return hook (`2147f451`).
- [ ] Background GPU error at 48:17 (`createCommandEncoder`): recovery fix/reproduction not established; relationship to Grant's freeze remains unproven.

**Looks and clipping**

- [x] Readable unlit particles/names (`84cceb92`); fixed HDR with Dev controls (`33a941ab`), shared compensation (`fa7fd698`), calibration/dry-path guards (`adae2172`, `09539c45`, `85aa245a`). Brighter sand and darker shop/sun-facing sky remain reported tradeoffs, not owner approval.
- [x] Square shallows (`b0763291`).
- [x] Floating axe restored as default, new chop retained as an option (`5cd242d6`).
- [x] Head/hat/axe/beam clearance (`1544624c`), little guys clear train bodies (`807da81b`), side-carried boiler (`d1dcb2de`).
- [x] Optional platform terrain/tree/cliff clearance (`48896b72`).
- [x] Chest cap and summit floor z-fighting (`633d6ad6`).
- [x] Pale tree cuts (`8b3d43c6`) and supported stone piles (`590d200a`).
- [x] Worker text/prompt and conversation framing changes (`ff27ba5b`).
- [ ] First-stage worker framing: targeted desktop and touch-profile portrait/landscape checks passed on `1b19093f` ([evidence](../research/final-tree-replay-verification.md#first-stage-worker-framing)); actual worker and full card visible. Owner/device approval remains open; not tested on a device.
- [x] Station bench orientation/aisle (`02582583`) and turntable rim/rails (`02f58ef6`).
- [x] Firebox grate and calmer glow (`c423fb11`).
- [ ] Bridge bell's apparent reaction to falling in remains unaddressed.
- [ ] Water and sky may be too good next to the world. Performance dipped: 2x down to 1.2x from 18:11, up to 568 draw calls.

**Design**

- [x] Fork signs removed; dock and town approach (`32a21e81`; [brief](../brainstorms/signposts.md)).
- [x] Brass trinkets versus blue specimens (`55668f81`).
- [ ] Money purpose/currency/icon/display: design pass after replay.
- [ ] Dropped-resource despawn and tree regrowth: wait for the production plan's supply accounting and safe-rack policy before slice 2. Not implemented here.
- [x] Boiler saddle and matching pedestal (`06df8aba`).
- [x] Prepared earth/stakes beyond the gate (`88f34a3a`).
- [x] Cart recall/delivery cues (`bfea44df`, checked in `c1c16342`); cart-first progression remains after replay.
- [x] Track-layer ease-out and broader rear step (`74dcab6c`).
- [ ] Distinct track-layer machine art remains for the art pass.
- [x] Log-cell pickup pulse (`76f01598`) and fading seated Stand hint (`b7dd93f7`).
- [x] Raised tower chests and hanger preview (`76f01598`); Station 3's earned axe stand (`2236d075`).
- [x] Unnecessary long-way-round comparison banner removed (`eac11383`); crossing record and fanfare retained.
- [x] HUD name/Live into pause on every platform, touch-only options and fewer pause stats: restore missing `6f46f171` as local `3bae8f40`, retaining later changes. Fresh desktop and phone-profile captures show identity/Live in Pause, money only when empty-handed, and the options button in touch play. Portrait and landscape inspected; not tested on a device. `c6447faa` alone had moved tester controls/counters only.
- [x] Fixed train seats (`fd5eeed2`, `7e64deed`) and enterable completed forge (`8340a1e2`).
- [ ] Museum zoom and hat-buyer reaction remain; preserve The Boogler's copy.

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
- [x] Hook as a swing: rejected (owner, 5 November). The hook stays a zip-line pull to its target, and the prototype was stopped with nothing built.
- [ ] Jump upgrades later that also benefit the glider, since double jump while gliding felt good.
- [ ] Glide on L1 or jump: open, because jump clashes with double jump.
- [ ] Device cinematic goes only to whoever takes it, and suggests you can glide to the island when you can't. Decide whether that's right.

### New water

- [x] Swimming: wave bobs crossed the physics swim threshold 24 times in a 16 s Place capture (33–216 ms gaps, never grounded), restarting `Jump_Start` up to 99% weight. Buddy presentation now bridges those gaps for 0.3 s, clearing immediately on ground or a rising swim jump; physics, water and presence are unchanged. Focused regression covers bobbing, real falls and swim jumps. Committed locally for review; not shipped, not tested on a device.
- [ ] Offshore straight turquoise edge: repaired locally on `codex/sea-colour-edge`, pending shipping/owner replay. The shallow opaque terrain mesh ended at its rectangular grid while bathymetry continued; the visible seabed now follows that smooth apron and sinks below optical visibility. Near-shore turquoise, Neutral and frozen sky retained.
- [ ] Swimming: when waves roll over the character, bits of the falling animation seem to play as it bobs (owner, 4 November, small nit). Not investigated yet; check whether surface bobbing briefly counts as airborne.

### Controls and feedback

- [x] Ping back on its own button beside drop.
- [x] Item reward: more anticipation and camera movement.
- [x] Chop also on square, not just R2.
- [ ] Dropped items: maybe expire on a long timer. Keep picking up the whole stack.
- [ ] Fade on respawn rather than a teleport (a far-off nit).
- [x] "N s! The long way round took you X s": cut the comparison banner (`eac11383`); crossing record and fanfare retained. [Verified crossing](../research/round-4-replay-preparation.md#focused-verification). Local replay branch, not pushed.

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
