// One eager gate. Only this browser's deliberate opt-in loads Dev.
import { onStart } from '../loop.ts';
import { background } from '../async.ts';
import { tuningVisit } from '../dev-preferences.ts';

if (tuningVisit) {
  onStart(() =>
    background(
      import('../debug/dev-menu.ts').then((m) => {
        m.registerDockPanel({ id: 'looks', label: 'Looks', load: () => import('../debug/dev/looks.ts') });
        m.installDevMenu();
      }),
      'dev menu',
    ),
  );
}
