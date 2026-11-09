// npm run loop                       the loop graph: nodes, bills, distances, cues, grind, order facts (--json)
// (docs/brainstorms/loop-graph.md; the graph is dev/loop/graph.ts)
// npm run loop -- run [--players N] [--order <name>] [--json]   play the graph's orders through the real rules
import { printReport } from './report.ts';
import { runLoop } from './run.ts';

const args = process.argv.slice(2);
const json = args.includes('--json');
const [command] = args.filter((a) => !a.startsWith('--'));

if (!command) printReport(json);
else if (command === 'run') runLoop(args);
else {
  console.error(`npm run loop: unknown command "${command}"`);
  process.exit(1);
}
