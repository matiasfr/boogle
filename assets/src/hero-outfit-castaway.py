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
# round the head, so brim and crown share their joining edge and nothing can show between them. Its inside follows
# the head: at each angle the profile is measured out from where the bean's surface is at HAT_BASE (the bean is an
# ellipse, wider than deep), and that ring sits just inside the surface, so the hat rests on the head with no gap. The
# brim droops a little towards its edge; a red band sits on the crown.
HAT_BASE = CROWN_CUT - 0.03  # where the hat meets the head: below the cut, so no bare crown shows


def straw_hat(bm):
    # (metres out from the head's surface, height above HAT_BASE): round the outside, then back along the underside.
    top = [(0.36, -0.06), (0.25, -0.015), (0.06, 0.0), (0.05, 0.12), (0.02, 0.2), (None, 0.215)]
    under = [(None, 0.17), (-0.03, 0.16), (-0.012, 0.0), (0.25, -0.035), (0.36, -0.09)]
    prof = top + under
    segs = 40
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        dz = HAT_BASE - BEAN['z1']
        rx = BEAN['rx'] * widths(HAT_BASE)[0] * math.sqrt(1 - (dz / BEAN['rz']) ** 2)
        ry = BEAN['ry'] * widths(HAT_BASE, math.sin(a) > 0)[1] * math.sqrt(1 - (dz / BEAN['rz']) ** 2)
        c, sn = math.cos(a), math.sin(a)
        rh = 1 / math.sqrt((c / rx) ** 2 + (sn / ry) ** 2)  # the head's radius in this direction
        ring_ = []
        for out, z in prof:
            r = 0.0 if out is None else rh + out
            ring_.append(bm.verts.new((r * c, r * sn, HAT_BASE + z)))
        rings.append(ring_)
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % segs]
        for j in range(len(prof) - 1):
            bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
        bm.faces.new((r0[-1], r1[-1], r1[0], r0[0]))  # the brim's rim closes the loop
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)  # the profile's points on the axis
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])


def band(bm):
    # A ribbon round the crown just above the brim, following the crown's outside.
    straw_hat(bm)
    cut(bm, [((0, 0, HAT_BASE + 0.01), (0, 0, 1)), ((0, 0, HAT_BASE + 0.08), (0, 0, 1))], lambda c: HAT_BASE + 0.01 < c.z < HAT_BASE + 0.08 and c.to_2d().length > 0.2 and c.z > HAT_BASE + 0.005)
    for v in bm.verts:
        v.co += Vector((v.co.x, v.co.y, 0)).normalized() * 0.012


part('wear_head_strawhat', 'body', 'straw', straw_hat)
part('wear_head_strawhat_band', 'body', 'cloth_red', band)

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
