"""The railway's passenger car: the knifeboard (candidate Four), fittings for the place kit's flatbed.

docs/plans/passenger-car-previz.md and the blockout in character/car-previz-parts.ts, whose part list this follows.
Metres; game (x, y, z) -> Blender (x, -z, y) via G, Y-up export. The origin is the flatbed's: on the rail line (y 0),
across the middle (x 0) and halfway along the deck (z 0); the deck top is 0.7 m, 2.2 m wide and 3.2 m long (TRAILER,
src/proto/wagon/cars.ts). The car is no bigger than the flatbed, so no layout, coupling or collider changes.

Two nodes, each one mesh with its colours as vertex colours (colour attribute `Col`, linear), drawn in the kit's paint
(src/proto/place/car-kit.ts):

  car_fit       the first car, always drawn: natural-wood seats and a back-to-back bench down the middle, dark iron
                legs, boarded end panels with iron rails and posts, a board under each side of the deck, and the
                car's own body: an underframe and headstocks, low panelled sides with a waist rail either side of an
                open boarding gap, and a step under each gap (the game hides the flatbed's rail rack on this car)
  car_upgrade   the upgrade, built but switched off (the game has no upgrade rule yet; car-kit.ts `passengerCar`'s
                `upgraded` argument is the hook): the roof on four posts with a cream fringe, two lamps, a brass line

The upgrade's repaint (backs and ends red, rails and knobs brass) is a colour swap on the fit's vertex colours that
car-kit.ts does when `upgraded` (BACK -> RED, TRIM -> BRASS below); this file builds the first car's colours.
No two faces facing the same way share a plane, across both nodes shown together (asserted below).
"""
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
spec = json.loads(Path(__file__).with_suffix('.json').read_text())

D = spec['deck']['top']
S = D + spec['bench']['seatTop']
ROOF_UNDER = D + spec['roof']['fits'] + spec['roof']['headroom']

WOOD, BACK, IRON, TRIM = 'c99a5e', 'a8743f', '33343a', '4a4c54'
RED, RED_DARK, BRASS, CREAM, GLASS = 'e8392a', 'b62b20', 'd9a23a', 'f3e6c8', 'ffe9a8'


def G(x, y, z):
    return (x, -z, y)


def box(p, m, c, x, y, z):
    p.append({'kind': 'box', 'm': m, 'c': c, 'min': [x[0], y[0], z[0]], 'max': [x[1], y[1], z[1]]})


def pair(p, m, c, x, y, z):
    box(p, m, c, x, y, z)
    box(p, m, c, [-x[1], -x[0]], y, z)


def sphere(p, m, c, at, r, sy=1.0, seg=10):
    p.append({'kind': 'sphere', 'm': m, 'c': c, 'at': list(at), 'r': r, 'sy': sy, 'seg': seg})


def cy(p, m, c, at, len_, r0, r1, seg=10):
    p.append({'kind': 'cyl', 'm': m, 'c': c, 'axis': 'y', 'at': list(at), 'len': len_, 'r0': r0, 'r1': r1, 'seg': seg})


def build_parts():
    p = []
    # The spine (the shared back), its cap rail, the seat either side.
    box(p, 'fit', BACK, [-0.04, 0.04], [S - 0.02, S + 0.5], [-1.36, 1.36])
    box(p, 'fit', TRIM, [-0.07, 0.07], [S + 0.5, S + 0.56], [-1.4, 1.4])
    pair(p, 'fit', WOOD, [0.045, 0.55], [S - 0.06, S], [-1.37, 1.37])
    # Iron legs under it, and an arm at each end.
    for z in (-1.3, 0, 1.3):
        box(p, 'fit', IRON, [-0.5, 0.5], [D, S - 0.06], [z - 0.03, z + 0.03])
    for s in (-1, 1):
        box(p, 'fit', BACK, [-0.56, 0.56], [S - 0.1, S + 0.22], [1.375, 1.43] if s > 0 else [-1.43, -1.375])
    # A board under each side of the deck, so the flatbed reads as a coach (painted red with a brass line later).
    pair(p, 'fit', BACK, [1.105, 1.14], [0.42, 0.665], [-1.56, 1.56])
    # The car's own body (owner, 14 November: "it's clearly just overlaid on a cargo car ... it should look more
    # properly like a little passenger car"): the game draws this car without the flatbed's rail rack (its arms were
    # the "spokes"), so the underframe is here, with a headstock at each end.
    box(p, 'fit', IRON, [-0.88, 0.88], [0.16, 0.46], [-1.52, 1.52])
    for s in (-1, 1):
        box(p, 'fit', IRON, [-1.0, 1.0], [0.3, 0.5], [1.525, 1.6] if s > 0 else [-1.6, -1.525])
    # Each side: a low panelled side fore and aft of an open boarding gap (1.2 m, at the middle, where you step on),
    # a waist rail on it, a post with a knob at each edge of the gap, and a step under the gap on two hangers.
    for z in ([0.6, 1.49], [-1.49, -0.6]):
        pair(p, 'fit', BACK, [1.03, 1.085], [D + 0.06, D + 0.46], z)
        pair(p, 'fit', TRIM, [1.02, 1.095], [D + 0.5, D + 0.57], [z[0] - 0.01, z[1] + 0.005])
        for k in range(1, 3):  # panel battens
            zz = z[0] + (z[1] - z[0]) * k / 3
            pair(p, 'fit', TRIM, [1.086, 1.098], [D + 0.08, D + 0.44], [zz - 0.025, zz + 0.025])
    for z in (-0.6, 0.6):
        pair(p, 'fit', IRON, [1.015, 1.1], [D, D + 0.66], [z - 0.045, z + 0.045])
        for x in (-1.0575, 1.0575):
            sphere(p, 'fit', TRIM, [x, D + 0.7, z], 0.065)
    pair(p, 'fit', BACK, [1.145, 1.38], [0.33, 0.39], [-0.5, 0.5])
    for z in (-0.42, 0.42):
        pair(p, 'fit', IRON, [1.15, 1.19], [0.39, 0.6], [z - 0.025, z + 0.025])
    # Each end: a boarded panel to the knees and a rail at the hands, between corner posts.
    for s in (-1, 1):
        z = [1.5, 1.555] if s > 0 else [-1.555, -1.5]
        box(p, 'fit', BACK, [-0.98, 0.98], [D + 0.06, D + 0.52], z)
        box(p, 'fit', TRIM, [-0.99, 0.99], [D + 0.78, D + 0.85], [z[0] + 0.005, z[1] - 0.005])
        pair(p, 'fit', IRON, [0.99, 1.07], [D, D + 0.95], [z[0] - 0.01, z[1] + 0.01])
        for x in (-1.03, 1.03):
            sphere(p, 'fit', TRIM, [x, D + 0.99, (z[0] + z[1]) / 2], 0.065)
        # Upgrade: the posts carry on up to the roof.
        pair(p, 'upgrade', IRON, [1.0, 1.06], [D + 1.03, ROOF_UNDER], [z[0] - 0.005, z[1] + 0.005])
    # Upgrade: the roof, a red canopy with a raised middle and a cream fringe, over the whole deck.
    r = ROOF_UNDER
    box(p, 'upgrade', RED, [-1.24, 1.24], [r, r + 0.08], [-1.74, 1.74])
    box(p, 'upgrade', RED_DARK, [-0.86, 0.86], [r + 0.08, r + 0.17], [-1.66, 1.66])
    pair(p, 'upgrade', CREAM, [1.245, 1.275], [r - 0.12, r + 0.06], [-1.73, 1.73])
    for s in (-1, 1):
        box(p, 'upgrade', CREAM, [-1.23, 1.23], [r - 0.12, r + 0.06], [1.745, 1.775] if s > 0 else [-1.775, -1.745])
    # Two lamps hung under the roof: a brass cap, a brass shade, a warm glass.
    for z in (-0.75, 0.75):
        cy(p, 'upgrade', TRIM, [0, r - 0.06, z], 0.12, 0.02, 0.02, 6)
        cy(p, 'upgrade', BRASS, [0, r - 0.15, z], 0.06, 0.11, 0.06, 10)
        sphere(p, 'upgrade', GLASS, [0, r - 0.27, z], 0.09, 1.15)
    # A brass line along each side board.
    pair(p, 'upgrade', BRASS, [1.143, 1.152], [0.6, 0.625], [-1.54, 1.54])
    return p


def coplanar(parts, eps=0.002):
    faces = []
    for i, p in enumerate(parts):
        if p['kind'] == 'box':
            lo, hi, axes = p['min'], p['max'], (0, 1, 2)
        elif p['kind'] == 'cyl':
            r = max(p['r0'], p['r1'])
            lo = [p['at'][0] - r, p['at'][1] - p['len'] / 2, p['at'][2] - r]
            hi = [p['at'][0] + r, p['at'][1] + p['len'] / 2, p['at'][2] + r]
            axes = (1,)
        else:
            continue
        for axis in axes:
            u, v = [k for k in range(3) if k != axis]
            for sign in (-1, 1):
                faces.append((i, axis, sign, hi[axis] if sign > 0 else lo[axis], (lo[u], lo[v]), (hi[u], hi[v])))
    hits = []
    for a in range(len(faces)):
        for b in range(a + 1, len(faces)):
            f, g = faces[a], faces[b]
            if f[0] == g[0] or f[1] != g[1] or f[2] != g[2] or abs(f[3] - g[3]) > eps:
                continue
            du = min(f[5][0], g[5][0]) - max(f[4][0], g[4][0])
            dv = min(f[5][1], g[5][1]) - max(f[4][1], g[4][1])
            if du > 1e-4 and dv > 1e-4:
                hits.append(f"{parts[f[0]]['m']} {f[0]} and {parts[g[0]]['m']} {g[0]}: {'xyz'[f[1]]}={f[3]:.3f}")
    return hits


def linear(hex_):
    rgb = [int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]


def add_part(bm, p):
    if p['kind'] == 'box':
        lo, hi = p['min'], p['max']
        vs = bmesh.ops.create_cube(bm, size=1.0)['verts']
        bmesh.ops.scale(bm, verts=vs, vec=(hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]))
        bmesh.ops.translate(bm, verts=vs, vec=G((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
    elif p['kind'] == 'cyl':
        vs = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=p['seg'], radius1=p['r0'],
                                   radius2=p['r1'], depth=p['len'])['verts']
        bmesh.ops.translate(bm, verts=vs, vec=G(*p['at']))
    else:
        vs = bmesh.ops.create_uvsphere(bm, u_segments=p['seg'], v_segments=p['seg'] // 2, radius=p['r'])['verts']
        bmesh.ops.scale(bm, verts=vs, vec=(1, 1, p['sy']))
        bmesh.ops.translate(bm, verts=vs, vec=G(*p['at']))


def node(name, parts, bevel):
    bm = bmesh.new()
    cid = bm.faces.layers.int.new('cid')
    palette = []
    for p in parts:
        if p['c'] not in palette:
            palette.append(p['c'])
        add_part(bm, p)
        for f in bm.faces:
            if not f[cid]:
                f[cid] = palette.index(p['c']) + 1
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ids = mesh.attributes['cid']
    col = mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for poly in mesh.polygons:
        rgb = linear(palette[ids.data[poly.index].value - 1])
        for li in poly.loop_indices:
            col.data[li].color = (*rgb, 1.0)
    mesh.attributes.remove(ids)
    mesh.color_attributes.active_color = col
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    mod = obj.modifiers.new('broad_edges', 'BEVEL')
    mod.width, mod.segments = bevel, 1
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(40)
    mod.harden_normals = True
    obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj


parts = build_parts()
hits = coplanar(parts)
if hits:
    raise SystemExit('passenger-car: coplanar faces:\n  ' + '\n  '.join(hits))
print(f'passenger-car: no coplanar faces; {len(parts)} parts, seat top {S:.2f}, roof under {ROOF_UNDER:.2f}')
for name, module in (('car_fit', 'fit'), ('car_upgrade', 'upgrade')):
    node(name, [p for p in parts if p['m'] == module], 0.012)

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_normals=True,
                          export_materials='NONE', export_vertex_color='ACTIVE', export_cameras=False,
                          export_lights=False, export_extras=False, export_animations=False)
