# The castaway outfit for the hero (era 1, .look/previz/player-eras): a wide straw hat and red shorts with a rope
# belt, barefoot. Runs the shared top of hero-rig.py (armature, materials, helpers), then builds only its own clothes,
# so every part hangs off a bone with the hero's name and rest pose; code moves each one onto the hero's own bone
# (src/features/proto-hero-rig.ts). Naming as in hero-rig.py: wear_<slot>_<item>_<part>; no feet item, so the bare
# feet show. Rebuild it (`npm run assets -- hero-outfit-castaway --force`) when the shared part of hero-rig.py changes.
import os
import sys

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hero-rig.py')
shared = open(src).read().split('# ================================================================ end of the shared part')[0]
exec(compile(shared, src, 'exec'))

# head: a wide straw hat, one closed piece: a profile (brim edge in to the crown, up the crown, across the top) spun
# round the head, so brim and crown share their joining edge and nothing can show between them. The brim droops a
# little towards its edge; a red band sits on the crown.
HAT_BASE = BEAN['z1'] + BEAN['rz'] - 0.12  # where the crown meets the brim, a little below the top of the head


def straw_hat(bm):
    # (radius, height above HAT_BASE) round the outside, then back along the underside.
    top = [(0.72, -0.06), (0.6, -0.015), (0.42, 0.0), (0.4, 0.12), (0.36, 0.2), (0.0, 0.21)]
    under = [(0.0, 0.17), (0.33, 0.16), (0.37, -0.035), (0.6, -0.05), (0.72, -0.09)]
    prof = top + under
    segs = 32
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), HAT_BASE + z)) for r, z in prof])
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % segs]
        for j in range(len(prof) - 1):
            bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
        bm.faces.new((r0[-1], r1[-1], r1[0], r0[0]))  # the brim's rim closes the loop
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)  # the profile's points on the axis
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])


part('wear_head_strawhat', 'body', 'straw', straw_hat)
part('wear_head_strawhat_band', 'body', 'cloth_red', lambda bm: ring(bm, (0, 0, HAT_BASE + 0.045), 0.43, 0.075, segs=32, r2=0.418))

# body: shorts. Cut from a slightly larger bean below the waist, with a rope belt and short legs to mid-thigh.
SHORTS_TOP = 0.74


def shorts(bm):
    bean(bm, 0.022)
    cut(bm, [((0, 0, SHORTS_TOP), (0, 0, 1))], lambda c: c.z < SHORTS_TOP)


part('wear_body_shorts', 'body', 'cloth_red', shorts)
part('wear_body_shorts_belt', 'body', 'rope', lambda bm: ring(bm, (0, 0, SHORTS_TOP - 0.02), 0.445, 0.05, segs=28))


def shorts_legs(sx, side):
    hip = J[f'thigh_{side}']
    part(f'wear_body_shorts_leg_{side}', f'thigh_{side}', 'cloth_red', lambda bm: capsule(bm, hip + Vector((0, 0, 0.1)), hip - Vector((0, 0, 0.03)), 0.19, 0.195, 14))


sides(shorts_legs)

# Export the clothes and the armature they hang from; no clips (the hero file has them).
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
