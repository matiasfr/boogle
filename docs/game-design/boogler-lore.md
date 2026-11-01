# 7.2 The Boogler's lore and chapters

**Characters and places**

| Name | Who or what | Where it comes up |
|---|---|---|
| The Boogler | A blob from Samarqand, Uzbekistan; "a good brand needs a 'The'". Entrepreneur "between ventures". | Everywhere |
| Oyijon | His mother: small, loud, carries four melons at once; "if you walk into her house, you eat"; ran a bazaar stall for thirty years and sells suzani. | `mom` thread, `home2`, bottle and apricot lines |
| Gary | "Gary. Boats." Only on the soggy business card. | `card` item line only |
| Samarqand | His home city. | `home` thread, pomegranate line, `biz5` |
| The Registon | A square with three huge blue-tiled buildings. | `home1` |
| The bazaar | Where he learned business. | `home1` |

**Lore facts** (from [src/boogler/lines.ts](../../src/boogler/lines.ts)): he started a melon export business without
knowing Uzbekistan is doubly landlocked; four trucks, two trains, one very small boat and seven hundred golden melons,
then a storm; he floated for three days holding one melon and ate it on the first night. He promised Oyijon to come
back "a big success" (she said "Come back fed"); there are no boats on the island. Every week he writes her a letter in
a coconut shell. He misses osh (plov), cooked in a qozon, and Navro'z, when the apricot tree Oyijon planted the year he
was born flowers. A book, "Business for Beginners", washed up with its pages stuck together. Uzbek words he uses:
Assalomu alaykum, do'stim (my friend), Xayr (goodbye), Ko'rishguncha, anor, o'rik, qovun, piyola, cho't, doppi.

**Ventures** (`biz1`): a coconut water stand (zero customers), seashell consulting, professional napping. His plan
(`biz3`): "The Boogler's Osh and Coconut Emporium". His offer (`biz5`): when the Emporium makes enough money, buy a boat
to Samarqand, with you as his business partner.

**Idea and slogan flags.** `idea` (`biz2`): set only to "ball insurance".
`slogan` (`biz3`): "Come hungry, leave round." (default), "Rice to meet you." or "No free rides.". `mom` is set when
you ask about Oyijon.

**Chapters**

| Thread (menu question) | Chapter | Unlocks at | Opens with |
|---|---|---|---|
| home ("Where are you from?") | home0 | 0 Stranger | Uzbekistan, far from the sea |
| | home1 | 1 Familiar face | The Registon and the bazaar |
| | home2 | 2 Pal | Osh in a qozon; first mention of Oyijon |
| | home3 | 3 Friend | How he got here: the melons |
| | home4 | 4 Close friend | Navro'z and the apricot tree |
| | home5 | 5 Best friend | The island has become home |
| mom ("Do you have any family?") | mom0 | 1 | Oyijon and the four melons |
| | mom1 | 2 | Her one rule: you eat |
| | mom2 | 3 | No boats, and the promise |
| | mom3 | 4 | Letters in coconut shells |
| | mom4 | 5 | Helping him write a letter |
| biz ("What do you do here?") | biz0 | 0 | Entrepreneur between ventures |
| | biz1 | 1 | The three-business portfolio |
| | biz2 | 2 | "Business for Beginners"; pick an idea |
| | biz3 | 3 | The Emporium; pick a slogan |
| | biz4 | 4 | Doubt: "just a blob who lost some melons" |
| | biz5 | 5 | The partnership offer |

Finished threads offer a retelling ("Tell me about Samarqand again."): he tells one of the thread's chapters again
(never the one he retold last; trust-gated answers now open), scoring like small talk, then a retell line. The last
retold chapter per thread is the `retold.<thread>` flag.

**Small talk** ("How's it going?"): `ball`, `mushrooms` (level 0), `name` (level 1),
`visitors` (level 2), `rides` (needs the `kicked` flag).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
