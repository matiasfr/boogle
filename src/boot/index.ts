// The page's entry: the boot timeline (./timeline.ts) and the loading screen first (a few kB, so it paints at once),
// then the game, which is most of the download (three.js alone is over a megabyte).
import './timeline.ts';
import './app-fill.ts';
import './splash.ts';
import('../main.ts');
