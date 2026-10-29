# Boogle

Multiplayer browser game: three.js + cannon-es, bundled with Vite, networked with PeerJS (one browser is the host). Server code is in `server/`.

Before designing or implementing a feature, read:
- `DESIGN.md`: the play and technical principles. Follow them; if a request conflicts with one, say which and ask before bending it.
- `PLAN.md`: the phased roadmap. Tick checkboxes when you finish an item.
- `src/net/README.md`: the room interface. Game code talks to that interface, never to PeerJS directly.

Rules that are easy to miss:
- Shared simulation (water, terrain edits, crops, weather, tide) must be deterministic: integers, fixed update order, seeded RNG from `src/math.js`, no `Math.random()`.
- Clients send edit events; the host stamps and broadcasts them. Don't sync bulk state except host snapshots.
- No claude.ai artifact build or alternate transports.

Commands: `npm run dev`, `npm run build`, `npm run lint`. Server: `cd server && npm test`.
