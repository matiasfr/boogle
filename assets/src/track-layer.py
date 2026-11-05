"""Original compact crawler/gantry; metres, game +Y up/+Z working end.

Canonical recipe: closed primitive solids, one mesh per material/body frame.
Game (x,y,z) -> Blender (x,-z,y); Y-up glTF restores game axes.
Power-unit origin is 3.7 m behind working deck; no exported empties required.
"""
import math
import sys
import bpy
import bmesh
from mathutils import Matrix, Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
GAP = 3.7
DECK = 0.7
BEVEL = 0.008  # Narrow rack/grille solids must not clamp into zero-area bevel faces.
BIG_BEVEL = 0.015  # One segment, same envelope: highlight the large forms, step and chair shells.
CHAIR_X = (-0.55, 0.55)
CHAIR_Z = -1.15


def weight_edges(bm, vs, width, angle_only=False):
    bm.normal_update()
    layer = bm.edges.layers.float.get('bevel_weight_edge')
    for edge in {e for v in vs for e in v.link_edges}:
        if not angle_only or edge.calc_face_angle(0) > math.radians(40):
            edge[layer] = width / BIG_BEVEL


def box(bm, x, y, z, w, h, d, bevel=BEVEL):
    vs = bmesh.ops.create_cube(bm, size=1)['verts']
    bmesh.ops.scale(bm, verts=vs, vec=(w, d, h))
    bmesh.ops.translate(bm, verts=vs, vec=(x, -z, y))
    weight_edges(bm, vs, bevel)


def cylinder(bm, x, y, z, radius, length, axis='x', tilt=0):
    vs = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12,
                               radius1=radius, radius2=radius, depth=length)['verts']
    if axis == 'x':
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if tilt:
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(tilt), 3, 'X'))
    bmesh.ops.translate(bm, verts=vs, vec=(x, -z, y))
    weight_edges(bm, vs, BEVEL, True)


def grab_rail(bm, x):
    # Closed eight-sided sweep, wholly inside the existing step width/depth. Clear middle stays 2.51 m.
    path = [(DECK, -2.12), (DECK + 0.52, -2.12), (DECK + 0.68, -2.04),
            (DECK + 0.68, -1.74), (DECK + 0.52, -1.66), (DECK, -1.66)]
    centres = [Vector((x, -z, y)) for y, z in path]
    rings = []
    for i, centre in enumerate(centres):
        tangent = (centres[min(i + 1, len(centres) - 1)] - centres[max(0, i - 1)]).normalized()
        side = tangent.cross(Vector((1, 0, 0)))
        rings.append([bm.verts.new(centre + 0.045 * (Vector((1, 0, 0)) * math.cos(k * math.tau / 8)
                                                   + side * math.sin(k * math.tau / 8))) for k in range(8)])
    for a, b in zip(rings, rings[1:]):
        for k in range(8):
            bm.faces.new((a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k]))
    bm.faces.new(tuple(reversed(rings[0])))
    bm.faces.new(tuple(rings[-1]))


def part(name, color, build):
    bm = bmesh.new()
    bm.edges.layers.float.new('bevel_weight_edge')
    build(bm)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel = obj.modifiers.new('broad_edges', 'BEVEL')
    bevel.width = BIG_BEVEL
    bevel.segments = 1
    bevel.limit_method = 'WEIGHT'
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
    box(bm, 0, 1.13, -GAP, 1.6, 1.16, 3, BIG_BEVEL)
    box(bm, 0, 1.57, -GAP + 1.45, 1.3, 0.28, 0.16, BIG_BEVEL)


def power_iron(bm):
    for x in (-0.58, 0.58):
        box(bm, x, 0.39, -GAP, 0.44, 0.6, 3)
        for k in range(10):
            box(bm, x, 0.12, -GAP - 1.32 + k * 0.294, 0.48, 0.13, 0.12)
    # Broad radiator slits and a short work-machine exhaust at the old smoke socket.
    for x in (-0.48, -0.24, 0, 0.24, 0.48):
        box(bm, x, 1.25, -GAP + 1.51, 0.1, 0.48, 0.035)
    cylinder(bm, 0, 2.06, -GAP + 1.05, 0.14, 0.72, 'y')
    cylinder(bm, 0, 2.44, -GAP + 1.05, 0.21, 0.12, 'y', tilt=8)


def power_trim(bm):
    for x in (-0.81, 0.81):
        for z in (-1.12, -0.37, 0.37, 1.12):
            cylinder(bm, x, 0.4, -GAP + z, 0.23, 0.07)
    # Bright flat top tells the truth about the existing standable surface.
    box(bm, 0, 1.73, -GAP, 1.58, 0.04, 2.98, BIG_BEVEL)


def deck_wood(bm):
    box(bm, 0, DECK - 0.09, 0, 2.2, 0.18, 3.2, BIG_BEVEL)


def chair_wood(bm):
    # Same machine chair transforms/dimensions as seatMesh; bake only this machine's static furniture.
    for x in CHAIR_X:
        box(bm, x, DECK + 0.49, CHAIR_Z, 0.8, 0.12, 0.65, BIG_BEVEL)
        for side in (-0.3, 0.3):
            box(bm, x + side, DECK + 0.23, CHAIR_Z, 0.12, 0.46, 0.55, BIG_BEVEL)


def chair_teal(bm):
    for x in CHAIR_X:
        box(bm, x, DECK + 0.95, CHAIR_Z - 0.3, 0.8, 0.8, 0.12, BIG_BEVEL)


def deck_iron(bm):
    box(bm, 0, 0.37, 0, 1.76, 0.3, 3.04)
    for x in (-0.82, 0.82):
        box(bm, x, 0.28, 0, 0.4, 0.3, 2.9)
    for side in (-1, 1):
        for z in (-1.05, 1.05):
            box(bm, side * 1.3, 0.59, z, 0.5, 0.06, 0.1)
            box(bm, side * 1.54, 0.87, z, 0.05, 0.62, 0.1)
    # Four intentional open decal faces on the REAR vertical lip, offset 1 mm to avoid z-fighting.
    for x in (-1.05, -0.39, 0.27, 0.93):
        points = [(x, DECK - 0.145), (x + 0.23, DECK - 0.145),
                  (x + 0.13, DECK - 0.015), (x - 0.1, DECK - 0.015)]
        verts = [bm.verts.new((px, 2.201, py)) for px, py in points]
        bm.faces.new(tuple(reversed(verts)))


def deck_gantry(bm):
    # Open above the unchanged full magazine (highest log top ~2.4 m).
    for side in (-1, 1):
        box(bm, side * 1.02, 1.65, 1.32, 0.16, 1.9, 0.2, BIG_BEVEL)
        box(bm, side * 1.02, 2.68, 1.0, 0.2, 0.2, 2.55, BIG_BEVEL)
    box(bm, 0, 2.68, 1.32, 2.24, 0.24, 0.32, BIG_BEVEL)
    box(bm, 0, 2.68, 2.2, 2.24, 0.2, 0.2, BIG_BEVEL)
    # Rail guide arm keeps the original held rail's attachment location.
    box(bm, 0.5, 1.27, 1.75, 0.1, 0.1, 1.5)
    box(bm, 0.5, 1.0, 1.1, 0.1, 0.5, 0.1)
    box(bm, 0.5, 1.11, 2.45, 0.12, 0.26, 0.12)


def deck_cream(bm):
    box(bm, 0, DECK - 0.08, -1.9, 2.8, 0.16, 0.6, BIG_BEVEL)
    for x in (-1.3, 1.3):
        grab_rail(bm, x)
    for z in (-0.05, 1.45):
        box(bm, 0, DECK + 0.21, z, 1.5, 0.42, 0.08)
    for side in (-1, 1):
        box(bm, side * 0.75, DECK + 0.21, 0.7, 0.08, 0.42, 1.5)
    # Large guide cheeks read as a laying mouth, clear of the rear chairs.
    for x in (-0.94, 0.94):
        box(bm, x, 0.65, 1.85, 0.16, 0.18, 0.65)


ORANGE = (198 / 255, 90 / 255, 22 / 255)
CREAM = (197 / 255, 171 / 255, 104 / 255)
STEEL = (16 / 255, 28 / 255, 41 / 255)
part('power_paint', ORANGE, power_paint)
part('power_iron', STEEL, power_iron)
part('power_trim', CREAM, power_trim)
part('deck_wood', (0.32, 0.2, 0.095), deck_wood)
part('chair_wood', (0.32, 0.2, 0.095), chair_wood)
part('deck_iron', STEEL, deck_iron)
part('deck_gantry', ORANGE, deck_gantry)
part('deck_cream', CREAM, deck_cream)
part('chair_teal', (36 / 255, 86 / 255, 83 / 255), chair_teal)

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
