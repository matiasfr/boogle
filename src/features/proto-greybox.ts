// Dev server only: ?greybox=sickle adds the Sickle Isles blockout (src/proto/greybox/) to the current world for layout
// review. Behind import.meta.env.DEV, so a production build carries neither this check's chunk nor the greybox.
import { background } from '../async.ts';

if (import.meta.env.DEV && new URLSearchParams(location.search).get('greybox') === 'sickle')
  background(import('../proto/greybox/index.ts'), 'Sickle Isles greybox');
