# Calls made without the owner

Owner, 9 November 2026: "In general I'm OK with the model picking defaults or recommendations without my input, as long
as it's logged so we can revisit them." Agents may pick a default or take their own recommendation and keep building;
every such call is logged here, newest first, so the owner can revisit it. A call the owner confirms or changes moves to
[decisions.md](decisions.md) and its row here is marked.

Ask the owner first only for direction or unapproved scope, anything irreversible or outward-facing, and a `WORLD_NS`
bump while they're mid-session ([owner calls](agents/owner-calls.md)).

**Status:** `open` (not yet seen by the owner), `confirmed`, `changed` (link the decision), `reverted`.

Split by topic on 10 November 2026 (see [decisions.md](decisions.md#recording-a-decision)): this file keeps only the calls still open for the owner, one table per topic of the decision log. A new call goes at the top of its topic's table. Once he confirms or changes a call, its row moves, word for word, to that topic's section of the [archive](decisions-archive.md).

## Core loop, pacing and progression

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-15 | Tune: heavy loads keep comfort 8/16 and maximum 12/24, but the linear speed floor is 45% (was 60%). Q2/Q5 log racks move 10 m back along the approach and Q5 rails beside the log rack. Remove the 128-pile ceiling so dropping remains mobility recovery. Refusal strings are draft UI copy, not The Boogler’s | [heavy-load follow-up](archive/plans/heavy-load.md#review-follow-up-15-november) | heavy-load-fix implementer | At 60%, repeated flat hauling always favoured extra cargo; old rack and auto-unload zones overlapped. At 45%, maximum loads lose on early log bills but replace two packed trips for Q2/Q5’s 24-unit bills. No arbitrary turnaround delay or increased bill; the owner explicitly authorized tuning and drop recovery | open |
| 2026-11-10 | New: a holder's lift is seen by everyone at the table from the first frame of the hold (presence: the part and the ring's value); the first accepted commit wins and both see one moment | [engine-garage](brainstorms/engine-garage.md#3-camera-and-who-sees-what), call I11 | designer (install moment) | Makes the press a shared thing to watch; a few numbers on the presence packet | open |
| 2026-11-09 | Default: a one-word painted fingerpost, "Kiln" (wording the owner's), at the quarry halt's platform end where the trodden path leaves, from the throat strike on; recommended against a beacon there | [works-signposting](brainstorms/works-signposting.md#designer-recommendation-from-the-quarry-halt-to-the-kiln-2026-11-09), candidate 2 | designer | Words allowed sparingly (owner, 9 November); one place word at the one observed stall repeats the path's message. A beacon would spend the Works' only big signal on a spot the cut frames 21 m away | open |
| 2026-11-09 | New (with the owner): upgrade choices are made in the world at the machine the part changes; no menu reachable from anywhere, and Pause may show a read-only list later | [upgrade-choices](brainstorms/upgrade-choices.md#design-review-designer-2026-11-09), question 1 | designer | A remote menu lets one player change everyone's machine unseen; Show, don't tell and "Machines show their work physically" | open |
| 2026-11-09 | Default: the first-fall teach shows the Glide action's glyph (LB / Q / touch), not Jump, until job E moves the double jump | [glider-b plan](plans/glider-b-home-flow.md#design-review-designer-2026-11-09) | designer | At Q5 Jump spends the air jump first, so a Jump glyph teaches a two-press open | open |
| 2026-11-09 | Default: the production bot opens the pack at the forge and pulls the sea switch on its first summit visit; a flag keeps today's order | [home-flow](reviews/home-flow.md#4-the-bots-route-isnt-the-players), finding 4 | designer | Its times overstate legs 14–15 by about 2 min and it doesn't prove the order players take | open |
| 2026-11-09 | New: Jump in the air opens the canopy once air jumps are spent; LB/Q/touch toggles; Jump while open with no charge does nothing | [glider-placement](brainstorms/glider-placement.md#design-review-designer-2026-11-09), call 8 | designer | 3 Nov "jump clashes with double jump"; no mash-close | open |

## Rail, construction, levels and travel

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-16 | Default: Home's road 2 straight becomes 28.4 m and its head rejoins line 2 at s 89 with 18 m arcs, moving the track up to 4.5 m away from the table between s 28 and 89; Q2's frame and log rack move with it, keeping side, s 40.5, 3.49 m off the up track and the 10 m haul; no tree removed | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), calls 7, 8; R1 | designer (rider-coach plan review) | 18 m keeps today's curve standard; a 4–6° bearing change 35–75 m from the hall is unnoticeable and the Roundhouse gains room; the stretch is Q1/Q2, so the frame's relation to the track is what must not change | open |
| 2026-11-16 | Default: line 2's Village and Ring Island stops move 3.4 m in R2b with the coach, not in R1 | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), call 6; R1, R2b | designer (rider-coach plan review) | Freight cars keep their world positions; nothing moves twice | open |
| 2026-11-16 | Default: the coach is 2.90 × 1.60 m (fit check), not the previz's 1.80 m width; riders sit 4 + 4 facing in, one per opening, filling alternate sides | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), calls 9, 14; R2b, R3 | designer (rider-coach plan review) | 1.60 is swept and is the period 1.8:1; alternate fill shows how full the coach is from either side | open |
| 2026-11-16 | Default: players may stand on the coach roof (2.05 m, 0.30 m above the boiler top) but cannot get in; one envelope collider; five posts a side so openings read as windows; roof reach stated at every halt | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), calls 10, 13; R2b | designer (rider-coach plan review) | Separate seats keep the inside the riders'; posts and riders avoid an invisible wall over an open slot | open |
| 2026-11-16 | Default: riders cross the 0.85 m gap to the coach on a fold-down step drawn only while the train stands, no collider (R3); in the greybox they walk across | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), call 11; R3 | designer (rider-coach plan review) | Shows the stop physically; a hop reads as a missed gap; a footboard needs a new sweep | open |
| 2026-11-16 | Default: a line's trains pull the coach once the line has a rider route; line 1's timber train has none yet | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), call 12; Design | designer (rider-coach plan review) | An empty coach would claim riders who cannot ride; keyed on the route, it arrives with line 1's riders | open |
| 2026-11-16 | Default: R2b's coach ships live as a blockout in two flat colours (timber body, iron underframe) with eight seated riders countable from both sides; Cars tile desc placeholder, its counts read from data | [rider-coach](plans/rider-coach.md#design-review-designer-16-november), calls 13, 15; R2b, Strings | designer (rider-coach plan review) | Greybox call; grey in a painted train reads as a missing texture; S1 already made the tile data-driven | open |
| 2026-11-16 | Default: until the passenger-car art job, riders stand on the car's deck at its ends and outer corners, facing out, on the car's rock; clear of the seats, seated players' legs and pets' perches; they may crowd each other | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 10, V1 | designer (first-town lesson plan review) | Sitting in the player seats is what the owner called out; standing at the rail on a moving car reads as riding; packed is honest until the car is their size | open |
| 2026-11-16 | Default: start the passenger-car previz now, beside S1; two candidates (places on this car, or a rider deck with the train lengthened), the knifeboard kept; nothing waits for it | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 13, step A | designer (first-town lesson plan review) | Try things early; it changes no rule; "trains that are size appropriate" may mean length | open |






## Rewards, co-op and town roles

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-16 | Default: the loader yard's arm runs only once the footing wagon is coupled (and footings are owed) | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 6 | designer (first-town lesson plan review) | Without it a yard bought before the cradle carries the pier's twelve and the stall, cradle and wagon stop gating the crossing (route contract: a gate keeps its meaning) | open |
| 2026-11-16 | Default: a non-wagon train loads footings only going out, and while it carries footings takes no stone, Q-job kit, steel or leg kit; the wagon's train still takes any kit | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 7 | designer (first-town lesson plan review) | One deck, one cargo; stone already adds no stop while footings are owed (12 November), so plot 3's stone is not delayed outside that window | open |
| 2026-11-16 | Default: the Works arm takes its colour when the loader yard is built and stays folded until a train loads; grey and folded before the buy | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 11, V2 | designer (first-town lesson plan review) | A yard bought before the wagon (or between the pier and Q7) otherwise shows no change at the Works: a paid building that visibly does nothing | open |
| 2026-11-16 | Default: L1 (the loader's rules) ships together with V2 (its arm, deck footings and flights); S1 with V1 | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 12, order | designer (first-town lesson plan review) | Machines show their work: the rules alone would fill the pier rack from trains that show no footings, on the live game | open |
| 2026-11-16 | Default: no rider counter on the passenger car; the art job's optional "Riders <n> / 8" is dropped | [first-town-lesson](plans/first-town-lesson.md#design-review-designer-16-november), call 15, step A | designer (first-town lesson plan review) | The figures are the count (machines show their work) | open |
| 2026-11-16 | New: plot 2 is the loader yard (no riders; its arm loads footings onto every line 2 train, up to 6), taught as the first island's lesson that a town building can help the line; no choice is asked between the two plots, and the doubling counts the yard | [town-choice](plans/town-choice.md#designer-review-16-november-the-first-town-as-a-lesson), point 2; owner question 1 | designer (first-town lesson review) | Under the first-island-teaches scope a second house only repeats a lesson; nothing else on the first island teaches "grown towns give upgrades"; an arm-only loader saves nothing (section 2a), so it would show no payoff | open |
| 2026-11-16 | New: rider places are 8 a passenger train (stand-in; 6 is the measured minimum), carried in the passenger car each line 2 train already pulls beside the four player seats, so every train the ladder adds brings them; no rider car is bought on the first island | [town-choice](plans/town-choice.md#designer-review-16-november-the-first-town-as-a-lesson), point 3; owner question 2 | designer (first-town lesson review) | Owner, 16 November: rider seats are not player seats. Probe: only a third house at the pier stage is capped at 4 (72), and 6 or 8 lift it to 90.9; the first island's garage picks are decided and none is a car | open |
| 2026-11-16 | Default: plot 3's base 3,000 to 800 (room 1,600, about 20 minutes of fares at Ring Island with one added house), keeping ×2 per building | [town-choice](plans/town-choice.md#designer-review-16-november-the-first-town-as-a-lesson), point 3; owner question 3 | designer (first-town lesson review) | 6,000 is about 73 minutes of fares with nothing else to buy, against the confirmed stand-in "a town's last household to about 20" (10 November); prices are stand-ins (11 November) | open |
| 2026-11-16 | Default: the first town's lessons, in order: goods stake plots; riders pay into one box; build on a staked plot; a house brings riders; each next building costs more; a works building helps the line and brings no riders; stone stakes the bigger plot; away time leaves a sack. Closing order: A1, plot 2, plot 3's price, C1 and C2 | [town-choice](plans/town-choice.md#designer-review-16-november-the-first-town-as-a-lesson), point 1 | designer (first-town lesson review) | The first island teaches (owner, 16 November); lessons 1, 6, 7 and 8 are half-taught or missing on main | open |
| 2026-11-11 | New: a train on a build errand never makes a freight stop: the footing wagon's train, a train with a kit aboard, and any train while a kit is owed | [slice5-town-economy](plans/slice5-town-economy.md#design-review-designer-2026-11-11-freight-stops-r2b), call 4 | designer (freight stops ruling) | Keeps "freight adds no waiting on the main route" true with the owner's stone stop: the trains carrying the route's work keep their timings | open |

## Characters, cosmetics and story

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Graphics, water, sky and devices

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Audio

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Controls, HUD and arrival

C5 ruling, 15 November: **counts everywhere; squares gone** — an [owner call](agents/owner-calls.md#counts-everywhere), not an open agent decision.

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Architecture, tools and prototype lifecycle

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
