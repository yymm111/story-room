// Run: node tests/companion-scenes.test.mjs (no browser or network needed).
import assert from 'node:assert/strict';
import * as T from '../vendor/three/build/three.module.js';
import {buildCompanionScene,interactCompanion,animateCompanion,settleCompanion,companionActions,companionDragEntry} from '../companion-scenes.js';
const collections=[];
const stage={props:new T.Group(),actors:{},canvas:{dataset:{}},motion:true,time:1,
  mat(c,o={}){return new T.MeshStandardMaterial({color:c,...o});},
  mesh(g,c,p,pos=[0,0,0],scale=[1,1,1]){const m=new T.Mesh(g,typeof c==='string'?this.mat(c):c);m.position.set(...pos);m.scale.set(...scale);p.add(m);return m;},
  sphere(p,c,pos,scale){return this.mesh(new T.SphereGeometry(1,12,8),c,p,pos,scale);},
  box(p,c,pos,size){return this.mesh(new T.BoxGeometry(...size),c,p,pos);},
  cylinder(p,c,pos,a,b,h,n){return this.mesh(new T.CylinderGeometry(a,b,h,n),c,p,pos);},
  backdrop(){},onInteract(){},onCollect(key){collections.push(key);},render(){}};
let actions=0;const names=new Set();
for(const theme of ['nia','fin'])for(let index=0;index<10;index++){
  stage.props=new T.Group();stage.props.position.set(3.9,1,0);
  const state=buildCompanionScene(stage,{theme},index);names.add(stage.props.name);
  assert.equal(interactCompanion(stage,'not-an-action'),false);
  for(const a of companionActions(stage)){
    const before=collections.length;assert.equal(interactCompanion(stage,a.key),true);
    assert.equal(collections.length,before+1,'collect exactly once for canvas/button shared path');
    assert.equal(collections.at(-1),a.key);actions++;
    animateCompanion(stage,stage.time+.7);
  }
  for(const t of [0,1,2,10,1000])animateCompanion(stage,t);
  stage.motion=false;settleCompanion(stage);
  const snapshot=()=>JSON.stringify(stage.props.toJSON().object);
  const still=snapshot();animateCompanion(stage,3000);assert.equal(snapshot(),still,'reduced motion is static');
  stage.props.updateMatrixWorld(true);
  stage.props.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));});
  if(theme==='nia'){
    for(const node of [state.kite,state.clouds[0]]){
      const hit=node.localToWorld(new T.Vector3(.1,.1,0));const entry=companionDragEntry(stage,node.children[0],hit);assert(entry);
      const start=node.position.clone();entry.onDrag(hit.clone().add(new T.Vector3(.3,.2,0)));assert(Math.abs(node.position.x-start.x-.3)<1e-6);assert(Math.abs(node.position.y-start.y-.2)<1e-6);
      entry.onDrag(hit.clone().add(new T.Vector3(100,100,0)));assert(node.position.x<=3&&node.position.y<=4.6);
      const before=collections.length;entry.onDragEnd();assert.equal(collections.length,before+1);const rest=node.position.clone();settleCompanion(stage);assert(node.userData.rest.equals(rest));
    }
    const entry=companionDragEntry(stage,state.kite,state.kite.getWorldPosition(new T.Vector3()));const old=state.kite.position.clone();stage.companionState=null;entry.onDrag(new T.Vector3());assert(state.kite.position.equals(old));entry.onDragEnd();stage.companionState=state;
  }else{
    const old=state.shellOpen;interactCompanion(stage,'fin-shell');assert.equal(state.shellOpen,!old);assert.equal(state.pearl.position.y,state.shellOpen?.48:.24);
    if(state.jellies.length){interactCompanion(stage,'fin-jelly');const mat=state.jellies[0].children[0].material;assert.equal(mat.emissiveIntensity,state.selected['fin-jelly']?.75:0);}
  }
  stage.motion=true;
}
assert.equal(names.size,20);
// A tree click moves the tree, not the rabbit; whale and crab have distinct responses.
for(const [theme,index,key]of [['nia',6,'nia-tree'],['fin',6,'fin-whale'],['fin',3,'fin-crab']]){
  stage.props=new T.Group();const state=buildCompanionScene(stage,{theme},index);stage.time=10;interactCompanion(stage,key);animateCompanion(stage,10.7);
  assert.equal(state.taps[theme==='nia'?'nia-hello':'fin-hello'],undefined);
  const target=state.targets[key][0];assert(!target.position.equals(target.userData.rest)||!target.rotation.equals(target.userData.restRotation));
}
console.log(`PASS: 20 scenes; ${actions} action instances; unique collection callbacks; object-specific feedback; drag offset, bounds and stale-state guards; reduced motion; finite geometry.`);
