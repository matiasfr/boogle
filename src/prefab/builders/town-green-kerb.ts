import * as THREE from 'three/webgpu';
import { GRID, ORIGIN } from '../../place/layout.ts';
import { surfaceHeight } from '../../place/terrain.ts';
import { TOWN_CENTRE, TOWN_GREEN } from '../../place/town-plan.ts';
import { material } from '../../render/materials.ts';
import { registerBuilder } from '../builders.ts';

declare module '../names.ts' {
  interface BuilderNames {
    'town.green-kerb': true;
  }
}

const KERB_HEIGHT = 0.08;
const KERB_WIDTH = 0.3;
const GREEN_LIFT = 0.02;
const SEGMENTS = 128;
const GRASS = new THREE.Color('#618f41');
const STONE = new THREE.Color('#a3a29c');
type Point = readonly [number, number];

const side = (point: Point, start: Point, end: Point) =>
  (end[0] - start[0]) * (point[1] - start[1]) - (end[1] - start[1]) * (point[0] - start[0]);

function clip(polygon: readonly Point[], start: Point, end: Point): Point[] {
  const result: Point[] = [];
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const currentSide = side(current, start, end);
    const nextSide = side(next, start, end);
    if (currentSide >= 0) result.push(current);
    if (currentSide < 0 !== nextSide < 0) {
      const fraction = currentSide / (currentSide - nextSide);
      result.push([current[0] + fraction * (next[0] - current[0]), current[1] + fraction * (next[1] - current[1])]);
    }
  }
  return result;
}

function circle(radius: number): Point[] {
  return Array.from({ length: SEGMENTS }, (_, index) => {
    const angle = (index * Math.PI * 2) / SEGMENTS;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
}

registerBuilder('town.green-kerb', () => {
  const positions: number[] = [];
  const colours: number[] = [];
  const inner = circle(TOWN_GREEN.radius - KERB_WIDTH);
  const outer = circle(TOWN_GREEN.radius);
  const centreX = ORIGIN.x + TOWN_CENTRE.x;
  const centreZ = ORIGIN.z + TOWN_CENTRE.z;
  const vertex = (point: Point, lift: number, colour: THREE.Color) => {
    positions.push(point[0], surfaceHeight(centreX + point[0], centreZ + point[1]) + lift, point[1]);
    colours.push(colour.r, colour.g, colour.b);
  };
  const top = (polygon: readonly Point[], lift: number, colour: THREE.Color) => {
    for (let index = 1; index + 1 < polygon.length; index++) {
      if (Math.abs(side(polygon[index]!, polygon[0]!, polygon[index + 1]!)) < 1e-9) continue;
      for (const point of [polygon[0]!, polygon[index + 1]!, polygon[index]!]) vertex(point, lift, colour);
    }
  };
  const wall = (start: Point, end: Point, bottom: number) => {
    for (const [point, lift] of [
      [start, KERB_HEIGHT],
      [end, KERB_HEIGHT],
      [start, bottom],
      [end, KERB_HEIGHT],
      [end, bottom],
      [start, bottom],
    ] as const)
      vertex(point, lift, STONE);
  };
  const firstX = GRID.x0 + Math.floor((TOWN_CENTRE.x - TOWN_GREEN.radius - GRID.x0) / GRID.cell) * GRID.cell;
  const firstZ = GRID.z0 + Math.floor((TOWN_CENTRE.z - TOWN_GREEN.radius - GRID.z0) / GRID.cell) * GRID.cell;
  for (let gridZ = firstZ; gridZ < TOWN_CENTRE.z + TOWN_GREEN.radius; gridZ += GRID.cell) {
    for (let gridX = firstX; gridX < TOWN_CENTRE.x + TOWN_GREEN.radius; gridX += GRID.cell) {
      const left = gridX - TOWN_CENTRE.x;
      const back = gridZ - TOWN_CENTRE.z;
      const corners: Point[] = [
        [left, back],
        [left + GRID.cell, back],
        [left, back + GRID.cell],
        [left + GRID.cell, back + GRID.cell],
      ];
      for (const triangle of [
        [corners[0]!, corners[1]!, corners[2]!],
        [corners[3]!, corners[2]!, corners[1]!],
      ]) {
        const onTriangle = (polygon: readonly Point[]) => {
          let clipped = [...polygon];
          for (let edge = 0; edge < 3; edge++) clipped = clip(clipped, triangle[edge]!, triangle[(edge + 1) % 3]!);
          return clipped;
        };
        top(onTriangle(inner), GREEN_LIFT, GRASS);
        for (let index = 0; index < SEGMENTS; index++) {
          const next = (index + 1) % SEGMENTS;
          const patch = onTriangle([inner[index]!, outer[index]!, outer[next]!, inner[next]!]);
          top(patch, KERB_HEIGHT, STONE);
          for (let edge = 0; edge < patch.length; edge++) {
            const start = patch[edge]!;
            const end = patch[(edge + 1) % patch.length]!;
            if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 1e-7) continue;
            if (
              Math.abs(side(start, outer[index]!, outer[next]!)) < 1e-7 &&
              Math.abs(side(end, outer[index]!, outer[next]!)) < 1e-7
            )
              wall(start, end, -0.01);
            if (
              Math.abs(side(start, inner[index]!, inner[next]!)) < 1e-7 &&
              Math.abs(side(end, inner[index]!, inner[next]!)) < 1e-7
            )
              wall(start, end, GREEN_LIFT);
          }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material('stone', { colour: '#ffffff', vertexColours: true }));
  mesh.name = 'town:green-kerb';
  mesh.receiveShadow = true;
  return { object: mesh, dispose: () => geometry.dispose() };
});
