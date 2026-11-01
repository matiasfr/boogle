# Scaffold kit: a pole, a plank and a clamp, plus a "drop" clip that drops a piece into place with a squash.
# Built from scratch by Blender's Python (no .blend to open), then exported as glTF by `npm run assets`, which runs
#   Blender -b --factory-startup --python assets/src/scaffold-kit.py -- <raw.glb>
# The pieces are a kit placed and timed by code (docs/plans/asset-pipeline.md, "Models or code").
#
# Conventions for an asset script (docs/plans/asset-pipeline.md, "Authoring"):
# - metres, Blender Z up (the exporter turns it into glTF Y up); each piece's origin is where code places it;
# - one object per piece, named as code looks it up; flat colours as material base colours, no textures;
# - a clip is one NLA track name across objects; the exporter merges same-named tracks into one glTF animation.
import sys
import math
import bpy
import bmesh

out = sys.argv[sys.argv.index('--') + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30


def material(name, hex_srgb, rough=0.9):
    """A flat-colour material; the hex is sRGB (how we pick colours), Blender and glTF store linear."""
    r, g, b = (int(hex_srgb[i : i + 2], 16) / 255 for i in (0, 2, 4))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = rough
    return m


WOOD_DARK = material('pole', '7a5634')
WOOD = material('plank', 'c49a62')
IRON = material('iron', '4d4b52', 0.6)


def piece(name, build, mat):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False  # faceted, like the code-built props
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def move(bm, verts, x=0.0, y=0.0, z=0.0):
    bmesh.ops.translate(bm, verts=verts, vec=(x, y, z))


def pole(bm):
    # A 3 m pole with a slight taper, origin at its foot. Eight sides read round at play distance.
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.075, radius2=0.06, depth=3.0)
    move(bm, r['verts'], z=1.5)
    # A lashing band near the top: the kind of hand detail code-built props skip.
    band = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.085, radius2=0.08, depth=0.1)
    move(bm, band['verts'], z=2.7)


def plank(bm):
    # 2.4 x 0.3 m, 6 cm thick, origin at the middle of its underside; chamfered top edges at both ends.
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=r['verts'], vec=(2.4, 0.3, 0.06))
    move(bm, r['verts'], z=0.03)
    ends = [e for e in bm.edges if all(abs(v.co.x) > 1.19 and v.co.z > 0.05 for v in e.verts)]
    bmesh.ops.bevel(bm, geom=ends, offset=0.025, segments=1, affect='EDGES')


def clamp(bm):
    # An iron collar that wraps a pole, plus a wedge; origin at the collar's centre.
    ring = bmesh.ops.create_cone(bm, cap_ends=False, segments=8, radius1=0.1, radius2=0.1, depth=0.12)
    bmesh.ops.solidify(bm, geom=[f for f in bm.faces], thickness=0.025)
    wedge = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=wedge['verts'], vec=(0.1, 0.06, 0.1))
    move(bm, wedge['verts'], x=0.14)
    del ring


pieces = [piece('pole', pole, WOOD_DARK), piece('plank', plank, WOOD), piece('clamp', clamp, IRON)]

# The "drop" clip, 0.6 s at 30 fps: falls 2.5 m with a tilt, lands with a squash, settles. The keys are absolute
# local values, so code parents each instance under a group that holds its real place (src/render/assets.ts).
KEYS = [  # frame, height, tilt (degrees), (xy scale, z scale)
    (0, 2.5, 10, (1.0, 1.0)),
    (8, 0.0, 0, (1.0, 1.0)),
    (11, 0.0, 0, (1.12, 0.8)),
    (14, 0.0, 0, (0.95, 1.06)),
    (18, 0.0, 0, (1.0, 1.0)),
]
for ob in pieces:
    ob.animation_data_create()
    for f, h, tilt, (sxy, sz) in KEYS:
        ob.location = (0, 0, h)
        ob.rotation_euler = (math.radians(tilt), 0, 0)
        ob.scale = (sxy, sxy, sz)
        for path in ('location', 'rotation_euler', 'scale'):
            ob.keyframe_insert(path, frame=f + 1)
    action = ob.animation_data.action
    action.name = ob.name + '_drop'
    track = ob.animation_data.nla_tracks.new()
    track.name = 'drop'
    track.strips.new('drop', 1, action)
    ob.animation_data.action = None
    ob.location, ob.rotation_euler, ob.scale = (0, 0, 0), (0, 0, 0), (1, 1, 1)

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
    export_draco_mesh_compression_enable=False,  # meshopt is applied afterwards by gltf-transform
)
