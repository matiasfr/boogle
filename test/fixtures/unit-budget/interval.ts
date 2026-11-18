import { writeSync } from 'node:fs';

setInterval(() => {}, 1000);
// Bounded on its own: detached on Windows, it would outlive a runner killed mid-test. 30 s stays far past the two
// seconds the tree-kill check waits for it.
setTimeout(() => process.exit(0), 30_000).unref();
writeSync(1, 'budget probe interval armed\n');
