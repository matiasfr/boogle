# Development report compatibility inventory — 5 November 2026

Implements the owner's "No old builds in development" call. Principle: **Small and readable**.

| Machinery | Decision | Reason |
| --- | --- | --- |
| `POST /report` kind `playtest`, `cleanPlaytest`, `PlaytestDetail`, `PlaytestVerdict` | Cut | Only supported cached clients; no current source consumer. Current telemetry sends error/desync/snapshot/connect, and play sessions use `/playdata`. |
| Legacy playtest-verdict acceptance test | Cut | Proved the removed compatibility path. Current invalid-kind/body, bounded detail, rate limit, storage cap and auth tests stay. |
| `GET /reports` | Keep | Authenticated retrieval of stored NDJSON is still current functionality. Existing files are read unchanged, without parsing or migrating historical kinds. |
| Review dispatch and `/playdata` | Keep | Current separate ingestion contracts, validation and size/rate budgets. |

Files: `server/src/server.ts`, `server/test/server.test.ts`, `server/README.md`, this inventory.
No room state, lockstep rule, gameplay or copy change. No stored reports are deleted or rewritten.
