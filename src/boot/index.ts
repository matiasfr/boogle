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
// A playtest jump-in (./jump-in.ts): seed a fresh private room first, before anything reads the room from the address.
// A chunk that fails to load stops here with the usual failure, rather than loading the address's room unseeded.
const from = new URLSearchParams(location.search).get('from');
const jump =
  from === null
    ? null
    : await import('./jump-in.ts').catch((error: unknown) => {
        bootFailed(error);
        return undefined;
      });
if (jump && from !== null) await jump.jumpIn(from);
if (jump !== undefined) void import('../main.ts').catch(bootFailed);
