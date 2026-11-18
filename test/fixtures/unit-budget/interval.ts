import { writeSync } from 'node:fs';

setInterval(() => {}, 1000);
writeSync(1, 'budget probe interval armed\n');
