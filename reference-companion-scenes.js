import {buildCompanionGround} from './companion-ground.js?v=companions4';
// Local host adapter for the public StoryComet Nia/Fin spread builders.
// Source: https://storycomet.app/books/{nia-runaway-kite,fin-glowing-sea}/scenes.js
// Uses the existing illustrated-card engine and injected, rigged character factory.
// No fallback primitive characters, story text, narration, or remote asset discovery.
import * as T from './vendor/three/build/three.module.js';
import niaBuilders from './reference-nia-spreads.js?v=companion-coordination3';
import finBuilders from './reference-fin-spreads.js?v=companion-coordination3';
import {COMPANION_CUES} from './companion-choreography.js?v=companion-coordination3';

export const COMPANION_ART_IDS={
  nia:['bedside','cloud-sleepy','clouds-sky','cottage-front','fence','fence-field','festival-sky','grass','hill','home-wall','kite-face','kite-blue','meadow-sky','oak-tree','oak-wood','river','riverbank','ducks','sheep','crow'],
  fin:['chest-open','coral-front','crab-rocks','deep-dark','fish-bright','fish-dark','kelp','kelp-forest','plankton','reef-bright','reef-dark','rocks','shallows','ship-sand','whale-blue','whale','octopus','crab','jellies'],
};
export const COMPANION_SCENE_IDS={
  nia:['kite-door','kite-meadow','kite-letgo','kite-river','kite-hill','kite-cloud','kite-oak','kite-festival','kite-choice','kite-home'],
  fin:['sea-reef','sea-dive','sea-kelp','sea-crab','sea-deep','sea-ship','sea-whale','sea-plankton','sea-light','sea-home'],
};
const LABELS={nia:'妮娅',fin:'芬恩',kite:'红风筝',kite2:'蓝风筝',kites:'风筝们',wind:'风',sky:'天空',grass:'草地',cottage:'小屋',door:'小门',fence:'栅栏',bow:'蝴蝶结',river:'小河',stones:'石头',ducks:'鸭子',hill:'山丘',sheep:'小羊',cloud:'云朵',oak:'橡树',crow:'乌鸦',wall:'房间',window:'窗户',bed:'小床',lamp:'小灯',reef:'珊瑚礁','reef-dark':'珊瑚礁',sea:'海水',bubbles:'气泡',corals:'珊瑚',fish:'灯笼鱼',jar:'小瓶子',kelp:'海草',octopus:'章鱼',crab:'小蟹',rocks:'岩石',jellies:'水母',ship:'沉船',chest:'宝箱',pearl:'珍珠',whale:'鲸鱼',parade:'朋友们',sand:'沙地'};
const VERBS={wave:'挥挥手',hop:'跳一跳',jump:'跳起来',run:'跑起来',hold:'拉住',look:'看看',sleep:'睡觉',up:'往上',down:'往下',away:'放飞',tug:'拉一拉',dance:'跳舞',blow:'吹一吹',gust:'刮阵风',soft:'轻一点',shake:'摇一摇',push:'推一推',glow:'发光',shine:'照亮',dark:'变暗',bright:'变亮',sparkle:'闪一闪',swim:'游一游',dive:'潜下去',spin:'转一圈',give:'分享',giggle:'笑一笑',sway:'摇摆',follow:'跟上',cheer:'欢呼',open:'打开',sing:'唱歌',puff:'噗',tickle:'挠痒痒',sneeze:'打喷嚏',home:'回家',rattle:'晃一晃',climb:'向上爬',splash:'溅水花',catch:'接住',free:'放飞',sunset:'晚霞'};
const ALIASES={'nia-hello':'nia','nia-kite':'kite','nia-tree':'oak','nia-cloud':'cloud','fin-hello':'fin','fin-shell':'chest','fin-jelly':'jellies','fin-light':'jar','fin-whale':'whale','fin-crab':'crab','fin-fish':'fish'};
const COLLECTIONS={nia:'nia-hello',fin:'fin-hello',kite:'nia-kite',kite2:'nia-kite',kites:'nia-kite',oak:'nia-tree',cloud:'nia-cloud',chest:'fin-shell',pearl:'fin-shell',jellies:'fin-jelly',jar:'fin-light',whale:'fin-whale',crab:'fin-crab',fish:'fin-fish'};
const SOUNDS=['chime','whoosh','pop','click','sparkle','puff','glow','hoot','yawn','meow','lampSwitch','quack','baa','caw','whale','giggle','boing','snap'];
const HERO_METHODS=['setPose','blink','wave','jump','look','lookAt','update'];

function alphaHitTest(texture){
  if(texture.userData.hitTest||typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(texture.image,0,0,128,128);const pixels=context.getImageData(0,0,128,128).data;
  texture.userData.hitTest=uv=>!!uv&&pixels[(T.MathUtils.clamp(Math.floor((1-uv.y)*128),0,127)*128+T.MathUtils.clamp(Math.floor(uv.x*128),0,127))*4+3]>90;
}

export class ReferenceCompanionScene {
  constructor(stage,{theme,manifest,loadHero,makeHero,scale=7.5}={}){
    if(!COMPANION_SCENE_IDS[theme])throw new Error(`Unsupported companion theme: ${theme}`);
    this.stage=stage;this.theme=theme;this.manifest=manifest;this.loadHero=loadHero;this.makeHero=makeHero;this.scale=scale;
    this.builders=theme==='nia'?niaBuilders:finBuilders;this.images=new Map();this.usesSceneSound=true;this.ready=null;this.loaded=false;
    // Preserve the stage's unrelated cover-art accessor when it switches paperArt.
    this.art=stage.princeArt?.art||stage.paperArt?.art;
  }
  ensureLoaded(){
    if(!this.ready)this.ready=this.loadReference().catch(error=>{this.ready=null;this.loaded=false;throw error;});
    return this.ready;
  }
  async loadReference(){
    if(typeof this.makeHero!=='function')throw new Error(`${this.theme}: rigged hero factory is required`);
    const records=this.manifest?.art||this.manifest;
    const missing=COMPANION_ART_IDS[this.theme].filter(id=>!records?.[id]);
    if(missing.length)throw new Error(`${this.theme}: missing art manifest entries: ${missing.join(', ')}`);
    const loader=new T.TextureLoader();const loaded=[];
    try{
      // allSettled avoids disposing textures while a concurrent request is still installing one.
      const results=await Promise.allSettled(COMPANION_ART_IDS[this.theme].map(async id=>{
        const record=typeof records[id]==='string'?{url:records[id]}:records[id];
        const texture=record.texture||await loader.loadAsync(record.url);
        loaded.push({texture,owned:!record.texture});
        texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,this.stage.renderer?.capabilities.getMaxAnisotropy()||1);texture.userData.shared=true;
        if(record.cutout)alphaHitTest(texture);
        const width=record.width||texture.image?.width,height=record.height||texture.image?.height;
        if(!(width>0&&height>0))throw new Error(`${this.theme}: invalid art dimensions: ${id}`);
        return [id,{texture,width,height,cutout:!!record.cutout}];
      }));
      const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
      this.heroData=await this.loadHero?.();
      this.images=new Map(results.map(result=>result.value));this.loaded=true;return this;
    }catch(error){for(const {texture,owned}of loaded)if(owned)texture.dispose();throw error;}
  }
  owns(s=this.stage.paperState){return !!s&&!s.disposed&&s.adapter===this;}
  build(page){
    if(!this.loaded)throw new Error(`${this.theme}: await ensureLoaded() before build()`);
    const scene=page.scene||COMPANION_SCENE_IDS[this.theme][this.stage.page||0];
    const builder=this.builders[scene];if(!builder)throw new Error(`${this.theme}: unknown scene ${scene}`);
    this.hover(null);
    const s={adapter:this,kind:`${this.theme}-reference-${scene}`,scene,fold:0,elapsed:0,heroes:[],lights:[],pending:[],messages:{},disposed:false};
    const active=()=>!s.disposed&&this.stage.paperState===s;
    const sound=Object.fromEntries(SOUNDS.map(name=>[name,(...args)=>{if(active()&&!s.settling)this.stage.onSceneSound?.(name,args);} ]));
    const ctx={displayScale:this.scale,art:Object.fromEntries(this.images),textures:{paperNormal:this.stage.room?.surfaceMaps?.paperNormal},sound,
      schedule:(fn,ms)=>{const timer={at:s.elapsed+Math.max(0,Number(ms)||0)/1000,fn,narration:s.executingNarration??null};if(!s.disposed)s.pending.push(timer);return timer;},
      makeHero:()=>{const hero=this.makeHero(this.heroData);const methods=[...HERO_METHODS,...(this.theme==='nia'?['play','hold','paw']:[])];if(!hero?.group||methods.some(name=>typeof hero[name]!=='function'))throw new Error(`${this.theme}: incompatible hero API, requires group and ${methods.join('/')}`);s.heroes.push(hero);return hero;},
      onMagic:name=>{if(active()&&!s.settling)this.stage.onInteract?.(this.magicMessage(name),{silent:true});},
    };
    let d;try{d=builder(ctx);s.diorama=d;}catch(error){this.release(s);throw error;}
    s.ground=buildCompanionGround({theme:this.theme,scene:scene==='end'?(this.theme==='nia'?'kite-home':'sea-home'):scene,images:this.images,scale:this.scale});d.group.add(s.ground);
    d.group.scale.setScalar(this.scale);this.stage.props.add(d.group);this.stage.paperState=s;
    d.group.traverse(o=>{
      if(o.isPointLight){const factor=Math.pow(this.scale,o.decay)*.09;o.distance*=this.scale;o.intensity*=factor;s.lights.push({light:o,factor});}
      if(o.isPoints)o.raycast=()=>{};
      if(o.isSprite)o.raycast=()=>{};
      // Cached glow sprites and injected art/model maps survive page disposal.
      for(const material of o.material?[].concat(o.material):[])for(const value of Object.values(material))if(value?.isTexture&&!value.userData.companionGroundOwned)value.userData.shared=true;
      const name=o.userData.owner;if(name){o.userData.action=name;o.userData.label=this.label(name)+' · 点一点';}
    });
    for(const name of Object.keys(d.objects))s.messages[name]=this.message(name);
    // Host owns geometry/material disposal; release only adapter timers and rig state here.
    const oldRelease=this.stage.props.userData.release;
    this.stage.props.userData.release=()=>{oldRelease?.();this.release(s);};
    this.stage.canvas.dataset.content=`${this.theme}-reference-spreads`;
    this.stage.canvas.dataset.storyObjects=String(Object.keys(d.objects).length);
    this.fold(s,0);return s;
  }
  release(s){if(!s||s.disposed)return;this.stopNarration(s);s.disposed=true;s.pending.length=0;for(const hero of s.heroes){if(hero.dispose)hero.dispose();else{hero.mixer?.stopAllAction();if(hero.mixer)hero.mixer.uncacheRoot(hero.group.children[0]||hero.group);}}if(this.hovered&&Object.values(s.diorama?.objects||{}).includes(this.hovered))this.hovered=null;}
  fold(s,p){if(!s?.diorama||s.disposed)return;s.fold=T.MathUtils.clamp(p,0,1);s.diorama.setProgress(s.fold);s.ground?.userData.setProgress(s.fold);this.animate(s,0);}
  animate(s,dt){
    if(!this.owns(s))return;dt=T.MathUtils.clamp(dt||0,0,.05);s.elapsed+=dt;
    if(this.stage.camera){const pointer=this.stage.pointer||{};if(pointer.over){this.ray||=new T.Raycaster();this.ndc||=new T.Vector2();this.plane||=new T.Plane();this.point||=new T.Vector3();this.ndc.set((pointer.x||0)*2,-(pointer.y||0)*2);this.ray.setFromCamera(this.ndc,this.stage.camera);this.plane.setFromNormalAndCoplanarPoint(this.stage.camera.getWorldDirection(new T.Vector3()),this.stage.props.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,2,0)));const hit=this.ray.ray.intersectPlane(this.plane,this.point);if(hit)s.diorama.pointer.copy(hit);}else s.diorama.pointer.copy(this.stage.camera.position);}
    const due=s.pending.filter(timer=>timer.at<=s.elapsed);s.pending=s.pending.filter(timer=>timer.at>s.elapsed);for(const timer of due)if(!s.disposed&&(timer.narration===null||timer.narration===undefined||timer.narration===s.narrationGeneration)){const previous=s.executingNarration;s.executingNarration=timer.narration;try{timer.fn();}finally{s.executingNarration=previous;}}
    for(const [name,pulse]of s.narrationPulses||[]){if(s.elapsed>=pulse.until){if(this.hovered!==pulse.entry)pulse.entry.onHover?.(false);s.narrationPulses.delete(name);}}
    for(const {light,factor}of s.lights)light.intensity/=factor;
    s.diorama.update(dt,s.elapsed);
    for(const {light,factor}of s.lights)light.intensity*=factor;
  }
  settleStatic(s=this.stage.paperState){
    if(!this.owns(s))return;s.settling=true;
    try{for(let i=0;i<28;i++)this.animate(s,.05);for(const burst of s.diorama.bursts){burst.life.fill(0);for(let i=0;i<burst.count;i++)burst.positions[i*3+1]=-100;burst.points.geometry.attributes.position.needsUpdate=true;}for(const hero of s.heroes){if(hero.state){hero.state.blink=0;hero.state.nextBlink=Infinity;}hero.update(0,s.elapsed);}}
    finally{s.settling=false;}
  }
  entry(object){if(!this.owns())return null;let node=object;while(node){const name=node.userData.action||node.userData.owner;if(name&&this.stage.paperState.diorama.objects[name])return this.stage.paperState.diorama.objects[name];node=node.parent;}return null;}
  hover(entry){if(this.hovered===entry)return;this.hovered?.onHover?.(false);this.hovered=entry;entry?.onHover?.(true);if(!this.stage.motion&&this.owns()){this.settleStatic();this.stage.render();}}
  dragEntry(object){const entry=this.entry(object),s=this.stage.paperState;if(!entry?.onDrag)return null;let moved=false;return {companion:true,onDrag:point=>{if(!this.owns(s)||this.stage.paperState!==s)return;s.dragging=true;this.stage.clearStoryFocus?.();entry.onDrag(point);moved=true;if(!this.stage.motion){this.settleStatic(s);this.stage.render();}},onDragEnd:()=>{if(!this.owns(s)||this.stage.paperState!==s)return;s.dragging=false;entry.onDragEnd?.();if(moved)this.collect(entry.name);if(!this.stage.motion){this.settleStatic(s);this.stage.render();}}};}
  collect(name){this.stage.onCollect?.(COLLECTIONS[name]||`${this.theme}-${name}`);}
  interact(action,_time,options={}){
    const s=this.stage.paperState;if(!this.owns(s))return false;
    const [raw,encodedVerb]=String(action||'').split('/');const name=ALIASES[raw]||raw,verb=options.verb||encodedVerb,entry=s.diorama.objects[name];if(!entry)return false;
    const fn=verb?entry.actions?.[verb]:entry.onTap||Object.values(entry.actions||{})[0];if(typeof fn!=='function')return false;
    fn();this.collect(name);this.stage.canvas.dataset.lastInteraction=verb?`${name}/${verb}`:name;
    if(!this.stage.motion)this.settleStatic(s);this.stage.render();return true;
  }
  // Chinese prose is a local retelling: these crossings approximate original markup
  // positions by normalized characters. They are not source-audio word timestamps.
  resetNarration(progress=0){
    const s=this.stage.paperState;if(!this.owns(s))return null;this.stopNarration(s);
    const p=T.MathUtils.clamp(Number(progress)||0,0,1),cues=COMPANION_CUES[s.scene]||[];
    s.narrationCursor=cues.findIndex(cue=>cue.progress>=p);if(s.narrationCursor<0)s.narrationCursor=cues.length;
    s.narrationProgress=p-1e-7;s.narrationToken={state:s,generation:s.narrationGeneration};return s.narrationToken;
  }
  finishNarration(){const s=this.stage.paperState;if(this.owns(s))s.narrationToken=null;}
  stopNarration(s=this.stage.paperState){
    if(!s||s.adapter!==this)return;s.narrationGeneration=(s.narrationGeneration||0)+1;s.narrationToken=null;
    s.pending=s.pending.filter(timer=>timer.narration==null);
    for(const pulse of s.narrationPulses?.values()||[])if(this.hovered!==pulse.entry)pulse.entry.onHover?.(false);
    s.narrationPulses=new Map();this.stage.clearStoryFocus?.(s);
  }
  narrate(progress,token=this.stage.paperState?.narrationToken){
    const s=this.stage.paperState;if(!this.owns(s)||!token||token!==s.narrationToken||token.generation!==s.narrationGeneration)return;
    if(!this.stage.motion||this.stage.busy||s.dragging)return;
    const p=T.MathUtils.clamp(Number(progress)||0,0,1);if(p<s.narrationProgress)return;
    const cues=COMPANION_CUES[s.scene]||[];
    while(s.narrationCursor<cues.length&&cues[s.narrationCursor].progress<=p){
      const cue=cues[s.narrationCursor++],entry=s.diorama.objects[cue.target];if(!entry)continue;
      const previous=s.executingNarration;s.executingNarration=s.narrationGeneration;
      try{if(cue.action)entry.actions?.[cue.action]?.();}finally{s.executingNarration=previous;}
      if(entry.onHover){entry.onHover(true);s.narrationPulses.set(cue.target,{entry,until:s.elapsed+.6});}
      // Never use interact() here: narration is not a user collection action.
      // Keep the reading view stable while narration drives character gestures.
    }
    s.narrationProgress=p;
  }
  actions({includeVerbs=false}={}){const s=this.stage.paperState;if(!this.owns(s))return [];const out=[];for(const [name,entry]of Object.entries(s.diorama.objects)){if(entry.onTap||Object.keys(entry.actions||{}).length)out.push({key:name,action:name,label:this.label(name),message:this.message(name)});if(includeVerbs)for(const verb of Object.keys(entry.actions||{}))out.push({key:`${name}/${verb}`,action:name,verb,label:`${this.label(name)} · ${VERBS[verb]||verb}`,message:this.message(name)});}return out;}
  label(name){return LABELS[name]||(/^kite\d+$/.test(name)?'风筝':name);}
  message(name){return `${this.label(name)}回应了你的招呼。`;}
  magicMessage(name){return {clue:'小小的蝴蝶结亮了起来。',festival:'天空里的风筝一起跳起了舞。',achoo:'云朵打了个喷嚏，风筝又飞起来了。',free:'风筝乘着风，飞向更高的天空。',jar:'小瓶子里亮起了微光。',pearl:'宝箱里藏着一颗闪亮的珍珠。',song:'鲸鱼的歌声在海水里轻轻回荡。',laugh:'朋友们一起笑了，海底亮了起来。',sleep:'夜深了，故事里的朋友安静地睡着了。'}[name]||'故事里亮起了一点小小的惊喜。';}
}
