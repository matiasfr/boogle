"""Rigid Place prop kit. Metres; game (x,y,z) -> Blender (x,-z,y), Y-up export.
Shell origins match carry-models.ts, props.ts, look-kit.ts and depot.ts.
No animation, collision, textures or imported recipe dependencies.
"""
import math
import sys
import bpy
import bmesh
from mathutils import Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)
BAND_Z = (-0.5, 0.5)
BAND_RADIUS = 0.57
BAND_WIDTH = 0.14
BARREL_RADIUS = 0.55
CART_TOP, CART_HX, CART_HZ = 0.55, 0.75, 1.35


def G(x, y, z):
    return (x, -z, y)


def material(name, color, rough=0.85):
    # Hex reference swatches are sRGB; Blender node inputs are linear.
    rgb = [int(color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    rgb = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = rough
    return mat


RED = material('paint_red', 'c83a2a')
GOLD = material('matching_bands', 'd9a23a', 0.7)
DARK = material('running_gear', '24262c')
STONE = material('pedestal_stone', 'b6a080', 0.95)
WOOD = material('deck_wood', 'a9794c', 0.95)
EDGE = material('frame_wood', '7f5630', 0.95)
GRIP = material('bearer_wood', 'c9a86a', 0.95)


def root(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def box(bm, size, at):
    verts = bmesh.ops.create_cube(bm, size=1)['verts']
    bmesh.ops.scale(bm, verts=verts, vec=(size[0], size[2], size[1]))
    bmesh.ops.translate(bm, verts=verts, vec=G(*at))


def cyl(bm, r0, r1, length, axis, at=(0, 0, 0), segments=12):
    verts = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                                radius1=r0, radius2=r1, depth=length)['verts']
    if axis != 'y':
        bmesh.ops.rotate(bm, verts=verts, cent=(0, 0, 0),
                         matrix=Matrix.Rotation(math.pi / 2, 3, 'Y' if axis == 'x' else 'X'))
    bmesh.ops.translate(bm, verts=verts, vec=G(*at))


def profile(bm, points, z, depth):
    """Closed extruded XY outline, with consistent outward normals after recalculation."""
    a = [bm.verts.new(G(x, y, z - depth / 2)) for x, y in points]
    b = [bm.verts.new(G(x, y, z + depth / 2)) for x, y in points]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(len(a)):
        j = (i + 1) % len(a)
        bm.faces.new((a[i], b[i], b[j], a[j]))


def part(parent, name, mat, build, bevel=0.015):
    bm = bmesh.new()
    build(bm)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    mesh.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('broad_edges', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
    obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj


boiler = root('boiler')
part(boiler, 'barrel', RED, lambda b: cyl(b, BARREL_RADIUS, BARREL_RADIUS, 1.5, 'z'), 0.025)
part(boiler, 'bands', GOLD,
     lambda b: [cyl(b, BAND_RADIUS, BAND_RADIUS, BAND_WIDTH, 'z', (0, 0, z)) for z in BAND_Z], 0.008)
part(boiler, 'chimney', DARK, lambda b: cyl(b, 0.2, 0.16, 0.5, 'y', (0, 0.62, -0.4), 8), 0.012)

pedestal = root('pedestal')
part(pedestal, 'plinth', STONE, lambda b: cyl(b, 1.3, 1.15, 0.6, 'y', segments=8), 0.025)

train = root('train_shell')
part(train, 'cab_and_bumper', RED, lambda b: [
    box(b, (1.5, 1.18, 1), (0, 0.82, -1)),
    box(b, (1.4, 0.32, 0.24), (0, 0.36, 1.58)),
], 0.025)
part(train, 'chassis_roof_and_posts', DARK, lambda b: [
    # Recess only the receiver bed: keep the .5-.7 chassis envelope and original boiler centre.
    box(b, (1.6, 0.2, 1), (0, 0.6, -1)),
    box(b, (1.404, 0.04, 2.004), (0, 0.52, 0.5)),
    *[box(b, (0.1, 0.2, 2.004), (x, 0.6, 0.499)) for x in (-0.75, 0.75)],
    box(b, (1.72, 0.1, 1.2), (0, 2, -1)),
    *[box(b, (0.13, 0.58, 0.13), (x, 1.68, z)) for x in (-0.58, 0.58) for z in (-1.38, -0.62)],
], 0.015)


def saddles(bm):
    inner, outer = BAND_RADIUS, 0.68
    points = [(inner * math.cos(i * math.pi / 12), 1.2 - inner * math.sin(i * math.pi / 12))
              for i in range(13)]
    points += [(outer * math.cos(i * math.pi / 12), 1.2 - outer * math.sin(i * math.pi / 12))
               for i in reversed(range(13))]
    for band_z in BAND_Z:
        z = 0.5 - band_z  # Boiler's existing half-turn and centre, shared band spacing.
        profile(bm, points, z, BAND_WIDTH)
        for x in (-0.46, 0.46):
            box(bm, (0.16, 0.34, 0.24), (x, 0.68, z))


part(train, 'empty_saddles', GOLD, saddles, 0.006)

cart = root('cart')
part(cart, 'deck', WOOD, lambda b: [
    # A shallow inset reveals the bearer bases without raising any counted cargo.
    box(b, (1.324, 0.08, 2.464), (0, 0.47, 0)),
    *[box(b, (0.09, 0.12, 2.7), (x, 0.49, 0)) for x in (-0.705, 0.705)],
    *[box(b, (1.324, 0.12, 0.12), (0, 0.49, z)) for z in (-1.29, 1.29)],
], 0.008)
part(cart, 'sidewalls_and_handle_posts', EDGE, lambda b: [
    *[box(b, (0.08, 0.32, 2.7), (s * CART_HX, CART_TOP + 0.14, 0)) for s in (-1, 1)],
    # Posts overlap the rear sidewall ends and reach the original floating crossbar.
    *[box(b, (0.14, 0.59, 0.24), (s * 0.68, 0.785, -1.37)) for s in (-1, 1)],
], 0.012)


def grip_and_bearers(bm):
    box(bm, (1.5, 0.08, 0.08), (0, 1.05, -1.45))
    # Four shallow seats follow the ACTUAL four-log row (r=.11*1.5, centres Y=.70).
    # Centre valley .535 meets the old log bottom, inside the existing .55 deck top.
    points = [(-0.7, 0.50), (0.7, 0.50), (0.7, 0.63)]
    for x in (0.45, 0.15, -0.15, -0.45):
        points += [(x + 0.15 * math.cos(i * math.pi / 6), 0.70 - 0.165 * math.sin(i * math.pi / 6))
                   for i in range(1, 6)]
        points.append((x - 0.15, 0.63))
    points.append((-0.7, 0.63))
    for z in (-0.46, 0.46):
        profile(bm, points, z, 0.18)


part(cart, 'grip_and_bearers', GRIP, grip_and_bearers, 0.005)
part(cart, 'wheels_and_axles', DARK, lambda b: [
    *[cyl(b, 0.2, 0.2, 0.08, 'x', (s * 0.5, 0.2, z), 10) for s in (-1, 1) for z in (-1, 1)],
    *[box(b, (1.05, 0.08, 0.12), (0, 0.4, z)) for z in (-1, 1)],
], 0.008)

bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
