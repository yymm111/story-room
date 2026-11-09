// Behavioral verification only: no original story text/audio or rendered-image assertions.
import assert from 'node:assert/strict';
import * as T from '../vendor/three/build/three.module.js';
import {COMPANION_CUES} from '../companion-choreography.js';
import {ReferenceCompanionScene} from '../reference-companion-scenes.js';
import {StorybookStage} from '../storybook-3d.js';
assert.equal(Object.keys(COMPANION_CUES).length,20);
let verbs=0,cues=0;
for(const [scene,list]of Object.entries(COMPANION_CUES)){
 const stage={paperState:null,motion:true,busy:false,props:new T.Group(),onCollect(){throw Error('Narration must not collect');},clearStoryFocus(){},focusStoryObject(){},canvas:{dataset:{}},render(){}};
 const adapter=new ReferenceCompanionScene(stage,{theme:scene.startsWith('kite')?'nia':'fin',manifest:{},makeHero(){}});
 const hits=[],hover=[],objects={};
 for(const cue of list){assert.deepEqual(Object.keys(cue).sort(),['action','progress','target']);assert(cue.progress>=0&&cue.progress<=1);objects[cue.target]||={object:new T.Group(),actions:{},onHover:on=>hover.push(on)};if(cue.action)objects[cue.target].actions[cue.action]=()=>hits.push(cue.target+'/'+cue.action);}
 const s={adapter,scene,elapsed:0,pending:[],heroes:[],lights:[],diorama:{objects,update(){},bursts:[]}};stage.paperState=s;
 const token=adapter.resetNarration();for(let p=0;p<=1.001;p+=.01)adapter.narrate(p,token);adapter.narrate(1,token);
 const expected=list.filter(c=>c.action).length;assert.equal(hits.length,expected,scene);verbs+=expected;cues+=list.length;
 adapter.narrate(1,token);adapter.narrate(.2,token);assert.equal(hits.length,expected,'once per crossing and no backward replay');
 assert.equal(s.pending.length,0);adapter.animate(s,.05);assert(hover.includes(true));
 const replay=adapter.resetNarration(.5);hits.length=0;adapter.narrate(1,token);assert.equal(hits.length,0,'stale session token');adapter.narrate(1,replay);assert.equal(hits.length,list.filter(c=>c.progress>=.5&&c.action).length,'seek skips earlier cues');
 const silent=adapter.resetNarration();stage.motion=false;hits.length=0;adapter.narrate(1,silent);assert.equal(hits.length,0);stage.motion=true;
 adapter.stopNarration();adapter.narrate(1,silent);assert.equal(hits.length,0,'stopped narration');
 s.pending.push({at:0,narration:s.narrationGeneration-1,fn:()=>{throw Error('stale queued action');}});adapter.animate(s,.05);
}
assert(COMPANION_CUES['kite-door'].every(c=>!['away','gust','oh'].includes(c.action)),'departure must not release the kite');
assert(COMPANION_CUES['kite-river'].every(c=>!['hop','jump'].includes(c.action)),'bridge scene walks, not jumps');
assert.equal(COMPANION_CUES['kite-oak'].at(-1).action,'catch');
assert.equal(COMPANION_CUES['kite-home'].at(-1).action,'sleep');
for(const [scene,list] of Object.entries(COMPANION_CUES).filter(([scene])=>scene.startsWith('sea-'))){assert(list.every(c=>!['spin','ride','brave','small','breath'].includes(c.action)),scene+' must not trigger unrelated acrobatics');}
assert(COMPANION_CUES['sea-ship'].every(c=>!['open','glow'].includes(c.action)),'ship narration does not open the chest or take the pearl');
assert.equal(COMPANION_CUES['sea-home'].at(-1).action,'sleep');
// Exact source focus constants, transformed into local 7.5x book units.
const owner={},camera=new T.PerspectiveCamera();camera.position.set(4,12,18);
const stage={motion:true,busy:false,view:'reader',lookCloser:false,paperState:owner,time:1,camera,host:{clientWidth:1200,clientHeight:800}};
const focus=StorybookStage.prototype.focusStoryObject,entry={radius:.25,anchor:()=>new T.Vector3(4,3,0)};
assert.equal(focus.call(stage,entry,7.5,owner),true);assert.equal(stage.storyFocus.until,4);assert.equal(stage.storyFocus.ease,1.15);
assert(Math.abs(stage.storyFocus.pos.distanceTo(stage.storyFocus.target)-.25*7.5*5*1.35)<1e-9);
stage.time=2;assert.equal(focus.call(stage,entry,7.5,owner),false);stage.time=2.5;assert.equal(focus.call(stage,entry,7.5,owner),true);
assert.deepEqual(camera.position.toArray(),[4,12,18],'focus sets a goal, never snaps camera');stage.motion=false;stage.time=5;assert.equal(focus.call(stage,entry,7.5,owner),false);
StorybookStage.prototype.clearStoryFocus.call(stage,owner);assert.equal(stage.storyFocus,null);
console.log(`PASS: ${cues} narration cues, ${verbs} verbs; no source text; once-only/seek/stale/reduced-motion guards; no narration collectibles; camera throttle/hold/ease/scale and no snap.`);
