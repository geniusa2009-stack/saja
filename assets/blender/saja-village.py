import bpy, math
from mathutils import Vector
from blendstra.organic import figure, skin_body

# SAJA Village source scene. Blender is Z-up; the web exporter writes glTF Y-up.
# Position the static geometry against the canonical 36m x 22m gameplay layout.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in bpy.data.collections:
    if block.users == 0:
        bpy.data.collections.remove(block)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
scene.render.resolution_percentage = 75
if scene.world is None:
    scene.world = bpy.data.worlds.new('SAJA Village sky')
scene.world.color = (0.22, 0.28, 0.31)

def material(name, color, roughness=0.82, metallic=0.0, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metallic
    if emission:
        bs.inputs['Emission Color'].default_value = (*color, 1)
        bs.inputs['Emission Strength'].default_value = emission
    return m

sand = material('Warm limestone', (0.72, 0.60, 0.42))
cream = material('Sunlit plaster', (0.89, 0.79, 0.62))
rose = material('Terracotta', (0.54, 0.22, 0.13))
rose_light = material('Roof clay highlight', (0.70, 0.34, 0.20))
wood = material('Dark cedar', (0.20, 0.105, 0.055))
teal = material('SAJA teal', (0.055, 0.32, 0.27))
indigo = material('Deep indigo', (0.13, 0.20, 0.32))
gold = material('Brushed brass', (0.64, 0.39, 0.12), 0.35, 0.48)
stone = material('Pale path stone', (0.79, 0.70, 0.54))
stone_dark = material('Path joints', (0.48, 0.41, 0.32))
leaf_a = material('Olive canopy', (0.17, 0.34, 0.20))
leaf_b = material('Jade canopy', (0.25, 0.43, 0.26))
leaf_c = material('Herb green', (0.39, 0.51, 0.28))
water = material('Courtyard water', (0.08, 0.37, 0.44), 0.23, 0.12)
glass = material('Lantern honey glass', (0.96, 0.54, 0.16), 0.26, 0.0, 0.45)
cloth = material('Awning saffron', (0.72, 0.37, 0.16))
cloth_light = material('Awning linen', (0.91, 0.78, 0.56))
skin = material('Placeholder skin', (0.43, 0.27, 0.17), 0.74)
robe = material('Placeholder modest teal robe', (0.055, 0.27, 0.23), 0.9)
robe_edge = material('Robe woven edge', (0.73, 0.48, 0.19), 0.8)
trouser = material('Modest indigo trousers', (0.12, 0.18, 0.28), 0.9)
leather = material('Satchel leather', (0.26, 0.14, 0.075), 0.76)
face = material('Eye detail', (0.045, 0.035, 0.025), 0.6)

env = bpy.data.objects.new('VillageEnvironment', None)
bpy.context.collection.objects.link(env)
env['saja_role'] = 'static village environment'
env['scale_m'] = 1.0
env.scale.y = -1.0  # Blender Y maps to negative glTF Z; mirror this root to match the canonical world layout.

def parent_to(obj, parent=env):
    obj.parent = parent
    return obj

def cube(name, loc, dims, mat, bevel=0.0, parent=env):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('Soft hand-cut edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        o.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return parent_to(o, parent)

def cylinder(name, loc, radius, depth, mat, vertices=12, radius_top=None, parent=env):
    if radius_top is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius_top, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if mat:
        o.data.materials.append(mat)
    return parent_to(o, parent)

def ico(name, loc, scale, mat, subdivisions=1, parent=env):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if mat:
        o.data.materials.append(mat)
    return parent_to(o, parent)

def mesh_obj(name, vertices, faces, mat, parent=env):
    data = bpy.data.meshes.new(name + ' mesh')
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return parent_to(obj, parent)

def arched_panel(name, cx, front_y, bottom_z, width, height, depth, mat, parent=env):
    r = width * 0.5
    spring = height - r
    outline = [(-r, 0), (r, 0), (r, spring)]
    for i in range(1, 13):
        a = math.pi * i / 12
        outline.append((r * math.cos(a), spring + r * math.sin(a)))
    n = len(outline)
    verts = []
    for y in (front_y, front_y + depth):
        verts.extend((cx + x, y, bottom_z + z) for x, z in outline)
    faces = [tuple(range(n)), tuple(range(n, 2*n))[::-1]]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j+n, i+n))
    return mesh_obj(name, verts, faces, mat, parent)

def gable_roof(name, cx, cy, width, depth, eave_z, rise, mat, parent=env):
    x0, x1 = cx-width/2, cx+width/2
    y0, y1 = cy-depth/2, cy+depth/2
    v = [(x0,y0,eave_z),(cx,y0,eave_z+rise),(x1,y0,eave_z),
         (x0,y1,eave_z),(cx,y1,eave_z+rise),(x1,y1,eave_z)]
    f = [(0,1,4,3),(1,2,5,4),(0,2,1),(3,4,5)]
    o = mesh_obj(name, v, f, mat, parent)
    solid = o.modifiers.new('Roof thickness', 'SOLIDIFY')
    solid.thickness = 0.12
    bevel = o.modifiers.new('Roof edge finish', 'BEVEL')
    bevel.width = 0.035
    bevel.segments = 2
    return o

def house(name, cx, cy, width, depth, wall_height, wall_mat, roof_mat, trim_mat):
    front = cy - depth/2
    cube(name + ' limestone walls', (cx,cy,wall_height/2), (width,depth,wall_height), wall_mat, 0.07)
    cube(name + ' foundation course', (cx,cy,0.16), (width+0.22,depth+0.18,0.28), sand, 0.04)
    gable_roof(name + ' pitched clay roof', cx, cy, width+0.55, depth+0.4, wall_height-0.05, 1.75, roof_mat)
    cube(name + ' ridge cap', (cx,cy,wall_height+1.77), (0.19,depth+0.5,0.18), trim_mat, 0.07)
    # Deep-set arched door and timber lintel.
    arched_panel(name + ' arched door', cx, front-0.105, 0.16, 0.95, 2.05, 0.16, wood)
    arched_panel(name + ' door inset', cx, front-0.19, 0.19, 0.72, 1.84, 0.04, rose)
    cylinder(name + ' brass door pull', (cx+0.25,front-0.23,0.92), 0.045, 0.035, gold, 10)
    # Two recessed windows with projecting sill and carved timber surround.
    for side in (-1, 1):
        wx = cx + side*width*0.31
        cube(name + ' window recess', (wx,front-0.055,1.62), (0.82,0.10,0.95), wood, 0.09)
        cube(name + ' shutter field', (wx,front-0.12,1.62), (0.60,0.05,0.70), teal, 0.045)
        cube(name + ' shutter left', (wx-0.34,front-0.15,1.62), (0.12,0.09,0.82), trim_mat, 0.025)
        cube(name + ' shutter right', (wx+0.34,front-0.15,1.62), (0.12,0.09,0.82), trim_mat, 0.025)
        cube(name + ' window sill', (wx,front-0.16,1.13), (0.95,0.25,0.12), trim_mat, 0.035)
        cube(name + ' lintel', (wx,front-0.13,2.12), (0.97,0.18,0.13), wood, 0.035)
    # Covered porch with slender columns and a shaded bench.
    for side in (-1,1):
        cylinder(name + ' porch column', (cx+side*0.72,front-0.48,1.1), 0.085, 1.9, trim_mat, 12)
    cube(name + ' porch beam', (cx,front-0.48,2.08), (1.8,0.24,0.16), wood, 0.035)
    cube(name + ' porch bench', (cx+1.15,front-0.55,0.54), (1.05,0.34,0.12), wood, 0.04)
    for side in (-1,1):
        cube(name + ' bench leg', (cx+1.15+side*0.38,front-0.55,0.29), (0.09,0.10,0.45), wood, 0.02)

# Two detailed houses occupy the canonical collision footprints from scenes.ts.
house('West family home', -8.4, 2.5, 6.35, 5.8, 3.0, cream, rose, gold)
house('East family home', 8.7, 2.4, 6.3, 5.9, 3.15, sand, rose_light, teal)

# Ground and gently winding stone way; individual pavers keep the scene tactile.
cube('Village earth plinth', (0,0,-0.24), (36,22,0.42), sand, 0.16)
def path_strip(points, width):
    left, right = [], []
    for i, (x,y) in enumerate(points):
        before = Vector(points[max(0,i-1)])
        after = Vector(points[min(len(points)-1,i+1)])
        tangent = (after-before).normalized()
        normal = Vector((-tangent.y, tangent.x))
        left.append((x+normal.x*width/2, y+normal.y*width/2, -0.015))
        right.append((x-normal.x*width/2, y-normal.y*width/2, -0.015))
    verts=[]
    for a,b in zip(left,right): verts.extend((a,b))
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)]
    return mesh_obj('Winding limestone walkway',verts,faces,stone)
path_strip([(-17,-1.4),(-12,-1.2),(-8,-0.7),(-4,-1.1),(0,-1.55),(4,-0.7),(8,0.2),(12,0.75),(17,0.1)],2.6)
for i in range(54):
    t=i/53
    x=-16.8 + 33.6*t
    y=-1.35 + 0.70*math.sin(t*math.pi*2.0) + 0.15*math.sin(t*math.pi*4.0)
    o=ico('Hand-set path paver', (x,y,0.005), (0.31+(i%3)*0.035,0.16+(i%2)*0.025,0.028), stone_dark if i%9==0 else stone, 1)
    o.rotation_euler[2]=(i%5-2)*0.09

# Low garden walls, herbs, pots and fruiting shrubs.
for cx,cy,w in [(-4.2,-4.7,3.0),(12.4,-4.8,2.8),(-12.6,-5.4,2.2)]:
    cube('Raised herb bed', (cx,cy,0.13), (w,1.35,0.28), sand, 0.11)
    for i in range(7):
        x=cx-w*0.42+i*w*0.14
        ico('Herb crown', (x,cy,0.48+(i%2)*0.07), (0.30,0.24,0.31), [leaf_a,leaf_b,leaf_c][i%3], 1)
    for dx in (-0.52,0.52):
        cylinder('Terracotta garden pot', (cx+dx,cy-0.87,0.34), 0.22, 0.55, rose, 10, 0.30)
        ico('Pot foliage', (cx+dx,cy-0.87,0.7), (0.23,0.22,0.24), leaf_b, 1)

def shade_tree(name,x,y,variant=0):
    cylinder(name+' tapered trunk',(x,y,1.05),0.27,2.1,wood,10,0.16)
    for dx,dz,scale,mat in [
        (-0.55,2.85,(0.88,0.78,0.95),leaf_a),
        (0.38,3.05,(1.02,0.82,0.94),leaf_b),
        (0.0,3.65,(0.82,0.70,0.83),leaf_c),
        (0.82,2.9,(0.68,0.62,0.73),leaf_a),
    ]:
        ico(name+' canopy mass',(x+dx,y+0.12*variant,dz),scale,mat,2)
    for i in range(4):
        ico(name+' fruit',(x-0.45+0.32*i,y-0.42,2.55+(i%2)*0.33),(0.09,0.09,0.09),rose_light,1)
shade_tree('Olive tree west',-14.8,0.8,0)
shade_tree('Olive tree plaza',-0.7,1.4,1)
shade_tree('Olive tree east',14.0,0.8,2)

# The handcart from the canonical obstacle rectangle.
cart_x, cart_y = 4.9, -5.2
cube('Market cart bed',(cart_x,cart_y,0.72),(4.0,1.22,0.42),wood,0.12)
cube('Market cart linen top',(cart_x,cart_y,0.98),(4.15,1.32,0.13),cloth_light,0.07)
for side in (-1,1):
    cylinder('Cart wheel',(cart_x+side*1.42,cart_y-0.02,0.43),0.42,0.18,wood,16)
    cylinder('Cart wheel hub',(cart_x+side*1.42,cart_y-0.13,0.43),0.16,0.20,gold,12)
for i in range(4):
    cube('Market produce crate',(cart_x-1.25+i*0.82,cart_y,1.34),(0.68,0.64,0.61),sand,0.06)
    ico('Market fruit',(cart_x-1.25+i*0.82,cart_y-0.16,1.78),(0.20,0.18,0.17),[rose_light,leaf_c,gold][i%3],1)

# A small public well and a basin add a clear landmark.
cylinder('Village well stone body',(1.1,1.1,0.42),1.05,0.78,sand,16)
cylinder('Well inner water',(1.1,1.1,0.83),0.75,0.04,water,24)
for side in (-1,1):
    cylinder('Well timber post',(1.1+side*0.86,1.1,1.56),0.10,1.85,wood,10)
cube('Well crossbeam',(1.1,1.1,2.46),(2.02,0.14,0.14),wood,0.05)
cylinder('Well pulley',(1.1,1.1,2.25),0.22,0.25,gold,12)
cylinder('Well rope',(1.1,1.1,1.72),0.025,1.0,wood,8)

# Brass lamp posts and warm lanterns frame the route.
def lantern_post(x,y):
    cylinder('Lantern footing',(x,y,0.14),0.27,0.25,stone_dark,10)
    cylinder('Lantern iron stem',(x,y,1.36),0.055,2.4,wood,10)
    cylinder('Lantern collar',(x,y,2.52),0.17,0.12,gold,10)
    cube('Lantern glowing core',(x,y,2.87),(0.38,0.38,0.58),glass,0.09)
    for dx in (-0.22,0.22):
        cylinder('Lantern frame',(x+dx,y,2.87),0.025,0.67,gold,8)
    cylinder('Lantern cap',(x,y,3.22),0.29,0.14,gold,8,0.16)
    cylinder('Lantern finial',(x,y,3.38),0.07,0.21,gold,8,0.0)
for lx,ly in [(-11,-2.5),(-4,-3.2),(4,-2.9),(11,-2.2)]:
    lantern_post(lx,ly)

# Striped shade canopy and patterned hanging textiles at the market stall.
for x in (-1.5,-0.5,0.5,1.5):
    cylinder('Stall support',(cart_x+x,cart_y-0.48,1.85),0.055,2.25,wood,8)
cube('Stall awning',(cart_x,cart_y-0.48,2.94),(3.45,1.30,0.16),cloth,0.06)
for i in range(5):
    cube('Awning woven stripe',(cart_x-1.35+i*0.68,cart_y-0.48,3.035),(0.22,1.23,0.035),cloth_light,0.015)
cube('Hanging woven runner',(cart_x,cart_y-1.15,2.28),(2.7,0.06,0.66),teal,0.03)
for i in range(9):
    cube('Runner embroidery',(cart_x-1.16+i*0.29,cart_y-1.2,2.28),(0.045,0.035,0.42),gold,0.01)

# Human figure: CC0 MakeHuman base via Blendstra's anatomy mesh helper.
# This is a temporary engineering model, not a finished character asset.
shape = figure(height_m=1.64)
if isinstance(shape, dict):
    joints, bones, radii = shape['joints'], shape['bones'], shape['radii']
elif hasattr(shape, 'joints'):
    joints, bones, radii = shape.joints, shape.bones, shape.radii
else:
    joints, bones, radii = shape
body = skin_body('Traveler anatomical base', joints, bones, radii, levels=1)
body['asset_status'] = 'TEMPORARY_ENGINEERING_PLACEHOLDER'
body.data.materials.clear()
body.data.materials.append(skin)

traveler = bpy.data.objects.new('TravelerRoot', None)
bpy.context.collection.objects.link(traveler)
traveler['asset_status'] = 'TEMPORARY_ENGINEERING_PLACEHOLDER'
traveler['license_note'] = 'CC0 MakeHuman base mesh, with original SAJA clothing and animation.'
traveler['replace_with'] = 'Final artist model must preserve scale, facing, root, bone names and clip names documented in assets/blender/CHARACTER_REPLACEMENT.md.'

# Named humanoid skeleton in metres, feet on z=0; forward is Blender -Y.
arm_data = bpy.data.armatures.new('SAJA humanoid skeleton')
arm_obj = bpy.data.objects.new('TravelerArmature', arm_data)
bpy.context.collection.objects.link(arm_obj)
arm_obj.parent = traveler
arm_obj.show_in_front = True
bpy.context.view_layer.objects.active = arm_obj
arm_obj.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
specs = {
 'root':((0,0,0.04),(0,0,0.88),None),
 'hips':((0,0,0.82),(0,0,1.04),'root'),
 'spine':((0,0,1.00),(0,0,1.25),'hips'),
 'chest':((0,0,1.22),(0,0,1.42),'spine'),
 'neck':((0,0,1.40),(0,0,1.54),'chest'),
 'head':((0,0,1.52),(0,0,1.75),'neck'),
 'upper_arm.L':((-0.19,0,1.36),(-0.35,0,1.17),'chest'),
 'forearm.L':((-0.35,0,1.17),(-0.45,-0.01,0.98),'upper_arm.L'),
 'hand.L':((-0.45,-0.01,0.98),(-0.47,-0.04,0.88),'forearm.L'),
 'upper_arm.R':((0.19,0,1.36),(0.35,0,1.17),'chest'),
 'forearm.R':((0.35,0,1.17),(0.45,-0.01,0.98),'upper_arm.R'),
 'hand.R':((0.45,-0.01,0.98),(0.47,-0.04,0.88),'forearm.R'),
 'thigh.L':((-0.12,0,0.91),(-0.13,0,0.52),'hips'),
 'shin.L':((-0.13,0,0.52),(-0.13,0,0.12),'thigh.L'),
 'foot.L':((-0.13,0,0.12),(-0.13,-0.25,0.07),'shin.L'),
 'thigh.R':((0.12,0,0.91),(0.13,0,0.52),'hips'),
 'shin.R':((0.13,0,0.52),(0.13,0,0.12),'thigh.R'),
 'foot.R':((0.13,0,0.12),(0.13,-0.25,0.07),'shin.R'),
}
edit_bones={}
for name,(head,tail,parent_name) in specs.items():
    b=arm_data.edit_bones.new(name)
    b.head=head
    b.tail=tail
    edit_bones[name]=b
for name,(_,_,parent_name) in specs.items():
    if parent_name:
        edit_bones[name].parent=edit_bones[parent_name]
bpy.ops.object.mode_set(mode='OBJECT')
arm_obj.select_set(False)

# Make a tapered garment mesh with tailored vertical panels and an open hem.
def ring_mesh(name, rings, sides, mat, parent=traveler, folds=0.0):
    verts=[]
    for ring_index,(z,rx,ry) in enumerate(rings):
        for i in range(sides):
            a=2*math.pi*i/sides
            fold=1.0+folds*math.cos(i*4*2*math.pi/sides+ring_index*0.22)
            verts.append((rx*math.cos(a)*fold,ry*math.sin(a)*fold,z))
    faces=[]
    for r in range(len(rings)-1):
        for i in range(sides):
            j=(i+1)%sides
            faces.append((r*sides+i,r*sides+j,(r+1)*sides+j,(r+1)*sides+i))
    faces.append(tuple((len(rings)-1)*sides+i for i in range(sides)))
    return mesh_obj(name,verts,faces,mat,parent)

tunic=ring_mesh('Long modest tunic',[(0.42,0.34,0.23),(0.57,0.32,0.22),(0.80,0.29,0.20),(1.02,0.29,0.19),(1.24,0.36,0.22),(1.41,0.31,0.19)],20,robe,traveler,0.06)
# Gold woven hem and cuff trim.
ring_mesh('Tunic hem braid',[(0.48,0.345,0.235),(0.52,0.345,0.235)],20,robe_edge,traveler,0.02)
for side in (-1,1):
    x=side*0.43
    sleeve=cylinder('Long robe sleeve',(side*0.35,-0.01,1.13),0.14,0.56,robe,12,0.105,traveler)
    sleeve.rotation_euler[1]=side*0.20
    cuff=cylinder('Woven sleeve cuff',(side*0.43,-0.01,0.90),0.118,0.09,robe_edge,12,0.118,traveler)
    cuff.rotation_euler[1]=side*0.20
for side in (-1,1):
    leg=ring_mesh('Modest trouser leg',[(0.10,0.105,0.12),(0.28,0.105,0.12),(0.50,0.115,0.13),(0.73,0.13,0.14)],12,trouser,traveler,0.025)
    # Separate the two legs by shifting vertices after construction.
    for v in leg.data.vertices:
        v.co.x += side*0.13
    shoe=ico('Soft leather shoe',(side*0.13,-0.12,0.09),(0.14,0.26,0.085),leather,2,traveler)
# Woven shoulder wrap, waist sash, simple kufi and satchel.
cube('Woven waist sash',(0,-0.01,0.94),(0.58,0.40,0.10),robe_edge,0.035,traveler)
cylinder('Kufi cap',(0,0,1.69),0.145,0.16,indigo,16,0.13,traveler)
cylinder('Kufi gold band',(0,0,1.62),0.149,0.045,gold,16,0.149,traveler)
cube('Satchel body',(0.39,-0.10,0.86),(0.31,0.20,0.36),leather,0.055,traveler)
cube('Satchel flap',(0.39,-0.215,1.01),(0.34,0.035,0.13),robe_edge,0.025,traveler)
for side in (-1,1):
    ico('Eye',(side*0.055,-0.135,1.59),(0.022,0.018,0.018),face,2,traveler)

# Bind each mesh to the nearest two bone segments with normalized smooth weights.
bone_segments={name:(Vector(head),Vector(tail)) for name,(head,tail,_) in specs.items() if name!='root'}
def segment_distance(point,a,b):
    ab=b-a
    den=ab.length_squared
    t=0.0 if den<1e-8 else max(0.0,min(1.0,(point-a).dot(ab)/den))
    return (point-(a+ab*t)).length_squared

def bind_mesh(obj):
    obj.parent=arm_obj
    mod=obj.modifiers.new('SAJA skeletal skin','ARMATURE')
    mod.object=arm_obj
    groups={name:obj.vertex_groups.new(name=name) for name in bone_segments}
    rows={name:[] for name in bone_segments}
    for vertex in obj.data.vertices:
        p=vertex.co
        ranked=sorted((segment_distance(p,a,b),name) for name,(a,b) in bone_segments.items())[:2]
        weights=[1.0/(dist+0.012)**2 for dist,_ in ranked]
        total=sum(weights)
        for weight,(_,name) in zip(weights,ranked):
            rows[name].append((vertex.index,weight/total))
    for name,entries in rows.items():
        for index,weight in entries:
            groups[name].add([index],weight,'REPLACE')
    return obj

body=bind_mesh(body)
for obj in [tunic]:
    bind_mesh(obj)
for obj in list(traveler.children):
    if obj.type=='MESH' and obj not in [body,tunic]:
        bind_mesh(obj)

# Stable, named in-place clips. Physics owns world translation; clips animate the skeleton only.
arm_obj.animation_data_create()
leg_l,leg_r='thigh.L','thigh.R'
arm_l,arm_r='upper_arm.L','upper_arm.R'
def action(name, frames):
    act=bpy.data.actions.new(name)
    act.use_fake_user=True
    arm_obj.animation_data.action=act
    for frame, pose in frames:
        for bone_name,rotation in pose.items():
            pb=arm_obj.pose.bones[bone_name]
            pb.rotation_mode='XYZ'
            pb.rotation_euler=rotation
            pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=bone_name)
    act.frame_range=(frames[0][0],frames[-1][0])
    return act

def gait_frame(swing, lift=0.0, arm=0.0):
    return {
      'thigh.L':(swing,0,0),'thigh.R':(-swing,0,0),
      'shin.L':(max(0,-swing)*0.45,0,0),'shin.R':(max(0,swing)*0.45,0,0),
      'upper_arm.L':(-arm,0,0),'upper_arm.R':(arm,0,0),
      'spine':(0,0,lift)
    }
action('Idle',[(0,{'chest':(0,0,0),'spine':(0,0,0)}),(12,{'chest':(0.015,0,0),'spine':(0.01,0,0)}),(24,{'chest':(0,0,0),'spine':(0,0,0)})])
action('Walk',[(0,gait_frame(0,0,0)),(6,gait_frame(0.48,0.015,0.34)),(12,gait_frame(0,0,0)),(18,gait_frame(-0.48,-0.015,-0.34)),(24,gait_frame(0,0,0))])
action('Run',[(0,gait_frame(0,0,0)),(4,gait_frame(0.72,0.035,0.52)),(8,gait_frame(0,0,0)),(12,gait_frame(-0.72,-0.035,-0.52)),(16,gait_frame(0,0,0))])
action('WalkStart',[(0,gait_frame(0,0,0)),(6,gait_frame(0.24,0.01,0.17)),(12,gait_frame(0.48,0.015,0.34))])
action('WalkStop',[(0,gait_frame(0.48,0.015,0.34)),(6,gait_frame(0.22,0.01,0.16)),(12,gait_frame(0,0,0))])
action('TurnLeft',[(0,{'root':(0,0,0),'chest':(0,0,0)}),(8,{'root':(0,0,0.30),'chest':(0,0,0.12)}),(16,{'root':(0,0,0),'chest':(0,0,0)})])
action('TurnRight',[(0,{'root':(0,0,0),'chest':(0,0,0)}),(8,{'root':(0,0,-0.30),'chest':(0,0,-0.12)}),(16,{'root':(0,0,0),'chest':(0,0,0)})])
action('Interact',[(0,{'upper_arm.R':(0,0,0),'forearm.R':(0,0,0)}),(6,{'upper_arm.R':(-0.65,0,0.25),'forearm.R':(-0.20,0,0)}),(12,{'upper_arm.R':(-0.45,0,0.18),'forearm.R':(-0.25,0,0)}),(18,{'upper_arm.R':(0,0,0),'forearm.R':(0,0,0)})])
arm_obj.animation_data.action=None
scene.frame_start=0
scene.frame_end=24
scene.render.fps=24

notes=bpy.data.texts.new('CHARACTER_REPLACEMENT.md')
notes.write('''# Temporary SAJA traveller model
This rigged model is an engineering placeholder. Replace TravelerRoot and its skinned meshes with the final artist character before calling this character production-ready.
Keep Blender Z-up source units in metres, feet at z=0, a 1.64 m approximate height, forward facing Blender -Y, and root origin at the ground midpoint.
Retain these stable armature bone names: root, hips, spine, chest, neck, head, upper_arm.L/R, forearm.L/R, hand.L/R, thigh.L/R, shin.L/R, foot.L/R.
Retain GLB clip names: Idle, Walk, Run, WalkStart, WalkStop, TurnLeft, TurnRight, Interact. Clips must be in-place; the Rapier controller owns all world translation.
Export glTF 2.0 / GLB with skins and all named actions. Keep outfits modest and map the traveller profile outfit/skin palette to material slots.
The current body base comes from Blendstra's CC0 MakeHuman pack; SAJA clothing and the village scene are original procedural work.
''')
scene['saja_asset_status']='playable stylized village + temporary rigged avatar'
scene['character_status']='TEMPORARY_ENGINEERING_PLACEHOLDER'

