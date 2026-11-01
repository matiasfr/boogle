# Hero rig proof: a jointed toy figure (the "Ratchet v1" Bib Buddy, .look/previz/player-ratchet-bibs) on a 13-bone
# armature, with one authored clip, "wave". Every part is a rigid mesh parented to one bone: no skin weights, so
# nothing pinches at a joint, and cuffs, boot tops and the bib hide the seams like an action figure's. Squash, lean
# and locomotion stay in code; the rig only poses limbs (docs/research/procedural-animation.md, recommendation 3).
# Built from scratch by Blender's Python, exported by `npm run assets` (assets/src/scaffold-kit.py has the
# conventions).
#
# Rig conventions, so code can pose the same bones:
# - Blender Z up, the figure faces +Y (glTF -Z, the avatar's forward); origin on the ground between the feet.
# - Every bone points straight up (+Z) with no roll, so a bone's local X, Y, Z are world X, Z, -Y in Blender and
#   X, Y, Z in three.js: rotation.x pitches a limb forward or back, rotation.z swings it out to the side.
# - Bone names use underscores (three.js strips dots from node names): root, hips, body, arm_l/r, forearm_l/r,
#   hand_l/r, thigh_l/r, shin_l/r, foot_l/r. `_l` is the figure's left (+X).
# - Materials by role: "body" (the player's colour; code recolours it), "cream", "leather", "brass", "eye", "pupil".
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
    'cream': material('cream', 'f2e6cc', 0.9),
    'leather': material('leather', '9a5a2c', 0.65),
    'sole': material('sole', '4a2f1e', 0.8),
    'tongue': material('tongue', 'e8606e', 0.5),
    'brass': material('brass', 'c9a046', 0.35),
    'eye': material('eye', 'ffffff', 0.3),
    'pupil': material('pupil', '13243f', 0.3),
}

# ---------------------------------------------------------------- armature
# Joint positions (Blender coordinates, metres). The figure is about 1.75 m to the cap, like today's capsule; the
# proportions follow the "Ratchet v1" previz: a tall bean that is head and body in one, short legs, big hands and feet.
JOINTS = {
    'root': ((0, 0, 0), None),
    'hips': ((0, 0, 0.5), 'root'),
    'body': ((0, 0, 0.66), 'hips'),
    'arm_l': ((0.4, 0, 0.98), 'body'),
    'forearm_l': ((0.47, 0, 0.86), 'arm_l'),
    'hand_l': ((0.5, 0, 0.74), 'forearm_l'),
    'thigh_l': ((0.16, 0, 0.52), 'hips'),
    'shin_l': ((0.17, 0, 0.4), 'thigh_l'),
    'foot_l': ((0.17, 0, 0.26), 'shin_l'),
}
for k in [k for k in JOINTS if k.endswith('_l')]:
    (x, y, z), parent = JOINTS[k]
    JOINTS[k[:-2] + '_r'] = ((-x, y, z), parent[:-2] + '_r' if parent.endswith('_l') else parent)

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

# ---------------------------------------------------------------- parts


def part(name, bone, mat, build, smooth=True):
    """A rigid mesh built at its place in the rest pose, then parented to one bone without moving."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(MAT[mat])
    ob = bpy.data.objects.new(name + '_part', me)  # not the bone's name: clips bind to bones by name
    scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    world = ob.matrix_world.copy()
    ob.parent = rig
    ob.parent_type = 'BONE'
    ob.parent_bone = bone
    bpy.context.view_layer.update()
    ob.matrix_world = world
    return ob


def sphere(bm, at, size, segs=14):
    r = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2 + 2, radius=1.0)
    bmesh.ops.scale(bm, verts=r['verts'], vec=size)
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)
    return r['verts']


def capsule(bm, a, b, radius, segs=10):
    """A capsule from point a to point b: a cylinder with sphere caps (overlapping, so no seam shows)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    cyl = bmesh.ops.create_cone(bm, cap_ends=False, segments=segs, radius1=radius, radius2=radius, depth=d.length)
    rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, verts=cyl['verts'], matrix=Matrix.Translation((a + b) / 2) @ rot)
    sphere(bm, a, (radius,) * 3, segs)
    sphere(bm, b, (radius,) * 3, segs)


def ring(bm, at, radius, depth, axis='Z', segs=16):
    """A cuff or a button: a short thick cylinder."""
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=radius, radius2=radius, depth=depth)
    if axis == 'Y':
        bmesh.ops.rotate(bm, verts=r['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)


# The bean: head and body in one, a pill (straight sides, round top and bottom) as tall as today's capsule.
BEAN = {'z0': 0.88, 'z1': 1.38, 'rx': 0.42, 'ry': 0.38, 'rz': 0.38}  # lower and upper cap centres, radii


def bean(bm, grow=0.0, segs=26):
    verts = sphere(bm, (0, 0, 0), (BEAN['rx'] + grow, BEAN['ry'] + grow, BEAN['rz'] + grow), segs)
    for v in verts:
        v.co.z += BEAN['z1'] if v.co.z > 0 else BEAN['z0']
    return verts


def on_bean(x, z, out=0.0):
    """The front surface point of the bean at (x, z), pushed `out` along +Y: where eyes, buttons and straps sit."""
    dz = z - BEAN['z1'] if z > BEAN['z1'] else z - BEAN['z0'] if z < BEAN['z0'] else 0.0
    t = 1 - (x / BEAN['rx']) ** 2 - (dz / BEAN['rz']) ** 2
    return Vector((x, BEAN['ry'] * math.sqrt(max(t, 0)) + out, z))


part('body', 'body', 'body', bean)

# Overalls cut from a slightly larger bean: shorts round the bottom up to WAIST, a bib up the front with a pocket,
# wide straps over the shoulders, brass buttons where they meet.
WAIST, BIB_TOP, BIB_HALF = 0.86, 1.04, 0.24


def cut(bm, planes, keep):
    """Slice the mesh with planes ((point, normal) pairs), then delete the faces whose centre `keep` rejects."""
    for co, no in planes:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context='FACES')


def overalls(bm):
    bean(bm, 0.02)
    planes = [((0, 0, WAIST), (0, 0, 1)), ((0, 0, BIB_TOP), (0, 0, 1)), ((BIB_HALF, 0, 0), (1, 0, 0)), ((-BIB_HALF, 0, 0), (1, 0, 0))]
    cut(bm, planes, lambda c: c.z < WAIST or (c.y > 0 and abs(c.x) < BIB_HALF and c.z < BIB_TOP))


part('overalls', 'body', 'cream', overalls)
part('pocket', 'body', 'cream', lambda bm: sphere(bm, on_bean(0, 0.95, 0.0), (0.11, 0.035, 0.06), 12))
for sx, side in ((1, 'l'), (-1, 'r')):
    # A strap from the bib's top corner over the shoulder and down the back: three flat segments on the bean.
    pts = [on_bean(sx * 0.19, BIB_TOP - 0.02, 0.03), on_bean(sx * 0.33, 1.1, 0.035), on_bean(sx * 0.33, 1.1, 0.035) * Vector((1, -1, 1)), on_bean(sx * 0.19, WAIST, 0.03) * Vector((1, -1, 1))]

    def strap(bm, pts=pts):
        for a, b in zip(pts, pts[1:]):
            capsule(bm, a, b, 0.045, 8)

    part(f'strap_{side}', 'body', 'cream', strap)
    part(f'button_{side}', 'body', 'brass', lambda bm, sx=sx: ring(bm, on_bean(sx * 0.18, BIB_TOP - 0.03, 0.05), 0.045, 0.035, 'Y'))
    # Short trouser legs over the thighs.
    hip = Vector(JOINTS[f'thigh_{side}'][0])
    part(f'shorts_{side}', f'thigh_{side}', 'cream', lambda bm, h=hip: capsule(bm, h + Vector((0, 0, 0.08)), h - Vector((0, 0, 0.06)), 0.15, 12))

# Face: big googly eyes just under the brim, an open smile with a tongue. Eyes and cap ride the body bone, so they
# follow its lean; code moves the pupils.
EYE_Z, EYE_X = 1.3, 0.16
for sx, side in ((1, 'l'), (-1, 'r')):
    c = on_bean(sx * EYE_X, EYE_Z, -0.05)
    part(f'eye_{side}', 'body', 'eye', lambda bm, c=c: sphere(bm, c, (0.165, 0.13, 0.16), 18))
    part(f'pupil_{side}', 'body', 'pupil', lambda bm, c=c: sphere(bm, c + Vector((-0.01, 0.12, -0.01)), (0.085, 0.03, 0.09), 14))
    part(f'glint_{side}', 'body', 'eye', lambda bm, c=c: sphere(bm, c + Vector((0.025, 0.145, 0.035)), (0.022, 0.012, 0.022), 8))


def mouth(bm):
    # The lower half of a flat dark ellipsoid set into the bean.
    c = on_bean(0, 1.13, -0.012)
    verts = sphere(bm, c, (0.1, 0.03, 0.06), 16)
    bmesh.ops.delete(bm, geom=[v for v in verts if v.co.z > c.z + 0.001], context='VERTS')


part('mouth', 'body', 'pupil', mouth)
part('tongue', 'body', 'tongue', lambda bm: sphere(bm, on_bean(0.01, 1.095, 0.0), (0.045, 0.02, 0.022), 10))


def cap(bm):
    # A baseball cap: a dome over the top of the bean (a little lower at the back) and a flat D-shaped brim out
    # front, tipped up a little, sitting right on top of the eyes.
    bean(bm, 0.025, 22)
    low = BEAN['z1'] + 0.08
    cut(bm, [((0, 0, low), (0, 0, 1)), ((0, 0, low - 0.05), (0, 0, 1))], lambda c: c.z > (low - 0.05 if c.y < -0.1 else low))
    # Triangle-fan caps, so cutting the back half off leaves the front half of each cap (one n-gon would vanish).
    brim = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=24, radius1=1.0, radius2=1.0, depth=0.03)['verts']
    bmesh.ops.delete(bm, geom=[v for v in brim if v.co.y < -0.001], context='VERTS')
    brim = [v for v in bm.verts if v.is_valid and abs(v.co.z) <= 0.016 and v.co.y >= -0.001 and abs(v.co.x) <= 1.001]
    bmesh.ops.scale(bm, verts=brim, vec=(0.3, 0.36, 1.0))
    bmesh.ops.rotate(bm, verts=brim, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(10), 3, 'X'))
    bmesh.ops.translate(bm, verts=brim, vec=(0, 0.3, low + 0.01))
    sphere(bm, (0, 0, BEAN['z1'] + BEAN['rz'] + 0.025), (0.04, 0.04, 0.025), 8)


part('cap', 'body', 'cream', cap)

# Limbs: short thick capsules in the player's colour; big round mitts; wide leather cuffs and boot straps hide the
# joints.
for sx, side in ((1, 'l'), (-1, 'r')):
    J = {k: Vector(JOINTS[f'{k}_{side}'][0]) for k in ('arm', 'forearm', 'hand', 'thigh', 'shin', 'foot')}
    part(f'arm_{side}', f'arm_{side}', 'body', lambda bm, J=J: capsule(bm, J['arm'], J['forearm'], 0.1))
    part(f'forearm_{side}', f'forearm_{side}', 'body', lambda bm, J=J: capsule(bm, J['forearm'], J['hand'], 0.1))
    part(f'cuff_{side}', f'forearm_{side}', 'leather', lambda bm, J=J: ring(bm, J['hand'] + Vector((0, 0, 0.05)), 0.13, 0.1))

    def mitt(bm, J=J, sx=sx):
        sphere(bm, J['hand'] + Vector((0, 0.01, -0.11)), (0.17, 0.15, 0.17), 18)
        sphere(bm, J['hand'] + Vector((-sx * 0.11, 0.09, -0.07)), (0.07, 0.07, 0.08), 12)

    part(f'mitt_{side}', f'hand_{side}', 'body', mitt)
    part(f'leg_{side}', f'shin_{side}', 'body', lambda bm, J=J: capsule(bm, J['shin'], J['foot'], 0.11))

    # A big rounded boot: cream canvas upper, a thick dark sole, a leather ankle strap; toe forward.
    def boot(bm, J=J):
        f = J['foot']
        sphere(bm, (f.x, f.y + 0.08, 0.15), (0.18, 0.26, 0.14), 18)
        ring(bm, (f.x, f.y, 0.24), 0.13, 0.1)

    part(f'boot_{side}', f'foot_{side}', 'cream', boot)
    part(f'sole_{side}', f'foot_{side}', 'sole', lambda bm, J=J: ring(bm, (0, 0, 0), 1.0, 0.07, segs=20) or bmesh.ops.transform(bm, verts=bm.verts[:], matrix=Matrix.Translation((J['foot'].x, J['foot'].y + 0.08, 0.035)) @ Matrix.Diagonal((0.185, 0.27, 1, 1))))
    part(f'strap_boot_{side}', f'foot_{side}', 'leather', lambda bm, J=J: ring(bm, (J['foot'].x, J['foot'].y, 0.29), 0.14, 0.06))

# ---------------------------------------------------------------- the "wave" clip
# Poses as data: per key, degrees per bone as (x, z) in three.js terms (x pitches forward, z swings out to the
# figure's side; positive z raises the right arm, negative the left). Keys are 30 fps frames. Pose-to-pose with
# toon timing: a quick anticipation dip, a snap up, three waves, a settle.
WAVE = [
    (0, {}),
    (4, {'body': (4, 0), 'arm_r': (10, -10), 'forearm_r': (-20, 0), 'thigh_l': (-8, 0), 'shin_l': (14, 0)}),
    (9, {'body': (-4, -6), 'arm_r': (0, 150), 'forearm_r': (0, 25), 'hand_r': (0, 10), 'arm_l': (0, -8)}),
    (14, {'body': (-4, -6), 'arm_r': (0, 145), 'forearm_r': (0, -30), 'hand_r': (0, -15), 'arm_l': (0, -8)}),
    (19, {'body': (-4, -6), 'arm_r': (0, 150), 'forearm_r': (0, 25), 'hand_r': (0, 10), 'arm_l': (0, -8)}),
    (24, {'body': (-4, -6), 'arm_r': (0, 145), 'forearm_r': (0, -30), 'hand_r': (0, -15), 'arm_l': (0, -8)}),
    (29, {'body': (-4, -6), 'arm_r': (0, 150), 'forearm_r': (0, 25), 'hand_r': (0, 10), 'arm_l': (0, -8)}),
    (36, {'body': (2, 0), 'arm_r': (0, 20), 'forearm_r': (-10, 0)}),
    (42, {}),
]


def pose_clip(name, keys):
    rig.animation_data_create()
    bones = rig.pose.bones
    for pb in bones:
        pb.rotation_mode = 'XYZ'
    for frame, pose in keys:
        for pb in bones:
            x, z = pose.get(pb.name, (0, 0))
            # Bone local axes are Blender world X, Z, -Y: three's x stays x, three's z (glTF z = Blender -Y) is the
            # bone's local Z with the sign flipped.
            pb.rotation_euler = (math.radians(x), 0, -math.radians(z))
            pb.keyframe_insert('rotation_euler', frame=frame + 1)
    action = rig.animation_data.action
    action.name = 'hero_' + name
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    rig.animation_data.action = None
    for pb in bones:
        pb.rotation_euler = (0, 0, 0)


pose_clip('wave', WAVE)

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_optimize_animation_size=True,
    export_draco_mesh_compression_enable=False,
)
