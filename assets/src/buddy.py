# The Buddy: a simple, slightly plump figure for the hand-made clips (src/proto/hero/clips.ts). One smooth skin: rounded
# shapes are blended into a single watertight mesh by a voxel remesh, reduced, and bound to the skeleton with automatic
# weights, so joints bend without seams. Eyes and blush are rigid parts on the Head bone; no mouth, no hair, no clothes.
# Bones are named as in Quaternius's Universal Animation Library, in a T-pose, with shorter limbs; retargetClip plays the
# clips on it. Knobs are the numbers below. Blender Z up, the figure faces -Y (glTF +Z), left is +X.
import sys
import bpy
import bmesh
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

VOXEL = 0.011  # m: the blend's detail
TRIS = 5000  # target for the skin


def material(name, hex_srgb, rough):
    r, g, b = (int(hex_srgb[i : i + 2], 16) / 255 for i in (0, 2, 4))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = rough
    return m


BODY = material('M_Main', '1fbfc4', 0.62)
PUPIL = material('pupil', '13243f', 0.2)
WHITE = material('white', 'ffffff', 0.25)
BLUSH = material('blush', 'ff8fa3', 0.7)

# ---------------------------------------------------------------- the skeleton
J = {
    'pelvis': ((0, 0, 0.68), None),
    'spine_01': ((0, 0, 0.78), 'pelvis'),
    'spine_02': ((0, 0, 0.88), 'spine_01'),
    'spine_03': ((0, 0, 0.98), 'spine_02'),
    'neck_01': ((0, 0, 1.07), 'spine_03'),
    'Head': ((0, 0, 1.12), 'neck_01'),
    'clavicle_l': ((0.05, 0, 1.03), 'spine_03'),
    'upperarm_l': ((0.2, 0, 1.03), 'clavicle_l'),
    'lowerarm_l': ((0.41, 0, 1.03), 'upperarm_l'),
    'hand_l': ((0.6, 0, 1.03), 'lowerarm_l'),
    'thigh_l': ((0.135, 0, 0.66), 'pelvis'),
    'calf_l': ((0.14, 0, 0.38), 'thigh_l'),
    'foot_l': ((0.145, 0, 0.11), 'calf_l'),
    'ball_l': ((0.145, -0.13, 0.03), 'foot_l'),
}
for k in [k for k in J if k.endswith('_l')]:
    (x, y, z), p = J[k]
    J[k[:-2] + '_r'] = ((-x, y, z), p[:-2] + '_r' if p.endswith('_l') else p)
TAILS = {'Head': (0, 0, 1.6), 'hand_l': (0.72, 0, 1.03), 'hand_r': (-0.72, 0, 1.03), 'ball_l': (0.145, -0.24, 0.03), 'ball_r': (-0.145, -0.24, 0.03), 'clavicle_l': (0.2, 0, 1.03), 'clavicle_r': (-0.2, 0, 1.03)}

arm = bpy.data.armatures.new('Buddy')
rig = bpy.data.objects.new('Buddy', arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
kids = {}
for n, (_, p) in J.items():
    if p:
        kids.setdefault(p, []).append(n)
for n, (head, p) in J.items():
    b = arm.edit_bones.new(n)
    b.head = head
    if n in TAILS:
        b.tail = TAILS[n]
    else:
        # towards the child on its own chain (the pelvis and upper spine have several)
        c = next((k for k in kids.get(n, []) if not k.startswith(('clavicle', 'thigh'))), kids[n][0])
        b.tail = J[c][0]
for n, (_, p) in J.items():
    if p:
        arm.edit_bones[n].parent = arm.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')


# ---------------------------------------------------------------- the shapes
def ball(bm, at, size, segs=32):
    r = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2 + 2, radius=1.0)
    bmesh.ops.scale(bm, verts=r['verts'], vec=size)
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)


def limb(bm, a, b, ra, rb, n=14):
    """A tapered limb as a chain of overlapping balls; the remesh blends them smooth."""
    a, b = Vector(a), Vector(b)
    for i in range(n + 1):
        t = i / n
        r = ra + (rb - ra) * t
        ball(bm, a.lerp(b, t), (r, r, r), 20)


HEAD_C, HEAD_R = Vector((0, 0, 1.34)), (0.29, 0.27, 0.27)
bm = bmesh.new()
# Torso: a soft pear, plumpest around the belly, narrowing to the shoulders.
ball(bm, (0, 0, 0.76), (0.255, 0.21, 0.17))
ball(bm, (0, -0.012, 0.87), (0.265, 0.225, 0.2))
ball(bm, (0, 0, 1.0), (0.2, 0.165, 0.11))
# Neck and head; small round ears.
limb(bm, (0, 0, 1.05), (0, 0, 1.16), 0.085, 0.09, 4)
ball(bm, HEAD_C, HEAD_R, 40)
for sx in (1, -1):
    ball(bm, (sx * 0.285, 0.005, 1.33), (0.04, 0.035, 0.05), 16)
    # Arms: a soft shoulder, thin at the elbow, a round mitt and thumb.
    limb(bm, (sx * 0.17, 0, 1.03), (sx * 0.41, 0, 1.03), 0.092, 0.08)
    limb(bm, (sx * 0.41, 0, 1.03), (sx * 0.6, 0, 1.03), 0.08, 0.075)
    ball(bm, (sx * 0.69, 0, 1.03), (0.125, 0.092, 0.118), 24)
    ball(bm, (sx * 0.64, -0.09, 1.04), (0.055, 0.058, 0.05), 16)
    # Legs: a full thigh, a short calf, a big rounded foot with a flat sole.
    limb(bm, (sx * 0.135, 0, 0.69), (sx * 0.14, 0, 0.38), 0.135, 0.098)
    limb(bm, (sx * 0.14, 0, 0.38), (sx * 0.145, 0, 0.13), 0.098, 0.082)
    foot = bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=16, radius=1.0)['verts']
    bmesh.ops.scale(bm, verts=foot, vec=(0.118, 0.205, 0.098))
    bmesh.ops.translate(bm, verts=foot, vec=(sx * 0.15, -0.075, 0.098))
    for v in foot:
        v.co.z = max(v.co.z, 0.012)  # a flat sole
me = bpy.data.meshes.new('buddy_skin')
bm.to_mesh(me)
bm.free()
skin = bpy.data.objects.new('buddy_skin', me)
scene.collection.objects.link(skin)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = skin
skin.select_set(True)
r = skin.modifiers.new('blend', 'REMESH')
r.mode = 'VOXEL'
r.voxel_size = VOXEL
r.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier='blend')
s = skin.modifiers.new('soften', 'LAPLACIANSMOOTH')
s.lambda_factor = 0.6
s.iterations = 5
s.use_volume_preserve = True
bpy.ops.object.modifier_apply(modifier='soften')
d = skin.modifiers.new('reduce', 'DECIMATE')
d.ratio = min(1.0, TRIS / max(1, len(me.polygons) * 2))
bpy.ops.object.modifier_apply(modifier='reduce')
me.materials.append(BODY)
for p in me.polygons:
    p.use_smooth = True

# Bind with automatic weights.
bpy.ops.object.select_all(action='DESELECT')
skin.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print('BUDDY', len(me.polygons), 'polys', len(skin.vertex_groups), 'groups', sum(1 for v in me.vertices if not v.groups), 'unweighted')


# ---------------------------------------------------------------- the face, rigid on the Head bone
def part(name, mat, at, size, segs=20):
    m = bpy.data.meshes.new(name)
    b = bmesh.new()
    ball(b, at, size, segs)
    b.to_mesh(m)
    b.free()
    for p in m.polygons:
        p.use_smooth = True
    m.materials.append(mat)
    o = bpy.data.objects.new(name, m)
    scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    world = o.matrix_world.copy()
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = 'Head'
    bpy.context.view_layer.update()
    o.matrix_world = world


def on_head(x, z, out=0.0):
    dx, dz = x / HEAD_R[0], (z - HEAD_C.z) / HEAD_R[2]
    return Vector((x, -HEAD_R[1] * (1 - dx * dx - dz * dz) ** 0.5 - out, z))


for sx, side in ((1, 'l'), (-1, 'r')):
    e = on_head(sx * 0.105, 1.37)
    part(f'pupil_{side}', PUPIL, e, (0.05, 0.022, 0.078))
    part(f'glint_{side}', WHITE, e + Vector((sx * 0.012, -0.018, 0.034)), (0.016, 0.008, 0.02), 10)
    part(f'blush_{side}', BLUSH, on_head(sx * 0.185, 1.275), (0.048, 0.012, 0.028), 12)

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_yup=True,
    export_apply=False,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_animations=False,
    export_skins=True,
    export_draco_mesh_compression_enable=False,
)
