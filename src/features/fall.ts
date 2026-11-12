// The fall into the world (docs/game-design/first-run.md): a player's first visit starts on a trolley on a rail above the
// clouds, and Jump in runs them off the end of it through the BOOGLE title (src/fall/, in its own chunk, so nobody else
// downloads it). The current game supplies its landing to the same director. Other prototypes
// have their own arrival. Automated browsers skip it unless ?intro=1 asks to inspect it; intro=0 skips it
// explicitly. Serves DESIGN.md 10
// (Slapstick over precision).
import { isFirstVisit } from '../player/arrival.ts';
import { pageQuery, productionRailway } from '../proto/flags.ts';
import { warmUp } from '../render/precompile.ts';
import { fallArrival } from '../fall/arrival.ts';
import { JUMP_ROOM_RE } from '../world/railway-jump.ts';

const intro = pageQuery().get('intro');
// A playtest jump room (docs/plans/playtest-jump-in.md) lands everyone at its segment, a first visit included.
const jumpRoom = JUMP_ROOM_RE.test(pageQuery().get('room') ?? '');
if (intro !== '0' && isFirstVisit() && productionRailway && !jumpRoom && (!navigator.webdriver || intro === '1')) {
  fallArrival.active = true; // before the place's asynchronous loader can position the player
  const loaded = (async () => {
    const [{ LANDING, toWorld }, { H }] = await Promise.all([
      import('../place/layout.ts'),
      import('../place/terrain.ts'),
    ]);
    fallArrival.target = { x: toWorld(LANDING.x), z: LANDING.z };
    fallArrival.yaw = LANDING.yaw;
    fallArrival.ground = H;
    return import('../fall/index.ts');
  })();
  warmUp(() => loaded); // the loading screen waits, so the card never opens on the wrong view
}
