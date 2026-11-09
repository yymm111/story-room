// Structural/runtime verification, NOT a rendered visual or original-model comparison.
// Run from any directory: node tests/reference-companion-scenes.test.mjs
import assert from 'node:assert/strict';
import * as T from '../vendor/three/build/three.module.js';
import {ReferenceCompanionScene,COMPANION_ART_IDS,COMPANION_SCENE_IDS} from '../reference-companion-scenes.js';
globalThis.document={createElement(){return {width:128,height:128,getContext(){return {createLinearGradient(){return {addColorStop(){}};},save(){},restore(){},clearRect(){},drawImage(){},beginPath(){},ellipse(){},fill(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
const hero=()=>{const group=new T.Group(),head=new T.Group();head.position.y=.7;group.add(head);const api={group,head,state:{},setPose(){},blink(){},wave(){},jump(){},look(){},play(){},hold(){},paw(){return group.localToWorld(new T.Vector3(.1,.5,.1));},lookAt(){},update(){}};return api;};
let built=0,actions=0,drags=0;const collected=[];
const stage={props:new T.Group(),canvas:{dataset:{}},motion:true,time:0,room:{},pointer:{},camera:new T.PerspectiveCamera(),onSceneSound(){},onInteract(){},onCollect(key){collected.push(key);},render(){}};
function verifyFinite(s){s.diorama.group.updateMatrixWorld(true);s.diorama.group.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite),o.name+' matrix');if(o.geometry?.attributes.position)assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite),o.name+' geometry');});}
for(const theme of ['nia','fin']){
  const art=Object.fromEntries(COMPANION_ART_IDS[theme].map(id=>{const texture=new T.Texture({width:512,height:512});texture.userData.hitTest=()=>true;return[id,{texture,width:512,height:512,cutout:true}];}));
  const adapter=new ReferenceCompanionScene(stage,{theme,manifest:{art},loadHero:async()=>({}),makeHero:hero});
  await adapter.ensureLoaded();assert(adapter.loaded);
  for(const scene of [...COMPANION_SCENE_IDS[theme],'end']){
    stage.props=new T.Group();stage.props.position.set(3.9,1,0);const s=adapter.build({scene});built++;adapter.fold(s,1);assert.equal(s.diorama.progress,1);
    for(let i=0;i<20;i++)adapter.animate(s,.016);verifyFinite(s);
    const list=adapter.actions({includeVerbs:true});assert(list.length>0);
    for(const action of list){const count=collected.length;assert.equal(adapter.interact(action.key),true,`${theme}/${scene}/${action.key}`);assert.equal(collected.length,count+1);actions++;adapter.animate(s,.016);}
    for(const entry of Object.values(s.diorama.objects)){
      if(!entry.onDrag)continue;const mesh=new T.Mesh();mesh.userData.action=entry.name;const drag=adapter.dragEntry(mesh);assert(drag);
      drag.onDrag(new T.Vector3(4,3,0));drag.onDrag(new T.Vector3(4.1,3.1,0));drag.onDragEnd();drags++;
    }
    const collectedBeforeNarration=collected.length;const narrationToken=adapter.resetNarration();for(let progress=0;progress<=1.001;progress+=.025){adapter.narrate(progress,narrationToken);adapter.animate(s,.05);}assert.equal(collected.length,collectedBeforeNarration,'source verbs never collect during narration');
    for(let i=0;i<80;i++)adapter.animate(s,.05);verifyFinite(s);
    stage.motion=false;adapter.settleStatic(s);verifyFinite(s);stage.motion=true;
    adapter.fold(s,0);adapter.fold(s,1);
    const stale=adapter.dragEntry(Object.values(s.diorama.objects).find(e=>e.onDrag)?.object);adapter.release(s);assert.equal(s.pending.length,0);assert.equal(adapter.interact(list[0].key),false);
    const time=s.elapsed;adapter.animate(s,1);assert.equal(s.elapsed,time);stale?.onDrag(new T.Vector3());stale?.onDragEnd();
  }
  const bad=new ReferenceCompanionScene(stage,{theme,manifest:{art:{}},makeHero:hero});await assert.rejects(bad.ensureLoaded(),/missing art/);assert.equal(bad.ready,null);
  const retry=new ReferenceCompanionScene(stage,{theme,manifest:{art},loadHero:async()=>{throw Error('hero load failed');},makeHero:hero});await assert.rejects(retry.ensureLoaded(),/hero load failed/);assert.equal(retry.loaded,false);assert.equal(retry.ready,null);
}
console.log(`PASS: ${built} reference spreads (20 story + 2 endings), ${actions} actions, ${drags} drags, original builder hooks, scene timers, fold, disposal, missing-art/load-failure propagation and finite transforms. Stub art/hero only; no visual verification.`);
