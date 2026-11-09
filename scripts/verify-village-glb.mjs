import { readFileSync } from 'node:fs';
function glbInfo(file) {
  const data = readFileSync(file);
  if (data.toString('utf8', 0, 4) !== 'glTF') throw new Error('Not a GLB: ' + file);
  if (data.readUInt32LE(8) !== data.length) throw new Error('GLB header length mismatch: ' + file);
  if (data.toString('utf8', 16, 20) !== 'JSON') throw new Error('Missing GLB JSON chunk');
  const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
  return {
    bytes: data.length,
    nodeNames: (json.nodes ?? []).map((n) => n.name).filter(Boolean).sort(),
    animations: (json.animations ?? []).map((a) => a.name).sort(),
    animationChannels: (json.animations ?? []).map((a) => a.channels?.length ?? 0).sort((a,b) => a-b),
    skins: (json.skins ?? []).length,
    scenes: (json.scenes ?? []).length,
  };
}
const original = glbInfo(process.argv[2]);
const candidate = glbInfo(process.argv[3]);
const required = ['Idle', 'Walk', 'Run', 'WalkStart', 'WalkStop', 'TurnLeft', 'TurnRight', 'Interact'];
if (!required.every((n) => original.animations.includes(n))) throw new Error('Baseline unexpectedly lacks required animation clips');
if (JSON.stringify(original.animations) !== JSON.stringify(candidate.animations)) throw new Error('Candidate altered animation clip names');
if (JSON.stringify(original.animationChannels) !== JSON.stringify(candidate.animationChannels)) throw new Error('Candidate altered animation channels');
if (original.skins !== candidate.skins) throw new Error('Candidate changed rig skin count');
if (!candidate.nodeNames.includes('TravelerRoot')) throw new Error('Candidate lost traveller rig');
for (const name of original.nodeNames) {
  if (!candidate.nodeNames.includes(name)) throw new Error('Candidate removed a named node: ' + name);
}
console.log('Original GLB bytes:', original.bytes);
console.log('Candidate GLB bytes:', candidate.bytes);
console.log('Potential reduction:', (100 * (1 - candidate.bytes / original.bytes)).toFixed(2) + '%');
console.log('Clip names / animation channel counts / skins / named nodes preserved by structural check.');
console.log('Candidate is NOT deployed: still requires motion, visual, and device QA.');
