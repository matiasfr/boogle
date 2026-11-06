# Development asset retention inventory — 5 November 2026

Implements the owner's "No old builds in development" call. Principle: **Small and readable**.

| Machinery | Decision | Reason |
| --- | --- | --- |
| `scripts/keep-old-assets.ts` and deploy workflow backfill | Cut | Fetches and republishes retired assets solely for old tabs. Deploy only current assets. |
| `KEEP_BUILDS` and previous-build cache retention | Simplify | Activation keeps only the current cache; unrelated applications' caches remain untouched. |
| Multi-deploy harness's old lazy-model survival assertions | Simplify | Verify current caching, activation purge, immutable asset reuse, navigation bypass and kill switch. No simultaneous old-build support. |
| Unchanged hashed-file reuse during worker install | Keep | Avoids downloading identical current bytes; no promise to retain retired files. |
| Optional-cache failure handling, HTML exclusion, fetch-event write lifetime | Keep | Current-load correctness and storage safety. |
| Startup retry and update notice | Keep | Bounded recovery to the current page, not compatibility with an old protocol. |

Existing cache-policy tests are updated. The multi-deploy browser harness and deployment are unverified in this job:
the browser broker does not expose `sw-check`, direct Chromium is forbidden, and nothing is pushed or deployed.
Not tested on a device.
