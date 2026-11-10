// A halt board's face: its line as a minimal strip (src/render/line-strip.ts) on painted canvas under a lit material,
// read from both sides, so it sits in the scene like any other board (owner, 9 November: a real sign, not floating
// text; the moving train, not a timer). It redraws only when something on it moves a pixel. The train marker glides;
// under reduced motion it steps once a second. While the train's next stop is this one the ring blinks (steady under
// reduced motion). Local presentation only.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { reducedMotion } from '../../constants.ts';
import { drawLineStrip, stripX, type LineStrip } from '../../render/line-strip.ts';

const BLINK_S = 0.4;

/** A `w` × `h` m face, its centre at the mesh's origin, each side `off` metres out from it. */
export function createStripFace(w: number, h: number, off = 0.005) {
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
  const W = canvas.width,
    H = canvas.height,
    pad = 14;
  let strip: LineStrip | null = null,
    clock = 0,
    stepped = -1e9,
    shownTrain: number | null = null,
    drawn = '';
  function draw(s: LineStrip) {
    g.fillStyle = '#16181d';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#25282f';
    g.fillRect(pad, pad, W - pad * 2, H - pad * 2);
    drawLineStrip(g, pad, pad, W - pad * 2, H - pad * 2, s);
    map.needsUpdate = true;
  }
  return {
    mesh,
    /** What the board shows; drawn on the next update if it moved a pixel. */
    set(s: LineStrip) {
      strip = s;
    },
    /** The train's position as last drawn (null: none), for looks. */
    get shown() {
      return shownTrain;
    },
    update(dt: number) {
      clock += dt;
      if (!strip || !mesh.visible) return;
      // Reduced motion: the marker steps once a second instead of gliding.
      if (!reducedMotion || strip.train === null || shownTrain === null || clock - stepped >= 1) {
        shownTrain = strip.train;
        stepped = clock;
      }
      const cue = !!strip.cue && (reducedMotion || Math.floor(clock / BLINK_S) % 2 === 0);
      const at = shownTrain === null ? 'none' : Math.round(stripX(strip, pad, W - pad * 2, H - pad * 2, shownTrain));
      const key = `${at}|${strip.laid}|${strip.here}|${strip.color}|${cue}`;
      if (key === drawn) return;
      drawn = key;
      draw({ ...strip, train: shownTrain, cue });
    },
    dispose() {
      geometry.dispose();
      map.dispose();
      material.dispose();
    },
  };
}
export type StripFace = ReturnType<typeof createStripFace>;
