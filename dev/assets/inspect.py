"""Empty-scene built GLB inspection; geometry is never smoothed, welded or repaired for rendering."""
import bpy
import bmesh
import json
import math
import numpy as np
import sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index('--') + 1])
spec = json.loads((out / 'inspection.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out / 'decoded.glb'))
scene = bpy.context.scene
objects = sorted((o for o in scene.objects if o.type == 'MESH'), key=lambda o: o.name)
if not objects:
    raise RuntimeError('No mesh objects imported')
# Blender import converts game Y-up to Z-up; all reported coordinates convert back.
def game(v):
    return (v.x, v.z, -v.y)

points, parts = [], []
for obj in objects:
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    world = [evaluated.matrix_world @ v.co for v in mesh.vertices]
    points.extend(game(v) for v in world)
    degenerate = sum((world[t.vertices[1]] - world[t.vertices[0]]).cross(
        world[t.vertices[2]] - world[t.vertices[0]]).length / 2 < 1e-12 for t in mesh.loop_triangles)
    normal_matrix = evaluated.matrix_world.to_3x3().inverted().transposed()
    lengths = [n.vector.length for n in mesh.corner_normals]
    normals = [normal_matrix @ n.vector for n in mesh.corner_normals]
    invalid = sum(not all(math.isfinite(c) for c in n) or n.length < 1e-12 for n in normals)
    # Split-normal vertices are welded only on this disposable topology copy, in metre world coordinates.
    bm = bmesh.new()
    bm.from_mesh(mesh)
    for v in bm.verts:
        v.co = evaluated.matrix_world @ v.co
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    remaining = set(bm.verts)
    components = 0
    while remaining:
        pending = [remaining.pop()]
        components += 1
        while pending:
            for edge in pending.pop().link_edges:
                for v in edge.verts:
                    if v in remaining:
                        remaining.remove(v)
                        pending.append(v)
    coords = [game(v) for v in world]
    parts.append(dict(name=obj.name, triangles=len(mesh.loop_triangles), vertices=len(mesh.vertices),
                      materials=[m.name if m else None for m in mesh.materials], degenerate=degenerate,
                      invalidNormals=invalid, importedNormalLength=[min(lengths), max(lengths)], boundaryEdges=sum(e.is_boundary for e in bm.edges),
                      nonManifoldEdges=sum(not e.is_manifold for e in bm.edges), components=components,
                      signedVolumeM3=bm.calc_volume(signed=True) if all(e.is_manifold for e in bm.edges) else None,
                      min=[min(v[i] for v in coords) for i in range(3)],
                      max=[max(v[i] for v in coords) for i in range(3)]))
    bm.free()
    evaluated.to_mesh_clear()
lo = [min(p[i] for p in points) for i in range(3)]
hi = [max(p[i] for p in points) for i in range(3)]
metrics = dict(blender=bpy.app.version_string, triangles=sum(p['triangles'] for p in parts),
               vertices=sum(p['vertices'] for p in parts), materials=len({m.name for o in objects for m in o.data.materials if m}),
               min=lo, max=hi, bounds=[hi[i]-lo[i] for i in range(3)], parts=parts)
(out / 'metrics.json').write_text(json.dumps(metrics, indent=2) + '\n')
# Workbench material-colour is deliberately not a claim about the game's TSL appearance.
scene.render.engine = 'BLENDER_WORKBENCH'
scene.world = bpy.data.worlds.new('inspection_world')
scene.world.color = (0.2, 0.2, 0.2)
scene.render.resolution_x = scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
shading = scene.display.shading
shading.light = 'STUDIO'
shading.show_shadows = False
shading.show_cavity = True
shading.background_type = 'WORLD'
shading.show_specular_highlight = False
camera_data = bpy.data.cameras.new('fixed_camera')
camera = bpy.data.objects.new('fixed_camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = 'ORTHO'
camera_data.ortho_scale = spec['scale']
c = spec['centre']
centre = Vector((c[0], -c[2], c[1]))
views = [('front', (0, -1, 0)), ('side', (1, 0, 0)), ('back', (0, 1, 0)), ('three', (1, -1, 0.7))]
palette = [(0.75, 0.22, 0.15, 1), (0.15, 0.5, 0.8, 1), (0.85, 0.65, 0.12, 1), (0.35, 0.7, 0.3, 1), (0.6, 0.3, 0.75, 1)]
# Curves use actual exported triangle edges, not a modifier that invents triangulation.
wire = bpy.data.curves.new('exported_edges', 'CURVE')
wire.dimensions = '3D'
wire.bevel_depth = spec['scale'] * 0.0008
wire.bevel_resolution = 0
for obj in objects:
    mesh = obj.data
    mesh.calc_loop_triangles()
    edges = {tuple(sorted((t.vertices[i], t.vertices[(i+1) % 3]))) for t in mesh.loop_triangles for i in range(3)}
    for a, b in sorted(edges):
        spline = wire.splines.new('POLY')
        spline.points.add(1)
        for p, index in zip(spline.points, (a, b)):
            p.co = (* (obj.matrix_world @ mesh.vertices[index].co), 1)
wire_obj = bpy.data.objects.new('inspection_wire', wire)
scene.collection.objects.link(wire_obj)
wire_obj.color = (0.02, 0.02, 0.02, 1)
for mode in ['clay', 'parts', 'wire', 'material']:
    shading.color_type = 'MATERIAL' if mode == 'material' else 'OBJECT'
    wire_obj.hide_render = mode != 'wire'
    for i, obj in enumerate(objects):
        obj.hide_render = mode == 'wire'
        obj.color = palette[i % len(palette)] if mode == 'parts' else (0.65, 0.65, 0.65, 1)
    for label, direction in views:
        camera.location = centre + Vector(direction).normalized() * spec['scale'] * 4
        camera.rotation_euler = (centre - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(out / (mode + '-' + label + '.png'))
        bpy.ops.render.render(write_still=True)

# Rows top-to-bottom follow the workflow; columns front/side/back/three.
sheet = np.zeros((384 * 4, 384 * 4, 4), dtype=np.float32)
for row, mode in enumerate(['clay', 'parts', 'wire', 'material']):
    for col, (label, _) in enumerate(views):
        image = bpy.data.images.load(str(out / (mode + '-' + label + '.png')))
        pixels = np.empty(384 * 384 * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        sheet[(3-row)*384:(4-row)*384, col*384:(col+1)*384] = pixels.reshape(384, 384, 4)
        bpy.data.images.remove(image)
image = bpy.data.images.new('four_modes_four_views', width=1536, height=1536)
image.pixels.foreach_set(sheet.ravel())
image.filepath_raw = str(out / 'sheet.png')
image.file_format = 'PNG'
image.save()
