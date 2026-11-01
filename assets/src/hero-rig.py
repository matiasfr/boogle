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
    'body': material('body', '2ec4b6', 0.55),
    'cream': material('cream', 'efe3c8', 0.85),
    'leather': material('leather', '8a5a34', 0.7),
    'brass': material('brass', 'c9a046', 0.35),
    'eye': material('eye', 'ffffff', 0.3),
    'pupil': material('pupil', '13243f', 0.3),
}

# ---------------------------------------------------------------- armature
# Joint positions (Blender coordinates, metres). The visual figure is about 1.7 m, like today's capsule.
JOINTS = {
    'root': ((0, 0, 0), None),
    'hips': ((0, 0, 0.62), 'root'),
    'body': ((0, 0, 0.78), 'hips'),
    'arm_l': ((0.36, 0, 1.12), 'body'),
    'forearm_l': ((0.42, 0, 0.9), 'arm_l'),
    'hand_l': ((0.44, 0, 0.7), 'forearm_l'),
    'thigh_l': ((0.15, 0, 0.5), 'hips'),
    'shin_l': ((0.16, 0, 0.33), 'thigh_l'),
    'foot_l': ((0.16, 0, 0.17), 'shin_l'),
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


def ring(bm, at, radius, minor, axis='Z', segs=16):
    """A cuff: a short thick tube around a limb."""
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=radius, radius2=radius, depth=minor)
    if axis == 'X':
        bmesh.ops.rotate(bm, verts=r['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)


def box(bm, at, size, bevel=0.0):
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=r['verts'], vec=size)
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)
    if bevel:
        bmesh.ops.bevel(bm, geom=r['verts'] + bm.edges[:], offset=bevel, segments=2, affect='EDGES')


# The bean: one body-and-head, as today's capsule, a little pear-shaped.
part('body', 'body', 'body', lambda bm: sphere(bm, (0, 0, 1.12), (0.38, 0.34, 0.5), 22))
# Low cream overalls: a shell round the bottom of the bean, two straps and brass buttons.
part('bib', 'hips', 'cream', lambda bm: sphere(bm, (0, 0, 0.8), (0.4, 0.36, 0.26), 22))
for sx, side in ((1, 'l'), (-1, 'r')):
    part(f'strap_{side}', 'body', 'cream', lambda bm, sx=sx: box(bm, (sx * 0.16, 0.3, 1.04), (0.07, 0.03, 0.26)))
    part(f'button_{side}', 'body', 'brass', lambda bm, sx=sx: ring(bm, (sx * 0.17, 0.335, 0.96), 0.035, 0.03, 'X'))
# Eyes and cap ride the body bone, so they follow its lean; code moves the pupils.
for sx, side in ((1, 'l'), (-1, 'r')):
    part(f'eye_{side}', 'body', 'eye', lambda bm, sx=sx: sphere(bm, (sx * 0.13, 0.27, 1.36), (0.12, 0.1, 0.13)))
    part(f'pupil_{side}', 'body', 'pupil', lambda bm, sx=sx: sphere(bm, (sx * 0.13, 0.36, 1.35), (0.05, 0.03, 0.06)))


def cap(bm):
    dome = sphere(bm, (0, -0.02, 1.53), (0.3, 0.29, 0.2), 18)
    bmesh.ops.delete(bm, geom=[v for v in dome if v.co.z < 1.53 - 0.001], context='VERTS')
    brim = bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.17, radius2=0.17, depth=0.03)
    bmesh.ops.scale(bm, verts=brim['verts'], vec=(1.2, 1.0, 1.0))
    bmesh.ops.rotate(bm, verts=brim['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-12), 3, 'X'))
    bmesh.ops.translate(bm, verts=brim['verts'], vec=(0, 0.28, 1.55))


part('cap', 'body', 'cream', cap)

# Limbs: short capsules, the player's colour; leather cuffs at the wrists and boot tops hide the joints.
for sx, side in ((1, 'l'), (-1, 'r')):
    J = {k: Vector(JOINTS[f'{k}_{side}'][0]) for k in ('arm', 'forearm', 'hand', 'thigh', 'shin', 'foot')}
    part(f'arm_{side}', f'arm_{side}', 'body', lambda bm, J=J: capsule(bm, J['arm'], J['forearm'], 0.075))
    part(f'forearm_{side}', f'forearm_{side}', 'body', lambda bm, J=J: capsule(bm, J['forearm'], J['hand'], 0.075))
    part(f'cuff_{side}', f'forearm_{side}', 'leather', lambda bm, J=J: ring(bm, J['hand'] + Vector((0, 0, 0.05)), 0.1, 0.07))
    # A chunky mitt: a squashed sphere and a thumb.
    def mitt(bm, J=J, sx=sx):
        sphere(bm, J['hand'] + Vector((0, 0.02, -0.08)), (0.12, 0.1, 0.13))
        sphere(bm, J['hand'] + Vector((-sx * 0.08, 0.06, -0.04)), (0.05, 0.05, 0.06))

    part(f'mitt_{side}', f'hand_{side}', 'body', mitt)
    part(f'thigh_{side}', f'thigh_{side}', 'body', lambda bm, J=J: capsule(bm, J['thigh'], J['shin'], 0.1))
    part(f'shin_{side}', f'shin_{side}', 'body', lambda bm, J=J: capsule(bm, J['shin'], J['foot'], 0.1))

    # A strapped boot: cream canvas upper, leather sole, toe pointing forward.
    def boot(bm, J=J):
        f = J['foot']
        sphere(bm, (f.x, f.y + 0.07, 0.1), (0.13, 0.2, 0.1))
        ring(bm, (f.x, f.y, 0.19), 0.12, 0.09)

    part(f'boot_{side}', f'foot_{side}', 'cream', boot)
    part(f'sole_{side}', f'foot_{side}', 'leather', lambda bm, J=J: sphere(bm, (J['foot'].x, J['foot'].y + 0.07, 0.035), (0.135, 0.205, 0.04)))
    part(f'strap_boot_{side}', f'foot_{side}', 'leather', lambda bm, J=J: ring(bm, (J['foot'].x, J['foot'].y + 0.02, 0.24), 0.125, 0.04))

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
