// GLB fallback for the two builders used by the Godot portability proof.
import fs from 'node:fs';
import { Color, Euler, Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { greyboxBox } from '../../src/prefab/builders/greybox-box.ts';
import { kitMaterial, seatChair } from '../../src/prefab/builders/seat-chair.ts';
import type { Placement, PrefabDef, Vec3 } from '../../src/prefab/types.ts';

// GLTFExporter uses FileReader to assemble binary blobs, which Node provides through Blob.arrayBuffer.
class BinaryFileReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then(
      (result) => {
        this.result = result;
        this.onloadend?.();
      },
      (error: unknown) => {
        throw error;
      },
    );
  }
}

export const rotation = ([yaw, pitch, roll]: Vec3 = [0, 0, 0]) => new Euler(pitch, yaw, roll, 'YXZ');

export async function bake(file: string, placements: readonly Placement[], records: Record<string, PrefabDef>) {
  const group = new Group();
  const box = greyboxBox({ count: 1 });
  if (!(box instanceof InstancedMesh)) throw new Error('Expected the greybox builder to return a batch');
  const colour = new Color();
  for (const placement of placements) {
    const { id, pos, rot, scale, params } = placement;
    const visual = records[placement.prefab]!.visual;
    if ('none' in visual) continue;
    if (!('builder' in visual)) throw new Error(`No GLB bake for ${placement.prefab}`);
    let object;
    if (visual.builder === 'seat.chair') {
      object = seatChair(visual.params);
      if (!(object instanceof Group)) throw new Error('Expected the chair builder to return a group');
      object.traverse((node) => {
        if (node instanceof Mesh)
          node.material = new MeshStandardMaterial({
            name: 'chair',
            color: kitMaterial.color,
            vertexColors: kitMaterial.vertexColors,
            roughness: kitMaterial.roughness,
          });
      });
    } else if (visual.builder === 'greybox.box' && !visual.instances) {
      // The runtime builder batches unit boxes with instance colours and the TSL stone preset.
      greyboxBox({ ...visual.params, ...params }, { mesh: box, index: 0 });
      box.getColorAt(0, colour);
      object = new Mesh(box.geometry, new MeshStandardMaterial({ name: 'tsl:stone', color: colour }));
    } else {
      throw new Error(`No GLB bake for ${visual.builder}`);
    }
    // Godot sanitizes dots in node names.
    object.name = id.replaceAll('.', '_');
    object.position.fromArray(pos);
    object.rotation.copy(rotation(rot));
    if (scale) object.scale.fromArray(scale);
    group.add(object);
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: BinaryFileReader });
  try {
    const result = await new GLTFExporter().parseAsync(group, { binary: true });
    if (!(result instanceof ArrayBuffer)) throw new Error('Expected binary glTF');
    fs.writeFileSync(file, new Uint8Array(result));
  } finally {
    if (original) Object.defineProperty(globalThis, 'FileReader', original);
    else Reflect.deleteProperty(globalThis, 'FileReader');
  }
}
