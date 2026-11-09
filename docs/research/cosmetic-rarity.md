# Cosmetic collecting and rarity, with no real money

> **Verdict:** Three rarity tiers, 48-item wardrobe, generous saved guarantees, no real money.
> **Top recommendations:** 1. Use three tiers with a generous upward surprise: Common boxes 60/30/10. 2. Guarantee the first Wonder by result three and later Wonders by result six, saving one personal counter across sessions. 3. Prevent same-tier repeats while an eligible item is unowned; turn three exhausted-tier results into a missing-item choice.
> **Status:** open. See [rewards-rarity-gacha](rewards-rarity-gacha.md).

_Research report, 2 November 2026. Earned boxes, personal wardrobes, readable rarity, finite collections and inexpensive cosmetic production for an approximately eight-hour Boogle campaign. Live web research and a code audit at `cec137f6`; recommendations, not implemented behaviour or an approved build plan. Serves **DESIGN.md 6: Communal world, personal rewards**._

**Recommendation:** start with three tiers, a 48-item campaign wardrobe, generous saved guarantees and no useless duplicate inventory. Give each friend their own result from the same shared accomplishment. Make the result immediately wearable and recognizable in motion. For round 4, prove nine character cosmetics; train customization follows the roundhouse.

**Verification.** **[V]** means fetched primary-source text or inspected repository code. **[S]** means search-index evidence or a secondary source, explicitly identified. **[I]** means a Boogle proposal, inference or calculation. No reference game was played, reveal timed or GDC recording watched for this report. All proposed quantities, probabilities, timings and budgets are **[I]**. The numbers below are starting points to measure, not evidence that a particular reward schedule causes retention.

## Scope and what this builds on

The latest [decision log](../decisions.md#the-shape-of-the-game) and this research brief settle the following:

- Character slots are **hat, accessory and full-body outfit**. Headphones, glasses and a scarf compete for the accessory slot; there are no separate shirt, trousers, gloves or boots slots.
- Train slots are **flag, side accessory and chimney accessory**. Ownership is personal even when an equipped train is communal.
- Boxes have rarity, common boxes arrive first, rarer boxes arrive later, and some items belong only to particular boxes. Boxes grant cosmetics now. Possible future utility is not permission to add random stats today.
- Co-op-only mini-games give boxes. The final island box **may** grant an ability; that remains an authored progression reward, never a low-probability roll or a mini-game requirement.
- The campaign is about eight hours, with one-to-two-hour sessions and areas that offer closure. Materials and abilities supersede the earlier six-era progression assumptions.

[Maximal rewards](maximal-rewards.md) supplies the physical parcel, grouped spectacle, personal receipt, saved pity and provenance foundations. Keep those. Its useful traits, pets-as-a-large-loot-family, separate clothing parts and six-era timetable are outside this narrower brief. Its **30–40 durable finds/hour** would mean 240–320 campaign finds: a different content commitment from a small finite wardrobe. This report proposes **10 box results/hour**, with the original dense harvest, magnet, construction and delivery feedback continuing between them. That is a deliberate reduction in durable-item frequency, not relabelling particles as items. If ten feels too quiet, first try occasional three-item manifests and faster collection completion; do not add duplicate junk to preserve a numerical target.

The [goofy physics co-op report at `f034e03`](https://github.com/matiasfr/boogle/blob/f034e03a3c22cb7d3b1dfa4025ebd8c911e2a134/docs/research/goofy-physics-coop.md) was read from its inflight branch because the file is absent in this checkout. It recommends one personal box per accepted cooperative clear, equal treatment of helper roles, saved participation and separate durable outcomes. This report supplies the contents and collection rules. Its stale reference to removed DESIGN principle 5 does not restore that principle. [Personal rewards](personal-rewards.md) adds visible identity and earned provenance; its som/knack economy is historical. The two reports and [research index](README.md) informed this format.

[Round 4](../plans/round-4.md) explicitly requests varied boxes and the three character slots, while leaving train slots for the roundhouse and mini-games for later. Researching their eventual rewards does not move those features into round 4. No plan checkbox is completed by this document.

## What exists in Boogle

**[V]** These are code facts, not an assessment of how the current build feels:

| Seam                                                                                                         | Current behaviour                                                                                                                                                                             | Consequence                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`place/gifts.ts`](../../src/proto/place/gifts.ts), `GIFTS`, `AUTHORED`, `THEN`, `nextGift`                  | Ten display definitions; eight obtainable gifts. Hat, flag and critter are authored first, then five shuffled gifts without repeats. Egg and scope remain covered.                            | There is already a finite collection and a strong opening sequence. There are no item tiers, box tables or pity counters.                                             |
| Same file, `openCrate`, `giftState`, `snapGifts`; [`place/index.ts`](../../src/proto/place/index.ts), `save` | Ownership/order/waiting crate positions are stored in the prototype's per-room browser save. An opening selects its result, records it and invokes the save hook before its show finishes.    | Preserve save-before-show. This is not a server-backed personal reward ledger or a cross-device account.                                                              |
| `SHAKE`, `HOLD`, `FLY`, `updateShow`                                                                         | 0.30 s shake + 2.50 s display + 0.55 s flight, approximately **3.35 s** before the show finishes; 14 flying boards and a 110-particle confetti burst, plus other effects.                     | All eight items currently receive a substantial ceremony. Introduce contrast without discarding the physical payoff. These are constants, not observed frame timings. |
| `WEAR`, `MOUNTS`, `wearOrFit`, `fill`                                                                        | Hat/scarf attach locally; train fittings accumulate on registered vehicles. The module does not implement player-selected mutually exclusive slots or remote friends' wardrobes.              | Do not mistake wearing everything acquired for the decided swappable-slot system. Existing positions are art references, not an ownership model.                      |
| [`buddy/body.ts`](../../src/player/buddy/body.ts), [`assets/src/buddy.py`](../../assets/src/buddy.py)        | Buddy uses a shared clip library, named `wear_head_` parts, per-avatar colour and the `hat` URL option. The asset script already describes separate tintable hat and untinted trim materials. | Reuse the actual Buddy, conductor cap and beanie. Outfit binding, persistent selections and per-player remote selection are still work.                               |
| [`round-4.md`](../plans/round-4.md), steps 5–7                                                               | Abilities close sessions, missed prizes appear in the hub, and optional co-op rewards coexist with solo progress.                                                                             | Cosmetics cannot obstruct a path, consume construction materials or depend on being present for the room's original opening.                                          |

Keep the existing gift `line` strings intact. The critter's current reward and the covered objects can be reported as outside this catalogue; this research does not authorize deleting their code or copy.

## What the reference games establish

### Animal Crossing: a collection becomes a place and a personal look

**[V]** Nintendo describes Able Sisters as a shop with a dressing room, a museum that displays discoveries, and items obtained through crafting, shops and gifts. These are complementary routes and places to use a collection. [Nintendo's New Horizons page](https://www.nintendo.com/us/store/products/animal-crossing-new-horizons-switch/). Its description of **New Leaf's** Cyrus explicitly includes changing furniture colour and transforming objects; customization can extend an existing object rather than demand another independent acquisition. [Nintendo's Cyrus description](https://www.nintendo.com/en-ca/amiibo/detail/cyrus-amiibo-animal-crossing-series/).

**[V, abstract only]** Eguchi and Kyogoku frame Animal Crossing around communication between players in their [GDC 2014 session description](https://gdcvault.com/play/1032224/How-to-Turn-a-New). This establishes the design intent, not a measured effect of wardrobe size.

**[I] Boogle:** a friend sees what you picked and asks where it came from. Put trying on, source hints and choosing a favourite at the shop/roundhouse already on the route. Retain free basic recolouring; let special patterns be finds. Do not import calendar-gated shopping into an eight-hour game, or turn the round-4 museum back into the rejected curio collection.

### Fall Guys: the body is the display, and rarity is not a production-cost scale

**[V]** Mediatonic's June 2022 currency announcement separates earned Crown Ranks and their costumes from spendable currency, limits that version's Kudos purchases to common pieces/colours/patterns and says item rarities were reassigned for consistency. This is a dated transition, not a claim about today's entire store. [Official announcement](https://www.fallguys.com/news/upcoming-fall-guys-currency-changes?lang=en-US). It is evidence that a tier is a designed label, not an intrinsic property of a model.

**[V]** Production partner Room 8 shows costumes it made for Mediatonic over a multiyear collaboration. The breadth of Fall Guys' catalogue should not be treated as a small-team baseline. [Room 8's portfolio](https://room8studio.artstation.com/projects/obv9Ek).

**[I] Boogle:** keep Buddy's recognizable face, proportions and player-colour anchor through every outfit. Borrow the oversized readable costume idea, but make full-body outfits single awards so nobody receives half a costume. An ordinary beanie can remain somebody's favourite after a spectacular teacup hat arrives. Do not make every higher tier a mandatory visual upgrade.

### Rocket League's old crates: explicit tier odds, separate variants and earned openings

**[V]** In Psyonix Devin's original 2018 announcement, the five tier weights are **55% Rare, 28% Very Rare, 12% Import, 4% Exotic, 1% Black Market**. The process chooses tier, then an equally weighted item in that tier, then painted/certified attributes, each listed at 25%. The developer also contrasts up-to-18-item crates with approximately 60-item Golden Egg pools. [Original developer post](https://www.reddit.com/r/RocketLeague/comments/918b6q/drop_rates_in_rocket_league_crates/). The old blog URL failed, so this citation is the author's post, not a fan reconstruction.

**[V]** The 2017 Haunted Hallows announcement describes earning Candy Corn from completed matches and using it for Decryptors, which opened crates into untradeable items. Thus an earned opening existed inside a system that also sold keys; old Rocket League crates were not wholly free. [Psyonix's event explanation](https://www.rocketleague.com/news/haunted-hallows-event-october-16?lang=fr).

**[I] Boogle:** keep the explicit roll order and source-labelled box. Five tiers and a 1% headline item are unnecessary for 48 cosmetics: even 80 independent 1% rolls leave `0.99^80 ≈ 44.8%` of players without that tier. A market could let someone obtain a desired result elsewhere; Boogle instead needs duplicate protection and a choice route inside the game. Do not add keys, trading value, layered ultra-rare finish rolls or a roulette animation that pretends it nearly selected another item.

### Splatoon: a shop gives agency around randomness

**[S, official search-index text; article fetch returned 502]** Nintendo's gear guide describes gear XP awarding random secondary abilities, drinks biasing ability odds, and star power increasing available slots. [Nintendo's gear guide](https://splatoon.nintendo.com/en/news/beginner-basics-for-splatoon-3-choosing-the-right-gear/). That is functional gear progression, not cosmetic-only collecting.

**[V]** Nintendo's support instructions let the player select a specific SplatNet item and collect the order from Murch in the plaza. [SplatNet ordering instructions](https://www.nintendo.com/en-gb/Support/Purchases-Subscriptions/Games/How-to-Order-and-Receive-Gear-from-SplatNet-3-2266114.html). **[S, official search-index text]** Nintendo also describes earned conch shells being redeemed at the Shell-Out Machine. [Splatfest announcement](https://splatoon.nintendo.com/en/news/money-fame-or-love-pick-a-side-and-battle-it-out-in-the-next-splatfest/).

**[I] Boogle:** combine surprise with a clearly selectable appearance. Inspecting a friend's hat can reveal its box family and let you pin it as a wish. The shop handles a guaranteed choice without a separate app, daily wait or gameplay stat. Do not import ability-slot grinding or make a preferred look depend on rolling good stats.

### Genshin and Arknights: distinguish tier pity, target guarantees and rate increases

**[V]** HoYoverse's support article specifies a five-star character within 90 Character Event Wishes, a reset after a five-star, and shared count/guarantee status between the two character event banners. It separately describes a guarantee for the promotional character after receiving a non-promotional one. [HoYoverse guarantee explanation](https://support.hoyoverse.com/hc/en-us/articles/50333940684953-How-does-the-Wish-guarantee-system-work). Those are different promises: a high tier and a particular target. This summary page is not a complete specification of every newer banner modifier. No unofficial Genshin soft-pity curve is presented here as a disclosed rule.

**[S, official search-index text; body is not readable through the fetcher]** Arknights' 2023 Kernel Headhunting notice says a six-star's 2% rate becomes 4% on the next roll after 50 misses. That is a published example of increasing odds after a dry run. [Arknights Operations Team](https://www.arknights.global/news/346).

**[I] Boogle:** use one understandable hard ceiling, save it across sessions, and add a separate direct-choice route for a favourite. Start with no soft-pity curve: the existing maximal-rewards ceiling is short enough to explain. Counts of 50–90 belong to a very different time and content model. Neither live-service monetization nor their large character production budgets are needed to retain surprise.

### Pokémon: familiar shape, exceptional appearance, recognisable collection axes

**[V]** The Pokémon GO help centre defines shinies as rare differently coloured versions, supplies a distinct icon, lists several encounter routes, and distinguishes a shiny variant from a regional form. [Official shiny explanation](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2678-what-are-shiny-pokemon/). This is specifically GO evidence; no main-series shiny rate or universally shared audio cue is assumed.

**[I] Boogle:** separate **shape**, **finish** and **where it was found**. A copper teacup is still the recognizable teacup, with a memorable origin. A high-contrast motif and silhouette must survive the actual camera distance; a near-identical recolour does not become readable because its tooltip says rare. Give a special finish one deliberate catalogue entry, not a second hidden lottery layered over every hat.

### PEAK: a cosmetic can tell a story rather than report luck

**[V]** The developer's store description explicitly connects dozens of badges with cosmetics and showing survival prowess; it also supports solo and friends-only co-op. [PEAK's developer description](https://store.steampowered.com/app/3527290/PEAK/). Exact badge-to-item mappings and current total counts were not established from this source.

**[I] Boogle:** reserve some appearances for an understood deed, conveyed through a special box. A cooperative delivery can give everyone a matching parcel motif while their other contents differ. Record the place, deed and companions, not a ranking of who carried most. A small patch on an existing outfit can carry that story without becoming a seventh equipment slot or a whole achievement interface.

### Deep Rock Galactic: earned cosmetics need framing, choice and permanence

**[V]** Ghost Ship explains that new cosmetics were getting lost in its large shop and competing with gameplay upgrades, so its free Performance Pass and choice tree made acquisition more meaningful. Its first season listed 65 cosmetic rewards across several types and targeted approximately **100 hours**, while expecting many players to finish only part of it. [Season 01 developer FAQ](https://www.deeprockgalactic.com/season01-faq). This is useful evidence for separating cosmetic acquisition from tool costs; its completion time is unsuitable for Boogle.

**[S, official indexed announcement; direct fetch returned only an image]** The later season-reactivation Q&A describes restored progress, selectable old seasons and credit substitution for already-owned rewards. [Ghost Ship's 2024 Q&A](https://steamcommunity.com/games/DeepRockGalactic/announcements/detail/4195740093438639601).

**[I] Boogle:** show a finite themed set and let friends revisit its source. Keep missed sets available. A duplicate's useful substitute should move the player toward their chosen cosmetic; generic construction resources would mix personal rewards with the communal economy. Do not infer a need for seasons, dailies or a 100-hour endgame from DRG's success.

## A finite collection that still surprises

### Three item tiers and three box grades

**[I]** Use working names **Common, Rare, Wonder**, with one, two and three embossed marks plus distinct seal shapes. These are presentation names, not new narrative commitments. Three tiers give ordinary pleasure, an obvious step up and a showstopper without dividing a tiny catalogue into nearly empty categories.

An item's tier is authored once. A box's grade determines its probability table and eligible catalogue; **a Common box can surprise upward, but a Rare box never contains a Common item**. Early boxes are Common. Rare boxes first appear after the walkable shortcut; Wonder boxes mark later discoveries and area closure. Box grades are earned from known deeds, not rolled from another box.

| Box grade | Common item | Rare item | Wonder item | Starting use                                                                    |
| --------- | ----------- | --------- | ----------- | ------------------------------------------------------------------------------- |
| Common    | 60%         | 30%       | 10%         | Ordinary construction milestones and early finds                                |
| Rare      | 0%          | 70%       | 30%         | Larger discoveries, later work and co-op clears after their introductory reward |
| Wonder    | 0%          | 0%        | 100%        | Authored area finish or a substantial optional secret                           |

These are **base item-tier odds**, before guarantees or collection exhaustion. Put them and the exact contents in an optional box/wardrobe detail view, with the current guarantee remaining. A box's silhouette/seal signals its floor; after the result is committed, the opening may truthfully reveal an upgrade. Do not show a Wonder seal and then reveal a common scarf.

### Pity protects the evening; choice protects the favourite

**[I]** Carry forward maximal-rewards' generosity: **first Wonder by the third box result; thereafter at most five non-Wonders, so the sixth result is guaranteed**. Box one is an authored Common hat, box two fills a different character slot, and box three supplies the first Wonder if needed. The pity guarantee can upgrade a Common or Rare box's result, but cannot cross its source restrictions. Ensure every offered family has an eligible Wonder before promising this ceiling.

Use one personal Wonder counter across earned cosmetic boxes, independent of island, opening speed or session. A guaranteed Wonder box and a directly chosen Wonder also reset it. Resolve random results in earned receipt order; opening a later box first must not reshuffle outcomes or manipulate the counter. Accepting a deferred Wonder choice resets the counter for future grants only; it never rewrites already stored results. Multi-item manifests consume one counter step per real item, not per confetti burst. Before its third result, the onboarding override wins over the general table.

For a fixed base Wonder probability `p` and a guarantee on result six, expected gap is `(1 - (1-p)^6) / p`. **Calculated in Node for this report:** at 10%, the long-run rate becomes **21.34%**, a mean 4.69 results; at 30%, **34.00%**, a mean 2.94. These are stationary, non-depleted-pool illustrations. Mixed grades, the authored opening, direct choices, guaranteed boxes and exhausted collections change actual rates. Never advertise 10% as the final observed Wonder frequency.

The target is a rare _combination and story_, not one unlucky player having no exciting find all evening. At ten results/hour a six-result ceiling corresponds to about 36 minutes at that average cadence, not a time-based promise. A session with no accepted deeds advances no counter.

### Duplicates: first prevent them, then finish the desired look

**[I]** Start with the following bounded policy; no trading market or crafting inventory:

1. Roll the tier after pity, then select uniformly among **unowned eligible items in that tier**, using the area/global preference below. A named finish counts as a distinct item only if it is visibly different; ordinary player colours are free, not collection filler.
2. If that entire eligible tier is owned, the result becomes one **personal choice-progress mark** for that box family, rather than another copy occupying inventory. Show `1/3`, then `2/3`; on the third such result, offer a missing eligible item from that family. The third mark's choice replaces that result, rather than adding another roll. A pinned eligible wish is the default, and the player can defer choosing without blocking play.
3. The choice respects that box's grade floor and source restrictions. If nothing eligible is missing, retain the ready choice until a matching box can satisfy it. Do not spend three marks to get a known duplicate. A choice may pick a higher tier; that is an explicit target guarantee, not an undisclosed base-rate change.
4. If no unowned eligible Wonders remain, suspend Wonder pity for that completed Wonder pool. Preserve the counter, capped at five, until a subsequently earned box exposes an unowned Wonder; no repeated gold ceremony for an empty category. Show collection progress instead. Ordinary duplicate-choice progress still works.
5. Once **all eligible contents** of a family are owned, say the set is complete. Future repeatable rewards may let the player choose another previously earned box family before its result is generated. This is a labelled replacement box, not an item silently leaking into the wrong pool. If every available set is complete, offer an optional outfit remix/photo flourish with no new-item claim. Do not invent an endless scrap balance.

This is slightly more machinery than a pure shuffled bag, but preserves tier weights while early Common tiers fill up. Keep the marks internal to each family and show only the relevant progress; they are not money, cannot be bought, transferred or spent on construction. For round 4's nine items, start with the existing no-repeat bag plus tier selection and defer the mark system until exhaustion actually occurs in a normal run.

**Why protection matters [I]:** collecting 48 equally likely items with replacement takes about **214 rolls on average** (`48 × H48`). After 80 rolls the expected unique count is only **39.09**. Real tiered pools differ, but this simple counterexample is enough to reject unprotected duplicates in an eight-hour game. The proposed rules are not simulated here as a complete economy; builders should run the actual catalogue through a small deterministic roll model before committing its pace.

## How much content, and where it comes from

**[I] Campaign starting catalogue: 48 named cosmetics**, comprising **24 Common, 16 Rare, 8 Wonder**. Aim for **32 distinct shape assemblies and 16 deliberately different pattern/finish derivatives**, counted honestly as derivatives. Do not advertise palette permutations as thousands of authored items.

| Slot                    |  Items | Suggested shape assemblies / finish derivatives | Why this allocation                                              |
| ----------------------- | -----: | ----------------------------------------------: | ---------------------------------------------------------------- |
| Hat                     |     12 |                                           9 / 3 | Strong silhouette, cheap rigid attachment, visible from behind   |
| Accessory               |     10 |                                           7 / 3 | Glasses/headphones/scarves supply distinct personalities         |
| Full-body outfit        |      6 |                                           3 / 3 | Most fitting work; single complete awards and one shared rig     |
| Train flag              |      8 |                                           4 / 4 | Bold contour/pattern at distance; reuse poles and animation      |
| Train side accessory    |      8 |                                           6 / 2 | Bell, lantern, bunting and similar large profile changes         |
| Train chimney accessory |      4 |                                           3 / 1 | Enough variation without authoring many invisible tiny toppers   |
| **Total**               | **48** |                                     **32 / 16** | Expand after friends ask for more looks, not to fill tier labels |

Twelve hats × ten accessories × six outfits yields **720 character combinations**, before choosing to leave slots empty. Eight flags × eight sides × four chimney pieces yields **256 train combinations**. These are compositional possibilities, not equally good-looking or globally unique outfits. Named pieces remain understandable enough for friends to recognize.

### Area identity with a global foundation

Allocate **24 global items** (12 Common / 8 Rare / 4 Wonder) and **four six-item area sets** (each 3 Common / 2 Rare / 1 Wonder). Four is a content-budget example, not a decision that the world has four islands. A larger level plan can group adjacent places under one cosmetic family. Co-op souvenirs occupy these counts, not an extra unbudgeted catalogue.

Each family box sees the global foundation plus its own six-item set. After tier selection, prefer an unowned eligible local item with **70% weight**, global with **30%**; if only one group has unowned candidates, use it. Within that group, items have equal weight. Later islands do not dilute earlier pools by appending their contents to every crate.

Source exclusivity is separate from rarity. Start with **two of each area's six items** restricted to that area's Rare/Wonder boxes, and at most **one of the 48** requiring a co-op-deed box initially. Keep an eligible global Wonder in Common boxes so their upward chance and pity remain real. The catalogue declares allowed box family/grade explicitly. Do not derive availability from colour or filename.

The wardrobe shows a small source stamp and a discoverable hint for an unowned item. A matching three-piece set has an aesthetic theme, no stat or payout bonus. Completed area sets stay available through returning to their activity and the hub's missed-prize recovery. An unopened earned box keeps its original family/table version; carrying it into a later area does not reroll its source.

## Pacing eight hours without a second job

**[I]** Start near **80 personal box results across eight hours**, roughly ten/hour. A one-hour session should normally offer **8–12**, a two-hour area **16–24**, including saved-choice results. These are tuning windows around authored deeds, not timed grants. Co-op mini-game marathons can exceed them; the game does not need to punish a group for enjoying its toy.

| Illustrative campaign portion | Common / Rare / Wonder boxes |  Total | New promise and closing beat                                                                                                  |
| ----------------------------- | ---------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------- |
| Hours 0–2                     | 14 / 5 / 1                   |     20 | First hat within 3–5 minutes of active progress; all character slots usable within 20–30 minutes; a path then a later ability |
| Hours 2–4                     | 10 / 8 / 2                   |     20 | Second local family and first train fittings when a customizable train actually exists                                        |
| Hours 4–6                     | 8 / 10 / 2                   |     20 | A different silhouette/material theme, optional co-op souvenir and meaningful wardrobe choices                                |
| Hours 6–8                     | 6 / 11 / 3                   |     20 | More choice, final local family, guaranteed finale keepsake and the old-island hangout                                        |
| **Total**                     | **38 / 34 / 8**              | **80** | Ability rewards are outside these 80 cosmetic results                                                                         |

The example is a budget, not a train/ability schedule. Round 4 establishes when the player wants efficiency; rewards must not push the train earlier. Common boxes remain useful later because missing favourites can be Common.

For a two-hour area, try **12 results from mainline work**, **6 from reachable discoveries/side paths**, and **2 from optional co-op play**. Solo players still get 18, mainline-only players get 12, and no cosmetic count gates an exit. Give every accepted cooperative clear one personal box; a 60–90-second course could theoretically pay 40–60/hour before resets and wandering. That is explicitly faster than mixed campaign play. Accept finite-set completion, or give the venue a narrow souvenir pool; do not make the shortest mini-game the only way to get every area's exclusive box. Test this pressure before expanding the hangout.

Begin with **4–6 voluntary equip decisions/hour**, not a modal for every result. Auto-store everything, auto-equip only into an empty slot, and leave an occupied favourite alone. An optional in-world shop or pause wardrobe previews swaps immediately and allows cancellation. No expiry, daily streak, energy or power advantage for the player who stays longest.

An island's final ability box uses a distinct ancient-technology shape and a predetermined result. If the owner chooses that delivery mechanism, opening it grants the area's guaranteed shared capability/current-player catch-up according to the movement plan. It does not consume cosmetic pity, require a complete set or roll the next ability. A cosmetic bonus alongside it remains a separate personal receipt.

## The reveal and the life of the item afterwards

**[I]** Retain the physical sequence in `gifts.ts`: box anticipates, bursts, displays a real object and sends it somewhere meaningful. Keep movement and the camera under the player's control. Start with **0.8 s Common, 1.3 s Rare, 2.0 s Wonder** foreground reveals; allow up to three seconds only for an authored milestone. Compare these with the current 3.35-second show rather than assuming shorter is automatically better.

| Wonder time    | Picture and sound                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–150 ms       | Seal compresses; short dry rattle. Result is already saved.                                                                                               |
| 150–350 ms     | Lid pops; a three-mark seal and local light shape disclose the true tier. One low impact followed by a rising interval.                                   |
| 350–1,200 ms   | Large, front-readable item settles above the box. Its actual silhouette and a two-note motif identify it; no spinning past prizes the player did not get. |
| 1,200–1,700 ms | The item or its preview flies toward the empty slot/display stand. An occupied favourite stays equipped.                                                  |
| 1,700–2,000 ms | Final chord and short settle; the item remains in the wardrobe and the source marker remains inspectable.                                                 |

Use one reusable procedural audio phrase in three arrangements, following [collect-sounds](collect-sounds.md) and [maximal-rewards](maximal-rewards.md), rather than raising volume for every tier. Begin with **16/32/64 reveal particles** for Common/Rare/Wonder from [`particles.ts`](../../src/render/particles.ts), capped at **96 live cosmetic-reveal particles per local view**. These are proposed budgets, not a new pool or proven performance limits. Batch simultaneous peers' openings into one platform flourish with individual item silhouettes; an eight-person room must not play eight full fanfares on top of each other. Reduced motion retains tier shape, item and sound without shake or expanding flashes.

Rarity has to survive after the beam disappears. Use **shape first, finish second, a small tier emblem third**: a teacup handle, oversized headphone cups, broad raincoat hem, scalloped flag or crown-shaped chimney cap. Keep one/two/three marks in the wardrobe and inspect view so hue is never the only signal. Reserve a single restrained moving detail for a Wonder, not permanent particle trails on every avatar. Test at **5, 10 and 20 metres**, front/back, daylight/night, carrying and riding. At 20 m the item family should read; a precise tier emblem can wait for inspection. No rarity score above a friend's head.

Friend inspection should answer **what is it, where can I earn it, and what happened when this one was found?** A source stamp such as “Quarry shortcut, with Ana” is a memory, not a rarity multiplier. Do not imply a shared deed occurred if a late player received a catch-up award. No global scarcity serials, contribution rankings or limited ownership claims.

## Personal ownership on a communal railway

**[I]** Every eligible participant receives one entitlement of the same box grade; individual items may differ. For mainline milestones, use the room's accepted participation/catch-up policy, not the final depositor. For a mini-game, use its accepted helper roster: thrower, receiver, setup and recovery count equally, and a disconnect after an accepted assist does not erase eligibility. A new spectator sees the celebration but does not claim every past round. Returning players can recover unclaimed mainline prizes; new co-op-only awards still need their co-op deed.

A shared train is the conflict case. The item's ownership never transfers when it is fitted. At the roundhouse, propose **one explicit styling assignment per train**, recorded with three selected item IDs and the stylist's identity. Friends ride and use the train freely; changing its stylist is an explicit handover at the stop. Persist the applied look through the stylist leaving; replacing it consumes nothing and does not remove anyone's unlock. With one train, rotate the stylist socially rather than silently letting the last arriving client's wardrobe overwrite it. With several trains, give more friends places to display their selections. This styling policy is a proposal for [roundhouse-management](roundhouse-management.md), not an existing owner decision.

Keep receipts and results separate from animation. The existing prototype can test a solo wardrobe with its local save, but shared earning needs the pattern from maximal-rewards and the co-op report:

- A proposed `src/sim/cosmetic-rewards.ts` owns the pure catalogue selection/pity/duplicate rules; proposed `src/world/rules/cosmetic-rewards.ts` owns accepted receipt IDs, recipient identity, saved outcomes and claim state. Follow [`rules/README.md`](../../src/world/rules/README.md), using the server-stamped identity pattern in [`roster.ts`](../../src/world/rules/roster.ts). These paths are proposed, not present code.
- Store table version, source/deed ID, recipient, actual item IDs, counters and choice state. Resolve with a pinned seeded stream per receipt, never the prototype's `Math.random()` or an animation completion callback. Source replay grants nothing twice; snapshots reconstruct equipment quietly. `submitEdit` means queued, with effects only after acceptance.
- Personal collection data can be per-player inside the initial room ledger; that does not make it a shared wallet. Account-wide or cross-device ownership requires the identity/storage work in [net-roadmap](../plans/net-roadmap.md), not a promise that browser IDs provide it. Declare the scope in the eventual build.
- Use a small validated equipment selection for remote presentation through the existing [`netplay/net.ts`](../../src/netplay/net.ts) conventions; send IDs, never geometry or a whole wardrobe. Unknown IDs draw a safe empty/default slot, and a cleared slot clears its presence value. Persistent train styling belongs in durable shared state, with Local fitted meshes. Keep physics unchanged.

Only the eventual pure shared rules warrant unit tests here: weighted boundaries, eligibility, duplicate exhaustion, receipt idempotence, independent seeds and save/load of pity and choices. A shared reward contract warrants a two-client scenario. This documentation change warrants neither new UI tests nor a game build.

## Producing many looks without many character systems

**[I]** Use the existing Buddy proportions and clips, one attachment convention and a small library of approved shapes. A catalogue record needs stable ID, slot, item tier, allowed boxes, mesh/finish, attachment transform and source hint. Keep it data driven without a general character-construction framework.

**Standard-engine comparison [V]:** Unity's [Skinned Mesh Renderer](https://docs.unity3d.com/6000.0/Documentation/Manual/class-SkinnedMeshRenderer.html) deforms meshes from bone animation. Unreal's [modular-character guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/working-with-modular-characters-in-unreal-engine) explains shared Leader Pose, more expensive separate Copy Pose, and mesh merging; sharing a pose does not eliminate separate render sections. Godot's [BoneAttachment3D](https://docs.godotengine.org/en/stable/classes/class_boneattachment3d.html) follows a selected skeleton bone. **Boogle's difference [I]:** three.js supplies the scene graph and skinning; this project must own socket conventions, fitting and draw budgets itself. None of these engines requires a new animation rig for every hat.

Use rigid head/neck attachments for hats, glasses and headphones; train attachments use the car's local frame. Use one skin bound to the existing Buddy skeleton for a deforming outfit. Author overalls and raincoat shells from the same reference body, hide covered body regions deliberately, and keep the eyes/head available. Preserve bone names, bind pose, scale and existing clip motion. A scarf tail can start rigid or use a bounded Local sway; cloth physics and independent accessory skeletons are unnecessary for this proof.

Share geometry and material families. Rarity can change a trim motif, roughness, colour blocks or one TSL effect without adding a light or post pass. Merge rigid pieces that share material. Aim initially for **one or two draws per rigid cosmetic**, **one or two material sections for an outfit**, and **no additional animation mixer per item**. Those are review targets, not claims about the existing asset's measured costs. Keep invisible wardrobe assets unloaded, with equip-time preparation through the existing asset loader; cache common meshes, dispose per-avatar allocations and validate silhouette before adding detail.

Test the matrix that causes real cost: hat + glasses + outfit, scarf against collar, hands while carrying, seated train pose, swim and jump, and eight dressed Buddies. Check offscreen bounds on wide hats and coat hems; [`body.ts`](../../src/player/buddy/body.ts) already has pose-bound handling that new parts must fit. Measure on the M1 Max, then verify the M4 iPad floor; `counts`/`perf` become appropriate when a populated wardrobe materially adds render work. Do not benchmark while another agent owns the GPU.

The existing Blender Python source is a reference, not permission to add more Python files: new repo tooling follows the TypeScript rule and the established [asset pipeline](../plans/asset-pipeline.md). Code-built shapes are enough for rigid draft pieces; use the existing modelling/export workflow for skinned shells. Generated images remain an approval-based later dressing step. Do not make a new full model, rig, shader or thumbnail pipeline for every colourway.

## A small round-4 set

**[I] Nine character items, five Common / two Rare / two Wonder.** They prove all three slots, meaningful alternates and two different top-tier silhouettes. Their names are working labels. Existing gift lines remain unchanged; new descriptions can wait for the owner's writing pass.

| Item                 | Slot / tier        | Production starting point                                                               | Suggested source                                          |
| -------------------- | ------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Conductor cap        | Hat / Common       | Existing Buddy cap; straight railway drum and brass trim, per the decision log          | Authored first Common box                                 |
| Beanie               | Hat / Common       | Existing Buddy beanie                                                                   | Common/global                                             |
| Teacup hat           | Hat / Wonder       | One new rigid bowl/handle assembly; large readable handle, no simulated liquid          | First area's Rare/Wonder boxes only                       |
| Red scarf            | Accessory / Common | Adapt the existing gift geometry to the actual neck transform                           | Common/global                                             |
| Round glasses        | Accessory / Common | New thick rims; keep both eyes readable                                                 | Common/global                                             |
| Oversized headphones | Accessory / Rare   | New band and chunky cups; no new audio mechanic                                         | First-area box                                            |
| Work overalls        | Outfit / Common    | First fitted shell, player-colour panel and shared clips                                | Common/global; guarantee an outfit among the early claims |
| Raincoat             | Outfit / Rare      | Second shell with broad hem; keep head/hat clear                                        | First-area Rare/Wonder boxes only                         |
| Festival overalls    | Outfit / Wonder    | Reuse overalls shell, large alternating panels and bright trim; visibly authored finish | Common/global upward surprise or pity                     |

This is **five new shape assets** (teacup, glasses, headphones, overalls, raincoat), two existing hats, one adapted scarf and one outfit derivative. Fitting and remote display are real work even when geometry is reused. If the two outfit shells dominate the pass, prototype the overalls plus its finish first and hold the raincoat; do not reopen separate trousers/shirts.

Start with a hat, then an accessory, then a Wonder by result three. If the third is the teacup, guarantee the ordinary overalls by result four so all slots have something usable. This fourth-result outfit guarantee is an authored Common box, preserving the Rare-box floor. The first Rare box belongs after the walkable shortcut, not after an arbitrarily rushed train unlock. For an accelerated builder-only 12–15-minute proof, author those milestones and label the sequence as test data. The ordinary round-4 run follows its actual pace.

The **next three train pieces** can reuse the flag, bunting as a side accessory, and chimney crown already in `MOUNTS`. Keep them as the roundhouse follow-on; this report does not add train-slot work to round 4. Existing pet behaviour also stays a separate track.

**What's new:** boxes reveal different wearable looks that you can swap and friends can recognize.

**One gut question:** **Did you get something you wanted your friend to see?**

Builders check the edges themselves: an unlucky sequence still hits the ceiling; duplicate/exhausted pools do not crash or show false upgrades; a pinned favourite survives new finds; reload during a reveal preserves the result; a late friend sees the right clothes; moving, carrying and riding do not clip the new shapes. Use the existing `look` workflow with the question “Can I identify the new cosmetic on a moving Buddy beside a friend?”, open its stills and watch real-time motion with sound. A rig-viewer screenshot alone cannot answer that. No captures or playtests were performed for this research.

## Numbered recommendations for Boogle

All twelve are **[I]**, scoped to DESIGN.md 6 and the current decision log. Builders should cite the recommendation they implement.

1. **Use three tiers with a generous upward surprise:** Common boxes 60/30/10, Rare boxes 0/70/30 and Wonder boxes 0/0/100 across Common/Rare/Wonder items. Add catalogue/table data beside the future replacement for [`place/gifts.ts`](../../src/proto/place/gifts.ts); prototype common-first pacing through [round 4](../plans/round-4.md).
2. **Guarantee the first Wonder by result three and later Wonders by result six, saving one personal counter across sessions.** Keep target choice distinct from tier pity; implement through the proposed receipt rules, not a presentation-time random draw. Apply the empty-pool rules above and disclose base versus guarantee-adjusted odds.
3. **Prevent same-tier repeats while an eligible item is unowned; turn three exhausted-tier results into a missing-item choice.** Preserve family restrictions and stop minting inventory duplicates; replace `giftState.got/order` only when the production ledger exists. Round 4 can keep a no-repeat bag.
4. **Budget 48 named campaign cosmetics: 24 Common, 16 Rare and 8 Wonder, from roughly 32 shape assemblies and 16 finish derivatives.** Respect the six slots in [decisions.md](../decisions.md), concentrating early work in hats/accessories and limiting expensive outfit shells.
5. **Use 24 global items plus four six-item source sets, preferring local finds 70/30 after tier selection.** Make box-exclusive membership explicit, retain old sources and recover missed prizes at the hub, as [round-4 step 5](../plans/round-4.md) requires; four sets are a budget, not a fixed island count.
6. **Start near ten box results/hour, with 8–12 per one-hour session and 80 across the campaign.** Keep dense tactile rewards from [maximal-rewards](maximal-rewards.md), give a box on every accepted co-op clear, and accept faster finite-set completion rather than inventing a grind or withholding earned payouts.
7. **Keep ability boxes authored and guaranteed, separate from cosmetic pity and collection progress.** If adopted, connect their results to [round-4 step 5](../plans/round-4.md) and [movement abilities](movement-abilities.md); a mini-game or lucky roll never gates the main route.
8. **Compress routine reveals to about 0.8/1.3/2.0 seconds and let the real item land visibly in the world.** Rework `updateShow` in [`gifts.ts`](../../src/proto/place/gifts.ts), reuse [`particles.ts`](../../src/render/particles.ts), group simultaneous friends' effects and preserve control, favourites and save-before-show.
9. **Make rarity readable through silhouette, finish and an inspectable source story.** Preserve Buddy's face/colour identity in [`buddy/body.ts`](../../src/player/buddy/body.ts); check moving friends at 5/10/20 m, and let inspection pin the appropriate box source without a floating status rank.
10. **Give each helper a personal receipt and make train styling an explicit, reversible assignment.** Build on the [co-op report's accepted-round contract](https://github.com/matiasfr/boogle/blob/f034e03a3c22cb7d3b1dfa4025ebd8c911e2a134/docs/research/goofy-physics-coop.md), [`roster.ts`](../../src/world/rules/roster.ts) and [roundhouse research](roundhouse-management.md); a shared train never becomes a shared cosmetic wallet.
11. **Produce cosmetics on the existing Buddy rig with rigid sockets, a few fitted outfit shells and shared materials.** Extend the conventions in [`body.ts`](../../src/player/buddy/body.ts) and [asset-pipeline.md](../plans/asset-pipeline.md); test combinations and eight dressed players before multiplying variants.
12. **Prove the nine-item character set in round 4, then add the three reused train pieces with the roundhouse.** Follow [round-4.md](../plans/round-4.md)'s boundary, preserve gift copy, and judge whether players voluntarily equip and show a favourite before expanding the catalogue.

## Limits and follow-through

The reference games establish viable mechanisms, not the right Boogle drop table or a retention forecast. Primary-source indexing was necessary for the noted Splatoon, Arknights and later DRG claims; exact reveal timings, current complete item totals and undocumented pity curves were not inferred. The GDC source was an abstract only. The simple probability calculations above were executed; the proposed mixed-grade, source-restricted collection has not been simulated or playtested.

Before building the full catalogue, evaluate actual table definitions over seeded eight-hour receipt sequences: unique items, duplicate-choice frequency, worst visible dry spell, access to each slot, and whether rare pools empty too early. Review two friends with very different luck and a group repeatedly choosing the shortest mini-game. If collection drains quickly, prefer fewer compulsory claims or freely composing owned looks; if it drags, improve protection and choice before adding a higher rarity tier. Implementing shared receipts requires its own small reviewable change and sync validation. This report changes research only and does not ship gameplay.
