// Numerical regression only. Art/hero are stubs; no WebGL rendering or visual QA.
import assert from 'node:assert/strict';
import * as T from '../vendor/three/build/three.module.js';
import {Diorama} from '../companion-diorama.js';
import {Diorama as OriginalDiorama} from '../reference-diorama.js?v=otto9';
import {ReferenceCompanionScene,COMPANION_ART_IDS} from '../reference-companion-scenes.js';

globalThis.document={createElement(){return {getContext(){return {createLinearGradient(){return {addColorStop(){}};},save(){},restore(){},clearRect(){},drawImage(){},beginPath(){},ellipse(){},fill(){},createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
close(new OriginalDiorama({}).burst(undefined,undefined,.024).points.material.size,.024);
close(new Diorama({}).burst(undefined,undefined,.024).points.material.size,.024);
for(const scale of [1,2.5,7.5]){
 const d=new Diorama({displayScale:scale});
 const initial=d.burst(undefined,undefined,.024);d.update(.016,.016);
 const later=d.burst(undefined,undefined,.024);
 close(initial.points.material.size,.024*scale);close(later.points.material.size,.024*scale);
 assert.equal(d.bursts.length,2);d.update(.016,.032);
 close(initial.points.material.size,.024*scale);close(later.points.material.size,.024*scale);
}

const hero=()=>{const group=new T.Group();return {group,state:{},setPose(){},blink(){},wave(){},jump(){},look(){},play(){},hold(){},paw(){return group.getWorldPosition(new T.Vector3());},lookAt(){},update(){}};};
function stage(){return {props:new T.Group(),canvas:{dataset:{}},motion:true,room:{},render(){}};}
function artFor(theme){return Object.fromEntries(COMPANION_ART_IDS[theme].map(id=>{const texture=new T.Texture({width:512,height:512});texture.userData.hitTest=()=>true;return [id,{texture,width:512,height:512,cutout:true}];}));}

for(const scale of [1,2.5,7.5]){
 const host=stage(),adapter=new ReferenceCompanionScene(host,{theme:'nia',scale,manifest:{art:artFor('nia')},makeHero:hero});
 await adapter.ensureLoaded();const state=adapter.build({scene:'kite-river'});adapter.fold(state,1);
 assert.equal(state.diorama.bursts.length,0);
 assert(adapter.interact('wind/gust'));const leaves=state.diorama.bursts.at(-1);
 close(leaves.points.material.size,.024*scale);assert(leaves.life.some(value=>value>0));
 assert(adapter.interact('river/splash'));const drops=state.diorama.bursts.at(-1);
 close(drops.points.material.size,.028*scale);assert(drops.life.some(value=>value>0));
 adapter.animate(state,.05);
 close(leaves.points.material.size,.024*scale);close(drops.points.material.size,.028*scale);
 adapter.release(state);

 const seaHost=stage(),sea=new ReferenceCompanionScene(seaHost,{theme:'fin',scale,manifest:{art:artFor('fin')},makeHero:hero});
 await sea.ensureLoaded();const water=sea.build({scene:'sea-dive'});
 assert.equal(water.diorama.bursts.length,2);
 close(water.diorama.bursts[0].points.material.size,.022*scale);
 close(water.diorama.bursts[1].points.material.size,.026*scale);
 sea.fold(water,1);sea.animate(water,.05);
 close(water.diorama.bursts[0].points.material.size,.022*scale);
 sea.release(water);
}
console.log('PASS: companion particle sizes scale exactly once at 1x/2.5x/7.5x, including late wind leaves and river splashes; initial sea particles and original engine defaults unchanged. No visual QA.');
