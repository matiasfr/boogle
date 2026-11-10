// npm run loop                       the loop graph: nodes, bills, distances, cues, grind, order facts (--json)
// (docs/brainstorms/loop-graph.md; the graph is dev/loop/graph.ts)
// npm run loop -- run [--players N] [--order <name>] [--by-hand <node|all>] [--no-share] [--json]
//   play the graph's orders through the real rules
// npm run loop -- calibrate [ids...] [--dry]   detour factors per node from human sessions (dev/loop/detour.json)
// npm run loop -- trace <id|path> [more...] [--since YYYY-MM-DD] [--offline] [--bot <name|path>] [--players N] [--json]
//   prediction vs bot vs human per node; several sessions give one ranked table
import { calibrate } from './calibrate.ts';
import { printReport } from './report.ts';
import { runLoop } from './run.ts';
import { trace } from './trace.ts';

const args = process.argv.slice(2);
const json = args.includes('--json');
const [command] = args.filter((a) => !a.startsWith('--'));

try {
  if (!command) printReport(json);
  else if (command === 'run') runLoop(args);
  else if (command === 'calibrate') calibrate(args);
  else if (command === 'trace') await trace(args);
  else throw new Error(`unknown command "${command}"`);
} catch (err) {
  console.error(`npm run loop${command ? ` -- ${command}` : ''}: ${(err as Error).message}`);
  process.exit(1);
}
