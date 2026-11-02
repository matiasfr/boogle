// Which build this page is: the one place the client reads it. vite.config.ts ('boogle-version') writes the id into
// the page as <meta name="boogle-build">, not into a chunk, so a deploy that only changes the id leaves every hashed
// file name alone and returning players keep their cached code (docs/plans/loading.md). The page names exactly the
// chunks it was built with, so the id and the code running under it always agree.
// No imports: src/boot/timeline.ts, the first module the page runs, reads it. Node loads it too, through net.ts
// (test/entity-state-node.test.ts), where there is no document and so no build.

/** The whole id: the commit on a deploy, 'dev-...' in development. */
export const BUILD_ID = globalThis.document?.querySelector<HTMLMetaElement>('meta[name="boogle-build"]')?.content ?? '';

/** The short form players are told apart by: `build` on joining a room, presence `bv`, version.json comparisons. */
export const BUILD = (BUILD_ID || 'dev').slice(0, 12);
