import bpy, math
from mathutils import Vector

scene = bpy.context.scene
traveler = bpy.data.objects.get('TravelerRoot')
arm = bpy.data.objects.get('TravelerArmature')
if not traveler or not arm:
    raise RuntimeError('Expected TravelerRoot and TravelerArmature in the saved SAJA source')
scene.render.fps = 30
traveler['asset_status'] = 'SAJA_STYLIZED_PRODUCTION_CHARACTER_V2'
traveler['license_note'] = 'Original SAJA character geometry, wardrobe and keyframed animation authored for this project; no external motion assets.'
arm['animation_provenance'] = 'Eight original in-place Blender pose actions authored for SAJA Phase 2.'

# Replace the disconnected prototype meshes while retaining the village and its editable source.
old_meshes = [o for o in bpy.data.objects if o.type == 'MESH' and (o.parent is arm or o.parent is traveler or o in arm.children_recursive)]
for obj in old_meshes:
    bpy.data.objects.remove(obj, do_unlink=True)
if arm.animation_data:
    for track in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(track)
    arm.animation_data.action = None
for name in ('Idle','Walk','Run','WalkStart','WalkStop','TurnLeft','TurnRight','Interact'):
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)

def material(name, color, roughness=0.72, metallic=0.0, subsurface=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    if bs:
        bs.inputs['Base Color'].default_value = (*color, 1.0)
        bs.inputs['Roughness'].default_value = roughness
        if 'Metallic' in bs.inputs: bs.inputs['Metallic'].default_value = metallic
    return m

skin = material('Traveler Skin', (0.55,0.31,0.20), 0.48, 0.0, 0.0)
fabric = material('Traveler Garment', (0.055,0.31,0.24), 0.82)
trouser = material('Traveler Trousers', (0.13,0.19,0.27), 0.84)
trim = material('Traveler Woven Trim', (0.72,0.48,0.20), 0.54, 0.12)
leather = material('Traveler Leather', (0.16,0.085,0.045), 0.7)
hairmat = material('Traveler Hair', (0.055,0.032,0.024), 0.9)
covermat = material('Traveler Head Covering', (0.055,0.31,0.24), 0.86)
white = material('Traveler Eye White', (0.88,0.81,0.68), 0.42)
iris = material('Traveler Iris', (0.24,0.11,0.055), 0.45)
black = material('Traveler Pupil and Brows', (0.035,0.025,0.02), 0.56)
mouthmat = material('Traveler Mouth', (0.25,0.07,0.055), 0.65)

bones = [b for b in arm.data.bones if b.name != 'root']
segments = {b.name:(Vector(b.head_local),Vector(b.tail_local)) for b in bones}
def segdist(p,a,b):
    ab=b-a
    d=ab.length_squared
    t=0 if d<1e-9 else max(0,min(1,(p-a).dot(ab)/d))
    return (p-(a+ab*t)).length_squared

def bind(obj, rigid_bone=None):
    obj.parent=arm
    obj.location=(0,0,0); obj.rotation_euler=(0,0,0); obj.scale=(1,1,1)
    mod=obj.modifiers.new('Traveler deformation','ARMATURE'); mod.object=arm
    if rigid_bone:
        group=obj.vertex_groups.new(name=rigid_bone)
        if len(obj.data.vertices): group.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
    else:
        groups={name:obj.vertex_groups.new(name=name) for name in segments}
        per={name:[] for name in segments}
        for v in obj.data.vertices:
            ranked=sorted((segdist(v.co,a,b),name) for name,(a,b) in segments.items())[:2]
            weights=[1.0/(d+0.016)**2 for d,_ in ranked]
            total=sum(weights)
            for w,(_,name) in zip(weights,ranked): per[name].append((v.index,w/total))
        for name,items in per.items():
            for idx,w in items:
                if w>0.002: groups[name].add([idx],w,'REPLACE')
    for poly in obj.data.polygons: poly.use_smooth=True
    return obj

def mesh_obj(name, verts, faces, mat, rigid_bone=None, bevel=0):
    data=bpy.data.meshes.new(name+' mesh'); data.from_pydata(verts,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Soft tailored edges','BEVEL'); mod.width=bevel; mod.segments=2
    return bind(obj,rigid_bone)

def ellipsoid(name, center, scale, mat, bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=1, location=center)
    obj=bpy.context.object; obj.name=name
    obj.scale=scale; bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    return bind(obj,bone)

def ringmesh(name, rings, sides, mat, bone=None, phase=0.0):
    verts=[]; faces=[]
    for ri,(z,rx,ry) in enumerate(rings):
        for i in range(sides):
            a=2*math.pi*i/sides
            fold=1+0.012*math.cos(i*6*2*math.pi/sides+ri*0.4+phase)
            verts.append((rx*math.cos(a)*fold,ry*math.sin(a)*fold,z))
    for r in range(len(rings)-1):
        for i in range(sides):
            j=(i+1)%sides
            faces.append((r*sides+i,r*sides+j,(r+1)*sides+j,(r+1)*sides+i))
    return mesh_obj(name,verts,faces,mat,bone)

def tube(name, points, radii, mat, bone=None, sides=12):
    pts=[Vector(p) for p in points]
    verts=[]; faces=[]
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        u=Vector((0,1,0))-tangent*tangent.dot(Vector((0,1,0)))
        if u.length<0.01: u=Vector((1,0,0))-tangent*tangent.dot(Vector((1,0,0)))
        u.normalize(); v=tangent.cross(u).normalized()
        radius=radii[i] if isinstance(radii,(list,tuple)) else radii
        for j in range(sides):
            a=2*math.pi*j/sides
            q=p+radius*(u*math.cos(a)+v*math.sin(a))
            verts.append(tuple(q))
    for r in range(len(pts)-1):
        for j in range(sides):
            k=(j+1)%sides
            faces.append((r*sides+j,r*sides+k,(r+1)*sides+k,(r+1)*sides+j))
    faces.append(tuple(range(sides-1,-1,-1)))
    faces.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    return mesh_obj(name,verts,faces,mat,bone)

# Silhouette: shaped tunic, layered collar, waist sash and fine woven details.
tunic=ringmesh('Traveler Tunic',[(0.43,.34,.235),(.52,.335,.23),(.68,.305,.205),(.88,.286,.19),(1.08,.295,.195),(1.24,.325,.205),(1.36,.365,.205),(1.405,.31,.18)],32,fabric)
ringmesh('Traveler Tunic Hem',[(.475,.346,.241),(.505,.346,.241)],32,trim,phase=.2)
ringmesh('Traveler Waist Sash',[(.91,.298,.202),(.98,.298,.202)],32,trim,phase=.5)
ringmesh('Traveler Collar',[(1.365,.105,.102),(1.405,.12,.112)],24,trim)
# Front seam and hand-finished vertical embroidery.
tube('Traveler Embroidered Placket',[(0,-.207,1.32),(0,-.211,1.20),(0,-.206,1.05),(0,-.199,.82),(0,-.202,.62)],.006,trim,sides=8)
for side in (-1,1):
    x=side*.13
    tube('Traveler sleeve '+str(side),[(side*.22,-.01,1.35),(side*.30,-.015,1.27),(side*.36,-.025,1.16),(side*.43,-.035,1.02),(side*.465,-.045,.94)],[.135,.13,.115,.096,.082],fabric,sides=16)
    tube('Traveler cuff '+str(side),[(side*.448,-.043,.98),(side*.467,-.045,.94)], [.099,.086],trim,sides=16)
    # Tailored trouser legs, ankle gathers and articulated shoes.
    tube('Traveler trouser '+str(side),[(side*.125,0,.79),(side*.13,0,.57),(side*.13,0,.39),(side*.13,-.005,.20),(side*.13,-.015,.13)],[.12,.112,.095,.082,.078],trouser,sides=16)
    ellipsoid('Traveler leather shoe '+str(side),(side*.13,-.105,.095),(.135,.245,.078),leather,'foot.L' if side<0 else 'foot.R')
    ellipsoid('Traveler shoe sole '+str(side),(side*.13,-.11,.042),(.137,.235,.022),trim,'foot.L' if side<0 else 'foot.R')
    ellipsoid('Traveler hand '+str(side),(side*.47,-.045,.90),(.065,.055,.095),skin,'hand.L' if side<0 else 'hand.R')
    ellipsoid('Traveler knuckle '+str(side),(side*.47,-.091,.89),(.046,.026,.042),skin,'hand.L' if side<0 else 'hand.R')

# Human anatomy at every exposed joint and a properly modeled face.
ellipsoid('Traveler neck',(0,0,1.455),(.074,.078,.115),skin,'neck')
ellipsoid('Traveler head',(0,-.008,1.595),(.132,.121,.164),skin,'head')
for side in (-1,1):
    ellipsoid('Traveler ear '+str(side),(side*.126,-.005,1.592),(.029,.041,.046),skin,'head')
    ellipsoid('Traveler sclera '+str(side),(side*.047,-.114,1.621),(.031,.020,.025),white,'head')
    ellipsoid('Traveler iris '+str(side),(side*.047,-.132,1.620),(.014,.009,.017),iris,'head')
    ellipsoid('Traveler pupil '+str(side),(side*.047,-.139,1.620),(.007,.005,.010),black,'head')
    ellipsoid('Traveler brow '+str(side),(side*.047,-.121,1.655),(.041,.014,.009),hairmat,'head')
    ellipsoid('Traveler cheek '+str(side),(side*.073,-.105,1.584),(.036,.020,.025),skin,'head')
ellipsoid('Traveler nose bridge',(0,-.116,1.599),(.022,.032,.044),skin,'head')
ellipsoid('Traveler nose tip',(0,-.142,1.579),(.026,.026,.021),skin,'head')
tube('Traveler mouth',[(-.031,-.122,1.548),(0,-.139,1.543),(.031,-.122,1.548)],.004,mouthmat,'head',8)

# Headwear and hair styles are separate rigged assets; runtime selects one from the learner profile.
ellipsoid('Traveler hairstyle short',(0,.008,1.706),(.136,.126,.092),hairmat,'head')
ellipsoid('Traveler curly hair base',(0,.008,1.704),(.136,.126,.095),hairmat,'head')
ellipsoid('Traveler long hair base',(0,.008,1.704),(.136,.126,.095),hairmat,'head')
for i in range(17):
    angle=2*math.pi*i/17
    x=.115*math.cos(angle); y=.012+.105*math.sin(angle)
    ellipsoid('Traveler curl %02d'%i,(x,y,1.735+0.018*math.sin(angle*3)),(.038,.036,.035),hairmat,'head')
tube('Traveler hairstyle long left',[(-.105,.01,1.68),(-.13,.025,1.60),(-.12,.04,1.49),(-.09,.035,1.42)],[.043,.05,.046,.035],hairmat,'head')
tube('Traveler hairstyle long right',[(.105,.01,1.68),(.13,.025,1.60),(.12,.04,1.49),(.09,.035,1.42)],[.043,.05,.046,.035],hairmat,'head')
ellipsoid('Traveler hijab hood',(0,.035,1.666),(.153,.139,.153),covermat,'head')
ellipsoid('Traveler hijab drape',(0,.075,1.386),(.275,.155,.255),covermat,'chest')
tube('Traveler hijab face edge',[(-.126,-.055,1.70),(-.139,-.075,1.64),(-.132,-.095,1.56),(-.10,-.115,1.49)],[.012,.012,.014,.012],trim,'head',8)
ellipsoid('Traveler wrap cap',(0,.01,1.716),(.14,.133,.085),covermat,'head')
tube('Traveler wrap band',[(-.13,-.095,1.71),(-.09,-.13,1.73),(0,-.145,1.74),(.09,-.13,1.73),(.13,-.095,1.71)],.014,trim,'head',8)
ellipsoid('Traveler kufi',(0,0,1.737),(.138,.133,.055),material('Traveler Kufi',(.11,.18,.32),.75),'head')
tube('Traveler kufi braid',[(-.13,-.035,1.72),(-.07,-.115,1.72),(0,-.137,1.72),(.07,-.115,1.72),(.13,-.035,1.72)],.009,trim,'head',8)

# Cross-body satchel, woven strap, hardware and a hanging tassel.
tube('Traveler satchel strap',[(.19,-.18,1.36),(.10,-.218,1.20),(-.02,-.218,1.03),(-.15,-.205,.86),(-.24,-.18,.75)],.024,leather,sides=12)
ellipsoid('Traveler satchel',(-.28,-.035,.78),(.145,.105,.20),leather,'hips')
ellipsoid('Traveler satchel flap',(-.28,-.137,.84),(.151,.026,.074),trim,'hips')
ellipsoid('Traveler satchel clasp',(-.28,-.164,.83),(.018,.010,.026),trim,'hips')
tube('Traveler satchel tassel',[(-.37,-.07,.73),(-.39,-.07,.62),(-.39,-.07,.57)],[.012,.008,.003],trim,'hips',8)

# Improve skin and cloth deformation without changing the Rapier capsule dimensions.
for name in ('Traveler Tunic','Traveler Tunic Hem','Traveler Waist Sash','Traveler Collar'):
    obj=bpy.data.objects.get(name)
    if obj:
        sub=obj.modifiers.new('Tailored fabric smoothing','SUBSURF'); sub.levels=1; sub.render_levels=1


# Join skinned details by wearable group to keep the mobile draw-call count low.
def merge_parts(names, target):
    objects=[bpy.data.objects.get(n) for n in names]
    objects=[o for o in objects if o and o.type=='MESH']
    if not objects: return
    if len(objects)==1:
        objects[0].name=target
        return
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    objects[0].name=target
merge_parts(['Traveler Tunic','Traveler sleeve -1','Traveler sleeve 1'],'Traveler Outfit')
merge_parts(['Traveler Tunic Hem','Traveler Waist Sash','Traveler Collar','Traveler Embroidered Placket','Traveler cuff -1','Traveler cuff 1'],'Traveler Outfit Trim')
merge_parts(['Traveler hairstyle short'],'Traveler Style Short')
merge_parts(['Traveler curly hair base']+['Traveler curl %02d'%i for i in range(17)],'Traveler Style Curly')
merge_parts(['Traveler long hair base','Traveler hairstyle long left','Traveler hairstyle long right'],'Traveler Style Long')
merge_parts(['Traveler hijab hood','Traveler hijab drape','Traveler hijab face edge'],'Traveler Style Hijab')
merge_parts(['Traveler wrap cap','Traveler wrap band'],'Traveler Style Wrap')
merge_parts(['Traveler kufi','Traveler kufi braid'],'Traveler Style Kufi')
merge_parts(['Traveler neck','Traveler head']+['Traveler ear '+str(s) for s in (-1,1)]+['Traveler cheek '+str(s) for s in (-1,1)]+['Traveler nose bridge','Traveler nose tip']+['Traveler hand '+str(s) for s in (-1,1)]+['Traveler knuckle '+str(s) for s in (-1,1)],'Traveler Skin')
merge_parts(['Traveler sclera '+str(s) for s in (-1,1)],'Traveler Eyes')
merge_parts(['Traveler iris '+str(s) for s in (-1,1)],'Traveler Irises')
merge_parts(['Traveler pupil '+str(s) for s in (-1,1)],'Traveler Pupils')
merge_parts(['Traveler brow '+str(s) for s in (-1,1)],'Traveler Brows')
merge_parts(['Traveler trouser '+str(s) for s in (-1,1)],'Traveler Trousers')
merge_parts(['Traveler leather shoe '+str(s) for s in (-1,1)]+['Traveler shoe sole '+str(s) for s in (-1,1)],'Traveler Shoes')
merge_parts(['Traveler satchel strap','Traveler satchel','Traveler satchel flap','Traveler satchel clasp','Traveler satchel tassel'],'Traveler Satchel')

# Build full in-place, keyed motion. Each action keys every bone so it is a self-contained clip.
anim=arm.animation_data_create()
bone_names=[b.name for b in arm.pose.bones]
for pb in arm.pose.bones: pb.rotation_mode='XYZ'

def gait(frame, period, running=False):
    phase=2*math.pi*frame/period
    s=math.sin(phase); c=math.cos(phase)
    legAmp=.57 if running else .40
    kneeAmp=.78 if running else .52
    p={n:(0,0,0) for n in bone_names}
    p['thigh.L']=(legAmp*s,0,0); p['thigh.R']=(-legAmp*s,0,0)
    p['shin.L']=(kneeAmp*max(0,-s),0,0); p['shin.R']=(kneeAmp*max(0,s),0,0)
    p['foot.L']=(-.10*c + .10*max(0,-s),0,0); p['foot.R']=(.10*c + .10*max(0,s),0,0)
    armSwing=(.36 if running else .28)*s
    p['upper_arm.L']=(-armSwing,0,.035*c); p['upper_arm.R']=(armSwing,0,-.035*c)
    p['forearm.L']=(-.14-.12*max(0,s),0,0); p['forearm.R']=(-.14-.12*max(0,-s),0,0)
    p['spine']=(.025*s,.025*c,.012*c)
    p['chest']=(.018*s,-.035*s,0)
    p['head']=(.008*c,-.012*s,0)
    p['_hipsY']=(0,.008+.009*max(0,c) if running else .003+.003*max(0,c),0)
    return p

def neutral(frame, duration, breathing=True):
    phase=2*math.pi*frame/duration
    p={n:(0,0,0) for n in bone_names}
    p['spine']=(.009*math.sin(phase),0,.006*math.sin(phase))
    p['chest']=(.018*math.sin(phase),0,0)
    p['head']=(.008*math.sin(phase+.5),0,0)
    p['_hipsY']=(0,.002*math.sin(phase),0)
    return p

def build_action(name, frames, interpolation='BEZIER', loopable=False):
    act=bpy.data.actions.new(name)
    act.use_fake_user=True
    anim.action=act
    for frame,pose in frames:
        for name_bone in bone_names:
            pb=arm.pose.bones[name_bone]
            pb.rotation_euler=pose.get(name_bone,(0,0,0))
            pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=name_bone)
            if name_bone=='hips':
                pb.location=(0,pose.get('_hipsY',(0,0,0))[1],0)
                pb.keyframe_insert(data_path='location',frame=frame,group=name_bone)
    for fc in getattr(act,'fcurves',[]):
        for key in fc.keyframe_points:
            key.interpolation=interpolation
    track=anim.nla_tracks.new(); track.name=name
    strip=track.strips.new(name,frames[0][0],act)
    strip.action_frame_start=frames[0][0]; strip.action_frame_end=frames[-1][0]
    strip.blend_type='REPLACE'
    if loopable: strip.repeat=1.0
    return act

build_action('Idle',[(f,neutral(f,60)) for f in (0,15,30,45,60)])
build_action('Walk',[(f,gait(f,30)) for f in (0,7.5,15,22.5,30)],'LINEAR',True)
build_action('Run',[(f,gait(f,24,True)) for f in (0,6,12,18,24)],'LINEAR',True)
start_frames=[]
for f,amp in ((0,0),(5,.35),(10,1),(15,0)):
    p=gait(7.5,30); q={k:v for k,v in p.items()}
    q['thigh.L']=tuple(x*amp for x in p['thigh.L'])
    q['thigh.R']=tuple(x*amp for x in p['thigh.R'])
    q['upper_arm.L']=tuple(x*amp for x in p['upper_arm.L'])
    q['upper_arm.R']=tuple(x*amp for x in p['upper_arm.R'])
    q['_hipsY']=(0,.012*amp,0)
    q['spine']=(.075*amp,0,0)
    start_frames.append((f,q))
build_action('WalkStart',start_frames)
stop_frames=[]
for f,amp in ((0,1),(5,.68),(10,.32),(15,0)):
    p=gait(7.5,30); q={k:v for k,v in p.items()}
    for bone_name in ('thigh.L','thigh.R','shin.L','shin.R','foot.L','foot.R','upper_arm.L','upper_arm.R','forearm.L','forearm.R'):
        q[bone_name]=tuple(x*amp for x in p[bone_name])
    q['_hipsY']=(0,.012*amp,0)
    q['spine']=(.055*amp,0,0)
    stop_frames.append((f,q))
build_action('WalkStop',stop_frames)
for label,sign in (('TurnLeft',1),('TurnRight',-1)):
    frames=[]
    for f,t in ((0,0), (5,.45), (10,1), (16,0)):
        p={n:(0,0,0) for n in bone_names}
        p['hips']=(0,sign*.045*math.sin(math.pi*t),0)
        p['spine']=(0,sign*.13*math.sin(math.pi*t),sign*.035*math.sin(math.pi*t))
        p['chest']=(0,sign*.16*math.sin(math.pi*t),0)
        p['head']=(0,-sign*.05*math.sin(math.pi*t),0)
        p['upper_arm.L']=(.03*math.sin(math.pi*t),0,-sign*.11*math.sin(math.pi*t))
        p['upper_arm.R']=(.03*math.sin(math.pi*t),0,sign*.11*math.sin(math.pi*t))
        frames.append((f,p))
    build_action(label,frames)
interact=[]
for f,arm_raise,bow in ((0,0,0),(5,.82,.06),(11,.92,.08),(18,.72,.035),(25,0,0)):
    p={n:(0,0,0) for n in bone_names}
    p['upper_arm.R']=(-arm_raise,0,.18)
    p['forearm.R']=(-.48*min(1,arm_raise),0,.04)
    p['hand.R']=(.08,0,0)
    p['upper_arm.L']=(-.14*min(1,arm_raise),0,-.06)
    p['spine']=(bow,0,.025)
    p['chest']=(bow*.55,0,0)
    p['head']=(.10 if f in (5,11) else -.02,0,0)
    interact.append((f,p))
build_action('Interact',interact)
anim.action=None
scene.frame_start=0; scene.frame_end=60
scene['saja_asset_status']='Phase 2 stylized playable village'
scene['character_status']='Rigged character with eight authored in-place glTF actions'
scene['animation_clip_names']='Idle, Walk, Run, WalkStart, WalkStop, TurnLeft, TurnRight, Interact'
scene['animation_motion_provenance']='Original SAJA keyframe animation; no third-party motion clips.'
bpy.context.view_layer.update()

