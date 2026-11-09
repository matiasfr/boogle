// One merged material, no shadow pass: silhouettes from the same map as the walkable planning greybox.
import * as THREE from 'three/webgpu';
import html from '../../../docs/world/map-prototypes.html?raw';
import { layout, parseMapPage, type XZ } from '../../sickle/map-data.ts';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';

// The map's Place-local origin. Ring Island and the Original Island already render in the live world.
const ORIGIN_X = 1000;
const CLIFF = '#9c988f',
  WALK = '#a9b48c',
  DARK = '#2c3038',
  CROWN = '#5d6a66';

export function createBackdrop() {
  const map = layout(parseMapPage(html), 'sickle', 'A');
  const parts: THREE.BufferGeometry[] = [];
  const matrix = new THREE.Matrix4();
  const add = (geo: THREE.BufferGeometry, tint: string) => {
    addPart(parts, geo, matrix.identity(), tint);
    geo.dispose();
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, tint = DARK, yaw = 0) =>
    add(new THREE.BoxGeometry(w, h, d).rotateY(yaw).translate(x + ORIGIN_X, y, z), tint);
  const crown = (x: number, y: number, z: number, rx: number, ry: number, rz: number, tint = CROWN) =>
    add(new THREE.IcosahedronGeometry(1, 0).scale(rx, ry, rz).translate(x + ORIGIN_X, y, z), tint);

  // Flat tops and battered cliffs; the shared layout preserves the Gorge's clipped gap. No shelves or seabed grid.
  for (const land of map.land) {
    if (land.existing || land.id === 'home-land' || land.id === 'ring-land') continue;
    const top = land.horizon ? 10 : (land.top ?? 10);
    const outline = land.outline;
    const vertices: number[] = [];
    const tint = land.tint ?? (land.module === 'chalk' ? '#c9c5bb' : CLIFF);
    const triangle = (a: XZ, ay: number, b: XZ, by: number, c: XZ, cy: number) =>
      vertices.push(a[0] + ORIGIN_X, ay, a[1], b[0] + ORIGIN_X, by, b[1], c[0] + ORIGIN_X, cy, c[1]);
    const geometry = () => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.computeVertexNormals();
      return geo;
    };
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
      outline.map(([x, z]) => new THREE.Vector2(x, z)),
      [],
    ))
      triangle(outline[a!]!, top, outline[b!]!, top, outline[c!]!, top);
    add(geometry(), land.horizon ? '#7d8a84' : WALK);
    vertices.length = 0;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!,
        b = outline[(i + 1) % outline.length]!;
      triangle(a, top, a, -10, b, top);
      triangle(b, top, a, -10, b, -10);
    }
    add(geometry(), tint);
    if (land.horizon) {
      // A coarse inland ridge, behind the low coast and city's skyline.
      const coast = outline.slice(0, 9);
      for (const [x, z] of coast)
        crown(x - 450, (land.top ?? 220) * 0.35, z, 600, (land.top ?? 220) * 0.65, 650, '#7d8a84');
    }
  }

  // Broad crown masses, rather than the walkable forest's hundreds of individual trees and trunks.
  for (const t of map.terrain) {
    if (t.kind !== 'forest' || !t.c || !t.r) continue;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const x = t.c[0] + Math.cos(angle) * t.r[0] * 0.65;
      const z = t.c[1] + Math.sin(angle) * t.r[1] * 0.65;
      const y = (t.h ?? 72) - 25 + Math.sin(i * 2.4) * 9;
      box(x, 28, z, 12, 32, 12);
      crown(x, y, z, t.r[0] * 0.22, 28, t.r[1] * 0.22);
    }
    for (const [x, z] of t.mothers ?? []) {
      const h = t.motherH ?? 150;
      box(x, (h - 30) / 2, z, 10, h - 30, 10);
      crown(x, h - 36, z, 45, 36, 45);
    }
  }
  for (const lm of map.landmarks) {
    if (!lm.at) continue;
    const [x, z] = lm.at,
      base = lm.base ?? 0,
      h = lm.h ?? 20;
    if (lm.kind === 'crane') {
      const quay = map.places.find((p) => p.id === 'quay')?.at ?? [x + 1, z];
      const angle = Math.atan2(quay[1] - z, quay[0] - x),
        jib = lm.jib ?? h * 0.9;
      const w = Math.max(2, h / 18);
      box(x, base + h / 2, z, w, h, w);
      box(x + Math.cos(angle) * jib * 0.35, base + h, z + Math.sin(angle) * jib * 0.35, jib, w, w, DARK, -angle);
      box(x + Math.cos(angle) * jib * 0.8, base + h * 0.78, z + Math.sin(angle) * jib * 0.8, 0.8, h * 0.45, 0.8);
    } else if (lm.kind === 'arch') {
      const angle = ((lm.bearing ?? 0) * Math.PI) / 180,
        span = lm.span ?? 30;
      for (const sign of [-1, 1])
        box(
          x + Math.cos(angle) * (span / 2 + 11) * sign,
          base + h / 2,
          z + Math.sin(angle) * (span / 2 + 11) * sign,
          22,
          h,
          26,
          '#bdb5a2',
          -angle,
        );
      box(x, base + h + 7, z, span + 44, 14, 26, '#bdb5a2', -angle);
      if (lm.lantern) box(x, base + h + 18, z, 5, 8, 5);
    } else if (lm.kind === 'pinnacle') box(x, base + h / 2, z, 22, h, 18, '#7a766d');
  }
  const harbour = map.option.harbour;
  if (harbour) {
    for (const path of [harbour.breakwater, harbour.quay])
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1]!,
          b = path[i]!;
        box(
          (a[0] + b[0]) / 2,
          1.5,
          (a[1] + b[1]) / 2,
          Math.hypot(b[0] - a[0], b[1] - a[1]),
          5,
          10,
          CLIFF,
          -Math.atan2(b[1] - a[1], b[0] - a[0]),
        );
      }
    for (const [x, z, w, d, h] of harbour.warehouses) box(x, 3 + h / 2, z, w, h, d);
  }
  const city = map.option.backdrop;
  if (city) {
    for (const [x, z, h] of city.towers) box(x, 10 + h / 2, z, 22, h, 18, '#474b54');
    const [x, z, h] = city.lighthouse;
    box(x, 10 + h / 2, z, 8, h, 8, '#eeeae2');
  }
  const geometry = mergeParts(parts);
  for (const part of parts) part.dispose();
  // Double-sided flat faces tolerate either winding of the page's authored outlines; no material groups/draw splits.
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardNodeMaterial({
      vertexColors: true,
      roughness: 0.95,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  mesh.name = 'Sickle Isles horizon';
  return mesh;
}
