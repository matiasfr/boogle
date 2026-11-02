# The kit of ?proto=place&look=kit (src/proto/place/look-kit.ts): the pieces of the look chase's frame, with real bevels and
# hardened normals, in metres. Built from scratch by Blender's Python, exported by `npm run assets`:
#   Blender -b --factory-startup --python assets/src/place-kit.py -- <raw.glb>
# Pieces are authored in the game's axes (x across, y up, z along the line; see `G`), with the origin where code places them:
# the middle of the piece's base, except wheels and rollers (their axle). One object per piece and per material, because
# code draws each as an instance batch with a shared material; colour lives in code.
import math
import sys
import bmesh
import bpy

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def G(x, y, z):
    """Game (x, y up, z) to Blender (x, -z, y); the exporter's Y-up turns it back."""
    return (x, -z, y)


def box(bm, w, h, d, x=0.0, y=0.0, z=0.0):
    """A box w x h x d (game axes) whose base middle is at (x, y, z)."""
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=r['verts'], vec=(w, d, h))
    bmesh.ops.translate(bm, verts=r['verts'], vec=G(x, y + h / 2, z))
    return r['verts']


def cyl(bm, r0, r1, h, axis, x=0.0, y=0.0, z=0.0, seg=12):
    """A cylinder of length h along game axis 'x', 'y' or 'z', centred on (x, y, z). r0 at the negative end, r1 at the other."""
    r = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r0, radius2=r1, depth=h)
    vs = r['verts']
    if axis == 'x':
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=mat_rot(math.pi / 2, 'Y'))
    elif axis == 'z':
        # Blender's +z (the cone's r1 end) becomes the game's +z, which is Blender's -y.
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=mat_rot(math.pi / 2, 'X'))
    bmesh.ops.translate(bm, verts=vs, vec=G(x, y, z))
    return vs


def mat_rot(a, axis):
    from mathutils import Matrix

    return Matrix.Rotation(a, 3, axis)


def piece(name, build, bevel=0.015, segments=1):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if bevel:
        m = ob.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = segments
        m.limit_method = 'ANGLE'
        m.angle_limit = math.radians(40)
        m.harden_normals = True
    w = ob.modifiers.new('weight', 'WEIGHTED_NORMAL')
    w.keep_sharp = False
    return ob


# ---------------------------------------------------------------- the track
RAIL_X = 0.5  # the rails stand 1 m apart (src/proto/place/rail.ts)


def bolt(bm, x, y, z, r=0.022, h=0.03):
    cyl(bm, r, r, h, 'y', x, y + h / 2, z, seg=6)


def sleeper(bm):
    box(bm, 2.3, 0.12, 0.42)


def sleeper_steel(bm):
    # A tie plate under each rail, and its two spikes. The rail's foot sits on the sleeper's top.
    for s in (-1, 1):
        box(bm, 0.3, 0.018, 0.25, s * RAIL_X, 0.12, 0)
        for o in (-1, 1):
            bolt(bm, s * RAIL_X + o * 0.11, 0.135, o * 0.07)


def rail_profile():
    # Half of the section, foot to head: a real flat-bottom rail, 13.5 cm tall.
    return [(0.07, 0), (0.07, 0.012), (0.024, 0.032), (0.018, 0.085), (0.038, 0.1), (0.038, 0.135)]


def rail(bm):
    half = rail_profile()
    pts = half + [(-x, y) for x, y in reversed(half)]
    L = 3.05
    vs = [bm.verts.new(G(x, y, -L / 2)) for x, y in pts]
    face = bm.faces.new(vs)
    bmesh.ops.reverse_faces(bm, faces=[face])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=G(0, 0, L))
    # The joint at this length's far end: a plate either side of the web, six bolts through them.
    for s in (-1, 1):
        box(bm, 0.014, 0.055, 0.34, s * 0.03, 0.035, L / 2 - 0.17)
        for z in (-0.12, -0.04, 0.04, 0.12):
            cyl(bm, 0.016, 0.016, 0.02, 'x', s * 0.04, 0.062, L / 2 - 0.17 + z, seg=6)


def plank(bm):
    box(bm, 3.6, 0.12, 0.84)


def cap(bm):
    box(bm, 5, 0.55, 1)


def stringer(bm):
    box(bm, 0.8, 0.4, 6.6)


def post(bm):
    box(bm, 0.5, 1, 0.5)


def brace(bm):
    box(bm, 0.26, 1, 0.26)


# ---------------------------------------------------------------- the log: along x, the game's own 0.62 x 0.11 m piece
def log(bm):
    cyl(bm, 0.11, 0.11, 0.62, 'x', seg=12)


# ---------------------------------------------------------------- the stack frame and its feeder
def frame_post(bm):
    box(bm, 0.34, 1.25, 0.34)


def frame_tip(bm):
    box(bm, 0.42, 0.28, 0.42)


def beam_long(bm):
    box(bm, 0.14, 0.4, 2.6)


def beam_short(bm):
    box(bm, 2, 0.4, 0.14)


def frame_floor(bm):
    box(bm, 2, 0.1, 2.6)


def frame_board(bm):
    box(bm, 0.08, 0.55, 1.1)


def feeder_bed(bm):
    # Two side rails and a thin bed between: rollers run in it. x along the feed.
    for s in (-1, 1):
        box(bm, 3.2, 0.14, 0.07, 0, 0.44, s * 0.46)
    box(bm, 3.2, 0.03, 0.86, 0, 0.45, 0)


def feeder_leg(bm):
    box(bm, 0.1, 0.5, 0.7)


def roller(bm):
    cyl(bm, 0.075, 0.075, 0.86, 'z', seg=10)


# ---------------------------------------------------------------- the machine: the sizes of wagon/look.ts's cars, so its colliders still fit
def loco_body(bm):
    # A fat boiler with a smokebox front and a real cab: the toy red of the board, in one batch.
    cyl(bm, 0.58, 0.58, 1.95, 'z', 0, 1.2, 0.5, seg=24)
    cyl(bm, 0.62, 0.62, 0.18, 'z', 0, 1.2, 1.42, seg=24)
    box(bm, 1.5, 1.18, 1.0, 0, 0.82, -1.0)
    box(bm, 1.4, 0.32, 0.24, 0, 0.36, 1.58)  # buffer beam


def loco_brass(bm):
    for z in (0.0, 0.55, 1.05):
        cyl(bm, 0.6, 0.6, 0.07, 'z', 0, 1.2, z, seg=24)
    cyl(bm, 0.22, 0.2, 0.3, 'y', 0, 1.88, 0.25, seg=14)  # the steam dome


def loco_black(bm):
    box(bm, 1.6, 0.2, 3.0, 0, 0.6, 0)  # frame
    box(bm, 1.72, 0.1, 1.2, 0, 2.0, -1.0)  # cab roof
    for s in (-1, 1):
        box(bm, 0.04, 0.42, 0.5, s * 0.75, 1.42, -1.0)  # windows
    box(bm, 1.0, 0.42, 0.04, 0, 1.42, -0.48)
    cyl(bm, 0.19, 0.15, 0.62, 'y', 0, 1.98, 1.05, seg=14)  # chimney
    cyl(bm, 0.22, 0.3, 0.16, 'y', 0, 2.34, 1.05, seg=14)  # its lip


def wheel(bm):
    # r 1 x 0.12: scaled by code. A wheel with a rim, so its turning reads, and a crank boss.
    cyl(bm, 1.0, 1.0, 0.12, 'x', seg=20)
    cyl(bm, 0.72, 0.72, 0.15, 'x', seg=20)
    cyl(bm, 0.2, 0.2, 0.24, 'x', seg=8)
    box(bm, 0.17, 1.4, 0.16, 0, -0.7, 0)  # a spoke across it


def flat_deck(bm):
    box(bm, 2.2, 0.18, 3.2, 0, 0.52, 0)


def flat_black(bm):
    box(bm, 1.76, 0.3, 3.04, 0, 0.22, 0)
    for s in (-1, 1):
        # The rail rack's arms, down each side.
        for z in (-1.05, 1.05):
            box(bm, 0.5, 0.06, 0.1, s * 1.3, 0.56, z)
            box(bm, 0.05, 0.62, 0.1, s * 1.54, 0.56, z)


def flat_cream(bm):
    # The open cradle, in the flatbed's front half, and the sleeper chute off its nose.
    for z, w in ((1.45, 1.5), (-0.05, 1.5)):
        box(bm, w, 0.42, 0.08, 0, 0.7, z)
    for s in (-1, 1):
        box(bm, 0.08, 0.42, 1.5, s * 0.75, 0.7, 0.7)


def flat_guard(bm):
    # The cutter's rounded red guard, behind the cradle, with its feed slot left open on top.
    cyl(bm, 0.62, 0.62, 1.1, 'x', 0, 0.86, -0.82, seg=20)
    box(bm, 1.1, 0.3, 1.0, 0, 0.7, -0.82)


def flat_slot(bm):
    box(bm, 0.82, 0.3, 0.05, 0, 0.82, -0.2)


def flat_amber(bm):
    # The arm that reaches out over the head, its gripper's jaws (around x = 0.5) and the fork's uprights.
    box(bm, 0.1, 0.1, 1.5, 0.5, 1.22, 1.75)
    box(bm, 0.1, 0.5, 0.1, 0.5, 0.75, 1.1)
    box(bm, 0.12, 0.26, 0.12, 0.5, 0.98, 2.45)
    for s in (-1, 1):
        box(bm, 0.04, 0.2, 0.2, 0.5 + s * 0.06, 0.82, 2.45)


def fork(bm):
    # Two tines and a crossbar; code lowers it with the sleeper it holds.
    for s in (-1, 1):
        box(bm, 0.08, 0.05, 0.7, s * 0.8, 0, 0)
        box(bm, 0.08, 0.55, 0.08, s * 0.8, 0, -0.32)
    box(bm, 1.7, 0.08, 0.08, 0, 0.5, -0.32)


for name, build, bev, seg in (
    ('sleeper', sleeper, 0.02, 1),
    ('sleeper_steel', sleeper_steel, 0.0, 1),
    ('rail', rail, 0.0, 1),
    ('plank', plank, 0.018, 1),
    ('cap', cap, 0.04, 1),
    ('stringer', stringer, 0.03, 1),
    ('post', post, 0.03, 1),
    ('brace', brace, 0.025, 1),
    ('log', log, 0.012, 1),
    ('frame_post', frame_post, 0.03, 2),
    ('frame_tip', frame_tip, 0.04, 2),
    ('beam_long', beam_long, 0.018, 1),
    ('beam_short', beam_short, 0.018, 1),
    ('frame_floor', frame_floor, 0.015, 1),
    ('frame_board', frame_board, 0.012, 1),
    ('feeder_bed', feeder_bed, 0.01, 1),
    ('feeder_leg', feeder_leg, 0.012, 1),
    ('roller', roller, 0.008, 1),
    ('loco_body', loco_body, 0.04, 2),
    ('loco_brass', loco_brass, 0.012, 1),
    ('loco_black', loco_black, 0.02, 1),
    ('wheel', wheel, 0.03, 1),
    ('flat_deck', flat_deck, 0.025, 1),
    ('flat_black', flat_black, 0.015, 1),
    ('flat_cream', flat_cream, 0.018, 1),
    ('flat_guard', flat_guard, 0.03, 2),
    ('flat_slot', flat_slot, 0.0, 1),
    ('flat_amber', flat_amber, 0.012, 1),
    ('fork', fork, 0.012, 1),
):
    piece(name, build, bev, seg)

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_materials='NONE',
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_animations=False,
    export_draco_mesh_compression_enable=False,  # meshopt is applied afterwards by gltf-transform
)
