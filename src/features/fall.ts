// The fall into the world (docs/game-design/first-run.md): a player's first visit starts on a trolley on a rail above the
// clouds, and Jump in runs them off the end of it through the BOOGLE title (src/fall/, in its own chunk, so nobody else
// downloads it). Round 4 supplies its landing to the same director; ?proto=fall replays it on every load. Other prototypes
// have their own arrival. Automated browsers skip it unless ?intro=1 asks to inspect it; intro=0 skips it
// explicitly. Serves DESIGN.md 10
// (Slapstick over precision).
import { isFirstVisit } from '../player/arrival.ts';
import { PROTO, pageQuery, protoOn } from '../proto/flags.ts';
import { warmUp } from '../render/precompile.ts';
import { fallArrival } from '../fall/arrival.ts';

const intro = pageQuery().get('intro');
if (
  intro !== '0' &&
  (protoOn('fall') || (isFirstVisit() && (!PROTO || PROTO === 'place') && (!navigator.webdriver || intro === '1')))
) {
  fallArrival.active = true; // before the place's asynchronous loader can position the player
  const loaded = (async () => {
    if (PROTO === 'place') {
      const [{ SPAWN, toWorld }, { H }, { SHORE_ARRIVAL, SHORE_LANDING }] = await Promise.all([
        import('../proto/place/layout.ts'),
        import('../proto/place/terrain.ts'),
        import('../proto/place/shore-layout.ts'),
      ]);
      const landing = SHORE_ARRIVAL ? SHORE_LANDING : SPAWN;
      fallArrival.target = { x: toWorld(landing.x), z: landing.z };
      fallArrival.yaw = landing.yaw;
      fallArrival.ground = H;
    }
    return import('../fall/index.ts');
  })();
  warmUp(() => loaded); // the loading screen waits, so the card never opens on the wrong view
}
