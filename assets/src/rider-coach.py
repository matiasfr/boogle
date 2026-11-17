"""Candidate A, measured docs/world/rider-coach-a/brief.md. Rail-local metres.
Game (x,y,z) -> Blender (x,-z,y), Y-up GLB. One static shell, underframe,
four stowed hinge-local steps. Existing kit supplies wheels and couplings.
Seat metadata is on coach_shell so optimizer pruning of empty sockets is harmless.
"""
import math
import sys
import bmesh
import bpy
out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
HONEY, BROWN, IRON, RED, BRASS, CREAM = 'b98a52', '5c4530', '2f3131', 'a33a2c', 'd9a23a', 'f3e6c8'
ROOF_RADIUS = (0.8 ** 2 + 0.12 ** 2) / (2 * 0.12)
BAY_CENTRES = (-0.9, -0.3, 0.3, 0.9)
def G(x,y,z): return (x,-z,y)
def box(parts, name, colour, x, y, z):
    parts.append({'kind':'box','m':name,'c':colour,'min':[x[0],y[0],z[0]],'max':[x[1],y[1],z[1]]})
def side_box(parts, name, colour, side, x, y, z):
    box(parts,name,colour, x if side>0 else [-x[1],-x[0]],y,z)
def frame(parts, name, colour, side, depth, vertical, horizontal, width, bevel, axis='x', outer=None):
    # Closed rectangular ring with a broad authored chamfer: 24 vertices / 48 triangles,
    # versus four separately bevelled boxes. The hole keeps its measured clear dimensions.
    parts.append({'kind':'frame','m':name,'c':colour,'side':side,'depth':depth,
                  'vertical':vertical,'horizontal':horizontal,'width':width,'bevel':bevel,'axis':axis,'outer':outer})
def linear(hex_):
    rgb = [int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]


def add_part(bm, p):
    if p['kind'] == 'frame':
        back, front = p['depth']; w, b = p['width'], p['bevel']
        y0,y1 = p['vertical']; h0,h1 = p['horizontal']
        oy0,oy1,oh0,oh1 = p['outer'] or (y0-w,y1+w,h0-w,h1+w)
        loops=[]
        profile=((back,oy0,oy1,oh0,oh1),(front-b,oy0,oy1,oh0,oh1),
                 (front,oy0+b,oy1-b,oh0+b,oh1-b),(front,y0-b,y1+b,h0-b,h1+b),
                 (front-b,y0,y1,h0,h1),(back,y0,y1,h0,h1))
        for depth,low,high,left,right in profile:
            coords=((low,left),(low,right),(high,right),(high,left))
            loops.append([bm.verts.new(G(p['side']*depth,y,h) if p['axis']=='x' else G(h,y,p['side']*depth)) for y,h in coords])
        for k in range(6):
            for j in range(4): bm.faces.new((loops[k][j],loops[k][(j+1)%4],loops[(k+1)%6][(j+1)%4],loops[(k+1)%6][j]))
    elif p['kind'] == 'box':
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
    edge_weight = bm.edges.layers.float.new('bevel_weight_edge')
    palette = []
    for p in parts:
        if p['c'] not in palette:
            palette.append(p['c'])
        before = set(bm.edges)
        add_part(bm, p)
        weight = min(1.0, min(p['max'][i]-p['min'][i] for i in range(3))*.24/bevel) if p['kind']=='box' else 0.0
        for edge in bm.edges:
            if edge not in before: edge[edge_weight] = weight
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
    mod.limit_method = 'WEIGHT'
    mod.angle_limit = math.radians(40)
    mod.harden_normals = True
    obj.modifiers.new('weighted_normals', 'WEIGHTED_NORMAL')
    return obj

parts=[]
box(parts,'deck',BROWN,[-.8,.8],[.58,.70],[-1.45,1.45])
for side in (-1,1):
    side_box(parts,'lower_body',HONEY,side,[.71,.73],[.70,1.16],[-1.41,1.41])
    side_box(parts,'waist',BROWN,side,[.71,.734],[1.16,1.24],[-1.40,1.40])
    side_box(parts,'lining',CREAM,side,[.73,.76],[1.18,1.205],[-1.40,1.40])
    side_box(parts,'header',RED,side,[.70,.734],[1.87,1.93],[-1.41,1.41])
    side_box(parts,'bench',BROWN,side,[.36,.71],[.86,.92],[-1.20,1.20])
    side_box(parts,'bench_back',BROWN,side,[.68,.71],[.92,1.20],[-1.20,1.20])
    side_box(parts,'running_board',IRON,side,[.72,.8],[.55,.59],[-1.40,1.40])
    for z in (-1.05,1.05):
        side_box(parts,'bench_leg',BROWN,side,[.42,.65],[.70,.86],[z-.05,z+.05])
    # Five posts, with solid end cheeks; all four clear windows remain .54 x .63.
    for z0,z1 in ((-1.41,-1.17),(-.63,-.57),(-.03,.03),(.57,.63),(1.17,1.41)):
        side_box(parts,'window_post',RED,side,[.70,.734],[1.24,1.87],[z0,z1])
    for z in BAY_CENTRES:
        frame(parts,'window_surround',HONEY,side,[.73,.76],[1.24,1.87],[z-.27,z+.27],.025,.006)
        # Dark .045 m frame and .008 m chamfer hold at play size. Door bays have a red outline.
        frame(parts,'door_panel' if abs(z)>.5 else 'panel_frame',RED if abs(z)>.5 else BROWN,
              side,[.728,.76],[.79,1.115],[z-.235,z+.235],.045,.008)
        if abs(z)>.5:
            side_box(parts,'door_handle',BRASS,side,[.76,.795],[1.1825,1.2175],[z+.15,z+.24])
for end in (-1,1):
    z=[1.37,1.384] if end>0 else [-1.384,-1.37]
    box(parts,'end_lower',HONEY,[-.71,.71],[.70,1.24],z)
    frame(parts,'solid_end',RED,end,[1.37,1.384],[1.35,1.75],[-.25,.25],0,.003,
          axis='z',outer=(1.24,1.87,-.71,.71))
    for side in (-1,1):
        side_box(parts,'corner',BROWN,side,[.71,.76],[.70,1.93],z)
    frame(parts,'inspection_surround',HONEY,end,[1.38,1.41],[1.35,1.75],[-.25,.25],.05,.008,axis='z')
shell=node('coach_shell',[p for p in parts if p['m']!='lining'],.012)
lining=node('cream_lining',[p for p in parts if p['m']=='lining'],.002)
bpy.context.view_layer.objects.active=lining
for mod in list(lining.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
shell['coachSeats']=[{'name':f'seat_{k}','position':[(-1 if k%2==0 else 1)*.535,.885,BAY_CENTRES[k//2]],'yaw':(1 if k%2==0 else -1)*math.pi/2} for k in range(8)]
# Solid circular arc extrusion, 12 broad faces, underside .06 below the crown profile.
verts=[]
for z in (-1.45,1.45):
    for lower in (0,.06):
        for i in range(13):
            x=-.8+i*1.6/12
            y=2.05-ROOF_RADIUS+math.sqrt(ROOF_RADIUS**2-x*x)-lower
            verts.append(G(x,y,z))
faces=[]
for i in range(12):
    faces.extend([(i,i+1,27+i,26+i),(13+i,39+i,40+i,14+i),
                  (i,13+i,14+i,i+1),(26+i,27+i,40+i,39+i)])
faces.extend([(0,26,39,13),(12,25,51,38)])
# Red end fascia closes the gap between rectangular end wall and curved roof underside.
# Separate closed solids; colours assigned below by face ownership.
roof_face_count=len(faces)
for end in (-1,1):
    start=len(verts)
    for z in (end*1.37,end*1.41):
        for ymode in (0,1):
            for i in range(13):
                x=-.76+i*1.52/12
                y=1.87 if ymode==0 else 2.05-ROOF_RADIUS+math.sqrt(ROOF_RADIUS**2-x*x)-.06
                verts.append(G(x,y,z))
    for i in range(12):
        faces.extend([tuple(start+j for j in f) for f in [(i,i+1,27+i,26+i),(13+i,39+i,40+i,14+i),(i,13+i,14+i,i+1),(26+i,27+i,40+i,39+i)]])
    faces.extend([tuple(start+j for j in f) for f in [(0,26,39,13),(12,25,51,38)]])
mesh=bpy.data.meshes.new('arc_roof');mesh.from_pydata(verts,[],faces);mesh.update()
col=mesh.color_attributes.new('Col','FLOAT_COLOR','CORNER')
for poly in mesh.polygons:
    for li in poly.loop_indices: col.data[li].color=(*linear(IRON if poly.index<roof_face_count else RED),1)
mesh.color_attributes.active_color=col
roof=bpy.data.objects.new('arc_roof',mesh);scene.collection.objects.link(roof)
# Recalculate normals, preserve flat transverse facets and weld nothing across named solids.
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
bpy.ops.object.select_all(action='DESELECT');shell.select_set(True);roof.select_set(True);lining.select_set(True);bpy.context.view_layer.objects.active=shell
# Apply shell bevel first, so the arc profile is not bevelled or raised past its measured envelope.
for mod in list(shell.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.join()
under=[];box(under,'underframe',IRON,[-.7,.7],[.40,.58],[-1.45,1.45]);node('coach_underframe',under,.012)
for side,label in ((-1,'L'),(1,'R')):
    for z,end in ((-.9,'R'),(.9,'F')):
        step=[]
        # Stowed vertical above hinge. Rotation around game Z lowers outboard.
        box(step,'tread',HONEY,[-.02,.02],[0,.24],[-.28,.28])
        obj=node(f'coach_step_{label}{end}',step,.012)
        obj.location=G(side*.76,.57,z)
        obj['hinge']=[side*.76,.57,z]
        obj['side']=side
print(f'rider-coach: {len(parts)} shell primitives + solid 12-segment roof; 4 steps; 8 seat landmarks')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_yup=True,export_apply=True,export_normals=True,
 export_materials='NONE',export_vertex_color='ACTIVE',export_cameras=False,export_lights=False,export_extras=True,export_animations=False)
