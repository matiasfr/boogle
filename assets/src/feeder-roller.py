"""Place-kit roller: metres, Z axle in game, centre pivot. Sidecar lengthScale is the only revision control."""
import json
import math
from pathlib import Path
import sys
import bpy
import bmesh
from mathutils import Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)
spec = json.loads(Path(__file__).with_suffix('.json').read_text())
LENGTH = 0.86 * spec['lengthScale']
RADIUS = 0.075
bm = bmesh.new()
result = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=10,
                              radius1=RADIUS, radius2=RADIUS, depth=LENGTH)
bmesh.ops.rotate(bm, verts=result['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
mesh = bpy.data.meshes.new('roller_drum')
bm.to_mesh(mesh)
bm.free()
mesh.shade_smooth()
obj = bpy.data.objects.new('roller_drum', mesh)
bpy.context.collection.objects.link(obj)
bevel = obj.modifiers.new('edge_bevel_8mm', 'BEVEL')
bevel.width = 0.008
bevel.segments = 1
bevel.limit_method = 'ANGLE'
bevel.angle_limit = math.radians(40)
bevel.harden_normals = True
obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
mat = bpy.data.materials.new('steel')
mat.diffuse_color = (0.107, 0.114, 0.133, 1)
mat.use_nodes = True
p = mat.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value = mat.diffuse_color
p.inputs['Metallic'].default_value = 0.7
p.inputs['Roughness'].default_value = 0.45
mesh.materials.append(mat)
for name, z in [('attachment_negative', -LENGTH / 2), ('attachment_positive', LENGTH / 2)]:
    socket = bpy.data.objects.new(name, None)
    socket.location = (0, -z, 0)
    bpy.context.collection.objects.link(socket)
bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
