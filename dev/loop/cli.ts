// npm run loop                       the loop graph: nodes, bills, distances, cues, grind, order facts (--json)
// (docs/brainstorms/loop-graph.md; the graph is dev/loop/graph.ts)
import { printReport } from './report.ts';

const args = process.argv.slice(2);
const json = args.includes('--json');
const [command] = args.filter((a) => !a.startsWith('--'));

if (!command) printReport(json);
else {
  console.error(`npm run loop: unknown command "${command}"`);
  process.exit(1);
}
