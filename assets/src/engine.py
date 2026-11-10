"""The railway's train engine: A, the stubby toy, at engine.json's scale, its cab fitted to Buddy.

docs/plans/engine-previz.md ("Build plan: the picked engine") and the blockout in character/engine-previz-parts.ts,
whose part list this recipe follows. Metres; game (x, y, z) -> Blender (x, -z, y) via G, Y-up export.

The origin is the car's: on the rail line (y 0), across the middle (x 0) and halfway along the frame (z 0), so the
frame runs +-hz either side. One node per thing an upgrade swaps, each one mesh with its colours as vertex colours
(colour attribute `Col`, linear); materials are the game's own (src/proto/place/engine-kit.ts):

  engine_body          frame, footplate, buffer beams and buffers, the walk-in cab, the empty saddles, the steps
  engine_rods          the two side rods, at rest (the game lifts them round the crank)
  engine_door          one cab door drawn shut on the +x side, its window open; the game hinges it at its back edge,
                       two instances (the cab's front windows are open too: see holed())
  engine_boiler        barrel, smokebox and door, chimney, dome, and the backhead's controls inside the cab
  engine_lashing       the gold rope rings and knot, 3 cm clear of the boiler (boiler-first-choice's mark)
  engine_stool         the driver's tall stool
  engine_body_long, engine_boiler_long, engine_lashing_long   the longer-boiler upgrade (not yet wired in the game)

The wheels are the place kit's wheel batch. No two faces facing the same way share a plane, across every node shown
together (asserted below), so the cab and its base can't z-fight the way the old shell did.
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

S = spec['scale']
FRAME, WHEELS, CAB, BOIL, STOOL = spec['frame'], spec['wheels'], spec['cab'], spec['boiler'], spec['stool']

RED, DARK, BRASS, ROPE = 'e8392a', '24262c', 'd9a23a', 'd9a438'
DOOR, GLASS, WOOD = '3a3c42', '1d2430', 'a9794c'


def G(x, y, z):
    return (x, -z, y)


# ---------------------------------------------------------------- the part list (as engine-previz-parts.ts)
def box(p, m, c, x, y, z):
    p.append({'kind': 'box', 'm': m, 'c': c, 'min': [x[0], y[0], z[0]], 'max': [x[1], y[1], z[1]]})


def pair(p, m, c, x, y, z):
    box(p, m, c, x, y, z)
    box(p, m, c, [-x[1], -x[0]], y, z)


def cz(p, m, c, y, z, r, seg=20, x=0.0):
    p.append({'kind': 'cyl', 'm': m, 'c': c, 'axis': 'z', 'at': [x, y, (z[0] + z[1]) / 2], 'len': z[1] - z[0],
              'r0': r, 'r1': r, 'seg': seg})


def cy(p, m, c, z, y, r0, r1=None, seg=16, x=0.0):
    p.append({'kind': 'cyl', 'm': m, 'c': c, 'axis': 'y', 'at': [x, (y[0] + y[1]) / 2, z], 'len': y[1] - y[0],
              'r0': r0, 'r1': r0 if r1 is None else r1, 'seg': seg})


def sphere(p, m, c, at, r, sy=1.0):
    p.append({'kind': 'sphere', 'm': m, 'c': c, 'at': list(at), 'r': r, 'sy': sy, 'seg': 16})


def ring(p, m, c, axis, at, r, tube, seg=24):
    p.append({'kind': 'torus', 'm': m, 'c': c, 'axis': axis, 'at': list(at), 'r': r, 'tube': tube, 'seg': seg})


def buffers(p, end, y=0.62):
    s, a = math.copysign(1, end), abs(end)
    for x in (-0.55, 0.55):
        cz(p, 'body', DARK, y, [a - 0.25, a - 0.03] if s > 0 else [-(a - 0.03), -(a - 0.25)], 0.09, 10, x)
        cz(p, 'body', DARK, y, [a - 0.05, a] if s > 0 else [-a, -(a - 0.05)], 0.13, 14, x)


def lashing(p, m, y, r, zs):
    tube = 0.035
    rr = r + 0.03 + tube
    for z in zs:
        ring(p, m, ROPE, 'z', [0, y, z], rr, tube)
    box(p, m, ROPE, [-0.08, 0.08], [y + rr - 0.04, y + rr + 0.08], [zs[1] - 0.07, zs[1] + 0.07])


def chassis(p, body, hz, ahead=0.0):
    """A's frame at its own unit size: drivers' rods, frame, footplate, buffer beams and buffers, empty saddles.
    `ahead` lengthens it ahead of the front drivers (the longer boiler)."""
    hx = FRAME['hx']
    front = hz + ahead
    z0, z1 = WHEELS['z']
    if body == 'body':  # the longer boiler keeps A's drivers and rods
        pair(p, 'rods', DARK, [0.63, 0.66], [0.48, 0.58], [z0 - 0.05, z1 + 0.05])
    box(p, body, DARK, [-0.4, 0.4], [0.3, 0.96], [-(hz - 0.08), front - 0.08])
    box(p, body, DARK, [-hx, hx], [0.94, 1.02], [-hz, front])
    box(p, body, RED, [-hx, hx], [0.45, 0.8], [front - 0.12, front + 0.08])
    box(p, body, RED, [-hx, hx], [0.45, 0.8], [-hz - 0.08, -hz + 0.12])
    buffers(p, front + 0.27)
    buffers(p, -hz - 0.27)
    pair(p, body, BRASS, [0.06, 0.42], [1.0, 1.12], [-0.2, -0.06])
    pair(p, body, BRASS, [0.06, 0.42], [1.0, 1.12], [0.8, 0.94])


def boiler(p, m, y, r, z, box_r, box_z, door_r, chimney, dome, sand=None):
    """Barrel, smokebox and its door, chimney and cap, dome (and a sand dome). `chimney`: (z, height over the barrel's
    top, foot and top radii, cap radius); `dome`: (z, drop under the top, radius, squash)."""
    cz(p, m, RED, y, z, r, 24)
    cz(p, m, DARK, y, box_z, box_r, 24)
    cz(p, m, DOOR, y, [box_z[1] - 0.01, box_z[1] + 0.03], door_r, 20)
    top = y + r
    cz_, h, r0, r1, cap = chimney
    cy(p, m, DARK, cz_, [top - 0.1, top + h], r0, r1)
    cy(p, m, DARK, cz_, [top + h - 0.04, top + h + 0.06], cap)
    sphere(p, m, BRASS, [0, top - dome[1], dome[0]], dome[2], dome[3])
    if sand is not None:
        sphere(p, m, BRASS, [0, top - sand[1], sand[0]], sand[2], sand[3])


def unit_a():
    """A at its unit size, before scaling (stubby() in the parts file), with its boiler and lashing."""
    p = []
    chassis(p, 'body', FRAME['hz'])
    z = BOIL['z']
    boiler(p, 'boiler', BOIL['y'], BOIL['r'], z, BOIL['smokebox']['r'], BOIL['smokebox']['z'], 0.3,
           (BOIL['chimneyZ'], 0.4, 0.17, 0.21, 0.25), (0.35, 0.02, 0.24, 0.8))
    lashing(p, 'lashing', BOIL['y'], BOIL['r'], [0.05, 0.75])
    return p


def unit_long():
    """A with the longer boiler (longBoilerA() in the parts file): the frame `ahead` longer ahead of the drivers, B's
    fatter boiler with a steam dome and a sand dome, a pony truck."""
    d = spec['long']['ahead']
    p = []
    chassis(p, 'body_long', FRAME['hz'], d)
    boiler(p, 'boiler_long', 1.55, 0.55, [-0.7, 1.55], 0.58, [1.4, 1.82], 0.34, (1.6, 0.45, 0.15, 0.19, 0.23),
           (0.6, 0.03, 0.27, 0.85), (-0.15, 0.08, 0.18, 0.85))
    lashing(p, 'lashing_long', 1.55, 0.55, [0.2, 1.05])
    return p


def scaled(parts, s):
    """Every part scaled about the rail line, but the gauge: the rods stay just outside the wheels at +-0.5 m."""
    def v(a):
        return [a[0] * s, a[1] * s, a[2] * s]

    def rod_y(y):
        return y * s - 0.15 * (s - 1)

    res = []
    for p in parts:
        q = dict(p)
        if p['kind'] == 'box' and p['m'] == 'rods':
            q['min'] = [p['min'][0], rod_y(p['min'][1]), p['min'][2] * s]
            q['max'] = [p['max'][0], rod_y(p['max'][1]), p['max'][2] * s]
        elif p['kind'] == 'box':
            q['min'], q['max'] = v(p['min']), v(p['max'])
        elif p['kind'] == 'cyl':
            q.update(at=v(p['at']), len=p['len'] * s, r0=p['r0'] * s, r1=p['r1'] * s)
        elif p['kind'] == 'sphere':
            q.update(at=v(p['at']), r=p['r'] * s)
        else:
            q.update(at=v(p['at']), r=p['r'] * s, tube=p['tube'] * s)
        res.append(q)
    return res


def stretched_back(parts, cut, d):
    """Lengthen behind z = cut by d: what is behind moves back, what spans it grows, the boiler ahead stays."""
    res = []
    for p in parts:
        q = dict(p)
        if p['kind'] == 'box':
            if p['max'][2] <= cut + 1e-6:
                q['min'] = [p['min'][0], p['min'][1], p['min'][2] - d]
                q['max'] = [p['max'][0], p['max'][1], p['max'][2] - d]
            elif p['min'][2] < cut:
                q['min'] = [p['min'][0], p['min'][1], p['min'][2] - d]
        else:
            back = p['at'][2] + p['len'] / 2 if p['kind'] == 'cyl' and p['axis'] == 'z' else p['at'][2]
            if back <= cut:
                q['at'] = [p['at'][0], p['at'][1], p['at'][2] - d]
        res.append(q)
    return res


def holed(p, m, c, thin, across, y, holes, hy, frame=0.03, proud=0.005):
    """A wall panel with open windows (owner, 10 November: "the window on the front of the engine would be clear or
    glass so that you can see the conductor inside"): the panel is `thin` thick along x ('x') or z ('z'), spans `across`
    (the other of z or x) and `y`; `holes` are its windows' ranges across, all `hy` high. Each window is an opening with a
    thin DARK frame `proud` either side of the panel. No glass to sort; just boxes, so no draw call of its own.
    Pieces meet edge to edge, never face to face the same way (the coplanar rule)."""
    def put(c_, a, y_, t):
        if thin[0] == 'x':
            box(p, m, c_, t, y_, a)
        else:
            box(p, m, c_, a, y_, t)
    t = thin[1]
    put(c, across, [y[0], hy[0]], t)  # under the windows
    put(c, across, [hy[1], y[1]], t)  # over them
    edges = [across[0]] + [e for h in holes for e in h] + [across[1]]
    for a in range(0, len(edges), 2):  # the uprights between them
        put(c, [edges[a], edges[a + 1]], hy, t)
    ft = [t[0] - proud, t[1] + proud]
    for h in holes:
        put(DARK, h, [hy[0], hy[0] + frame], ft)  # sill
        put(DARK, h, [hy[1] - frame, hy[1]], ft)  # head
        for a in ([h[0], h[0] + frame], [h[1] - frame, h[1]]):
            put(DARK, a, [hy[0] + frame, hy[1] - frame], ft)  # jambs


# ---------------------------------------------------------------- the cab, fitted to Buddy (fitBuddy, walkInCab)
Z_FRONT = CAB['zFront'] * S
OLD_LENGTH = (CAB['zFront'] - CAB['zBack']) * S  # the unit cab, scaled: the frame lengthens behind it until Buddy fits
LENGTH = max(OLD_LENGTH, CAB['post'] + CAB['door'] + CAB['ahead'])
D = LENGTH - OLD_LENGTH
Z_BACK = Z_FRONT - LENGTH
FLOOR = CAB['floor'] * S + 0.02
ROOF_UNDER = FLOOR + CAB['fits'] + CAB['headroom']
HX_IN = CAB['hxIn']
W = CAB['wall']
HX = HX_IN + W
DOOR_Z = [Z_BACK + CAB['post'], Z_BACK + CAB['post'] + CAB['door']]
DOOR_TOP = min(ROOF_UNDER - 0.12, FLOOR + CAB['fits'] + CAB['doorHead'])
REAR = -(FRAME['hz'] * S + D)
FRONT = FRAME['hz'] * S
SHIFT = -(FRONT + REAR) / 2  # the car's origin is halfway along the frame
DRIVER = [-(HX_IN - 0.58 / 2 - 0.1), FLOOR, Z_FRONT - 0.6]  # beside Buddy, the little guy's hat 0.58 m wide


def walk_in_cab(p):
    base = FLOOR - 0.04
    box(p, 'body', DARK, [-(HX - 0.04), HX - 0.04], [FLOOR - 0.05, FLOOR], [Z_BACK + 0.02, Z_FRONT - 0.02])
    for side in (-1, 1):
        x = [HX - W, HX] if side > 0 else [-HX, -(HX - W)]
        box(p, 'body', RED, x, [base, ROOF_UNDER], [Z_BACK, DOOR_Z[0]])  # the post behind the doorway
        box(p, 'body', RED, x, [DOOR_TOP, ROOF_UNDER], DOOR_Z)  # over the doorway
        box(p, 'body', RED, x, [base, ROOF_UNDER], [DOOR_Z[1], Z_FRONT])  # ahead of it, with a window
        gx = [HX - 0.015, HX + 0.015] if side > 0 else [-HX - 0.015, -HX + 0.015]
        if Z_FRONT - DOOR_Z[1] > 0.4:
            box(p, 'body', GLASS, gx, [ROOF_UNDER - 0.55, ROOF_UNDER - 0.18], [DOOR_Z[1] + 0.08, Z_FRONT - 0.1])
        step = (CAB['haltDeck'] + FLOOR) / 2  # one step under the doorway, halfway up from the halt deck
        sx = [HX - 0.1, HX + 0.2] if side > 0 else [-HX - 0.2, -HX + 0.1]
        box(p, 'body', DARK, sx, [step - 0.04, step + 0.03], [DOOR_Z[0] + 0.1, DOOR_Z[1] - 0.1])
    # The door, drawn shut (owner, 10 November: "side door closed so it's not visibly open from the side"): a panel set
    # 1 cm into the doorway, a small high window and a brass handle. The +x one; the game mirrors it for the other side.
    # Its window is open, so the driver shows from the side (owner, 10 November: "maybe the side window as well").
    holed(p, 'door', RED, ('x', [HX - 0.05, HX - 0.01]), [DOOR_Z[0] + 0.005, DOOR_Z[1] - 0.005],
          [base + 0.02, DOOR_TOP - 0.01], [[DOOR_Z[0] + 0.3, DOOR_Z[1] - 0.3]], [DOOR_TOP - 0.5, DOOR_TOP - 0.2])
    box(p, 'door', BRASS, [HX - 0.02, HX + 0.04], [FLOOR + 1.0, FLOOR + 1.06], [DOOR_Z[1] - 0.2, DOOR_Z[1] - 0.1])
    inner = [-(HX - 0.03), HX - 0.03]
    wy = [ROOF_UNDER - 0.55, ROOF_UNDER - 0.18]
    wx = [0.2, min(0.62, HX - 0.2)]
    # The front wall, its two windows open either side of the boiler: the driver on his stool shows through the left.
    # Their sills come down to just over the barrel's shoulder (17 cm under the back window's), so his face shows.
    holed(p, 'body', RED, ('z', [Z_FRONT - W, Z_FRONT - 0.01]), inner, [base + 0.01, ROOF_UNDER - 0.005],
          [[-wx[1], -wx[0]], wx], [ROOF_UNDER - 0.72, wy[1]])
    box(p, 'body', RED, inner, [base + 0.01, ROOF_UNDER - 0.005], [Z_BACK + 0.01, Z_BACK + W])  # back wall
    box(p, 'body', GLASS, [-0.35, 0.35], wy, [Z_BACK - 0.005, Z_BACK + 0.025])
    box(p, 'body', DARK, [-(HX + 0.1), HX + 0.1], [ROOF_UNDER - 0.01, ROOF_UNDER + 0.1], [Z_BACK - 0.12, Z_FRONT + 0.12])


def backhead(p, m, y, back):
    """The controls on the boiler's back end, inside the cab: a dark plate, the brass regulator and two gauges."""
    cz(p, m, DARK, y, [back - 0.03, back + 0.02], 0.5, 20)
    box(p, m, BRASS, [-0.32, -0.04], [y + 0.12, y + 0.18], [back - 0.07, back - 0.02])  # the regulator, driver's side
    for x in (-0.18, 0.18):
        cz(p, m, BRASS, y + 0.32, [back - 0.05, back - 0.01], 0.07, 12, x)
    box(p, m, BRASS, [-0.16, 0.16], [y - 0.42, y - 0.22], [back - 0.06, back - 0.02])  # the firebox door


def stool(p):
    """The driver's tall stool (owner, 10 November: "the little guys can sit on stools to be higher"): seat top
    stool.seat over the floor, a footrest ring, one post on a foot that sinks 2 cm into the floor."""
    x, _, z = DRIVER
    top = FLOOR + STOOL['seat']
    cy(p, 'stool', WOOD, z, [top - 0.06, top], 0.2, 0.2, 12, x)
    cy(p, 'stool', DARK, z, [FLOOR - 0.01, top - 0.04], 0.035, 0.035, 6, x)
    cy(p, 'stool', DARK, z, [FLOOR - 0.02, FLOOR + 0.03], 0.17, 0.15, 10, x)
    rest = FLOOR + STOOL['footrest']
    ring(p, 'stool', DARK, 'y', [x, rest, z], 0.15, 0.018, 12)
    # Two spokes hold the ring to the post, one along each axis, 4 mm apart in height so their tops never meet.
    box(p, 'stool', DARK, [x - 0.15, x + 0.15], [rest - 0.012, rest + 0.012], [z - 0.012, z + 0.012])
    box(p, 'stool', DARK, [x - 0.012, x + 0.012], [rest - 0.016, rest + 0.008], [z - 0.15, z + 0.15])
    return top


def build_parts():
    a = stretched_back(scaled(unit_a(), S), Z_FRONT, D)
    n = len(a)
    walk_in_cab(a)
    # The longer boiler keeps A's cab: the same walls, roof and steps in its own body.
    cab = [dict(p, m='body_long', min=list(p['min']), max=list(p['max'])) for p in a[n:] if p['m'] == 'body']
    backhead(a, 'boiler', BOIL['y'] * S, BOIL['z'][0] * S)
    stool(a)
    lng = stretched_back(scaled(unit_long(), S), Z_FRONT, D) + cab
    backhead(lng, 'boiler_long', 1.55 * S, -0.7 * S)
    for p in a + lng:
        if p['kind'] == 'box':
            p['min'][2] += SHIFT
            p['max'][2] += SHIFT
        else:
            p['at'] = [p['at'][0], p['at'][1], p['at'][2] + SHIFT]
    return a, lng


# ---------------------------------------------------------------- the coplanar rule (coplanarFaces in the parts file)
def coplanar(parts, eps=0.002):
    faces = []
    for i, p in enumerate(parts):
        if p['kind'] == 'box':
            lo, hi, axes = p['min'], p['max'], (0, 1, 2)
        elif p['kind'] == 'cyl':
            a = 'xyz'.index(p['axis'])
            r = max(p['r0'], p['r1'])
            lo, hi = list(p['at']), list(p['at'])
            for k in range(3):
                if k != a:
                    lo[k], hi[k] = p['at'][k] - r, p['at'][k] + r
            lo[a], hi[a] = p['at'][a] - p['len'] / 2, p['at'][a] + p['len'] / 2
            axes = (a,)
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


# ---------------------------------------------------------------- meshes
def linear(hex_):
    rgb = [int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]


def rotate(bm, verts, angle, axis):
    from mathutils import Matrix
    bmesh.ops.rotate(bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(angle, 3, axis))


def add_part(bm, p):
    if p['kind'] == 'box':
        lo, hi = p['min'], p['max']
        vs = bmesh.ops.create_cube(bm, size=1.0)['verts']
        bmesh.ops.scale(bm, verts=vs, vec=(hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]))
        bmesh.ops.translate(bm, verts=vs, vec=G((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
    elif p['kind'] == 'cyl':
        vs = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=p['seg'], radius1=p['r0'],
                                   radius2=p['r1'], depth=p['len'])['verts']
        if p['axis'] == 'z':
            rotate(bm, vs, math.pi / 2, 'X')
        elif p['axis'] == 'x':
            rotate(bm, vs, math.pi / 2, 'Y')
        bmesh.ops.translate(bm, verts=vs, vec=G(*p['at']))
    elif p['kind'] == 'sphere':
        vs = bmesh.ops.create_uvsphere(bm, u_segments=p['seg'], v_segments=p['seg'] // 2, radius=p['r'])['verts']
        bmesh.ops.scale(bm, verts=vs, vec=(1, 1, p['sy']))
        bmesh.ops.translate(bm, verts=vs, vec=G(*p['at']))
    else:
        seg, rad, R, t = p['seg'], 6, p['r'], p['tube']
        grid = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            row = []
            for j in range(rad):
                b = 2 * math.pi * j / rad
                d = R + t * math.cos(b)
                # A ring round the game's z (across x, y) or y (across x, z).
                local = (d * math.cos(a), d * math.sin(a), t * math.sin(b)) if p['axis'] == 'z' else \
                    (d * math.cos(a), t * math.sin(b), d * math.sin(a))
                at = p['at']
                row.append(bm.verts.new(G(at[0] + local[0], at[1] + local[1], at[2] + local[2])))
            grid.append(row)
        for i in range(seg):
            for j in range(rad):
                i2, j2 = (i + 1) % seg, (j + 1) % rad
                bm.faces.new((grid[i][j], grid[i2][j], grid[i2][j2], grid[i][j2]))


def node(name, parts, bevel):
    if not parts:
        raise SystemExit(f'engine: {name} has no parts')
    bm = bmesh.new()
    # Each face remembers its part's colour (1 + its index in `palette`) as it is made, whatever order bmesh keeps.
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
    if bevel:
        mod = obj.modifiers.new('broad_edges', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
    obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj


short, long_ = build_parts()
for state, parts in (('old train', [p for p in short if p['m'] in ('body', 'rods', 'door', 'stool')]),
                     ('boiler fitted', [p for p in short if p['m'] != 'none']),
                     ('longer boiler', [p for p in short if p['m'] in ('rods', 'door', 'stool')] + long_)):
    hits = coplanar(parts)
    if hits:
        raise SystemExit(f'engine: coplanar faces in the {state} state:\n  ' + '\n  '.join(hits))
print(f'engine: no coplanar faces; frame {REAR + SHIFT:.3f}..{FRONT + SHIFT:.3f}, cab floor {FLOOR:.3f}, '
      f'roof {ROOF_UNDER:.3f}, doorway z {DOOR_Z[0] + SHIFT:.3f}..{DOOR_Z[1] + SHIFT:.3f} to {DOOR_TOP:.3f}')

for name, module, parts, bevel in (
    ('engine_body', 'body', short, 0.012),
    ('engine_rods', 'rods', short, 0.006),
    ('engine_door', 'door', short, 0.006),
    ('engine_boiler', 'boiler', short, 0.012),
    ('engine_lashing', 'lashing', short, 0.0),
    ('engine_stool', 'stool', short, 0.0),
    ('engine_body_long', 'body_long', long_, 0.012),
    ('engine_boiler_long', 'boiler_long', long_, 0.012),
    ('engine_lashing_long', 'lashing_long', long_, 0.0),
):
    node(name, [p for p in parts if p['m'] == module], bevel)

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_normals=True,
                          export_materials='NONE', export_vertex_color='ACTIVE', export_cameras=False,
                          export_lights=False, export_extras=False, export_animations=False)
