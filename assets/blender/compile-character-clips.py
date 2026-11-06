#!/usr/bin/env python3
"""Add the eight authored SAJA pose actions to the Blender GLB's glTF animation library.

Blendstra's compatibility export bakes the active scene to one animation named Scene.
This deterministic post-export pass writes separate standard glTF animation clips from
the matching Blender keyframe definitions in saja-village-phase2.py. No root-position
channel is generated; Rapier owns world translation.
"""
import json
import math
import struct
import sys
from pathlib import Path

BONES = (
    'root','hips','spine','chest','neck','head',
    'upper_arm.L','forearm.L','hand.L','upper_arm.R','forearm.R','hand.R',
    'thigh.L','shin.L','foot.L','thigh.R','shin.R','foot.R',
)

def mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw*bx + ax*bw + ay*bz - az*by,
        aw*by - ax*bz + ay*bw + az*bx,
        aw*bz + ax*by - ay*bx + az*bw,
        aw*bw - ax*bx - ay*by - az*bz,
    )

def euler_xyz(x, y, z):
    c1,s1=math.cos(x/2),math.sin(x/2)
    c2,s2=math.cos(y/2),math.sin(y/2)
    c3,s3=math.cos(z/2),math.sin(z/2)
    return (
        s1*c2*c3 + c1*s2*s3,
        c1*s2*c3 - s1*c2*s3,
        c1*c2*s3 + s1*s2*c3,
        c1*c2*c3 - s1*s2*s3,
    )

def qnorm(q):
    n=math.sqrt(sum(x*x for x in q))
    return tuple(x/n for x in q) if n else (0,0,0,1)

def zero_pose():
    return {name:(0.0,0.0,0.0) for name in BONES}

def gait(frame, period, running=False):
    phase=2*math.pi*frame/period
    s,c=math.sin(phase),math.cos(phase)
    leg_amp=.57 if running else .40
    knee_amp=.78 if running else .52
    p=zero_pose()
    p['thigh.L']=(leg_amp*s,0,0); p['thigh.R']=(-leg_amp*s,0,0)
    p['shin.L']=(knee_amp*max(0,-s),0,0); p['shin.R']=(knee_amp*max(0,s),0,0)
    p['foot.L']=(-.10*c+.10*max(0,-s),0,0); p['foot.R']=(.10*c+.10*max(0,s),0,0)
    arm_swing=(.36 if running else .28)*s
    p['upper_arm.L']=(-arm_swing,0,.035*c); p['upper_arm.R']=(arm_swing,0,-.035*c)
    p['forearm.L']=(-.14-.12*max(0,s),0,0); p['forearm.R']=(-.14-.12*max(0,-s),0,0)
    p['spine']=(.025*s,.025*c,.012*c); p['chest']=(.018*s,-.035*s,0)
    p['head']=(.008*c,-.012*s,0)
    return p

def idle(frame):
    phase=2*math.pi*frame/60
    p=zero_pose()
    p['spine']=(.009*math.sin(phase),0,.006*math.sin(phase))
    p['chest']=(.018*math.sin(phase),0,0)
    p['head']=(.008*math.sin(phase+.5),0,0)
    return p

def start_pose(frame):
    amp={0:0,5:.35,10:1,15:0}[frame]
    p=gait(7.5,30)
    for name in ('thigh.L','thigh.R','upper_arm.L','upper_arm.R'):
        p[name]=tuple(x*amp for x in p[name])
    p['spine']=(.075*amp,0,0)
    return p

def stop_pose(frame):
    amp={0:1,5:.68,10:.32,15:0}[frame]
    p=gait(7.5,30)
    for name in ('thigh.L','thigh.R','shin.L','shin.R','foot.L','foot.R','upper_arm.L','upper_arm.R','forearm.L','forearm.R'):
        p[name]=tuple(x*amp for x in p[name])
    p['spine']=(.055*amp,0,0)
    return p

def turn_pose(sign, frame):
    t={0:0,5:.45,10:1,16:0}[frame]
    p=zero_pose()
    p['hips']=(0,sign*.045*math.sin(math.pi*t),0)
    p['spine']=(0,sign*.13*math.sin(math.pi*t),sign*.035*math.sin(math.pi*t))
    p['chest']=(0,sign*.16*math.sin(math.pi*t),0)
    p['head']=(0,-sign*.05*math.sin(math.pi*t),0)
    p['upper_arm.L']=(.03*math.sin(math.pi*t),0,-sign*.11*math.sin(math.pi*t))
    p['upper_arm.R']=(.03*math.sin(math.pi*t),0,sign*.11*math.sin(math.pi*t))
    return p

def interact_pose(frame):
    arm_raise,bow={0:(0,0),5:(.82,.06),11:(.92,.08),18:(.72,.035),25:(0,0)}[frame]
    p=zero_pose()
    p['upper_arm.R']=(-arm_raise,0,.18)
    p['forearm.R']=(-.48*min(1,arm_raise),0,.04)
    p['hand.R']=(.08,0,0)
    p['upper_arm.L']=(-.14*min(1,arm_raise),0,-.06)
    p['spine']=(bow,0,.025); p['chest']=(bow*.55,0,0)
    p['head']=(.10 if frame in (5,11) else -.02,0,0)
    return p

CLIPS = [
    ('Idle',2.0,(0,15,30,45,60),lambda f:idle(f)),
    ('Walk',1.0,(0,7.5,15,22.5,30),lambda f:gait(f,30)),
    ('Run',.8,(0,6,12,18,24),lambda f:gait(f,24,True)),
    ('WalkStart',.5,(0,5,10,15),start_pose),
    ('WalkStop',.5,(0,5,10,15),stop_pose),
    ('TurnLeft',16/30,(0,5,10,16),lambda f:turn_pose(1,f)),
    ('TurnRight',16/30,(0,5,10,16),lambda f:turn_pose(-1,f)),
    ('Interact',25/30,(0,5,11,18,25),interact_pose),
]

def add_accessor(gltf, binary, payload, component_type, item_type, count, minimum=None, maximum=None):
    while len(binary)%4: binary.append(0)
    offset=len(binary)
    binary.extend(payload)
    view_index=len(gltf.setdefault('bufferViews',[]))
    gltf['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(payload)})
    accessor={'bufferView':view_index,'componentType':component_type,'count':count,'type':item_type}
    if minimum is not None: accessor['min']=minimum
    if maximum is not None: accessor['max']=maximum
    index=len(gltf.setdefault('accessors',[]))
    gltf['accessors'].append(accessor)
    return index

def main(source, destination):
    raw=Path(source).read_bytes()
    if raw[:4]!=b'glTF': raise ValueError('Input is not a binary glTF')
    version,total=struct.unpack_from('<II',raw,4)
    if version!=2 or total!=len(raw): raise ValueError('Unsupported or truncated GLB')
    chunks=[]; cursor=12
    while cursor<len(raw):
        length,kind=struct.unpack_from('<II',raw,cursor)
        start=cursor+8; chunks.append((kind,raw[start:start+length])); cursor=start+length
    json_chunk=next(payload for kind,payload in chunks if kind==0x4E4F534A)
    binary=bytearray(next(payload for kind,payload in chunks if kind==0x004E4942))
    gltf=json.loads(json_chunk.rstrip(b' \t\r\n\0'))
    if len(gltf.get('buffers',[]))!=1: raise ValueError('Expected one embedded GLB buffer')
    nodes=gltf.get('nodes',[])
    node_ids={node.get('name'):i for i,node in enumerate(nodes) if node.get('name')}
    missing=[name for name in BONES if name not in node_ids]
    if missing: raise ValueError('Missing required skeleton nodes: '+', '.join(missing))
    gltf['animations']=[]
    for clip_name,duration,frames,pose_at in CLIPS:
        times=[duration*frame/frames[-1] for frame in frames]
        time_payload=struct.pack('<'+'f'*len(times),*times)
        time_accessor=add_accessor(gltf,binary,time_payload,5126,'SCALAR',len(times),[0.0],[duration])
        samplers=[]; channels=[]
        for bone in BONES:
            node=nodes[node_ids[bone]]
            rest=tuple(node.get('rotation',[0.0,0.0,0.0,1.0]))
            rotations=[]
            for frame in frames:
                delta=euler_xyz(*pose_at(frame).get(bone,(0,0,0)))
                rotations.extend(qnorm(mul(rest,delta)))
            payload=struct.pack('<'+'f'*len(rotations),*rotations)
            output=add_accessor(gltf,binary,payload,5126,'VEC4',len(frames))
            sampler=len(samplers)
            samplers.append({'input':time_accessor,'output':output,'interpolation':'LINEAR'})
            channels.append({'sampler':sampler,'target':{'node':node_ids[bone],'path':'rotation'}})
        gltf['animations'].append({'name':clip_name,'samplers':samplers,'channels':channels})
    gltf['buffers'][0]['byteLength']=len(binary)
    json_bytes=json.dumps(gltf,separators=(',',':'),ensure_ascii=False).encode('utf-8')
    while len(json_bytes)%4: json_bytes+=b' '
    while len(binary)%4: binary.append(0)
    output=bytearray(b'glTF'+struct.pack('<II',2,0))
    output.extend(struct.pack('<II',len(json_bytes),0x4E4F534A)); output.extend(json_bytes)
    output.extend(struct.pack('<II',len(binary),0x004E4942)); output.extend(binary)
    struct.pack_into('<I',output,8,len(output))
    Path(destination).write_bytes(output)
    print('Wrote %s (%d bytes): %s'%(destination,len(output),', '.join(name for name,_,_,_ in CLIPS)))

if __name__=='__main__':
    if len(sys.argv)!=3: raise SystemExit('usage: compile-character-clips.py INPUT.glb OUTPUT.glb')
    main(sys.argv[1],sys.argv[2])

