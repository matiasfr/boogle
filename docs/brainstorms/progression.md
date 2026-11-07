> **Status: proposed, partly answered (owner, 2026-11-05).** Answered: crystal (3), paper before code, ability upgrades. Still open: route (1), double jump (2), upgrade kinds (4), first proof (5).

# Progression: places and the upgrade tree

_Note added 6 November 2026: the owner moved the main-game target to roughly six hours, a rough target rather than a rule, with solo and groups of two or three close together ([decision log](../proposals/boogle-2.md#the-shape-of-the-game)). Read eight-hour figures below as the earlier target._

Sources: [next-destinations](../research/next-destinations.md) and [upgrade-economy](../research/upgrade-economy.md) research, two brainstorm panels (destinations, then a freer places panel), and the owner's direction on 5 November:

- materials replace eras, so the world never changes era;
- big areas unlock a resource that works as a component upgrading several systems;
- smaller areas carry puzzles, abilities and discovery;
- upgrades come in kinds: flat gains, convenience, personal abilities and movement, and meta systems;
- don't stick to the old concept places.

**Pitch.** The journey alternates big projects and small discoveries. Each big area is a striking place you have to solve to reach, often a built one rather than a landscape. Opening its railway connection gives you a material you first see working locally, such as a crane lifting the awkward bundle you just wrestled. Then your one railway carries it home, where it upgrades several familiar things at once. Small stops between big areas teach a move or a combination, offer a view, and make a short trip home. Progress reads as **work friends once did by hand becoming work their shared machines now do**. This serves DESIGN.md's **Toys before chores** and **Show, don't tell**.

**Gut question.** Did seeing a new material's first fitting work make you want it on the rest of your railway?

Variants differ in one thing: the material's first use is **demonstrated where you find it**, or **only after it's exported home**.

## Best suggestions

1. **One material, several visible uses** (all sources). The upgrade research classifies 22 candidate installations. Fibre, for example, becomes:
   - bigger carrying slings;
   - crane straps that remove hand-unloading;
   - glider cloth;
   - town awnings.

   Steel becomes better boilers, bigger wagons, loading machinery and junction hardware. Each material spans several kinds of upgrade, with no fixed checklist per area.
2. **Upgrade kinds as a vocabulary** (upgrade research, extending the owner's four):
   - **F, flat gain:** carry more, chop faster;
   - **C, chore removal:** a crane unloads for you;
   - **A, personal ability**;
   - **M, a new system:** network, resource hubs, town services;
   - **R, permanent route:** a span, pier or lift;
   - **E, expression:** awnings, displays.

   Each fitting has one main kind. This is a vocabulary, not six currencies or six menus.
3. **The rhythm:** notice a limitation, see a local transformation, export it, explore with it, then choose a bigger service. The first fitting's benefit lands within 2–5 minutes of handling a new material.
4. **Solved places stay useful** (all three panelists). Gates latch, routes stay open, and earlier places keep contributing ingredients. Every main-route solution works for a solo player after a friend leaves.
5. **Bold places beat landscapes** (places panel):
   - **Hanging Glasshouse:** giant suspended baskets and roof shutters, hook and glide.
   - **Split Shell or Folded Coast:** a cracked limestone island explored vertically, giving cement.
   - **Great Exhibition or Ringworks:** a fair around an engine too big for its exit, with linked gates, giving steel.
   - **Small stops:** a sail-testing tower, bell terraces, a broken observatory with a telescope glimpse of the ending.

## Tensions

- **How many big areas, and which?**
  - **Research route:** chalk coast (cement), steel harbour (steel), suspended coast (crystal), port (copper), then the original island.
  - **Places panel:** three big areas, Glasshouse (fibre), Split Shell (cement) and Exhibition (steel), with small stops between them.

  Recommendation: the panel's three big areas plus small stops. They're more distinctive, they fit eight hours with room for discovery, and they match your call to be bolder. Keep crystal as an idea for one exceptional crossing, not a whole area.
- **Where abilities come from.**
  - **Research:** keep the starter's double jump, hook and glider.
  - **Panel:** move the glider and double jump to small stops.

  Your round 4 note asked for "double jump later in the game". Recommendation: the double jump moves to a small stop; the hook and glider stay on the starter island, where they're already tuned.
- **Repeated puzzle formats:** one substantial linked-gate puzzle is great, but three become a ritual. Recommendation: each big area gets its own kind of puzzle: traversing the Glasshouse, vertical routes in the Shell, and rearranging the Exhibition's machinery.

## Shape

- **Sync:**
  - resources, fittings and puzzle facts are lockstep and durable;
  - machine motion reads accepted state;
  - new operations are additive and versioned.
- **Reuse:**
  - the production railway's transaction pattern, for consuming and installing atomically;
  - an authored upgrade catalog: each fitting names its ingredients, socket and effect;
  - all costs and timings as tunables.
- **Simulation first:** extend `dev/economy/model.ts` with stock, purchase choices and overlapping deliveries before building, so pacing is checked on paper. The upgrade research lists what it needs.
- **Smallest first build:** one gate chamber and one material producing two different useful fittings, demonstrated locally then exported. Then stop for your verdict.
- **Risks:** too much content before that payoff proves itself; eight hours of authored activity that may not exist yet (the research says to measure, not inflate costs); and production core must come first.

## Done means

- A paper simulation of the chosen route shows each hour's mix of upgrade kinds, and whether the authored activity fills it.
- In the first build, a material's local fitting visibly removes a chore in real-time capture. Exported home, the same material installs a second, different fitting.
- Everything works solo after a friend leaves, and a late joiner gets the shared capabilities.

## Open questions

1. **Route:** three bold big areas with small stops between them? **Recommended: yes, Glasshouse (fibre) → Split Shell (cement) → Exhibition (steel), then the old island.** The alternative is the research's five-area route. Answer: ___
2. **Double jump:** move it to a small stop later in the game? **Recommended: yes; the hook and glider stay on the starter island.** Answer: ___
3. **Crystal:** keep your liked crystal pillars as one exceptional crossing, rather than a whole area? **Recommended: yes.** Answer: **yes, maybe a deep-sea crossing between certain islands** (owner, 5 November).
4. **Upgrade kinds:** adopt F, C, A, M, R and E as the vocabulary? **Recommended: yes.** Answer: ___
5. **First proof:** which material first? **Recommended: fibre at the Glasshouse. Two friends wrestle a loom spindle through the shutters, then a crane loads an even bigger bundle for them.** Answer: ___

## Owner additions, 5 November

- **Paper before code:** simulate as much of the progression and economy as possible first, especially the rail network if it's added later.
- **Abilities get iterative upgrades:** double jump, glider and hook are each upgradable over the game. Examples: extra jumps, glider speed, a longer hook, and different kinds of hook. These are kind A or F upgrades spread across areas, not one-time awards.

## Parked

- The port and a bounded electric corridor.
- Copper.
- A sledge or breach verb at a small stop.
- Little workers inspecting delivered bundles, after a yes.
- Cloth simulation and growing crystal foundations, which cost a lot for an unproven gain.

**Disposition:** design now. Simulation and the first build come after production core and the replay, and stop at your verdict.
