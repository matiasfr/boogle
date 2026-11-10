// A painted sign standing in the world (owner, 9 November: "diagetic signage instead of large hovering text"): a board
// in a timber frame on its own post or posts, fixed, never turning to the camera. The face and its wood are one canvas
// and one material, so a sign is one mesh and one draw: the caller paints the face rows, and the frame and posts
// sample a strip of plain wood under them (the stake boards' trick in src/proto/place/rooms.ts). Both faces carry the
// paint and read the right way round from either side. It casts no shadow of its own, like the stake boards. Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { OwnedView } from './owned-view.ts';

const WOOD_ROWS = 16;
const BORDER = 0.06,
  DEPTH = 0.08,
  POST = 0.12;

export type SignBoard = ReturnType<typeof signBoard>;

/** A `w` by `h` m face whose canvas is `px` wide, its bottom `foot` m up. `posts`: one under its middle, two either
 * side, or none (a plaque, hung on something else). The mesh's origin is on the ground under the face's middle, and
 * the face's normal is its local +z (and -z). Paint into `g` within `cw` × `ch`, then call `painted()`. */
export function signBoard(
  owner: OwnedView | undefined,
  o: { w: number; h: number; px: number; foot: number; posts: 'one' | 'two' | 'none'; wood?: string },
) {
  const cw = o.px,
    ch = Math.round((o.px * o.h) / o.w);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch + WOOD_ROWS;
  const g = canvas.getContext('2d')!;
  g.fillStyle = o.wood ?? '#7f5630';
  g.fillRect(0, ch, cw, WOOD_ROWS);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardNodeMaterial({ map, roughness: 1, metalness: 0 });

  const v0 = WOOD_ROWS / canvas.height; // the face's rows start here (v up from the bottom)
  const mid = o.foot + o.h / 2;
  const face = (back: boolean) => {
    const p = new THREE.PlaneGeometry(o.w, o.h);
    const uv = p.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (1 - v0));
    if (back) p.rotateY(Math.PI);
    return p.translate(0, mid, back ? -DEPTH / 2 - 0.004 : DEPTH / 2 + 0.004);
  };
  const wood = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, v0 / 2);
    return geo;
  };
  const parts = [
    face(false),
    face(true),
    wood(new THREE.BoxGeometry(o.w + 2 * BORDER, o.h + 2 * BORDER, DEPTH).translate(0, mid, 0)),
  ];
  const top = o.foot + o.h + BORDER;
  if (o.posts === 'one') parts.push(wood(new THREE.BoxGeometry(POST, o.foot, POST).translate(0, o.foot / 2, 0)));
  if (o.posts === 'two')
    for (const s of [-1, 1])
      parts.push(wood(new THREE.BoxGeometry(POST, top, POST).translate(s * (o.w / 2 + BORDER + POST / 2), top / 2, 0)));
  const geometry = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  const dispose = () => {
    geometry.dispose();
    map.dispose();
    material.dispose();
  };
  if (owner) {
    owner.add(mesh);
    owner.cleanup(dispose);
  }
  return {
    mesh,
    /** Only without an owner (which adds and disposes it); the caller adds it to the scene. */
    dispose,
    g,
    cw,
    ch,
    /** Upload what was painted. */
    painted: () => void (map.needsUpdate = true),
  };
}

/** Two centred lines on a plain board: `big` in `color`, `small` under it in `ink` (just `big`, larger, without it). */
export function paintTwoLines(
  s: Pick<SignBoard, 'g' | 'cw' | 'ch'>,
  big: string,
  small: string,
  look: { ground: string; ink: string; color?: string; rim?: string },
) {
  const { g, cw, ch } = s;
  g.clearRect(0, 0, cw, ch);
  g.fillStyle = look.ground;
  g.fillRect(0, 0, cw, ch);
  if (look.rim) {
    g.strokeStyle = look.rim;
    g.lineWidth = ch * 0.04;
    g.strokeRect(ch * 0.04, ch * 0.04, cw - ch * 0.08, ch - ch * 0.08);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const line = (t: string, y: number, px: number, fill: string) => {
    g.font = `900 ${px}px Figtree, system-ui, sans-serif`;
    g.fillStyle = fill;
    g.fillText(t, cw / 2, y, cw * 0.92);
  };
  if (small) {
    line(big, ch * 0.38, ch * 0.4, look.color ?? look.ink);
    line(small, ch * 0.77, ch * 0.2, look.ink);
  } else line(big, ch / 2, ch * 0.5, look.color ?? look.ink);
}
