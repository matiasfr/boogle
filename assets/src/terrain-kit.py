# The cliff kit, first the canyon's (docs/plans/terrain-clean.md, Part 3; Chunky Sunshine blocks, docs/decisions-look.md
# d-2026-11-24-canyon-kit-chunky-sunshine): big sandstone faces made of stacked, deeply bevelled blocks, broken rim caps,
# boulders and low bank rock, and the shore's sea-cliff faces, low face, corner and shore rocks. Built from scratch by Blender's Python, exported by `npm run assets`:
#   Blender -b --factory-startup --python assets/src/terrain-kit.py -- <raw.glb>
# Pieces are authored in the game's axes (x across the piece, y up, z out of the wall toward the viewer; see `G`), with
# the origin at the middle of the piece's base front edge (boulders: the middle of their base). One object per piece; code
# draws each as an instance batch with one shared rock material (src/prefab/builders/terrain-kit.ts). Colour lives in
# code: the only colour here is COLOR_0's grey, a per-block shade the material multiplies into the ground's rock pigment.
# Seeded, so a rebuild is the same kit. Revision parameters are the constants below.
import math
import random
import sys
import bmesh
import bpy
from mathutils import Matrix

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

ROW = 2.4  # m, one block course: the ground's strata bed (src/place/ground-layers.ts STRATA)
FACE_ROWS = 6  # courses in a face: 14.4 m, most of the gorge's 20 to 28 m wall above the bench
LEAN = 0.32  # m each course steps back into the wall (about 7.6 degrees)
BEVEL = 0.22  # m, the deep chamfer that makes the blocks read chunky from the path
SHADE = (0.84, 1.08)  # per-block shade range
# The shore's pieces (docs/plans/cliff-kit-everywhere.md, step 1): sea-cliff faces two courses over a wave-cut foot, so
# about 6 m (the cove's bluff stands 4.5 m over its beach); a low face of one course and a short broken top, about 3 m;
# an outside corner of sea-cliff courses; low dark shore rocks at the waterline.
SEA_ROWS = 2
SEA_FOOT = 1.2  # m, the wave-cut foot's height
SEA_TOP = (0.9, 1.0)  # of a course: a near-level top, since the sea faces' tops are flush with the walk behind them
UNDERCUT = 0.45  # m the foot stands back under the courses
FOOT_SHADE = (0.58, 0.72)  # darker: wet rock at the waterline
CORNER = 4.0  # m, each leg of the corner


def G(x, y, z):
    """Game (x, y up, z) to Blender (x, -z, y); the exporter's Y-up turns it back."""
    return (x, -z, y)


def block(bm, shade_layer, w, h, d, x, y, z, jitter=0.0, rng=None, shade=1.0):
    """A box w x h x d (game axes) whose base front middle is at (x, y, z); it reaches back to z - d. `jitter` moves
    each corner a little so no two blocks are square."""
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    bmesh.ops.scale(bm, verts=vs, vec=(w, d, h))
    bmesh.ops.translate(bm, verts=vs, vec=G(x, y + h / 2, z - d / 2))
    if jitter and rng:
        for v in vs:
            v.co.x += rng.uniform(-jitter, jitter)
            v.co.y += rng.uniform(-jitter, jitter)
            v.co.z += rng.uniform(-jitter, jitter) * 0.6
    for f in {f for v in vs for f in v.link_faces}:
        for loop in f.loops:
            loop[shade_layer] = (shade, shade, shade, 1.0)
    return vs


def piece(name, build, bevel=BEVEL, segments=1):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    shade_layer = bm.loops.layers.float_color.new('Color')
    build(bm, shade_layer)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if bevel:
        m = ob.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = segments
        m.limit_method = 'ANGLE'
        m.angle_limit = math.radians(30)
        m.harden_normals = False
    # Flat: every face its own normal, the chunky facets the previz painted.
    me.shade_flat()
    return ob


def courses(bm, shade_layer, rng, x0, x1, rows, foot=0.0, top_range=(0.3, 1.0)):
    """Coursed sandstone from x0 to x1 (game x), its front at z 0: `rows` courses, each stepped back by LEAN. A third
    of the blocks stand two courses tall, so a face reads as big broken slabs rather than coursed masonry; each block
    stands a little proud or shy and leans a few degrees; the top is broken into uneven heights (`top_range` of a
    course). Blocks are 1.4 to 2.2 m deep, so terrain behind shows only at a gap, never a hole. `foot` m: a wave-cut foot
    under the courses, a darker band of low blocks set back UNDERCUT under them (drawn only: the solid stays a plain
    leaning slab, no overhang)."""
    if foot:
        x = x0
        while x < x1 - 0.4:
            w = min(rng.uniform(1.2, 2.4), x1 - x)
            block(bm, shade_layer, w - 0.06, foot, rng.uniform(1.6, 2.2), x + w / 2, 0, -UNDERCUT + rng.uniform(-0.1, 0.1),
                  jitter=0.12, rng=rng, shade=rng.uniform(*FOOT_SHADE))
            x += w
    tall = []  # (x0, x1) spans the course below already filled with a two-course block
    for row in range(rows):
        y = foot + row * ROW
        back = row * LEAN
        top = row == rows - 1
        spans, tall = tall, []
        x = x0
        while x < x1 - 0.4:
            skip = next((s for s in spans if s[0] <= x + 0.01 < s[1]), None)
            if skip:
                x = skip[1]
                continue
            limit = min([s[0] for s in spans if s[0] > x + 0.01] + [x1])
            w = min(rng.uniform(1.8, 3.8), limit - x)
            if limit - x - w < 1.1:
                w = limit - x
            two = not top and row < rows - 2 and rng.random() < 0.35
            h = ROW * (rng.uniform(*top_range) if top else (2 if two else 1) * rng.uniform(0.96, 1.02))
            if two:
                tall.append((x, x + w))
            vs = block(
                bm,
                shade_layer,
                w - 0.08,
                h,
                rng.uniform(1.4, 2.2),
                x + w / 2,
                y,
                -back + rng.uniform(-0.4, 0.5),
                jitter=0.16,
                rng=rng,
                shade=rng.uniform(*SHADE),
            )
            centre = G(x + w / 2, y + h / 2, -back)
            bmesh.ops.rotate(bm, verts=vs, cent=centre, matrix=Matrix.Rotation(rng.uniform(-0.07, 0.07), 3, 'X'))
            bmesh.ops.rotate(bm, verts=vs, cent=centre, matrix=Matrix.Rotation(rng.uniform(-0.05, 0.05), 3, 'Y'))
            x += w


def face(width, seed, rows=FACE_ROWS, foot=0.0, top_range=(0.3, 1.0)):
    """A sandstone face `width` m wide (`courses` across it); the canyon's are FACE_ROWS courses, 14.4 m."""

    def build(bm, shade_layer):
        courses(bm, shade_layer, random.Random(seed), -width / 2, width / 2, rows, foot, top_range)

    return build


def corner(seed):
    """An outside corner, 90 degrees, for a headland's nose: two CORNER m legs of sea-cliff courses meeting at the
    origin (the corner's foot), one facing +z along -x, the other facing +x along -z. Leg A runs 0.25 m past the corner,
    a quoin over the other leg's end."""

    def build(bm, shade_layer):
        rng = random.Random(seed)
        before = set(bm.verts)
        courses(bm, shade_layer, rng, 0.25, CORNER, SEA_ROWS, SEA_FOOT, SEA_TOP)
        leg = [v for v in bm.verts if v not in before]
        # Game yaw +90 degrees, (x, z) -> (z, -x): Blender's +90 degrees about its Z.
        bmesh.ops.rotate(bm, verts=leg, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Z'))
        courses(bm, shade_layer, rng, -CORNER, 0.25, SEA_ROWS, SEA_FOOT, SEA_TOP)

    return build


def shore_rock(size, height, seed):
    """Low dark rock at the waterline, `size` m across: a flat slab, a smaller one leaning on it and a chip; at most
    `height` m tall, sunk a little. Origin the middle of its base."""

    def build(bm, shade_layer):
        rng = random.Random(seed)
        parts = ((size, 0.7 * size, height, 0, 0), (0.55 * size, 0.45 * size, 0.7 * height, 0.42 * size, 0.2 * size),
                 (0.3 * size, 0.3 * size, 0.45 * height, -0.45 * size, 0.18 * size))
        for w, d, h, x, z in parts:
            vs = block(bm, shade_layer, w, h, d, x, -0.12 * height, z + d / 2, jitter=0.1 * size, rng=rng,
                       shade=rng.uniform(*FOOT_SHADE))
            bmesh.ops.rotate(bm, verts=vs, cent=G(x, 0, z), matrix=Matrix.Rotation(rng.uniform(-0.5, 0.5), 3, 'Z'))

    return build


def rim_cap(bm, shade_layer):
    """A broken cap for a rim's lip, 4 m along it: three blocks of uneven height and set-back, 2.6 m deep."""
    rng = random.Random(31)
    x = -2.0
    for w in (1.3, 1.5, 1.2):
        h = rng.uniform(0.7, 1.6)
        block(bm, shade_layer, w - 0.05, h, rng.uniform(2.2, 2.8), x + w / 2, -0.4, rng.uniform(-0.3, 0.3),
              jitter=0.1, rng=rng, shade=rng.uniform(*SHADE))
        x += w


def boulder(size, seed):
    """One chunky block, a little squashed and leaning, `size` m across; origin the middle of its base."""

    def build(bm, shade_layer):
        rng = random.Random(seed)
        h = size * 0.72
        vs = block(bm, shade_layer, size, h, size * 0.86, 0, -0.12 * size, size * 0.43, jitter=0.12 * size, rng=rng,
                   shade=rng.uniform(*SHADE))
        # A second, smaller block leaning on it, so it reads as broken rock rather than a crate.
        block(bm, shade_layer, size * 0.55, h * 0.6, size * 0.5, size * 0.38, -0.1 * size, size * 0.62,
              jitter=0.08 * size, rng=rng, shade=rng.uniform(*SHADE))
        bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(0.12, 3, 'Y'))  # a lean

    return build


def bank_rock(bm, shade_layer):
    """Low rock at the waterline: three flat slabs, 3 m along the bank, at most 0.7 m tall."""
    rng = random.Random(53)
    for x, w, h in ((-0.9, 1.4, 0.55), (0.3, 1.2, 0.7), (1.1, 0.9, 0.4)):
        block(bm, shade_layer, w, h, rng.uniform(1.0, 1.5), x, -0.2, rng.uniform(0.3, 0.7), jitter=0.08, rng=rng,
              shade=rng.uniform(0.7, 0.9))


for name, build, bev in (
    ('face_6', face(6.0, 6), BEVEL),
    ('face_10', face(10.0, 10), BEVEL),
    ('rim_cap', rim_cap, 0.16),
    ('boulder_s', boulder(0.9, 101), 0.09),
    ('boulder_m', boulder(1.6, 102), 0.14),
    ('boulder_l', boulder(2.6, 103), 0.2),
    ('bank_rock', bank_rock, 0.08),
    ('sea_face_6', face(6.0, 206, SEA_ROWS, SEA_FOOT, SEA_TOP), BEVEL),
    ('sea_face_10', face(10.0, 210, SEA_ROWS, SEA_FOOT, SEA_TOP), BEVEL),
    ('low_face', face(5.0, 205, 2, 0.0, (0.2, 0.3)), BEVEL),
    ('sea_corner', corner(240), BEVEL),
    ('shore_rock_s', shore_rock(1.2, 0.45, 301), 0.1),
    ('shore_rock_m', shore_rock(2.0, 0.7, 302), 0.14),
    ('shore_rock_l', shore_rock(3.2, 1.0, 303), 0.18),
):
    piece(name, build, bev)

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_materials='NONE',
    export_vertex_color='ACTIVE',
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_animations=False,
    export_draco_mesh_compression_enable=False,  # meshopt is applied afterwards by gltf-transform
)
