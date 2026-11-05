// The page's entry: the boot timeline (./timeline.ts) and the loading screen first (a few kB, so it paints at once),
// then the game, which is most of the download (three.js alone is over a megabyte). The service worker (./sw.ts)
// registers once the game is interactive.
import { bootMark } from './timeline.ts';
import './app-fill.ts';
import './splash.ts';
import './sw.ts';
import './chunk-reload.ts';
import { bootFailed } from './failure.ts';
if (new URLSearchParams(location.search).get('startup') === '1')
  (await import('../debug/startup-record.ts')).installStartupRecorder();
bootMark('files-start');
void import('../main.ts').catch(bootFailed);
