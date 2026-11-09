// Actual GLB geometry and source art dimensions. CPU projections only, not WebGL screenshots.
// Art decoding and limitations are documented in COMPANION_COMPARISON.md.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three/build/three.module.js';
import {loadCompanionHero,makeCompanionHero,COMPANION_MANIFESTS} from '../companion-assets.js';
import {ReferenceCompanionScene,COMPANION_SCENE_IDS} from '../reference-companion-scenes.js';
import {captureCompanionBounds,fitCompanionFraming} from '../companion-framing.js';
const root=new URL('../',import.meta.url),realFetch=globalThis.fetch;
globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,data){Object.assign(this,{type},data);}};
globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
globalThis.document={createElement(){return {getContext(){return {createLinearGradient(){return {addColorStop(){}};},save(){},restore(){},clearRect(){},drawImage(){},beginPath(){},ellipse(){},fill(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
const R=globalThis.Request;globalThis.Request=class extends R{constructor(url,opt){super(typeof url==='string'&&!/^(blob:|https?:)/.test(url)?'http://local.test/'+url:url,opt);}};
globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;if(url.startsWith('blob:'))return realFetch(input);return new Response(await readFile(new URL(new URL(url).pathname.slice(1),root)));};
Math.random=()=>.5;
function layout(width,height){const mobile=width<=900,edge=width*.035+Math.min(560,Math.max(340,width*.37)),region=mobile?{x:0,y:60,width,height:Math.max(90,Math.max(height*.4,height*.56-120)-84)}:{x:edge+12,y:60,width:Math.max(width*.4,width-edge-12),height:height-210};const camera=new T.PerspectiveCamera(33,width/height,.1,150);camera.setViewOffset(width,height,Math.round(width/2-region.x-region.width/2),Math.round(height/2-region.y-region.height/2),width,height);return {camera,region,viewport:{width,height}};}
function assertInside(point,camera,viewport,message,region={x:0,y:0,width:viewport.width,height:viewport.height}){const p=point.clone().project(camera),x=(p.x+1)*viewport.width/2,y=(1-p.y)*viewport.height/2;assert(p.z>-1&&p.z<1,`${message}: depth ${p.z}`);assert(x>=region.x-1&&x<=region.x+region.width+1&&y>=region.y-1&&y<=region.y+region.height+1,`${message}: ${x},${y}`);}
let scenes=0,projections=0;
for(const theme of ['nia','fin']){
 const loaded=await loadCompanionHero({},theme),art={};for(const [id,r]of Object.entries(COMPANION_MANIFESTS[theme].art)){const texture=new T.Texture({width:r.width,height:r.height});texture.userData.hitTest=()=>true;art[id]={...r,texture};}
 const host={props:new T.Group(),canvas:{dataset:{}},room:{},motion:true,pointer:{},camera:new T.PerspectiveCamera(33,1,.1,150),render(){}};host.camera.position.set(5,15,18);
 const adapter=new ReferenceCompanionScene(host,{theme,manifest:{art},loadHero:async()=>loaded,makeHero:makeCompanionHero});await adapter.ensureLoaded();
 for(const [index,scene]of COMPANION_SCENE_IDS[theme].entries()){
  host.props=new T.Group();host.props.position.set(3.9,.234+.624*(1-index/11)+.012,0);const state=adapter.build({scene});assert.equal(state.diorama.progress,0);
  // An intentionally huge floor must not cause a very distant camera.
  const ground=new T.Group();ground.userData.companionGround=true;ground.add(new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshBasicMaterial({map:art[Object.keys(art)[0]].texture})));state.diorama.group.add(ground);
  const bounds=captureCompanionBounds(state);assert(bounds?.points.length>0);assert.equal(state.diorama.progress,0);assert(bounds.points.every(p=>p.length()<3),`${scene}: ground excluded, max ${Math.max(...bounds.points.map(p=>p.length()))}`);assert.equal(captureCompanionBounds(state),bounds,'stable per-page cache');
  for(const [width,height]of [[2026,1502],[1440,900],[390,844]]){
   const opts=layout(width,height),before=opts.camera.position.clone(),fit=fitCompanionFraming({...opts,state});assert(fit);assert(opts.camera.position.equals(before),'fit is camera-pure');assert(fit.position.toArray().every(Number.isFinite));assert(fit.target.toArray().every(Number.isFinite));
   opts.camera.position.copy(fit.position);opts.camera.lookAt(fit.target);opts.camera.updateMatrixWorld(true);state.diorama.group.updateWorldMatrix(true,true);
   for(const point of bounds.points)assertInside(point.clone().applyMatrix4(state.diorama.group.matrixWorld),opts.camera,opts.viewport,`${scene} ${width} cached`,opts.region);
   assert.equal(fitCompanionFraming({...opts,state}).distance,fit.distance,'no frame-to-frame drift');
   const zoom=fitCompanionFraming({...opts,state,lookCloser:true});assert(Math.abs(zoom.distance-fit.distance*.62)<1e-9);projections++;
  }
  ground.removeFromParent();adapter.fold(state,1);for(let i=0;i<28;i++)adapter.animate(state,.05);host.props.updateMatrixWorld(true);
  // Idle motion does not invalidate or recompute camera bounds. Primary actors must remain on screen.
  for(const [width,height]of [[2026,1502],[1440,900],[390,844]]){const opts=layout(width,height),fit=fitCompanionFraming({...opts,state});opts.camera.position.copy(fit.position);opts.camera.lookAt(fit.target);opts.camera.updateMatrixWorld(true);state.diorama.group.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const a=o.geometry.attributes.position;for(let i=0;i<a.count;i+=13){const p=new T.Vector3();o.getVertexPosition(i,p);p.applyMatrix4(o.matrixWorld);assertInside(p,opts.camera,opts.viewport,`${scene} ${width} idle hero`);}});}
  assert.equal(state.companionBounds,bounds);adapter.release(state);scenes++;
 }
}
assert.equal(fitCompanionFraming({camera:new T.PerspectiveCamera(),state:null,viewport:{width:0,height:0},region:{width:0,height:0}}),null);
console.log(`PASS: ${scenes} actual-rig spreads × 3 viewports = ${projections} safe-region projections; folded capture restored; ground excluded; stable idle cache; hero idle in frame; zoom; invalid inputs. Texture decode stubbed; CPU projection, not WebGL visual QA.`);
