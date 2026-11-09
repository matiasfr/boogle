// A split-flap face for the railway's real signs, ported from the 1 November departures board prototype
// (`?proto=board`, archived in 26270adb: src/proto/board/index.ts, "split flaps"). Changed letters riffle three flaps
// 70 ms apart and a ticking digit turns one, so the countdown shows its work; reduced motion swaps them plainly. The
// face is painted canvas on a lit material, read from both sides, so it sits in the scene like any other board
// (owner, 9 November: "a real sign rather than a big floating text countdown"). Local presentation only.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { reducedMotion } from '../../constants.ts';

const FLAPS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:<>-.';
const FLIP_S = 0.07;
type Cell = { shown: string; target: string; next: number; left: number }; // left: flaps to go

/** One row of `cols` flaps on a `w` × `h` m face, its centre at the mesh's origin, readable from both sides, each side
 * `off` metres out from the origin (half the backing board's depth plus a hair). */
export function createFlapFace(cols: number, w: number, h: number, off = 0.005, ink = '#ffd23f') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * h) / w);
  const g = canvas.getContext('2d')!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardNodeMaterial({ map, roughness: 0.6 });
  const front = new THREE.PlaneGeometry(w, h).translate(0, 0, off),
    back = new THREE.PlaneGeometry(w, h).translate(0, 0, off).rotateY(Math.PI);
  const geometry = mergeGeometries([front, back])!;
  front.dispose();
  back.dispose();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  const cells: Cell[] = Array.from({ length: cols }, () => ({ shown: ' ', target: ' ', next: 0, left: 0 }));
  let clock = 0,
    dirty = true;
  function draw() {
    const W = canvas.width,
      H = canvas.height,
      pad = 14,
      gap = 8;
    const cw = (W - pad * 2 - gap * (cols - 1)) / cols,
      ch = H - pad * 2;
    g.fillStyle = '#16181d';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 ${Math.round(ch * 0.78)}px ui-monospace, Menlo, Consolas, monospace`;
    cells.forEach((cell, col) => {
      const x = pad + col * (cw + gap);
      g.fillStyle = '#25282f';
      g.fillRect(x, pad, cw, ch);
      const moving = cell.shown !== cell.target;
      g.fillStyle = moving ? '#fff3c0' : ink;
      if (cell.shown !== ' ') {
        g.save();
        g.translate(x + cw / 2, pad + ch / 2 + ch * 0.05);
        if (moving) g.scale(1, 0.55);
        g.fillText(cell.shown, 0, 0);
        g.restore();
      }
      g.fillStyle = '#0b0c0f';
      g.fillRect(x, pad + ch / 2 - 2, cw, 4); // the split
    });
    map.needsUpdate = true;
  }
  return {
    mesh,
    /** Right-aligned text; letters outside the flaps' set show blank. */
    set(text: string) {
      const t = text.toUpperCase().padStart(cols).slice(-cols);
      cells.forEach((cell, col) => {
        const c = FLAPS.includes(t[col]!) ? t[col]! : ' ';
        if (cell.target === c) return;
        cell.target = c;
        cell.next = clock;
        cell.left = /\d/.test(c) && /\d/.test(cell.shown) ? 1 : 3; // a digit ticks over; a word riffles
        if (reducedMotion) cell.shown = c;
        dirty = true;
      });
    },
    /** What the face reads now (flaps still turning show their current letter). */
    get shown() {
      return cells.map((c) => c.shown).join('');
    },
    update(dt: number) {
      clock += dt;
      for (const cell of cells) {
        if (cell.shown === cell.target || clock < cell.next) continue;
        cell.left--;
        cell.shown = cell.left > 0 ? FLAPS[(FLAPS.indexOf(cell.shown) + 7) % FLAPS.length]! : cell.target;
        cell.next = clock + FLIP_S;
        dirty = true;
      }
      if (dirty && mesh.visible) {
        dirty = false;
        draw();
      }
    },
    dispose() {
      geometry.dispose();
      map.dispose();
      material.dispose();
    },
  };
}
export type FlapFace = ReturnType<typeof createFlapFace>;
