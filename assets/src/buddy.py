# The Buddy: a simple, slightly plump figure for the hand-made clips (src/player/buddy/body.ts). One smooth skin: rounded
# shapes are blended into a single watertight mesh by a voxel remesh, reduced, and bound to the skeleton with automatic
# weights, softened, so joints bend without seams; the head and mitts stay rigid so they keep their shape. The face is
# one more mesh in vertex colours, moulded to the head, on the Head bone and two eye bones (scaling one blinks). No mouth
# or hair. Hats are `wear_head_<name>` parts on the Head bone, hidden until worn, a material of their own to tint.
# Bones are named as in Quaternius's Universal Animation Library, in a T-pose, with shorter limbs; retargetClip plays the
# clips on it. Knobs are the numbers below. Blender Z up, the figure faces -Y (glTF +Z), left is +X.
import sys
import math
import bpy
import bmesh
from mathutils import Matrix, Vector

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

VOXEL = 0.011  # m: the blend's detail
TRIS = 5000  # target for the skin
NORMAL_BLUR = 14  # passes of smoothing behind the skin's shading


def linear(hex_srgb):
    r, g, b = (int(hex_srgb[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]


def material(name, hex_srgb, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*linear(hex_srgb), 1)
    bsdf.inputs['Roughness'].default_value = rough
    return m


BODY = material('M_Main', '1fbfc4', 0.62)
FACE = material('M_Face', 'ffffff', 0.3)  # vertex colours
HAT = material('M_Hat', '7a2433', 0.7)  # vertex colours multiply this, so a hat can be tinted
TRIM = material('M_Trim', 'ffffff', 0.35)  # vertex colours; never tinted (a hat's brass and its peak)
INK, SHINE, BLUSH = linear('0d1a30'), linear('ffffff'), linear('ffa5b5')

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
    'eye_l': ((0.115, -0.23, 1.372), 'Head'),
}
for k in [k for k in J if k.endswith('_l')]:
    (x, y, z), p = J[k]
    J[k[:-2] + '_r'] = ((-x, y, z), p[:-2] + '_r' if p.endswith('_l') else p)
TAILS = {'eye_l': (0.115, -0.23, 1.472), 'eye_r': (-0.115, -0.23, 1.472), 'Head': (0, 0, 1.62), 'hand_l': (0.72, 0, 1.03), 'hand_r': (-0.72, 0, 1.03), 'ball_l': (0.145, -0.24, 0.03), 'ball_r': (-0.145, -0.24, 0.03), 'clavicle_l': (0.2, 0, 1.03), 'clavicle_r': (-0.2, 0, 1.03)}

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
        c = next((k for k in kids.get(n, []) if not k.startswith(('clavicle', 'thigh', 'eye'))), kids[n][0])
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


HEAD_C, HEAD_R = Vector((0, 0, 1.36)), (0.29, 0.27, 0.27)
bm = bmesh.new()
# Torso: a soft pear, plumpest around the belly, narrowing to the shoulders.
ball(bm, (0, 0, 0.76), (0.255, 0.21, 0.17))
ball(bm, (0, -0.012, 0.87), (0.265, 0.225, 0.2))
ball(bm, (0, 0, 1.0), (0.2, 0.165, 0.11))
# Neck and head; small round ears.
limb(bm, (0, 0, 1.05), (0, 0, 1.16), 0.1, 0.105, 4)
ball(bm, HEAD_C, HEAD_R, 40)
for sx in (1, -1):
    ball(bm, (sx * 0.285, 0.005, 1.35), (0.04, 0.035, 0.05), 16)
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


# Fillets where the shapes meet: more smoothing around the neck, shoulders, wrists and crotch, so no crease is left to fold.
def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def seam(co):
    x, y, z = abs(co.x), co.y, co.z
    neck = smoothstep(0.34, 0.14, (x * x + y * y) ** 0.5) * smoothstep(1.0, 1.05, z) * smoothstep(1.16, 1.11, z)
    shoulder = smoothstep(0.34, 0.26, x) * smoothstep(0.09, 0.16, x) * smoothstep(0.86, 0.95, z) * smoothstep(1.16, 1.08, z)
    wrist = smoothstep(0.54, 0.58, x) * smoothstep(0.64, 0.6, x) * smoothstep(0.86, 0.92, z)
    crotch = smoothstep(0.24, 0.12, x) * smoothstep(0.5, 0.58, z) * smoothstep(0.76, 0.68, z)
    belly = 0.8 * smoothstep(0.34, 0.24, x) * smoothstep(0.62, 0.7, z) * smoothstep(1.02, 0.94, z)
    return max(neck, shoulder, wrist, crotch, belly)


zone = skin.vertex_groups.new(name='seams')
for v in me.vertices:
    zone.add([v.index], seam(v.co), 'REPLACE')
f = skin.modifiers.new('fillet', 'SMOOTH')
f.factor = 0.8
f.iterations = 40
f.vertex_group = 'seams'
bpy.ops.object.modifier_apply(modifier='fillet')
skin.vertex_groups.remove(skin.vertex_groups['seams'])
d = skin.modifiers.new('reduce', 'DECIMATE')
d.ratio = min(1.0, TRIS / max(1, len(me.polygons) * 2))
bpy.ops.object.modifier_apply(modifier='reduce')
me.materials.append(BODY)
for p in me.polygons:
    p.use_smooth = True
# Soft shading: the normals of a much smoother copy, so small lumps stop catching the light while the outline stays.
blur = me.copy()
links = [[] for _ in blur.vertices]
for e in blur.edges:
    a, b = e.vertices
    links[a].append(b)
    links[b].append(a)
pos = [v.co.copy() for v in blur.vertices]
for _ in range(NORMAL_BLUR):
    pos = [p * 0.4 + sum((pos[j] for j in links[i]), Vector()) * (0.6 / max(1, len(links[i]))) for i, p in enumerate(pos)]
for v, p in zip(blur.vertices, pos):
    v.co = p
blur.update()
me.normals_split_custom_set_from_vertices([v.normal.copy() for v in blur.vertices])
bpy.data.meshes.remove(blur)

# Bind with automatic weights.
bpy.ops.object.select_all(action='DESELECT')
skin.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
for side in ('eye_l', 'eye_r'):
    skin.vertex_groups.remove(skin.vertex_groups[side])
# Softer weights, so a shoulder or hip bends as a curve. Then the head and mitts go rigid: anything bending inside them
# dents them. The neck is a hand-set blend from the chest to the head.
G = skin.vertex_groups
near = [[] for _ in me.vertices]
for e in me.edges:
    a, b = e.vertices
    near[a].append(b)
    near[b].append(a)
W = [{G[g.group].name: g.weight for g in v.groups} for v in me.vertices]
for _ in range(6):
    soft = []
    for i, w in enumerate(W):
        mix = {n: 0.5 * x for n, x in w.items()}
        for j in near[i]:
            for n, x in W[j].items():
                mix[n] = mix.get(n, 0.0) + 0.5 * x / len(near[i])
        soft.append(mix)
    W = soft


# The butt and hips ride on the pelvis, not the thighs: a swinging thigh otherwise drags that mass from side to side.
for v in me.vertices:
    k = 0.8 * smoothstep(0.58, 0.72, v.co.z)  # less, or a thigh raised at a sprint leaves a shelf
    w = W[v.index]
    for side in ('thigh_l', 'thigh_r'):
        moved = w.get(side, 0.0) * k
        if moved:
            w[side] -= moved
            w['pelvis'] = w.get('pelvis', 0.0) + moved


def rigid(v, weights):
    W[v.index] = weights


for v in me.vertices:
    x, y, z = v.co
    if z >= 1.13 and (x * x + y * y) ** 0.5 < 0.4:  # above the arms' T-pose, and in from the mitts
        rigid(v, {'Head': 1.0})
    elif z > 1.03 and (x * x + y * y) ** 0.5 < 0.13:
        t = smoothstep(1.03, 1.13, z)
        rigid(v, {'Head': t * t, 'neck_01': 2 * t * (1 - t), 'spine_03': (1 - t) ** 2})
    elif abs(x) > 0.63 and z > 0.8:
        rigid(v, {'hand_l' if x > 0 else 'hand_r': 1.0})
for g in G:
    g.remove(list(range(len(me.vertices))))
for i, w in enumerate(W):
    best = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    total = sum(x for _, x in best)
    for n, x in best:
        G[n].add([i], x / total, 'REPLACE')
print('BUDDY', len(me.polygons), 'polys', len(skin.vertex_groups), 'groups', sum(1 for v in me.vertices if not v.groups), 'unweighted')


# ---------------------------------------------------------------- the face
def head_y(x, z, out=0.0):
    dx, dz = x / HEAD_R[0], (z - HEAD_C.z) / HEAD_R[2]
    return -HEAD_R[1] * max(0.0, 1 - dx * dx - dz * dz) ** 0.5 - out


class Soup:
    """A mesh under construction: faces plus a colour and a bone for every vertex."""

    def __init__(self):
        self.verts, self.faces, self.cols, self.bones = [], [], [], []

    def add(self, verts, faces, col, bone=None):
        n = len(self.verts)
        self.verts += verts
        self.faces += [[i + n for i in f] for f in faces]
        self.cols += [col] * len(verts)
        self.bones += [bone] * len(verts)

    def mesh(self, name, mat):
        m = bpy.data.meshes.new(name)
        m.from_pydata(self.verts, [], self.faces)
        m.update()
        for p in m.polygons:
            p.use_smooth = True
        m.materials.append(mat)
        ca = m.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(self.cols):
            ca.data[i].color = (*c, 1)
        o = bpy.data.objects.new(name, m)
        scene.collection.objects.link(o)
        return o


def decal(soup, cx, cz, rx, rz, lift, edge, col, bone, rings=6, segs=28):
    """A shallow dome moulded to the head: `lift` m proud at its middle, its rim `edge` m (under the skin, so no gap)."""
    verts = [(cx, head_y(cx, cz, lift), cz)]
    for i in range(1, rings + 1):
        r = i / rings
        out = edge + (lift - edge) * (1 - r * r) ** 0.5
        for k in range(segs):
            a = 2 * math.pi * k / segs
            x, z = cx + rx * r * math.cos(a), cz + rz * r * math.sin(a)
            verts.append((x, head_y(x, z, out), z))
    faces = [[0, 1 + k, 1 + (k + 1) % segs] for k in range(segs)]
    for i in range(rings - 1):
        p, q = 1 + i * segs, 1 + (i + 1) * segs
        faces += [[p + k, q + k, q + (k + 1) % segs, p + (k + 1) % segs] for k in range(segs)]
    soup.add(verts, faces, col, bone)


face = Soup()
EYE_Z = HEAD_C.z + 0.012
for sx, side in ((1, 'l'), (-1, 'r')):
    bone = 'eye_' + side
    decal(face, sx * 0.115, EYE_Z, 0.054, 0.082, 0.014, -0.006, INK, bone, 8)
    decal(face, sx * 0.115 + sx * 0.012, EYE_Z + 0.036, 0.016, 0.021, 0.0195, 0.012, SHINE, bone, 3, 14)
    decal(face, sx * 0.19, HEAD_C.z - 0.078, 0.05, 0.033, 0.007, -0.007, BLUSH, 'Head', 4, 20)
face_ob = face.mesh('buddy_face', FACE)
for name in ('Head', 'eye_l', 'eye_r'):
    g = face_ob.vertex_groups.new(name=name)
    g.add([i for i, b in enumerate(face.bones) if b == name], 1.0, 'REPLACE')
face_ob.parent = rig
face_ob.modifiers.new('rig', 'ARMATURE').object = rig


# ---------------------------------------------------------------- hats: rings around the head, sunk into it at the rim
def wear(name, soup, tilt=0.0, mat=HAT):
    """Hats are built around the head's centre; `tilt` lifts the front (radians). Rigid on the Head bone."""
    o = soup.mesh('wear_head_' + name, mat)
    o.matrix_world = Matrix.Translation(HEAD_C) @ Matrix.Rotation(tilt, 4, 'X')
    bpy.context.view_layer.update()
    world = o.matrix_world.copy()
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = 'Head'
    bpy.context.view_layer.update()
    o.matrix_world = world


def rings(soup, profile, col, segs=44, close=True):
    """A loft through (rx, ry, z) rings, bottom to top, closed at the top."""
    verts = [(rx * math.cos(2 * math.pi * k / segs), ry * math.sin(2 * math.pi * k / segs), z) for rx, ry, z in profile for k in range(segs)]
    faces = []
    for i in range(len(profile) - 1):
        faces += [[i * segs + k, i * segs + (k + 1) % segs, (i + 1) * segs + (k + 1) % segs, (i + 1) * segs + k] for k in range(segs)]
    if close:
        verts.append((0, 0, profile[-1][2]))
        top = len(verts) - 1
        last = (len(profile) - 1) * segs
        faces += [[last + k, last + (k + 1) % segs, top] for k in range(segs)]
    soup.add(verts, faces, col)


def head_ring(z, plus=0.0):
    k = max(0.0, 1 - (z / HEAD_R[2]) ** 2) ** 0.5
    return (HEAD_R[0] * k + plus, HEAD_R[1] * k + plus, z)


WHITE_C, DARK = (1.0, 1.0, 1.0), (0.2, 0.2, 0.22)
# A conductor's cap, not a policeman's: a stiff straight drum with a flat top and no flare, a short flat peak, a brass
# band and badge. `_trim` is worn with it.
cap, trim = Soup(), Soup()
BRASS, PEAK_C = linear('d9a93a'), linear('17120f')
Z0, TOP = 0.122, 0.305  # the top clears the head's crown (0.27), tilted or not
rx, ry, _ = head_ring(Z0, 0.011)
rings(cap, [head_ring(0.1, -0.012), (rx, ry, Z0), (rx + 0.018, ry + 0.018, TOP), (rx + 0.014, ry + 0.014, TOP + 0.012), (rx, ry, TOP + 0.018), (0.08, 0.075, TOP + 0.021)], WHITE_C)
for z0, z1 in ((0.132, 0.145), (0.272, 0.282)):
    t0, t1 = (z0 - Z0) / (TOP - Z0), (z1 - Z0) / (TOP - Z0)
    rings(trim, [(rx + 0.018 * t0 - 0.004, ry + 0.018 * t0 - 0.004, z0), (rx + 0.018 * t0 + 0.0025, ry + 0.018 * t0 + 0.0025, z0 + 0.001), (rx + 0.018 * t1 + 0.0025, ry + 0.018 * t1 + 0.0025, z1 - 0.001), (rx + 0.018 * t1 - 0.004, ry + 0.018 * t1 - 0.004, z1)], BRASS, close=False)
badge = bmesh.new()
ball(badge, (0, -(ry + 0.011), 0.21), (0.03, 0.009, 0.034), 14)
trim.add([tuple(v.co) for v in badge.verts], [[v.index for v in f.verts] for f in badge.faces], BRASS)
badge.free()
PEAK = 0.125
top, bot = [], []
N, M = 28, 5
for i in range(N + 1):
    u = i / N * 2 - 1
    a = -math.pi / 2 + math.radians(62) * u
    w = PEAK * max(0.0, math.cos(u * math.pi / 2)) ** 0.5
    x0, y0 = rx * math.cos(a), ry * math.sin(a)
    d = Vector((x0, y0, 0)).normalized()
    for j in range(M + 1):
        t = j / M
        p = Vector((x0, y0, Z0 + 0.012)) + d * (w * t - 0.008) + Vector((0, 0, -0.3 * w * t))
        top.append((p.x, p.y, p.z))
        bot.append((p.x, p.y, p.z - 0.01 * (1 - t * t) ** 0.5))
faces = []
for i in range(N):
    for j in range(M):
        q = [i * (M + 1) + j, (i + 1) * (M + 1) + j, (i + 1) * (M + 1) + j + 1, i * (M + 1) + j + 1]
        faces.append(q[::-1])
        faces.append([v + len(top) for v in q])
trim.add(top + bot, faces, PEAK_C)
wear('cap', cap, math.radians(5))
wear('cap_trim', trim, math.radians(5), TRIM)

# A beanie: a dome over the head, a thick turned-up cuff, a bobble.
beanie = Soup()
rings(beanie, [head_ring(0.085, -0.012), (0.285, 0.265, 0.095), (0.29, 0.27, 0.125), (0.285, 0.265, 0.165), (0.262, 0.244, 0.18)], (0.72, 0.72, 0.74), close=False)
dome = [(0.275 * (1 - ((z - 0.1) / 0.21) ** 2) ** 0.5, 0.255 * (1 - ((z - 0.1) / 0.21) ** 2) ** 0.5, z) for z in (0.17, 0.2, 0.23, 0.26, 0.285, 0.3)]
rings(beanie, dome, WHITE_C)
ballm = bmesh.new()
ball(ballm, (0, 0, 0.345), (0.062, 0.062, 0.058), 18)
beanie.add([tuple(v.co) for v in ballm.verts], [[v.index for v in f.verts] for f in ballm.faces], (2.0, 2.0, 2.0))
ballm.free()
wear('beanie', beanie)

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
    export_vertex_color='ACTIVE',
    export_draco_mesh_compression_enable=False,
)
