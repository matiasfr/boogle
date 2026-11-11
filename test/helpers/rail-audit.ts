// Every railway world audited, for a whole test run (docs/plans/ecs-migration-railway.md, M3: "run the server tests
// with audit on"). E's audit mode throws when a system changes a row without mut() or touches a component it did not
// declare; the server and the client mirror build their worlds unaudited, so their tests never ran it. Preloaded, this
// rewrites createRailwayWorld's one createWorld call in memory to default to `{ audit: true }`; nothing on disk
// changes and no rule code reads it:
//
//   NODE_OPTIONS="--import $PWD/test/helpers/rail-audit.ts" npm --prefix server test
//   NODE_OPTIONS="--import $PWD/test/helpers/rail-audit.ts" npm run test:net
//
// It throws if the call it rewrites is not there, so a moved call cannot turn it silently into a no-op.
import { registerHooks } from 'node:module';

const FILE = '/src/sim/railway-components.ts';
const CALL = 'createWorld(RAIL_COMPONENTS, opts)';
registerHooks({
  load(url, context, nextLoad) {
    const out = nextLoad(url, context);
    if (!url.endsWith(FILE)) return out;
    const source = String(out.source);
    if (!source.includes(CALL)) throw new Error(`rail-audit: ${CALL} is no longer in ${FILE}`);
    process.stderr.write('rail-audit: every railway world is audited\n');
    return { ...out, source: source.replace(CALL, 'createWorld(RAIL_COMPONENTS, { audit: true, ...opts })') };
  },
});
