# What changed

## 2026-11-02

- Our server now hosts every room. Tabs used to find each other through the server and then talk directly; now each tab keeps one line open to the server, which passes things along and keeps the island itself, like a board-game café that keeps the board set up between visits. [You join a room](#story/join) is rewritten to match.
- The shared world now lives on the server. When you [plant a mushroom](#story/mush), the edit goes up to the server, gets its tick there, and comes back down to every tab. The island keeps ticking, and saves every couple of seconds, even with nobody online.
- The Boogler still runs in one player's tab, but now [the server picks that tab](#story/boogler) and picks a new one if it leaves.
- New story: [opening day starts](#story/opening). One stamped tick starts a whole scripted moment (the gathering call, the bell, the era change), so every tab and every late joiner sees the same thing without anything else being sent.
- Two new folders get notes: prototypes (everything behind `?proto=`) and shared HUD pieces.
- Later the same day, only small fixes landed: the code now double-checks every list lookup before trusting it, like checking a drawer isn't empty before reaching in. Nothing in the picture moved.
- Later still: three prototype toys were cut (the wheelbarrow, the ride flatbed and the toppling stack), so two presence keys they used (`barrow`, `seat`) are gone. A new prototype, the long train crossing, is Local only: it shares nothing, so no arrow in the picture changes.
- The checks now guard the borders between parts, like walls between rooms: the shared world and the network code can't reach into drawing or the player, and two files can't lean on each other in a loop.
- Last update of the day: a new prototype, the rail loop (`?proto=net`), where crates ride the train from camps to a growing village. It reuses the shared-world edits that already exist, like a new board game played with the same pieces, so no arrow in the picture changes.
- After that, only small fixes landed: the last two loops between files were untangled (the player and cave code now lean on small helper files instead of on each other), and an old hero prototype was retired. Nothing in the picture moved.
- Late that night, only small changes again: The Boogler can babble as he talks (behind `?proto=babble`, only your tab hears it), the new Buddy body learned to carry, swim and sit, and the physics-step hooks now run in a numbered order instead of whichever signed up first, like a queue with tickets. Nothing in the picture moved.

## 2026-10-30

- The atlas is new: one picture of how Boogle fits together, with stories that follow a single action through it. Start with [watch an edit travel](#story/mush).
- The colours follow how each piece shares its state, from "only you see it" to "everyone agrees exactly". The [frame view](#view/frame) shows what runs, in order, every frame.
- A daily agent keeps these words current; the facts (files, keys, hooks) come from the code on every build.
