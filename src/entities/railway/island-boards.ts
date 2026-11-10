// The halts' map displays: each shows the island map (src/render/island-map.ts) on one face, oriented for whoever
// faces it so what lies beyond the display is up the map (owner, 9 November: "Island map"; 10 November: on "a little
// display at the station"). Every face is a cell of one shared canvas atlas that is drawn once and again only when the
// pier is laid; the trains are small instanced quads gliding over the faces and the arrival blink is a red ring quad
// per "you are here" stop, so a moving train never redraws a texture; the Works' gold marks are quads too. Four draws
// for every marker, ring and gold mark on every display, plus one per display. Reduced motion: the markers step once a second and the ring stays lit. Local.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import {
  drawMapBase,
  drawMarker,
  fitMap,
  mapPx,
  mapSizes,
  pathAt,
  MAP_RING,
  type MapLine,
  type MapView,
} from '../../render/island-map.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';

const CW = 320,
  CH = 256,
  COLS = 4,
  BLINK_HZ = 2.5;

type Face = { view: MapView; c: THREE.Vector3; right: THREE.Vector3; out: THREE.Vector3; yaw: number };
type Here = { line: number; stop: number };
type Board = { mesh: THREE.Mesh; face: Face; here: readonly Here[]; on: boolean };
/** "You are here" stops one display can ring (the Home island's is on both lines). */
const HERES = 2;
/** The Works' seams a display can mark. */
const SEAMS = 2;

/** Displays `w` × `h` m, up to `count` of them, over `lines` (whose `laid` the caller changes, then `redraw`s). */
export function createIslandBoards(owner: OwnedView, lines: MapLine[], count: number, w: number, h: number) {
  const rows = Math.ceil(count / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = CW * COLS;
  canvas.height = CH * rows;
  const g = canvas.getContext('2d')!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardNodeMaterial({ map, roughness: 0.6 });
  owner.cleanup(() => {
    map.dispose();
    material.dispose();
  });
  const boards: Board[] = [];
  // The map's sizes in metres on a face, for the quads.
  const S = mapSizes(CH),
    toM = h / CH;

  // Trains: one quad per train per face; the arrival ring: one per "you are here" stop.
  const markTex = (() => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 68;
    drawMarker(c.getContext('2d')!, 48, 34, 30, '#ffffff');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const markMat = new THREE.MeshStandardNodeMaterial({ map: markTex, alphaTest: 0.5, roughness: 0.6 });
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), markMat, count * lines.length);
  marks.frustumCulled = false;
  const ringMat = new THREE.MeshStandardNodeMaterial({ color: MAP_RING, roughness: 0.6 });
  const rings = new THREE.InstancedMesh(
    new THREE.RingGeometry(S.dot * 1.25 * toM, S.ring * toM, 24),
    ringMat,
    count * HERES,
  );
  rings.frustumCulled = false;
  owner.add(marks);
  owner.add(rings);
  owner.cleanup(() => {
    markTex.dispose();
    markMat.dispose();
    ringMat.dispose();
    marks.geometry.dispose();
    rings.geometry.dispose();
  });
  // The Works' gold marks (docs/plans/works-signposting-2.md): a zigzag at each seam still to strike and a dashed
  // square at the cold kiln, in the breaker's gold, still under reduced motion and never blinking. One quad each.
  const goldTex = (draw: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.strokeStyle = '#ffffff';
    g.lineCap = g.lineJoin = 'round';
    draw(g);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const zigTex = goldTex((g) => {
    g.lineWidth = 11;
    g.beginPath();
    [
      [10, 8],
      [44, 20],
      [20, 34],
      [54, 56],
    ].forEach(([x, y], i) => (i ? g.lineTo(x!, y!) : g.moveTo(x!, y!)));
    g.stroke();
  });
  const squareTex = goldTex((g) => {
    g.lineWidth = 9;
    g.setLineDash([11, 7]);
    g.lineDashOffset = 5;
    g.strokeRect(8, 8, 48, 48);
  });
  const goldMats = [zigTex, squareTex].map(
    (map) => new THREE.MeshStandardNodeMaterial({ map, color: GOLD_ROPE, alphaTest: 0.5, roughness: 0.6 }),
  );
  const goldPx = S.dot * 3.2,
    goldSize = goldPx * toM;
  const zigs = new THREE.InstancedMesh(new THREE.PlaneGeometry(goldSize, goldSize), goldMats[0]!, count * SEAMS);
  const squares = new THREE.InstancedMesh(new THREE.PlaneGeometry(goldSize, goldSize), goldMats[1]!, count);
  for (const m of [zigs, squares]) {
    m.frustumCulled = false;
    owner.add(m);
  }
  owner.cleanup(() => {
    zigTex.dispose();
    squareTex.dispose();
    for (const m of goldMats) m.dispose();
    zigs.geometry.dispose();
    squares.geometry.dispose();
  });
  /** World x/z of each seam still to strike (null: struck, or the breaker not out), and the cold kiln's (null: none). */
  const works: { seams: ({ x: number; z: number } | null)[]; kiln: { x: number; z: number } | null } = {
    seams: [],
    kiln: null,
  };
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let k = 0; k < marks.count; k++) marks.setMatrixAt(k, hide);
  for (let k = 0; k < rings.count; k++) rings.setMatrixAt(k, hide);
  for (let k = 0; k < zigs.count; k++) zigs.setMatrixAt(k, hide);
  for (let k = 0; k < squares.count; k++) squares.setMatrixAt(k, hide);
  const color = new THREE.Color();
  lines.forEach((l, li) => {
    color.set(l.color);
    for (let b = 0; b < count; b++) marks.setColorAt(b * lines.length + li, color);
  });

  const cellOf = (b: number) => ({ x: (b % COLS) * CW, y: Math.floor(b / COLS) * CH });
  function drawAll() {
    boards.forEach((bd, b) => drawMapBase(g, cellOf(b), CW, CH, lines, bd.face.view, bd.here));
    map.needsUpdate = true;
  }

  let clock = 0,
    stepped = -1e9;
  const along: (number | null)[] = lines.map(() => null);
  /** The stop each line's train is on its way to (null: standing, or none). */
  const heading: (number | null)[] = lines.map(() => null);
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    UP = new THREE.Vector3(0, 1, 0);
  /** World point on face `face` at map pixel (`px`, `py`) of its cell, lifted `lift` m off the face. */
  const onFace = (face: Face, px: number, py: number, lift: number) =>
    p
      .copy(face.c)
      .addScaledVector(face.right, (px / CW - 0.5) * w)
      .addScaledVector(UP, (0.5 - py / CH) * h)
      .addScaledVector(face.out, lift);

  return {
    /** A display face centred at `c`, its normal (sin `yaw`, cos `yaw`) toward its reader, the face `off` m out
     * along it, ringing the stops in `here` (at most two). */
    add(c: THREE.Vector3, yaw: number, off: number, here: readonly Here[]) {
      const b = boards.length;
      const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      // The reader looks against the normal; their right is (-fz, fx) of where they look.
      const fwd = { x: -n.x, z: -n.z };
      const face: Face = {
        view: fitMap(lines, fwd, CW, CH, CH * 0.11),
        c: c.clone().addScaledVector(n, off),
        right: new THREE.Vector3(-fwd.z, 0, fwd.x),
        out: n,
        yaw,
      };
      const geometry = new THREE.PlaneGeometry(w, h).translate(0, 0, off);
      const { x, y } = cellOf(b);
      const uv = geometry.attributes.uv as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++)
        uv.setXY(k, (x + uv.getX(k) * CW) / canvas.width, 1 - (y + (1 - uv.getY(k)) * CH) / canvas.height);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(c);
      mesh.rotation.y = yaw;
      mesh.receiveShadow = true;
      mesh.visible = false;
      owner.add(mesh);
      owner.cleanup(() => geometry.dispose());
      boards.push({ mesh, face, here: here.slice(0, HERES), on: false });
      return b;
    },
    /** Draw every face (after the last `add`, and whenever a line's `laid` changes). */
    redraw: drawAll,
    /** Display `b` shown or not. */
    set(b: number, on: boolean) {
      const bd = boards[b]!;
      bd.on = on;
      bd.mesh.visible = on;
    },
    /** Each line's train, metres along its path (null: none), and the stop it is on its way to (null: standing),
     * whose ring blinks on every display that stop is "here" on. */
    trains(at: readonly (number | null)[], to: readonly (number | null)[]) {
      to.forEach((s, k) => (heading[k] = s));
      // Reduced motion: the markers step once a second instead of gliding.
      if (reducedMotion && clock - stepped < 1 && along.every((a) => a !== null)) return;
      stepped = clock;
      at.forEach((a, k) => (along[k] = a));
    },
    /** The Works' gold marks: world x/z of each seam still to strike (null for none), and of the cold kiln. */
    works(seams: readonly ({ x: number; z: number } | null)[], kiln: { x: number; z: number } | null) {
      works.seams = seams.slice(0, SEAMS);
      works.kiln = kiln;
    },
    /** How many gold marks each shown display carries now (seams, kiln). */
    goldMarks: () => ({ seams: works.seams.filter(Boolean).length, kiln: !!works.kiln }),
    /** Each display's face centre and its normal toward its reader, for evals to frame. */
    faces: () =>
      boards.map((bd) => ({
        on: bd.on,
        c: [bd.face.c.x, bd.face.c.y, bd.face.c.z],
        out: [bd.face.out.x, bd.face.out.z],
      })),
    update(dt: number) {
      clock += dt;
      const lit = reducedMotion || Math.floor(clock * BLINK_HZ) % 2 === 0;
      boards.forEach((bd, b) => {
        const face = bd.face;
        q.setFromAxisAngle(UP, face.yaw);
        lines.forEach((l, li) => {
          const k = b * lines.length + li,
            a = along[li];
          if (!bd.on || a === null || a === undefined) return marks.setMatrixAt(k, hide);
          const at = pathAt(l, a);
          const [px, py] = mapPx(face.view, at.x, at.z);
          onFace(face, px, py, 0.012);
          marks.setMatrixAt(k, m4.compose(p, q, sc.set(S.markW * toM, S.markH * toM, 1)));
        });
        for (let i = 0; i < HERES; i++) {
          const k = b * HERES + i,
            hr = bd.here[i];
          if (!hr || !bd.on || !lit || heading[hr.line] !== hr.stop) {
            rings.setMatrixAt(k, hide);
            continue;
          }
          const st = lines[hr.line]!.stops[hr.stop]!;
          const [px, py] = mapPx(face.view, st.x, st.z);
          onFace(face, px, py, 0.006);
          rings.setMatrixAt(k, m4.compose(p, q, sc.set(1, 1, 1)));
        }
        const gold = (mesh: THREE.InstancedMesh, k: number, at: { x: number; z: number } | null | undefined) => {
          if (!bd.on || !at) return mesh.setMatrixAt(k, hide);
          // Kept whole on the face: the kiln sits just past the map's edge on some faces.
          const [px, py] = mapPx(face.view, at.x, at.z),
            half = goldPx / 2 + 2;
          // Over the train markers: a seam beside a stop must not hide under a standing train.
          onFace(face, Math.min(CW - half, Math.max(half, px)), Math.min(CH - half, Math.max(half, py)), 0.016);
          mesh.setMatrixAt(k, m4.compose(p, q, sc.set(1, 1, 1)));
        };
        for (let i = 0; i < SEAMS; i++) gold(zigs, b * SEAMS + i, works.seams[i]);
        gold(squares, b, works.kiln);
      });
      marks.instanceMatrix.needsUpdate = true;
      rings.instanceMatrix.needsUpdate = true;
      zigs.instanceMatrix.needsUpdate = true;
      squares.instanceMatrix.needsUpdate = true;
    },
    /** Texture memory of the atlas in bytes (RGBA with mipmaps). */
    bytes: () => Math.round(canvas.width * canvas.height * 4 * (4 / 3)),
  };
}
