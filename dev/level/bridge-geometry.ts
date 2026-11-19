// Capture the source-owned bridge at its stall stop, including the batch's Float32 instance transforms.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { TABLE } from '../../src/place/home-station.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { BRIDGE, tableYaws } from '../../src/entities/railway/table-bridge.ts';
import { RAIL_HEAD, SHUNT, TABLE_RAIL, rimCut } from '../../src/entities/railway/works-shape.ts';
import type { BoxBatch } from '../../src/entities/railway/works-box-view.ts';
import { material } from '../../src/render/materials.ts';
import { geometryFaces, materialSurface } from '../../src/geometry/drawn-faces.ts';
import type { Face } from '../../src/geometry/zfight.ts';
import { sourceFunction, sourceModule } from './source.ts';

export function collectBridgeGeometry(): Face[] {
  const source = fs.readFileSync('src/entities/railway/roundhouse-view.ts', 'utf8');
  const start = "    // The bridge's rails at",
    end = '    // A handle on the bridge';
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  if (a < 0 || b <= a || source.indexOf(start, a + start.length) !== -1)
    throw new Error('Roundhouse bridge geometry boundary changed');
  const createBatch = sourceFunction<(owner: { add: (mesh: THREE.Object3D) => void }, max: number) => BoxBatch>(
    'src/entities/railway/works-box-view.ts',
    'createBoxBatch',
    { THREE, material },
  );
  const batch = createBatch({ add() {} }, 320);
  sourceModule<{ draw: () => void }>(`export function draw() {${source.slice(a, b)}}`, {
    batch,
    m: new THREE.Matrix4(),
    table: { x: TABLE.x + ORIGIN.x, z: TABLE.z },
    tableY: TABLE_RAIL,
    R: TABLE.r,
    DECK: BRIDGE,
    SHUNT,
    RAIL_HEAD,
    rimCut,
    drawn: tableYaws()[0],
  }).draw();
  batch.commit();
  const faces: Face[] = [],
    matrix = new THREE.Matrix4(),
    color = new THREE.Color();
  for (let i = 0; i < batch.count; i++) {
    batch.mesh.getMatrixAt(i, matrix);
    batch.mesh.getColorAt(i, color);
    faces.push(
      ...geometryFaces(
        batch.mesh.geometry,
        matrix,
        `roundhouse/bridge/${i}`,
        false,
        materialSurface(batch.mesh.material as THREE.Material, true, true, [color.r, color.g, color.b]),
      ),
    );
  }
  batch.mesh.dispose();
  return faces;
}
