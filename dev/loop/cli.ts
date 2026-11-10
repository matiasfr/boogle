// npm run loop                       the loop graph: nodes, bills, distances, cues, grind, order facts (--json)
// (docs/brainstorms/loop-graph.md; the graph is dev/loop/graph.ts)
// npm run loop -- run [--players N] [--order <name>] [--json]   play the graph's orders through the real rules
import { printReport } from './report.ts';
// npm run loop -- trace <session|path> [--bot <name|path>] [--players N] [--json]   prediction vs bot vs human
// npm run loop -- calibrate [ids...] [--dry]   detour factors per node from human sessions (dev/loop/detour.json)
import { calibrate } from './calibrate.ts';
import { runLoop } from './run.ts';
import { trace } from './trace.ts';

const args = process.argv.slice(2);
const json = args.includes('--json');
const [command] = args.filter((a) => !a.startsWith('--'));

if (!command) printReport(json);
else if (command === 'run') runLoop(args);
else if (command === 'calibrate') calibrate(args);
else if (command === 'trace') {
  try {
    trace(args);
  } catch (err) {
    console.error(`npm run loop -- trace: ${(err as Error).message}`);
    process.exit(1);
  }
} else {
  console.error(`npm run loop: unknown command "${command}"`);
  process.exit(1);
}
