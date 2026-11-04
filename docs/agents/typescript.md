Before adding or changing code, read this TypeScript contract.

## TypeScript everywhere

Every new file is `.ts` (`src/`, `server/`, `dev/`, `test/`); never add a `.js` or `.mjs` file. `tsconfig.json` is `strict` with `noUncheckedIndexedAccess`; `npm run typecheck` (in `check` and CI) must pass. `npm run lint` runs Oxlint with oxlint-tsgolint and Boogle's parser protections; neither linter depends on the JavaScript TypeScript compiler. An index gets `!` when it is loop-bounded, a fixed tuple or already checked, and a real guard when it comes from the wire, a save, user input or a lookup that can miss. No build step of our own: Vite and Node 26 strip the types, so use only erasable syntax (no `enum`, `namespace` or parameter properties; `import type` for types) and import files by their real name (`./rng.ts`). Wire messages, presence payloads and op/state shapes get exported types next to the code that owns them.

Promise ownership is checked: await work whose result is needed, use `background(task, label)` from `src/async.ts`
for deliberately concurrent work whose rejection needs reporting, and explicit `void` for already-handled or harmless
work. `background` starts no work itself and reports rejection with `console.error`, so the browser harness still
fails on it. Event/lifecycle callbacks must return void or explicitly own an async callback's result. Keep frame and
tick paths non-blocking; an await is a timing change, not a lint annotation.
