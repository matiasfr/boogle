// Local boiler dress over the server's unique cargo row: the pedestal, the loose boiler and, while it is held, the
// boiler on the great beam's gold rope (docs/plans/boiler-first-choice.md, Part 3): its nose at the hauler's hip, its
// tail dragging, a friend's Help carry lifting it level between two shoulders. The take shows at once like the beam's;
// everything else follows accepted state.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway-session.ts';
import type { Got } from '../../render/reward-reveal.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { input } from '../../player/input-state.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { bindBigDrop } from '../../player/cargo-drop.ts';
import { backSeam } from '../../player/haul-back.ts';
import { heldId } from '../../player/inventory.ts';
import { thump, clank } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { PLAYER_R, reducedMotion } from '../../constants.ts';
import { LINE2_BOILER, LINE2_OLD_TRAIN } from '../../sim/railway-line2-layout.ts';
import { createForgeCall } from './forge-call.ts';
import { createBeamDrag, restGrip, type DragShape } from './beam-drag.ts';
import { createHelpCarry, type HelpCarry } from './help-carry.ts';
import { onlyALoadIn, setDownThen } from './back-down.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { account, beam as beamRow, boiler as boilerRow } from '../../sim/railway-rows.ts';

// One Owner value per tab: the holder's pid while you help haul the boiler (null otherwise, so the key is left out).
let help: HelpCarry | null = null;
addPresenceField('railwayBoilerHelp', () => help?.presence() ?? null);
onRemotePresence((remote, presence) => help?.hear(remote.peer, presence.railwayBoilerHelp));

/** The fitter's "You got" card after the wake (open question 9). Built off: the copy is the owner's to approve, so it
 * ships only when he turns this on. Suggested copy below. */
const BOILER_CARD = false;
const BOILER_CARD_COPY = { name: 'Steam', line: 'Trains run both lines.' };
/** The press: the boiler leaves the rope and arcs to the saddle (s, m); a refusal hops it back (s). */
const FIT = { fly: 0.45, apex: 0.8, back: 0.3, silence: 1.5, wake: 3.1 } as const;
const smooth = (t: number) => t * t * (3 - 2 * t);

type Deps = {
  land: typeof import('../../place/land.ts');
  props: typeof import('../../render/prop-kit.ts');
  carry: typeof import('../../render/carry-models.ts');
  /** The engine's boiler (docs/plans/engine-previz.md): the one on the pedestal and the rope is the one fitted. */
  engine: typeof import('./engine-kit.ts');
  sounds: typeof import('../../render/fanfare.ts');
  pieces: typeof import('../../place/pieces.ts');
  flat: typeof import('../../render/flat.ts').flat;
  /** The railway's reveal queue (reward.ts), for the fitter's card when BOILER_CARD is on. */
  youGot?: (got: Got) => boolean;
};
type Avatar = NonNullable<typeof me.avatar>;
const frameOf = (avatar: THREE.Object3D | null) => {
  const data = avatar?.userData as { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } } | undefined;
  return data?.loadFit?.frame ?? data?.inner ?? null;
};

/** A dashed gold outline of a boiler `length` long (along +Z) and `radius` round: two end rings and four lines of
 * short dashes, the station 6 sign's dashes in 3D (one instanced draw). */
function dashedOutline(length: number, radius: number, material: THREE.Material) {
  const dash = 0.16,
    ring = 14,
    lines = 4,
    along = Math.max(2, Math.round(length / (dash * 2)));
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.045, dash), material, ring * 2 + lines * along);
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    up = new THREE.Vector3(0, 0, 1);
  let k = 0;
  for (const z of [-length / 2, length / 2])
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2;
      p.set(Math.cos(a) * radius, Math.sin(a) * radius, z);
      // Tangent to the ring.
      q.setFromUnitVectors(up, new THREE.Vector3(-Math.sin(a), Math.cos(a), 0));
      mesh.setMatrixAt(k++, m.compose(p, q, one));
    }
  q.identity();
  for (let l = 0; l < lines; l++) {
    const a = (l / lines) * Math.PI * 2 + Math.PI / 4;
    for (let i = 0; i < along; i++) {
      p.set(Math.cos(a) * radius, Math.sin(a) * radius, -length / 2 + ((i + 0.5) / along) * length);
      mesh.setMatrixAt(k++, m.compose(p, q, one));
    }
  }
  mesh.castShadow = false;
  return mesh;
}

/** `chimney`: the top of the forge's chimney, where the call's plume rises (line2-view.ts owns the forge). */
export function createRailwayBoiler(
  adapter: RailwayAdapter,
  owner: OwnedView,
  { land, props, carry, engine, pieces, flat, youGot }: Deps,
  chimney: { x: number; y: number; z: number },
) {
  const pedestal = props.makeProp('pedestal');
  const loose = engine.makeEngineBoiler(); // the engine's own boiler, centred on its middle
  // The hauled boiler: the same model in a group whose +Z is its long horizontal axis, centred on its middle, with
  // the drag's length and radius measured once from it.
  const box = new THREE.Box3().setFromObject(loose),
    size = box.getSize(new THREE.Vector3());
  const hauled = new THREE.Group(),
    hauledModel = engine.makeEngineBoiler();
  if (size.x > size.z) hauledModel.rotation.y = Math.PI / 2;
  hauled.add(hauledModel);
  hauledModel.position.copy(new THREE.Box3().setFromObject(hauled).getCenter(new THREE.Vector3())).negate();
  const BOILER_SHAPE: DragShape = {
    length: Math.max(size.x, size.z),
    radius: size.y / 2,
    scrape: 'beamScrape',
    drop: 'beamDrop',
  };
  const lift = -box.min.y; // the loose model's origin above the ground it rests on
  const onPedestal = 0.6 + lift; // ...and above the pedestal's origin (its plinth's top is 0.6 m up)
  const bx = LINE2_BOILER.x / 100,
    by = LINE2_BOILER.y / 100,
    bz = LINE2_BOILER.z / 100;
  const saddle = new THREE.Vector3(
    // The camp track is straight east: B's loco is +3.7 m, its receiver another +0.5 m.
    LINE2_OLD_TRAIN.x / 100 + 4.2,
    land.H(LINE2_OLD_TRAIN.x / 100, LINE2_OLD_TRAIN.z / 100) + 1.8,
    LINE2_OLD_TRAIN.z / 100,
  );
  pedestal.position.set(bx, by + 0.3, bz);
  // The saddle echo while the boiler is hauled (designer ruling 5b): the same dashed gold as the station 6 sign, along
  // the track (east), where the boiler will sit.
  const ropeMaterial = flat(GOLD_ROPE, 0.7);
  // The seat: where the hauled group sits so its boiler matches the old loco's own (train-view.ts gives the loco
  // boiler's world matrix once it is mounted; until then, the saddle along the track).
  const seat = new THREE.Vector3().copy(saddle),
    seatQ = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2);
  let seatOf: (() => THREE.Matrix4) | null = null;
  const seatM = new THREE.Matrix4(),
    innerInverse = new THREE.Matrix4(),
    one = new THREE.Vector3();
  function placeSeat() {
    if (!seatOf) return;
    hauledModel.updateMatrix();
    seatM.copy(seatOf()).multiply(innerInverse.copy(hauledModel.matrix).invert());
    seatM.decompose(seat, seatQ, one);
  }
  // The echo outlines the barrel (just outside its bands) in the hauled group's frame, at the seat.
  const echoRoot = new THREE.Group();
  const echo = dashedOutline(BOILER_SHAPE.length, Math.min(size.x, size.z) / 2 + 0.04, ropeMaterial);
  echo.position.copy(hauledModel.position); // the model's origin is its barrel's axis
  echoRoot.add(echo);
  echoRoot.visible = false;
  const dragWorld = new THREE.Group();
  owner.add(pedestal, loose, echoRoot, dragWorld);
  const drag = createBeamDrag(dragWorld, hauled, (x, z) => support(x, z), ropeMaterial, BOILER_SHAPE);
  hauled.visible = false;
  // The forge's call while the boiler waits; Split-rock's breaker uses the same one (forge-call.ts). Its plume rises
  // from the forge's chimney, not the boiler: a boiler steaming on its pedestal reads as an engine already running
  // (owner, 9 November). The boiler first steams once it's fitted to the old train. The call starts 2 m above `at`.
  const call = createForgeCall({ x: chimney.x, y: chimney.y - 2, z: chimney.z }, owner);
  let body: Body | null = null;
  let mote = 0,
    side = 1,
    echoMote = 0;
  const gold = new THREE.Color('#ffdc7a');
  const read = adapter.read;
  let feetY = 0,
    dragHolder = '',
    grabbing = -Infinity,
    last = performance.now();
  // Your press of "Fit the boiler" (Local): it flies on the press frame, sits in the saddle until the answer, and hops
  // back onto the rope on a refusal or 1.5 s of silence. The accepted fit (every tab) hands over to the loco's own.
  type Fit = {
    phase: 'fly' | 'sit' | 'back';
    pressed: number;
    t: number;
    from: THREE.Vector3;
    fromQ: THREE.Quaternion;
    holder: string;
    /** For the evals: when the press ran and when the boiler first moved off the rope, in frames. */
    pressFrame: number;
    movedFrame: number;
  };
  let fit: Fit | null = null,
    frames = 0,
    cardDue = -1,
    lastFit: { pressFrame: number; movedFrame: number; refused: boolean } | null = null;
  function startFit(now: number) {
    fit = {
      phase: 'fly',
      pressed: now,
      t: now,
      from: hauled.position.clone(),
      fromQ: hauled.quaternion.clone(),
      holder: read.pid,
      pressFrame: frames + 1, // the first frame drawn after the input: the press frame
      movedFrame: -1,
    };
    if (!drag.shown()) fit.from.copy(hip);
    lastFit = null;
    drag.hide();
    placeSeat();
    const p = me.body?.position;
    if (p) thump(p.x, p.z);
  }
  function refuseFit(now: number) {
    if (!fit || fit.phase === 'back') return;
    lastFit = { pressFrame: fit.pressFrame, movedFrame: fit.movedFrame, refused: true };
    Object.assign(fit, { phase: 'back', t: now });
    fit.from.copy(hauled.position);
    fit.fromQ.copy(hauled.quaternion);
    uiSound('deny');
  }
  /** Drives the hauled group while your fit is out; false once it is back on the rope. */
  function flyFit(now: number) {
    if (!fit) return false;
    const u = (now - fit.t) / 1000;
    if (fit.phase === 'fly') {
      const k = reducedMotion ? 1 : Math.min(1, u / FIT.fly),
        e = smooth(k);
      hauled.position.lerpVectors(fit.from, seat, e);
      hauled.position.y += FIT.apex * 4 * k * (1 - k);
      hauled.quaternion.slerpQuaternions(fit.fromQ, seatQ, e);
      if (fit.movedFrame < 0 && hauled.position.distanceToSquared(fit.from) > 1e-6) fit.movedFrame = frames;
      if (k >= 1) {
        fit.phase = 'sit';
        clank(seat.x, seat.z);
        pieces.dustRing(seat.x, seat.y - BOILER_SHAPE.radius, seat.z, 10, 1.4, 0.25);
      }
    } else if (fit.phase === 'sit') {
      hauled.position.copy(seat);
      hauled.quaternion.copy(seatQ);
      if (now - fit.pressed > FIT.silence * 1000 && read.pending() === 0 && !line2Trains(read.world())) refuseFit(now);
    } else {
      const k = reducedMotion ? 1 : Math.min(1, u / FIT.back);
      hauled.position.lerpVectors(fit.from, hip, smooth(k));
      hauled.position.y += 0.4 * 4 * k * (1 - k);
      if (k >= 1) {
        fit = null;
        // Back on the rope: it trails from behind you, not from where it last lay.
        lay.set(Infinity, 0, Infinity);
        drag.reset();
        return false;
      }
    }
    hauled.visible = true;
    return true;
  }
  /** The tail's ground: the terrain on a slope, the hauler's feet on a deck, a bridge or a car (Part 3). */
  const support = (x: number, z: number) => {
    const h = land.H(x, z);
    return h >= feetY - 1.2 ? h : feetY;
  };
  const avatarOf = (pid: string): Avatar | null =>
    pid === read.pid ? me.avatar : ([...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar ?? null);
  const backFree = (pid: string) => {
    const w = read.world(),
      a = account(w, pid),
      beam = beamRow(w);
    return (
      !!a &&
      !a.carry &&
      !a.stone &&
      !a.rails &&
      !a.foot &&
      !(beam.state === 'held' && beam.holder === pid) &&
      (pid !== read.pid || !heldId())
    );
  };
  const holds = (pid: string) => {
    const b = boilerRow(read.world());
    return b.state === 'held' && b.holder === pid;
  };
  const side0 = Math.sign(carry.BEAM_CARRY_POSITION[0]) || 1;
  const gripAt = new THREE.Vector3();
  const mine = createHelpCarry({
    holds,
    free: backFree,
    avatarOf,
    gripOf: (holder) => {
      const avatar = avatarOf(holder);
      return avatar ? restGrip(avatar, BOILER_SHAPE.length, side0, gripAt) : null;
    },
    self: () => read.pid,
    pidOf: (peer) => {
      const r = remotes.get(peer);
      return r?.entered && r.pid ? r.pid : null;
    },
    now: () => performance.now(),
  });
  help = mine;
  const posing = new Set<Avatar>();
  const hip = new THREE.Vector3(),
    from = new THREE.Vector3(),
    trail = new THREE.Vector3(),
    shoulderA = new THREE.Vector3(),
    shoulderB = new THREE.Vector3(),
    anchor = new THREE.Vector3(),
    lay = new THREE.Vector3(Infinity, 0, Infinity);
  const anchorLocal = new THREE.Vector3(carry.BEAM_CARRY_POSITION[0] * 0.7, 0.55, 0.1);
  const priorCarry = backSeam.carry;
  const carryReadout =
    priorCarry &&
    (() => {
      const load = priorCarry();
      return holds(read.pid) ? { ...load, big: 'boiler' as const } : load;
    });
  // Keep the existing readout's counts/landing semantics; only supply the unique held object.
  if (carryReadout) backSeam.carry = carryReadout;
  function drop() {
    const b = boilerRow(read.world());
    if (b.state !== 'held' || b.holder !== read.pid || !me.body) return false;
    // It stays where you saw it: where it is drawn (well within the server's 3.2 m), else 2.7 m behind you.
    const p = me.body.interpolatedPosition;
    const x = drag.shown() ? hauled.position.x : p.x - Math.sin(me.yaw) * 2.7,
      z = drag.shown() ? hauled.position.z : p.z - Math.cos(me.yaw) * 2.7;
    adapter.dropBoiler(Math.round(x * 100), Math.round(support(x, z) * 100), Math.round(z * 100), b.revision);
    return true; // consume the input even if this request is temporarily refused
  }
  owner.cleanup(bindBigDrop(drop));
  owner.cleanup(() => {
    for (const avatar of posing) avatar.userData.beamGrip = null;
    posing.clear();
    mine.dispose();
    if (help === mine) help = null;
    drag.dispose();
    dragWorld.removeFromParent();
    if (backSeam.carry === carryReadout) backSeam.carry = priorCarry;
    document.body.classList.remove('place-has-load');
    echo.geometry.dispose();
    echo.dispose();
    for (const root of [pedestal, loose, hauled])
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
        }
      });
  });
  function haul(dt: number, now: number) {
    for (const avatar of posing) avatar.userData.beamGrip = null;
    posing.clear();
    const b = boilerRow(read.world());
    const isLoose = b.state === 'pedestal' || b.state === 'ground';
    if (isLoose) lay.set(b.x / 100, b.y / 100 + (b.state === 'pedestal' ? onPedestal : lift), b.z / 100);
    // Your own Pick up takes the rope the frame you press it, before the server's answer (a refusal drops it again).
    const grabbed = isLoose && now - grabbing < 1500 && read.pending() > 0;
    const holder = b.state === 'held' ? b.holder : grabbed ? read.pid : '';
    loose.visible = isLoose && !grabbed;
    const avatar = holder ? avatarOf(holder) : null;
    if (!holder || !avatar) {
      // Accepted while it is still in the air (a near server answers within a frame): it finishes its flight, and the
      // loco's own boiler shows once it lands (`flying`, read by train-view.ts).
      if (fit?.phase === 'fly' && b.state === 'fitted' && flyFit(now) && fit.phase === 'fly') return;
      if (fit) {
        // Fitted (the engine's own boiler and its lashing show now), or the rope went another way.
        lastFit = { pressFrame: fit.pressFrame, movedFrame: fit.movedFrame, refused: b.state !== 'fitted' };
        fit = null;
      }
      // Put down where it was drawn: it lies on the heading it was hauled on, for everyone who watched (Local; a
      // late joiner sees the pedestal's heading).
      if (hauled.visible && b?.state === 'ground') {
        const dir = trail.set(0, 0, 1).applyQuaternion(hauled.quaternion);
        loose.rotation.set(0, Math.atan2(dir.x, dir.z) + hauledModel.rotation.y, 0);
      } else if (b?.state === 'pedestal') loose.rotation.set(0, 0, 0);
      drag.hide();
      hauled.visible = false;
      dragHolder = '';
      return;
    }
    if (holder !== dragHolder) drag.reset();
    dragHolder = holder;
    hauled.visible = true;
    feetY = avatar.position.y - PLAYER_R;
    const yaw = avatar.rotation.y,
      back = { x: Math.sin(yaw), z: Math.cos(yaw) };
    // A short rope's length behind, so the boiler clears Buddy (line-cargo.ts's numbers); its nose no lower than its
    // own radius off the ground at your feet.
    hip.set(
      avatar.position.x + back.x * 1.05 + Math.cos(yaw) * side0 * 0.4,
      Math.max(avatar.position.y + 0.15, feetY + BOILER_SHAPE.radius),
      avatar.position.z + back.z * 1.05 - Math.sin(yaw) * side0 * 0.4,
    );
    if (fit && fit.holder !== holder) fit = null;
    if (flyFit(now)) return;
    // The tail starts where the boiler last lay, else straight behind.
    if (Math.hypot(lay.x - hip.x, lay.z - hip.z) < 8) from.copy(lay);
    else from.set(hip.x + back.x * BOILER_SHAPE.length, hip.y, hip.z + back.z * BOILER_SHAPE.length);
    const helperAvatar = mine.helperOf(holder) as Avatar | null;
    const frame = frameOf(avatar),
      helperFrame = frameOf(helperAvatar);
    let helped: [THREE.Vector3, THREE.Vector3] | null = null;
    if (frame && helperFrame) {
      frame.updateWorldMatrix(true, false);
      helperFrame.updateWorldMatrix(true, false);
      shoulderA.set(...carry.BEAM_CARRY_POSITION);
      frame.localToWorld(shoulderA);
      shoulderB.set(...carry.BEAM_CARRY_POSITION);
      helperFrame.localToWorld(shoulderB);
      if (shoulderA.distanceToSquared(shoulderB) >= 0.25) helped = [shoulderA, shoulderB];
    }
    avatar.userData.beamGrip = 'rope';
    posing.add(avatar);
    if (helped && helperAvatar) {
      helperAvatar.userData.beamGrip = 'lift';
      posing.add(helperAvatar);
    }
    // Trail about 35 degrees off straight behind, on the shoulder side.
    trail.set(back.x * 0.82 + Math.cos(yaw) * side0 * 0.57, 0, back.z * 0.82 - Math.sin(yaw) * side0 * 0.57);
    drag.update(dt, hip, from, trail, helped);
  }
  function update(dt: number) {
    const w = read.world(),
      pid = read.pid;
    const now = performance.now();
    const frameDt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const b = boilerRow(w);
    const cast = b.state !== 'none';
    pedestal.visible = cast;
    if (cast && !body)
      body = land.addStatic(
        { kind: 'cylinder', rTop: 1.15, rBottom: 1.3, h: 0.6, segments: 8 },
        pedestal.position,
        undefined,
        undefined,
        owner,
      );
    else if (!cast && body) {
      owner.removeBody(body);
      body = null;
    }
    loose.position.set(b.x / 100, b.y / 100 + (b.state === 'pedestal' ? onPedestal : lift), b.z / 100);
    frames++;
    mine.helping();
    haul(frameDt, now);
    if (cardDue >= 0 && now >= cardDue) {
      cardDue = -1;
      const model = engine.makeEngineBoiler();
      youGot?.({ name: BOILER_CARD_COPY.name, line: BOILER_CARD_COPY.line, model, from: seat.clone() });
    }
    const held = b.state === 'held';
    echoRoot.visible = held && !line2Trains(w) && !fit;
    if (echoRoot.visible) {
      placeSeat();
      echoRoot.position.copy(seat);
      echoRoot.quaternion.copy(seatQ);
    }
    const beam = beamRow(w),
      mineAcc = account(w, pid);
    document.body.classList.toggle(
      'place-has-load',
      (held && b.holder === pid) ||
        (beam.state === 'held' && beam.holder === pid) ||
        (mineAcc ? mineAcc.carry + mineAcc.rails + mineAcc.stone : 0) > 0,
    );
    call.update(dt, b.state === 'pedestal');
    mote -= dt;
    echoMote -= dt;
    if (b.state === 'pedestal' && mote <= 0) {
      mote = 0.8;
      side *= -1;
      emit({
        x: bx + side * 0.42,
        y: by + 1.55,
        z: bz + side * 0.5,
        vx: side * 0.025,
        vy: 0.14,
        vz: 0,
        life: 1.1,
        size: 0.055,
        color: gold,
        intensity: readableIntensity() * 1.4,
        alpha: 0.75,
        grow: [0.6, 1],
        shrink: 0.5,
        fade: 0.7,
      });
    }
    // A few of the pedestal's motes over the empty saddle while the boiler is on its way.
    if (echoRoot.visible && echoMote <= 0) {
      echoMote = 0.9;
      side *= -1;
      emit({
        x: saddle.x + side * 0.4,
        y: saddle.y + BOILER_SHAPE.radius * 0.6,
        z: saddle.z + side * 0.3,
        vx: side * 0.025,
        vy: 0.14,
        vz: 0,
        life: 1.1,
        size: 0.055,
        color: gold,
        intensity: readableIntensity() * 1.4,
        alpha: 0.75,
        grow: [0.6, 1],
        shrink: 0.5,
        fade: 0.7,
      });
    }
  }
  return {
    update,
    restore() {
      // Rebuild silently; the continuous pedestal invitation resumes on a later frame.
      mote = 0.8;
      call.restore(boilerRow(read.world()).state === 'pedestal');
      update(0);
    },
    drop,
    /** Sample after feel.ts's squash/landing pose, so the pulling end stays in the animated mitt. */
    lateUpdate() {
      const avatar = dragHolder ? avatarOf(dragHolder) : null;
      if (!avatar || !drag.shown()) return;
      const hand = avatar.userData.handSocket;
      if (hand) hand.getWorldPosition(anchor);
      else {
        // The diagnostic capsule has no rig; keep line-cargo.ts's load-frame fallback.
        const frame = frameOf(avatar);
        if (!frame) return;
        frame.updateWorldMatrix(true, false);
        anchor.copy(anchorLocal);
        frame.localToWorld(anchor);
      }
      drag.drawRope(anchor);
    },
    /** The haul pace: sprint off for the hauler and the helper; the hauler at the room's solo or helped pace. */
    prePhysics() {
      const pid = read.pid;
      if (holds(pid)) {
        input.sprint = me.sprint = false;
        const speeds = read.movement();
        me.wish.multiplyScalar((mine.helperOf(pid) ? speeds.boilerHelpSpeed : speeds.boilerSoloSpeed) / 5.6);
      } else if (mine.helping()) {
        input.sprint = me.sprint = false;
        mine.ease(me.wish);
      }
    },
    accepted(e: RailwayAccepted) {
      if (e.op === 'rail.boilerTake') {
        thump(bx, bz);
        pieces.dustRing(bx, by + 0.6, bz, 8, 1.5, 0.25);
      }
      if (e.op === 'rail.boilerFit') {
        // The fitter heard the clank as it landed; everyone else hears it now.
        if (!(fit && e.pid === fit.holder)) clank(saddle.x, saddle.z);
        if (BOILER_CARD && youGot && e.pid === read.pid) cardDue = performance.now() + FIT.wake * 1000;
      }
    },
    /** A refused or lost request: a refused fit hops back onto the rope (a refused take ends `grabbing` once nothing
     * is pending). */
    corrected(c?: RailwayCorrection) {
      if (c?.event.op === 'rail.boilerFit') refuseFit(performance.now());
    },
    /** train-view.ts's loco boiler: the fit lands exactly where it sits. */
    seatFrom(fn: () => THREE.Matrix4) {
      seatOf = fn;
    },
    /** Your fit is still in the air: the old loco keeps its saddle empty until it lands. */
    flying: () => fit?.phase === 'fly',
    targets(): Interactable[] {
      const w = read.world(),
        pid = read.pid,
        b = boilerRow(w),
        p = me.body?.position;
      if (!read.ready() || !p) return [];
      // What a press acts on is the state this frame saw: a row is live, so take the numbers now.
      const { revision, holder } = b,
        bx = b.x / 100,
        bz = b.z / 100;
      if ((b.state === 'pedestal' || b.state === 'ground') && Math.hypot(p.x - b.x / 100, p.z - b.z / 100) <= 3.6) {
        const at = new THREE.Vector3(bx, b.y / 100 + 2, bz);
        // It takes rail.boilerTake's empty back (no load, footing or beam) and, like the beam, empty hands.
        // Say so rather than offer nothing: a back still loaded from station 5 is common here (the forge rack 4.5 m
        // off offers no rails before trains, but logs or rails carried from elsewhere still block the take).
        // `r`, the pedestal's radius: measured to its edge, so a log pile dropped against it doesn't win the prompt.
        const target = { id: 'railway-boiler', verb: 'Pick up', at, r: 1.3 };
        return [
          backFree(pid)
            ? {
                ...target,
                run: () => {
                  if (adapter.takeBoiler(revision)) grabbing = performance.now();
                },
              }
            : onlyALoadIn(w, pid)
              ? {
                  // A loaded back: the load goes down beside you, away from the pedestal, then the boiler is taken.
                  ...target,
                  run: () => {
                    const take = () => {
                      const ok = adapter.takeBoiler(boilerRow(read.world()).revision);
                      if (ok) grabbing = performance.now();
                      return ok;
                    };
                    setDownThen(adapter, take, { x: bx, z: bz }, true);
                  },
                }
              : { ...target, blocked: 'Empty your back first' },
        ];
      }
      if (b.state !== 'held') return [];
      if (holder === pid)
        return Math.hypot(p.x - LINE2_OLD_TRAIN.x / 100, p.z - LINE2_OLD_TRAIN.z / 100) <= 7
          ? [
              {
                id: 'railway-boiler-fit',
                verb: 'Fit the boiler',
                at: saddle,
                run: () => {
                  // A second press while it is in the air or the saddle is a no-op (one fit per world).
                  if (!fit && adapter.fitBoiler(revision)) startFit(performance.now());
                },
              },
            ]
          : [];
      if (mine.helping() === holder)
        return [{ id: 'railway-boiler-help-release', verb: 'Let go', at: drag.grip, run: () => mine.stop() }];
      const other = avatarOf(holder);
      if (other && mine.canStart(holder))
        return [
          {
            id: 'railway-boiler-help',
            verb: 'Help carry',
            // The friend reaches for the dragging end.
            at: drag.shown() ? drag.grip : other.position,
            run: () => mine.start(holder),
          },
        ];
      return [];
    },
    inspect: () => {
      const pid = read.pid,
        b = boilerRow(read.world());
      return {
        boiler: {
          ...b,
          x: b.x / 100,
          y: b.y / 100,
          z: b.z / 100,
          mine: b.state === 'held' && b.holder === pid,
          pedestal: pedestal.visible,
          saddle: { x: saddle.x, y: saddle.y, z: saddle.z },
          hauled: hauled.visible,
          helper: mine.helperOf(b.holder) ? (mine.helping() === b.holder ? pid : 'remote') : null,
          helping: mine.helping(),
          at: { x: hauled.position.x, y: hauled.position.y, z: hauled.position.z },
          tail: { x: drag.tail.x, y: drag.tail.y, z: drag.tail.z },
          saddleEcho: echoRoot.visible,
          fitting: fit ? { phase: fit.phase, pressFrame: fit.pressFrame, movedFrame: fit.movedFrame } : null,
          lastFit,
          frame: frames,
          seat: { x: seat.x, y: seat.y, z: seat.z },
          shape: { length: BOILER_SHAPE.length, radius: BOILER_SHAPE.radius },
        },
      };
    },
  };
}
