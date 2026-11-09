import * as T from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {clone,retargetClip} from './vendor/three/examples/jsm/utils/SkeletonUtils.js';
import {makeOttoModel} from './reference-hero.js?v=otto9';
import {COMPANION_MANIFESTS} from './companion-asset-manifests.js';
export {COMPANION_MANIFESTS};

// The reference uses the same generic rig factory for Nia, Fin and Otto.
// Retarget proxy clips onto a scratch skeleton so the master bind pose is untouched.
export async function loadCompanionHero(stage,theme){
 const spec=COMPANION_MANIFESTS[theme];if(!spec)throw Error('Unknown companion book: '+theme);
 const loader=new GLTFLoader();const gltf=await loader.loadAsync(spec.model);
 const scratch=clone(gltf.scene);scratch.updateMatrixWorld(true);
 const find=root=>{let mesh;root.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;};
 const target=find(scratch);if(!target)throw Error(theme+' hero has no skinned mesh');
 const hipHeight=mesh=>{const i=mesh.skeleton.bones.findIndex(b=>b.name==='Hips');return i<0?1:Math.abs(new T.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert()).y)||1;};
 const clips={idle:gltf.animations[0]};
 if(!clips.idle)throw Error(theme+' hero has no base animation');
 // Sequential retargets: retargetClip temporarily poses the target skeleton.
 const proxies=await Promise.all(Object.entries(spec.clips).map(async([name,url])=>[name,await loader.loadAsync(url)]));
 for(const [name,proxy]of proxies){
  // Fetch together, but let the browser paint between CPU-heavy retargets.
  if(typeof requestAnimationFrame==='function')await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  const source=find(proxy.scene);
  if(!source||!proxy.animations[0])throw Error(theme+' animation is incomplete: '+name);
  const localOffsets={};
  target.skeleton.bones.forEach((bone,i)=>{const j=source.skeleton.bones.findIndex(b=>b.name===bone.name);if(j<0)return;const a=new T.Quaternion(),b=new T.Quaternion(),v=new T.Vector3(),scale=new T.Vector3();target.skeleton.boneInverses[i].clone().invert().decompose(v,a,scale);source.skeleton.boneInverses[j].clone().invert().decompose(v,b,scale);localOffsets[bone.name]=new T.Matrix4().makeRotationFromQuaternion(b.invert().multiply(a));});
  const clip=retargetClip(target,source,proxy.animations[0],{hip:'Hips',scale:hipHeight(target)/hipHeight(source),getBoneName:b=>b.name,preserveBonePositions:true,useFirstFramePosition:false,fps:30,localOffsets});
  for(const track of clip.tracks)track.name=track.name.replace(/^\.bones\[([^\]]+)\]/,'$1');clip.name=name;clips[name]=clip;
  proxy.scene.traverse(o=>{o.geometry?.dispose();for(const m of o.material?[].concat(o.material):[]){m.map?.dispose();m.dispose();}});
 }
 // Preserve the original runtime facing correction (idle damping 0.35).
 alignClipFacing(scratch,Object.values(clips),{idle:clips.idle});
 gltf.scene.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;for(const m of o.material?[].concat(o.material):[]){m.userData.shared=true;for(const value of Object.values(m))if(value?.isTexture)value.userData.shared=true;}});
 return {gltf,clips};
}
export function makeCompanionHero(loaded){return makeOttoModel(loaded.gltf,loaded.clips);}

function clipYaws(root, clip, times) {
  const mixer = new T.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.play();
  let L = null, R = null;
  root.traverse((o) => { if (!o.isBone) return; if (o.name === "LeftShoulder") L = o; if (o.name === "RightShoulder") R = o; });
  const out = [];
  let at = 0;
  for (const t of times) {
    mixer.update(t - at); at = t;
    root.updateMatrixWorld(true);
    if (L && R) {
      const l = L.getWorldPosition(new T.Vector3()), r = R.getWorldPosition(new T.Vector3());
      out.push(Math.atan2(-(l.z - r.z), l.x - r.x));   // forward = the character's left axis x up
    } else out.push(null);
  }
  action.stop();
  mixer.uncacheClip(clip);
  mixer.uncacheRoot(root);
  return out;
}

/** Shoulder yaw of a rig in its bind pose (the a-pose faces +z), the reference every clip must face. */
function restYaw(root) {
  root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); });
  root.updateMatrixWorld(true);
  let L = null, R = null;
  root.traverse((o) => { if (!o.isBone) return; if (o.name === "LeftShoulder") L = o; if (o.name === "RightShoulder") R = o; });
  if (!L || !R) return null;
  const l = L.getWorldPosition(new T.Vector3()), r = R.getWorldPosition(new T.Vector3());
  return Math.atan2(-(l.z - r.z), l.x - r.x);
}

/** Every clip must face the way the rig's bind pose faces: the idle baked into a Meshy model can
    be turned 25 degrees and swing 50 more while it looks around, and a retargeted library clip
    can carry its proxy's facing. Turn each clip's hip track by its mean error (about world up,
    in the hips' parent space); the idle also has its swing damped. */
function alignClipFacing(scratch, clips, { idle = null, damp = 0.35 } = {}) {
  const ref = restYaw(scratch);
  let hips = null;
  scratch.traverse((o) => { if (o.isBone && o.name === "Hips") hips = o; });
  if (ref == null || !hips || !hips.parent) return;
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  scratch.updateMatrixWorld(true);
  const parentQ = hips.parent.getWorldQuaternion(new T.Quaternion());
  const parentInv = parentQ.clone().invert();
  const q = new T.Quaternion(), fix = new T.Quaternion(), yawQ = new T.Quaternion();
  for (const clip of clips) {
    if (!clip) continue;
    const hipTrack = clip.tracks.find((t) => /Hips\.quaternion$/.test(t.name));
    if (!hipTrack) continue;
    const isIdle = clip === idle;
    const times = isIdle ? Array.from(hipTrack.times) : Array.from({ length: 8 }, (_, k) => (clip.duration * k) / 8);
    const yaws = clipYaws(scratch, clip, times);
    if (yaws.some((y) => y == null)) continue;
    let sx = 0, sy = 0;
    for (const y of yaws) { sx += Math.cos(y); sy += Math.sin(y); }
    const mean = Math.atan2(sy, sx);
    const offset = wrap(ref - mean);
    if (!isIdle && Math.abs(offset) < T.MathUtils.degToRad(4)) continue;
    for (let i = 0; i < hipTrack.times.length; i++) {
      // a retargeted clip keeps its own motion and just turns by the mean error; the idle's
      // swing around its mean is damped as well
      const swing = isIdle ? wrap(yaws[i] - mean) * (damp - 1) : 0;
      yawQ.setFromAxisAngle(new T.Vector3(0, 1, 0), offset + swing);
      fix.copy(parentInv).multiply(yawQ).multiply(parentQ);
      q.fromArray(hipTrack.values, i * 4).premultiply(fix);
      q.toArray(hipTrack.values, i * 4);
    }
    if (false) console.info(`clip ${clip.name}: facing turned ${Math.round(T.MathUtils.radToDeg(offset))} degrees${isIdle ? " (idle, swing damped)" : ""}`);
  }
  scratch.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); });
}
