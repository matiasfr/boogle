// One lint gate for CI, edits and the shared Claude/Codex hook.
import { lintFiles } from './runner.ts';
const flags = new Set([
  '--fix',
  '--prune-suppressions',
  '--pass-on-unpruned-suppressions',
  '--quiet',
  '--no-warn-ignored',
]);
const args = process.argv.slice(2);
for (const arg of args) if (arg.startsWith('-') && !flags.has(arg)) throw new Error(`Unknown lint flag: ${arg}`);
const targets = args.filter((a) => !a.startsWith('-'));
const start = performance.now();
const diagnostics = lintFiles(process.cwd(), targets.length ? targets : ['.'], {
  fix: args.includes('--fix'),
  prune: args.includes('--prune-suppressions'),
  relaxed: args.includes('--pass-on-unpruned-suppressions'),
});
for (const d of diagnostics) console.error(`${d.file}:${d.line}: ${d.rule}: ${d.message}`);
console.log(`lint: ${diagnostics.length} problems (${((performance.now() - start) / 1000).toFixed(3)}s)`);
process.exitCode = diagnostics.length ? 1 : 0;
