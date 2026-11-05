// Local diagnostics sampled by the existing stage loop, after its render. Never an approval score.
import * as THREE from 'three/webgpu';
import type { Motion } from './descriptors.ts';
import { sailAngle } from '../src/pois/windmills/motion.ts';
import { wheelAngle } from '../src/proto/place/machine-model.ts';
import { machineReviewDistance } from './machine-motion.ts';
import { CHOP_CONTACT, CHOP_TRUNK } from '../src/proto/place/chop-motion.ts';

type Pose = { p: number[]; q: number[] };
export type MotionRow = {
  frame: number;
  wall: number;
  time: number;
  dt: number;
  cycle: number;
  boneJump: number;
  bone: string;
  rootJump: number;
  seam: boolean;
  attachmentOffset: number[] | null;
  attachmentRotation: number[] | null;
  attachmentDrift: number | null;
  attachmentAngle: number | null;
  clearance: number | null;
  signedClearance: number | null;
  nearest: string;
  signedNearest: string;
  angularRate: number;
  expectedRate: number;
  pivotDrift: number;
  centroidOrbit: number;
  axisDrift: number;
  sampleMs: number;
  imageMs: number;
  bones: Record<string, Pose>;
  leftGrip: number | null;
  rightGrip: number | null;
  bladeX: number | null;
  bladeY: number | null;
  bladeZ: number | null;
  contactDistance: number | null;
  axeVisible: boolean | null;
  handleBodyClearance: number | null;
  handleHeadClearance: number | null;
  handleBodyDistance: number | null;
  handleHeadDistance: number | null;
};
export type MotionImage = { frame: number; wall: number; time: number; png: string };
export type MotionReport = {
  declaration: Motion;
  duration: number;
  diagnosticRate: number | null;
  source: 'assetStage';
  rows: MotionRow[];
  consecutive: MotionImage[];
  cycle: MotionImage[];
  outliers: { frame: number; metric: string; value: number; threshold: number; detail: string }[];
  limits: string[];
  camera: number[];
  complete: boolean;
  endpointSeam: { bone: string; rotation: number; root: number } | null;
  clip: string;
  mode: string;
  boundaryNote: string;
};
const quat = (q: number[]) => new THREE.Quaternion().fromArray(q);
const angle = (a: number[], b: number[]) => quat(a).angleTo(quat(b));
function visible(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function pose(o: THREE.Object3D): Pose {
  return { p: o.position.toArray(), q: o.quaternion.toArray() };
}
function centroid(root: THREE.Object3D) {
  const sum = new THREE.Vector3(),
    p = new THREE.Vector3();
  let count = 0;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !visible(o)) return;
    const vertices = o.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      sum.add(o.getVertexPosition(i, p).applyMatrix4(o.matrixWorld));
      count++;
    }
  });
  return sum.multiplyScalar(1 / Math.max(1, count));
}
export function bonePoses(figure: THREE.Object3D) {
  const bones: Record<string, Pose> = {};
  let root = figure;
  figure.traverse((o) => {
    if (o instanceof THREE.Bone) {
      bones[o.name] = pose(o);
      if (!(o.parent instanceof THREE.Bone)) root = o;
    }
  });
  bones.$root = {
    p: root.getWorldPosition(new THREE.Vector3()).toArray(),
    q: root.getWorldQuaternion(new THREE.Quaternion()).toArray(),
  };
  return bones;
}
export function endpointSeam(first: Record<string, Pose>, last: Record<string, Pose>) {
  let bone = '',
    rotation = 0;
  for (const [name, p] of Object.entries(first)) {
    if (!last[name] || name === '$root') continue;
    const value = angle(p.q, last[name].q);
    if (value > rotation) {
      rotation = value;
      bone = name;
    }
  }
  return {
    bone,
    rotation,
    root: new THREE.Vector3().fromArray(first.$root!.p).distanceTo(new THREE.Vector3().fromArray(last.$root!.p)),
  };
}
function surface(figure: THREE.Object3D, attachment: THREE.Object3D, region?: 'body' | 'head') {
  const body: THREE.Mesh[] = [],
    caps: THREE.Mesh[] = [];
  figure.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !visible(o)) return;
    let inCap = false,
      wear = false;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) {
      if (p === attachment) inCap = true;
      if (p.name.startsWith('wear_')) wear = true;
    }
    if (!inCap && !wear) body.push(o);
  });
  attachment.traverse((o) => {
    if (o instanceof THREE.Mesh && visible(o)) caps.push(o);
  });
  const points: { point: THREE.Vector3; name: string }[] = [];
  for (const mesh of caps) {
    const count = mesh.geometry.getAttribute('position').count;
    const stride = Math.max(1, Math.ceil(count / 96));
    for (let i = 0; i < count; i += stride)
      points.push({
        point: mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),
        name: `${mesh.name}:v${i}`,
      });
  }
  const triangles: { triangle: THREE.Triangle; box: THREE.Box3; name: string }[] = [];
  for (const mesh of body) {
    const count = mesh.geometry.getAttribute('position').count;
    const vertices = Array.from({ length: count }, (_, i) =>
      mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),
    );
    const index = mesh.geometry.index;
    const belongs = (i: number) => {
      if (!region) return true;
      if (!(mesh instanceof THREE.SkinnedMesh)) return false;
      const indices = mesh.geometry.getAttribute('skinIndex'),
        weights = mesh.geometry.getAttribute('skinWeight');
      if (!indices || !weights) return false;
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const name = mesh.skeleton.bones[indices.getComponent(i, k)]?.name ?? '';
        if ((region === 'head' ? /head|neck/i : /pelvis|spine/i).test(name)) sum += weights.getComponent(i, k);
      }
      return sum >= 0.5;
    };
    for (let i = 0; i < (index?.count ?? count); i += 3) {
      if (region && ![0, 1, 2].some((k) => belongs(index ? index.getX(i + k) : i + k))) continue;
      const a = vertices[index ? index.getX(i) : i]!,
        b = vertices[index ? index.getX(i + 1) : i + 1]!,
        c = vertices[index ? index.getX(i + 2) : i + 2]!;
      const box = new THREE.Box3().setFromPoints([a, b, c]);
      // Keep distant surfaces too: a safely separated attachment still needs a nearest-body measurement.
      // Per-point box distance below prunes triangles only after a measured upper bound exists.
      triangles.push({ triangle: new THREE.Triangle(a, b, c), box, name: `${mesh.name}:triangle${i / 3}` });
    }
  }
  let distance = Infinity,
    signed = Infinity,
    nearest = '',
    signedNearest = '';
  const closest = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    delta = new THREE.Vector3();
  for (const { point, name } of points) {
    let best = Infinity,
      side = 0,
      target = '';
    for (const item of triangles) {
      if (item.box.distanceToPoint(point) > best) continue;
      item.triangle.closestPointToPoint(point, closest);
      const d = closest.distanceTo(point);
      if (d < best) {
        best = d;
        side = Math.sign(item.triangle.getNormal(normal).dot(delta.subVectors(point, closest)));
        target = item.name;
      }
    }
    if (best < distance) {
      distance = best;
      nearest = `${name} -> ${target}`;
    }
    if (best * side < signed) {
      signed = best * side;
      signedNearest = `${name} -> ${target}`;
    }
  }
  return {
    distance: Number.isFinite(distance) ? distance : null,
    signed: Number.isFinite(signed) ? signed : null,
    nearest,
    signedNearest,
  };
}

function chopMeasurements(figure: THREE.Object3D, axe: THREE.Object3D, trunk: THREE.Object3D) {
  const start = axe.getObjectByName('axe-handle-start'),
    end = axe.getObjectByName('axe-handle-end'),
    blade = axe.getObjectByName('axe-blade-contact');
  let handle: THREE.Object3D | undefined;
  axe.traverse((o) => {
    if (o.name === 'axe-handle' && visible(o)) handle = o;
  });
  if (!start || !end || !blade || !handle) throw new Error('Shared axe is missing inspection landmarks');
  const a = start.getWorldPosition(new THREE.Vector3()),
    b = end.getWorldPosition(new THREE.Vector3()),
    line = new THREE.Line3(a, b),
    bladePosition = blade.getWorldPosition(new THREE.Vector3()),
    localBlade = trunk.worldToLocal(bladePosition.clone());
  const grip = (name: string) => {
    const hand = figure.getObjectByName(name);
    if (!hand) throw new Error('Buddy is missing ' + name);
    const point = hand.getWorldPosition(new THREE.Vector3());
    return line.closestPointToPoint(point, true, new THREE.Vector3()).distanceTo(point);
  };
  const bodySurface = surface(figure, handle, 'body'),
    headSurface = surface(figure, handle, 'head');
  return {
    leftGrip: grip('hand_l'),
    rightGrip: grip('hand_r'),
    bladeX: bladePosition.x,
    bladeY: bladePosition.y,
    bladeZ: bladePosition.z,
    contactDistance: Math.hypot(localBlade.x, localBlade.z) - CHOP_TRUNK.radius,
    handleBodyClearance: bodySurface.signed,
    handleHeadClearance: headSurface.signed,
    handleBodyDistance: bodySurface.distance,
    handleHeadDistance: headSurface.distance,
  };
}

export function createMotionCapture(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
  let report: MotionReport | undefined;
  let started = 0,
    lastWall = 0,
    lastTime = 0,
    cycle = 0;
  let attachmentBase: Pose | undefined, pivotBase: THREE.Vector3 | undefined, axisBase: THREE.Vector3 | undefined;
  let previousSpin: THREE.Quaternion | undefined;
  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = 480;
  imageCanvas.height = 380;
  const ctx = imageCanvas.getContext('2d')!;
  function image(row: MotionRow): MotionImage {
    ctx.fillStyle = '#18202a';
    ctx.fillRect(0, 0, 480, 380);
    const scale = Math.min(480 / canvas.width, 352 / canvas.height);
    const width = canvas.width * scale,
      height = canvas.height * scale;
    ctx.drawImage(canvas, (480 - width) / 2, (352 - height) / 2, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.fillText(`frame ${row.frame} | wall ${row.wall.toFixed(3)}s | clip ${row.time.toFixed(3)}s`, 8, 372);
    return { frame: row.frame, wall: row.wall, time: row.time, png: imageCanvas.toDataURL('image/png') };
  }
  return {
    get active() {
      return !!report && !report.complete;
    },
    get report() {
      return report;
    },
    start(
      declaration: Motion,
      duration: number,
      diagnosticRate: number | null,
      seam: ReturnType<typeof endpointSeam> | null,
      clip: string,
      mode: string,
    ) {
      if (!(duration > 0))
        throw new Error('No declared motion; use an explicit diagnostic spin only for a mechanical probe');
      started = performance.now();
      lastWall = 0;
      lastTime = 0;
      cycle = 0;
      attachmentBase = undefined;
      pivotBase = undefined;
      axisBase = undefined;
      previousSpin = undefined;
      report = {
        declaration,
        duration,
        diagnosticRate,
        endpointSeam: seam,
        clip,
        mode,
        boundaryNote: /^Jump_(Start|Land)$/.test(clip)
          ? 'Repeated one-shot review boundary: Jump_Start/Jump_Land are not authored loops. Endpoint differences are reported, not judged as loop defects.'
          : mode === 'played'
            ? 'Continuous production body/life clock; displayed cycle follows clip duration, not a reset of procedural state.'
            : 'Authored clip endpoint seam or procedural revolution; inspect frame-numbered wrap samples.',
        source: 'assetStage',
        rows: [],
        consecutive: [],
        cycle: [],
        outliers: [],
        camera: [...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov],
        complete: false,
        limits: [
          'Closest surface uses up to 96 vertices per attachment mesh against all nearby actual posed body triangles; signed nearest-face distance flags possible penetration, not a watertight intersection proof.',
          'Frame timestamps are completed stage renders, not GPU presentation. Canvas extraction and measurements perturb timing; sampleMs/imageMs disclose overhead.',
          'As played is the production body/life adapter, with grounded display, synthetic vertical input and selected presentation cargo; no physics travel or collision simulation.',
          'Encoded video may duplicate/drop rendered frames. Consecutive canvas frames are separately numbered. No automatic acceptance.',
          'Chop grip is wrist-bone distance to the handle centreline. Shaft distance uses posed torso/head triangles selected by at least 50% matching bone weight; hands are excluded as intentional grip contacts. handleBodyDistance/handleHeadDistance are unsigned closest distances. handleBodyClearance/handleHeadClearance retain signed nearest-face candidates; these open subsets can give a negative sign to a safely separated shaft below the chin or beside the torso. Inspect the frame and unsigned distance; this is not a watertight collision proof. Trunk distance is blade landmark to cylindrical surface, not a harvesting simulation.',
        ],
      };
    },
    sample(
      frame: number,
      time: number,
      figure: THREE.Object3D,
      spin: THREE.Object3D,
      chop?: { axe: THREE.Object3D; trunk: THREE.Object3D },
    ) {
      if (!report || report.complete) return;
      const begin = performance.now(),
        wall = (begin - started) / 1000,
        dt = wall - lastWall;
      const bones = bonePoses(figure);
      const previous = report.rows.at(-1);
      let boneJump = 0,
        bone = '';
      if (previous)
        for (const [name, p] of Object.entries(bones)) {
          const old = previous.bones[name];
          if (!old || name === '$root') continue;
          const jump = angle(old.q, p.q);
          if (jump > boneJump) {
            boneJump = jump;
            bone = name;
          }
        }
      const seam = !!previous && time < lastTime;
      if (seam) cycle++;
      const rootJump = previous
        ? new THREE.Vector3()
            .fromArray(bones.$root!.p)
            .distanceTo(new THREE.Vector3().fromArray(previous.bones.$root!.p))
        : 0;
      const attachment =
        report.declaration.kind === 'attachment' ? figure.getObjectByName(report.declaration.node) : undefined;
      const head =
        report.declaration.kind === 'attachment' ? figure.getObjectByName(report.declaration.bone) : undefined;
      let relative: Pose | undefined, clearance: ReturnType<typeof surface> | undefined;
      if (attachment && head && visible(attachment)) {
        const matrix = head.matrixWorld.clone().invert().multiply(attachment.matrixWorld);
        const p = new THREE.Vector3(),
          q = new THREE.Quaternion();
        matrix.decompose(p, q, new THREE.Vector3());
        relative = { p: p.toArray(), q: q.toArray() };
        attachmentBase ??= relative;
        clearance = surface(figure, attachment);
      }
      const pivot = spin.getWorldPosition(new THREE.Vector3()),
        rotation = spin.getWorldQuaternion(new THREE.Quaternion());
      const railWheels = report.declaration.kind === 'rail-wheels';
      const axis = new THREE.Vector3(railWheels ? 1 : 0, 0, railWheels ? 0 : 1).applyQuaternion(rotation);
      const deltaRotation = previousSpin ? previousSpin.clone().invert().multiply(rotation) : new THREE.Quaternion();
      const signedAngle =
        THREE.MathUtils.euclideanModulo(
          2 * Math.atan2(railWheels ? deltaRotation.x : deltaRotation.z, deltaRotation.w) + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      const absoluteTime = time + cycle * report.duration;
      const previousTime = previous ? previous.time + previous.cycle * report.duration : absoluteTime;
      const expectedRate =
        report.diagnosticRate ??
        (railWheels && dt > 0
          ? wheelAngle(machineReviewDistance(absoluteTime) - machineReviewDistance(previousTime)) / dt
          : report.declaration.kind === 'spin' && dt > 0
            ? (sailAngle(absoluteTime) - sailAngle(previousTime)) / dt
            : 0);
      const centre =
        report.declaration.kind === 'spin' || railWheels || report.diagnosticRate !== null
          ? centroid(spin).sub(pivot)
          : new THREE.Vector3();
      const centroidOrbit = centre.addScaledVector(axis, -centre.dot(axis)).length();
      pivotBase ??= pivot.clone();
      axisBase ??= axis.clone();
      const row: MotionRow = {
        frame,
        wall,
        time,
        dt,
        cycle,
        boneJump,
        bone,
        rootJump,
        seam,
        attachmentOffset: relative?.p ?? null,
        attachmentRotation: relative?.q ?? null,
        attachmentDrift:
          relative && attachmentBase
            ? new THREE.Vector3().fromArray(relative.p).distanceTo(new THREE.Vector3().fromArray(attachmentBase.p))
            : null,
        attachmentAngle: relative && attachmentBase ? angle(relative.q, attachmentBase.q) : null,
        clearance: clearance?.distance ?? null,
        signedClearance: clearance?.signed ?? null,
        nearest: clearance?.nearest ?? '',
        signedNearest: clearance?.signedNearest ?? '',
        angularRate: previousSpin && dt > 0 ? signedAngle / dt : 0,
        expectedRate,
        pivotDrift: pivot.distanceTo(pivotBase),
        centroidOrbit,
        axisDrift: axis.angleTo(axisBase),
        sampleMs: 0,
        imageMs: 0,
        bones,
        leftGrip: null,
        rightGrip: null,
        bladeX: null,
        bladeY: null,
        bladeZ: null,
        contactDistance: null,
        handleBodyClearance: null,
        handleHeadClearance: null,
        handleBodyDistance: null,
        handleHeadDistance: null,
        axeVisible: chop ? chop.axe.visible : null,
        ...(chop?.axe.visible ? chopMeasurements(figure, chop.axe, chop.trunk) : {}),
      };
      row.sampleMs = performance.now() - begin;
      const imageAt = performance.now();
      if (report.consecutive.length < 12) report.consecutive.push(image(row));
      if (cycle === 0 && (report.cycle.length === 0 || time >= (report.cycle.length * report.duration) / 11))
        report.cycle.push(image(row));
      if (seam && report.cycle.length < 12) report.cycle.push(image(row));
      row.imageMs = performance.now() - imageAt;
      report.rows.push(row);
      const warn = (metric: string, value: number | null, threshold: number, detail = '') => {
        if (value !== null && value > threshold) report!.outliers.push({ frame, metric, value, threshold, detail });
      };
      const boundary = seam
        ? /^Jump_(Start|Land)$/.test(report.clip)
          ? 'repeated one-shot boundary'
          : 'cycle boundary'
        : '';
      warn('bone rotation jump (rad)', boneJump, 0.35, `${bone}${boundary ? ' at ' + boundary : ''}`);
      warn('root position jump (m)', rootJump, 0.05, boundary);
      warn('attachment offset drift (m)', row.attachmentDrift, 0.001);
      warn('attachment rotation drift (rad)', row.attachmentAngle, 0.01);
      warn(
        'possible body penetration (m)',
        row.signedClearance === null ? null : -row.signedClearance,
        0.002,
        row.signedNearest,
      );
      if (report.declaration.kind === 'spin' || railWheels || report.diagnosticRate !== null) {
        warn('pivot drift (m)', row.pivotDrift, 0.001);
        warn('axis drift (rad)', row.axisDrift, 0.01);
        warn('geometry centroid off axle (m)', row.centroidOrbit, 0.001);
        if (previous) warn('rotation rate error (rad/s)', Math.abs(row.angularRate - row.expectedRate), 0.15);
      }
      warn('wall frame gap (s)', dt, 0.05);
      if (chop) {
        warn('left hand to handle centreline (m)', row.leftGrip, 0.08);
        warn('right hand to handle centreline (m)', row.rightGrip, 0.08);
        warn(
          'possible handle torso penetration (m)',
          row.handleBodyClearance === null ? null : -row.handleBodyClearance,
          0.002,
        );
        warn(
          'possible handle head penetration (m)',
          row.handleHeadClearance === null ? null : -row.handleHeadClearance,
          0.002,
        );
        if (Math.abs(time - CHOP_CONTACT) <= 1 / 60)
          warn(
            'blade contact surface error (m)',
            row.contactDistance === null ? null : Math.abs(row.contactDistance),
            0.04,
          );
      }
      lastWall = wall;
      lastTime = time;
      previousSpin = rotation;
      if (cycle >= 2 && report.consecutive.length === 12) report.complete = true;
    },
  };
}
