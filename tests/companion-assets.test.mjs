// Real GLB parsing/retargeting test. Image decoding is stubbed; no WebGL visual QA.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three/build/three.module.js';
import {loadCompanionHero,makeCompanionHero} from '../companion-assets.js';
import {ReferenceCompanionScene,COMPANION_ART_IDS,COMPANION_SCENE_IDS} from '../reference-companion-scenes.js';
const root=new URL('../',import.meta.url),realFetch=globalThis.fetch;
globalThis.self=globalThis;
globalThis.ProgressEvent=class{constructor(type,data){Object.assign(this,{type},data);}};
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.document={createElement(){return {getContext(){return {createLinearGradient(){return {addColorStop(){}};},save(){},restore(){},clearRect(){},drawImage(){},beginPath(){},ellipse(){},fill(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
const RequestBase=globalThis.Request;
globalThis.Request=class extends RequestBase{constructor(url,options){super(typeof url==='string'&&!/^(blob:|https?:)/.test(url)?'http://local.test/'+url:url,options);}};
globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;if(url.startsWith('blob:'))return realFetch(input);const file=new URL(new URL(url).pathname.slice(1),root);return new Response(await readFile(file));};
const sources=JSON.parse(await readFile(new URL('assets/companion-reference/sources.json',root)));
for(const asset of sources){const bytes=await readFile(new URL(asset.file,root));assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}

// Compare normalized trajectories, not just finite values. Uniform page enlargement must
// preserve the source gestures, including Nia's procedural wave (she has no wave clip).
function animationSamples(loaded,scale,{pose='stand',gesture}={}){
 const random=Math.random;let hero;
 try{Math.random=()=>.5;hero=makeCompanionHero(loaded);}finally{Math.random=random;}
 const scene=new T.Group(),holder=new T.Group();scene.scale.setScalar(scale);
 holder.scale.setScalar(.5);holder.rotation.y=.25;scene.add(holder);holder.add(hero.group);
 hero.setPose(pose);hero.lookAt(new T.Vector3(0,.4,2).multiplyScalar(scale));
 if(gesture)hero[gesture]();
 const samples=[];
 for(let i=0;i<60;i++){
  hero.update(1/60,(i+1)/60);scene.updateMatrixWorld(true);
  if(i%6===0)for(const name of ['Head','LeftHand','RightHand','LeftFoot','RightFoot']){
   const bone=hero.bones[name];if(bone)samples.push(...scene.worldToLocal(bone.getWorldPosition(new T.Vector3())).toArray());
  }
 }
 hero.mixer.stopAllAction();hero.mixer.uncacheRoot(hero.group.children[0]);
 return samples;
}
for(const theme of ['nia','fin']){
 const loaded=await loadCompanionHero({},theme);assert.equal(Object.keys(loaded.clips).length,6);
 const a=makeCompanionHero(loaded),b=makeCompanionHero(loaded);assert.notEqual(a.group,b.group);
 for(const [name,clip]of Object.entries(loaded.clips)){
  assert(clip.duration>0);assert(clip.tracks.length>0);
  for(const track of clip.tracks)assert(Array.from(track.values).every(Number.isFinite));
  a.play(name);for(let i=0;i<20;i++)a.update(.05);a.group.updateMatrixWorld(true);
  a.group.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
 }
 for(const options of [{gesture:'wave'},{gesture:'jump'},{pose:theme==='nia'?'run':'swim'},{pose:'sleep'}]){
  const original=animationSamples(loaded,1,options),enlarged=animationSamples(loaded,7.5,options);
  assert.equal(original.length,enlarged.length);assert(original.length>0);
  original.forEach((value,i)=>assert(Math.abs(value-enlarged[i])<1e-6,`${theme} ${JSON.stringify(options)} scale invariance at ${i}`));
 }
 const motion=theme==='nia'?'run':'swim';b.setPose(motion);
 for(let i=0;i<200;i++)b.update(.05,(i+1)*.05);
 assert.equal(b.state.base,b.actions[motion]);assert(b.actions[motion].isRunning());
 b.jump();assert.equal(b.state.oneShot,b.actions.jump);
 for(let i=0;i<Math.ceil((b.actions.jump.getClip().duration+1)/.05);i++)b.update(.05,10+(i+1)*.05);
 assert.equal(b.state.oneShot,null);assert.equal(b.state.base,b.actions[motion]);assert(b.actions[motion].isRunning());
 // Exercise the actual rig through each original spread builder, not only isolated clips.
 const art=Object.fromEntries(COMPANION_ART_IDS[theme].map(id=>{const texture=new T.Texture({width:512,height:512});texture.userData.hitTest=()=>true;return [id,{texture,width:512,height:512,cutout:true}];}));
 const host={props:new T.Group(),canvas:{dataset:{}},motion:true,room:{},render(){}};
 const adapter=new ReferenceCompanionScene(host,{theme,manifest:{art},loadHero:async()=>loaded,makeHero:makeCompanionHero});
 await adapter.ensureLoaded();let gestures=0;
 for(const scene of COMPANION_SCENE_IDS[theme]){
  host.props=new T.Group();const state=adapter.build({scene});adapter.fold(state,1);
  for(const action of [theme+'/wave',theme+'/'+motion,theme==='nia'?'wind/gust':'sea/sparkle',scene==='kite-river'?'river/splash':null]){
   if(!action||!adapter.interact(action))continue;gestures++;
   for(let i=0;i<12;i++)adapter.animate(state,.05);
  }
  state.diorama.group.updateMatrixWorld(true);
  state.diorama.group.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite),`${scene} ${o.name}`);if(o.geometry?.attributes.position)assert(o.geometry.attributes.position.array.every(Number.isFinite));});
  assert(state.heroes.length>0);for(const hero of state.heroes){assert(hero.bones.Head);assert(hero.bones.Head.matrixWorld.elements.every(Number.isFinite));}
  adapter.release(state);assert.equal(state.pending.length,0);
 }
 console.log(`PASS ${theme}: actual hero GLB, 5 proxy clips, retargeting, finite animation transforms, independent rig clones.`);
 console.log(`PASS ${theme}: 1x/7.5x normalized wave/jump/${motion}/sleep trajectories, looping base and one-shot return.`);
 console.log(`PASS ${theme}: real rig in all 10 story spreads, ${gestures} key actions, finite bone/geometry transforms and disposal. Art/texture decode stubbed.`);
}
console.log(`PASS ${sources.length} assets: exact byte counts and SHA256. Texture decoding stubbed, no rendered verification.`);
