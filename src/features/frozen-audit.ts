// Dev server only: loads src/debug/frozen-audit.ts, which reports a frozen node (render/instances.ts freezeInPlace)
// that moved. Production builds drop the import, so players never download it or pay for it.
import { background } from '../async.ts';

if (import.meta.env.DEV) background(import('../debug/frozen-audit.ts'), 'frozen-matrix audit');
