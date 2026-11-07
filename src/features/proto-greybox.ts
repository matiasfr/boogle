// Dev server only: ?greybox=<option> (sickle, or any layout in docs/world/map-prototypes.html) adds that map's
// blockout (src/proto/greybox/) to the current world. Behind import.meta.env.DEV, so a production build carries
// neither this check's chunk nor the greybox: players never get it.
import { background } from '../async.ts';

const option = import.meta.env.DEV ? new URLSearchParams(location.search).get('greybox') : null;
if (option !== null) background(import('../proto/greybox/index.ts'), `greybox ${option || 'sickle'}`);
