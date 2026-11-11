// The rail drivers' worlds unaudited, for a local unit run (docs/agents/ship-pipeline.md, "Unit test settings"): the inverse of ./rail-audit.ts.
// The seed and test drivers (src/sim/railway-drive.ts, src/sim/railway-live.ts) build every world with
// `{ audit: true }`; the audit re-serializes every row around every system run, so it is most of the suite's time.
// It only reads and throws (src/ecs/world.ts: rowsText, audit, and the spawn-time schema check), never writes, so an
// unaudited world steps and hashes exactly as an audited one. Preloaded, this rewrites those calls in memory to
// `{ audit: false }`; nothing on disk changes, the game, the server and the rules never load it, and a test that asks
// for an audited world itself (`createRailwayWorld({ audit: true })` in test/) keeps it. dev/test-env.ts preloads it
// unless RAIL_AUDIT=1, which CI's unit job (`--ci`) and the nightly long run set:
//
//   node --import ./test/helpers/rail-no-audit.ts --test test/railway-trains.test.ts
//
// It throws unless each file has exactly the calls listed, so a moved or added call cannot silently stay audited.
import { registerHooks } from 'node:module';

const CALL = 'createRailwayWorld({ audit: true })';
const SITES: Record<string, number> = { '/src/sim/railway-drive.ts': 1, '/src/sim/railway-live.ts': 2 };
registerHooks({
  load(url, context, nextLoad) {
    const out = nextLoad(url, context);
    const file = Object.keys(SITES).find((f) => url.endsWith(f));
    if (!file) return out;
    const source = String(out.source);
    const n = source.split(CALL).length - 1;
    if (n !== SITES[file]) throw new Error(`rail-no-audit: ${n} of ${CALL} in ${file}, expected ${SITES[file]}`);
    return { ...out, source: source.replaceAll(CALL, 'createRailwayWorld({ audit: false })') };
  },
});
