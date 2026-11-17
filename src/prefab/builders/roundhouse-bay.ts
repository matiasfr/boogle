// The rotunda kit: coloured, merged geometry shared by owner-local prefab batches.
// +z points out from the table; neighbouring wedge edges meet without interior walls.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material } from '../../render/materials.ts';
import { ROTUNDA_BLOCK, ROTUNDA_KIT } from '../../place/rotunda.ts';
import { ENGINE, ENGINE_CAB, ENGINE_BOILER, ENGINE_WHEELS } from '../../entities/railway/engine.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'roundhouse.bay': true;
  }
}

const half = (ROTUNDA_KIT.bayDeg * Math.PI) / 360,
  front = ROTUNDA_KIT.doorR * Math.cos(half),
  back = (ROTUNDA_KIT.doorR + ROTUNDA_KIT.depth) * Math.cos(half),
  edge = (z: number) => z * Math.tan(half),
  roofY = (z: number) =>
    ROTUNDA_BLOCK.wall + ((ROTUNDA_BLOCK.back - ROTUNDA_BLOCK.wall) * (z - front)) / (back - front);
const STONE = ['#c5a16c', '#d1ae79', '#b99665', '#d7b983'] as const,
  TRIM = '#e0c694',
  ROOF = '#566575',
  STEEL = '#425660',
  GLASS = '#4d8198',
  WOOD = '#975334';
type Hex = `#${string}`;

registerBuilder('roundhouse.bay', (params, batch) => {
  if (batch) return batch.mesh;
  const pieces: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, colour: Hex) => {
    const c = new THREE.Color(colour),
      colours: number[] = [];
    for (let i = 0; i < g.getAttribute('position').count; i++) colours.push(c.r, c.g, c.b);
    g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    pieces.push(g);
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: Hex) =>
    add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), colour);
  // A wedge prism. The top/bottom functions preserve the slope across the actual chord, including its corners.
  const wedge = (
    z0: number,
    z1: number,
    bottom: (z: number) => number,
    top: (z: number) => number,
    colour: Hex,
    inset = 0,
  ) => {
    const g = new THREE.BoxGeometry(1, 1, 1),
      p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i) < 0 ? z0 : z1;
      p.setXYZ(i, Math.sign(p.getX(i)) * (edge(z) - inset), p.getY(i) < 0 ? bottom(z) : top(z), z);
    }
    g.computeVertexNormals();
    add(g, colour);
  };
  const stoneWall = (x0: number, x1: number, z: number, d: number, y0: number, y1: number) => {
    for (let row = 0, y = y0; y < y1; row++, y += 0.5) {
      const top = Math.min(y + 0.5, y1);
      for (let col = -1, x = x0 - (row % 2) * 0.44; x < x1; col++, x += 0.88) {
        const a = Math.max(x0, x),
          b = Math.min(x1, x + 0.88);
        if (b > a)
          box((a + b) / 2, (y + top) / 2, z, b - a - 0.012, top - y - 0.012, d, STONE[(row + col + 5) % STONE.length]!);
      }
    }
  };
  const window = (x: number, y: number, z: number, w: number, h: number) => {
    box(x, y, z, w, h, 0.1, GLASS);
    for (const side of [-1, 1]) {
      box(x + (side * w) / 2, y, z, w * 0.035, h + 0.16, 0.18, TRIM);
      box(x, y + (side * h) / 2, z, w + 0.12, 0.12, 0.18, TRIM);
    }
    box(x, y, z, 0.07, h, 0.2, TRIM);
    box(x, y, z, w, 0.07, 0.2, TRIM);
  };
  const piers = (left: number, right: number, ruined = false) => {
    for (const [side, height] of [
      [-1, left],
      [1, right],
    ] as const) {
      const x0 = side < 0 ? -edge(front) : 1.8,
        x1 = side < 0 ? -1.8 : edge(front);
      stoneWall(x0, x1, front + 0.4, 0.8, 0, height);
      box((x0 + x1) / 2, 0.18, front + 0.4, x1 - x0, 0.36, 0.85, '#a69a7e');
      if (ruined) {
        const broken = Math.min(0.22, 6.2 - height);
        if (broken > 0) box((x0 + x1) / 2, height + broken / 2, front + 0.3, (x1 - x0) * 0.55, broken, 0.5, STONE[2]);
      } else box((x0 + x1) / 2, height - 0.13, front + 0.4, x1 - x0, 0.24, 0.86, TRIM);
      // Fill to the radial seam behind the flat facade.
      const g = new THREE.BoxGeometry(1, 1, 1),
        p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i) < 0 ? front + 0.02 : front + 0.78;
        const x = side < 0 ? (p.getX(i) < 0 ? -edge(z) : -1.82) : p.getX(i) < 0 ? 1.82 : edge(z);
        p.setXYZ(i, x, p.getY(i) < 0 ? 0.02 : height - 0.02, z);
      }
      g.computeVertexNormals();
      add(g, STONE[0]);
    }
  };
  const doors = (open: boolean) => {
    for (const side of [-1, 1]) {
      const start = pieces.length;
      // Each 1.78 m leaf starts at its hinge; the pair leaves a fine central seam.
      box(0.89, 2.3, 0, 1.78, 4.6, 0.16, WOOD);
      for (let i = 0; i < 6; i++) box(0.15 + i * 0.296, 1.22, -0.09, 0.018, 2.3, 0.02, '#713f2c');
      window(0.89, 3.38, -0.11, 1.42, 1.66);
      window(0.89, 3.38, 0.11, 1.42, 1.66);
      for (const y of [0.6, 2.2]) box(0.45, y, -0.14, 0.82, 0.12, 0.08, STEEL);
      box(1.56, 2.15, -0.19, 0.09, 0.35, 0.12, STEEL);
      // Open leaves fold inward along the reveal; nothing intrudes into the clear 3.6 m opening.
      for (let i = start; i < pieces.length; i++) {
        if (side === 1) pieces[i]!.rotateY(Math.PI);
        if (open) pieces[i]!.rotateY((side * Math.PI) / 2);
        pieces[i]!.translate(side * (open ? 2.03 : 1.8), 0, front + 0.4);
      }
    }
  };

  switch (params.part) {
    case 'cradle':
      for (const z of [-0.8, 0.8]) box(0, 0.08, z, 1.5, 0.16, 1.3, '#e8742c');
      for (const x of [-0.95, 0.95]) {
        for (const z of [-1.35, -0.25, 0.25, 1.35]) box(x, 0.95, z, 0.1, 1.8, 0.1, '#e8742c');
        box(x, 1.85, 0, 0.12, 0.12, 2.9, '#e8742c');
      }
      break;
    case 'pallet':
      box(0, 0.09, 0, 1.5, 0.18, 2.1, '#6f7275');
      break;
    case 'steel-block':
      box(0, 0, 0, 0.56, 0.4, 0.56, '#e8742c');
      break;
    case 'waiting-engine': {
      // The existing engine's silhouette under canvas, facing the table. Only the underframe, drivers and buffers
      // are exposed: no hidden detailed locomotive is rendered beneath the opaque cloth.
      const centre = 18.5,
        rail = 0.24,
        hem = 1.05;
      box(0, rail + 0.93, centre, ENGINE.hx * 2, 0.3, ENGINE.hz * 2, '#3d4946');
      for (const side of [-1, 1]) {
        for (const z of [-ENGINE_WHEELS.z, ENGINE_WHEELS.z])
          add(
            new THREE.CylinderGeometry(ENGINE_WHEELS.r, ENGINE_WHEELS.r, 0.18, 12)
              .rotateZ(Math.PI / 2)
              .translate(side * 0.55, rail + ENGINE_WHEELS.r, centre + z),
            '#343b39',
          );
        box(side * 0.66, rail + 0.55, centre, 0.08, 0.12, ENGINE_WHEELS.z * 2, '#77827c');
        for (const z of [-1, 1]) box(side * 0.62, rail + 0.88, centre + z * 2.18, 0.36, 0.3, 0.22, '#414b47');
      }
      // Five vertices across each draped section: loose hems, shoulders, ridge. Height changes follow the chimney,
      // boiler and cab of the actual engine; slightly alternating hems make it read as cloth rather than a box.
      const sections = [
        [-2.22, ENGINE_BOILER.top - 0.28, 0.65],
        [-ENGINE_BOILER.chimney.z, ENGINE_BOILER.chimney.y + 0.14, 0.45],
        [-0.8, ENGINE_BOILER.top + 0.1, 0.78],
        [0.25, ENGINE_BOILER.top + 0.12, 0.8],
        [0.55, ENGINE_CAB.roofTop + 0.12, ENGINE_CAB.roofHx],
        [1.9, ENGINE_CAB.roofTop + 0.12, ENGINE_CAB.roofHx],
        [2.22, ENGINE_CAB.roofTop - 0.12, 0.94],
      ];
      const vertices: number[] = [],
        indices: number[] = [];
      for (const [i, [z, top, shoulder]] of sections.entries()) {
        for (const [x, y] of [
          [-1.22, hem + (i % 2) * 0.08],
          [-shoulder!, top! - 0.17],
          [0, top!],
          [shoulder!, top! - 0.17],
          [1.22, hem + ((i + 1) % 2) * 0.08],
        ])
          vertices.push(x!, rail + y!, centre + z!);
        if (i === 0) continue;
        for (let j = 0; j < 4; j++) {
          const a = (i - 1) * 5 + j,
            b = i * 5 + j;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      // Close both hanging ends down to the hem, keeping the wheels visible below it.
      for (const row of [0, sections.length - 1]) {
        const bottom = vertices.length / 3;
        vertices.push(0, rail + hem, centre + sections[row]![0]!);
        for (let j = 0; j < 4; j++) {
          const a = row * 5 + j;
          if (row === 0) indices.push(bottom, a, a + 1);
          else indices.push(bottom, a + 1, a);
        }
      }
      const cloth = new THREE.BufferGeometry();
      cloth.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      cloth.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((vertices.length / 3) * 2), 2));
      cloth.setIndex(indices);
      cloth.computeVertexNormals();
      // Match the working bay's existing sage canvas.
      add(cloth, '#87968b');
      break;
    }
    case 'bay': {
      piers(6.2, 6.2);
      stoneWall(-1.8, 1.8, front + 0.4, 0.8, 4.6, 6.2);
      // A shallow segmental stone arch is above, never below, the measured rectangular clearance.
      for (let i = 0; i < 12; i++) {
        const x = -1.65 + i * 0.3,
          y = 4.74 + 0.3 * (1 - (x / 1.8) ** 2);
        box(x, y, front - 0.055, 0.285, 0.28, 0.13, i === 5 || i === 6 ? TRIM : '#a56445');
      }
      const bw = edge(back);
      stoneWall(-bw, bw, back - 0.15, 0.3, 0, 1.45);
      stoneWall(-bw, bw, back - 0.15, 0.3, 3.85, 4.8);
      const windows = [-2.75, 0, 2.75];
      let x = -bw;
      for (const centre of windows) {
        stoneWall(x, centre - 1.05, back - 0.15, 0.3, 1.45, 3.85);
        window(centre, 2.65, back - 0.15, 2.1, 2.4);
        x = centre + 1.05;
      }
      stoneWall(x, bw, back - 0.15, 0.3, 1.45, 3.85);
      wedge(
        front,
        back,
        () => 0,
        () => 0.05,
        '#9b9687',
      );
      const a = 17 * Math.cos(half),
        b = 19 * Math.cos(half);
      for (const [lo, hi] of [
        [front, a],
        [b, back],
      ]) {
        wedge(lo!, hi!, roofY, (z) => roofY(z) + 0.3, ROOF);
        // Courses subdivide the slate sweep without changing its silhouette or reach.
        for (let z = lo! + 0.6; z < hi!; z += 0.6)
          wedge(
            z,
            z + 0.035,
            (q) => roofY(q) + 0.3,
            (q) => roofY(q) + 0.32,
            '#6a7786',
          );
      }
      wedge(
        a,
        b,
        (z) => roofY(z) + 0.9,
        (z) => roofY(z) + 1.2,
        ROOF,
      );
      for (const z of [a, b]) {
        const w = edge(z) * 2;
        box(0, roofY(z) + 0.59, z, w, 0.64, 0.12, GLASS);
        for (const dy of [0.3, 0.9]) box(0, roofY(z) + dy, z, w, 0.12, 0.23, TRIM);
        for (let x = -w / 2 + 0.08; x < w / 2; x += 0.86) box(x, roofY(z) + 0.6, z, 0.09, 0.6, 0.2, TRIM);
      }
      // Fascia follows the faceted ring and visually joins each bay at its radial boundary.
      for (const z of [front, back]) box(0, roofY(z) + 0.16, z, edge(z) * 2, 0.3, 0.2, ROOF);
      const jack = 21,
        y = roofY(jack) + 0.3;
      box(0, y + 0.5, jack, 0.9, 1.0, 0.9, STONE[1]);
      box(0, y + 1.0, jack, 1.08, 0.18, 1.08, TRIM);
      box(0, y + 1.35, jack, 0.62, 0.62, 0.62, STEEL);
      for (let k = 0; k < 3; k++) box(0, y + 1.15 + k * 0.16, jack, 0.77, 0.07, 0.77, '#72808a');
      add(new THREE.ConeGeometry(0.85, 0.35, 4).rotateY(Math.PI / 4).translate(0, y + 1.83, jack), ROOF);
      if (params.steel) {
        for (const side of [-1, 1]) {
          box(side * 2.1, 3.1, front - 0.1, 0.27, 6.2, 0.28, STEEL);
          for (const h of [0.4, 3.0, 5.9]) box(side * 2.1, h, front - 0.26, 0.42, 0.25, 0.08, '#76858b');
        }
        box(0, 6.03, front - 0.1, 4.86, 0.32, 0.28, STEEL);
      }
      break;
    }
    case 'doors':
      doors(false);
      break;
    case 'open-doors':
      doors(true);
      break;
    case 'ruin': {
      piers(
        typeof params.left === 'number' ? params.left : 3.2,
        typeof params.right === 'number' ? params.right : 4.4,
        true,
      );
      wedge(
        front,
        back,
        () => 0,
        () => 0.05,
        '#928b78',
      );
      for (const side of [-1, 1])
        for (let k = 0; k < 3; k++)
          box(side * (2.8 + k * 0.28), 0.13, front + 1.5 + k * 0.7, 0.45, 0.26, 0.5, STONE[k]!);
      break;
    }
    case 'wall': {
      const g = new THREE.BoxGeometry(0.3, 1, 11).translate(0, 0.5, 19.5),
        p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (6.2 + ((4.8 - 6.2) * (p.getZ(i) - 14)) / 11));
      g.computeVertexNormals();
      add(g, STONE[0]);
      for (let y = 0.5; y < 4.8; y += 0.5) box(0, y, 19.5, 0.32, 0.018, 11, '#a88d66');
      // Close the exposed end of the monitor without dividing adjacent built bays.
      const cap = new THREE.BoxGeometry(0.3, 1, 2).translate(0, 0.5, 18),
        cp = cap.getAttribute('position');
      for (let i = 0; i < cp.count; i++) cp.setY(i, roofY(cp.getZ(i) * Math.cos(half)) + 0.3 + cp.getY(i) * 0.6);
      cap.computeVertexNormals();
      add(cap, STONE[1]);
      break;
    }
    case 'outline': {
      for (const z of [front, back - 0.2])
        wedge(
          z,
          z + 0.2,
          () => 0,
          () => 0.1,
          '#e6a33e',
        );
      for (const side of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.2, 0.1, 11).translate(side * 3.4, 0.05, 19.2),
          p = g.getAttribute('position');
        for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) - side * 3.4 + side * edge(p.getZ(i)));
        g.computeVertexNormals();
        add(g, '#e6a33e');
      }
      break;
    }
    default:
      throw new Error(`roundhouse.bay: unknown part ${String(params.part)}`);
  }
  const geometry = mergeGeometries(pieces);
  pieces.forEach((g) => g.dispose());
  const mat = material('stone', { colour: '#ffffff', vertexColours: true });
  const mesh =
    typeof params.count === 'number'
      ? new THREE.InstancedMesh(geometry, mat, params.count)
      : new THREE.Mesh(geometry, mat);
  mesh.castShadow = params.part !== 'outline';
  mesh.receiveShadow = true;
  if (mesh instanceof THREE.InstancedMesh) {
    geometry.dispose();
    return mesh;
  }
  return { object: mesh, dispose: () => geometry.dispose() };
});
