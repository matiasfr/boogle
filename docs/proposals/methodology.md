# How to grow Boogle: working methods from designers

*Proposal, 29 October 2026. Working habits drawn from the designers in [progression-feel-exploration.md](../research/progression-feel-exploration.md), turned into steps that fit how this repo already works ([AGENTS.md](../../AGENTS.md), `/look`, scenarios, proto flags, playtest notes). Updated 30 October 2026 for `main` at `8b3517c`.*

## 0. Respect what's decided, fix the plumbing first

- **The owner's decisions in [docs/tech-plan.md](../tech-plan.md) win.** Keep the caves, The Boogler and the video pipeline. The server stack is pending the owner's call. Reviews and cut lists respect these until the owner changes them.
- **Persistence before progression.** The [communal-progression report](../research/communal-progression.md) found that the snapshot server may not be deployed, and that `world.epochMs` is never read, so nothing grows while nobody hosts. Any "leave something for the next visitor" feature needs the server and a capped, grow-only `world.catchup(n)` op first.
- **The tech plan's Wave B comes first for new Lockstep systems.** Once B1 (rules modules) and B2 (the replay test) land, a new state such as the book's ledger should follow that pattern, with an edit generator for the replay test.

## 1. Design the phases, let the lore fall into place

Townsend "knew which phases I wanted to include but not the narrative that would go with them". Each phase should zoom the world out ("Chinese box").

- Write a phase as a one-line change in what a session *feels* like. For example: "the island has a shop", "you can leave the island", "the island talks back".
- Write The Boogler's lines for it last, once the toy works. Keep them as data in `src/boogler/lines.ts` style.
- Don't fix the ending early. The [tech tree's](boogler-tech-tree.md) back cover offers three.

## 2. Toy test, then reveal

Every feature passes DESIGN.md's toy test first: "would someone fiddle with this for a minute with no score?" Then decide how it *arrives*.

- Hide it until a milestone, and land it as a surprise (Candy Box: "this surprise aspect is what I'm trying to achieve").
- Time the arrival for when players are about to reach the next obvious goal (A Dark Room: "just as you're reaching the required resources for the next hut").
- Give every new thing an in-world telegraph before it opens, like a stuck page's corner or steam on the horizon (principle 7).
- Allow one joke per chapter that does nothing (aniwey's "useless features").

## 3. Build behind a proto flag, play it on the live site

The old room-wide prototype flags (`src/adapters/proto-flags.js`) were removed 2026-10-31; a new slice brings back a small URL flag of its own. Each tech-tree page or direction slice goes in behind a flag (`?proto=stall`). That way:

- it ships with `npm run ship` (a self-merging PR once CI is green) without changing the default game;
- the group plays it on purpose;
- it is easy to drop if the playtest says no.

## 4. A feel pass for every interactive thing

From Swink, England, Jonasson & Purho, and Nijman:

- **Response under 100 ms**, from input to something visible.
- **Layer small tweaks**: sound, particles, a squash, a camera nudge. Each one is tiny, and together they make the feel. List them in the commit body.
- **Fake what physics gets wrong** (Lonely Mountains). Write down every cheat in a comment at the top of the module.
- **Readability over truth** (TotK's enlarged board).
- Check it with `/look` motion sheets and a scenario in `dev/scenarios/`. Read the images, then iterate.

## 5. Level design: scenic route, shortcuts, triangles, heatmaps

- For any new area, draw the **scenic route** past every landmark, then add official, semi-official and unofficial shortcuts (Lonely Mountains).
- Place **large landmarks visible from spawn**, **medium shapes that hide** what's behind them, and **small ones for pacing** (BotW's triangle rule). Use collectables to pull players toward new ground (A Short Hike).
- **Use heatmaps the way Nintendo did.** BotW's team saw play concentrated on a few paths and redesigned until the heatmap was "more well distributed". `npm run look` heatmaps show motion, not where players walked. A small `?netdebug`-style logger of player positions during a playtest, drawn over the island map, would give the same before-and-after check.

## 6. Make the game notice (reactivity)

Hades weights pre-written events by game state, so "you feel the game is paying attention".

- Give The Boogler a pool of lines keyed on island state: a page just opened, the jar is almost full, someone capsized, it's your first visit in a week. Pick from it with weights.
- Write more of them than any one player will see ("we try to create as many as possible").
- Keep the choice of line Local (cosmetic randomness is fine). Only the facts it reads come from shared state.
- On join, show what changed *in the world* and who did it: a plaque, a pulsing lamp. The communal report's test is that a returning player feels grateful to a friend within 60 seconds.

## 7. Incremental maths, the Boogle way

- **Costs:** an integer table or an integer step (`c = Math.floor((c * 115 + 99) / 100)`). Never `Math.pow` or `**` in Lockstep code. Unit-test that the table is identical every run, and that a snapshot round-trips the counters.
- **Rates:** base × a stall-level multiplier × a distinct-visitor multiplier, all in integer percentages.
- **Offline growth:** computed from elapsed ticks on load, capped. Test that the same elapsed time gives the same result in one step or in many.
- **Show it as things:** jars, awnings, taller trees. Not HUD numbers (Lantz).

## 8. Anti-patterns to reject in review

- A cooldown that stops you playing (Cow Clicker's "once every six hours").
- Paying, or grinding, to skip play (Bogost: "you can buy out ... so that you don't have to bother to play").
- Obligation: something that is *lost* if you don't come back. Stardew considered a demolition deadline and dropped it before release.
- A golden path everyone must follow (Soren Johnson: "there is no longer a golden path").
- Decay while away. Grow while away, never decay (communal report, from Animal Crossing's history).
- A goal that asks for a particular shape of sand (communal report: keep sand as a toy).
- Visible counters. Townscaper: "when you keep score, you play to the score".
- A full-screen tutorial (Shouldice: "deeply invasive").
- Following every feature request (Bogost: "listening to them too much and not pushing them hard enough").

## 9. Small, fast, playable

- **PEAK** went from jam to launch in about four months; Kaman's advice is "don't spend three years".
- **A Short Hike** took "four months" by design, with scope kept "really small".
- **R.E.P.O.**: "Let's just fail quickly this time."

For Boogle: each slice in [directions.md](directions.md) should be playable within a week. Note the playtest answer in `docs/playtests.md` before starting the next slice.

## 10. Every slice states its question

Following PLAN.md's habit, each page or slice ends with one playtest question. For example:

- "Do people come back to see what The Boogler bought?"
- "Does anyone race down the hill twice without being asked?"
- "Does anyone write back?"

If the answer is no twice in a row, cut it or change it. Don't add rewards to prop it up (principle 1).
