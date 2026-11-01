# The hero: a jointed toy figure (the "Ratchet v1" Bib Buddy; target: a front/side/back reference sheet drawn from
# .look/previz/player-ratchet-bibs) on a 15-bone armature, with one authored clip, "wave". Every part is a rigid
# mesh parented to one bone: no skin weights, so nothing pinches at a joint, and cuffs, boot tops and hems hide the
# seams like an action figure's. Squash, lean and locomotion stay in code; the rig only poses limbs
# (docs/research/procedural-animation.md, recommendation 3). Built from scratch by Blender's Python, exported by
# `npm run assets` (assets/src/scaffold-kit.py has the conventions).
#
# Rig conventions, so code can pose the same bones:
# - Blender Z up, the figure faces +Y (glTF -Z, the avatar's forward); origin on the ground between the feet.
# - Every bone points straight up (+Z) with no roll, so a bone's local X, Y, Z are world X, Z, -Y in Blender and
#   X, Y, Z in three.js: rotation.x pitches a limb forward or back, rotation.z swings it out to the side.
# - Bone names use underscores (three.js strips dots from node names): root, hips, body, arm_l/r, forearm_l/r,
#   hand_l/r, thigh_l/r, shin_l/r, foot_l/r. `_l` is the figure's left (+X).
#
# Base and clothes, so outfits can be swapped:
# - The base figure is complete on its own (the bare toy: body, face, arms, hands, legs, feet). Its parts are named
#   `<part>_part`.
# - Each piece of clothing is named `wear_<slot>_<item>_<part>`; slots: head, body, hands, feet. Code shows one item
#   per slot and hides the rest. An item in the feet slot hides the bare feet (`foot_l/r_part`) it covers.
# - Clothes sit a few cm proud of the base and hang off the same bones, so any item fits any colour of hero. Later
#   items can live in their own .glb with the same bone names.
#
# Model or texture: geometry for what changes the silhouette at play distance (7 m) or moves (eyes, hands, cap and
# brim, the overalls' edges and straps, cuffs, boots and soles); a texture, later, for flat surface detail that
# doesn't (stitching, a pocket, canvas weave, cap panel seams, sole tread, leather grain). Expressions would be
# texture decals too; the eyes stay geometry because they're googly and code moves the pupils.
#
# Materials by role: "body" (the player's colour; code recolours it), "cream", "leather", "sole", "brass", "eye",
# "pupil", "tongue".
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
    'brass': material('brass', 'c9a046', 0.35),
    'eye': material('eye', 'ffffff', 0.25),
    'pupil': material('pupil', '13243f', 0.25),
    'tongue': material('tongue', 'e8606e', 0.5),
}

# ---------------------------------------------------------------- armature
# Joint positions (Blender coordinates, metres). The figure is about 1.8 m to the cap, like today's capsule: a tall
# pill that is head and body in one, short legs, big hands and feet.
JOINTS = {
    'root': ((0, 0, 0), None),
    'hips': ((0, 0, 0.42), 'root'),
    'body': ((0, 0, 0.58), 'hips'),
    'arm_l': ((0.39, 0, 1.06), 'body'),
    'forearm_l': ((0.5, 0, 0.88), 'arm_l'),
    'hand_l': ((0.54, 0.02, 0.7), 'forearm_l'),
    'thigh_l': ((0.2, 0, 0.42), 'hips'),
    'shin_l': ((0.21, 0, 0.3), 'thigh_l'),
    'foot_l': ((0.21, 0, 0.18), 'shin_l'),
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

# ---------------------------------------------------------------- building blocks


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
    # Base parts end in `_part`, clothes start with `wear_`: never the bone's own name, since clips bind by name.
    ob = bpy.data.objects.new(name if name.startswith('wear_') else name + '_part', me)
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


def capsule(bm, a, b, ra, rb=None, segs=12):
    """A capsule from point a to point b, radius ra at a and rb at b (a taper): a cylinder with sphere caps."""
    rb = ra if rb is None else rb
    a, b = Vector(a), Vector(b)
    d = b - a
    cyl = bmesh.ops.create_cone(bm, cap_ends=False, segments=segs, radius1=ra, radius2=rb, depth=d.length)
    rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, verts=cyl['verts'], matrix=Matrix.Translation((a + b) / 2) @ rot)
    sphere(bm, a, (ra,) * 3, segs)
    sphere(bm, b, (rb,) * 3, segs)


def ring(bm, at, radius, depth, axis='Z', segs=16, r2=None):
    """A cuff, a hem or a button: a short thick cylinder (slightly flared with r2)."""
    r = bmesh.ops.create_cone(
        bm, cap_ends=True, segments=segs, radius1=radius, radius2=radius if r2 is None else r2, depth=depth
    )
    if axis == 'Y':
        bmesh.ops.rotate(bm, verts=r['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    bmesh.ops.translate(bm, verts=r['verts'], vec=at)


def cut(bm, planes, keep):
    """Slice the mesh with planes ((point, normal) pairs), then delete the faces whose centre `keep` rejects."""
    for co, no in planes:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context='FACES')


def sides(fn):
    """Build a left and a right copy: fn(sx, side) with sx = 1 for the figure's left (+X), -1 for its right."""
    for sx, side in ((1, 'l'), (-1, 'r')):
        fn(sx, side)


J = {k: Vector(v[0]) for k, v in JOINTS.items()}

# ---------------------------------------------------------------- the base figure
# The bean: head and body in one, a pill (straight sides, round top and bottom), a touch wider at the bottom.
BEAN = {'z0': 0.8, 'z1': 1.34, 'rx': 0.42, 'ry': 0.38, 'rz': 0.38}  # lower and upper cap centres, radii


def flare(z):
    """How much wider the bean is at height z: 1.04 at the bottom, 1 from the middle up."""
    return 1 + 0.04 * max(0.0, min(1.0, (BEAN['z0'] + 0.2 - z) / 0.58))


def bean(bm, grow=0.0, segs=28):
    verts = sphere(bm, (0, 0, 0), (BEAN['rx'] + grow, BEAN['ry'] + grow, BEAN['rz'] + grow), segs)
    for v in verts:
        v.co.z += BEAN['z1'] if v.co.z > 0 else BEAN['z0']
        k = flare(v.co.z)
        v.co.x *= k
        v.co.y *= k
    return verts


def on_bean(x, z, out=0.0):
    """The front surface point of the bean at (x, z), pushed `out` along +Y: where the face and buttons sit."""
    dz = z - BEAN['z1'] if z > BEAN['z1'] else z - BEAN['z0'] if z < BEAN['z0'] else 0.0
    k = flare(z)
    t = 1 - (x / (BEAN['rx'] * k)) ** 2 - (dz / BEAN['rz']) ** 2
    return Vector((x, BEAN['ry'] * k * math.sqrt(max(t, 0)) + out, z))


part('body', 'body', 'body', bean)

# Face: big googly eyes close together high on the bean (right under a cap's brim), big pupils with a glint, an open
# D-shaped smile with a tongue. Eyes ride the body bone, so they follow its lean; code moves the pupils.
EYE_Z, EYE_X = 1.3, 0.15


def eye(sx, side):
    c = on_bean(sx * EYE_X, EYE_Z, -0.06)
    part(f'eye_{side}', 'body', 'eye', lambda bm: sphere(bm, c, (0.14, 0.12, 0.155), 20))
    part(f'pupil_{side}', 'body', 'pupil', lambda bm: sphere(bm, c + Vector((-sx * 0.012, 0.115, -0.012)), (0.085, 0.035, 0.095), 16))
    part(f'glint_{side}', 'body', 'eye', lambda bm: sphere(bm, c + Vector((sx * 0.02, 0.145, 0.03)), (0.026, 0.012, 0.026), 8))


sides(eye)


def mouth(bm):
    # The lower half of a flat dark ellipsoid set into the bean: a wide open D.
    c = on_bean(0, 1.11, -0.014)
    verts = sphere(bm, c, (0.115, 0.032, 0.075), 18)
    bmesh.ops.delete(bm, geom=[v for v in verts if v.co.z > c.z + 0.001], context='VERTS')


part('mouth', 'body', 'pupil', mouth)
part('tongue', 'body', 'tongue', lambda bm: sphere(bm, on_bean(0.012, 1.06, 0.002), (0.055, 0.02, 0.026), 12))


def limbs(sx, side):
    s = side
    # Arms: thick and short, tapering a little to the wrist; the shoulder sinks into the bean so no gap shows.
    part(f'arm_{s}', f'arm_{s}', 'body', lambda bm: capsule(bm, J[f'arm_{s}'] - Vector((sx * 0.05, 0, 0)), J[f'forearm_{s}'], 0.1, 0.105))
    part(f'forearm_{s}', f'forearm_{s}', 'body', lambda bm: capsule(bm, J[f'forearm_{s}'], J[f'hand_{s}'], 0.105, 0.115))

    def mitt(bm):
        # A big round mitten hand, a little flattened front to back, with a thumb towards the front.
        h = J[f'hand_{s}']
        sphere(bm, h + Vector((sx * 0.01, 0, -0.12)), (0.17, 0.15, 0.175), 20)
        sphere(bm, h + Vector((-sx * 0.1, 0.08, -0.07)), (0.07, 0.07, 0.085), 12)

    part(f'hand_{s}', f'hand_{s}', 'body', mitt)
    # Legs: short and stout; the thigh tucks up into the bean.
    part(f'thigh_{s}', f'thigh_{s}', 'body', lambda bm: capsule(bm, J[f'thigh_{s}'] + Vector((0, 0, 0.06)), J[f'shin_{s}'], 0.15, 0.145))
    part(f'shin_{s}', f'shin_{s}', 'body', lambda bm: capsule(bm, J[f'shin_{s}'], J[f'foot_{s}'], 0.145, 0.14))
    # A bare foot: a round chunky foot with the toe forward (boots cover it, and hide it).
    part(f'foot_{s}', f'foot_{s}', 'body', lambda bm: sphere(bm, (J[f'foot_{s}'].x * 1.05, 0.07, 0.11), (0.18, 0.24, 0.12), 20))


sides(limbs)

# ---------------------------------------------------------------- clothes: the work outfit
# head: a baseball cap. A dome over the top of the bean, a little lower at the back, a long D-shaped brim out front,
# tipped up a little and sitting right on top of the eyes, a button on top.


def cap(bm):
    bean(bm, 0.022, 24)
    low = BEAN['z1'] + 0.13
    cut(bm, [((0, 0, low), (0, -0.15, 1))], lambda c: c.z > low + 0.15 * c.y)
    # Triangle-fan caps, so cutting the back half off leaves the front half of each cap (one n-gon would vanish).
    brim = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=28, radius1=1.0, radius2=1.0, depth=0.035)['verts']
    bmesh.ops.delete(bm, geom=[v for v in brim if v.co.y < -0.001], context='VERTS')
    brim = [v for v in bm.verts if v.is_valid and abs(v.co.z) <= 0.018 and v.co.y >= -0.001 and abs(v.co.x) <= 1.001]
    # Curve the brim down at its sides, like a worn-in cap.
    for v in brim:
        v.co.z -= 0.02 * v.co.x * v.co.x
    bmesh.ops.scale(bm, verts=brim, vec=(0.27, 0.3, 1.0))
    bmesh.ops.rotate(bm, verts=brim, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(12), 3, 'X'))
    bmesh.ops.translate(bm, verts=brim, vec=(0, 0.27, low + 0.005))
    sphere(bm, (0, 0, BEAN['z1'] + BEAN['rz'] + 0.022), (0.045, 0.045, 0.028), 8)


part('wear_head_cap', 'body', 'cream', cap)

# body: overalls. Cut from a slightly larger bean: shorts round the bottom up to WAIST, a bib up the front with a
# straight top edge; wide straps from the bib's corners over the shoulders and straight down the back; brass buttons
# where strap meets bib; short legs to mid-thigh with a turned-up hem. (The pocket and stitching are texture work.)
WAIST, BIB_TOP, BIB_HALF = 0.78, 0.98, 0.24


def overalls(bm):
    bean(bm, 0.022)
    planes = [((0, 0, WAIST), (0, 0, 1)), ((0, 0, BIB_TOP), (0, 0, 1)), ((BIB_HALF, 0, 0), (1, 0, 0)), ((-BIB_HALF, 0, 0), (1, 0, 0))]
    cut(bm, planes, lambda c: c.z < WAIST or (c.y > 0 and abs(c.x) < BIB_HALF and c.z < BIB_TOP))


part('wear_body_overalls', 'body', 'cream', overalls)


def overall_sides(sx, side):
    def strap(bm):
        # Round the body from the bib's top corner to the back of the shorts, hugging the surface, arching up over
        # the arm on the way (the bean has no shoulders, so the strap goes round the side above the arm).
        t0 = math.asin(0.19 / BEAN['rx'])
        pts = []
        for i in range(11):
            u = i / 10
            t = t0 + u * (math.pi - 2 * t0)
            z = BIB_TOP - 0.03 + (WAIST + 0.04 - BIB_TOP + 0.03) * u + 0.2 * math.sin(math.pi * u)
            k = flare(z) + 0.075
            pts.append(Vector((sx * BEAN['rx'] * k * math.sin(t), BEAN['ry'] * k * math.cos(t), z)))
        for a, b in zip(pts, pts[1:]):
            capsule(bm, a, b, 0.045, segs=8)

    part(f'wear_body_overalls_strap_{side}', 'body', 'cream', strap)
    part(f'wear_body_overalls_button_{side}', 'body', 'brass', lambda bm: ring(bm, on_bean(sx * 0.19, BIB_TOP - 0.035, 0.055), 0.045, 0.035, 'Y'))
    # Short trouser legs to mid-thigh, flaring a little, with a turned-up hem.
    hip = J[f'thigh_{side}']
    part(f'wear_body_overalls_leg_{side}', f'thigh_{side}', 'cream', lambda bm: capsule(bm, hip + Vector((0, 0, 0.1)), hip - Vector((0, 0, 0.04)), 0.16, 0.165, 14))
    part(f'wear_body_overalls_hem_{side}', f'thigh_{side}', 'cream', lambda bm: ring(bm, hip - Vector((0, 0, 0.1)), 0.172, 0.05, segs=18))


sides(overall_sides)

# hands: wide leather work cuffs at the wrists.
sides(lambda sx, side: part(f'wear_hands_cuffs_{side}', f'forearm_{side}', 'leather', lambda bm: ring(bm, J[f'hand_{side}'] + Vector((0, 0, 0.045)), 0.125, 0.11, segs=18, r2=0.115)))

# feet: big rounded work boots. A cream canvas upper with a round toe, a thick dark sole, a leather ankle strap with
# a brass button.


def boots(sx, side):
    f = J[f'foot_{side}']

    def upper(bm):
        sphere(bm, (f.x, 0.07, 0.14), (0.175, 0.255, 0.135), 20)
        ring(bm, (f.x, 0.0, 0.25), 0.14, 0.12, segs=18, r2=0.13)

    part(f'wear_feet_boots_{side}', f'foot_{side}', 'cream', upper)

    def sole(bm):
        ring(bm, (0, 0, 0), 1.0, 0.07, segs=24)
        bmesh.ops.transform(bm, verts=bm.verts[:], matrix=Matrix.Translation((f.x, 0.07, 0.035)) @ Matrix.Diagonal((0.185, 0.27, 1, 1)))

    part(f'wear_feet_boots_sole_{side}', f'foot_{side}', 'sole', sole)
    part(f'wear_feet_boots_strap_{side}', f'foot_{side}', 'leather', lambda bm: ring(bm, (f.x, 0.0, 0.26), 0.15, 0.06, segs=18))
    part(f'wear_feet_boots_button_{side}', f'foot_{side}', 'brass', lambda bm: ring(bm, (f.x + sx * 0.1, 0.11, 0.26), 0.03, 0.03, 'Y'))


sides(boots)

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
