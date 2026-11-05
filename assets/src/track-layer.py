"""Original compact crawler/gantry; metres, game +Y up/+Z working end.

Canonical recipe: closed primitive solids, one mesh per material/body frame.
Game (x,y,z) -> Blender (x,-z,y); Y-up glTF restores game axes.
Power-unit origin is 3.7 m behind working deck; no exported empties required.
"""
import math
import sys
import bpy
import bmesh
from mathutils import Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)
GAP = 3.7
DECK = 0.7
BEVEL = 0.008  # Narrow rack/grille solids must not clamp into zero-area bevel faces.


def box(bm, x, y, z, w, h, d):
    vs = bmesh.ops.create_cube(bm, size=1)['verts']
    bmesh.ops.scale(bm, verts=vs, vec=(w, d, h))
    bmesh.ops.translate(bm, verts=vs, vec=(x, -z, y))


def cylinder(bm, x, y, z, radius, length, axis='x'):
    vs = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12,
                               radius1=radius, radius2=radius, depth=length)['verts']
    if axis == 'x':
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    bmesh.ops.translate(bm, verts=vs, vec=(x, -z, y))


def part(name, color, build):
    bm = bmesh.new()
    build(bm)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel = obj.modifiers.new('broad_edges', 'BEVEL')
    bevel.width = BEVEL
    bevel.segments = 1
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(40)
    bevel.harden_normals = True
    obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    mat = bpy.data.materials.new(name)
    # Authored swatches are linear; runtime assigns the existing Boogle presets.
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = mat.diffuse_color
    mesh.materials.append(mat)


def power_paint(bm):
    # Covers the unchanged 1.6 x 3 x 1.75 m rideable block; no boiler or cab.
    # Body ends at 1.71; the trim alone supplies the unchanged 1.75 m standing top.
    box(bm, 0, 1.13, -GAP, 1.6, 1.16, 3)
    box(bm, 0, 1.57, -GAP + 1.45, 1.3, 0.28, 0.16)


def power_iron(bm):
    for x in (-0.58, 0.58):
        box(bm, x, 0.39, -GAP, 0.44, 0.6, 3)
        for k in range(10):
            box(bm, x, 0.12, -GAP - 1.32 + k * 0.294, 0.48, 0.13, 0.12)
    # Broad radiator slits and a short work-machine exhaust at the old smoke socket.
    for x in (-0.48, -0.24, 0, 0.24, 0.48):
        box(bm, x, 1.25, -GAP + 1.51, 0.1, 0.48, 0.035)
    cylinder(bm, 0, 2.06, -GAP + 1.05, 0.14, 0.72, 'y')
    cylinder(bm, 0, 2.44, -GAP + 1.05, 0.21, 0.12, 'y')


def power_trim(bm):
    for x in (-0.81, 0.81):
        for z in (-1.12, -0.37, 0.37, 1.12):
            cylinder(bm, x, 0.4, -GAP + z, 0.23, 0.07)
    # Bright flat top tells the truth about the existing standable surface.
    box(bm, 0, 1.73, -GAP, 1.58, 0.04, 2.98)


def deck_wood(bm):
    box(bm, 0, DECK - 0.09, 0, 2.2, 0.18, 3.2)


def deck_iron(bm):
    box(bm, 0, 0.37, 0, 1.76, 0.3, 3.04)
    for x in (-0.82, 0.82):
        box(bm, x, 0.28, 0, 0.4, 0.3, 2.9)
    for side in (-1, 1):
        for z in (-1.05, 1.05):
            box(bm, side * 1.3, 0.59, z, 0.5, 0.06, 0.1)
            box(bm, side * 1.54, 0.87, z, 0.05, 0.62, 0.1)


def deck_gantry(bm):
    # Open above the unchanged full magazine (highest log top ~2.4 m).
    for side in (-1, 1):
        box(bm, side * 1.02, 1.65, 1.32, 0.16, 1.9, 0.2)
        box(bm, side * 1.02, 2.68, 1.0, 0.2, 0.2, 2.55)
    box(bm, 0, 2.68, 1.32, 2.24, 0.24, 0.32)
    box(bm, 0, 2.68, 2.2, 2.24, 0.2, 0.2)
    # Rail guide arm keeps the original held rail's attachment location.
    box(bm, 0.5, 1.27, 1.75, 0.1, 0.1, 1.5)
    box(bm, 0.5, 1.0, 1.1, 0.1, 0.5, 0.1)
    box(bm, 0.5, 1.11, 2.45, 0.12, 0.26, 0.12)


def deck_cream(bm):
    for z in (-0.05, 1.45):
        box(bm, 0, DECK + 0.21, z, 1.5, 0.42, 0.08)
    for side in (-1, 1):
        box(bm, side * 0.75, DECK + 0.21, 0.7, 0.08, 0.42, 1.5)
    # Large guide cheeks read as a laying mouth, clear of the rear chairs.
    for x in (-0.94, 0.94):
        box(bm, x, 0.65, 1.85, 0.16, 0.18, 0.65)


part('power_paint', (0.87, 0.18, 0.025), power_paint)
part('power_iron', (0.018, 0.02, 0.025), power_iron)
part('power_trim', (0.85, 0.66, 0.25), power_trim)
part('deck_wood', (0.32, 0.2, 0.095), deck_wood)
part('deck_iron', (0.018, 0.02, 0.025), deck_iron)
part('deck_gantry', (0.87, 0.18, 0.025), deck_gantry)
part('deck_cream', (0.8, 0.65, 0.37), deck_cream)

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
