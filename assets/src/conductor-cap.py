"""Rigid wear_head attachment, in game-axis metres relative to Buddy Head rest origin (0, 1.12, 0).
Original Boogle geometry; dimensions follow buddy.py HEAD_C/HEAD_R and its stiff drum brief.
No Buddy mesh, rig or animation is exported or changed.
"""
import math
import sys
import bpy
import bmesh

bpy.ops.wm.read_factory_settings(use_empty=True)
SEGMENTS = 24
RX, RZ = 0.27, 0.252
BOTTOM, TOP = 0.36, 0.535  # world 1.48 to 1.655; 25 mm crown clearance, reduced visual weight
PEAK = 0.105


def material(name, colour, roughness, metalness=0):
    def linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    rgb = tuple(linear(int(colour[i:i + 2], 16) / 255) for i in (0, 2, 4))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metalness
    return mat


paint = material('paintedToy', '31566d', 0.95)
brass = material('tintedSteel', 'd9a93a', 0.45, 0.7)
peak = material('paintedToyPeak', '252e36', 0.95)


def part(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new('wear_head_conductor_' + name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def ring(name, bottom, top, rx, rz, mat, closed=False):
    # Hollow band; shell's underside remains open to receive the unmodified rounded head.
    profile = [(rx, rz, bottom), (rx, rz, top)]
    if not closed:
        profile += [(rx - 0.004, rz - 0.004, top), (rx - 0.004, rz - 0.004, bottom)]
    verts = [(a * math.cos(k * math.tau / SEGMENTS), y, b * math.sin(k * math.tau / SEGMENTS))
             for a, b, y in profile for k in range(SEGMENTS)]
    faces = []
    for j in range(len(profile) - (1 if closed else 0)):
        n = (j + 1) % len(profile)
        faces += [(j * SEGMENTS + k, j * SEGMENTS + (k + 1) % SEGMENTS,
                   n * SEGMENTS + (k + 1) % SEGMENTS, n * SEGMENTS + k) for k in range(SEGMENTS)]
    if closed:
        faces.append(tuple(range(SEGMENTS, SEGMENTS * 2)))
    return part(name, verts, faces, mat)


ring('drum', BOTTOM, TOP, RX, RZ, paint, True)
ring('brass_band', BOTTOM + 0.012, BOTTOM + 0.029, RX + 0.003, RZ + 0.003, brass)
ring('brass_crown', TOP - 0.012, TOP - 0.005, RX + 0.002, RZ + 0.002, brass)
# A short solid peak, no zero-width end cells or coincident triangles.
verts = []
N = 12
for y in (BOTTOM + 0.005, BOTTOM - 0.007):
    for outer in (False, True):
        for i in range(N + 1):
            a = math.pi / 2 + (i / N * 2 - 1) * math.radians(65)
            reach = PEAK * (0.18 + 0.82 * math.sin(i / N * math.pi)) if outer else -0.012
            verts.append(((RX + reach) * math.cos(a), y - (reach * 0.15), (RZ + reach) * math.sin(a)))
faces = []
S = N + 1
for i in range(N):
    faces += [(i, i + 1, S + i + 1, S + i),
              (2 * S + i, 3 * S + i, 3 * S + i + 1, 2 * S + i + 1),
              (S + i, S + i + 1, 3 * S + i + 1, 3 * S + i),
              (i, 2 * S + i, 2 * S + i + 1, i + 1)]
faces += [(0, S, 3 * S, 2 * S), (N, 2 * S + N, 3 * S + N, S + N)]
part('peak', verts, faces, peak)
# Small raised lozenge: geometric badge rather than painted-on structure.
part('badge', [(-0.024, 0.445, RZ + 0.006), (0, 0.475, RZ + 0.006),
               (0.024, 0.445, RZ + 0.006), (0, 0.415, RZ + 0.006), (0, 0.445, RZ + 0.017)],
     [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (3, 2, 1, 0)], brass)
bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--') + 1], export_format='GLB',
                          export_yup=True, export_apply=True, export_normals=True,
                          export_cameras=False, export_lights=False, export_animations=False)
