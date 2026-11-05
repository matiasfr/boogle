"""Text-only rack A. Metres; game (x,y,z) -> Blender (x,-z,y), Y-up export.
Static named closed solids, base-centre origin; no sockets, stock logic or collision.
Canonical parameters below. No image reference used. Original Boogle geometry.
"""
import math
import sys
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
POST = 0.16
WIDTH = 1.55
DEPTH = 1.0
ROOF_HEIGHT = 1.92
LOG_RADIUS = 0.19
LOG_LENGTH = 1.18


def point(p):
    return Vector((p[0], -p[2], p[1]))


def material(name, colour):
    srgb = [int(colour[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = 0.85
    return mat


TIMBER = material('weathered_timber', '886143')
ROOF = material('roof_timber', '785443')
BARK = material('log_bark', '63452f')
END = material('cut_wood', 'd5ae71')


def beam(name, start, end, width, depth, mat):
    a, b = point(start), point(end)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (width, depth, (b - a).length)
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('timber_12mm_chamfer', 'BEVEL')
    bevel.width = 0.012
    bevel.segments = 1
    return obj


# Crooked posts carry a low, slanting shed roof; open front exposes all three logs.
for ix, x in enumerate((-WIDTH / 2, WIDTH / 2)):
    for iz, z in enumerate((-DEPTH / 2, DEPTH / 2)):
        top = ROOF_HEIGHT - (0.17 if iz else 0) - (0.07 if ix else 0)
        beam(f'post_{ix}_{iz}', (x, 0, z), (x + (-0.055 if ix else 0.035), top, z), POST, POST, TIMBER)
    beam(f'foot_{ix}', (x, 0.09, -0.65), (x, 0.09, 0.65), 0.24, 0.18, TIMBER)
for z in (-0.43, 0.43):
    beam(f'bearer_{z}', (-0.84, 0.36, z), (0.84, 0.36, z), 0.18, 0.18, TIMBER)
beam('back_brace', (-0.73, 0.43, -0.5), (0.74, 1.62, -0.5), 0.12, 0.12, TIMBER)
for i in range(5):
    x = (i - 2) * 0.37
    y = ROOF_HEIGHT + 0.06 - (i / 4) * 0.07
    beam(f'roof_board_{i}', (x, y, -0.72), (x + 0.035, y - 0.23, 0.74 + (i % 2) * 0.04), 0.39, 0.10, ROOF)

for i, (x, y) in enumerate(((-0.18, 0.64), (0.18, 0.64), (0, 0.95))):
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=LOG_RADIUS, depth=LOG_LENGTH, location=point((x, y, 0.07)))
    obj = bpy.context.object
    obj.name = f'log_{i}'
    obj.rotation_euler.x = math.pi / 2
    obj.data.materials.append(BARK)
    obj.data.materials.append(END)
    for face in obj.data.polygons:
        face.material_index = 1 if len(face.vertices) == 10 else 0

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
