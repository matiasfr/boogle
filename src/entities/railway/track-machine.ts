// The track-laying machine, solid, with its rack and its cradle in plain sight (moved from the rail of ?proto=place). Its rhythm is the retired ?proto=lay's.
import { BOTTOM, drawCar, makeCar, poseCarOnLine, snapCar } from './car.ts';
import type { Track } from './track.ts';
import * as THREE from 'three/webgpu';
import { readableGlow, readableUnlit } from '../../render/readable-unlit.ts';
import { emit } from '../../render/particles.ts';
import { chuff, clank, thump } from '../../render/machine-sfx.ts';
import { FIXED } from '../../constants.ts';
import { background } from '../../async.ts';
import machineUrl from '../../../assets/built/track-layer.glb?url';
import wingUrl from '../../../assets/built/track-wing.glb?url';
import { stepAlpha } from '../../physics/engine.ts';
import { type Platform } from '../../physics/platforms.ts';
import { wagonLook, LOCO, TRAILER } from '../../render/wagon-look.ts';
import { FORMATION, LINKS, upLat, type Line } from '../../place/layout.ts';
import { RAIL_SIZE, dustRing, logStackMesh, setStackLog } from '../../place/pieces.ts';
import { flat } from '../../render/flat.ts';
import { LOOK, STEEL, paint, rustU, softGlow } from '../../place/look.ts';
import { merged } from '../../render/part-geometry.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { kitBatch, machineLook } from '../../place/look-kit.ts';
import { machineModel, MACHINE_CHAIRS, MACHINE_DECK, MACHINE_GAP } from './machine-model.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { MAX_PANEL_LENGTH } from './track-panels.ts';
import { FIRST_SEATED, WING, WING_BEAM_LENGTH, wingSide, type UpSeat } from './machine-panels.ts';
import { buildWing } from './machine-wing.ts';

// ---------------------------------------------------------------- the machine
/** What the machine carries, drawn in the flatbed's frame: its rack of rails down each side, its cradle of logs. */
const CRADLE_LOGS = 40;
export type Machine = ReturnType<typeof buildMachine>;
export function buildMachine(owner: OwnedView, mode: 'panels' | 'continuous' = 'panels') {
  const panelled = mode === 'panels';
  // ?layer=wing: the greybox second hand for the up track (docs/brainstorms/track-layers-double.md). Off, nothing changes.
  const wingOn = panelled && new URLSearchParams(location.search).get('layer') === 'wing';
  const railBatch = (n: number) => {
    // The stack and the carried pair are the committed track's own kit rail; nothing lies flat
    // enough to need a second shadow draw.
    const rails = kitBatch('rail', STEEL, n, owner);
    rails.castShadow = false;
    rails.receiveShadow = true;
    return rails;
  };
  const F = panelled ? MAX_PANEL_LENGTH + 2.4 : 2.4;
  const GAP = panelled ? MACHINE_GAP : 3.7;
  const model = panelled
    ? machineModel(
        kitBatch('rail', STEEL, 1, owner),
        kitBatch('fork', { color: '#f0752c', rough: 0.55 }, 1, owner),
        kitBatch('sleeper', { color: '#8a6236', grain: { axis: 'x', honey: '#c98a3e' } }, 1, owner),
        railBatch,
      )
    : null;
  const kitLook = !panelled && LOOK.kit ? machineLook(owner) : null;
  const look = model ?? kitLook ?? wagonLook(1, false, owner);
  if ('step' in look) owner.animate(look.step, 8);
  if (model)
    background(
      import('../../render/assets.ts').then(async ({ loadAsset }) =>
        model.install((await loadAsset(machineUrl)).gltf.scene),
      ),
      'track-layer model',
    );
  const flatRock = look.cars[1]!,
    locoRock = look.cars[0]!;
  const pose = { line: null as Line | null, s: 0, sign: 1, back: F };
  const onDeck = TRAILER.top;
  const step = { hx: 1.4, hz: 0.3, h: 0.16, z: -1.9 };
  const flatbed = makeCar(
    TRAILER,
    flatRock,
    () => m.onStep(FIXED),
    {
      shapes: [
        {
          kind: 'box',
          hx: step.hx,
          hy: step.h / 2,
          hz: step.hz,
          offset: { x: 0, y: (TRAILER.top - BOTTOM) / 2 - step.h / 2, z: step.z },
        },
      ],
    },
    owner,
  );
  flatbed.platform.hx = step.hx;
  flatbed.platform.hz = Math.abs(step.z) + step.hz;
  flatbed.supportAt = (_x, z) =>
    z < -TRAILER.hz ? { x: 0, z: step.z, hx: step.hx, hz: step.hz } : { x: 0, z: 0, hx: TRAILER.hx, hz: TRAILER.hz };
  const loco = makeCar(LOCO, locoRock, () => {}, {}, owner);
  flatbed.platform.id = 'railway:T1:flatbed';
  loco.platform.id = 'railway:T1:loco';
  flatbed.platform.shared = loco.platform.shared = true;
  const o = new THREE.Object3D();
  const toRig = new THREE.Matrix4(),
    seatAt = new THREE.Vector3(),
    seatDir = new THREE.Vector3(),
    upAt = new THREE.Vector3(),
    upDir = new THREE.Vector3(),
    startAt = new THREE.Vector3();
  let heldRail: THREE.Object3D;
  let wing: ReturnType<typeof buildWing> | null = null;
  let rack: THREE.InstancedMesh;
  const rig = model?.panelRig;
  if (model && rig) {
    [loco, flatbed].forEach((car, i) => {
      const gear = model.runningGear[i]!;
      gear.position.y = -(BOTTOM + car.hy);
      car.mesh.add(gear);
      car.onSnap = () => {
        model.resetWheelTravel(i);
      };
    });
    // Match the original chair frame: body-relative, without the deck's pitch or shudder.
    model.chairs.position.y = flatbed.hy - MACHINE_DECK;
    flatbed.mesh.add(model.chairs);
    MACHINE_CHAIRS.forEach((x, i) => {
      instantiate(
        'railway.machine-chair',
        {
          id: `machine-deck-${i}`,
          prefab: 'railway.machine-chair',
          pos: [x, flatbed.hy, 0],
          parent: flatbed.platform.id,
        },
        {
          owner,
          parent: { platform: flatbed.platform, root: flatbed.mesh },
          gates: { open: () => flatbed.y > -30 },
        },
      ).setEnabled(true);
    });
    heldRail = model.heldRail;
    heldRail.visible = false;
    flatbed.mesh.add(rig.root);
    rig.root.position.y = -(BOTTOM + flatbed.hy);
    if (wingOn) {
      const built = buildWing(flatbed.mesh, railBatch);
      wing = built;
      wing.group.position.y = rig.root.position.y;
      background(
        import('../../render/assets.ts').then(async ({ loadAsset }) =>
          built.install((await loadAsset(wingUrl)).gltf.scene),
        ),
        'track-wing model',
      );
    }
    rack = rig.rails;
  } else {
    const box3 = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color, 0.8));
      m.position.set(x, y, z);
      m.rotation.x = rx;
      m.castShadow = true;
      flatRock.add(m);
      return m;
    };
    box3(step.hx * 2, step.h, step.hz * 2, '#f4d58a', 0, onDeck - step.h / 2, step.z);
    // Cradle sides, in the flatbed's +z half (its front), open at the top.

    if (kitLook) heldRail = kitLook.heldRail;
    else {
      box3(1.5, 0.42, 0.08, '#e8d3a2', 0, onDeck + 0.21, 1.45);
      box3(1.5, 0.42, 0.08, '#e8d3a2', 0, onDeck + 0.21, -0.05);
      box3(0.08, 0.42, 1.5, '#e8d3a2', -0.75, onDeck + 0.21, 0.7);
      box3(0.08, 0.42, 1.5, '#e8d3a2', 0.75, onDeck + 0.21, 0.7);
      // The sleeper chute off the front and the orange arm that holds the next rail out over the head.
      box3(1.3, 0.05, 0.9, '#e8d3a2', 0, onDeck - 0.3, 1.95, 0.5);
      box3(0.08, 0.08, 1.2, '#f0752c', 0.62, onDeck + 0.5, 1.9, 0.25);
      heldRail = box3(RAIL_SIZE.x, RAIL_SIZE.y, 1.9, '#4c5058', 0.62, onDeck + 0.28, 2.1);
    }

    const railGeo = new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z);
    rack = LOOK.kit
      ? kitBatch('rail', STEEL, 12, owner)
      : new THREE.InstancedMesh(railGeo, LOOK.mats ? paint(STEEL) : flat('#4c5058', 0.6), 12);
    rack.castShadow = true;
    rack.frustumCulled = false;

    for (let k = 0; k < 12; k++) {
      const side = k % 2 ? 1 : -1,
        layer = Math.floor(k / 4),
        inner = (k >> 1) % 2;
      o.position.set(side * (1.26 + inner * 0.18), onDeck - 0.1 + layer * 0.2, 0);
      o.updateMatrix();
      rack.setMatrixAt(k, o.matrix);
    }
    flatRock.add(rack);
  }
  let rackCount = 0,
    rackLengths: number[] = [],
    rackPairs: number[] = [],
    rackKey = '',
    selecting = false;
  // The magazine holds a rail pair for each track a panel lays: `rackCount` panels in stock, `rackPairs` per panel.
  /** Rail pairs in the magazine for its next `panels` panels. */
  const pairsIn = (panels: number) => {
    let n = 0;
    for (let i = 0; i < panels; i++) n += rackPairs[i] ?? 1;
    return n;
  };
  /** Up-track pairs among the next `panels` panels (the wing's stack, ?layer=wing). */
  const upIn = (panels: number) => {
    let n = 0;
    for (let i = 0; i < panels; i++) n += (rackPairs[i] ?? 1) > 1 ? 1 : 0;
    return n;
  };
  const drawPanelRack = () => {
    if (wing) {
      // Two stacks: the down pairs on the gantry (one a panel), the up pairs on the wing's platform.
      rig?.drawStack(rackCount, rackLengths, selecting ? 1 : 0);
      wing.mech.drawStack(
        upIn(rackCount),
        rackLengths.filter((_, i) => (rackPairs[i] ?? 1) > 1),
        selecting && (rackPairs[0] ?? 1) > 1 ? 1 : 0,
      );
      return;
    }
    const lengths = rackLengths.flatMap((length, i) => Array<number>(rackPairs[i] ?? 1).fill(length));
    rig?.drawStack(pairsIn(rackCount), lengths, selecting ? (rackPairs[0] ?? 1) : 0);
  };
  const cradle = logStackMesh(CRADLE_LOGS, owner);
  cradle.removeFromParent();
  flatRock.add(cradle);
  const cradleAt = new THREE.Vector3(),
    cradleN = { n: -1 };
  function setCradle(n: number) {
    n = Math.min(CRADLE_LOGS, n);
    if (cradleN.n === n) return;
    cradleN.n = n;
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / 5),
        c = k % 5;
      cradleAt.set(0, onDeck + 0.14 + row * 0.2, 0.2 + c * 0.25);
      setStackLog(cradle, k, cradleAt, 0);
    }
    cradle.count = n;
    cradle.visible = n > 0;
    cradle.instanceMatrix.needsUpdate = true;
    if (cradle.instanceColor) cradle.instanceColor.needsUpdate = true;
  }
  /** World point of the middle of the cradle, for what rolls in. */
  const worldCradle = (out: THREE.Vector3) => {
    flatRock.updateWorldMatrix(true, false);
    return flatRock.localToWorld(out.set(0, onDeck + 0.3, 0.7));
  };
  let deliveries = 0;
  const worldRack = (out: THREE.Vector3) => {
    if (wing && rackPairs.some((n) => n > 1) && deliveries++ % 2) {
      // Deliveries land alternately on the two stacks.
      wing.mech.root.updateWorldMatrix(true, false);
      return wing.mech.root.localToWorld(wing.mech.nextSlot(out));
    }
    if (rig) {
      rig.root.updateWorldMatrix(true, false);
      return rig.root.localToWorld(rig.nextSlot(out));
    }
    flatRock.updateWorldMatrix(true, false);
    return flatRock.localToWorld(out.set(1.3, onDeck + 0.1, 0));
  };

  function setRack(n: number) {
    rackCount = Math.max(0, panelled ? n : Math.min(12, n));
    if (panelled) drawPanelRack();
    else {
      rack.count = rackCount;
      rack.visible = rackCount > 0;
      // Continuous rack transforms were written once at construction; count does not change them.
      heldRail.visible = n > 0;
    }
  }

  // Headlamps, a beam each, and the fire in the cab: all dark until the boiler catches.
  const lampSpots = [
    [flatRock, [-0.72, onDeck + 0.5, 1.6]],
    [flatRock, [0.72, onDeck + 0.5, 1.6]],
    [locoRock, [0, 1.75, 1.62]],
  ] as const;
  const glass = new THREE.MeshStandardNodeMaterial({ color: '#59584e', roughness: 0.35 });
  const shine = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3.2, 2.7, 1.5) }));
  const beamMat = softGlow('#ffe4a0', 0.3, true).mat;
  const beamGeo = new THREE.ConeGeometry(0.85, 6.5, 14, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 3.25);
  const lamps = lampSpots.map(([parent, at]) => {
    const lamp = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
      merged([
        ['c', 0, 0, -0.07, 0.15, 0.14, 0.15, '#24262c', Math.PI / 2],
        ['s', 0, 0, 0, 0.14, 0.14, 0.07, '#ffffff'],
      ]),
      glass,
    );
    lamp.position.set(at[0], at[1], at[2]);
    parent.add(lamp);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(lamp.position);
    beam.visible = false;
    parent.add(beam);
    return { lamp, beam };
  });
  const fire = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#96360c', emissive: '#ff8a23', emissiveIntensity: 0 }),
  );
  const firebox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.04), fire);
  firebox.position.set(0, 1.05, -1.57);
  locoRock.add(firebox);
  const grate = new THREE.Mesh(
    merged([
      ['b', 0, 0.87, -1.6, 0.56, 0.06, 0.05, '#24262c'],
      ['b', 0, 1.23, -1.6, 0.56, 0.06, 0.05, '#24262c'],
      ['b', -0.25, 1.05, -1.6, 0.06, 0.3, 0.05, '#24262c'],
      ['b', 0.25, 1.05, -1.6, 0.06, 0.3, 0.05, '#24262c'],
      ['b', -0.08, 1.05, -1.6, 0.035, 0.3, 0.05, '#24262c'],
      ['b', 0.08, 1.05, -1.6, 0.035, 0.3, 0.05, '#24262c'],
    ]),
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9 }),
  );
  locoRock.add(grate);
  let fireOn = 0;
  const setLamps = (on: boolean) => {
    for (const l of lamps) {
      l.lamp.material = on ? shine : glass;
      l.beam.visible = on;
    }
  };

  const st = { awake: false, moved: 0, bump: 0, idle: 0, shudder: 0, was: false };
  const smoke = new THREE.Color('#ece8e0'),
    v = new THREE.Vector3();
  const flatY = flatRock.position.y;
  function puff(heavy: number) {
    look.chimneyTop.getWorldPosition(v);
    chuff(v.x, v.z, heavy);
    for (let n = 0; n < 2 + heavy * 3; n++)
      emit({
        x: v.x,
        y: v.y,
        z: v.z,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 2.2 + heavy,
        vz: (Math.random() - 0.5) * 0.6,
        life: 2.2,
        size: 0.5,
        color: smoke,
        alpha: 0.6,
        grow: [1, 3],
        fade: 0.5,
      });
  }
  // ?layer=wing -------------------------------------------------------------
  const wingStats = { side: 0, gap: 0, lift: 0, reachDown: 0, reachUp: 0, panels: 0 };
  let wingSideNow = 0,
    warned = false;
  /** Gap (m) between the flatbed's side and the up track under the wing's post; 0 where the line is single. */
  const wingGap = () => {
    const link = LINKS.find((l) => l.line === pose.line);
    if (!link) return 0;
    const sPost = pose.s - pose.sign * pose.back + pose.sign * WING.postZ;
    return -(upLat(FORMATION[link.id], sPost) ?? 0);
  };
  /** Stow or open the wing for where the machine stands. The side is the up seat's once a panel has shown it; before
   * that the machine's heading says it (laid toward Home the up track is on its right, away from Home on its left). */
  const placeWing = () => {
    if (!wing) return;
    const side = wingSideNow || (pose.sign > 0 ? 1 : -1);
    wingStats.side = side;
    wingStats.gap = wingGap();
    wingStats.lift = wing.place(side, wingStats.gap);
  };
  const toWing = new THREE.Matrix4(),
    wingAt = new THREE.Vector3();
  function layWing(track: Track, index: number, phase: number, stock: number) {
    if (!wing || !rig) return;
    const len = track.carriedLength(index);
    // The gantry lays the down pair alone, with no crossing: the up pair is the wing's.
    const frame = rig.pose(
      phase,
      stock,
      seatAt,
      Math.atan2(seatDir.x, seatDir.z),
      Math.asin(Math.max(-1, Math.min(1, seatDir.y))),
      startAt,
      len,
      null,
    );
    wingStats.reachDown = Math.max(wingStats.reachDown, Math.hypot(rig.trolley.position.x, rig.trolley.position.z));
    if (track.seatUp(index, upAt, upDir)) {
      wingAt.copy(upAt).applyMatrix4(toRig);
      // The first metres of a turnout lie too close to the flatbed's line to tell a side by: wait for 1 m.
      const side = Math.abs(wingAt.x) > 1 ? wingSide(wingAt.x) : wingSideNow;
      if (side !== wingSideNow) {
        wingSideNow = side;
        placeWing();
      }
      toWing.copy(wing.mech.root.matrixWorld).invert();
      upAt.applyMatrix4(toWing);
      upDir.transformDirection(toWing);
      track.panelStartUp(index, startAt).applyMatrix4(toWing);
      wing.mech.pose(
        phase,
        upIn(stock),
        upAt,
        Math.atan2(upDir.x, upDir.z),
        Math.asin(Math.max(-1, Math.min(1, upDir.y))),
        startAt,
        len,
        null,
      );
      wingStats.reachUp = Math.max(
        wingStats.reachUp,
        Math.hypot(wing.mech.trolley.position.x, wing.mech.trolley.position.z),
      );
      wingStats.panels++;
    } else wing.mech.home(1, upIn(stock));
    if (!warned && Math.max(wingStats.reachDown, wingStats.reachUp) > WING_BEAM_LENGTH + 0.02) {
      warned = true;
      console.warn('?layer=wing: a hand reached past the 5.8 m beam', wingStats);
    }
    track.presentPanel(index, frame, false);
  }
  const m = {
    /** Called once per physics step, before the cars move: the run advances the machine here. */
    onStep: (() => {}) as (dt: number) => void,
    onPanelFrame: (() => {}) as (dt: number) => void,
    look,
    get panel() {
      if (!model) throw new Error('continuous railway has no panel mechanism');
      return model;
    },
    flatbed,
    loco,
    onMachine: (p: Platform | null) => p === flatbed.platform || p === loco.platform,
    /** Stands on `line`, the head (where pieces land) at `head` metres along, heading `sign` along the line. */
    at(line: Line, head: number, sign: number, setback = F) {
      pose.line = line;
      pose.s = head;
      pose.sign = sign;
      pose.back = setback;
      poseCarOnLine(flatbed, line, head - sign * setback, sign);
      poseCarOnLine(loco, line, head - sign * (setback + GAP), sign);
    },
    /** On the turntable, centred on (x, z) in world metres, turned to `yaw`. */
    turn(x: number, y: number, z: number, yaw: number) {
      const hx = Math.sin(yaw),
        hz = Math.cos(yaw);
      for (const [c, off] of [
        [flatbed, GAP / 2],
        [loco, -GAP / 2],
      ] as const) {
        c.x = x + hx * off;
        c.z = z + hz * off;
        c.y = y + BOTTOM + c.hy;
        c.yaw = yaw;
        c.pitch = 0;
      }
    },
    snap() {
      snapCar(flatbed);
      snapCar(loco);
    },
    /** Out of the scene, where a train not yet needed waits (car.ts: under the land, undrawn, its chairs unavailable,
     * no rider carried): once line 2 runs past the pier head the parked machine would stand on its running track. */
    stow() {
      if (flatbed.y <= -30 && loco.y <= -30) return;
      flatbed.y = loco.y = -60;
      snapCar(flatbed);
      snapCar(loco);
    },
    wake(on: boolean, silent = false) {
      st.awake = on;
      st.shudder = 0;
      rustU.value = on ? 0 : 1;
      setLamps(on);
      fireOn = on ? 1 : 0;
      if (on && !silent) for (let k = 0; k < 3; k++) puff(1);
    },
    /** For the waking: how hard it shakes (0 stops), how rusty (1) or clean (0), the fire, the lamps. */
    shudder: (a: number) => void (st.shudder = a),
    setRust: (v: number) => void (rustU.value = v),
    setFire: (v: number) => void (fireOn = v),
    /** Rad/s the wheels slip with no ground going by. */
    setSlip: (rate: number) => {
      const l = look as { slip?: { rate: number } };
      if (l.slip) l.slip.rate = rate;
    },
    setLamps,
    moved(d: number) {
      st.moved += d;
      if (st.moved > 2.4) {
        st.moved = 0;
        puff(0.2);
      }
    },
    bump() {
      st.bump = 1;
    },
    setRack,
    /** The panels still to lay, in order: each one's length and how many rail pairs it takes (default one). */
    panelRack(lengths: number[], selected: boolean, pairs: number[] = []) {
      const key = lengths.join(',') + '|' + pairs.join(',');
      if (rackKey === key && selecting === selected) return;
      rackKey = key;
      rackLengths = lengths;
      rackPairs = pairs;
      selecting = selected;
      drawPanelRack();
    },
    /** One panel cycle: pose the gantry for `phase` and lay what it has passed. Both railway views use this. */
    layPanel(track: Track, index: number, phase: number, stock: number) {
      if (!rig) return;
      rig.root.updateWorldMatrix(true, false);
      toRig.copy(rig.root.matrixWorld).invert();
      track.seat(index, seatAt, seatDir);
      seatAt.applyMatrix4(toRig);
      seatDir.transformDirection(toRig);
      track.panelStart(index, startAt).applyMatrix4(toRig);
      if (wing) return layWing(track, index, phase, stock);
      let up: UpSeat | null = null;
      if (track.seatUp(index, upAt, upDir)) {
        upAt.applyMatrix4(toRig);
        upDir.transformDirection(toRig);
        up = { seat: upAt, yaw: Math.atan2(upDir.x, upDir.z), pitch: Math.asin(Math.max(-1, Math.min(1, upDir.y))) };
      }
      // `stock` counts panels; the magazine holds a pair per track, and this panel's are on top.
      const frame = rig.pose(
        phase,
        pairsIn(stock),
        seatAt,
        Math.atan2(seatDir.x, seatDir.z),
        Math.asin(Math.max(-1, Math.min(1, seatDir.y))),
        startAt,
        track.carriedLength(index),
        up,
      );
      track.presentPanel(index, frame, !!up && phase >= FIRST_SEATED);
    },
    /** Not laying: the gantry goes home over the stack on local time (0..1). */
    layHome(t: number, stock: number) {
      if (wing) {
        rig?.home(t, stock);
        wing.mech.home(t, upIn(stock));
      } else rig?.home(t, pairsIn(stock));
    },
    /** For evidence (?layer=wing): the wing's side (+1 the machine's left), gap, truck lift and the hands' reach so far. */
    wingStats,
    setCradle,
    worldCradle,
    worldRack,
    /** Metres from a world point to the machine. */
    distance: (x: number, z: number) => Math.hypot(flatbed.x - x, flatbed.z - z),
    F,
    GAP,
  };
  const animate = ({ dt, now }: { dt: number; now: number }) => {
    const alpha = stepAlpha();
    drawCar(flatbed, alpha);
    drawCar(loco, alpha);
    model?.update(rustU.value);
    fire.emissiveIntensity = fireOn * (1 + Math.sin(now * 0.0025) * 0.05 + Math.sin(now * 0.0047) * 0.03);
    if (st.shudder > 0 || st.was) {
      st.was = st.shudder > 0;
      for (const [rock, phase] of [
        [flatRock, 0],
        [locoRock, 1.3],
      ] as const) {
        rock.rotation.z = Math.sin(now * 0.073 + phase) * 0.018 * st.shudder;
        rock.position.x = Math.sin(now * 0.097 + phase) * 0.035 * st.shudder;
      }
    }
    if (st.bump > 0) {
      st.bump = Math.max(0, st.bump - dt * 7);
      flatRock.position.y = flatY - st.bump * 0.04;
      flatbed.mesh.scale.set(1 + st.bump * 0.02, 1 - st.bump * 0.04, 1 + st.bump * 0.02);
    }
    if (st.awake && flatbed.y > -30) {
      st.idle += dt;
      if (st.idle > 1.4) {
        st.idle = 0;
        look.chimneyTop.getWorldPosition(v);
        emit({
          x: v.x,
          y: v.y,
          z: v.z,
          vx: 0.2,
          vy: 1.6,
          vz: 0,
          life: 2,
          size: 0.35,
          color: smoke,
          alpha: 0.4,
          grow: [1, 3],
          fade: 0.6,
        });
      }
    }
    if (model && rig) {
      // Cancel shell squash outside the rigid bogie frame.
      const gear = model.runningGear[1]!;
      const scale = flatbed.mesh.scale;
      gear.scale.set(1 / scale.x, 1 / scale.y, 1 / scale.z);
      gear.position.y = -(BOTTOM + flatbed.hy) / scale.y;
      rig.root.scale.set(1 / scale.x, 1 / scale.y, 1 / scale.z);
      rig.root.position.y = -(BOTTOM + flatbed.hy) / scale.y;
      if (wing) {
        wing.group.scale.copy(rig.root.scale);
        wing.group.position.y = rig.root.position.y;
        placeWing();
      }
      m.onPanelFrame(dt);
    }
  };
  // Revisit the completed groups: some attached details were made after makeCar mounted their roots.
  owner.add(flatbed.mesh, loco.mesh);
  owner.animate(animate, 7);
  owner.cleanup(() => {
    wing?.dispose();
    glass.dispose();
    shine.dispose();
    beamMat.dispose();
    fire.dispose();
  });
  return m;
}

/** Sleepers thud, rails clank, the trestle's big pieces shake the ground. */
export function thud(machine: Machine, kind: string, x: number, y: number, z: number) {
  if (kind === 'sleeper' || kind === 'plank') {
    thump(x, z);
    // A panel lands a row of these at once: a modest puff each, or the row becomes a smoke bank on the ground.
    dustRing(x, y, z, 3, 0.9, 0.16, 1, 0.6);
    machine.bump();
  } else if (kind === 'rail') {
    clank(x, z);
    dustRing(x, y + 0.1, z, 2, 0.8, 0.1);
  } else if (kind === 'leg' || kind === 'cap') {
    thump(x, z);
    if (kind === 'leg') dustRing(x, y + 0.2, z, 6, 1.8, 0.4, 1, 0.7);
    machine.bump();
  }
}
