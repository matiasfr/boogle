# Contributing to Boogle

Boogle is a friends' project: keep changes small, readable and fun. Start with [DESIGN.md](DESIGN.md) (how we decide) and [PLAN.md](PLAN.md) (what we build next).

## Setup

Node 22.

```sh
npm install
npm run dev          # http://localhost:5173
```

Two-tab multiplayer works with no setup (PeerJS's public signaling server). Open the same URL in two tabs, or share a room by name: `?room=<name>` (letters, digits, dashes). Add `?netdebug=1` for network logging in the console.

To use our own signaling server locally:

```sh
cd server && npm install && npm run dev        # listens on :9000
echo VITE_BOOGLE_SERVER=http://localhost:9000 > .env.local
npm run dev
```

See [server/README.md](server/README.md) and [.env.example](.env.example).

Layout: `src/` game client (`src/net/` is multiplayer, see [src/net/README.md](src/net/README.md)), `server/` signaling, snapshot storage and ICE config, `dev/peer-test/` headless network test, `docs/` research.

## Workflow

We're in **rapid iteration**: a few people building and playtesting together, many times a day. So:

1. **Commit straight to `main`** once `npm run check` passes (lint, build, unit tests, server tests, network test). Pull (`git pull --rebase`) before pushing.
2. Keep commits small and focused. Message in the imperative, like the git log: "Add splashes for the ball", "Fix host migration flapping".
3. `main` auto-deploys to the live site in about a minute, so `main` must always be playable. After pushing, open the live site in two tabs (or with a friend) and check your change.
4. If CI goes red on `main`, fixing it beats starting anything new. Revert if the fix isn't quick.
5. Use a branch and PR only when you want review or the change is risky or large (networking protocol, sync, persistence, anything that could break everyone's island). Ask `@claude` or a friend to review.

## Design rules

- Every feature names the [DESIGN.md](DESIGN.md) principle it serves and flags any it bends (in the commit message body, or the PR template if you open one).
- If a change conflicts with a principle, either change the idea or change the principle in DESIGN.md, with the reason, in its own commit.
- Pick work from [PLAN.md](PLAN.md) and tick its checkboxes in the same commit.

## Code rules

- **Determinism.** Shared simulation (water, terrain edits, crops, weather, tide) uses integers, a fixed update order and a fixed tick rate. Randomness comes from the seeded RNG in `src/math.js`; never `Math.random()` in shared logic.
- **Cosmetic vs gameplay.** Ripples, particles and splashes may use floats and `Math.random()`, but keep them in separate modules from the shared sim and never feed them back into it.
- **Edits, not state.** Clients send small edit events; the host stamps and broadcasts them. Bulk state travels only as host snapshots.
- **Room interface only.** Game code talks to `createPeerRoom` as described in `src/net/README.md`, never to PeerJS directly. No alternate transports.
- **Authority.** Don't write code that lets the wrong peer decide:

  | Thing | Authority |
  | --- | --- |
  | Your player's movement | You (client) |
  | The beach ball | Its current owner (epoch rule in `src/ball.js`) |
  | Water, terrain edits, garden, weather | The host peer |
  | Persistence (snapshots) | The host, saved to our server |

- **Small and readable.** Plain modules, small files, no new dependencies without a reason in the commit message. Measure before optimizing.
- **Style.** ESLint (`npm run lint`) and Prettier (single quotes, 120 columns, `npm run format`). Format only the files you touch; keep reformatting in its own commit.

## Testing

- **Networking** (anything in `src/net/`, `src/net.js`, ball ownership, message formats): run `npm run test:net`. It starts a local PeerServer and three headless Chromium pages and checks host election, presence, messaging and migration. Also try two real tabs with `?netdebug=1`. If you add behavior to the room interface, add a check to `dev/peer-test/`.
- **Visual changes:** run `npm run dev` and look at it, ideally in two tabs. If you open a PR, attach a screenshot or GIF. Playwright is installed, so scripted screenshots work too.
- **Server:** `cd server && npm test` (`node:test`).
- **Everything:** `npm run check`.

### Playtesting with friends

Playtest continuously: whenever something new lands, jump on the live site, `https://matiasfr.github.io/boogle/?room=<name>`, with whoever is around. Each phase in PLAN.md ends with a question; jot down the answer and anything fun or broken (a line or two in `docs/playtests.md` is enough). Use the bug report template for anything broken, with `?netdebug=1` logs.

## Working with Claude Code

- `CLAUDE.md` is loaded automatically. Ask Claude to read `DESIGN.md`, `PLAN.md` and `src/net/README.md` before designing a feature.
- Mention `@claude` in a PR or issue to run the Claude assistant ([.github/workflows/claude.yml](.github/workflows/claude.yml)).
- Review AI-written code like any other: run it, read the diff, check it against the rules above (especially determinism and the room interface), and make sure `npm run check` passes.
