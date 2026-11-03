# Plan: round 4 of `?proto=place`

Approved by the owner, 2 November: "build everything from the feedback as best you can, even if it takes a long time". Don't optimise for an early playtest. Sources: [playtests.md](../playtests.md) (round 3 survey and brainstorm), [boogle-2.md](../proposals/boogle-2.md), "The shape of the game", first entry. All numbers are hypotheses until played.

**Gut question:** did you get hungry for a better way, and did finding one feel great?

Serves DESIGN.md 1, Toys before chores; 4, Cooperation is automatic; 7, Telegraph everything; 11, Show, don't tell. The hour-to-hour game is building the railway, exploring with abilities and an incremental climb, all equally.

## The run

1. **Chop and carry by hand,** noticeably more than round 3 ("the only thing asked of me was to just chop 1 or 2 trees"), tuned with `dev/economy/model.ts` to feel good until it starts to feel long.
2. **The first path opens:** a walkable shortcut, with no train. Walking it is the reward, with a real celebration.
3. **The efficiency ladder,** each rung arriving when you're wanting it: a better axe, a bigger carry, materials brought closer (a depot, a little guy helper).
4. **Trains come last,** as their own big unlock once a long route makes walking slow. Cargo is their job; riding comes with it.
5. **Abilities from connecting:** double jump first, then hook shot targets up the middle tower that unlock the glide, matching Breath of the Wild as closely as we can. They're ancient technology you find, and getting one closes out the session. One or two key gates on the main line; the rest are optional secrets on paths already walked. Each area has cosmetics. Missed prizes appear in the hub.
6. **Town:** a house interior with the first resident, a funny one ("I just moved in here for the jobs"), a shop and a museum. Buildings have roles. Money is a comic score, The Boogler's prices are a gag, and residents plant rumours about him: prophet, mystic, none of it true. The museum shows a striking specimen and the changing town, not a curio shelf.
7. **Two players:** splitting up pays off, like one chopping while the other rides cargo, plus optional co-op-only rewards like a beam only two can carry. Not required chains.

## Fixes from the round 3 notes

- [x] The objective box fades when you don't need it, rather than always covering the game.
- [x] The hat rests on the head.
- [x] Stacks you can see are solid.
- [x] Little guys don't float in front of the deposit site.
- [x] The pet doesn't chase the train frantically or clip through it.
- [x] The train shows it's waking, without saying so.
- [x] The sun moves.
- [x] The platform's purpose is obvious.
- [x] Something points to the next island.
- [x] Crates and gifts vary, since "one tree and boxes" stopped feeling different: cosmetic boxes with rarity, common first and rarer later, filling swappable hat, accessory and outfit slots. No curios as prizes. Train slots wait for the roundhouse.

## From the Design Table call (boogle-2.md, "The shape of the game")

- [x] Show, don't tell: go through every line this round puts on screen. Cut any that narrate what the world already shows, and fix the world where cutting leaves it unclear. Keep The Boogler's copy.
- [x] Try showing the tool in a lo-fi way: an axe you can see while chopping, which visibly changes with the better axe. Drop it if it looks wrong; the full answer waits for the systems to lock.
- [x] The pet hops on your shoulder when you board a train.
- [x] Mostly daylight, with a brief night.

## Tracks, in order

- [x] **Character:** remove the avatar's ear bumps and rosy cheeks.
- [x] **Playtest data:** consented auto-upload to our server, fetched with one command, so we understand a session before hearing about it. `npm run playtest`; prototypes add beats with `playMark`.
- [ ] **Research and pictures:** movement abilities and glide feel; interiors in a third-person camera.
- [x] **The job:** steps 1 to 4, and the fixes above.
- [ ] **Exploring:** step 5.
- [ ] **Town:** step 6.
- [ ] **Two players:** step 7.
- [ ] **Whole run:** full play-through, tune from data, first-time pass, then hand to the owner. Left from the job track's review: watch the rock break and the cart moving, and watch and hear each new moment and reveal in real time; the pack frame reads like a picture frame and sits in the camera's view; "Take rails" still shows 8 times; line 2's stations 3 to 5 are the longest stretch with no new toy; the first path's camera snap against the T3 frame; a partner can't see your clothes; the M4 iPad.

## The job's numbers (hypotheses)

Set with `node dev/economy/model.ts round4`; timed by `npm run playthrough`; each rung's before and after in [place.md](../game-design/place.md#measured). Your back 8, then 16. An axe of 5 strokes at 2 logs, then 3 at 5. Bills: stations 24, 32 + 8 stone, 40 + the great beam (`Q0 + j * delta`, a short finite table); the forge 24 then 32; line 2: 16+6, 24+12, 16+12, 16+16, 24+24, and the pier 32+32 off a train. Target for the first path, 6 to 9 minutes of real play: the bot takes 5:57 with no reading, looking or sprinting, so a person should land in it, unverified. Trains at about 26 minutes.

## Left out for now

Chained physics, Boogler story beats beyond rumours, rail grinding, crystal cards, hand-built level tools, bombs and the sledgehammer, the roundhouse, mini-games, voice chat, things only at night, materials beyond the first, maps and fast travel. `rail-slice.md` gets redrafted after this.

## After this round

Real multiplayer gets priority; the beautiful corner came up but has no slot yet. The speed device from [traversal-at-speed.md](../research/traversal-at-speed.md) waits until after this round too. The main URL starts on this build, prototype code goes, and an architecture pass comes with the move to the main game.
