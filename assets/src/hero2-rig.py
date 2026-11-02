# The platformer hero (direction 2 of .look/previz/hero-platformer-proportions, the owner's pick, 2026-11-02): a bare
# figure with a big separate round head, a stout torso, long arms with big mitts, big feet and legs with a visible thigh,
# knee and calf at about 40% of its height: the proportions of Ratchet or a Castle Story Bricktron, as our own character. Eyes and blush, no mouth. Rigid
# parts on a 16-bone armature (hero-rig.py's, plus a head bone, so the head can stay level while the body leans), no
# skin weights; poses come from code (src/features/proto-hero.ts). Clothes come later, once the base is right.
#
# Conventions as in hero-rig.py: Blender Z up, facing +Y; origin on the ground between the feet; every bone points +Z
# with no roll; `_l` is the figure's left (+X); parts end in `_part`, never the bone's own name. Material "body" is the
# player's colour.
import sys
import math
import bpy
import bmesh
from mathutils import Matrix, Vector

out = sys.argv[sys.argv.index('--') + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30


def material(name, hex_srgb, rough=0.6):
    r, g, b = (int(hex_srgb[i : i + 2], 16) / 255 for i in (0, 2, 4))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = rough
    return m


MAT = {
    'body': material('body', '1fbfc4', 0.5),
    'eye': material('eye', 'ffffff', 0.25),
    'pupil': material('pupil', '13243f', 0.25),
    'blush': material('blush', 'ff8fa3', 0.6),
}

# ---------------------------------------------------------------- armature
JOINTS = {
    'root': ((0, 0, 0), None),
    'hips': ((0, 0, 0.68), 'root'),
    'body': ((0, 0, 0.75), 'hips'),
    'head': ((0, 0, 1.08), 'body'),
    'arm_l': ((0.26, 0, 1.0), 'body'),
    'forearm_l': ((0.36, 0, 0.78), 'arm_l'),
    'hand_l': ((0.41, 0.02, 0.58), 'forearm_l'),
    'thigh_l': ((0.15, 0, 0.66), 'hips'),
    'shin_l': ((0.155, 0, 0.41), 'thigh_l'),
    'foot_l': ((0.16, 0, 0.14), 'shin_l'),
}
for k in [k for k in JOINTS if k.endswith('_l')]:
    (x, y, z), parent = JOINTS[k]
    JOINTS[k[:-2] + '_r'] = ((-x, y, z), parent[:-2] + '_r' if parent.endswith('_l') else parent)
J = {k: Vector(v[0]) for k, v in JOINTS.items()}

arm_data = bpy.data.armatures.new('hero')
rig = bpy.data.objects.new('hero', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, (head, parent) in JOINTS.items():
    b = arm_data.edit_bones.new(name)
    b.head = head
    b.tail = (head[0], head[1], head[2] + 0.1)
    b.roll = 0
    if parent:
        b.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')


# ---------------------------------------------------------------- building blocks
def part(name, bone, mat, build):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(MAT[mat])
    ob = bpy.data.objects.new(name + '_part', me)
    scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    world = ob.matrix_world.copy()
    ob.parent = rig
    ob.parent_type = 'BONE'
    ob.parent_bone = bone
    bpy.context.view_layer.update()
    ob.matrix_world = world


def sphere(bm, at, size, segs=16):
    r = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2 + 2, radius=1.0)
    bmesh.ops.scale(bm, verts=r['verts'], vec=size)
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)
    return r['verts']


def capsule(bm, a, b, ra, rb, segs=12):
    """A tapered limb from a (radius ra) to b (radius rb): a cone with sphere caps."""
    a, b = Vector(a), Vector(b)
    d = b - a
    cyl = bmesh.ops.create_cone(bm, cap_ends=False, segments=segs, radius1=ra, radius2=rb, depth=d.length)
    rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, verts=cyl['verts'], matrix=Matrix.Translation((a + b) / 2) @ rot)
    sphere(bm, a, (ra,) * 3, segs)
    sphere(bm, b, (rb,) * 3, segs)


def sides(fn):
    for sx, side in ((1, 'l'), (-1, 'r')):
        fn(sx, side)


# ---------------------------------------------------------------- the figure
# Head: big and round, a touch wider than tall, on a short neck.
HEAD = Vector((0, 0, 1.37))
HR = Vector((0.33, 0.31, 0.31))
part('body', 'head', 'body', lambda bm: sphere(bm, HEAD, HR, 28))
part('neck', 'head', 'body', lambda bm: capsule(bm, (0, 0, 1.05), (0, 0, 1.15), 0.095, 0.1))


def torso(bm):
    # A small pear: widest low, narrowing to the shoulders.
    c = 0.87
    for v in sphere(bm, (0, 0, c), (0.28, 0.23, 0.25), 22):
        k = 1 - 0.22 * max(0.0, (v.co.z - c) / 0.25)
        v.co.x *= k
        v.co.y *= k


part('torso', 'body', 'body', torso)
part('pelvis', 'hips', 'body', lambda bm: sphere(bm, (0, 0, 0.71), (0.265, 0.215, 0.15), 20))


def on_head(x, z):
    """A point on the head's front surface, and the surface's normal there."""
    dx, dz = (x - HEAD.x) / HR.x, (z - HEAD.z) / HR.z
    y = HR.y * math.sqrt(max(0.0, 1 - dx * dx - dz * dz))
    p = Vector((x, y, z))
    n = Vector((dx / HR.x, y / HR.y ** 2, dz / HR.z)).normalized()
    return p, n


def face(sx, side):
    p, n = on_head(sx * 0.13, 1.4)
    rot = n.to_track_quat('Z', 'Y').to_matrix().to_4x4()

    def decal(bm, at, size, out, segs=18):
        verts = sphere(bm, (0, 0, 0), size, segs)
        bmesh.ops.transform(bm, verts=verts, matrix=Matrix.Translation(at + n * out) @ rot)

    part(f'eyes_bead_pupil_{side}', 'head', 'pupil', lambda bm: decal(bm, p, (0.066, 0.11, 0.028), 0.0))
    part(f'eyes_bead_glint_{side}', 'head', 'eye', lambda bm: decal(bm, p + Vector((sx * 0.012, 0, 0.042)), (0.021, 0.026, 0.01), 0.022, 10))
    part(f'eyes_bead_glint2_{side}', 'head', 'eye', lambda bm: decal(bm, p + Vector((-sx * 0.016, 0, -0.045)), (0.01, 0.01, 0.007), 0.022, 8))
    k, _ = on_head(sx * 0.22, 1.27)
    part(f'eyes_bead_blush_{side}', 'head', 'blush', lambda bm: decal(bm, k, (0.055, 0.032, 0.012), 0.0, 14))


sides(face)


def limbs(sx, side):
    s = side
    # Arms: slim at the shoulder, swelling to the wrist; a big mitten hand with a thumb.
    sh = J[f'arm_{s}']
    part(f'shoulder_{s}', 'body', 'body', lambda bm: sphere(bm, sh - Vector((sx * 0.02, 0, 0)), (0.115, 0.115, 0.12), 14))
    part(f'arm_{s}', f'arm_{s}', 'body', lambda bm: capsule(bm, sh, J[f'forearm_{s}'], 0.095, 0.09))
    part(f'forearm_{s}', f'forearm_{s}', 'body', lambda bm: capsule(bm, J[f'forearm_{s}'], J[f'hand_{s}'], 0.09, 0.105))

    def mitt(bm):
        h = J[f'hand_{s}']
        sphere(bm, h + Vector((sx * 0.005, 0, -0.1)), (0.165, 0.145, 0.165), 18)
        sphere(bm, h + Vector((-sx * 0.1, 0.075, -0.06)), (0.06, 0.06, 0.07), 10)

    part(f'hand_{s}', f'hand_{s}', 'body', mitt)
    # Legs: a thigh tapering to the knee, a calf with a bulge high up tapering to the ankle.
    hip, knee, ankle = J[f'thigh_{s}'], J[f'shin_{s}'], J[f'foot_{s}']
    part(f'thigh_{s}', f'thigh_{s}', 'body', lambda bm: capsule(bm, hip + Vector((0, 0, 0.03)), knee, 0.165, 0.115, 16))
    calf = knee.lerp(ankle, 0.35) + Vector((0, -0.012, 0))

    def shin(bm):
        capsule(bm, knee, calf, 0.112, 0.122, 16)
        capsule(bm, calf, ankle, 0.122, 0.09, 16)

    part(f'shin_{s}', f'shin_{s}', 'body', shin)

    def foot(bm):
        # A big planted foot: a flat sole, a round top, and a toe that swells forward.
        c = Vector((ankle.x * 1.08, 0.09, 0.1))
        for v in sphere(bm, c, (0.165, 0.29, 0.125), 22):
            front = max(0.0, (v.co.y - c.y) / 0.29)
            v.co.x = c.x + (v.co.x - c.x) * (1 + 0.14 * front)
            v.co.z += 0.015 * front
            if v.co.z < c.z - 0.05:
                v.co.z = max(0.0, c.z - 0.05 - (c.z - 0.05 - v.co.z) * 0.6)

    part(f'foot_{s}', f'foot_{s}', 'body', foot)


sides(limbs)

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_animations=False,
    export_draco_mesh_compression_enable=False,
)
