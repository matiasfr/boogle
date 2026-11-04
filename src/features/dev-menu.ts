// One eager gate. Nothing from Dev is loaded, mounted or sampled without this exact opt-in.
import { onStart } from '../loop.ts';

if (new URLSearchParams(location.search).get('dev') === '1') {
  onStart(() => import('../debug/dev-menu.ts').then((m) => m.installDevMenu()));
}
