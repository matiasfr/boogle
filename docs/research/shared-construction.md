# Building one railway together

> **Verdict:** Build the same 24-log station with two people before changing the bill.
> **Top recommendations:** 1. Build the same 24-log station with two people before changing the bill or adding a carry mechanic.
> **Status:** partly adopted. See [plan production-core](../plans/production-core.md).

_Research report, 2 November 2026. Shared construction in Boogle's rail loop: parallel labour, fluid jobs for 2–8 friends, contribution and crowding, project costs, joining and leaving, shared finishes, and the feel of server-stamped chopping and deposits. Live web research and repository inspection at `76f20fee`; no new Boogle playtest, shipped-game play session or network measurement was performed. Recommendations and starting numbers are hypotheses, not owner decisions or approval of the draft rail slice._

## The question to answer first

**Build the same 24-log station with two people before changing the bill or adding a carrying mechanic.** The solo job has earned a yes; carrying with a friend has not been tried. The useful distinction is between completing a shared counter faster and noticing that a friend's action changed what you could do next. Both can feel good. Only a real pair can establish whether Boogle needs more than the first.

**Working hypothesis:** a small shared job becomes worthwhile co-op when people can read each other's intentions, switch tasks without permission, see their materials become the same structure, and enjoy its use together. A relay or a two-person object might add something, but neither should become the price of progressing alone.

### What is established in Boogle

- [DESIGN.md](../../DESIGN.md) binds this work: toys before chores; automatic cooperation; no hazards, theft or decay; a communal network with personal rewards; telegraphed changes; pleasant drop-in solo play. It targets 1–6 friends; the room cap in [AGENTS.md](../../AGENTS.md) makes eight a crowding case to check, not a requirement for eight equal jobs at every station.
- The latest [solo station playtest](../playtests.md#2026-11-02-the-stations-protoplace-second-round) liked chopping, the accumulating frame, riding the layer and the forge. Line 2 paid off the network. Station 3 and the last carrying dragged; returning home for rails felt like an errand. The first-line celebration barely registered. The continuation answer is explicitly ambiguous in the record. None of this establishes multiplayer fun.
- [Place as built](../game-design/place.md) is Local, saved in `boogle-place-v2`, even if another avatar is visible. Each stroke yields four logs, three strokes fell a tree, the back holds twelve, and each wood station costs twenty-four. Its scripted timings are harness observations, not measured human completion times or retention evidence.
- The [2 November decisions](../decisions.md) keep the steady back bundle and satisfying simple harvesting; demand visible material continuity and solid-looking solids; prefer a small objective over the large sign; retain a ride-only train. Contribution names have no numerical ranking. The mayor/ceremony direction and train stoking are not invitations to add jobs here. First visits start at the hub; an invite does not teleport beside a friend.
- The [rail-slice authority and multiplayer section](../plans/rail-slice.md#authority-and-the-production-seam) proposes shared cuts, carries, deposits, machine ticks and contributors; anyone may act, one full frame starts one run, and the machine survives its starter leaving. It explicitly calls for fixed costs, accepted-only material changes and an early online-feel test. **This is a draft, not built shared rail code.** Its proposed `rail-projects`, `rail-supply` and `rail-service` modules are referred to below through the plan, not as existing files.

This report builds on [communal progression](communal-progression.md), [carrying and logistics](carrying-and-logistics-play.md) and [co-op physics/netcode](coop-physics-vehicles-netcode.md). Their useful questions survive; their older landmark-restoration direction, carrying numbers, host model and unbuilt riding assumptions are not current requirements. In particular, do not revive water/farming progression, trim The Boogler's copy, or turn a shared finish into a mandatory ceremony.

### Evidence labels

**Primary** means developer/publisher material, an original paper, engine documentation or a GDC abstract. Store descriptions establish offered mechanics, not why players enjoy them. **Indexed primary** means the search service returned the relevant text but a full-page fetch was unavailable; it is marked where used. **Secondary** means a guide or third-party transcript. **Inference** is this report's interpretation; every proposed Boogle intervention is a **hypothesis**. Historical patch notes establish that a problem occurred, not that it remains in today's game. No source below establishes the ideal Boogle bill, group size or latency tolerance.

## How other games make shared work matter

### Death Stranding: work that becomes somebody else's route

Kojima Productions' [TGS gameplay explanation](https://blog.playstation.com/2019/09/12/death-stranding-new-tgs-gameplay-video/) describes asynchronous help through other players' equipment and structures. Kojima's [2025 interview](https://blog.playstation.com/2025/05/08/death-stranding-2-an-interview-with-hideo-kojima/) says players continuing to build highways helped motivate the sequel's monorails; he describes other-player likes as appreciation rather than spendable currency. This is evidence for useful, persistent generosity, not evidence for simultaneous teamwork. **Primary; the TGS text was indexed.**

The specific auto-paver recipe—fixed construction sites receiving chiral crystals, metals and ceramics until a road section is funded—is corroborated by [Push Square's road guide](https://www.pushsquare.com/guides/death-stranding-how-to-build-roads). **Secondary.** The research did not establish the server's contribution-sharing algorithm or any dependable percentage supplied by strangers.

**Inference for Boogle:** the best acknowledgement may be seeing a friend ride a line your timber made. A completed route benefits a late visitor without pretending they helped build it. Keep the paver's readable destination and persistent utility, but remember that Death Stranding does not answer whether two friends enjoy the same hauling trip together.

### Valheim: a useful household, with room for self-directed work

Iron Gate's [FAQ](https://www.valheimgame.com/faq/) presents gathering, crafting, outposts and farms in a world playable alone or with friends. Its [dedicated-server guide](https://www.valheimgame.com/support/a-guide-to-dedicated-servers/) exposes resource and building-cost modifiers. These are explicit world choices; they are not evidence for a bill that increases whenever someone connects. **Primary; the modifier details were indexed.**

**Inference:** a shared settlement gives several reasons to work at once, and players can choose a satisfying task rather than occupy a class. Its weakness as a direct Boogle model is the amount of planning a freeform settlement leaves to its residents. A confident builder can become the designer while friends become suppliers. Boogle's authored frame can supply the shared intention without a meeting; it must still let carrying feel like making something, not obeying the builder.

### Astroneer: the route itself shares life support and logistics

System Era's [Rails Update](https://blog.astroneer.space/p/rails-update/) describes posts that link automatically, extend oxygen and power, allow a train to be called, and support automated station loading/unloading. The infrastructure makes a group's next movement and supply job easier. The same update documents client join/rail presentation issues; [update 1.26](https://blog.astroneer.space/p/update-1-26/) includes rail multiplayer fixes. **Primary, indexed developer patch text.**

**Inference:** take the legible benefit of a newly connected route. Boogle's second line should bring goods closer to the next frame; friends should share the resulting trip and capability. Do not copy total transport automation into the last carry, which the owner's rail loop retains. Astroneer's historical join bugs also illustrate why seeing the right track and train on arrival is part of the mechanic, not just polish.

### Satisfactory: shared milestones, many local problems

Coffee Stain's [game description](https://store.steampowered.com/app/526870/Satisfactory/) offers solo/co-op factory construction and belts, trucks and trains that reduce manual transport. In its [1.0 story video, around 3:19](https://www.youtube.com/watch?v=899Owtx-vz8&t=199), it distinguishes shared milestone/phase/research narrative from some player-local triggers; the wording was checked in an [unofficial transcript of the developer video](https://archive.satisfactory.video/transcriptions/yt-899Owtx-vz8,199.29906611640573,230.56362746766507/), not by watching the full video. **Primary game description; secondary transcript of primary speech.**

**Inference:** shared progress need not mean everyone performs the same subtask, hears every historical announcement, or waits for the slowest visitor. Its many parallel production problems are also much broader than Boogle's first frame. Importing a factory's planning and routing would undermine automatic cooperation. Bring its useful output forward; keep Boogle's project choice and work legible in the world.

### Deep Rock Galactic: complementary tools, explicit solo compensation

The [official game description](https://store.steampowered.com/app/548430/Deep_Rock_Galactic/) makes four complementary classes part of its co-op offering. Ghost Ship's historical [balancing post, “Making a 1–4 player co-op game”](https://www.deeprockgalactic.com/updatesold), explains scaling enemy difficulty for player numbers and adding Bosco to assist solo mining, combat and revival. It also candidly describes solo as a difficult adaptation of a co-op-first game. **Primary.**

**Inference:** make help visible through an affordance another person immediately uses. Do not transfer the class lock, enemies, or co-op-first compromise. Boogle already requires every basic verb to work alone. Nor does enemy scaling establish a case for increasing construction material costs: one controls combat pressure, the other can make inviting a friend create debt. A drone replacing the missing friend is unnecessary if the fixed bill and machine already work solo.

### Sons of the Forest: shared material handling has to be trustworthy

Endnight's [game description](https://store.steampowered.com/app/1326470/Sons_Of_The_Forest/) emphasizes tactile building, sharing items and making defenses together. Its [Patch 05 announcement](https://store.steampowered.com/news/posts/?enddate=1683840278&feed=steam_community_announcements) added log sleds and Kelvin filling them. Its [Patch 01](https://steamcommunity.com/games/1326470/announcements/detail/3680042425366182430) fixed cases of multiplayer log duplication. Later [developer announcements](https://steamcommunity.com/app/1326470/announcements/) describe client log/stone popping at holders and sled interaction fixes. **Primary; patch details checked through indexed text.**

**Inference:** bundles, holders and transport tools let people see the material flow and invent jobs around it. They also multiply places where an item can appear owned twice or disappear. Boogle can preserve the visible handling with integer slots and local arcs, rather than make every log a shared rigid body. The horror game's danger and defensive maintenance do not belong in Boogle.

### Grounded: shared access, shorter storage friction

Obsidian's [Shared Worlds announcement](https://grounded.obsidian.net/news/grounded/grounded-heads-into-the-home-stretch) describes a cloud world that any authorized friend can host, with one active host at a time. Its [holiday update](https://grounded.obsidian.net/news/grounded/a-holiday-treat) widened the range for building from nearby storage, including pallets, and depositing into storage. **Primary, indexed developer text; Grounded, not Grounded 2.**

**Inference:** separate the social ownership of a place from the identity of whoever started it, and remove repeated inventory friction around an already established workplace. Boogle's server already removes the player-host dependency. A frame reachable from several sides and a freight rack near the frontier are more relevant than adopting Grounded's hosting model or allowing invisible consumption from distant storage. The owner specifically wants to see the materials arrive.

### Overcooked 2: jobs arise from geography, not character classes

Team17's [A–Z of Overcooked 2](https://www.team17.com/news/the-a-z-of-overcooked-2) describes changing kitchens, emotes and throwing ingredients to another chef or across gaps. **Primary.** The environment creates handoff opportunities from common verbs. It does not establish that throwing was introduced for any particular measured reduction in idle time.

**Inference:** a helper matters when their pass changes what somebody else can do immediately. Use a short handoff opportunity at a corner or the last few metres, with a forgiving receiver and an ordinary walking alternative. Do not import timed orders, penalties or a compulsory bottleneck. A relay whose only function is to keep someone stationed at a counter can turn a free friend into an employee.

### PEAK: a friend's body and equipment change the route

The developers' [PEAK description](https://store.steampowered.com/app/3527290/PEAK/) explicitly offers helping friends up ledges and leaving ropes and climbing spikes for the group. It also describes solo play and the escalating difficulty associated with injuries. **Primary, indexed store text.**

**Inference:** the valuable pattern is an action aimed at another person, with an immediately visible result. Boogle can offer a pass, a steadied beam or room on a moving deck without importing injury, stamina pressure or a mandatory two-person gate. This source does not establish a particular backpack-sharing implementation or multiplayer physics architecture.

### R.E.P.O.: shared awkwardness, with a substantial networking cost

semiwork's [game description](https://store.steampowered.com/app/3241660/REPO/) puts physics-based handling of objects of different weights and fragility at the centre of a six-player co-op game. **Primary, indexed store text.** In [Photon's developer case study](https://blog.photonengine.com/r-e-p-o-multiplayer-success-powered-by-photon/), semiwork says: “Making all the physics feel smooth for clients was something we struggled with for a long time.” **Primary interview within a vendor article.**

**Inference:** jointly handling one awkward object offers a kind of shared moment that parallel bags cannot. It is also an expensive candidate for the first Boogle test. Its fragile valuables, quotas and punishment are unsuitable here. The case study does not disclose grab authority, cart internals or a universal latency solution. Its suggestion about using Fusion next time is vendor prose, not a verified semiwork recommendation. Do not use modders' observations as proof that Boogle needs full physics rollback.

### Lethal Company: a useful remote job needs actual information asymmetry

Zeekerss' [game description](https://store.steampowered.com/app/1966720/Lethal_Company/) describes guiding friends from the ship with radar and remote doors, or going out together to collect scrap. These are situational jobs, not character classes. **Primary, indexed store text.**

**Inference:** a person can contribute without carrying when their information or action materially helps somebody outside. In Boogle, adding a dispatcher, fuel-stoker or operator merely to occupy another player would manufacture work. The layer and timetable already run themselves. A friend choosing to ride and watch is acceptable; giving them a compulsory maintenance button is not an improvement.

### Sky: choose to accompany, retain the right to let go

thatgamecompany's [hand-holding FAQ](https://thatgamecompany.helpshift.com/hc/en/13-sky-beta/faq/381-how-do-i-hold-another-player-s-hand/) describes an offered hand, acceptance, leading and release. This is a **legacy beta support page**, not a full audit of current friendship rules. Jenova Chen's [GDC 2024 abstract, “Designing to Reduce Toxicity”](https://www.gdcvault.com/play/1034512/), identifies consent-based communication, trust and shared emotion as design topics. **Primary; abstract read, full talk not watched.**

**Inference:** permission can be embodied in a small action, without negotiating a job. A Boogle pass should require a willing receiver; shared carrying should be easy to leave. Riding beside a friend can itself be the social payoff. None of this proves that a forced cooperation gate or a reward for permanent hand-holding would help this rail loop.

### Animal Crossing: a shared object needs a readable ending

Nintendo's [New Leaf interview, “Being the Mayor”](https://iwataasks.nintendo.com/interviews/3ds/animalcrossing-newleaf/0/1/), explains that an early bridge simply finished; the team added an optional ceremony, and discusses the difference it made to the feeling of being mayor. **Indexed primary interview; direct fetch timed out.** Nintendo's [2013 brochure, page 4](https://www.nintendo.com/eu/media/downloads/games_8/animal_crossing__new_leaf/CTR_AnimalCrossingNL_3DS_Brosch_UKV_WEB_v2.pdf) describes funding public projects such as bridges and cafés, with project selection in the mayor's hands. **Primary publisher brochure.**

**Inference:** the lasting project and its recognition are separate design problems. A funding bar can be fully functional while the finish feels absent. Boogle should make the existing layer's departure and line opening easy to notice, then let friends respond. New Leaf's mayor authority and project funding do not transfer directly to a communal railway with physical cargo. Neither does this precedent override the owner's decision to park ceremonies.

### Minecraft: a common intention gives ordinary blocks meaning

Mojang's [server guide](https://www.minecraft.net/en-us/article/how-play-minecraft-server) proposes large builds and adventures together. [Realms](https://www.minecraft.net/en-us/realms) describes a persistent friends' world and a shared activity feed; the [game overview](https://www.minecraft.net/en-us/about-minecraft) distinguishes resource-based Survival from unlimited-resource Creative. **Primary, indexed official pages.**

**Inference:** building can be enjoyable even when throughput and scarcity are removed, because players choose a shape and see each other's authorship. Freeform design also needs a shared intention; an expert can leave newcomers only the gathering. Boogle's frame supplies that intention cheaply. Its tradeoff is less freedom over the result, so material handling, useful infrastructure and witnessing the build must do more of the emotional work.

## What makes parallel labour more than a speed multiplier?

Rocha, Mascarenhas and Prada's original [“Game Mechanics for Cooperative Games” (2008)](https://fenix.tecnico.ulisboa.pt/downloadFile/395138343981/artigo.pdf) distinguishes shared goals, complementary abilities, synergies and actions directed at another player. Its preliminary Geometry Friends evaluation also reports a support role that was not interesting enough. The study was small and narrow; it is a vocabulary for designing experiments, not evidence that Boogle needs asymmetrical classes. **Primary paper, including its limitations.**

**Synthesis / hypotheses:** look for five different benefits, rather than treating a shorter stopwatch time as all of them:

| Benefit           | A Boogle moment that would establish it                           | What would not establish it                             |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Visible causality | I see your load enter our frame, then become the track beneath us | A counter rises somewhere offscreen                     |
| Direct help       | Your pass lets me finish my current trip or keep moving           | We both walk unrelated loops faster                     |
| Easy autonomy     | I notice a useful opening, take it, then change jobs              | We assign permanent chopper/porter roles before playing |
| Shared utility    | We immediately ride the connection we made                        | We receive only a larger reward number                  |
| Shared attention  | We react to the same launch, piece drop or arrival                | One player triggers a finish everyone else misses       |

Parallel work can still be pleasant conversation. Do not call a quiet passenger useless, or demand that every player optimize. The question is whether someone who **wants** to help can identify a useful action and see its result.

### Two to eight people without a job screen

**Hypothesis:** visible inventory, available space and a single current destination can allocate work without roles. A full back says “heading to the frame”; an empty back at a grove says “can chop”; a partly filled frame shows the gap. No selection of a class, no player-owned station, no operator lease. Keep pings optional and use the existing [interactable contract](../../src/player/hands.ts) for any added interaction.

| Present | Smallest plausible pattern                                                                         | What to watch                                                                               |
| ------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2       | Two full twelve-log loads, or a voluntary short pass; either person can switch                     | Do they notice and respond to each other, or merely halve the time?                         |
| 3–4     | Several approaches to a grove/frame; someone boards while another finishes stocking                | Do bodies and one interaction point make a queue? Does boarding feel like participation?    |
| 5–8     | The same shared goal, enough physical access, some harvesting/hauling and some riding or exploring | Does a willing helper find work over the next few beats, not necessarily on this tiny bill? |

The pipeline remains bounded by the [rail-slice plan](../plans/rail-slice.md#authority-and-the-production-seam): one active supply project, with preparation for the next eligible station only where that model allows it. A ready next frame waits for the same machine. “More things to do” must not quietly become several commissioned projects, a dispatch simulation or unlimited stockpiling.

### The bill should describe the structure

At today's numbers, one 24-log frame needs two full loads and six accepted four-log strokes. Two people can each bring one load. Eight people cannot each make a full four-log stroke's contribution to that frame: there are only six such chunks. Increasing the bill to promise equal work would change the proven solo job before testing the social one. A partial deposit can help, but equality per frame is not a sensible invariant.

For reasoning only, write completion time as **divisible work / effective active workers + serial machine time + interference**. This is not a fitted performance model. Online headcount is a poor substitute for active workers: a new arrival, a passenger and someone exploring all count as connected. Chopping/travel overlap; the shared layer still takes time; crowding can make more people slower.

| Cost policy                                 | Expected consequence — hypothesis                                                          | Decision for the first test                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Fixed authored bill                         | Help is an immediate benefit; departures do not increase another person's obligation       | Use the existing 24 logs                           |
| Bill multiplied by connected players        | Joining adds debt; equivalent per-person labour can erase the benefit of help              | Do not use                                         |
| Sublinear or active-worker scaling          | Less severe, but now attendance measurement and mid-build changes affect a physical recipe | Unnecessary before evidence of a problem           |
| A larger, visibly different later structure | More work has an intelligible cause and a different destination                            | Possible future pacing choice, still pleasant solo |

Freeze a recipe once supplied. Do not reprice when someone joins, refund a magically shrinking bridge when they leave, or hide a per-person quota inside the deposit interaction. If the group moves through content too quickly, first measure the sequence of trips, rides and useful connections; do not preserve solo duration by taxing friendship.

### The enthusiastic friend and the late friend

No design can simultaneously allow unlimited solo completion, guarantee that every absent friend sees every first build, and never delay anybody. Choose the owner's priorities: useful work persists, solo remains possible, a newcomer gets an honest next action. Do not add mandatory attendance or reserve the last log for somebody who might never arrive.

**Hypothesis:** prevent accidental exclusion with readable demand and simultaneous access; handle uneven contribution with equal acknowledgement and universally usable results. A contributor list can record accepted work without sorting by quantity or first/last delivery. A passenger gets access and the shared moment, not fabricated labour credit. The one-project absence allowance limits unattended progression, not a present friend's enthusiasm.

A mid-build visitor starts at the hub, or at a valid return location when that behaviour is available. Show the current destination and one small instruction, such as “Timber to the frame,” alongside current accepted stock. Separate goods already claimed/in transit from the unreserved need so several late carriers do not set out for a bill that is already covered. Show the current phase if the layer is moving; do not replay historical deposits to teach the loop. If the bill has finished, offer the ride and the next eligible job. Never undo a friend's work to manufacture a personal introduction.

### Together-only moments, without together-only progress

**Hypotheses to separate:** a short pass lets one person's action visibly help the other; an optional long beam makes bodies coordinate; boarding the layer lets both stand on their combined work; a visible arrival gives them something to honk about. The first two need new mechanics; the latter two reuse the strongest solo moments.

A carrying chain is not automatically efficient. On a straight route, splitting the same distance among people preserves much of the person-distance and adds handoff time. It earns a place only if a corner, convenient receiver or shared rhythm makes it pleasant. Keep the walking route and back bundle intact. An optional long object should still move alone and should never spill or destroy the paid material. It is a later experiment, not infrastructure required for the first shared station.

Start a launch-warning comparison around **2–3 seconds**, a hypothesis to tune against actual boarding distance. Use the feeder's movement, the layer's sound and a readable departure; do not wait for all players or revive a long ceremony. On finishing, put the readable change where riders and nearby carriers can see it, keep control, and allow voluntary honks. [Honk](../../src/features/honk.ts) already supports shared harmony, but its special chord needs three distinct players: a two-player test must not expect that effect without an explicit variant.

## Online feel is part of the construction design

### The gap to the solo reference is real, but not measured end to end

[Place chopping](../../src/proto/place/chop.ts) begins the swing on input and contacts bark at about 60 ms. Its [local unloading](../../src/proto/place/index.ts) removes cargo locally and uses piece-arrival callbacks to advance stock. That gives a useful feel reference and **cannot become shared authority by broadcasting the animation**.

[World sync](../../src/world/sync.ts) uses 100 ms ticks, stamps online edits three ticks ahead, and targets clients 1.5 ticks behind the host. That is a 300 ms scheduling lead and a 150 ms client target lag in the configuration, not a measured 450 ms total input delay: tick phase, transport, clock correction and client catch-up also matter. `submitEdit` returning true means queued/sent, not accepted; reconnecting edits may be held and later discarded. A validation failure is not guaranteed to produce an `onApplied` callback.

**Hypothesis:** retain immediate, reversible intent feedback while making material success authoritative. Test it against the Local reference before adding more scenery or increasing yields to disguise waiting.

| Action         | Immediate Local response                                     | Only after accepted application / shared state                                         | Failure or contention                                                 |
| -------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Chop           | Swing, whoosh, target focus; no promised inventory           | Accepted yield, depletion/fall, material arc and count                                 | Finish the harmless swing; no phantom logs or second fall             |
| Deposit        | Reach/lean and frame focus; optionally a clearly pending cue | Accepted amount leaves the back, fills identified slots and produces its success sound | Unaccepted cargo stays on the back; a full frame visibly explains why |
| Pass           | Offer and receiver readiness                                 | One atomic transfer of the accepted amount                                             | Retain cargo if receiver leaves, fills or releases                    |
| Layer start    | Feeder can telegraph that completion is approaching          | One start tick and one shared material allocation                                      | Duplicate requests cannot restart or consume again                    |
| Join/reconnect | Current-objective cue after state is ready                   | Reconstruct accepted counts and current machine phase                                  | Drop obsolete pending visuals; do not replay old rewards or pours     |

There is a real tension here: waiting for accepted chip/yield feedback may make a previously satisfying chop feel disconnected. The first experiment must expose that. If it fails, design bounded visual anticipation and reconciliation, rather than quietly minting spendable predicted cargo. Keep pending capacity separate from spendable inventory so repeated input cannot overbook the back. Pending work must not leave the UI stuck indefinitely after rejection or reconnect.

**Future protocol requirement, not an existing API:** a correlated terminal outcome for an action that needs a pending cue, covering both accepted amount and rejection/cancellation. A validated request token may identify a request; only the server's stamp/order determines material results. Duplicate retry handling and cleanup need bounded lifetimes and reconnect semantics. Do not use client wall clocks, local counters or animation completion as simulation authority. The exact receipt design belongs in the rail implementation/net review; this research does not prescribe changing global sync constants or transport.

### The last log must not become a race for ownership

Suppose a frame contains 23/24 logs. A and B each carry four and both ask to deposit four. Both requests might pass validation before either is applied. In shared `(tick, sequence)` order, the first application accepts **one**, leaving that player with three; the second accepts **zero**, leaving four. The frame becomes full once and starts one run. No seven logs disappear, no refund depends on a visual callback, and the person who happened to arrive last gets no special ownership or better reward.

[Existing site rules](../../src/world/rules/sites.ts) already provide the relevant shape: `site.stock` recomputes the pourable amount during apply and takes only that amount; `site.run` rechecks whether starting is still possible. [Source rules](../../src/world/rules/sources.ts) similarly bound accepted extraction. These are precedents, not proof that the proposed rail rules have implemented the race. Recheck resource/carry/recipe caps in apply even after validation; host environment facts remain validate-only.

The same rule applies to two final axe strokes: remaining source yield is conserved, not granted to both because both saw an intact tree. Test both people targeting the same tree as well as different trees. A rejected final stroke should look like a harmless overlapping swing, not a broken action or stolen reward.

For a late snapshot, reconstruct filled slots, the feeder/cradle, already laid pieces and machine phase from saved descriptors. Do not create a second material copy because a log is between the frame and machine. The plan needs explicit conversions between material units and authored pieces: the present prototype's twelve starter rails and many rendered pieces are not a demonstrated one-log/one-mesh accounting scheme. **Visible continuity and conserved quantities are separate checks, and both matter.**

### Compare the architecture to standard engines

| Official precedent                                                                                                                                                                                                                                                                                                                                                 | What Boogle should take from it; where Boogle differs                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unity Netcode for GameObjects [client anticipation](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/client-anticipation.html) separates anticipated visual values from authoritative values and offers correction/smoothing                                                                                             | Make input responsive without treating presentation as inventory. This API is not a promise of automatic full rollback/replay. Boogle uses its own deterministic edit stream and Local effects, not NGO variables.                  |
| Unreal [property replication](https://dev.epicgames.com/documentation/en-us/unreal-engine/property-replication-in-unreal-engine?application_version=5.2) replicates authoritative server state; intermediate value changes need not all be observed                                                                                                                | A current stock value reconstructs a joiner, but is not a complete event history for deposit effects. Boogle already has ordered accepted edits plus snapshots; derive effects from accepted results and reconstruct joins quietly. |
| Godot [high-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html) distinguishes authority and any-peer RPCs, with sender identity available; [MultiplayerSynchronizer](https://docs.godotengine.org/en/stable/classes/class_multiplayersynchronizer.html) synchronizes configured authority-owned properties | A client request is not authority. Validate the sender and action. Boogle deliberately synchronizes persistent construction through server-stamped rules, rather than ordinary node-property replication.                           |

Keep player motion and optional carried-object physics Owner, persistent materials Lockstep, and arcs/dust/audio Local. Reuse stable shared platforms in [platforms.ts](../../src/physics/platforms.ts) and the existing deck-relative `riding` presence in [remote-player](../../src/entities/remote-player/index.ts). Two people riding a deterministic layer need no second train-pose broadcast or per-log rigid-body simulation. If a later co-carry variant uses physics, one owner simulates the object; a second player's participation cannot mean two authoritative Rapier simulations pulling it independently.

## Recommendations and smallest two-player prototypes

These are ordered experiments, not a twelve-feature implementation brief. The first shared station needs recommendations 1, 11 and 12 together to produce trustworthy evidence. Most other variants can then be compared one at a time. The [rail-slice plan](../plans/rail-slice.md) still requires its own approval before implementation. Each gut question below is the single owner-facing question for that variant; the builder checks edge cases separately.

### 1. Establish the unchanged shared-station baseline

**Hypothesis:** two people enjoy the proven job more even with no new co-op mechanic. Serve DESIGN 1 and 4. Use [place's current numbers](../../src/place/layout.ts) through [rail-slice step 2](../plans/rail-slice.md#steps): one grove, one 24-log frame, twelve-log backs, one layer and a rideable result. Compare the same route solo and as a pair; keep cost, movement and yield fixed. Observe voluntary help and shared attention as well as elapsed time. A single enthusiastic pair is a direction signal, not validation for eight people.

**Smallest two-player prototype:** two actual people complete that frame and ride, then repeat once with the other person arriving first. No relay, larger bill or new reward. **What's new:** “Your logs now build the same track.” **Gut question:** “Did having your friend there make that job better?”

### 2. Let visible work and access divide the jobs

**Hypothesis:** readable backs, frame stock and several usable approaches are enough for spontaneous division and switching. Serve DESIGN 4 and 7. Touch [place's station presentation](../../src/entities/railway/stations.ts), the [interactable contract](../../src/player/hands.ts) and the planned shared station; keep one bill and one destination. Wider access does not mean a fixed chopper, porter or operator.

**Smallest two-player prototype:** compare one frame with a narrow approach against the same frame reachable from two sides; start both people with empty backs and offer no job assignment. Check whether either can switch from chopping to depositing without displacing the other. **What's new:** “There is room to help from either side.” **Gut question:** “Could you see a useful thing to do without asking?”

### 3. Keep the bill fixed when friends arrive or leave

**Hypothesis:** help should shorten the material job, while shared rides and machine work provide time together. Serve DESIGN 8. Preserve the fixed-cap call in [rail-slice authority](../plans/rail-slice.md#authority-and-the-production-seam), with recipe counts from [place layout](../../src/place/layout.ts). Scale physical access and later authored structures, not today's bill by attendance. Revisit content pacing only after observing 4, 6 and then 8 people.

**Smallest two-player prototype:** A starts the 24-log frame, B joins at half-full, then leaves before the next frame. No cost changes at either boundary; A completes the next frame alone. **What's new:** “A joining friend never adds to the bill.” **Gut question:** “Did your friend joining feel like help?”

### 4. Bring network freight forward before increasing carrying capacity

**Hypothesis:** the late errand is a supply-location problem before it is an inventory-size problem. Serve DESIGN 1 and the core rail loop. Compare the existing home-rack return in [place](../game-design/place.md) with one visible delivery to the frontier in [planned supply/service](../plans/rail-slice.md#authority-and-the-production-seam); retain a real final carry, project reservations and physical unloading. Do not add a dispatcher or a new transport minigame.

**Smallest two-player prototype:** at one later station, deliver the same paid cargo to a nearby rack by the existing train; both friends carry the short final leg. Compare to fetching it from home, without changing capacity or recipe. **What's new:** “The line brings this load closer.” **Gut question:** “Did the railway feel like it was helping you build the next bit?”

### 5. Try a voluntary short relay, with no loss on a missed pass

**Hypothesis:** directly helping a friend move a load adds shared rhythm beyond parallel hauling. Serve DESIGN 4 and 10. Add an experimental offer/accept interaction through [hands](../../src/player/hands.ts); extend the [planned supply model](../plans/rail-slice.md#authority-and-the-production-seam) with an atomic transfer only if this variant is built. Do not steal from a back or auto-feed an unwilling receiver. A failed or cancelled pass leaves material with the sender.

**Smallest two-player prototype:** one forgiving, short pass near a frame, accepted while the receiver is ready; walking the entire route stays equally valid. Swap positions after one load. No free-standing log physics or conveyor-chain framework. **What's new:** “You can pass your friend the last few logs.” **Gut question:** “Was passing the load fun enough to do again?”

### 6. Reserve co-carrying for one optional awkward object

**Hypothesis:** a beam carried together creates bodily comedy unavailable from separate backpacks. Serve DESIGN 2, 8 and 10. This is a lower-priority variant after the baseline, not a rail dependency. Use [owner-sync](../../src/netplay/owner-sync.ts) for one optional physics object, with an explicit helper attachment/intent if needed; keep its contribution outside persistent recipes for the first test. No hazards, material loss or precision grip.

**Smallest two-player prototype:** move one harmless long beam around a corner beside the station; either person can move it alone and either can let go immediately. Keep the normal log job available. **What's new:** “You can carry this silly beam together.” **Gut question:** “Was sharing the awkward object funnier than moving your own load?”

### 7. Credit accepted help equally and let everyone use the result

**Hypothesis:** visible contribution and a useful common route give recognition without competition over the final log. Serve DESIGN 4 and 6. Use the contributor set proposed in [rail projects](../plans/rail-slice.md#authority-and-the-production-seam), accepted material arcs and [place's pieces](../../src/place/pieces.ts). No sorted totals, contribution tiers, exclusive seats or last-depositor reward. Do not invent a personal reward economy before its separate verdict.

**Smallest two-player prototype:** A supplies twenty logs and B four; acknowledge both in the same style and let both ride. Reverse who makes the final deposit on the next attempt. **What's new:** “The track remembers both helpers equally.” **Gut question:** “Did it feel like something you both made?”

### 8. Make boarding and finishing a moment friends can notice

**Hypothesis:** the best shared payoff already exists in riding the layer, if departure and arrival are readable. Serve DESIGN 7 and 8. Touch [place's layer/finish orchestration](../../src/proto/place/index.ts), [shared platform presentation](../../src/physics/platforms.ts) and [honk](../../src/features/honk.ts); derive the start from one shared tick. Try a short mechanical warning, not an all-ready gate, forced camera or restored ceremony.

**Smallest two-player prototype:** A makes the last deposit while B is nearby; give both time to step aboard, let them ride the build, then make the actual line opening visibly and audibly land. Check the same sequence alone. **What's new:** “The layer gives you a moment to hop on together.” **Gut question:** “Did that finish feel like a moment you shared?”

### 9. Give a mid-build visitor one honest next action

**Hypothesis:** a current destination, current stock and another person's example can teach the job without replaying the opening. Serve DESIGN 7 and 8. Use [planned snapshot reconstruction](../plans/rail-slice.md#authority-and-the-production-seam) and the small objective/beacon in [place](../game-design/place.md). Respect hub arrival and return-location decisions; no teleport-to-friend assumption. Distinguish delivered and reserved goods where the latter affect what remains useful.

**Smallest two-player prototype:** B joins when A has stocked 16/24; B reaches the frame from the normal arrival and makes a useful accepted delivery. Repeat with B joining during the lay, when riding/next work is the honest invitation. **What's new:** “The current job is clear when you arrive.” **Gut question:** “Did you know how to join in?”

### 10. Leave the remaining player a pleasant, complete solo job

**Hypothesis:** stable costs and trustworthy persistence matter more than replacing the departed person with a worker. Serve DESIGN 8 and 9. Follow [rail-slice carry, claim and absence rules](../plans/rail-slice.md#authority-and-the-production-seam): personal raw harvest persists; project freight claims return exactly once; a running layer continues; an empty room has one bounded project allowance, not automatic hauling or a chain of new builds. The cap's precise interpretation remains draft guidance.

**Smallest two-player prototype:** B leaves with a freight claim while A is stocking; A can reclaim that project cargo and finish. Then A leaves during the lay and returns to its correct completed state. Also verify B's personal raw logs were not confiscated. **What's new:** “Your friend's departure never strands the build.” **Gut question:** “Was it still pleasant to finish after your friend left?”

### 11. Preserve immediate intent feedback while waiting for accepted materials

**Hypothesis:** prompt swing/reach feedback plus clear accepted results can retain the solo feel across the shared pipeline. Serve DESIGN 1 and 7. Use [chop](../../src/proto/place/chop.ts) as the reference, [sync](../../src/world/sync.ts) as the measured path and [rail-slice's authority boundary](../plans/rail-slice.md#authority-and-the-production-seam) as the contract. If pending cues are necessary, specify their rejection, retry and reconnect lifecycle before shipping them; do not equate a successful submit with a successful cut.

**Smallest two-player prototype:** both chop and deposit under ordinary local networking and controlled added delay/jitter, measuring input→swing, input→accepted yield and accepted deposit→visible stock separately. Swap which client is delayed. Deliberately reject an action and reconnect during one. These are agent checks, not a checklist for the owner. **What's new:** “Shared chopping keeps the immediate swing.” **Gut question:** “Did the shared chop and deposit still feel as good as the solo version?”

### 12. Make the final cut, deposit and start atomic

**Hypothesis:** players will forgive a visibly full frame more readily than vanished logs, duplicated timber or a second machine launch. Serve DESIGN 5 and clear authority. Apply the bounded-transfer pattern from [sites](../../src/world/rules/sites.ts) and [sources](../../src/world/rules/sources.ts) to the [proposed rail rules](../plans/rail-slice.md#authority-and-the-production-seam). The ordered accepted result alone changes quantities, contributor credit and run state.

**Smallest two-player prototype:** both deposit four at 23/24, then both hit the last source yield. Reverse arrival order under delay and reconnect during the accepted material's flight. Inspect conservation, one run and matching reconstructed phase; guard those invariants with pure rule tests and a sync scenario when implementing, as permitted by [AGENTS.md](../../AGENTS.md). **What's new:** “The last log is safe to deliver together.” **Gut question:** “Did the last delivery feel fair?”
