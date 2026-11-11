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
import { createCameraPullOut } from '../render/camera-pull-out.ts';
import { showActCard, momentBusy } from '../ui/moment-banner.ts';
import { storyAct, type StoryAct } from '../sim/railway-queries-story.ts';

/** Every string on a card. A title is the owner's to write: an act he has not titled shows its number only. The line
 * under it names a built place the railway goes next, or nothing. */
const ACTS: Record<StoryAct, { title: string | null; next: string | null }> = {
  1: { title: 'The beginning', next: null }, // the owner's own words
  2: { title: null, next: 'the Pier' },
};
const parts = (act: StoryAct) => ({
  above: ACTS[act].title ? `Act ${act}` : '',
  title: ACTS[act].title ?? `Act ${act}`,
  line: ACTS[act].next ? `Next stop: ${ACTS[act].next}` : '',
});

const CARD_S = 4.5; // on screen, fade in and out included
const LEAD_S = CARD_S - 1; // a live card comes up when the shot in front of it has this long left
const SETTLE_MS = 300; // a risen act is seen this long before it shows, so the show that marks it has queued its shot

// The words the Welcome back card says when the act went up while you were away.
addWelcomeItem({
  key: 'act',
  first: true,
  save: () => seen || undefined,
  since: (was) => {
    const w = railwayKnown(railwayWorldRead());
    if (!w || typeof was !== 'number') return null;
    const act = storyAct(w);
    if (act <= was) return null;
    const p = parts(act);
    return [p.above ? `${p.above} · ${p.title}` : p.title, p.line].filter(Boolean).join(' · ');
  },
});

const returning = !showCard(); // a returning visit has the Welcome back card
let seen = 0; // the highest act this browser has shown (or, when returning, been told of)
let arrived = false;
let risenAt = 0;
const aerial = createCameraPullOut(() => false, true);

/** An aerial move over where you land, ending behind Buddy where the follow camera takes over: the card's title comes up
 * over it. Your own arrival only. Reduced motion and a seated player get the title over the plain view. */
const f = new THREE.Vector3(),
  r = new THREE.Vector3(),
  from = new THREE.Vector3(),
  to = new THREE.Vector3(),
  at = new THREE.Vector3();
function aerialMove() {
  if (!me.body) return;
  const { x, y, z } = me.body.position;
  f.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
  r.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  from
    .set(x, y + 42, z)
    .addScaledVector(f, 34)
    .addScaledVector(r, 20);
  to.set(x, y + 11, z).addScaledVector(f, -9);
  at.set(x, y + 2, z).addScaledVector(f, 8);
  aerial.play(from, to, at, CARD_S);
}

function show(act: StoryAct, how: 'arrival' | 'live', waitedMs = 0) {
  seen = act;
  showActCard({ ...parts(act), seconds: CARD_S });
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
    aerial.update(dt);
    const w = known(); // re-read every frame: a published world is never written
    if (!w) return;
    const act = storyAct(w);
    if (!arrived) {
      if (returning) {
        // The Welcome back card carries it (the `since` above); this visit has been told.
        seen = act;
        arrived = true;
      } else if (fallArrival.active ? me.down : true) {
        // A first visit: at the landing, or at once where no fall plays. Automated browsers skip the title like the fall.
        arrived = true;
        if (navigator.webdriver && !fallArrival.active) seen = act;
        else {
          show(act, 'arrival');
          aerialMove();
        }
      }
      return;
    }
    if (act <= seen) {
      risenAt = 0;
      return;
    }
    risenAt ||= now;
    if (now - risenAt < SETTLE_MS || momentBusy(LEAD_S)) return;
    show(act, 'live', now - risenAt);
    risenAt = 0;
  },
});
