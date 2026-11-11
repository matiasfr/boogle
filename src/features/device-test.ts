// The remote device test (docs/plans/remote-device-tests.md): with `?device=` in the address, the panel and the suite
// load as their own chunk (src/debug/device/); without it this is one query check, so normal players download nothing.
// Sync kind: Local. Serves DESIGN.md "How we work" (evidence from the devices the game is played on).
import { background } from '../async.ts';

if (new URLSearchParams(location.search).has('device'))
  background(
    import('../debug/device/index.ts').then((m) => m.startDeviceTest()),
    'device test',
  );
