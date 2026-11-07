import * as T from './vendor/three/build/three.module.js';
import {prepareAsset} from './asset-prep.js?v=otto9';
import {makeOttoModel} from './reference-hero.js?v=otto9';
import builders from './reference-otto-spreads.js?v=otto9';
import {makeOttoMaterial} from './otto-material.js?v=otto9';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {clone,retargetClip} from './vendor/three/examples/jsm/utils/SkeletonUtils.js';

function attachAlphaTest(texture){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0,128,128);const pixels=ctx.getImageData(0,0,128,128).data;
  texture.userData.hitTest=uv=>pixels[(Math.min(127,Math.max(0,Math.floor((1-uv.y)*128)))*128+Math.min(127,Math.max(0,Math.floor(uv.x*128))))*4+3]>90;
}

const pointerNdc=new T.Vector2(),pointerRay=new T.Raycaster(),pointerPlane=new T.Plane(new T.Vector3(0,0,1),0),pointerPoint=new T.Vector3();

// Original reference assets and character rig, with locally authored page choreography and fallback geometry.
export class OttoScene {
  constructor(stage){
    this.stage=stage;this.art=stage.paperArt.art;
    this.images=new Map();this.usesSceneSound=true;this.ready=null;
  }
  ensureLoaded(){return this.ready||(this.ready=this.loadReference().catch(error=>console.warn('Otto reference assets could not load',error)));}
  async loadReference(){
    const loader=new T.TextureLoader(),names=['bedroom-front','bedroom-wall','bedroom-wall-moon','cat','cloud-a','cloud-b','cloud-sleepy','clouds-sky','dark-cloud','moon-face','owl-forest','owl-tree','owl','rooftops-sky','stars-sky'];
    await Promise.all(names.map(async name=>{const texture=await loader.loadAsync('assets/otto-reference/'+name+'.webp');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=this.stage.renderer.capabilities.getMaxAnisotropy();texture.userData.shared=true;attachAlphaTest(texture);this.images.set(name,texture);}));
    this.townTexture=await loader.loadAsync('assets/otto-reference/town-strip.webp');this.townTexture.colorSpace=T.SRGBColorSpace;this.townTexture.anisotropy=this.stage.renderer.capabilities.getMaxAnisotropy();this.townTexture.userData.shared=true;attachAlphaTest(this.townTexture);
    const gltf=new GLTFLoader();this.hero=await gltf.loadAsync('assets/otto-reference/otto.glb');await this.refineHero();this.hero.scene.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;if(o.isMesh){o.material=[].concat(o.material).map(source=>makeOttoMaterial(source,this.stage.renderer));if(o.material.length===1)o.material=o.material[0];}});
    this.clips={idle:this.hero.animations[0]};const scratch=clone(this.hero.scene);let target;scratch.traverse(o=>{if(o.isSkinnedMesh)target=o;});
    await Promise.all(['hang','wave','look','doze','jump'].map(async name=>{const proxy=await gltf.loadAsync('assets/otto-reference/'+name+'.glb');let source;proxy.scene.traverse(o=>{if(o.isSkinnedMesh)source=o;});
      const hipHeight=mesh=>{const i=mesh.skeleton.bones.findIndex(b=>b.name==='Hips');return i<0?1:Math.abs(new T.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert()).y)||1;};
      const localOffsets={};target.skeleton.bones.forEach((bone,i)=>{const j=source.skeleton.bones.findIndex(b=>b.name===bone.name);if(j<0)return;const a=new T.Quaternion(),b=new T.Quaternion(),v=new T.Vector3(),scale=new T.Vector3();target.skeleton.boneInverses[i].clone().invert().decompose(v,a,scale);source.skeleton.boneInverses[j].clone().invert().decompose(v,b,scale);localOffsets[bone.name]=new T.Matrix4().makeRotationFromQuaternion(b.invert().multiply(a));});
      const clip=retargetClip(target,source,proxy.animations[0],{hip:'Hips',scale:hipHeight(target)/hipHeight(source),getBoneName:b=>b.name,preserveBonePositions:true,useFirstFramePosition:false,fps:30,localOffsets});
      clip.tracks.forEach(track=>track.name=track.name.replace(/^\.bones\[([^\]]+)\]/,'$1'));clip.name=name;this.clips[name]=clip;
      proxy.scene.traverse(o=>{o.geometry?.dispose();for(const m of o.material?[].concat(o.material):[]){m.map?.dispose();m.dispose();}});
    }));
    this.alignFacing(scratch);this.heroBounds=new T.Box3().setFromObject(this.hero.scene);this.stage.render();
  }
  async refineHero(){
    try{const [meta,{buffer}]=await Promise.all([fetch('assets/otto-reference/otto-smooth.json').then(r=>r.json()),prepareAsset('environment',{url:new URL('assets/otto-reference/otto-smooth.bin.gz',location.href).href})]);const types={Float32Array,Uint16Array,Uint32Array};this.hero.scene.traverse(o=>{if(!o.isSkinnedMesh)return;const geo=new T.BufferGeometry();for(const [name,a]of Object.entries(meta.attributes))geo.setAttribute(name,new T.BufferAttribute(new types[a.type](buffer,a.offset,a.length),a.itemSize));const i=meta.index;geo.setIndex(new T.BufferAttribute(new types[i.type](buffer,i.offset,i.length),1));geo.computeBoundingSphere();geo.userData.shared=true;o.geometry.dispose();o.geometry=geo;});this.stage.canvas.dataset.heroSurface='subdivided-163188-triangles';}catch(error){console.warn('Using original hero surface',error);}
  }
  alignFacing(root){
    root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();});root.updateMatrixWorld(true);
    const left=root.getObjectByName('LeftShoulder'),right=root.getObjectByName('RightShoulder'),hips=root.getObjectByName('Hips');if(!left||!right||!hips)return;
    const yaw=()=>{root.updateMatrixWorld(true);const v=left.getWorldPosition(new T.Vector3()).sub(right.getWorldPosition(new T.Vector3()));return Math.atan2(-v.z,v.x);};
    const reference=yaw(),parent=hips.parent.getWorldQuaternion(new T.Quaternion()),inverse=parent.clone().invert(),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    for(const [name,clip]of Object.entries(this.clips)){
      const track=clip.tracks.find(t=>/Hips\.quaternion$/.test(t.name));if(!track)continue;
      const times=name==='idle'?Array.from(track.times):Array.from({length:10},(_,i)=>clip.duration*i/10),mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip);action.play();let previous=0;const angles=times.map(t=>{mixer.update(t-previous);previous=t;return yaw();});mixer.stopAllAction();mixer.uncacheRoot(root);
      const mean=Math.atan2(angles.reduce((a,b)=>a+Math.sin(b),0),angles.reduce((a,b)=>a+Math.cos(b),0)),offset=wrap(reference-mean);
      for(let i=0;i<track.times.length;i++){const angle=offset+(name==='idle'?wrap(angles[i]-mean)*-.7:0),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),fix=inverse.clone().multiply(q).multiply(parent),value=new T.Quaternion().fromArray(track.values,i*4).premultiply(fix);value.toArray(track.values,i*4);}
    }
    root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();});
  }
  makeHero(s){
    const api=makeOttoModel(this.hero,this.clips);api.group.children[0].scale.multiplyScalar(1.08);s.heroes.push(api);return api;
  }
  build(page){
    this.hovered?.onHover?.(false);this.hovered=null;
    const sceneNames={window:'bedroom-dark',balloon:'bedroom-balloon',rooftops:'rooftops',clouds:'clouds',owl:'owl-tree',stars:'star-path',shy:'behind-cloud',glow:'moon-glow',homeward:'descent',goodnight:'bedroom-moonlit'};
    const s={kind:'otto-'+page.scene,scene:page.scene,fold:0,elapsed:0,heroes:[],messages:{},lights:[]};
    const art=Object.fromEntries([...this.images].map(([id,texture])=>[id,{texture,width:texture.image.width,height:texture.image.height,cutout:!id.includes('sky')&&!id.includes('wall')&&id!=='owl-forest'}]));
    const sound=Object.fromEntries(['chime','whoosh','pop','click','sparkle','puff','glow','hoot','yawn','meow','lampSwitch'].map(name=>[name,(...args)=>{if(!s.disposed&&this.stage.paperState===s)this.stage.onSceneSound(name,args);} ]));
    const ctx={art,textures:{town:this.townTexture,paperNormal:this.stage.room.surfaceMaps?.paperNormal},sound,makeOtto:()=>this.makeHero(s),onMagic:name=>{if(this.stage.paperState===s&&!s.disposed)this.stage.onInteract({moon:'云朵让开了，月亮露出了微笑。',path:'七颗星连成了一条发光的小路。',glow:'月亮把温柔的光送给你。',sleep:'灯熄了，月亮守着奥托慢慢入睡。'}[name]||'夜空在回应你。',{silent:true});}};
    const d=builders[sceneNames[page.scene]||'bedroom-dark'](ctx);s.diorama=d;
    d.group.scale.setScalar(7.5);this.stage.props.add(d.group);this.stage.paperState=s;
    const fill=new T.PointLight('#ffe7cc',13,14,2);fill.position.set(-2,5.8,5.4);this.stage.props.add(fill);
    const rim=new T.PointLight('#b7d2ff',10,12,2);rim.position.set(3.8,5,-3.5);this.stage.props.add(rim);
    d.group.traverse(o=>{
      if(o.isPointLight){o.distance*=7.5;s.lights.push({light:o,factor:Math.pow(7.5,o.decay)*.09});o.intensity*=Math.pow(7.5,o.decay)*.09;}
      if(o.isPoints){o.material.size*=7.5;o.raycast=()=>{};}
      if(o.isSprite)o.raycast=()=>{};
      if(o.userData.owner){const name=o.userData.owner;o.userData.action=name;o.userData.label=this.label(name)+' · 点一点';}
    });
    for(const [name,entry]of Object.entries(d.objects)){
      s.messages[name]=this.message(name);
      if(entry.label==='Otto'){
        // Keep pointer picking inexpensive even though Otto's visible surface is subdivided.
        entry.object.updateWorldMatrix(true,true);const inverse=entry.object.matrixWorld.clone().invert();
        const box=new T.Box3().setFromObject(entry.object).applyMatrix4(inverse),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
        entry.object.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});
        const hull=new T.Mesh(new T.BoxGeometry(size.x,size.y,size.z),new T.MeshBasicMaterial({visible:false}));hull.position.copy(center);hull.userData.action=name;hull.userData.label='奥托 · 挥手、眨眼，跟着你看';entry.object.add(hull);
      }
    }
    s.clouds=Object.values(d.objects).filter(e=>/cloud/.test(e.label));s.moon=d.objects.moon?{visible:true}:null;
    s.starPath=Object.values(d.objects).filter(e=>/^star\d+$/.test(e.name));s.owl=d.objects.owl;s.cat=d.objects.cat;
    for(const name of ['otto','balloon','cloud','stars','moon'])s.messages[name] ||= this.message(name);
    this.stage.props.userData.release=()=>{s.disposed=true;for(const hero of s.heroes){hero.mixer.stopAllAction();hero.mixer.uncacheRoot(hero.group.children[0]);}};
    this.stage.canvas.dataset.content='otto-reference-spreads';this.stage.canvas.dataset.heroMaterial='plush-fibers-glossy-eyes';
    this.fold(s,0);return s;
  }
  label(name){return {otto:'奥托',balloon:'红气球',cloud:'云朵',clouds:'云朵',cloud2:'云朵',sleepy:'瞌睡云',moon:'月亮',stars:'星星',path:'星星小路',owl:'猫头鹰',eyes:'猫头鹰的眼睛',cat:'小猫',tree:'大树',sky:'夜空',wall:'卧室墙',window:'小窗',lamp:'床头灯',bed:'小床',boat:'小帆船',blocks:'积木',bunting:'星星挂旗',shelf:'小架子',nightstand:'床头柜'}[name]||(/^star\d+$/.test(name)?'第 '+(Number(name.slice(4))+1)+' 颗星':name);}
  message(name){return {otto:'奥托挥挥手：你好呀，一起去找月亮吧。',balloon:'抓稳啦，让晚风轻轻托住你。',cloud:'云朵慢慢让开了一条路。',moon:'月亮把温柔的光送给认真听故事的你。',stars:'一颗、两颗……星星在回应你。',owl:'猫头鹰说：安静地陪一会儿，也是一种勇敢。',cat:'喵，月亮也许就在更高的云朵后面。',lamp:'轻点床头灯，让卧室亮起来或安静地入睡。',window:'小窗里的光，照亮了夜晚。'}[name]||this.label(name)+'轻轻动了动，回应你的招呼。';}
  entry(object){let node=object;while(node){if(node.userData.action)return this.stage.paperState?.diorama?.objects[node.userData.action];node=node.parent;}return null;}
  hover(entry){const s=this.stage.paperState;if(!s?.diorama||s.kind?.slice(0,5)!=='otto-')return;if(this.hovered===entry)return;this.hovered?.onHover?.(false);this.hovered=entry;entry?.onHover?.(true);}
  fold(s,p){if(!s?.diorama)return;s.fold=T.MathUtils.clamp(p,0,1);s.diorama.setProgress(s.fold);this.animate(s,0,this.stage.time);}
  animate(s,dt,time){
    if(!s?.diorama||s.disposed)return;
    const d=s.diorama;s.elapsed+=dt;
    pointerNdc.set(this.stage.pointer.x*2,-this.stage.pointer.y*2);pointerRay.setFromCamera(pointerNdc,this.stage.camera);
    pointerPlane.constant=-this.stage.props.position.z;const point=pointerRay.ray.intersectPlane(pointerPlane,pointerPoint);if(this.stage.pointer.over&&point)d.pointer.copy(point);else d.pointer.copy(this.stage.camera.position);
    for(const {light,factor}of s.lights)light.intensity/=factor;
    d.update(dt,s.elapsed);
    for(const {light,factor}of s.lights)light.intensity*=factor;
    const objectCount=String(Object.keys(d.objects).length);if(this.stage.canvas.dataset.storyObjects!==objectCount)this.stage.canvas.dataset.storyObjects=objectCount;
  }
  settleStatic(s){
    if(!s?.diorama)return;
    // Advance the existing springs in bounded steps, then draw the result once.
    for(let i=0;i<24;i++)this.animate(s,.05,this.stage.time);
    for(const burst of s.diorama.bursts){burst.life.fill(0);for(let i=0;i<burst.count;i++)burst.positions[i*3+1]=-100;burst.points.geometry.attributes.position.needsUpdate=true;}
    for(const hero of s.heroes){hero.state.blink=0;hero.state.nextBlink=2.5;hero.update(0,s.elapsed);hero.head?.scale.set(1,1,1);}
  }
  narrate(progress){
    const s=this.stage.paperState;if(!this.stage.motion||this.stage.busy||!s?.diorama||s.disposed)return;
    const d=s.diorama;s.beats ||= new Set();
    const beat=(id,at,fn)=>{if(progress>=at&&!s.beats.has(id)){s.beats.add(id);fn();}};
    if(s.scene==='balloon'){
      const level=Math.min(4,Math.floor(progress*4.5));if(level>(d.flightState?.stage||0))d.goStage?.(level);
    }
    if(s.scene==='clouds'){beat('puff',.3,()=>d.objects.cloud?.actions?.puff?.());beat('yawn',.66,()=>d.objects.sleepy?.actions?.yawn?.());}
    if(s.scene==='owl')beat('hoot',.35,()=>d.objects.owl?.onTap?.());
    if(s.scene==='stars'&&d.starState){const wanted=Math.min(7,1+Math.floor(progress*6.5));for(let i=0;i<7&&d.starState.lit<wanted;i++){const before=d.starState.lit;d.objects['star'+before]?.onTap?.();if(d.starState.lit===before)break;}}
    if(s.scene==='shy')beat('reveal',.65,()=>d.objects.cloud?.actions?.behind?.());
    if(s.scene==='glow')beat('glow',.3,()=>d.objects.moon?.actions?.glow?.());
    if(s.scene==='goodnight')beat('sleep',.75,()=>d.onLamp?.(false));
  }
  interact(action,time,{point}={}){
    const s=this.stage.paperState;if(!s?.diorama||s.disposed)return;const d=s.diorama;this.stage.onCollect?.(action);
    if(action==='stars'&&d.starState){const star=d.objects['star'+Math.min(6,d.starState.lit)];star?.onTap?.();if(!this.stage.motion){this.settleStatic(s);this.stage.render();}return;}
    const entry=d.objects[action]||(/cloud/.test(action)?d.objects.cloud||d.objects.sleepy||d.objects.clouds:null);if(!entry)return;
    if(action==='cloud'&&entry.actions?.behind)entry.actions.behind();
    else if(action==='moon'&&entry.actions?.glow)entry.actions.glow();
    else if(action==='balloon'&&!point&&s.scene==='balloon')d.objects.otto.actions?.up?.();
    else entry.onTap?.();
    if(!this.stage.motion){this.settleStatic(s);this.stage.render();}
  }
}
