"""Original rail-mounted gantry; metres, game +Y up/+Z working end.

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
# Seat/back heights above the deck top, in metres. Buddy sits with his feet on the deck, so the seat top is the
# height of his Driving_Loop hips (MACHINE_CHAIR_SEAT in src/proto/place/machine-model.ts is the same number).
CHAIR_SEAT = 0.32
CHAIR_BACK = 0.40
WHEEL_R = 0.13
AXLE_Y = 0.235 + WHEEL_R  # Native place-kit rail top; deck underside stays 0.52.


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


def part(name, color, build, origin=(0, 0, 0)):
    bm = bmesh.new()
    bm.edges.layers.float.new('bevel_weight_edge')
    build(bm)
    coloured_wheel = '_wheel_' in name
    if coloured_wheel:
        colours = bm.loops.layers.float_color.new('Color')
        for face in bm.faces:
            centre = face.calc_center_median()
            # Hub, spokes and crank pins are pale; the tread/flange stays steel.
            rgb = (0.82, 0.75, 0.54) if math.hypot(centre.y, centre.z) < 0.085 else (0.27, 0.32, 0.36)
            for loop in face.loops:
                loop[colours] = (*rgb, 1)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (origin[0], -origin[2], origin[1])
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
    if coloured_wheel:
        attr = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Color'
        mat.node_tree.links.new(attr.outputs['Color'], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    mesh.materials.append(mat)


def power_paint(bm):
    # Covers the unchanged 1.6 x 3 x 1.75 m rideable block; no boiler or cab.
    # Body ends at 1.71; the trim alone supplies the unchanged 1.75 m standing top.
    # Inset the bottom skirt; the unchanged broad standing top still covers the collider.
    profile = [(-0.52, 0.55), (0.52, 0.55), (0.8, 0.95),
               (0.8, 1.71), (-0.8, 1.71), (-0.8, 0.95)]
    ends = [[bm.verts.new((x, -z, y)) for x, y in profile] for z in (-GAP - 1.5, -GAP + 1.5)]
    bm.faces.new(ends[0])
    bm.faces.new(list(reversed(ends[1])))
    for k in range(6):
        bm.faces.new((ends[0][k], ends[1][k], ends[1][(k + 1) % 6], ends[0][(k + 1) % 6]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    weight_edges(bm, ends[0] + ends[1], BIG_BEVEL)
    box(bm, 0, 1.57, -GAP + 1.45, 1.3, 0.28, 0.16, BIG_BEVEL)


def power_iron(bm):
    # Broad radiator slits and a short work-machine exhaust at the old smoke socket.
    # Slats are seated into the body's +z face (z = -GAP + 1.5) and stand only 5 mm proud,
    # so no air gap or visible side wall shows from the rear step.
    for x in (-0.48, -0.24, 0, 0.24, 0.48):
        box(bm, x, 1.25, -GAP + 1.5 + 0.005 - 0.0275, 0.1, 0.48, 0.055)
    cylinder(bm, 0, 2.06, -GAP + 1.05, 0.14, 0.72, 'y')
    cylinder(bm, 0, 2.44, -GAP + 1.05, 0.21, 0.12, 'y', tilt=8)


def power_trim(bm):
    # Bright flat top tells the truth about the existing standable surface.
    box(bm, 0, 1.73, -GAP, 1.58, 0.04, 2.98, BIG_BEVEL)


def deck_wood(bm):
    box(bm, 0, DECK - 0.09, 0, 2.2, 0.18, 3.2, BIG_BEVEL)


def chair_wood(bm):
    # A low bench seat: a 12 cm plank on two side blocks, its top CHAIR_SEAT above the deck.
    for x in CHAIR_X:
        box(bm, x, DECK + CHAIR_SEAT - 0.06, CHAIR_Z, 0.8, 0.12, 0.65, BIG_BEVEL)
        for side in (-0.3, 0.3):
            box(bm, x + side, DECK + (CHAIR_SEAT - 0.12) / 2, CHAIR_Z, 0.12, CHAIR_SEAT - 0.12, 0.55, BIG_BEVEL)


def chair_teal(bm):
    # A short back rest rising CHAIR_BACK over the seat top, on the rear edge.
    for x in CHAIR_X:
        box(bm, x, DECK + CHAIR_SEAT + CHAIR_BACK / 2, CHAIR_Z - 0.3, 0.8, CHAIR_BACK, 0.12, BIG_BEVEL)


def deck_iron(bm):
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
    # Fixed high header carries the slewing laying beam, without a front wheel or support.
    for side in (-1, 1):
        box(bm, side * 1.02, 3.25, 0, 0.18, 1.5, 0.22, BIG_BEVEL)
    box(bm, 0, 4.0, 0, 2.4, 0.22, 0.3, BIG_BEVEL)
    # Slewing ring under the beam pivot.
    cylinder(bm, 0, 3.86, 0, 0.2, 0.08, axis='y')


def deck_cream(bm):
    box(bm, 0, DECK - 0.08, -1.9, 2.8, 0.16, 0.6, BIG_BEVEL)
    for x in (-1.3, 1.3):
        grab_rail(bm, x)
    # Rail stack shelf on the gantry's shoulders: two cross bars (rail bases at y 2.86, z 0.25..2.75)
    # and low end stops outboard of the six columns each side.
    for z in (0.75, 2.2):
        box(bm, 0, 2.82, z, 2.24, 0.08, 0.14, BIG_BEVEL)
        for side in (-1, 1):
            box(bm, side * 1.0, 2.98, z, 0.06, 0.24, 0.14)
    for z in (-0.05, 1.45):
        box(bm, 0, DECK + 0.21, z, 1.5, 0.42, 0.08)
    for side in (-1, 1):
        box(bm, side * 0.75, DECK + 0.21, 0.7, 0.08, 0.42, 1.5)
    # Large guide cheeks read as a laying mouth, clear of the rear chairs.
    for x in (-0.94, 0.94):
        box(bm, x, 0.65, 1.85, 0.16, 0.18, 0.65)


def bogie(bm, middle, half_span, top):
    # Inboard frame and bearings leave the outer wheel faces readable. No gameplay shapes.
    for x in (-0.32, 0.32):
        box(bm, x, 0.435, middle, 0.12, 0.11, 2 * half_span + 0.32, 0.004)
        for z in (middle - half_span, middle + half_span):
            box(bm, x, AXLE_Y, z, 0.14, 0.13, 0.18, 0.004)
    for z in (middle - half_span, middle + half_span):
        cylinder(bm, 0, AXLE_Y, z, 0.035, 1.38)
    box(bm, 0, (top + 0.45) / 2, middle, 1.38, top - 0.45, 0.18, 0.004)


def wheel(bm, side, crank=False):
    # Closed annular profile: inner flange, narrow tread and an open spoked centre.
    profile = [(-0.105, 0.09), (-0.105, 0.15), (-0.07, 0.15),
               (-0.07, WHEEL_R), (0.07, WHEEL_R), (0.07, 0.09)]
    rings = [[bm.verts.new((side * x, -r * math.sin(k * math.tau / 16),
                           r * math.cos(k * math.tau / 16))) for k in range(16)]
             for x, r in profile]
    for a, b in zip(rings, rings[1:] + rings[:1]):
        for k in range(16):
            bm.faces.new((a[k], a[(k + 1) % 16], b[(k + 1) % 16], b[k]))
    cylinder(bm, 0, 0, 0, 0.038, 0.17)
    if crank:
        cylinder(bm, side * 0.14, 0.07, 0, 0.027, 0.16)
    for k in range(3):
        vs = bmesh.ops.create_cube(bm, size=1)['verts']
        bmesh.ops.scale(bm, verts=vs, vec=(0.05, 0.025, 0.085))
        bmesh.ops.translate(bm, verts=vs, vec=(0, 0, 0.065))
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(k * math.tau / 3, 3, 'X'))
        weight_edges(bm, vs, 0.003)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))


def coupling_rod(bm):
    box(bm, 0, 0, 0, 0.045, 0.045, 1.6, 0.004)
    for z in (-0.8, 0.8):
        cylinder(bm, 0, 0, z, 0.045, 0.06)


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
part('power_bogie', STEEL, lambda bm: bogie(bm, -GAP, 0.8, 0.57))
part('deck_bogie', STEEL, lambda bm: bogie(bm, -0.9, 0.45, 0.52))
for body, zs in [('power', (-GAP - 0.8, -GAP + 0.8)), ('deck', (-1.35, -0.45))]:
    for axle, z in enumerate(zs):
        for side in (-1, 1):
            index = axle * 2 + (1 if side > 0 else 0)
            part(f'{body}_wheel_{index}', (0.27, 0.32, 0.36),
                 lambda bm, s=side, powered=body == 'power': wheel(bm, s, powered), (side * 0.52, AXLE_Y, z))
for i, side in enumerate((-1, 1)):
    part(f'power_rod_{i}', CREAM, coupling_rod, (side * 0.72, AXLE_Y + 0.07, -GAP))

# Logical origins are explicit runtime slide/pivot frames. Decode transforms stay on the meshes.
# Sleeve geometry extends UP from its sliding bottom; the three 1.45 m pieces overlap at full stroke.
# One rail pair per commit (at most 3.33 m) puts the deck 5.73 m behind the laying head, so the beam reaches 5.8 m
# (was 17.5 m behind 14.3 m panels). Runtime PANEL_BEAM_LENGTH must match; the level check measures both.
BEAM = 5.8
part('lay_gantry_beam', ORANGE, lambda bm: box(bm, 0, 0, BEAM / 2, 0.26, 0.24, BEAM, BIG_BEVEL))
part('lay_paint_trolley', ORANGE, lambda bm: box(bm, 0, 0, 0, 0.65, 0.35, 0.7, BIG_BEVEL))
for name, width in [('upper', 0.32), ('middle', 0.25), ('lower', 0.18)]:
    part(f'lay_cream_{name}', CREAM, lambda bm, w=width: box(bm, 0, 0.725, 0, w, 1.45, w, BIG_BEVEL))
def jaw(bm, side):
    for z in (-1.0, 1.0):
        box(bm, side * 0.58, -0.12, z, 0.12, 0.32, 0.22)
        box(bm, side * 0.51, -0.25, z, 0.22, 0.08, 0.22)
    box(bm, side * 0.58, 0, 0, 0.13, 0.12, 2.25)
# Cream jaws: dark steel jaws read as a second layer of rails over the stack.
part('lay_cream_jaw_left', CREAM, lambda bm: jaw(bm, -1))
part('lay_cream_jaw_right', CREAM, lambda bm: jaw(bm, 1))

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
