// One eager gate. Only this browser's deliberate opt-in loads Dev.
import { onStart } from '../loop.ts';
import { devEnabled } from '../dev-preferences.ts';

if (devEnabled) {
  onStart(() => import('../debug/dev-menu.ts').then((m) => m.installDevMenu()));
}
