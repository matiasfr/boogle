// The tester's panel on ?proto=place (not on the `&fresh=1` link), and `window.__place` for the look evals
// (dev/look/evals/place-job.ts). The skips jump the state to a beat with no show, so a beat can be looked at by itself.
import { me, cam } from '../../player/player.ts';
import { teleport } from '../../physics/engine.ts';
import { carry } from '../../physics/platforms.ts';
import { PLAYER_R } from '../../constants.ts';
import { submitEdit } from '../../world/sync.ts';
import { playPanel } from '../flags.ts';
import { drawHeaps } from '../net/crates.ts';
import { DAY } from './look.ts';
import { ROCK_LIST, TREES, back, greatTree, shoulder, setTrunkTaken } from './chop.ts';
import { clearMoments, pullOn } from './celebrate.ts';
import { coop } from './coop.ts';
import { cart, rack, snapCart } from './depot.ts';
import { folk, setPushers } from './folk.ts';
import { forge, snapForge } from './forge.ts';
import { HAND_LOGS } from './forge.ts';
import { deliver, giftState, nearestCrate, openCrate, snapGifts, type GiftId } from './gifts.ts';
import { crystals, crystalAt, CRYSTALS, snapCrystals } from './crystals.ts';
import { H, PATH_SAMPLES } from './land.ts';
import { grantChest } from './ladder.ts';
import { job, save } from './job.ts';
import {
  CRANE,
  FORGE_BILLS,
  GOODS,
  ORIGIN,
  RACK,
  SHELF,
  STUB,
  TUNE,
  lineAt,
  toWorld,
  type LinePoint,
} from './layout.ts';
import { L1, L2, allHeaps, dock, forgeFrame, hub, lines, machine, stepsOf, yard } from './lines.ts';
import { halts } from './halts.ts';
import { trainEta, callTrain } from './rail.ts';
import { haltUnder, snapTrains, wakeTrains } from './cargo.ts';
import {
  activeFrame,
  beginFeed,
  log,
  placeMachine,
  run,
  setStationTags,
  snapRun,
  stationOf,
  wake,
  wakeNow,
} from './run.ts';
import { seated, sitDown, standUp } from './seat.ts';
import { backUp } from './verbs.ts';
import { boilerAt, lookThrough } from './props.ts';
import { snapCamp, snapTown } from './town.ts';
import { money, spend, earn } from './score.ts';
import { townLife } from './town-life.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const hop = (x: number, z: number, yaw: number) => {
  const b = me.body;
  if (!b || coop.noHop) return;
  teleport(b, x, H(x, z) + PLAYER_R + 0.4, z);
  b.velocity.set(0, 0, 0);
  carry.x = carry.z = 0;
  cam.yaw = me.yaw = yaw;
};
function skipWalk() {
  if (run.mode === 'asleep') {
    lineAt(L1.spec.line, run.head + 2, P);
    return hop(machine.flatbed.x - P.uz * -3.4, machine.flatbed.z + P.ux * -3.4, 0);
  }
  const st = activeFrame() ?? stationOf(run.line);
  if (st) hop(st.x, st.z + 3, 0);
}
/** The chop and the carry: the current frame has what it needs. */
function skipDelivery() {
  if (run.mode === 'asleep' || run.mode === 'waking') wakeNow();
  const st = activeFrame();
  if (!st) return;
  if (st === forgeFrame) {
    // All of it at once: on to the forge lit.
    forge.logs = HAND_LOGS;
    job.forgeBill = 1;
    forgeFrame.spec = FORGE_BILLS[1]!;
    if (!job.rung.pack) job.rung.pack = 1;
    job.chest = null;
    snapForge();
    return;
  }
  for (const g of GOODS) {
    st.have[g] = st.need(g);
    st.coming[g] = 0;
  }
  st.drawStock(st.have);
  st.setTag(true);
  beginFeed(run.line, st);
  save();
}
/** Line 1 through, no train, the axe's chest waiting. */
function skipPath() {
  if (L1.open) return hop(toWorld(-68), 2, -2.3);
  clearMoments();
  L1.stage = L1.stations.length;
  L1.open = true;
  job.awake = true;
  job.people += 8;
  L1.track.snapTo(L1.track.u(STUB.village));
  L1.stations.forEach((st) => st.drawStock({ logs: 0, rails: 0, stone: 0, beam: 0 }));
  run.line = L1;
  job.score.metres = 161;
  snapRun();
  grantChest('axe', true);
  hop(toWorld(-68), 2, -2.3);
  save();
}
/** The forge lit, its rack full: line 2's first station is next. */
function skipLine2() {
  if (!L1.open) skipPath();
  job.rung.axe = 1;
  job.rung.pack = 1;
  job.chest = null;
  job.forgeBill = 1;
  forgeFrame.spec = FORGE_BILLS[1]!;
  forge.logs = HAND_LOGS;
  forge.rails = forge.made = TUNE.rackMax;
  job.turned = true;
  snapRun();
  snapForge();
  hop(toWorld(RACK.x + 1), RACK.z + 3.4, 0.2);
  save();
}
/** Line 2 through to Far Head: the depot's on, the boiler's cast. */
function skipHead() {
  if (!job.turned) skipLine2();
  L2.stage = L2.spec.freeUpTo + 1;
  L2.open = true;
  job.rung.depot = true;
  job.boiler = 1;
  job.awake = true;
  run.mode = 'idle';
  L2.track.snapTo(L2.track.u(L2.stations[L2.stage]!.spec.s));
  snapRun();
  snapCart();
  hop(toWorld(RACK.x + 1), RACK.z + 3.4, 0.2);
  save();
}
/** Trains running. */
function skipTrains() {
  if (!L2.open) skipHead();
  job.boiler = 3;
  job.rung.trains = true;
  snapRun();
  snapTrains();
  for (const l of lines) snapCamp(l.k, true);
  snapTown(stepsOf(job.wood), stepsOf(job.stone));
  setPushers(false);
  save();
}
export function buildPanel(a: { startOver: () => void; atSpawn: () => void }) {
  const box = document.createElement('div');
  box.className = 'place-proto';
  const btn = (text: string, fn: () => void) => {
    const e = document.createElement('button');
    e.type = 'button';
    e.textContent = text;
    e.addEventListener('click', fn);
    box.append(e);
  };
  btn(coop.on ? 'Start over (both)' : 'Start over', () => {
    if (coop.on) return coop.askStartOver(box.firstElementChild as HTMLElement);
    if (!submitEdit({ op: 'tune.reset', i: 0, j: 0 })) a.startOver();
  });
  btn('Skip the walk', skipWalk);
  btn('Skip chop and carry', () => coop.skip('delivery', skipDelivery));
  btn('Skip to the first path', () => coop.skip('path', skipPath, () => hop(toWorld(-68), 2, -2.3)));
  btn('Skip to line 2', () => coop.skip('line2', skipLine2, () => hop(toWorld(RACK.x + 1), RACK.z + 3.4, 0.2)));
  btn('Skip to Far Head', () => coop.skip('head', skipHead));
  btn('Skip to trains', () => coop.skip('trains', skipTrains));
  (document.querySelector('.hud') ?? document.body).append(box);
  playPanel('place', box);
  coop.skips({ delivery: skipDelivery, path: skipPath, line2: skipLine2, head: skipHead, trains: skipTrains });
  window.__place = {
    day: DAY,
    job,
    s: job,
    lines,
    machine,
    run,
    back,
    forge,
    forgeFrame,
    hub,
    dock,
    yard,
    allHeaps,
    log,
    coop,
    TREES,
    ROCK_LIST,
    greatTree,
    TUNE,
    CRANE,
    PATH_SAMPLES,
    ORIGIN,
    H,
    drawHeaps,
    activeFrame,
    stationOf,
    placeMachine,
    setStationTags,
    skipWalk,
    skipDelivery,
    skipPath,
    skipForge: skipPath, // dev/video/shots/place.ts's name for it
    skipLine2,
    skipHead,
    skipTrains,
    startOver: a.startOver,
    wake,
    wakeTrains,
    backUp,
    seat: { seated, sitDown, standUp },
    giftState,
    openCrate,
    deliver,
    nearestCrate,
    crystals,
    crystalAt,
    CRYSTALS,
    folk,
    pullOn,
    halts,
    haltUnder,
    trainEta,
    callTrain,
    rack,
    cart,
    shoulder,
    setTrunkTaken,
    lookThrough,
    boilerAt,
    money,
    earn,
    spend,
    town: townLife,
    /** The first n gifts in their order, with no show. */
    give: (n: number, wear?: Record<string, GiftId>) => {
      const all: GiftId[] = [
        'hat',
        'scarf',
        'overalls',
        'critter',
        'beanie',
        'glasses',
        'headphones',
        'raincoat',
        'teacup',
        'festival',
      ];
      snapGifts(all.slice(0, n), 0, [], wear);
    },
    snapCrystals,
    RACK: { x: toWorld(RACK.x), z: RACK.z },
    SHELF: { x: toWorld(SHELF.x), z: SHELF.z, yaw: SHELF.yaw },
  };
}
