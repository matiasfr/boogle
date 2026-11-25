# Friends dropping in: ideas for more fun together

> **Parked (17 November 2026).** Ideas only; nothing here is decided, planned or owed, and it binds no one. Current design: [DESIGN.md](../../DESIGN.md) and the [decision log](../decisions.md). An idea the owner commits to becomes a row in [backlog.md](../backlog.md).

*Proposal, 17 November 2026. The owner asked what might make the game more fun for drop-in multiplayer among friends, given the game as built and the backlog. Owner, the same day: "I really like a lot of these". Written from DESIGN.md, the backlog, the 9 and 10 November co-op playtests and the co-op research already in [docs/research/](../research/README.md), plus one outside research pass (sources at the end). Read from docs, not checked against code or in play.*

## The gap

Co-op today is friends doing the same errand side by side. On 9 November two players ran wake to Far Head in 13 minutes, so friends shorten the work, but nobody needs anybody and nothing funny is set up to happen. The [Design Table call](../decisions-core-loop.md#d-2026-11-02-the-call-on-the-design-table) already named the fix: "finding the friction and complementary tasks that let two people split off", and rough proximity voice. Neither is built; voice is room-wide ([social](../game-design/social.md#voice-chat)).

What the outside sources add:

- **Needing each other adds to a shared goal.** A shared goal and complementary abilities each raise closeness and enjoyment, and the effects stack (Depping and Mandryk, 2017).
- **Visible failure is the fun.** Commentary on Peak and R.E.P.O. puts the laughs in spectacular failure with friends watching.
- **Signals need a reply.** Deep Rock Galactic's team found a one-way ping was not enough and added the salute.
- **Time to laughter matters for joiners.** Jackbox treats every step before the first laugh as friction.

## The ideas

Timing is relative to the backlog as it stood on 17 November: **now** needs nothing in it, **after** is better once the named row has shipped, **decision** needs an owner call first.

| # | Idea | Timing |
| --- | --- | --- |
| 1 | **Two-person carries as comedy.** Big loads (boiler, great beam, footings) steadier and faster with a friend, wobbly and cheap to drop, still possible alone. The 10 November boiler haul was the one true co-op beat, and Help carry kept letting go | decision: the open beam-carry choice ([comparison](../research/beam-carry-godot-comparison.md)) |
| 2 | **Throw things to each other.** Toss logs and rails to a friend to catch: a bucket brigade across a gap or up a ledge | decision: [carrying research](../research/carrying-and-logistics-play.md) says keep the bundle reliable |
| 3 | **Throw your friend.** Boost or launch a friend to a ledge or across a gap | prototype only; the riskiest to sync and the easiest to make annoying |
| 4 | **Voluntary train crew jobs.** One works the loader or a points lever while another rides or feeds the track-layer's magazine. The linked-gate freight yard in [coop-puzzles](../research/coop-puzzles.md) is the ready prototype | after: turnouts, the railhead traveller |
| 5 | **A "what next" board at Home.** Each friend pins a pick for the next connection or garage install | after: garage choices |
| 6 | **Falling off a train is a show.** A big splash, an automatic "Look!" for friends, a silly rescue back to the line | now |
| 7 | **Proximity voice.** The per-friend volume seam exists (`peerVolume`); iOS needs WebAudio routing. A train whistle or megaphone for long range | now |
| 8 | **See where a friend is looking.** Sync Buddy's head and gaze | now |
| 9 | **A reply to the ping.** A salute or "on my way"; or a honk near a ping counts as the answer | now |
| 10 | **Rail-aware ping labels.** "Rails here", "Train coming", beside "Ball!" and "Look!" | now |
| 11 | **Station bell beckon.** Ring it and friends see a ring on the horizon; parked in [coop-abilities](../brainstorms/coop-abilities.md#parked) | now |
| 12 | **Arrive by train where your friends are.** A joiner steps off the next train at a friend's railhead. Also helps the minute or two lost after each deploy reload ([resume-where-you-were](../plans/resume-where-you-were.md)) | after: the greybox route |
| 13 | **A job that needs no knowledge.** Something useful a newcomer does at once beside a veteran. Weak: chopping already is one, and idea 12 is the real fix | low |
| 14 | **The ride is the recap.** A veteran takes the newcomer down the built line while a conductor points things out. Weak: act cards and idea 15 cover most of it | low |
| 15 | **A welcome-back board at Home station.** What was connected while you were away and who was there, unranked ([Thanks](../decisions-core-loop.md#d-2026-11-02-thanks)). The classic island had this; the railway room does not | after: accounts |
| 16 | **Honks left on things friends built.** Tap a station board to leave one; the builder hears them on return. Free, with no negative option | after: accounts |
| 17 | **Postcards and gifts.** A note on a station board, or a hat in a crate for a named friend | after: accounts, the wardrobe (Grant's P3 batch) |
| 18 | **Things to do while seated on the train.** A playable whistle in the honk chord's key, leaning out, throwing a hat between cars | after: the greybox route |
| 19 | **A toy at every station.** The ball and frisbee stay behind at the start; the RC cart races in [ideas](../ideas.md) fit here | after: the greybox route |
| 20 | **Group photo at each new connection,** hung in the Home hall as the room's record | after: the Round |
| 21 | **A shared opening ritual.** Everyone present pulls the whistle when a line connects, growing with head count like the honk chord | now; sits on [cutscenes for everyone](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone) |

**25 November 2026:** ideas 7, 9 and 10 (voice, a ping reply, rail-aware labels) are a backlog row, with proximity voice off by default (owner: "Although let's have proximity chat off by default so everyone can hear each other"). The rest stay parked.

## What to try first

1. **Proximity voice plus a ping reply** (7, 9): small, already asked for, and it changes how every other minute feels.
2. **Arrive by train plus the welcome-back board** (12, 15): the two that target drop-in directly.
3. **One deliberately funny two-person carry on the boiler** (1): a bounded test of whether needing each other fixes "errands". Finishing the backlog answers "no decisions" through the garage and the town economy, but no row in it makes friends need each other.

## Limits

- [DESIGN.md](../../DESIGN.md) principle 8 keeps drop-in secondary (7 November): everything stays possible alone and tuned for one to three players.
- Co-op mini-games wait until the rail loop has its answer ([decision](../decisions-core-loop.md#d-2026-11-02-mini-games-pass)).
- The evidence is uneven. The academic findings and the Jackbox, Deep Rock, Death Stranding and Journey quotes were read at source or in summaries; several Peak and R.E.P.O. developer quotes were seen only in search excerpts. No published join-flow data was found for browser party games.

## Sources

- Depping and Mandryk, cooperation and interdependence (summary): https://blogs.tuni.fi/playlab/game-research-highlights/how-to-design-games-that-promote-social-closeness-between-players/
- El-Nasr et al., Understanding and Evaluating Cooperative Games (CHI 2010): https://dx.doi.org/10.1145/1753326.1753363
- Deep Rock Galactic, "A Song of Rock and Stone": https://devtrackers.gg/deep-rock-galactic/p/43cb6d0d-a-song-of-rock-and-stone
- Jackbox's CEO on time to laughter: https://www.nintendolife.com/features/time-to-laughter-is-like-zero-jackbox-games-ceo-on-quiplash-t-shirts-and-10-years-of-party-packs
- Aftermath on Peak: https://aftermath.site/peak-multiplayer-streamers.md
- Nick Kaman on Peak, Inverse: https://www.inverse.com/gaming/peak-steam-landcrab-friendslop-update-interview-nick-kaman-pc
- Kojima on Death Stranding's social play: https://www.gamedeveloper.com/game-platforms/kojima-details-the-subtly-social-gameplay-of-i-death-stranding-i-
- Jenova Chen on Journey: https://mcvuk.com/development-news/jenova-chen-reveals-secrets-of-journey-design/
- Animal Crossing and loneliness (2021): https://www.frontiersin.org/articles/10.3389/frvir.2021.627350
- Ducheneaut et al., Alone Together? (CHI 2006): https://www.nickyee.com/pubs/Ducheneaut,%20Yee,%20Nickell,%20Moore%20-%20Alone%20Together%20(2006).pdf
- Respawn's muted-mic playtests for Apex pings: https://gamedeveloper.com/design/respawn-played-with-muted-mics-to-get-i-apex-legends-i-smart-comms-system-just-right
