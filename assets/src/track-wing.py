"""The track machine's wing: a second hand on its own post over the up track, tied to the flatbed's header by a
telescoping arm (docs/brainstorms/track-layers-double.md). Original Boogle model; metres, game +Y up / +Z ahead.

Same style and palette as track-layer.py (copied helpers, one mesh per material and body; keep both in step).
Game (x,y,z) -> Blender (x,-z,y); Y-up glTF restores game axes. No empties are exported.

Three frames, each node's origin is its frame's zero (runtime wraps a moving node in a pivot group and slides it):
- POST frame: origin at the post's foot on the up track's rail level, +x OUTBOARD (away from the flatbed), +z ahead.
  The runtime puts it at the flatbed's rig frame (side * gap, 0, 1.2) and mirrors x for the machine's other side.
  wing_paint_mast (fixed), wing_paint_truck + wing_iron_truck (slide up 0..0.9 m), wing_paint_platform +
  wing_cream_shelf (slide along x: the up stack's platform, centre x from +0.55 folded to -1.1 open),
  lay_* (the hand: beam, trolley, hoist sleeve, jaw; same names and rules as track-layer's).
- ARM frame: origin at the hinge on the flatbed header's end (x 1.3 outboard of the gantry column, y 3.55, z 0),
  +z along the arm. wing_paint_hinge (fixed to the machine, bracket under the header end), wing_paint_arm (outer
  tube, turns about the hinge), wing_cream_arm_0..2 (three stages, each slides along +z by (L - 1.2) * (i + 1) / 3,
  L being the hinge to post-tip distance, so the last tip lands on the mast at every gap).
"""
import math
import sys
import bpy
import bmesh
from mathutils import Matrix, Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
BEVEL = 0.008
BIG_BEVEL = 0.015


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


def part(name, color, build, origin=(0, 0, 0)):
    bm = bmesh.new()
    bm.edges.layers.float.new('bevel_weight_edge')
    build(bm)
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
    mesh.materials.append(mat)


ORANGE = (198 / 255, 90 / 255, 22 / 255)
CREAM = (197 / 255, 171 / 255, 104 / 255)
STEEL = (16 / 255, 28 / 255, 41 / 255)
BEAM = 5.8  # The wing's own reach (WING_BEAM_LENGTH in machine-panels.ts); the main hand keeps 7.0.
PLATFORM_W = 1.9  # Holds the stack (rail bases to +/-0.95 m about its centre) and clears the gantry's side beam.
PLATFORM_L = 3.2
DECK_TOP = 2.78
STACK_Y = 2.86  # Rail bases (STACK.y); cream shelf bars carry them.
ARM_Y = 3.55
ARM_STAGE = 1.2
RAIL_TOP = 0.235  # Native kit rail top above rail level.


def mast(bm):
    # Post: a square mast over the truck's stem, a short header carrying the slewing beam, the arm's pin lug.
    box(bm, 0, 2.65, 0, 0.3, 2.7, 0.3, BIG_BEVEL)
    box(bm, 0, 4.0, 0, 1.3, 0.22, 0.3, BIG_BEVEL)
    cylinder(bm, 0, 3.86, 0, 0.2, 0.08, axis='y')
    box(bm, 0, ARM_Y, 0, 0.42, 0.34, 0.42, BIG_BEVEL)  # arm lug
    cylinder(bm, 0, ARM_Y, 0, 0.09, 0.5, axis='y')  # arm pin
    # Pocket the platform's rib slides through.
    box(bm, 0, 2.39, 0.1, 0.6, 0.3, 0.42, BIG_BEVEL)
    # Footplate under the mast's lower end so the lifted truck docks against something.
    box(bm, 0, 1.33, 0, 0.5, 0.06, 0.5, BIG_BEVEL)


def truck_paint(bm):
    box(bm, 0, 1.0, 0, 0.24, 2.0, 0.24)  # stem; its top stays inside the mast at full lift
    box(bm, 0, 0.57, 0, 1.3, 0.14, 0.62, BIG_BEVEL)  # bogie frame
    for x in (-0.5, 0.5):
        for z in (-0.22, 0.22):
            box(bm, x, 0.46, z, 0.14, 0.12, 0.18)  # axle boxes


def truck_iron(bm):
    for x in (-0.5, 0.5):
        for z in (-0.22, 0.22):
            cylinder(bm, x, RAIL_TOP + 0.12, z, 0.12, 0.07, axis='x')  # wheel on the rail
    for z in (-0.22, 0.22):
        cylinder(bm, 0, RAIL_TOP + 0.12, z, 0.03, 1.1)  # axle across the track


def platform_paint(bm):
    box(bm, 0, DECK_TOP - 0.04, 1.5, PLATFORM_W, 0.08, PLATFORM_L, BIG_BEVEL)
    for side in (-1, 1):
        box(bm, side * (PLATFORM_W / 2 - 0.03), DECK_TOP + 0.05, 1.5, 0.06, 0.1, PLATFORM_L)  # edge lips
    # Rib the post's pocket holds: spans [c - 0.55, c + 1.1] so it stays in the pocket over the whole 1.65 m of slide.
    box(bm, 0.275, 2.39, 0.1, 1.65, 0.18, 0.22, BIG_BEVEL)
    for x in (-0.3, 0.3, 0.9):
        box(bm, x, 2.58, 0.1, 0.1, 0.22, 0.12)  # webs rib to deck
    for side in (-1, 1):
        box(bm, side * 0.7, 2.58, 1.5, 0.1, 0.16, PLATFORM_L - 0.3)  # under-deck joists


def shelf_cream(bm):
    # As the gantry's: two cross bars the rail bases lie on, low end stops outboard of the columns.
    for z in (0.75, 2.2):
        box(bm, 0, STACK_Y - 0.04, z, PLATFORM_W, 0.08, 0.14, BIG_BEVEL)
        for side in (-1, 1):
            box(bm, side * 0.97, STACK_Y + 0.08, z, 0.06, 0.24, 0.14)


def hinge_paint(bm):
    # Bracket hung from the header's end (header end face is 0.1 m inboard of the pin), with a pin seat.
    box(bm, -0.08, 0.2, 0, 0.36, 0.5, 0.3, BIG_BEVEL)
    cylinder(bm, 0, 0, 0, 0.1, 0.5, axis='y')


def arm_outer(bm):
    box(bm, 0, 0, ARM_STAGE / 2, 0.24, 0.24, ARM_STAGE, BIG_BEVEL)
    cylinder(bm, 0, 0, 0, 0.15, 0.3, axis='y')


def arm_stage(bm, width):
    box(bm, 0, 0, ARM_STAGE / 2, width, width, ARM_STAGE, BIG_BEVEL)


part('wing_paint_mast', ORANGE, mast)
part('wing_paint_truck', ORANGE, truck_paint)
part('wing_iron_truck', STEEL, truck_iron)
part('wing_paint_platform', ORANGE, platform_paint)
part('wing_cream_shelf', CREAM, shelf_cream)
part('wing_paint_hinge', ORANGE, hinge_paint)
part('wing_paint_arm', ORANGE, arm_outer)
for i, width in enumerate((0.2, 0.17, 0.14)):
    part(f'wing_cream_arm_{i}', CREAM, lambda bm, w=width: arm_stage(bm, w))

# The hand: the track-layer's own parts at the wing's shorter beam, same names so panelMechanism.install takes them.
part('lay_gantry_beam', ORANGE, lambda bm: box(bm, 0, 0, BEAM / 2, 0.26, 0.24, BEAM, BIG_BEVEL))
part('lay_paint_trolley', ORANGE, lambda bm: box(bm, 0, 0, 0, 0.65, 0.35, 0.7, BIG_BEVEL))
part('lay_cream_upper', CREAM, lambda bm: box(bm, 0, 0.725, 0, 0.32, 1.45, 0.32, BIG_BEVEL))


def jaw(bm, side):
    for z in (-1.0, 1.0):
        box(bm, side * 0.58, -0.12, z, 0.12, 0.32, 0.22)
        box(bm, side * 0.51, -0.25, z, 0.22, 0.08, 0.22)
    box(bm, side * 0.58, 0, 0, 0.13, 0.12, 2.25)


part('lay_cream_jaw_left', CREAM, lambda bm: jaw(bm, -1))

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
