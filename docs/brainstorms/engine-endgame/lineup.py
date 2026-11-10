"""Scratch greybox lineup: today's engine A, the largest current-era engine, three end-game silhouettes, Buddy.
Blender coords: x across (rails at +-0.5), y along the track (fronts face -y), z up, rail top at z 0. Not game code."""
import math
import bmesh
import bpy
from mathutils import Vector

R = '/Users/matiasfranco/Developer/boogle/.claude/worktrees/agent-a81b7f3b454691026/'
OUT = R + '.look/endgame/'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection
mats = {}


def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def mat(h, glow=0.0):
    k = (h, glow)
    if k in mats:
        return mats[k]
    m = bpy.data.materials.new(h)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(h)
    b.inputs['Roughness'].default_value = 0.9
    if glow:
        b.inputs['Emission Color'].default_value = srgb(h)
        b.inputs['Emission Strength'].default_value = glow
    mats[k] = m
    return m


def obj(name, bm, h, glow=0.0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(mat(h, glow))
    col.objects.link(o)
    return o


def box(name, h, mn, mx, glow=0.0):
    bm = bmesh.new()
    vs = bmesh.ops.create_cube(bm, size=1.0)['verts']
    bmesh.ops.scale(bm, verts=vs, vec=[mx[i] - mn[i] for i in range(3)])
    bmesh.ops.translate(bm, verts=vs, vec=[(mx[i] + mn[i]) / 2 for i in range(3)])
    return obj(name, bm, h, glow)


def hull(name, h, pts, glow=0.0):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    bmesh.ops.convex_hull(bm, input=vs)
    return obj(name, bm, h, glow)


def prism(name, h, y0, y1, prof, glow=0.0):
    """A cross-section (x, z) list extruded from y0 to y1."""
    return hull(name, h, [(x, y, z) for y in (y0, y1) for x, z in prof], glow)


def wheel(name, h, y, r, x=0.6, w=0.16):
    for s in (-1, 1):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=r, radius2=r, depth=w)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y'))
        bmesh.ops.translate(bm, verts=bm.verts, vec=(s * x, y, r))
        obj(name, bm, h)


def bogie(name, y, n, r=0.42, pitch=1.05):
    span = (n - 1) * pitch
    for i in range(n):
        wheel(name + '_w', '2a2b30', y - span / 2 + i * pitch, r)
    box(name + '_frame', '3a3c42', (-0.78, y - span / 2 - 0.5, r - 0.15), (0.78, y + span / 2 + 0.5, r + 0.22))


# ------------------------------------------------------------------ the world: ground, track, a Home halt deck
box('ground', '7fbf5a', (-30, -20, -0.5), (30, 90, -0.22))
box('ballast', 'a89a86', (-1.3, -20, -0.24), (1.3, 90, -0.17))
for i in range(int(110 / 0.9)):
    y = -20 + i * 0.9
    box('sleeper', '7a5636', (-0.85, y, -0.18), (0.85, y + 0.35, -0.1))
for s in (-1, 1):
    box('rail', '8b8f96', (s * 0.5 - 0.05, -20, -0.11), (s * 0.5 + 0.05, 90, 0.0))
box('halt_deck', 'c8a46e', (-4.15, -6, -0.2), (-1.65, 70, 0.72))

# ------------------------------------------------------------------ Buddy and the built engine
def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=R + path)
    return [o for o in bpy.data.objects if o not in before]


def engine_mat():
    m = bpy.data.materials.new('engine_vc')
    m.use_nodes = True
    nt = m.node_tree
    a = nt.nodes.new('ShaderNodeAttribute')
    a.attribute_name = 'Color'
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.9
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    return m


EM = engine_mat()


def engine(dy, long):
    """The built engine A (or with its longer boiler) shifted dy along the track; returns its parent empty."""
    root = bpy.data.objects.new('engine_root', None)
    col.objects.link(root)
    keep_short = {'engine_body', 'engine_boiler', 'engine_lashing'}
    keep_long = {'engine_body_long', 'engine_boiler_long', 'engine_lashing_long'}
    keep = (keep_long if long else keep_short) | {'engine_rods', 'engine_door', 'engine_stool'}
    for o in import_glb('assets/built/engine.glb'):
        base = o.name.split('.')[0]
        if o.type != 'MESH' or base not in keep:
            bpy.data.objects.remove(o)
            continue
        o.data.materials.clear()
        o.data.materials.append(EM)
        if base == 'engine_door':  # the second door, mirrored
            d = o.copy()
            d.scale.x = -1
            col.objects.link(d)
            d.parent = root
        o.parent = root
    root.location.y = dy
    # wheels: A's two driving axles at game z +-0.75 * 1.25 (Blender y -+0.94, front at -y), r 0.38 * 1.25
    for y in (-0.94, 0.94):
        wheel('engine_wheel', '24262c', dy + y + (-0.25 if long else 0), 0.475, x=0.6)
    return root


def buddy(x, y, rot=0.0):
    for o in import_glb('assets/built/buddy.glb'):
        n = o.name.split('.')[0]
        if n in ('wear_head_beanie', 'Icosphere'):
            bpy.data.objects.remove(o)
            continue
        if o.parent is None:
            o.location = (x, y, o.location.z)
            o.rotation_euler.z = rot


# ------------------------------------------------------------------ the lineup, fronts at -y
# 1. today's engine A
Y_A = 0.0
engine(Y_A, False)
buddy(1.9, Y_A - 1.2, math.radians(70))

# 2. the largest current-era engine: the longer boiler, Ring Island steel fittings and a tender
Y_E = 9.5
engine(Y_E, True)
STEEL, STEEL_D = '8d9aa6', '5d6873'
for yy in (-1.7, -0.95):  # steel boiler bands
    hull('steel_band', STEEL, [(x * 0.76, Y_E + yy + dy, 2.13 + z * 0.76) for dy in (0, 0.14)
                               for x, z in [(math.cos(a), math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]])
hull('steel_smokebox_ring', STEEL_D, [(x * 0.74, Y_E - 2.47 + dy, 2.13 + z * 0.74) for dy in (0, 0.1)
                                     for x, z in [(math.cos(a), math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]])
hull('steel_plough', STEEL, [(-1.05, Y_E - 2.65, 0.05), (1.05, Y_E - 2.65, 0.05), (0, Y_E - 3.45, 0.05),
                            (-1.05, Y_E - 2.65, 0.75), (1.05, Y_E - 2.65, 0.75), (0, Y_E - 3.0, 0.75)])
box('steel_roof', STEEL, (-1.22, Y_E + 0.6, 3.3), (1.22, Y_E + 2.2, 3.42))
box('headlamp', 'ffe9a8', (-0.22, Y_E - 2.58, 2.95), (0.22, Y_E - 2.45, 3.3), glow=2.0)
TY = Y_E + 2.4  # the tender behind the cab: 2.8 m long, 2.0 wide, 2.4 high
box('tender', 'e8392a', (-1.0, TY, 0.75), (1.0, TY + 2.8, 2.4))
box('tender_frame', '24262c', (-0.85, TY - 0.1, 0.45), (0.85, TY + 2.9, 0.75))
box('tender_coal', '2a2624', (-0.85, TY + 0.15, 2.4), (0.85, TY + 2.65, 2.75))
for s in (-1, 1):
    box('tender_rail', STEEL, (s * 1.0 - 0.06, TY, 2.4), (s * 1.0 + 0.06, TY + 2.8, 2.7))
box('tender_tank_lid', 'd9a23a', (-0.4, TY + 1.9, 2.75), (0.4, TY + 2.5, 2.85))
for yy in (0.7, 2.1):
    wheel('tender_wheel', '24262c', TY + yy, 0.4)
buddy(1.9, Y_E - 1.5, math.radians(70))

# 3. end game, freight: "the Hauler", 10 m, 2.4 wide, 3.5 high, two three-axle bogies
Y_F = 23.0
L = 10.0
ORANGE, CHAR, CREAM = 'f2a33a', '33353b', 'f4eedc'
box('hauler_deck', CHAR, (-1.2, Y_F, 0.95), (1.2, Y_F + L, 1.3))
bogie('hauler_bogie_f', Y_F + 2.3, 3)
bogie('hauler_bogie_r', Y_F + L - 2.3, 3)
prism('hauler_cab', ORANGE, Y_F + 0.6, Y_F + 3.0, [(-1.2, 1.3), (1.2, 1.3), (1.2, 3.25), (-1.2, 3.25), (-0.95, 3.5), (0.95, 3.5)])
prism('hauler_nose', ORANGE, Y_F + 0.15, Y_F + 0.6, [(-1.2, 1.3), (1.2, 1.3), (1.2, 2.2), (-1.2, 2.2)])
box('hauler_windscreen', '1d2430', (-1.0, Y_F + 0.55, 2.35), (1.0, Y_F + 0.62, 3.05))
for s in (-1, 1):
    box('hauler_side_window', '1d2430', (s * 1.2 - 0.03, Y_F + 1.0, 2.4), (s * 1.2 + 0.03, Y_F + 2.0, 3.0))
    box('hauler_light', 'ffe9a8', (s * 0.75 - 0.2, Y_F + 0.1, 1.65), (s * 0.75 + 0.2, Y_F + 0.17, 1.95), glow=2.0)
box('hauler_hood', ORANGE, (-0.95, Y_F + 3.0, 1.3), (0.95, Y_F + L - 0.4, 3.0))
for i in range(5):
    box('hauler_grille', CHAR, (-0.8, Y_F + 6.2 + i * 0.6, 3.0), (0.8, Y_F + 6.6 + i * 0.6, 3.15))
box('hauler_stripe', CREAM, (-0.97, Y_F + 3.0, 1.6), (0.97, Y_F + L - 0.4, 1.8))
hull('hauler_plough', CHAR, [(-1.2, Y_F + 0.15, 0.05), (1.2, Y_F + 0.15, 0.05), (-1.2, Y_F - 0.55, 0.05), (1.2, Y_F - 0.55, 0.05),
                             (-1.2, Y_F + 0.15, 1.0), (1.2, Y_F + 0.15, 1.0)])
for k in range(4):  # chevrons on the nose
    x0 = -1.0 + k * 0.55
    box('hauler_chevron', CREAM, (x0, Y_F + 0.1, 1.4), (x0 + 0.25, Y_F + 0.16, 2.1))
box('hauler_exhaust', CHAR, (-0.2, Y_F + 4.0, 3.0), (0.2, Y_F + 4.5, 3.35))
buddy(1.9, Y_F - 1.2, math.radians(70))

# 4. end game, high speed: "the Dart", 11 m, 2.3 wide, 3.1 high, a long wedge nose
Y_D = 37.0
L = 11.0
WHITE, TEAL, GLASS = 'f1efe8', '2bb3a8', '1d2430'
NOSE = 4.0
hull('dart_nose', WHITE, [(-1.15, Y_D + NOSE, 0.7), (1.15, Y_D + NOSE, 0.7), (-1.15, Y_D + NOSE, 3.1), (1.15, Y_D + NOSE, 3.1),
                          (-0.7, Y_D, 0.55), (0.7, Y_D, 0.55), (-0.55, Y_D + 0.2, 1.15), (0.55, Y_D + 0.2, 1.15),
                          (-1.15, Y_D + 1.5, 0.6), (1.15, Y_D + 1.5, 0.6)])
hull('dart_canopy', GLASS, [(-0.9, Y_D + 2.2, 2.0), (0.9, Y_D + 2.2, 2.0), (-0.95, Y_D + 3.9, 3.05), (0.95, Y_D + 3.9, 3.05),
                            (-1.0, Y_D + 3.9, 2.1), (1.0, Y_D + 3.9, 2.1)])
prism('dart_body', WHITE, Y_D + NOSE, Y_D + L, [(-1.15, 0.7), (1.15, 0.7), (1.15, 2.85), (-1.15, 2.85), (-0.85, 3.1), (0.85, 3.1)])
for s in (-1, 1):
    box('dart_stripe', TEAL, (s * 1.15 - 0.03, Y_D + 1.8, 1.25), (s * 1.15 + 0.03, Y_D + L, 1.55))
    box('dart_windows', GLASS, (s * 1.15 - 0.03, Y_D + 5.0, 2.0), (s * 1.15 + 0.03, Y_D + L - 0.6, 2.55))
box('dart_skirt', '9aa3ab', (-1.12, Y_D + 1.4, 0.3), (1.12, Y_D + L, 0.72))
box('dart_lamp', 'ffe9a8', (-0.45, Y_D + 0.05, 0.75), (0.45, Y_D + 0.25, 0.95), glow=2.5)
box('dart_fin', TEAL, (-0.06, Y_D + L - 2.0, 3.1), (0.06, Y_D + L - 0.4, 3.45))
bogie('dart_bogie_f', Y_D + 2.8, 2, r=0.36, pitch=1.2)
bogie('dart_bogie_r', Y_D + L - 1.8, 2, r=0.36, pitch=1.2)
buddy(1.9, Y_D - 1.2, math.radians(70))

# 5. end game, dystopian industrial: "the Warden", three plated segments, 2.4 wide, 3.6 high
Y_W = 52.0
SEG, GAP = 4.2, 0.35
GUN, GUN_D, AMBER, HAZ = '474b52', '25272c', 'ffb02e', 'e0b83a'
PROF = [(-1.2, 0.75), (1.2, 0.75), (1.2, 1.6), (-1.2, 1.6), (-0.8, 3.6), (0.8, 3.6)]
for k in range(3):
    y0 = Y_W + k * (SEG + GAP)
    prism('warden_hull', GUN, y0, y0 + SEG, PROF)
    for i in range(5):  # raised rib plates
        yy = y0 + 0.3 + i * 0.85
        prism('warden_rib', GUN_D, yy, yy + 0.22, [(x * 1.06, z + (0.04 if z > 1 else 0)) for x, z in PROF])
    box('warden_link', GUN_D, (-0.5, y0 + SEG, 1.0), (0.5, y0 + SEG + GAP, 2.4))
    bogie('warden_bogie_%d' % k, y0 + SEG / 2, 3, r=0.38, pitch=0.95)
    for s in (-1, 1):
        box('warden_slot', AMBER, (s * 1.2 - 0.03, y0 + 0.6, 1.25), (s * 1.2 + 0.03, y0 + SEG - 0.6, 1.35), glow=1.5)
# the head: a sloped ram, one wide amber visor slit, two short stacks
hull('warden_ram', GUN_D, [(-1.25, Y_W, 0.05), (1.25, Y_W, 0.05), (-1.25, Y_W, 2.2), (1.25, Y_W, 2.2),
                          (-0.9, Y_W - 1.3, 0.05), (0.9, Y_W - 1.3, 0.05), (-0.6, Y_W - 0.5, 1.6), (0.6, Y_W - 0.5, 1.6)])
hull('warden_brow', GUN, [(-1.2, Y_W, 1.6), (1.2, Y_W, 1.6), (-0.8, Y_W, 3.6), (0.8, Y_W, 3.6),
                         (-0.8, Y_W - 0.6, 2.2), (0.8, Y_W - 0.6, 2.2), (-0.6, Y_W - 0.3, 3.1), (0.6, Y_W - 0.3, 3.1)])
hull('warden_visor', AMBER, [(-0.75, Y_W - 0.52, 2.45), (0.75, Y_W - 0.52, 2.45), (-0.7, Y_W - 0.43, 2.65), (0.7, Y_W - 0.43, 2.65),
                            (-0.75, Y_W - 0.4, 2.45), (0.7, Y_W - 0.33, 2.65)], glow=4.0)
for x0 in (-0.9, 0.3):
    box('warden_haz', HAZ, (x0, Y_W - 1.0, 0.6), (x0 + 0.5, Y_W - 0.7, 0.9))
for s in (-1, 1):
    box('warden_stack', GUN_D, (s * 0.4 - 0.18, Y_W + 1.2, 3.55), (s * 0.4 + 0.18, Y_W + 1.6, 4.1))
buddy(1.9, Y_W - 2.4, math.radians(70))

# ------------------------------------------------------------------ light, render
w = bpy.data.worlds.new('w')
scene.world = w
w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.74, 0.9, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.2
sun.data.angle = math.radians(3)
sun.rotation_euler = (math.radians(50), math.radians(-12), math.radians(40))
col.objects.link(sun)
for e in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try:
        scene.render.engine = e
        break
    except TypeError:
        pass
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_percentage = 100
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
col.objects.link(cam)
scene.camera = cam


def look(pos, target):
    cam.location = pos
    d = Vector(target) - Vector(pos)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def shot(name, w_, h_):
    scene.render.resolution_x, scene.render.resolution_y = w_, h_
    scene.render.filepath = OUT + name + '.png'
    bpy.ops.render.render(write_still=True)


# the whole lineup, side on, orthographic
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 70
look((40, 31.5, 2.0), (0, 31.5, 2.0))
shot('lineup_side_all', 2800, 520)
# today's engine and the largest current-era engine, side on
cam.data.ortho_scale = 22
look((40, 6.0, 2.0), (0, 6.0, 2.0))
shot('lineup_side_current_era', 2000, 600)
# the three end-game candidates, side on
cam.data.ortho_scale = 46
look((40, 44.0, 2.2), (0, 44.0, 2.2))
shot('lineup_side_endgame', 2600, 640)
# three-quarter views, perspective, from the open side, front-left
cam.data.type = 'PERSP'
cam.data.lens = 35
for name, y, ln in (('q_current_era', Y_E + 1, 9), ('q_hauler', Y_F + 4, 10), ('q_dart', Y_D + 4, 11),
                    ('q_warden', Y_W + 5, 13), ('q_today_and_current', 6.0, 14)):
    d = ln * 0.95
    look((d * 0.8, y - d * 0.9, 3.0 + d * 0.15), (0, y, 1.6))
    shot(name, 1600, 900)
# all five, a long three-quarter down the track from the front
look((14, -16, 7), (0, 18, 1.5))
shot('q_lineup_all', 1800, 900)
