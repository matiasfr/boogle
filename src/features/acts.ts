// Acts: the room's story is cut into acts, and a title says which one you are in (docs/brainstorms/acts.md; owner,
// 11 November 2026: "Act 1: the beginning", and the next act when the room hits a big checkpoint). The act is derived
// from railway progress the world already holds (`storyAct`, src/sim/railway-queries-story.ts): nothing is saved or
// sent, so there is no op and no WORLD_NS. This browser only remembers the highest act it has shown, in the room's visit
// memory (src/player/arrival.ts), and shows the current act once whenever it goes up:
//   - a first visit sees it on arrival, over a short aerial camera move of your own (the room's other players are not
//     affected): Act 1, or the room's current act for a late joiner;
//   - a returning player gets it as the first line of the Welcome back card instead (no second full-screen card);
//   - everyone in the room sees a live change as it happens, over Far Head's shared shot, which every page already plays.
// The card is a variant of the moment banner (src/ui/moment-banner.ts), which also says whether another full-screen
// moment (a pull-out, a reward card, the finale's banner, the pause view) is showing: the act waits behind them.
// Local presentation of Server-replicated state. Serves DESIGN.md 7 (Telegraph everything) and 6 (Communal world).
import '../world/game-world.ts'; // first, as welcome-back.ts does: the lockstep rules register before anything else
import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../entity/entity.ts';
import { me, cam } from '../player/player.ts';
import { worldStatus } from '../world/sync.ts';
import { productionRailway } from '../proto/flags.ts';
import { playMark } from '../proto/mark.ts';
import { background } from '../async.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import { railwayKnown } from '../player/welcome-railway.ts';
import { addWelcomeItem, showCard } from '../player/arrival.ts';
import { fallArrival } from '../fall/arrival.ts';
import { camera } from '../render/scene.ts';
import { createCameraPullOut } from '../render/camera-pull-out.ts';
import { momentBusy } from '../render/buddy-frame.ts';
import { showActCard, actRising, momentBanner } from '../ui/moment-banner.ts';
import { storyAct, type StoryAct } from '../sim/railway-queries-story.ts';

/** Every string on a card. A title is the owner's to write: an act he has not titled shows its number only, and no line
 * under it (owner, 11 November: keep it a bit mysterious). */
const TITLES: Record<StoryAct, string | null> = {
  1: 'The beginning', // the owner's own words
  2: null,
};
const parts = (act: StoryAct) => ({
  above: TITLES[act] ? `Act ${act}` : '',
  title: TITLES[act] ?? `Act ${act}`,
});

const CARD_S = 4.5; // a live card: on screen, fade in and out included
const LEAD_S = CARD_S - 1; // a live card comes up when the shot in front of it has this long left
const SETTLE_MS = 300; // a risen act is seen this long before it shows, so the show that marks it has queued its shot
// The arrival's crane: 4.8 s from the follow camera up and back down to it, easing 1.8 s each way (about 35 degrees a
// second at the steepest). The title fades in 0.6 s after it starts, once the view is steady, and is gone before the
// hand-back completes.
const CRANE_S = 4.8,
  CRANE_BLEND_S = 1.8,
  TITLE_DELAY_MS = 600,
  ARRIVAL_CARD_S = 3.8;
// How far it rises and goes back, and how far past Buddy it looks, in metres. At the apex the camera is about 39 m
// (wide view) or 27 m (portrait) from Buddy, who stays on the centre line and, with the look-ahead, within the middle
// third of the frame; portrait is closer and looks less far ahead because its frame is narrow and tall.
const CRANE = { wide: { back: 14, up: 30, ahead: 5 }, tall: { back: 8, up: 20, ahead: 3 } };

// The words the Welcome back card says when the act went up while you were away.
addWelcomeItem({
  key: 'act',
  first: true,
  absent: 1, // a memory from before acts: the room was in Act 1 for them
  save: () => seen || undefined,
  since: (was) => {
    const w = railwayKnown(railwayWorldRead());
    if (!w || typeof was !== 'number') return null;
    const act = storyAct(w);
    if (act <= was) return null;
    const p = parts(act);
    return p.above ? `${p.above} · ${p.title}` : p.title;
  },
});

const returning = !showCard(); // a returning visit has the Welcome back card
let seen = 0; // the highest act this browser has shown (or, when returning, been told of)
let arrived = false;
let risenAt = 0;
let landed = false,
  cardAct: StoryAct | 0 = 0,
  cardAt = 0;
let lastX = 0,
  lastZ = 0;
const aerial = createCameraPullOut(() => false);
const lift = new THREE.Vector3();
/** The arrival's crane over the follow camera, which the card's title comes up over. Your own arrival only (nobody
 * else's camera is touched). Reduced motion and a seated player get the title over the plain view. */
function craneMove() {
  const c = camera.aspect < 1 ? CRANE.tall : CRANE.wide;
  lift.set(Math.sin(cam.yaw) * c.back, c.up, Math.cos(cam.yaw) * c.back);
  aerial.crane(lift, c.ahead, CRANE_S, CRANE_BLEND_S);
}

function show(act: StoryAct, how: 'arrival' | 'live', waitedMs = 0) {
  seen = act; // written only now that the card has started showing (and what the visit memory saves)
  showActCard({ ...parts(act), seconds: how === 'arrival' ? ARRIVAL_CARD_S : CARD_S });
  background(
    import('../render/fanfare.ts').then((m) => m.actSting()),
    'act sting',
  );
  playMark('act shown', { act, how, waitedMs: Math.round(waitedMs) });
}

// The room's state is here: joined (a tab starts 'local', with an empty world that reads as ready) and loaded.
const known = () => {
  const w = worldStatus();
  return w.mode !== 'local' && w.ready ? railwayKnown(railwayWorldRead()) : null;
};

defineKind('acts', { lateUpdate: 45 });
spawn({
  kind: 'acts',
  lateUpdate({ now, dt }) {
    if (!productionRailway || !me.entered) return;
    // Moved during the aerial move (a death, a teleport): the camera comes home at once, not to the old spot.
    if (me.body) {
      const { x, z } = me.body.position;
      if (aerial.active() && Math.hypot(x - lastX, z - lastZ) > 6) aerial.cancel();
      lastX = x;
      lastZ = z;
    }
    aerial.update(dt);
    const w = known(); // re-read every frame: a published world is never written
    if (!w) return;
    const act = storyAct(w);
    if (!arrived) {
      if (returning) {
        // The Welcome back card carries it (the `since` above); this visit has been told.
        seen = act;
        arrived = true;
      } else {
        // A first visit: once Buddy is back up from the landing, or at once where no fall plays. Automated browsers
        // skip the title like the fall.
        if (fallArrival.active && me.down) landed = true;
        if (fallArrival.active ? landed && !me.down : true) {
          arrived = true;
          if (navigator.webdriver && !fallArrival.active) seen = act;
          else {
            craneMove();
            cardAct = act;
            cardAt = now + (aerial.active() ? TITLE_DELAY_MS : 0);
          }
        }
      }
      return;
    }
    if (cardAct) {
      if (now >= cardAt) {
        show(cardAct, 'arrival');
        cardAct = 0;
      }
      return;
    }
    if (act <= seen) {
      risenAt = 0;
      return;
    }
    if (!risenAt) {
      risenAt = now;
      actRising(); // a banner raised in the same moment waits behind the card
    }
    // The card shares one element with the banners, so it also waits for a banner to run out whole.
    if (now - risenAt < SETTLE_MS || momentBusy(LEAD_S) || momentBanner()) return;
    show(act, 'live', now - risenAt);
    risenAt = 0;
  },
});
