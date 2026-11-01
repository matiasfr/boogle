# Comedy in games: how games make people laugh, together

*Research report, 1 November 2026. How games produce laughter: emergent physics comedy (Goat Simulator, Gang Beasts, Human Fall Flat, Octodad, QWOP, Totally Accurate Battle Simulator, Wobbly Life, Fall Guys, Peak, R.E.P.O.), systemic comedy (Untitled Goose Game, Hitman, Tears of the Kingdom), comic timing and staging (Portal, Psychonauts, Monkey Island, Thank Goodness You're Here!, Frog Detective, The Stanley Parable), comedic NPCs, proximity voice (Lethal Company, Content Warning), slapstick animation (anticipation, exaggeration, squash and stretch, hit-stop), sound, and why forced comedy fails. For The Boogler, opening-day ceremonies with physics props, wagon jump-offs and soapbox wipeouts. Builds on [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md) (Goose's slapstick-cliché list, music as narrator, mundane stakes), [character-controller-feel.md](character-controller-feel.md) (pratfalls as tiny synced events, not ragdolls) and [vehicle-feel.md](vehicle-feel.md) §5 (crash as a show, no cost per crash); those findings are not repeated. Story is parked ([boogle-2.md](../proposals/boogle-2.md)): this report recommends mechanisms and craft, not plot, and makes no design decisions.*

**Markers.** *Verified*: the page was fetched and read. *Secondary*: known only from search-result summaries, reviews or wikis, not read at the developer's own words. *Derived*: worked out for Boogle from the sources and the code, not stated by anyone.

## Summary

1. **Clean controls, messy outcomes.** The laugh lives in the gap between what you meant and what the physics did. Human Fall Flat and Octodad both threw out controls that were messy in the hands and kept messiness in the world.
2. **Failure has to be cheap or it stops being funny.** Octodad's team says its own stealth sections were a mistake because failing there punished instead of amused; QWOP greets every fall with a cheerful "winner" screen.
3. **Script the setup, never the punchline.** Goose, Tears of the Kingdom and Fall Guys build props and systems whose outcomes are funny, then let physics deliver. That is how a scripted ceremony with physics props should land.
4. **A straight man makes the chaos read.** A serious frame (Human Fall Flat's narrator, Hitman's professionalism, Goose's ordinary village, Frog Detective's "nothing dramatic happens") is what the slapstick bounces off. The Boogler can be that frame.
5. **The player owns timing, so give the game a held beat.** Gilbert says setups must survive any gap before the punchline. Sakurai's hit-stop, Cooper's held reaction poses and Portal's silence during puzzles all show how a game takes timing back for a moment.
6. **Don't milk it.** Coal Supper drops a gag before it outstays its welcome. A joke lands fresh once, so test on new people (Zoe Quinn).
7. **Sound does half the work.** Goose's pianist reacts to a "nuisance number"; comedic sound uses mouth noises and impossible exaggeration.
8. **Laughter is social.** Provine found people laugh around 30 times more with others than alone, and "friendslop" games rely on friends to supply the comedy. Solo-first Boogle needs an audience in the world: the Boogler watching you.
9. **Characters built from physics read funnier.** Gang Beasts lost its feet because they snagged on things; Peak's bottle-shaped bodies tumble well; Lil Gator's head lags on wobble bones.
10. **Forced comedy fails:** quips without jokes, smug competent heroes, jokes written before the scene works. Psychonauts wrote its dialogue last, over the finished level.

## 1. Emergent physics comedy

### Human Fall Flat: serious world, clumsy body (verified)

[TheGamer interview with Tomas Sakalauskas](https://www.thegamer.com/human-fall-flat-interview-tomas-sakalauskas/). The game began as a Portal-or-Limbo-style puzzler. Watching his son laugh while ignoring the puzzles to clamber and wander changed its direction, and the puzzles were loosened on purpose. The serious narration and music exist to contrast with the comedy. Independent arm control was too messy on a controller, so it was reworked. Multiplayer is where the game took off. (Already cited for crashes in [vehicle-feel.md](vehicle-feel.md); the new points here are the son's laughter and the loosened puzzles.)

### Octodad: Dadliest Catch: failure was supposed to be funny (verified)

[Young Horses' post-mortem, part 3](https://www.gamedeveloper.com/design/octodad-dadliest-catch-post-mortem-pt-3-design). The control goal was to be awkward without being frustrating. The team admits they lost sight of their own rule that failure should be funny: they used stealth for precise, punishing challenge rather than for comedy setups, and harsh fail states in later levels never got enough iteration. After launch they rebuilt the stealth and boat sections so the stealth sat in the background and the foreground was a gag (hiding from a chef became dancing a jig). Underwater controls were kept deliberately simple, as a contrast to the flailing on land.

### QWOP: the joke ends when you get good (verified)

[AV Club retrospective](https://www.avclub.com/qwop-turned-failure-into-comedy-and-found-viral-immorta-1826394272). Bennett Foddy set out to make a serious running game, found the slapstick, and chose to follow it rather than bring it under control. Every failed run gets a congratulatory screen. The article's observation: once the rhythm clicks, the game stops being funny at all. The game spread through someone else's struggle on video, so watching failure was as much the product as doing it.

### Goat Simulator: small, stupid, and the funny bugs stay (verified)

[Game Developer, "The hilarious success story"](https://www.gamedeveloper.com/business/the-hilarious-success-story-of-i-goat-simulator-i-) and [Xbox Wire](https://news.xbox.com/en-us/2015/04/21/games-chatting-about-purgatory-and-glitches-too-good-to-remove-in-goat-simulator/). Coffee Stain decided the game was only funny if it stayed small and stupid, and turned down a bigger satirical version. The look aimed at seeming not to try too hard. Armin Ibrisagic's triage rule for bugs: fix what crashes or ruins play, keep what is funny; a Devil Goat vortex that flung a hundred props around was kept as "too funny to remove". Secondary: at GDC Europe he argued that games take themselves too seriously compared with film ([Wikipedia](https://en.wikipedia.org/wiki/Goat_Simulator)).

### Gang Beasts: the character came from the physics (verified)

[MCV](https://mcvuk.com/business-news/when-we-first-started-we-didnt-really-know-what-we-were-doing-how-gang-beasts-became-an-international-success/). Boneloaf had no animator, so physics did the animation. The characters have no feet because feet caught on things, and solid white eyes because players needed to see which way a character faced. The look is a side effect of making the physics readable. Reviews call the avatars deliberately awkward and the game a tool for pratfalls more than a fighter (secondary, [PC Gamer via PressReader](https://www.pressreader.com/usa/pc-gamer-us/20180227/281599535950234)).

### Landfall (TABS, Content Warning) and Peak (verified / secondary)

[Game Developer on Landfall's physics](https://www.gamedeveloper.com/design/how-landfall-games-finds-the-fun-in-physics-engines) (verified): the studio's position is that not taking the game seriously lets them do more; the wonky look suits their humour. TABS units are not controlled directly: you place them, and a balance script pushes their legs to hold the body up, so the comedy is indirect control of agents that obey badly. Content Warning's press kit lists a handheld camera, voice chat and "your friends looking and acting silly" as features ([Landfall](https://landfall.se/content-warning-press-kit), verified): the game turns failure into footage to show friends.

Peak (Landfall with Aggro Crab), secondary: Aggro Crab's Caelan Pollock describes "friendslop" as games that assume your friends make up the difference in comedy and interaction ([80.lv](https://80.lv/articles/climbing-sim-peak-was-meant-to-be-friendslop-game-from-the-start), [GamesRadar](https://www.gamesradar.com/games/co-op/we-proudly-wear-the-friendslop-badge-peak-studio-unpacks-one-of-the-biggest-trends-on-steam-and-beyond-after-studying-games-like-repo-to-find-out-what-makes-them-fun/)). A third-party art guide notes the characters' head and body share one bottle-like shape, which is why they tumble so comically ([SavedPixel](https://savedpixel.com/blog/friendslop-art-style-blender-guide/); not the developer).

### R.E.P.O. and Lethal Company: proximity voice and fragile loot (secondary)

No developer interviews were found. Coverage agrees on the mechanisms: R.E.P.O.'s robots open their jaws in proportion to mic volume, loot loses value when it bumps into things, so carrying it is accident-prone slapstick, and the humour comes from dropped artefacts and sudden deaths, not written jokes ([PC Gamer](https://www.pcgamer.com/games/horror/r-e-p-o-is-my-new-favourite-co-op-horror-game-which-combines-lethal-companys-looting-loop-with-content-warnings-zany-monsters/), [GameSpot](https://www.gamespot.com/gallery/funny-co-op-games/2900-7439/)). Lethal Company's always-on proximity voice, echoing to the room you are in, is credited with both the comedy and the tension ([PC Gamer](https://www.pcgamer.com/lethal-companys-co-op-horror-comedy-is-like-phasmophobia-but-immediately-more-chaotic-and-deadly/)). Big Walk's short voice range is already in [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md).

### Fall Guys: limp, then straight back up (verified / secondary)

[GameRevolution interview with Joe Walsh](https://www.gamerevolution.com/originals/554109-fall-guys-interview-e3-2019) (verified): ideas that the team found stupid, slapstick and funny go on a sheet and the best get prototyped. Characters go limp like ragdolls when hit, then pop back up full of energy. Takeshi's Castle, with its dry, sarcastic commentator, was the reference. Secondary ([GamesBeat](https://venturebeat.com/games/fall-guys-ultimate-knockout-how-mediatonic-crafted-a-cute-battle-royale/)): the team made sure falling over was always funny, and relied on slapstick, not a funny narrative.

### Wobbly Life (verified, thin)

[MCV interview with Thomas Dunn](https://mcvuk.com/business-news/thomas-dunn-on-making-wobbly-life-listening-to-the-community-and-leaving-room-for-players-to-make-their-own-fun/): give players tools (vehicles, jobs, missions) and leave room for them to make their own fun. Reviews single out a button that just makes you go limp ([Nintendo Life](https://www.nintendolife.com/reviews/switch-eshop/wobbly-life), secondary): a voluntary pratfall.

### A framework: "mechanical comedy" (verified)

[Polaris Game Design, "Mechanical Comedy in Games" (2025)](https://polarisgamedesign.com/2025/mechanical-comedy-in-games/) defines it as comedy the player performs rather than reads or hears, and treats the designer as building a stage and props. Useful parts for Boogle:

- **Emergent physics:** the levers are mass, friction, limb looseness and a "controlled loss of control" that distorts intent a little.
- **Executional complexity:** the "comedy of errors" zone, where failures tied to a goal are funniest.
- **Props:** reactions to objects can be scripted (Goose) or systemic (Goat Simulator).
- **Indirect control of agents:** it fails when tools are perfect, or when there is no chance of failure or no way to recover.
- **Limited verbs and limited communication:** Goose's honk.
- **Juxtaposition:** serious frame, silly act.
- **Failure modes:**
  - too much unpredictability disconnects players from the controls;
  - competitive stakes need predictability, which fights loose physics;
  - inconsistent physics reads as cheap bugs rather than jokes.

## 2. Systemic comedy

### Untitled Goose Game: villagers as props and pianist as commentator (verified)

The cliché list and the to-do lists are in [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md). New here:

- **Villagers are characterised by routine and one reaction each** ([Mary Arroz, GDC 2020 Game Narrative Review](https://media.gdcvault.com/gdc2020/GameNarrativeReview/MaryArroz-UntitledGooseGame-paper.pdf)). The groundskeeper grumpily replants, the shopkeeper deviates from the arm-waving default with a broom, the boy flees repeated honks, and the pub patrons find the goose funny and reward a performance with a flower. Nobody speaks, only grunts and mumbles. The review's reading is that the villagers are the setup and the slapstick is the punchline, and that the music tells you the conflict is fun, not hostile.
- **The score reacts to a number** ([Dan Golding on triple j](https://www.abc.net.au/triplej/programs/triplej-breakfast/untitled-goose-game-composer-dan-golding-interactive-music-chat/12721892)). The game measures how much of a nuisance you are and turns it into a number; the higher it goes, the more aggressive the music. Debussy is cut into chunks under a second so it can turn quickly. The model is a silent-film pianist watching over your shoulder. Golding notes the preludes are mostly serious pieces: the comedy is in the pairing with the picture.
- **The finale replays the history** (Arroz): carrying the bell back through every area makes you meet each villager you tormented again.

### Hitman: deadpan professionalism, ironic deaths (secondary)

IO staff describe a tone that is never too goofy and never too serious, with the comedy kept away from the violence itself, and say it gets funnier as situations get more outlandish ([80.lv](https://80.lv/articles/how-hitman-devs-turned-jacksepticeye-into-a-violent-narcissist-in-newest-mission), [OnlySP](https://onlysp.escapistmagazine.com/biggest-changes-hitman-2-io-interactive-interview/)). Critics find the disguises and accident kills the funniest part; the levels respond to the player, so improvised kills come easily ([Gamers with Glasses](https://www.gamerswithglasses.com/features/hitman-fantasy-professional)). Polaris files Hitman under dramatic irony (you know the waiter is an assassin; the target doesn't) and juxtaposition.

### Tears of the Kingdom: systems that produce moments (secondary)

At GDC 2024 the Zelda team described multiplicative gameplay as building a system that produces fun moments rather than designing each fun moment ([Zelda Universe](https://zeldauniverse.net/2024/04/02/zelda-team-explains-the-developmental-complexity-of-tears-of-the-kingdom/), [Shacknews](https://www.shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap)). Early prototypes had carts launched skyward when a stone landed on them; the hard work was making high-freedom building coexist with objects outside the physics. The sound team could not author sounds for everything players built, so sound had to come from the parts ([Zelda Dungeon](https://www.zeldadungeon.net/tears-of-the-kingdom-had-a-physics-engine-for-sound-developers-share/)).

## 3. Timing, staging and writing

### Monkey Island: the player owns timing (verified)

[Ron Gilbert in Game Developer](https://www.gamedeveloper.com/design/how-i-monkey-island-i-s-creator-handles-the-challenges-of-comedic-timing): games gave timing to the player, so a punchline may come fifteen seconds or thirty minutes after its setup. Write jokes whose payoff survives that gap; his example is Guybrush's early boast about holding his breath for ten minutes, paid off much later underwater. Secondary ([Mix'n'Mojo](https://mixnmojo.com/features/interviews/Ron-Gilbert-and-Dave-Grossman-talk-Return-to-Monkey-Island/2)): Return to Monkey Island set out to establish within its first minute that it is a comedy.

### Portal: silence during puzzles, writers cut their own lines (secondary)

[Shacknews interview with Erik Wolpaw](https://www.shacknews.com/article/67873/interview-portal-2-project-lead), via search excerpts: playtests showed players tuned out or got annoyed when characters spoke during puzzle-solving, so everyone shuts up then. Wolpaw wrote, recorded, cut and wired dialogue himself on Psychonauts, Left 4 Dead and Team Fortress to control the timing. A silent Chell served the comedic timing. Wheatley's frantic delivery offsets GLaDOS's slow, deliberate one. GameSpot argues Portal 2 works through restraint: GLaDOS does not crack jokes every time you are stuck ([GameSpot](https://www.gamespot.com/articles/15-years-later-games-still-cant-nail-what-portal-2-perfected/1100-6539480/)).

### Psychonauts and Tim Schafer: jokes last, punch up (secondary)

On the Milkman Conspiracy level, dialogue was written last: Schafer went through the finished level and wrote to what designers and programmers had built ([PC Gamer](https://www.pcgamer.com/how-a-joke-about-the-milkman-inspired-psychonauts-best-level/), [Wikipedia](https://en.wikipedia.org/wiki/Milkman_Conspiracy)). His rule is to punch up, never down: funny and kind rather than funny and mean ([NME](https://www.nme.com/features/tim-schafer-on-his-game-writing-philosophy-always-punch-up-never-punch-down-3011612)). At GDC 2010 he called the fear that something is "too silly" the enemy, and Sean Vanaman warned that announcing "we're going to be funny" comes off insincere ([AV Club panel report](https://www.avclub.com/avc-at-gdc-10-the-comedy-in-games-panel-1798219354), verified).

### Thank Goodness You're Here!: comedy first, don't milk it (verified)

[Thumbsticks on Coal Supper's GDC 2025 talk](https://www.thumbsticks.com/how-thank-goodness-youre-here-puts-comedy-first/). Will Todd and James Carbutt start from what they find funny and tease the gameplay out of it.

- **Farce:** each premise is pushed to an absurd but logically consistent extreme.
- **Pacing:** too fast overwhelms, too slow loses momentum. An open world let players use up an area's jokes, so they went linear.
- **"Don't milk it":** introduce a gag and drop it before it outstays its welcome; characters never comment on the bird-milk poster.
- **Joke test:** strip out the setup and the explanation; if it still works, it is probably funnier.
- **Background comedy:** dialogue and animation sit in the world instead of demanding attention.

Secondary ([GamesRadar](https://www.gamesradar.com/games/adventure/thank-goodness-youre-heres-developer-says-it-was-trying-to-design-a-game-normally-before-realizing-were-s-t-at-video-game-design/)): when comedy is the point of the game, players lean in. The protagonist is a straight man, which made it hard to judge how involved his interactions should be.

### Frog Detective: a recognisable frame, nothing dramatic (verified)

[Grace Bruxner at GDC, via Game Developer](https://www.gamedeveloper.com/design/how-i-the-haunted-island-a-frog-detective-game-i-subverted-genre-for-laughs). Pick a genre that fits your setting but not your tone, keep it recognisable, and subvert the parts you dislike. Nothing sinister ever happens. Not every joke has to land: aim for enough that broadly do. Her humour is deadpan, weird silences and non-sequiturs (secondary, [ABC](https://www.abc.net.au/news/2022-12-28/frog-detective-video-game-designer-grace-bruxner/101635238)).

### Zoe Quinn: comedy is timing, and you can only test a joke once (verified)

[Game Developer on her GDC 2015 talk](https://www.gamedeveloper.com/design/exploring-what-it-takes-to-make-a-funny-game). She compares comics tuning their sets to prototyping and QA. Joke timing is a level-design problem (Jazzpunk orders its jokes through the level), and comedy and horror share the same problem of landing a surprise. A joke works fresh once, so test early and often with new people; if a tester walks past it, move it. Keep it short.

### The Stanley Parable (secondary)

Search found no interview of Davey Wreden on joke craft. Sources agree the comedy depends on Kevan Brighting's delivery of a narrator who reacts to what you did ([Wikipedia](https://en.wikipedia.org/wiki/The_Stanley_Parable), [That Shelf](https://thatshelf.com/gamercamp-2013-the-stanley-parables-davey-wreden/)). The transferable mechanism is a voice that notices the player's choice and comments after it.

## 4. Comedic NPCs and running gags

- **Animal Crossing** (secondary): the English villager and Resetti dialogue is rewritten, not translated, by Nintendo Treehouse, with jokes needing the most work; Resetti got a Bronx accent to match the Osaka original ([Wikipedia: Mr. Resetti](https://en.wikipedia.org/wiki/Mr._Resetti)). Katsuya Eguchi frames the series around communication, and says compliments from visitors push a host to entertain more ([Game Developer](https://www.gamedeveloper.com/design/crossing-into-the-mainstream-katsuya-eguchi-on-i-animal-crossing-i-), verified). Villagers were tuned to be friendlier while still telling you off for mistakes ([Nintendo World Report](http://www.nintendoworldreport.com/interview/11229/animal-crossing-interview), secondary).
- **Goose's villagers** (above): routine plus one distinctive reaction plus a grunt.
- **Polaris on franchise literacy:** running gags come from watching what players latch on to and carrying it forward. A designed callback works the same way inside one game (Gilbert).

## 5. Slapstick animation, hit-stop and feel

- **Hit-stop** (verified, [Sakurai's Famitsu column, SourceGaming translation](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)):
  - attacker and victim freeze for the same time, longer for heavier hits;
  - both vibrate during the freeze, side to side on the ground, up and down in the air, shrinking over the freeze and scaled by camera distance;
  - a hard cap so no freeze runs too long;
  - in 3D, a freeze without a flinch reads as ambiguous, so Smash blends into a hurt pose over a few frames.

  Secondary: his video recommends hit-stop on every finishing blow ([SmashWiki](https://www.ssbwiki.com/Hitlag)).
- **The animator's dilemma** (verified, [Jonathan Cooper, Game Anim excerpt](https://www.gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)):
  - designers want minimal anticipation on player moves, but NPC moves should telegraph longer;
  - squash and stretch should keep volume;
  - exaggerate, because real motion never looks real enough, but keep the level of exaggeration consistent across the game;
  - follow-through sells weight, and the player regains control at a set frame while the follow-through keeps playing;
  - reactions need a held pose to breathe.
- **Wobble bones** (verified, [Lil Gator Game](https://www.gamedeveloper.com/design/the-exaggerated-animations-and-tottering-wobble-bones-of-lil-gator-game)): an oversized head and arms, loose parts driven by physics, and a head that lags the body; silly-looking, but it sells the movement.
- **Death and impact feedback** (secondary, [Berbece, GDC 2015](https://gdcvault.com/play/1022759/Game-Feel-Why-Your-Death)): layered sounds (big impact, small impact, squish), particles and shake, plus "death paint" that marks where a fall happened.
- Boogle already has squash on the ball, a 55 ms catch hit-stop and the face-plant (`kd`) in [src/features/impact.ts](../../src/features/impact.ts) (derived).

## 6. Sound

- [Winifred Phillips, "Comedic sound"](https://www.gamedeveloper.com/audio/comedic-sound-for-the-game-music-composer) (verified):
  - Christopher Gates: games that are funny lean almost entirely on audio, because audio is where the creator keeps control of timing.
  - Luca Fusi: context is key (a harmless sound in a dangerous place); put mouth noises in, always; people laugh far more around others, so suggest other people are present.
  - Chris Scarabosio: sounds so over the top the thing could not possibly make them, and off-screen sounds that fit the world.
  - Phillips' own example: The Maw's score of mouth sounds, bottle pops and croaks.
- Goose's pianist and nuisance number (above): reactive music turns mischief into comedy and keeps hostility light.
- Placement (secondary, general video-editing guides such as [Epidemic Sound](https://www.epidemicsound.com/filmmaking/funny-sound-effects/)): land the effect just before or on the visual hit, one well-chosen sound per gag.

## 7. Laughing together

- **Robert Provine** (secondary, [UCLA abstract](http://cogweb.ucla.edu/Abstracts/Provine_96.html)): without media, people were about 30 times more likely to laugh with others than alone. Only 10–15 % of what preceded a laugh was a joke; laughter works as social punctuation and is contagious, more so between friends ([Baltimore Sun](https://www.baltimoresun.com/1995/12/19/6-years-work-all-for-laughs-whats-so-funny-robert-e-provine-has-been-studying-laughter-for-six-years-and-he-finds-that-this-basic-human-instinct-has-very-little-to-do-with-formal-jokes/)). Old observational work, widely repeated, not replicated in what was found.
- **The audience is part of the joke:** QWOP spread through watching, Content Warning makes footage, Goose's pub patrons applaud, Animal Crossing hosts perform for visitors.
- **Limited communication is comic:** honk-only Goose; proximity voice muffled by distance and rooms.

## 8. Why comedy fails when forced

- **Punishment:** Octodad's stealth; Descenders' lives (in [vehicle-feel.md](vehicle-feel.md)).
- **Quips instead of jokes, and smug competence** (secondary, [Zero Punctuation](https://zeropunctuation.fandom.com/wiki/Comedy_in_Games_Should_Be_More_Than_Just_Quips), [TheGamer](https://www.thegamer.com/video-game-comedy-is-bad/)): a hero who is both always succeeding (because gameplay needs it) and always joking reads as smug. Lines that repeat too often wear thin, even at the lowest chatter setting. Jokes that undercut every tense or sincere moment.
- **Announcing the comedy:** Vanaman's "insincere" warning; Goat Simulator's "don't look like you're trying".
- **Milking it:** Coal Supper.
- **Mastery kills slapstick:** QWOP once the rhythm clicks; Polaris on rigidity.
- **Noise reads as bugs:** Polaris on inconsistent physics; Goat Simulator still fixes the bugs that crash or ruin play.
- **Punching down:** Schafer.

## What this means for Boogle

Recommendations only. Each serves principle 10 (slapstick over precision) and most also serve 1 (toys before chores). Numbers are starting points for a playtest. "Prototype" means the smallest thing that answers the question, solo first, behind a `?proto=` flag, judged by playing.

1. **Script the ceremony's setup, let physics deliver the punchline.** An opening day is a stage, not a cutscene. Scripted parts: where people stand, the camera, the music cues, the mayor's beats. Unscripted parts: everything that moves. Props are dynamic bodies placed to fail interestingly:
   - a ribbon as a chain of light segments with a break force;
   - oversized scissors that are heavy and top-heavy;
   - a podium on a slope;
   - bunting strung between two poles;
   - a cake on a trolley.

   The ceremony advances on *state*, never on a timer alone ("ribbon broken", "mayor knocked off podium", "ball landed in cake"), and each beat has a fallback after N seconds so it never stalls (Fall Guys' and Goose's props; TotK's "systems that produce moments"; Gilbert on player-owned timing).
   *Prototype:* a greybox podium, one physics ribbon, scissors and three loose props near home, with the Boogler running a three-beat speech (open, ribbon, close) that waits on ribbon state. Run it ten times solo. Question: does something you didn't plan happen in at least half the runs, and did you laugh once?

2. **Make the Boogler the straight man who reacts.** The comedy is his seriousness meeting the chaos, never his jokes. Give him a small reaction vocabulary, triggered by world events he can see:
   - a double take (glance, 300–500 ms freeze, glance back);
   - a frozen hold;
   - the cover-up ("As planned.");
   - indignation;
   - grudging applause.

   Each is a beat plus a short bark, chosen by what happened and to whom. Hold before he reacts, so the event lands first (Cooper's held reactions, Sakurai's freeze, Portal's silence). Goose's villagers show one distinctive reaction per character is enough. Keep his lines rare and earned. Never let him quip at the player's failure; he aims his pomposity at himself and the island (Schafer's punch up).
   *Prototype:* the reaction set (no new lines beyond about five barks) on the existing Boogler, fired by three events he can see within 15 m: a face-plant (`kd`), a soapbox wipeout, a wagon jump-off tumble. Question: when he sees you fall, is it funnier than when he doesn't?

3. **In solo play, put an audience in the world.** Laughter is social (Provine), and Boogle is solo first. The Boogler watching is the cheapest audience. Goose's pub patrons show that an NPC who *enjoys* your stunt is a reward that needs no score. Candidates: the Boogler's reactions (2), a few cosmetic onlookers at ceremonies who cheer or wince by event, and in multiplayer the other players' cameras briefly favouring a nearby pratfall (inference).

4. **A held beat on every pratfall, synced as one event.** Build on the face-plant and [character-controller-feel.md](character-controller-feel.md)'s "events, not poses":
   - **Pratfall hit-stop:** both bodies freeze (player and prop, or two players) for about 60–90 ms, capped at 120 ms, with a small shrinking vibration (sideways on the ground, vertical in the air), then a 3–4 frame blend into the flop (Sakurai).
   - **Reduced motion:** the vibration is skipped under `reducedMotion`.
   - **Recovery:** limp, then pop up with energy and a stretch on the way up (Fall Guys).
   - **Every pratfall the same way:** soapbox wipeouts, wagon jump-off tumbles, Boogler launches, ceremony props landing on heads. One shared helper keeps the exaggeration consistent across the game (Cooper).

   *Prototype:* route the wagon jump-off tumble and the soapbox wipeout through the face-plant's freeze, vibrate, flop and pop sequence, then compare stills and motion against today. Question: does a tumble read as a joke at a glance on a phone?

5. **Clean controls, messy outcomes.** Never add input noise or delay to make something funny. Put the looseness in the world:
   - grip that lets go (vehicle-feel's grip curve);
   - top-heavy props;
   - a tumble threshold;
   - jump-off momentum carried into the flop.

   Keep each outcome *readable* (Polaris: unpredictability that disconnects you from the controls is frustration, not comedy).

6. **Failure costs nothing and resets fast.** A wipeout, tumble or ruined ceremony prop never costs som, progress or knack. You are back on your feet in under 1.5 s, back at the top in under 3 s ([vehicle-feel.md](vehicle-feel.md) already says halve `returnAfter`). If a challenge exists, keep it in the background and the gag in the foreground (Octodad's rework). Celebrate failure the way QWOP does: "Wipeout!" is good; a jaunty sting and a counter of your wipeouts would be better than a scold (inference).

7. **Sound as the comic narrator.**
   - **A reactive layer:** keep a local "kerfuffle" number (props knocked, people tumbled, Boogler launches in the last 20 s, decaying) and let it pick the ceremony band's stem: calm, busy, chaotic (Golding's nuisance number; the era band from [story-and-finale.md](../proposals/story-and-finale.md)).
   - **Mouth sounds for the Boogler:** hmph, gasp, a tiny "oop", a pleased hum. Procedural grunts on [the shared audio context](../../src/render/audio.ts) are enough to test (Fusi).
   - **Impossible sounds:** a ribbon that snaps like a banjo string, scissors that clang like a gong (Scarabosio).
   - **Timing:** land the sound on or just before the visual hit. One sound per gag, layered big-small-squish (Berbece).
   - **Quiet otherwise:** quiet ambience makes the flurry read (Arroz on Goose).

   *Prototype:* the kerfuffle number driving three stems of one placeholder loop during the ceremony prototype (1). Question: does the same chaos feel funnier with the music reacting than with a fixed loop?

8. **Don't milk it: give gags a lifecycle.** Each scripted ceremony accident or Boogler reaction line has a "seen" count per player (localStorage, like friendship). A line retires or varies after one or two showings. Prefer several cheap variants to one polished joke repeated. Ceremonies should be short: a minute, not five (Coal Supper; Quinn on short games; the existing honk-chord interrupt is a good escape hatch).

9. **Setups that survive any gap.** Because players own timing, gags should be plant-and-payoff pairs that work whenever they are triggered. A prop or boast planted early pays off when the player, not the clock, brings it back (Gilbert). This is a mechanism for whoever writes the story later. Concretely: a small per-player flag store for "seen setup X", which payoffs check, reusing the Boogler's existing flags in [src/boogler/talk.ts](../../src/boogler/talk.ts).

10. **Shapes that fall well.** When the character look track starts (boogle-2.md, open question 7):
    - prefer bodies whose silhouettes tumble readably, like Peak's bottle shape and Gang Beasts' facing eyes;
    - give loose parts that lag, like Lil Gator's wobble bones and the Boogler's sprung top hat.

    The top hat is already a comedy instrument (crushed while ridden). Letting it fly off and land somewhere silly on a launch or a ceremony mishap would be a cheap gag (derived).

11. **Write the jokes last, then time them in the build.** Barks and ceremony lines get written after the prop scene plays well in greybox, by watching it (Psychonauts). Whoever writes them also places and times them in the build (Wolpaw). Every line passes Coal Supper's test: without the setup and the explanation, is it still funny?

12. **Test comedy on fresh eyes and log it.** A joke lands fresh once (Quinn). Add two fields to [docs/playtests.md](../playtests.md) entries: "laughed at" and "funny bug". Triage funny bugs Goat Simulator's way: keep what is funny and harmless, fix what crashes or blocks play, and turn a kept one into a deliberate feature.

13. **Limited communication is a toy.** No voice chat means the honk, the ping and the chord carry social comedy (Goose, Polaris).
    - Honking at the Boogler mid-speech could get a reaction ([story-and-finale.md](../proposals/story-and-finale.md) already has the chord interrupt).
    - Repeated honks could startle cosmetic onlookers, like Goose's boy who flees repeated honks.
    - Content Warning's camera suggests a local "photo of the moment" after a ceremony mishap, so the joke can be shown to a friend later (inference).

14. **Guard rails (what not to build):**
    - no quips from the Boogler on every action;
    - no scores, ratings or leaderboards on wipeouts or ceremonies;
    - no failure that costs anything;
    - no comedy aimed at a player rather than at the situation;
    - no punchline played as a canned animation where physics could deliver it;
    - no comedy "mode": the frame stays sincere (Human Fall Flat, Hitman, Frog Detective, Vanaman).

## Open questions for a playtest

- Does the Boogler's reaction (2) or the reactive music (7) add more laughs per minute in the ceremony prototype? Build both cheaply and compare.
- At what rate of mishaps does a ceremony feel like chaos instead of comedy? A starting guess: one notable accident per 20–30 s.
- Do players cause mishaps on purpose (a good sign), and does the ceremony still finish when they do?
- Is a pratfall hit-stop readable on a phone at the soapbox's camera distance, or does it read as lag?
