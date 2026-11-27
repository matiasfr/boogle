import { advanceHold } from '../../components/hold/view.ts';
// The train garage's world half (docs/brainstorms/engine-garage.md, first build; docs/plans/garage-install-moment.md,
// G2; view only): the works copy of the engine standing on the Roundhouse table for the upgrade or after wagon coupling, when
// the deck is at rest, wearing the room's fit; the blast pipe or longer boiler waiting on its stand when its install is ready, and as a
// ghost; the jib and its two little guys; the lever post that opens it; the camera; and the install moment (hold to
// lift, release to lower, finish to send the install; the server's accept drops it). There is no try-on (owner, 14
// November 2026): the hold is offered only when the room has what the part needs.
// Local to this tab: the one thing sent is `rail.install`, through `deps.install`. The screen half is src/features/garage.ts; railway
// state comes in through garage-state.ts's `roomFacts` only, and where things stand through garage-geo.ts's row.
import * as THREE from 'three/webgpu';
import * as cars from './cars.ts';
import { ENGINE, ENGINE_BOILER, ENGINE_LONG_AHEAD, ENGINE_WHEELS } from './engine.ts';
import { instantiate, liftOrWait } from '../../prefab/instantiate.ts';
import { frameOccupied, standWhenClear } from './frame-occupied.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { camConstraints, camForward, me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import { reducedMotion } from '../../constants.ts';
import { clank, thump, chuff, whistle, cordPull } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { notify } from '../../ui/notify.ts';
import type { TradeRefusal } from '../../sim/railway.ts';
import { createGarageSelection, type Focus } from './garage-selection.ts';
import {
  BOILERS,
  INSTALL_ID,
  MOMENT_FROM,
  INSTALL_PART,
  isInstall,
  MOMENT,
  SIZES,
  liftOf,
  partsOf,
  readyAnywhere,
  lineFacts,
  speedMs,
  tradeFromSpeed,
  GARAGE_LINE,
  TRADE_ROW,
  TRADE_DENIAL,
  type CatId,
  type InstallId,
  type Part,
  type PartId,
  type Phase,
  type RoomFacts,
} from './garage-data.ts';
import { garage, type GarageSnap } from './garage-state.ts';
import { garageFlip, polarAt, type GarageGeo } from './garage-geo.ts';
import { createGaragePieces, type Geo } from './garage-pieces.ts';
import type { InstallPart } from '../../sim/railway-works-layout.ts';

type Deps = {
  /** The bridge's yaw while the deck is at rest (no shunt on it, not turning), else null. Read every frame. */
  restYaw(): number | null;
  /** Sends `rail.install` for `line`'s copy on the revision this tab saw (`Line.rev`); false when it could not be
   * sent. A sent install is not an installed boiler: nothing drops until `accepted(true)`. */
  install(line: number, rev: number, part: InstallPart): boolean;
  /** Garage step 4: sends `rail.bring` for `line`'s copy on the table's bring revision this tab saw; false when it
   * could not be sent. Nothing turns until the accepted row (`Shed.tableLine`) says so. */
  bring(line: number, rev: number): boolean;
  /** A hold at this garage's post is inside the server's reach for the install. */
  installHere: boolean;
  /** The railway session is live (a lost connection ends a waiting install). */
  online(): boolean;
};

const rad = (d: number) => (d * Math.PI) / 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** The deck turns the copy to and from the garage's pose at this rate: a quarter turn a second. */
const DECK_RATE = Math.PI / 2;
/** The jib's arm swings between its park and the part at this rate (about 2 s for the swing), and keeps up with a
 * part on the hook at the faster one. */
const ARM_RATE = { swing: 1.5, follow: 9 } as const;
/** A part hanging for the server's answer rises this far over the designed hang, clear of the boiler that is on. */
const HANG_CLEAR = 0.9;
/** The install's whistle carries across the room, quiet at distance (metres; machine sounds reach 45). */
const WHISTLE_HEAR = 400;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const backOut = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const TAU = Math.PI * 2;

/** A camera per category, in the train's own frame (nose +z, centre of the 8.5 m train on the table's centre). */
const CAMS: Record<CatId, { pos: [number, number, number]; at: [number, number, number]; turns: boolean }> = {
  engine: { pos: [7.2, 2.7, 8.0], at: [-0.4, 1.1, 0.4], turns: true },
  cars: { pos: [3.6, 2.3, -5.6], at: [0, 1.0, -1.4], turns: false },
  cargo: { pos: [4.2, 2.8, -7.0], at: [0, 0.9, -2.4], turns: false },
  // Looks and Whistle hold the table still: turning, it carried the chosen part's frame behind the engine. The
  // Whistle shot looks at the chimney's cap, where the whistle's steam leaves (it was close on the cab).
  looks: { pos: [8.4, 2.2, 1.0], at: [0, 1.2, 0.2], turns: false },
  whistle: { pos: [3.6, 3.9, 9.4], at: [0, 2.9, 5.6], turns: false },
};

/** The camera eases to a newly chosen category or part at this rate (1/s: most of the way in a third of a second). */
const CAM_EASE = 7;

/** A phone held upright: the panel takes the top of the screen and the rail and parts the bottom, leaving a band in
 * the middle a third of the screen high, and the view is narrow. Each shot has its own portrait row: further back,
 * aimed at its subject so it sits in that band, and standing on the train's open side (the engine shot's), since a
 * landscape row pulled straight back lands in whatever stands behind the table. The whistle's is its landscape row
 * pulled back along its own line. */
const PORTRAIT: Partial<Record<CatId, (typeof CAMS)[CatId]>> = {
  engine: { pos: [13.2, 4.2, 11.2], at: [0, 2.0, 4.4], turns: true },
  cars: { pos: [11.3, 3.8, 6.4], at: [0, 1.5, -0.2], turns: false },
  cargo: { pos: [11.3, 3.8, 5.0], at: [0, 1.3, -1.6], turns: false },
  looks: { pos: [16, 5, 8.1], at: [0, 1.9, 2.3], turns: false },
};
const PORTRAIT_BACK = 1.8;
const portrait = () => typeof innerHeight === 'number' && innerHeight > innerWidth * 1.15;
function camOf(cat: CatId): (typeof CAMS)[CatId] {
  const c = CAMS[cat];
  if (!portrait()) return c;
  const own = PORTRAIT[cat];
  if (own) return own;
  const at: [number, number, number] = [c.at[0], c.at[1] + 0.6, c.at[2]];
  return {
    pos: [0, 1, 2].map((k) => at[k]! + (c.pos[k]! - c.at[k]!) * PORTRAIT_BACK) as [number, number, number],
    at,
    turns: c.turns,
  };
}

function garageMaterials(owner: OwnedView) {
  const flash = new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });
  const crew = ['#e8a53a', '#4f8fd0'].map((color) => ({
    body: new THREE.MeshStandardNodeMaterial({ color, roughness: 0.7 }),
    head: new THREE.MeshStandardNodeMaterial({ color: '#f2d3b0', roughness: 0.8 }),
  }));
  owner.cleanup(() => {
    flash.dispose();
    for (const { body, head } of crew) {
      body.dispose();
      head.dispose();
    }
  });
  return { flash, crew };
}

export function createGarageView(
  owner: OwnedView,
  geo: Geo,
  row: GarageGeo,
  site: 0 | 1,
  deps: Deps,
  pieces = createGaragePieces(owner, geo, row),
) {
  const { TRAILER, WAGON_CAR, STEEL_CAR } = cars;
  const {
    displayOffset,
    steelOffsets,
    flatbedOffset,
    tableTop,
    centre,
    brass,
    knobMat,
    root,
    rig,
    furniture,
    shift,
    train,
    engine,
    shortSet,
    longSet,
    rods,
    wheels,
    ghostMat,
    ghost,
    pipeGeo,
    pipe,
    pipeGhost,
    jibAt,
    standYaw,
    hookMid,
    standRest,
    pipeStandRest,
    pipeStand,
    crank,
    trolley,
    chain,
    armPivot,
    bolts,
    stand,
    setLong,
    wearFit,
  } = pieces;
  let knobShown = '';

  // ---------------------------------------------------------------- what the chosen part shows
  // Stepping through the tiles changes the picture, not only the tile (owner, 14 November 2026: "there should be some
  // visual change, and I'm looking through the different wagons"): a frame round the chosen part on the copy (whole
  // when the room has it; the game's dashed "a part goes here" when it does not), the camera easing to it, and a car
  // the room owns that the copy does not carry drawn as a ghost where it rides in the train. No button and no rule:
  // nothing is tried on, and nothing on a real train changes until an install. Local: nobody else sees a selection.
  // The frames and the ghost car are ./garage-selection.ts's, which owns their teardown. Every place below is in the
  // train's own frame, so it stands on the deck's rails (`geo.y`) wherever the ground around the table is.
  const selection = createGarageSelection(owner, train);
  /** Where a part is, or goes, in the train's frame, with the ghost car to draw for it: a car the room owns that the
   * copy does not carry. */
  function focusOf(p: PartId): Focus {
    const b = ENGINE_BOILER,
      at = displayOffset('engine'),
      long = wearsLong() ? ENGINE_LONG_AHEAD : 0;
    const barrel = (ahead: number): Focus => ({
      c: [0, b.y, at + (b.zBack + b.zFront + ahead) / 2],
      s: [b.r * 2 + 0.25, b.r * 2 + 0.25, b.zFront + ahead - b.zBack + 0.2],
    });
    const car = (z: number, top: number, owned: boolean): Focus => ({
      c: [0, (top + 0.5) / 2, z],
      s: [2.3, top + 0.5, 3.3],
      ...(owned ? { ghost: { z, top } } : {}),
    });
    switch (p) {
      case 'boiler':
        return barrel(long);
      case 'long':
      case 'big':
      case 'quick':
        return barrel(ENGINE_LONG_AHEAD);
      case 'strong':
        return barrel(0);
      case 'flatbed':
        return car(flatbedOffset, TRAILER.top, tableRow() === TRADE_ROW.strong);
      case 'blast':
        return { c: [0, b.chimney.y - 0.1, at + b.chimney.z], s: [0.7, 0.9, 0.7] };
      case 'plough':
        return { c: [0, 0.7, at + b.zFront + long + 0.45], s: [1.9, 1.2, 0.9] };
      case 'four':
        return { c: [0, TRAILER.top + 0.6, 0], s: [2.3, 1.2, 3.3] };
      case 'roof':
        return { c: [0, (TRAILER.top + 2.8) / 2, 0], s: [2.6, 2.8 - TRAILER.top, 3.4] };
      case 'kitcar':
        return car(displayOffset('kit'), TRAILER.top, true);
      case 'wagon':
        return car(displayOffset('wagon'), WAGON_CAR.top, facts.wagonCoupled);
      case 'steelcar':
        return car(steelOffsets[Number(facts.wagonCoupled)]!, STEEL_CAR.top, facts.longFitted);
      case 'toot':
      case 'two':
        return { c: [0, b.chimney.y + (wearsLong() ? 0.17 : 0), at + b.chimney.z + long], s: [0.7, 0.7, 0.7] };
    }
  }

  // ---------------------------------------------------------------- the part on its stand, the jib and the guys
  const partGroup = new THREE.Group(); // lives in the root's frame, not the rig's: the table does not turn it
  partGroup.visible = false;
  const lift = (set: THREE.Mesh[]) =>
    [set[1]!, set[2]!].map((m) => {
      const c = new THREE.Mesh(m.geometry, m.material);
      c.castShadow = true;
      partGroup.add(c);
      return c;
    });
  const lifted = lift(longSet),
    // Garage step 4: the Strong boiler is the standard barrel; it goes on as the longer one does.
    liftedShort = lift(shortSet);
  const liftedPipe = new THREE.Mesh(pipeGeo, brass);
  liftedPipe.castShadow = true;
  partGroup.add(liftedPipe);
  root.add(partGroup);
  const { flash: flashMat, crew } = garageMaterials(owner);
  const flash = new THREE.Group();
  const longFlash = lifted.map((m) => new THREE.Mesh(m.geometry, flashMat)),
    shortFlash = liftedShort.map((m) => new THREE.Mesh(m.geometry, flashMat));
  flash.add(...longFlash, ...shortFlash);
  const pipeFlash = new THREE.Mesh(pipeGeo, flashMat);
  flash.add(pipeFlash);
  flash.visible = false;
  partGroup.add(flash);

  const guys = crew.map((materials) => {
    const g = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.35, 4, 8), materials.body);
    bodyM.position.y = 0.45;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), materials.head);
    head.position.y = 0.92;
    bodyM.castShadow = head.castShadow = true;
    g.add(bodyM, head);
    root.add(g);
    return g;
  });
  const guyBase = row.crew.map((p) => polarAt(centre, p));
  guys.forEach((g, i) => g.position.set(guyBase[i]!.x, geo.ground, guyBase[i]!.z));

  // ---------------------------------------------------------------- state
  let open = false,
    openT = 0, // 0..1: the camera's weight and the works copy's presence
    cat: CatId = 'engine',
    sel: PartId = 'boiler',
    phase: Phase = 'idle',
    ring = 0,
    holding = false,
    ms = 0,
    tapped = 0,
    holdAt = 0,
    stopLeft = 0, // s of hit-stop left
    shake = 0,
    ghostT = 1,
    turnYaw = 0,
    showTurn = -1,
    wheelAngle = 0,
    spinRate = speedMs(BOILERS.boiler.speed),
    chuffAt = 0,
    clickAt = 0,
    answered = false,
    hit = false,
    facts: RoomFacts = {
      boilerFitted: false,
      wagonCoupled: false,
      tableBusy: false,
      upgradeReady: false,
      steelHome: false,
      steel: 0,
      longFitted: false,
      boilerRev: 0,
      installRev: 0,
      gorgeReached: false,
      tableLine: GARAGE_LINE,
      bringRev: 0,
      held: false,
      lines: [],
    },
    skipped = false,
    // A real install (docs/plans/garage-install-moment.md, G3): `real` from the commit to its end, `waiting` while the
    // part hangs for the server's answer, `sinceCommit` the wall time the answer has taken (ms).
    real = false,
    waiting = false,
    sinceCommit = 0,
    hangUp = 0, // m the waiting part has risen over the designed hang
    // Whose moment (G4): `mine` is this tab's own hold; a moment that is not is someone's accepted install, watched in
    // the garage or in the world, with no camera or input taken. `brief` ends it after the steam.
    mine = false,
    brief = false,
    restored = false,
    // Garage step 4: the row the copy wore last (a watched trade fit's wheels run up from it), the table line shown,
    // and a bring in the air (its send time, 0 for none) on the bring revision it was sent on.
    fromRow = 0,
    // The garage took inputState.held itself (open); it hands it back only while it is still the holder
    // (`inputState.holder`), so a card or talk that took the input after it keeps it.
    ownsHold = false,
    wornRow = 0,
    tableShown = -1,
    bringing = 0,
    bringRev = 0,
    // The camera's ease: the next frame snaps (the garage just opened), and when it last ran.
    camSnap = true,
    camClock = 0;
  let momentPart: InstallId = 'long';
  /** Garage step 4: the copy on the table is `facts.tableLine`'s, a trade line's row 0, Quick (4) or Strong (5). */
  const trade = () => facts.tableLine !== GARAGE_LINE;
  const tableRow = () => lineFacts(facts, facts.tableLine)?.row ?? 0;
  const isTrade = (p: InstallId): p is 'quick' | 'strong' => p === 'quick' || p === 'strong';
  /** The copy wears the longer boiler's barrel and chimney: line 2's longer or Big boiler, a trade line's Quick. */
  const wearsLong = () => cars.wearsLong(facts.tableLine, lineFacts(facts, facts.tableLine)?.row ?? 0);
  /** The rate a moment's wheels start from: the boiler its part replaces (a trade fit's: the line's row before it). */
  const fromRate = () =>
    isTrade(momentPart) ? tradeFromSpeed(facts.tableLine, fromRow) : speedMs(BOILERS[MOMENT_FROM[momentPart]].speed);
  // `facts` is a fresh object each frame, so the part list is built once per frame, not once per question.
  let partsFacts: RoomFacts | null = null,
    partsList: Part[] = [];
  const parts = () => {
    if (partsFacts !== facts) {
      partsList = partsOf(facts);
      partsFacts = facts;
    }
    return partsList;
  };
  const readyPart = (id: PartId) => isInstall(id) && parts().some((p) => p.id === id && p.standing === 'ready');
  /** Garage step 4: a paid trade line's other boiler goes on for nothing ('swap'); only the open screen offers it, so
   * it never waits on the stand or lights the knob. */
  const swapPart = (id: PartId) => open && isInstall(id) && parts().some((p) => p.id === id && p.standing === 'swap');
  const offered = (): InstallId | null => {
    // A paid line's free Swap goes on from the screen, never from the stand (only a first fit waits there).
    if (open && isInstall(sel) && readyPart(sel)) return sel;
    return (Object.keys(INSTALL_PART) as InstallId[]).find(readyPart) ?? null;
  };
  const activePart = () => (phase === 'idle' ? (offered() ?? (isInstall(sel) ? sel : 'long')) : momentPart);
  const canInstall = () =>
    deps.installHere &&
    (readyPart(sel) || swapPart(sel)) &&
    !facts.tableBusy &&
    !facts.held &&
    !bringing &&
      !!facts.postOpen;
  const size = () => SIZES[activePart() === 'blast' ? 'medium' : 'large'];
  function showPart() {
    const blast = activePart() === 'blast';
    liftedPipe.visible = blast;
    const short = activePart() === 'strong';
    lifted.forEach((m) => (m.visible = !blast && !short));
    liftedShort.forEach((m) => (m.visible = short));
    pipeFlash.visible = blast;
    for (const m of longFlash) m.visible = !blast && !short;
    for (const m of shortFlash) m.visible = short;
    pipeStand.visible = blast;
    const ghostBlast = (phase === 'idle' ? sel : momentPart) === 'blast';
    ghost.children.forEach((m) => (m.visible = ghostBlast ? m === pipeGhost : m !== pipeGhost));
  }
  // The copy on the table. It stands along the bridge (`deps.restYaw`, read each frame, never assumed), nose to
  // whichever end turns the deck least to the garage's pose (the engine shot's camera on the row's bearing, the
  // engine on the screen's left). `yaw` is the rig's; the bridge is drawn at `deckYaw()`.
  let shown = false,
    snapNext = true, // the next appearance is a restore's or a first frame's: no puff, no toot
    side: 1 | -1 = 1,
    flip = 0,
    restPose = 0,
    yaw = 0,
    settled = false;
  const engineWorld = new THREE.Vector3();
  /** The camera's angle off the nose in the engine shot (its place in the train's frame, the train centred). */
  const camPhi = Math.atan2(CAMS.engine.pos[0], CAMS.engine.pos[2] - shift);
  /** The rig's yaw that puts the engine shot's camera on the row's bearing, seen from `s`'s side. */
  const camYaw = (s: number) => Math.PI - rad(row.camBearing) - s * camPhi;
  const baseYaw = () => camYaw(side);
  function pickPose(rest: number) {
    // One side only: the engine shot puts the engine on the screen's left, clear of the panel on the right. Seen from
    // the other side it stands under the panel (looked at in G3's capture), so only the nose is picked.
    side = 1;
    flip = garageFlip(rest, camYaw(side));
    restPose = rest + flip;
  }
  // One static box per vehicle, at the rest pose: it does not turn with the table (design review, call 23), and each
  // is added only once this tab's player is clear of it, so nobody is pushed or trapped.
  const copyRecords = new Map<string, ReturnType<typeof instantiate>[]>();
  let standingKey = '';
  function solid() {
    const long = shown && wearsLong() ? ENGINE_LONG_AHEAD : 0;
    const key = shown ? `${restPose.toFixed(4)} ${long}` : '';
    if (key === standingKey) return !!key;
    const old = copyRecords.get(standingKey);
    if (old) {
      const retire = liftOrWait(
        [{ shapes: old.flatMap((r) => r.solids), on: () => old.forEach((r) => r.setEnabled(false)) }],
        me.body,
        { lift: false, occupied: frameOccupied },
      );
      if (retire.kind === 'wait') return true;
      standingKey = '';
    }
    if (!key) return false;
    let records = copyRecords.get(key);
    if (!records) {
      const want = [
        {
          z: displayOffset('engine') - shift + long / 2,
          hx: ENGINE.hx,
          hz: ENGINE.hz + long / 2,
          top: ENGINE_BOILER.top,
        },
        { z: -shift, hx: TRAILER.hx, hz: TRAILER.hz, top: TRAILER.top + 0.1 },
      ];
      const sin = Math.sin(restPose),
        cos = Math.cos(restPose);
      records = want.map((w, i) =>
        instantiate(
          'greybox.collider',
          {
            prefab: 'greybox.collider',
            id: `garage-${site}-vehicle-${i}`,
            rot: [restPose, 0, 0],
            pos: [centre.x + sin * w.z, tableTop + w.top / 2, centre.z + cos * w.z],
            scale: [2 * w.hx, w.top, 2 * w.hz],
          },
          { owner },
        ),
      );
      copyRecords.set(key, records);
    }
    const next = records;
    if (
      !standWhenClear(
        next.flatMap((r) => r.solids),
        () => next.forEach((r) => r.setEnabled(true)),
      )
    )
      return false;
    standingKey = key;
    return true;
  }

  const soundAt = (p: { x: number; z: number }, fn: (x: number, z: number) => void) => fn(p.x, p.z);
  const seatPos = () => engine.getWorldPosition(engineWorld);
  const steam = new THREE.Color('#e9eef2'),
    spark = new THREE.Color('#ffd27a');
  const chimney = () =>
    engine.localToWorld(new THREE.Vector3(0, ENGINE_BOILER.chimney.y + (longOn() ? 0.17 : 0), ENGINE_BOILER.chimney.z));
  const longOn = () => longSet[0]!.visible;
  function steamPuff(n: number, up = 1.6) {
    const c = chimney();
    for (let i = 0; i < n; i++)
      emit({
        x: c.x,
        y: c.y,
        z: c.z,
        vx: (Math.random() - 0.5) * 0.4,
        vy: up * (0.6 + Math.random() * 0.6),
        vz: (Math.random() - 0.5) * 0.4,
        life: 1.2,
        size: 0.3,
        color: steam,
        alpha: 0.75,
        grow: [1, 2.6],
        fade: 0.6,
        shape: 'dust',
      });
  }
  function sparks(at: THREE.Vector3, n: number) {
    for (let i = 0; i < n; i++)
      emit({
        x: at.x,
        y: at.y,
        z: at.z,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 2.5,
        vz: (Math.random() - 0.5) * 3,
        life: 0.7,
        size: 0.07,
        color: spark,
        intensity: 1.8,
        alpha: 0.95,
        gravity: 6,
        shrink: 0.5,
        fade: 0.4,
        shape: 'glint',
      });
  }

  /** Outside an install's moment the copy wears exactly the rows: the room's boiler, bolted when it is the longer one. */
  function wearRows() {
    wornRow = tableRow();
    wearFit(wearsLong(), !trade() && facts.boilerRev === 1);
  }
  /** The engine's cruise in the garage, by the room's fit. */
  const today = () =>
    trade()
      ? tradeFromSpeed(facts.tableLine, tableRow())
      : speedMs(
          BOILERS[facts.boilerRev >= 3 ? 'big' : facts.longFitted ? 'long' : facts.boilerRev === 1 ? 'table' : 'boiler']
            .speed,
        );
  /** The copy's first appearance on a live tick (design review, call 22): behind one steam puff, with a toot. */
  function arrive() {
    for (let i = 0; i < 26; i++) {
      const along = (Math.random() - 0.5) * 8,
        across = (Math.random() - 0.5) * 2;
      emit({
        x: centre.x + Math.sin(restPose) * along + Math.cos(restPose) * across,
        y: tableTop + 0.4 + Math.random() * 2.2,
        z: centre.z + Math.cos(restPose) * along - Math.sin(restPose) * across,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.5 + Math.random() * 0.9,
        vz: (Math.random() - 0.5) * 0.8,
        life: 1.5,
        size: 0.7,
        color: steam,
        alpha: 0.85,
        grow: [1, 2.8],
        fade: 0.6,
        shape: 'dust',
      });
    }
    whistle(centre.x, centre.z);
  }
  const seatP = new THREE.Vector3();
  function placePart(lift: number, drop = 0) {
    // From the stand, up and over, to hanging 0.6 m above the seat (`drop` lowers it the last 0.6 m).
    showPart();
    seatP.copy(seatPos());
    seatP.y = tableTop;
    const u = smooth(clamp01(lift));
    const from = activePart() === 'blast' ? pipeStandRest : standRest;
    partGroup.position.lerpVectors(from, seatP, u);
    partGroup.position.y += Math.sin(u * Math.PI) * 0.9 + u * MOMENT.hang - drop * MOMENT.hang;
    partGroup.rotation.y = standYaw + wrap(yaw - standYaw) * u;
    partGroup.rotation.z = u < 1 ? Math.sin(u * 9) * 0.015 * (holding ? clamp01((lift - 0.66) * 3) : 0) : 0;
  }
  /** The arm's yaw when parked (design ruling on G2, R3): swung off the table along the row's bearing. */
  const parkYaw = Math.PI - rad(row.park);
  let armYaw = parkYaw,
    armIn = false;
  function placeJib(dt: number, snap: boolean) {
    // The hook takes the barrel at its middle, on top. The arm points at it only while a part is in sight (waiting on
    // the stand, or on the hook through an install) and for the moment's show-off; otherwise it is parked.
    const held = partGroup.visible;
    const p = held ? partGroup.position : standRest,
      at = held ? partGroup.rotation.y : standYaw;
    const mid = activePart() === 'blast' ? ENGINE_BOILER.chimney.z : hookMid;
    const hx = p.x + Math.sin(at) * mid,
      hz = p.z + Math.cos(at) * mid;
    const pointing = held || phase === 'moment';
    // Swinging in on a live tick is the telegraph that there is something to install: a pull on the cord and a clank.
    if (pointing && !armIn && !snap && shown && phase === 'idle') {
      cordPull(jibAt.x, jibAt.z);
      clank(jibAt.x, jibAt.z);
    }
    armIn = pointing;
    const aim = pointing ? Math.atan2(hx - jibAt.x, hz - jibAt.z) : parkYaw;
    const d = wrap(aim - armYaw),
      step = (phase === 'idle' ? ARM_RATE.swing : ARM_RATE.follow) * dt;
    armYaw = snap || reducedMotion || Math.abs(d) <= step ? aim : armYaw + Math.sign(d) * step;
    armPivot.rotation.y = armYaw;
    trolley.position.set(hx, geo.ground + row.mast - 0.3, hz);
    const top = trolley.position.y - 0.08,
      bottom = p.y + (activePart() === 'blast' ? ENGINE_BOILER.chimney.y + 0.25 : ENGINE_BOILER.top);
    chain.scale.y = Math.max(0.1, top - bottom);
    chain.position.set(hx, bottom + chain.scale.y / 2, hz);
    // The trolley and chain show once the arm is over the hook.
    trolley.visible = chain.visible = held && Math.abs(wrap(aim - armYaw)) < 0.05;
    crank.rotation.x = ring * 18;
  }

  // ---------------------------------------------------------------- the camera
  const camPos = new THREE.Vector3(),
    camAt = new THREE.Vector3(),
    fwd = new THREE.Vector3();
  const camFrame = new THREE.Matrix4();
  const eyeP = new THREE.Vector3(),
    eyeA = new THREE.Vector3();
  /** How far the Cargo shot slides along the train to the chosen car: its row is framed on the kit car, the first
   * car behind the copy. The other categories' parts are all inside their own shot. */
  const slideOf = () => (cat === 'cargo' ? focusOf(sel).c[2] - displayOffset('kit') : 0);
  const constraint: (typeof camConstraints)[number] = (look, pos) => {
    if (openT <= 0) {
      camSnap = true;
      return false;
    }
    const c = camOf(cat),
      slide = slideOf();
    camFrame.makeRotationY(baseYaw()).setPosition(centre.x, centre.y, centre.z);
    // The train frame of the camera: shifted so the 8.5 m train is centred as it is on the table, and mirrored to the
    // side the rest pose was picked for.
    camPos.set(c.pos[0] * side, c.pos[1], c.pos[2] - shift + slide).applyMatrix4(camFrame);
    camAt.set(c.at[0] * side, c.at[1], c.at[2] - shift + slide).applyMatrix4(camFrame);
    // A newly chosen category or part: the camera eases to its shot rather than cutting.
    const now = performance.now(),
      k = camSnap || reducedMotion ? 1 : 1 - Math.exp((-Math.min(100, now - camClock) / 1000) * CAM_EASE);
    camClock = now;
    camSnap = false;
    camPos.copy(eyeP.lerp(camPos, k));
    camAt.copy(eyeA.lerp(camAt, k));
    // A push-in with the hold: 8% by the end of the ring.
    const push = reducedMotion ? 0 : (holding || phase === 'holding' ? ring : 0) * 0.08;
    camPos.lerp(camAt, push);
    if (shake > 0.001 && !reducedMotion) {
      const s = shake * shake * 0.3;
      camPos.x += (Math.random() - 0.5) * s;
      camPos.y += (Math.random() - 0.5) * s;
    }
    const w = smooth(openT);
    camForward(fwd);
    pos.lerp(camPos, w);
    camAt.lerp(look.clone().addScaledVector(fwd, 8), 1 - w);
    look.copy(camAt).addScaledVector(fwd, -8);
    return true;
  };
  camConstraints.unshift(constraint);

  // ---------------------------------------------------------------- the moment
  function commit() {
    phase = 'moment';
    ms = 0;
    ring = 1;
    holding = false;
    hit = answered = false;
    skipped = false;
    mine = true;
    brief = false;
    uiSound('pop');
    thump(stand.x, stand.z);
    // The hold is the install: sent now, and the part hangs until the answer.
    real = waiting = true;
    sinceCommit = 0;
    hangUp = 0;
    fromRow = tableRow();
    const rev = trade() ? (lineFacts(facts, facts.tableLine)?.rev ?? 0) : facts.installRev;
    if (!deps.install(facts.tableLine, rev, INSTALL_PART[momentPart])) deny();
  }
  /** No answer, a refusal or a lost connection: the part lowers to its stand and the hold can be made again at once. */
  function deny(reason?: TradeRefusal) {
    if (!real || !waiting) return;
    real = waiting = false;
    phase = 'holding'; // the ring drains and the part goes back down the way it came up
    holding = false;
    ring = 1;
    if (reason) notify(TRADE_DENIAL[reason], { kind: 'deny' });
    else uiSound('deny');
  }
  /** Someone's install was accepted and it is not this tab's running hold (G4): this tab's own hold is
   * dropped, the part lifts off its stand in `MOMENT.catchUp` and the same moment plays, in the garage or out in the
   * world, with nothing taken. A tab whose own install lost the race already has the part over the seat: it drops
   * from there. Only ever called from an accepted event. */
  function watch(short: boolean, part: InstallPart, atPost: boolean) {
    if (!shown) return;
    momentPart = INSTALL_ID[part];
    sel = momentPart;
    cat = 'engine';
    const hanging = atPost && phase === 'moment' && real && waiting;
    holding = false;
    real = true;
    waiting = false;
    mine = false;
    brief = short;
    hit = answered = skipped = false;
    stopLeft = 0;
    sinceCommit = 0;
    showTurn = -1;
    ring = 0;
    // The look before the fit: a trade line's from the row the copy last wore (the rows already say fitted).
    if (!hanging) fromRow = wornRow;
    setLong(isTrade(momentPart) ? fromRow === TRADE_ROW.quick : part >= 3 && facts.longFitted);
    pipe.visible = !isTrade(momentPart) && part === 2;
    for (const b of bolts) b.visible = false;
    spinRate = fromRate();
    phase = 'moment';
    partGroup.visible = atPost;
    if (hanging) ms = Math.min(ms, MOMENT.quiet - 0.001);
    else {
      ms = -MOMENT.catchUp;
      hangUp = 0;
      placePart(0);
      thump(stand.x, stand.z);
    }
  }
  /** The moment's end: the rows already say fitted, so the copy just wears them. */
  function finish() {
    real = waiting = mine = brief = false;
    phase = 'idle';
    ms = 0;
    ring = 0;
    ghost.visible = false;
    partGroup.visible = false;
    spinRate = today();
    wearRows();
  }

  function stepMoment(dt: number) {
    if (stopLeft > 0) {
      stopLeft = Math.max(0, stopLeft - dt);
      return;
    }
    if (ms < 0) {
      // Someone else's install: the catch-up lift, stand to seat.
      ms = Math.min(0, ms + dt * 1000);
      placePart(1 + ms / MOMENT.catchUp);
      return;
    }
    const before = ms;
    ms += dt * 1000;
    // The part drops only with the server's answer and with the engine back at the opening pose (a hold that
    // began with the table turned: the deck is bringing it home).
    const offPose = !hit && Math.abs(wrap(turnYaw)) > 0.02;
    if (waiting || offPose) {
      // The clock runs through the designed quiet and holds at its end: an answer inside 180 ms costs nothing.
      if (waiting) sinceCommit += dt * 1000;
      if (waiting && (sinceCommit >= MOMENT.answerBy || !deps.online())) return deny();
      if (ms >= MOMENT.quiet) {
        ms = MOMENT.quiet - 0.001;
        // Held, not frozen: it rises clear of the boiler that is on (hanging at the designed 0.6 m it sits in the
        // old barrel and reads as fitted) and sways slowly on the hook.
        hangUp = Math.min(HANG_CLEAR, hangUp + dt * 3);
        placePart(1, 0);
        partGroup.position.y += 0.06 + hangUp;
        if (!reducedMotion) partGroup.rotation.z = Math.sin(sinceCommit / 260) * 0.035;
        return;
      }
    }
    hangUp = Math.max(0, hangUp - dt * 9);
    const at = (t: number) => before < t && ms >= t;
    const c = ms;
    // c+0..180 hangs 6 cm up; 180..320 the drop.
    if (c < MOMENT.hit) {
      const drop = clamp01((c - MOMENT.quiet) / MOMENT.drop);
      placePart(1, drop * drop);
      partGroup.position.y += (c < MOMENT.quiet ? 0.06 * smooth(c / 120) : 0) + hangUp;
      if (at(MOMENT.quiet)) cordPull(stand.x, stand.z);
    }
    if (at(MOMENT.hit)) {
      hit = true;
      wearRows();
      ghost.visible = false;
      partGroup.visible = false;
      flash.visible = false;
      stopLeft = reducedMotion ? 0 : size().hitStop / 1000;
      shake = size().shake;
      const p = seatPos();
      soundAt(p, clank);
      soundAt(p, thump);
      sparks(p.clone().setY(tableTop + 1.7), 14);
      dustRing(p.x, tableTop + 0.05, p.z, 10, 3.2, 0.3);
      for (const g of guys) g.userData.hop = 1;
    }
    for (let i = 0; i < size().bolts; i++) {
      const t = MOMENT.bolts + i * MOMENT.boltEvery;
      if (at(t)) {
        bolts[i]!.visible = true;
        if (open) uiSound('count', 1);
        sparks(engine.localToWorld(bolts[i]!.position.clone()), 3);
      }
    }
    if (at(MOMENT.answer)) {
      answered = true;
      steamPuff(10, 2.2);
      const p = seatPos();
      soundAt(p, (x, z) => chuff(x, z, 1));
      spinRate = today();
    }
    if (brief && c >= MOMENT.briefEnd) return finish();
    if (at(MOMENT.whistle)) {
      steamPuff(14, 2.6);
      const p = seatPos();
      soundAt(p, (x, z) => whistle(x, z, WHISTLE_HEAR));
      showTurn = reducedMotion || momentPart === 'blast' ? -1 : 0;
    }
    if (c >= MOMENT.rest) finish();
  }

  // ---------------------------------------------------------------- the frame
  let lastOpen = false;
  /** Hands back the input hold the garage took, if it is still the holder (garage step 4's review). */
  function releaseHold() {
    if (!ownsHold) return;
    ownsHold = false;
    if (inputState.holder !== 'garage') return;
    inputState.held = false;
    inputState.holder = null;
  }
  function update(dt: number, room: RoomFacts) {
    facts = room;
    if (!open) releaseHold();
    // The first offer stands after the table turn; later the copy returns once the wagon couples and the shunter
    // is home. An accepted upgrade keeps the copy for its moment, before the reserved roll-out starts.
    const rest = deps.restYaw();
    const snapped = snapNext;
    const installingUpgrade = phase === 'moment' && real && momentPart === 'blast';
    if (site === 0 && !room.wagonCoupled && !(room.upgradeReady && !room.tableBusy) && !installingUpgrade)
      shown = false;
    else if (!shown && rest !== null) {
      shown = true;
      pickPose(rest);
      yaw = restPose;
      if (!snapNext) arrive();
    }
    if (shown && rest !== null && !open && openT <= 0) {
      pickPose(rest);
      if (snapNext || reducedMotion) yaw = restPose;
    }
    // Garage step 4, the copies' swap: an accepted bring on a live frame puts the brought line's copy on the table under
    // the arrival's steam and toot, wearing its own row (its bay's door opens on the copy that left, rotunda-view.ts);
    // a restore or a first frame just shows it. Open, the screen lands on that copy's offered boiler.
    if (tableShown !== room.tableLine) {
      if (tableShown >= 0 && shown && !snapped) arrive();
      tableShown = room.tableLine;
      if (open && phase === 'idle') {
        cat = 'engine';
        sel = offered() ?? (trade() ? 'quick' : 'boiler');
        ghostT = 0;
      }
    }
    if (bringing && (room.bringRev !== bringRev || performance.now() - bringing > MOMENT.answerBy)) bringing = 0;
    snapNext = false;
    if (restored) {
      // A restore, a rejoin or a refill in the middle of an install: the rows decide. Fitted, the copy wears it and
      // the garage stays open; not fitted, the part is back on its stand and the hold can be made again.
      restored = false;
      if (real) {
        // Fitted, a show-off turn already running finishes rather than snapping home.
        if (!room.longFitted) showTurn = -1;
        finish();
      }
    }
    const copyVisible = solid();
    if (open && (!room.postOpen || (room.tableBusy && !installingUpgrade) || !shown)) close();
    openT = clamp01(openT + ((open ? 1 : -1) * dt) / (open ? 0.6 : 0.4));
    rig.visible = copyVisible;
    furniture.visible = shown;
    // Orange for a part someone could install on any chip's line, not only the copy's on the table (plan, call 16).
    const knob = readyAnywhere(room) ? '#e8742c' : room.boilerRev >= 1 ? '#58b368' : '#d9a23a';
    if (knob !== knobShown) knobMat.color.set((knobShown = knob));
    if (phase === 'idle') {
      wearRows();
      // A ready part lies on its stand, for everyone at the table.
      partGroup.visible = shown && offered() !== null;
      if (partGroup.visible) placePart(0);
    }
    if (openT <= 0) lastOpen = false;
    else if (!lastOpen) {
      lastOpen = true;
      ghostT = 0;
    }
    if (open && phase === 'moment') {
      inputState.held = true;
      // A card put away mid-moment cleared the holder: the hold re-taken here is the garage's to hand back.
      inputState.holder ??= 'garage';
    }
    shake = Math.max(0, shake - (dt / 0.4) * 0.35);

    // The hold: the ring is the crank.
    if (phase === 'holding' || (phase === 'idle' && holding)) {
      const need = size().hold / 1000;
      // The room stopped having what the part needs in the middle of the hold: the part lowers.
      if (holding && !canInstall()) holding = false;
      if (holding) {
        if (phase === 'idle') {
          phase = 'holding';
          partGroup.visible = true;
          ghost.visible = true;
          uiSound('thunk');
        }
        ring = advanceHold(ring, dt, true, need);
        clickAt -= dt;
        if (clickAt <= 0) {
          clickAt = 1 / (6 + 8 * ring);
          cordPull(stand.x, stand.z);
        }
        if (ring >= 1) commit();
      } else {
        ring = advanceHold(ring, dt, false, need, MOMENT.drain / 1000);
        if (ring <= 0) {
          phase = 'idle';
          // Back on its stand if it waits there (no frame without it), else gone.
          partGroup.visible = shown && offered() !== null;
          if (partGroup.visible) placePart(0);
          thump(stand.x, stand.z);
        }
      }
      if (phase === 'holding') placePart(liftOf(ring));
    }
    if (phase === 'moment') stepMoment(dt);

    // The table: it turns slowly; stops with a hold; a full show-off turn after the whistle.
    // With the Longer boiler chosen and ready to install the engine stays at the opening pose, where the install is
    // in clear view left of the panel: no idle turn, and a table already turned comes home (through the hold too).
    const poised = real || canInstall();
    // Before the wagon couples, its stall road owns the deck: even opening or browsing the upgrade must not
    // turn it away and force a swing back when the shunter arrives. The copy stays aligned with those rails.
    const parkedForWagon = site === 0 && !facts.wagonCoupled;
    const turns =
      !parkedForWagon &&
      open &&
      CAMS[cat].turns &&
      phase !== 'holding' &&
      phase !== 'moment' &&
      !reducedMotion &&
      !poised;
    if (showTurn >= 0) {
      showTurn += (dt * 1000) / (MOMENT.rest - MOMENT.whistle);
      turnYaw = smooth(clamp01(showTurn)) * TAU;
      if (showTurn >= 1) {
        showTurn = -1;
        turnYaw = 0;
      }
    } else if (turns) turnYaw = (turnYaw + dt * rad(6)) % TAU;
    else if (poised && open) {
      const home = wrap(turnYaw);
      turnYaw = Math.abs(home) <= DECK_RATE * dt || reducedMotion ? 0 : home - Math.sign(home) * DECK_RATE * dt;
    } else if (!CAMS[cat].turns && phase === 'idle') turnYaw -= turnYaw * Math.min(1, dt * 3);
    if (parkedForWagon || (!open && showTurn < 0)) turnYaw = 0;
    // The deck carries the copy to the garage's pose and back at the table's own rate; once there it follows exactly.
    // With the garage shut the show-off turn of someone's install still turns it, about its rest.
    const target = site === 1 ? restPose : (open && !parkedForWagon ? baseYaw() : restPose) + turnYaw;
    const d = wrap(target - yaw),
      step = DECK_RATE * dt;
    if ((open && settled) || (!open && showTurn >= 0) || reducedMotion || Math.abs(d) <= step) {
      yaw = target;
      settled = open;
    } else yaw += Math.sign(d) * step;
    rig.rotation.y = yaw;

    // Squash and settle after the hit.
    let sy = 1,
      sxz = 1;
    if (phase === 'moment' && hit) {
      const u = clamp01((ms - MOMENT.hit) / 330);
      const k = Math.sin(u * Math.PI * 1.6) * (1 - u);
      sy = 1 - 0.06 * Math.sin(u * Math.PI) + 0.02 * k * (u > 0.5 ? 1 : 0);
      sxz = 1 + 0.03 * Math.sin(u * Math.PI);
    }
    engine.scale.set(sxz, sy, sxz);
    engine.rotation.z =
      answered && phase === 'moment'
        ? Math.sin((ms - MOMENT.answer) / 28) * 0.026 * Math.max(0, 1 - (ms - MOMENT.answer) / 300)
        : 0;

    // Wheels and chuff at the room's fit. Through a moment the wheels run up from the boiler the part replaces (the
    // rows may already say fitted).
    const spin =
      phase === 'moment'
        ? THREE.MathUtils.lerp(fromRate(), spinRate, answered ? Math.min(1, (ms - MOMENT.answer) / 600) : 0)
        : today();
    // The wheels run only in the garage: closed, the copy stands still on the bridge rails.
    wheelAngle += dt * spin * 0.12 * (openT > 0 || phase === 'moment' ? 1 : 0);
    for (const w of wheels) w.rotation.x = wheelAngle;
    rods.position.y = ENGINE_WHEELS.throw * Math.cos(wheelAngle);
    rods.position.z = ENGINE_WHEELS.throw * Math.sin(wheelAngle);
    chuffAt -= dt;
    if (chuffAt <= 0 && phase !== 'moment') {
      chuffAt = 1 / (spin * 0.1);
      const p = seatPos();
      if (open) {
        soundAt(p, (x, z) => chuff(x, z, 0));
        steamPuff(2, 1.2);
      }
    }
    // The ghost arrives sliding along the way the part goes on, then breathes.
    // The seat's ghost shows where the chosen part goes, and stays under a part that hangs for the server's answer:
    // it is not on yet.
    showPart();
    const want =
      openT > 0 &&
      (sel === 'long' || sel === 'blast' || sel === 'big' || sel === 'quick') &&
      (phase === 'moment'
        ? !hit
        : sel === 'quick'
          ? tableRow() !== TRADE_ROW.quick
          : sel === 'blast'
            ? facts.boilerRev === 0
            : sel === 'big'
              ? facts.boilerRev < 3
              : !facts.longFitted);
    ghost.visible = want;
    if (want) {
      ghostT = Math.min(1, ghostT + dt / 0.22);
      ghost.position.y = (1 - backOut(ghostT)) * 0.4;
      ghostMat.opacity =
        (0.45 + 0.1 * Math.sin(performance.now() / 320)) *
        clamp01(ghostT * 2) *
        (phase === 'holding' ? 1 + ring * 0.4 : 1);
      // Pale while the room does not have what the part needs; the install's yellow once it can go on.
      ghostMat.color.set(offered() === sel ? '#ffc21a' : '#d8d0b0');
    }
    // The guys: crouch at the press, hop at the hit, wave in the show-off.
    guys.forEach((g, i) => {
      g.visible = shown && (offered() !== null || openT > 0);
      const target = phase === 'holding' ? 0.9 : 1;
      g.scale.y += (target - g.scale.y) * Math.min(1, dt * 14);
      const hop = (g.userData.hop as number | undefined) ?? 0;
      g.position.y = geo.ground + (hop > 0 ? Math.sin((1 - hop) * Math.PI) * 0.45 : 0);
      if (hop > 0) g.userData.hop = Math.max(0, hop - dt / 0.5);
      const toward = Math.atan2(
        partGroup.visible ? partGroup.position.x - g.position.x : centre.x - g.position.x,
        (partGroup.visible ? partGroup.position.z : centre.z) - g.position.z,
      );
      g.rotation.y = toward;
      if (i === 0 && showTurn >= 0.5) g.rotation.z = Math.sin(performance.now() / 120) * 0.2;
      else g.rotation.z = 0;
    });
    // The bolts pop in (to 1.2 and back).
    if (phase === 'moment')
      bolts.forEach((b, i) => {
        const t = ms - (MOMENT.bolts + i * MOMENT.boltEvery);
        b.scale.setScalar(t < 0 ? 0.01 : 1 + 0.2 * Math.sin(clamp01(t / 180) * Math.PI));
      });
    // The white flash is the join: 60 ms on the part only.
    flash.visible = phase === 'moment' && ms < MOMENT.hit && ms > MOMENT.hit - 40;
    placeJib(dt, snapped);
    showSelection(dt);
  }

  /** The chosen part's frame and, for a car the copy does not carry, its ghost. Only while the garage is open and
   * nothing is going on: a hold or a moment has the picture to itself. */
  function showSelection(dt: number) {
    const standing = open && phase === 'idle' ? parts().find((p) => p.id === sel && p.cat === cat)?.standing : null;
    // A replaced part is not on the train and has no place to go.
    const shown = standing && standing !== 'replaced';
    selection.show(
      dt,
      shown ? `${cat}/${sel}` : null,
      shown ? focusOf(sel) : null,
      standing === 'installed' || standing === 'free',
      reducedMotion,
    );
  }

  function close() {
    if (!open) return;
    open = false;
    holding = false;
    // The garage's own hold goes on the next frame (releaseHold, from update), once whatever took the input meanwhile
    // has said so: a reward card that came up while the garage was open keeps it.
    closeModal();
    // Someone else's install plays on in the world when this tab leaves the garage.
    if (phase === 'moment' && real && !mine) return;
    if (phase !== 'idle') {
      phase = 'idle';
      partGroup.visible = false;
    }
    real = waiting = mine = brief = false;
    wearRows();
    spinRate = today();
    ring = 0;
  }

  const api = {
    isOpen: () => open,
    open() {
      // Never while something else holds the input (a conversation, a card, the fall): it keeps control.
      if (open || !shown || !facts.postOpen || facts.tableBusy || inputState.held) return;
      // The garage is the one modal while it is open, marked before it drops the pointer lock (openModal does), so
      // Pause does not take the lost lock for an Esc. Its keys and pad stay its own (src/features/garage.ts).
      if (!openModal({ passKeys: true })) return;
      garage.api = api;
      open = true;
      settled = false;
      spinRate = today();
      // It opens on the part you came to install when there is one.
      sel = offered() ?? (trade() ? 'quick' : facts.boilerRev === 1 ? 'blast' : 'boiler');
      cat = 'engine';
      if (sel === 'long') ghostT = 0;
      inputState.held = ownsHold = true;
      inputState.holder = 'garage';
    },
    close,
    snap(): GarageSnap {
      return {
        open,
        cat,
        sel,
        phase,
        ring,
        ms,
        held: holding,
        mine,
        real,
        waiting,
        canInstall: canInstall(),
        bringing: bringing > 0,
        fromRow,
        canSkip: phase === 'moment' && mine && ms >= MOMENT.skipFrom,
        tapped,
        facts,
      };
    },
    choose(c: CatId, p?: PartId) {
      // Your own moment holds the rail; someone else's install, watched from here, does not.
      if (phase !== 'idle' && phase !== 'holding' && !(phase === 'moment' && !mine)) return;
      if (c !== cat) uiSound('tick');
      else if (p !== sel) uiSound('tick');
      cat = c;
      if (p) sel = p;
      if (p === 'long') ghostT = 0;
      holding = false;
    },
    holdStart() {
      // No try-on: the hold is the install, offered only when the room has what the part needs.
      if (!open || !isInstall(sel) || !canInstall() || (phase !== 'idle' && phase !== 'holding')) return;
      momentPart = sel;
      holdAt = performance.now();
      holding = true;
      if (phase === 'idle') clickAt = 0;
    },
    holdEnd() {
      if (!holding) return;
      holding = false;
      if (performance.now() - holdAt < 150) tapped = performance.now();
    },
    skip() {
      if (phase !== 'moment' || ms < MOMENT.skipFrom || skipped) return;
      skipped = true;
      // The hit has happened; the numbers snap and the whistle still blows.
      soundAt(seatPos(), (x, z) => whistle(x, z));
      showTurn = -1;
      finish();
    },
    hear() {
      soundAt(seatPos(), (x, z) => whistle(x, z));
      steamPuff(8, 2.4);
    },
    bring(line: number) {
      // A chip: the table must be free (no hold, no roll-out, no bring in the air, no moment), and the line a chip's.
      if (
        !open ||
        line === facts.tableLine ||
        !facts.lines.some((l) => l.line === line) ||
        facts.held ||
        facts.tableBusy ||
        bringing ||
        (phase !== 'idle' && phase !== 'holding')
      )
        return void uiSound('deny');
      holding = false;
      if (!deps.bring(line, facts.bringRev)) return void uiSound('deny');
      bringing = performance.now();
      bringRev = facts.bringRev;
      uiSound('pop');
    },
  };
  if (site === 0 && !garage.api) garage.api = api;
  return {
    update,
    post: geo.post,
    open: api.open,
    isOpen: api.isOpen,
    momentPlaying: () => phase === 'moment',
    /** The works copy stands on the table (the garage can open). */
    standing: () => shown,
    /** The bridge's yaw while the garage has turned the deck off its rest (open, or on its way back), else null. */
    deckYaw: () => (shown && Math.abs(wrap(yaw - restPose)) > 1e-4 ? yaw - flip : null),
    /** The server accepted `rail.install`. `mine`: this tab's own hold, so the hanging part drops and the moment
     * runs on. Anyone else's (and this tab's own, should it land after its hang gave up) just shows in the rows for
     * now: everyone else's moment is the plan's G4. Never called from a restore, a rejoin or a late join. */
    accepted(own: boolean, part: InstallPart, payingSite: number) {
      // This tab's hold, still hanging: it drops. Anyone else's install, or this tab's own landing after its hang
      // gave up (the brief version): watched.
      if (site === payingSite && own && mine && real && waiting) waiting = false;
      else watch(own, part, site === payingSite);
    },
    /** The server refused this tab's install. */
    denied: deny,
    /** The server refused this tab's bring: the chips wake at once. */
    bringDenied() {
      if (!bringing) return;
      bringing = 0;
      uiSound('deny');
    },
    /** A restore, a rejoin or a refill: rows only, no effect. The copy, stand, bolts and knob snap; an install in
     * the air is settled by the rows on the next frame. The garage stays open. */
    restore() {
      restored = true;
      snapNext = true;
    },
    inspect: () => ({
      ...api.snap(),
      turnYaw,
      openT,
      chimney: chimney().toArray(),
      copy: { shown, yaw, restPose, side, solid: copyRecords.get(standingKey)?.length ?? 0, long: longOn() },
      partOnStand: partGroup.visible && phase === 'idle',
      /** What the chosen part shows: its frame (whole: the room has it; dashed: it goes here) and a ghost car. */
      selection: selection.inspect(),
      /** Which boilers are drawn: the lifted part (and where), the copy's short set, its long set, the ghost. */
      drawn: {
        part: partGroup.visible ? partGroup.position.toArray().map((v) => Math.round(v * 100) / 100) : null,
        short: shortSet[1]!.visible,
        long: longSet[1]!.visible,
        blast: pipe.visible,
        ghost: ghost.visible,
      },
      cam: camPos.toArray(),
    }),
    dispose() {
      close();
      releaseHold();
      const k = camConstraints.indexOf(constraint);
      if (k >= 0) camConstraints.splice(k, 1);
      if (garage.api === api) garage.api = null;
    },
  };
}
