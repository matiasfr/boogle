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

1. **Commit straight to `main`, then run `npm run ship`** instead of `git push`. It rebases your commits onto whatever friends pushed, runs `npm run check` (lint, unit tests, build; a few seconds; `check:full` if you touched networking, sync or the server), pushes, and retries if `main` moved during the checks. On a conflict it asks Claude Code (if installed) to merge both changes automatically, then the checks verify the result; otherwise resolve it keeping both changes, `git rebase --continue`, and ship again. We don't hand-review merges: we're iterating fast and accept the small risk of losing a line now and then. If CI ever goes red on `main`, Claude opens a fix PR automatically and it merges when green.
   A plain `git push` to `main` is guarded by a pre-push hook that `npm install` sets up: it runs `npm run check` and refuses if `main` has new commits. `git push --no-verify` skips it in an emergency.
2. Keep commits small and focused. Message in the imperative, like the git log: "Add splashes for the ball", "Fix host migration flapping".
3. `main` auto-deploys to the live site in about a minute, so `main` must always be playable. After pushing, open the live site in two tabs (or with a friend) and check your change.
4. If CI goes red on `main`, fixing it beats starting anything new. Revert if the fix isn't quick.
5. Use a branch and PR only when you want review or the change is risky or large (networking protocol, sync, persistence, anything that could break everyone's island). Ask `@claude` or a friend to review.

## Design rules

- Every feature names the [DESIGN.md](DESIGN.md) principle it serves and flags any it bends (in the commit message body, or the PR template if you open one).
- If a change conflicts with a principle, either change the idea or change the principle in DESIGN.md, with the reason, in its own commit.
- Pick work from [PLAN.md](PLAN.md) and tick its checkboxes in the same commit.

## Code rules

- **Add features as plug-ins** to avoid merge conflicts: a new file in `src/features/` (auto-loaded) that uses `onFrame`/`onStart` from `src/loop.js`, imports its own CSS, and creates its own DOM. Keep edits to `src/main.js`, `src/style.css`, `index.html` to a line or two. Details in [AGENTS.md](AGENTS.md).

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
  | The Boogler (wandering NPC) | The host peer, published in its presence (`src/boogler.js`) |
  | Your friendship with The Boogler, your pocket | You (client), kept in localStorage (`src/boogler-play.js`) |
  | Persistence (snapshots) | The host, saved to our server |

- **Small and readable.** Plain modules, small files, no new dependencies without a reason in the commit message. Measure before optimizing.
- **Style.** ESLint (`npm run lint`) and Prettier (single quotes, 120 columns, `npm run format`). Format only the files you touch; keep reformatting in its own commit.

## Testing

Tests exist to keep us moving fast, not to slow us down. The playtest is the real test; automated tests guard the things a playtest can't see (determinism, sync, conservation) or that would break everyone's island.

**Keep tests light:**
- `npm run check` (lint, unit tests, build) must stay **under ~10 seconds**. Run it before every push.
- Unit tests (`test/*.test.mjs`, `node:test`) cover **pure logic only**: `src/sim/*`, `src/world/*` state, validation, serialize/load/hash. No three.js, DOM, browsers or network in unit tests. Each test file should run in well under a second; shrink grids and tick counts until it does.
- Test the **rules that would silently break** (determinism, conservation, ordering, validation), not rendering details or tuning numbers that change every day. One good property test beats ten snapshot tests.
- **Browser and network tests are heavy:** `npm run test:net` (headless Chromium + local PeerServer, ~30 s) and `cd server && npm test`. Run them when you touch `src/net*`, `src/world/sync.js` or `server/`; CI runs them on every push anyway (`npm run check:full` runs everything locally).
- Ad-hoc Playwright scripts for screenshots or one-off checks are welcome, but don't commit them as tests unless they guard something important.
- Delete or simplify tests that are flaky, slow or keep breaking on harmless changes.

**What to check by area:**
- **Networking** (`src/net/`, `src/net.js`, ball ownership, message formats): `npm run test:net`, plus two real tabs with `?netdebug=1`. New room-interface behavior gets a check in `dev/peer-test/`.
- **Shared simulation** (`src/sim/`, `src/world/`): a determinism test (same inputs → same hash) and a serialize/load round-trip, in `test/`.
- **Visual and feel changes:** no automated test. Run `npm run dev`, look at it in two tabs, then playtest.
- **Server:** `cd server && npm test`.

### Playtesting with friends

Playtest continuously: whenever something new lands, jump on the live site, `https://matiasfr.github.io/boogle/?room=<name>`, with whoever is around. Each phase in PLAN.md ends with a question; jot down the answer and anything fun or broken (a line or two in `docs/playtests.md` is enough). Use the bug report template for anything broken, with `?netdebug=1` logs.

## Working with Claude Code

- `CLAUDE.md` is loaded automatically. Ask Claude to read `DESIGN.md`, `PLAN.md` and `src/net/README.md` before designing a feature.
- Mention `@claude` in a PR or issue to run the Claude assistant ([.github/workflows/claude.yml](.github/workflows/claude.yml)). For code changes it opens a PR from a `claude/` branch, and [automerge.yml](.github/workflows/automerge.yml) squash-merges it into `main` once CI is green (which deploys). Add the `no-automerge` label or ask for a draft if you want to review first.
- Review AI-written code like any other: run it, read the diff, check it against the rules above (especially determinism and the room interface), and make sure `npm run check` passes. Ask Claude for light tests that follow the Testing section; push back on slow or browser-based tests for things a unit test or a playtest covers.
