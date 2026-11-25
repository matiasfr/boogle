// Run with node dev/prefab/export-godot.ts <Godot console executable>.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Matrix4, Vector3 } from 'three';
import rawGorge from '../../content/built/levels/gorge.json' with { type: 'json' };
import rawPrefabs from '../../content/built/prefabs.json' with { type: 'json' };
import type { Placement, Vec3 } from '../../src/prefab/types.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../../src/prefab/validate.ts';
import { bake, rotation } from './bake.ts';

const godot = process.argv[2];
assert(godot, 'Usage: node dev/prefab/export-godot.ts <Godot console executable>');
const out = path.resolve(import.meta.dirname, '../../.look/prefab-godot');
const records = loadPrefabArtifact(rawPrefabs).prefabs;
const gorge = loadLevelArtifact(rawGorge, records);
const chair: Placement = { id: 'chair', prefab: 'town.workshop-chair', pos: [0, 0, 0] };
const targets = Object.entries({ chair: [chair], gorge: gorge.placements });
const unit: Vec3 = [1, 1, 1];
const vector = (xyz: readonly number[]) => `Vector3(${xyz.join(', ')})`;

function transform(pos: Vec3, rot?: Vec3) {
  const basis = new Matrix4().makeRotationFromEuler(rotation(rot)).setPosition(new Vector3(...pos));
  const e = basis.elements;
  return `Transform3D(${[0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14].map((i) => e[i]).join(', ')})`;
}

function scene(name: string, placements: readonly Placement[]) {
  const shapes: string[] = [];
  const nodes = [
    `[node name="${name}" type="Node3D"]`,
    '[node name="Visuals" parent="." instance=ExtResource("visuals")]',
    '[node name="Records" type="Node3D" parent="."]',
  ];
  for (const placement of placements) {
    const { id, pos, rot, scale = unit } = placement;
    const def = records[placement.prefab]!;
    assert(!placement.parent, `Unexpected parent for ${id}`);
    const nodeName = id.replaceAll('.', '_');
    const parent = `Records/${nodeName}`;
    nodes.push(`[node name="${nodeName}" type="Node3D" parent="Records"]\ntransform = ${transform(pos, rot)}`);
    const scaled = (xyz: Vec3): Vec3 => [xyz[0] * scale[0], xyz[1] * scale[1], xyz[2] * scale[2]];
    if (def.colliders.length) nodes.push(`[node name="Body" type="StaticBody3D" parent="${parent}"]`);
    for (const [i, collider] of def.colliders.entries()) {
      // Only boxes occur in these records. Fold placement scale into the shape so physics nodes stay unscaled.
      assert(collider.shape === 'box' && !collider.rot, `Unsupported collision shape for ${id}`);
      const shape = `box_${shapes.length}`;
      shapes.push(
        `[sub_resource type="BoxShape3D" id="${shape}"]\nsize = ${vector(scaled(collider.half).map((n) => n * 2))}`,
      );
      nodes.push(
        `[node name="Shape_${i}" type="CollisionShape3D" parent="${parent}/Body"]\n` +
          `position = ${vector(scaled(collider.at))}\nshape = SubResource("${shape}")`,
      );
    }
    for (const [key, marker] of Object.entries(def.attach ?? {})) {
      const yaw = marker.kind === 'seat' ? marker.yaw : 0;
      nodes.push(
        `[node name="${key}" type="Marker3D" parent="${parent}"]\n` +
          `transform = ${transform(scaled(marker.at), [yaw, 0, 0])}`,
      );
      if (marker.kind === 'seat')
        nodes.push(`[node name="Exit" type="Marker3D" parent="${parent}"]\nposition = ${vector(scaled(marker.exit))}`);
    }
  }
  return (
    [
      '[gd_scene format=3]',
      `[ext_resource type="PackedScene" path="res://${name}.glb" id="visuals"]`,
      ...shapes,
      ...nodes,
    ].join('\n\n') + '\n'
  );
}

// Count from the loaded scenes, independently of the text written by scene().
const verify = `extends SceneTree

func tally(node: Node, counts: Dictionary, prefix: String) -> void:
	var here = prefix + "/" + str(node.name)
	print(here, "  ", node.get_class())
	if node is MeshInstance3D and node.mesh != null:
		counts.meshes += 1
	if node is CollisionShape3D and node.get_parent() is StaticBody3D and node.shape is BoxShape3D and not node.disabled:
		counts.shapes += 1
	if node is Marker3D:
		counts.markers += 1
	for child in node.get_children():
		tally(child, counts, here)

func _initialize() -> void:
	var expected = JSON.parse_string(FileAccess.get_file_as_string("res://expected.json"))
	var matched = true
	for name in expected:
		var packed = load("res://" + name + ".tscn") as PackedScene
		if packed == null:
			quit(1)
			return
		var scene = packed.instantiate()
		var records = scene.get_node_or_null("Records")
		var counts = {"records": records.get_child_count() if records else -1, "meshes": 0, "shapes": 0, "markers": 0}
		tally(scene, counts, "")
		scene.free()
		print(name, ": actual ", counts, " expected ", expected[name])
		for key in counts:
			if counts[key] != expected[name][key]:
				matched = false
	if not matched:
		printerr("Godot import counts differ from the compiled records")
	quit(0 if matched else 1)
`;

fs.mkdirSync(out, { recursive: true });
const log = path.join(out, 'proof.txt');
fs.rmSync(log, { force: true });
fs.writeFileSync(
  path.join(out, 'project.godot'),
  'config_version=5\n[application]\nconfig/name="Boogle prefab proof"\n',
);
const expected = Object.fromEntries(
  targets.map(([name, placements]) => {
    const defs = placements.map((p) => records[p.prefab]!);
    return [
      name,
      {
        records: placements.length,
        meshes: defs.filter((def) => !('none' in def.visual)).length,
        shapes: defs.reduce((n, def) => n + def.colliders.length, 0),
        markers: defs.reduce(
          (n, def) =>
            n + Object.values(def.attach ?? {}).reduce((m, marker) => m + (marker.kind === 'seat' ? 2 : 1), 0),
          0,
        ),
      },
    ];
  }),
);
for (const [name, placements] of targets) {
  fs.writeFileSync(path.join(out, `${name}.tscn`), scene(name, placements));
  await bake(path.join(out, `${name}.glb`), placements, records);
}
fs.writeFileSync(path.join(out, 'expected.json'), JSON.stringify(expected, null, 2));
fs.writeFileSync(path.join(out, 'verify.gd'), verify);
execFileSync(godot, ['--headless', '--path', out, '--import'], { stdio: 'inherit' });
const evidence = execFileSync(godot, ['--headless', '--path', out, '--script', 'verify.gd'], { encoding: 'utf8' });
fs.writeFileSync(log, evidence);
console.log(
  evidence
    .trimEnd()
    .split('\n')
    .filter((line) => line.includes(': actual '))
    .join('\n'),
);
console.log(`Godot import proof: ${log}`);
