"""Reference-guided rack B; original parametric geometry, not traced image data.
Metres; game (x,y,z) -> Blender (x,-z,y); Y-up export, base-centre origin.
Static closed solids. Six roof boards share one front/back profile, four posts only.
Canonical controls below; no helper imports, stock logic, collision or animation.
"""
import math
import sys
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
BUDDY_CROWN = 1.63  # buddy.py HEAD_C.z + HEAD_R.z; no generated-image ruler.
PEAK = BUDDY_CROWN * 1.23
ROOF_PROFILE = ((-1.02, 1.40), (0.40, PEAK), (1.02, 1.76))
ROOF_HALF_DEPTH = 0.68
POST_X = 0.78
POST_Z = 0.48
SECTION = 0.20
BEVEL = 0.025
BED_TOP = 0.38
LOG_RADIUS = 0.20
LOG_LENGTH = 0.94


def point(p):
    return Vector((p[0], -p[2], p[1]))


def material(name, linear_hex):
    # board.md explicitly defines these as linear-ish art anchors, not sRGB samples.
    colour = tuple(int(linear_hex[i:i + 2], 16) / 255 for i in (0, 2, 4))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = 0.85
    return mat


TIMBER = material('warm_timber', '6b3515')
ROOF = material('ochre_roof', 'a96322')
BARK = material('dark_bark', '342014')
END = material('pale_endgrain', 'c4954a')


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('broad_25mm_chamfer', 'BEVEL')
    bevel.width = BEVEL
    bevel.segments = 1
    return obj


def beam(name, start, end, width, depth, mat=TIMBER):
    a, b = point(start), point(end)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(a + b) / 2)
    obj = bpy.context.object
    obj.dimensions = (width, depth, (b - a).length)
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat)


def roof_height(x):
    a, b = ROOF_PROFILE[:2] if x <= ROOF_PROFILE[1][0] else ROOF_PROFILE[1:]
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])


# Single profile extruded through depth: no invented middle foot or side-view roof.
for side in range(2):
    a, b = ROOF_PROFILE[side:side + 2]
    for i in range(3):
        x0 = a[0] + (b[0] - a[0]) * i / 3
        x1 = a[0] + (b[0] - a[0]) * (i + 1) / 3
        y0, y1 = roof_height(x0), roof_height(x1)
        verts = [point((x, y + offset, z)) for z in (-ROOF_HALF_DEPTH, ROOF_HALF_DEPTH)
                 for x, y, offset in ((x0, y0, 0), (x1, y1, 0), (x1, y1, -0.11), (x0, y0, -0.11))]
        mesh = bpy.data.meshes.new(f'roof_slope_{side}_board_{i}')
        # Game->Blender mapping is orientation-preserving; outward winding on every face.
        mesh.from_pydata(verts, [], [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
                                   (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])
        mesh.update()
        obj = bpy.data.objects.new(mesh.name, mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, mesh.name, ROOF)

for ix, x in enumerate((-POST_X, POST_X)):
    inward = x * 0.94
    top = roof_height(inward) - 0.13
    for iz, z in enumerate((-POST_Z, POST_Z)):
        beam(f'post_{ix}_{iz}', (x, 0, z), (inward, top, z), SECTION, SECTION)
    beam(f'eave_support_{ix}', (inward, top, -0.59), (inward, top, 0.59), 0.18, 0.14)
    for j, y in enumerate((0.60, 0.82)):
        beam(f'side_rail_{ix}_{j}', (x * 0.98, y, -POST_Z), (x * 0.98, y, POST_Z), 0.10, 0.12)

# Front/rear rafters visibly support the six boards across their seams.
for iz, z in enumerate((-POST_Z, POST_Z)):
    for side, (x0, x1) in enumerate(((-0.94, 0.40), (0.40, 0.94))):
        beam(f'rafter_{iz}_{side}', (x0, roof_height(x0) - 0.15, z),
             (x1, roof_height(x1) - 0.15, z), 0.14, 0.14)

for i in range(3):
    x = (i - 1) * 0.49
    beam(f'bed_board_{i}', (x, BED_TOP - 0.06, -0.53), (x, BED_TOP - 0.06, 0.53), 0.50, 0.12)
for name, z in (('front_lip', 0.54), ('rear_bearer', -0.54)):
    beam(name, (-0.83, 0.36, z), (0.83, 0.36, z), 0.18, 0.16)
beam('back_brace', (-0.72, 0.43, -0.50), (0.74, 1.65, -0.50), 0.16, 0.14)

# Three independently named logs keep stock representation separable for slice 2.
# A broad bark rim is topology in the closed cap, not a floating decal or fine ring.
for i, (x, y) in enumerate(((-0.04, 0.57), (0.34, 0.57), (0.15, 0.90))):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=LOG_RADIUS, depth=LOG_LENGTH, location=point((x, y, 0.04)))
    obj = bpy.context.object
    obj.name = f'log_{i}'
    obj.rotation_euler.x = math.pi / 2
    obj.data.materials.append(BARK)
    obj.data.materials.append(END)
    for face in obj.data.polygons:
        face.material_index = 1 if len(face.vertices) == 12 else 0
    bevel = obj.modifiers.new('bark_cap_rim', 'BEVEL')
    bevel.width = 0.018
    bevel.segments = 1
    bevel.affect = 'EDGES'
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(40)
    bevel.material = 0

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
