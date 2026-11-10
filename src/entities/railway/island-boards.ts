// The halts' boards: each shows the island map (src/render/island-map.ts) on both faces, oriented for whoever faces it
// so its geography stays true (owner, 9 November: "Island map"). Every face is a cell of one shared canvas atlas that
// is drawn once and again only when the pier is laid; the trains are small instanced quads gliding over the faces and
// the arrival blink is a red ring quad, so a moving train never redraws a texture. Two draws for every marker and ring
// on every board, plus one per board. Reduced motion: the markers step once a second and the ring stays lit. Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

const CW = 320,
  CH = 256,
  COLS = 4,
  BLINK_HZ = 2.5;

type Face = { view: MapView; c: THREE.Vector3; right: THREE.Vector3; out: THREE.Vector3; yaw: number };
type Board = { mesh: THREE.Mesh; faces: [Face, Face]; here: { line: number; stop: number }; on: boolean; cue: boolean };

/** Boards `w` × `h` m for up to `count` halts, over `lines` (whose `laid` the caller updates through `setLaid`). */
export function createIslandBoards(owner: OwnedView, lines: MapLine[], count: number, w: number, h: number) {
  const rows = Math.ceil((count * 2) / COLS);
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

  // Trains: one quad per train per face; the arrival ring: one per face.
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
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), markMat, count * 2 * lines.length);
  marks.frustumCulled = false;
  const ringMat = new THREE.MeshStandardNodeMaterial({ color: MAP_RING, roughness: 0.6 });
  const rings = new THREE.InstancedMesh(
    new THREE.RingGeometry(S.dot * 1.25 * toM, S.ring * toM, 24),
    ringMat,
    count * 2,
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
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let k = 0; k < marks.count; k++) marks.setMatrixAt(k, hide);
  for (let k = 0; k < rings.count; k++) rings.setMatrixAt(k, hide);
  const color = new THREE.Color();
  lines.forEach((l, li) => {
    color.set(l.color);
    for (let b = 0; b < count; b++)
      for (let f = 0; f < 2; f++) marks.setColorAt((b * 2 + f) * lines.length + li, color);
  });

  const cellOf = (b: number, f: number) => {
    const k = b * 2 + f;
    return { x: (k % COLS) * CW, y: Math.floor(k / COLS) * CH };
  };
  function drawAll() {
    boards.forEach((bd, b) =>
      bd.faces.forEach((face, f) => {
        drawMapBase(g, cellOf(b, f), CW, CH, lines, face.view, bd.here);
      }),
    );
    map.needsUpdate = true;
  }

  let clock = 0,
    stepped = -1e9;
  const along: (number | null)[] = lines.map(() => null);
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
    /** A board centred at `c`, facing along `yaw` (its faces' normals ±(sin, cos)), each face `off` m out. */
    add(c: THREE.Vector3, yaw: number, off: number, here: { line: number; stop: number }) {
      const b = boards.length;
      const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const make = (sideSign: 1 | -1): Face => {
        // A viewer on this side looks against its normal; their right is (-fz, fx) of where they look.
        const fwd = { x: -n.x * sideSign, z: -n.z * sideSign };
        return {
          view: fitMap(lines, fwd, CW, CH, CH * 0.11),
          c: c.clone().addScaledVector(n, off * sideSign),
          right: new THREE.Vector3(-fwd.z, 0, fwd.x),
          out: n.clone().multiplyScalar(sideSign),
          yaw: sideSign > 0 ? yaw : yaw + Math.PI,
        };
      };
      const faces: [Face, Face] = [make(1), make(-1)];
      const quads = faces.map((_, f) => {
        const geo = new THREE.PlaneGeometry(w, h).translate(0, 0, off);
        if (f === 1) geo.rotateY(Math.PI);
        const { x, y } = cellOf(b, f);
        const uv = geo.attributes.uv as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++)
          uv.setXY(k, (x + uv.getX(k) * CW) / canvas.width, 1 - (y + (1 - uv.getY(k)) * CH) / canvas.height);
        return geo;
      });
      const geometry = mergeGeometries(quads)!;
      quads.forEach((q) => q.dispose());
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(c);
      mesh.rotation.y = yaw;
      mesh.receiveShadow = true;
      mesh.visible = false;
      owner.add(mesh);
      owner.cleanup(() => geometry.dispose());
      boards.push({ mesh, faces, here, on: false, cue: false });
      return b;
    },
    /** Draw every face (after the last `add`, and whenever a line's `laid` changes). */
    redraw: drawAll,
    /** Board `b` shown or not, and whether its ring blinks (the train's next stop is here). */
    set(b: number, on: boolean, cue: boolean) {
      const bd = boards[b]!;
      bd.on = on;
      bd.cue = cue;
      bd.mesh.visible = on;
    },
    /** Each line's train, metres along its path (null: none). */
    trains(at: readonly (number | null)[]) {
      // Reduced motion: the markers step once a second instead of gliding.
      if (reducedMotion && clock - stepped < 1 && along.every((a) => a !== null)) return;
      stepped = clock;
      at.forEach((a, k) => (along[k] = a));
    },
    update(dt: number) {
      clock += dt;
      const lit = reducedMotion || Math.floor(clock * BLINK_HZ) % 2 === 0;
      const r = S.dot * 1.15 * toM;
      boards.forEach((bd, b) =>
        bd.faces.forEach((face, f) => {
          q.setFromAxisAngle(UP, face.yaw);
          lines.forEach((l, li) => {
            const k = (b * 2 + f) * lines.length + li,
              a = along[li];
            if (!bd.on || a === null || a === undefined) return marks.setMatrixAt(k, hide);
            const at = pathAt(l, a);
            const [px, py] = mapPx(face.view, at.x, at.z);
            onFace(face, px, py, 0.012);
            marks.setMatrixAt(k, m4.compose(p, q, sc.set(r * 3.2, r * 2.27, 1)));
          });
          const st = lines[bd.here.line]!.stops[bd.here.stop]!;
          if (!bd.on || !bd.cue || !lit) return rings.setMatrixAt(b * 2 + f, hide);
          const [px, py] = mapPx(face.view, st.x, st.z);
          onFace(face, px, py, 0.006);
          rings.setMatrixAt(b * 2 + f, m4.compose(p, q, sc.set(1, 1, 1)));
        }),
      );
      marks.instanceMatrix.needsUpdate = true;
      rings.instanceMatrix.needsUpdate = true;
    },
    /** Texture memory of the atlas in bytes (RGBA with mipmaps). */
    bytes: () => Math.round(canvas.width * canvas.height * 4 * (4 / 3)),
  };
}
