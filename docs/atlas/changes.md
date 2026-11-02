# What changed

## 2026-11-02

- Our server now hosts every room. Tabs used to find each other through the server and then talk directly; now each tab keeps one line open to the server, which passes things along and keeps the island itself, like a board-game café that keeps the board set up between visits. [You join a room](#story/join) is rewritten to match.
- The shared world now lives on the server. When you [plant a mushroom](#story/mush), the edit goes up to the server, gets its tick there, and comes back down to every tab. The island keeps ticking, and saves every couple of seconds, even with nobody online.
- The Boogler still runs in one player's tab, but now [the server picks that tab](#story/boogler) and picks a new one if it leaves.
- New story: [opening day starts](#story/opening). One stamped tick starts a whole scripted moment (the gathering call, the bell, the era change), so every tab and every late joiner sees the same thing without anything else being sent.
- Two new folders get notes: prototypes (everything behind `?proto=`) and shared HUD pieces.

## 2026-10-30

- The atlas is new: one picture of how Boogle fits together, with stories that follow a single action through it. Start with [watch an edit travel](#story/mush).
- The colours follow how each piece shares its state, from "only you see it" to "everyone agrees exactly". The [frame view](#view/frame) shows what runs, in order, every frame.
- A daily agent keeps these words current; the facts (files, keys, hooks) come from the code on every build.
