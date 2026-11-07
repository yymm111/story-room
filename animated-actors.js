import * as T from './vendor/three/build/three.module.js';
import {prepareAsset} from './asset-prep.js?v=otto9';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {refineSkinnedSurface,softFoxMaterial} from './skinned-surface.js?v=otto9';
import {clone} from './vendor/three/examples/jsm/utils/SkeletonUtils.js';

const faceGeometry=new T.SphereGeometry(1,24,16);faceGeometry.userData.shared=true;

export class AnimatedActors {
  constructor(stage){
    this.stage=stage;this.pending=[];this.instances=new Set();
    this.ready=Promise.all([new GLTFLoader().loadAsync('assets/models/fox.glb'),fetch('assets/models/fox-bounds.json').then(r=>r.ok?r.json():null).catch(()=>null)]).then(async([gltf,bounds])=>{
      if(bounds)this.bounds=new T.Box3(new T.Vector3(...bounds.min),new T.Vector3(...bounds.max));
      const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});for(const o of meshes){const old=o.geometry,input={};for(const [name,a]of Object.entries(old.attributes))input[name]={array:a.array,itemSize:a.itemSize};try{const attrs=await prepareAsset('fox',input);o.geometry=new T.BufferGeometry();for(const [name,a]of Object.entries(attrs))o.geometry.setAttribute(name,new T.BufferAttribute(a.array,a.itemSize));o.geometry.computeBoundingSphere();o.geometry.userData.shared=true;}catch{o.geometry=refineSkinnedSurface(old,2);}o.material=softFoxMaterial(o.material);old.dispose();}
      this.asset=gltf;gltf.scene.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;for(const m of o.material?[].concat(o.material):[]){m.userData.shared=true;if(m.map)m.map.userData.shared=true;}});
      for(const mount of this.pending.splice(0))mount();stage.render();
    }).catch(error=>console.warn('Animated fox could not load',error));
  }
  fox(parent,height=1.85){
    const mount=()=>{
      if(parent.userData.disposed||parent.userData.modelReady)return;
      parent.userData.modelReady=true;parent.userData.artReady=true;
      const paper=parent.children.find(n=>n.isMesh&&n.geometry?.type==='PlaneGeometry');if(paper){paper.visible=false;}
      const instance=clone(this.asset.scene),normalizer=new T.Group();normalizer.add(instance);
      const box=(this.bounds||(this.bounds=new T.Box3().setFromObject(this.asset.scene))).clone(),size=box.getSize(new T.Vector3()),scale=height/size.y;instance.position.y=-box.min.y;normalizer.scale.setScalar(scale);normalizer.rotation.y=-Math.PI/2+.30;parent.add(normalizer);
      instance.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.isSkinnedMesh&&o.geometry.boundingSphere){o.boundingSphere=o.geometry.boundingSphere.clone();o.boundingSphere.radius*=1.5;}}});
      const mixer=new T.AnimationMixer(instance),clip=this.asset.animations.find(a=>/survey/i.test(a.name))||this.asset.animations[0];if(clip)mixer.clipAction(clip).play();mixer.update(.01);
      const head=instance.getObjectByName('b_Head_05'),tail=instance.getObjectByName('b_Tail02_013');const eyes=head?detailFace(head):[];
      // Ray tests use a twelve-triangle hull, never the animated render mesh.
      instance.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});
      const hull=new T.Mesh(new T.BoxGeometry(size.x*1.08,size.y*1.12,size.z*1.12),new T.MeshBasicMaterial({visible:false}));hull.position.copy(box.getCenter(new T.Vector3()));hull.position.y-=box.min.y;normalizer.add(hull);
      const record={parent,mixer,instance,head,tail,eyes,headScale:head?.scale.clone(),tap:-100};parent.userData.actorRecord=record;this.instances.add(record);normalizer.userData.release=()=>{mixer.stopAllAction();mixer.uncacheRoot(instance);this.instances.delete(record);};
      this.stage.canvas.dataset.fox='smooth-skinned-animation';this.stage.render();
    };
    if(this.asset)mount();else this.pending.push(mount);
  }
  makeDeskFox(){if(!this.stage.room)return;const toy=new T.Group();toy.position.set(-2.8,0,-8.6);this.stage.room.group.add(toy);toy.userData.roomAction='deskFox';toy.userData.label='小狐狸摆件 · 打个招呼';this.deskFox=toy;this.fox(toy,.95);}
  update(dt){for(const r of this.instances){if(r.parent.userData.disposed)continue;r.mixer.update(dt*.65);const hover=r.parent.userData.hover?1:0,age=this.stage.time-(r.parent.userData.tap??-100);const blinkPhase=(this.stage.time+this.instances.size*.7)%5.3,blink=blinkPhase<.16?Math.max(.06,Math.abs(blinkPhase/.08-1)):1;for(const eye of r.eyes)eye.scale.y=blink;if(r.head){r.head.scale.copy(r.headScale);r.head.scale.x*=1.1;r.head.scale.y*=1.08;r.head.scale.z*=1.08;r.head.rotation.z+=hover*.055+Math.sin(Math.min(age,1)*Math.PI*3)*Math.max(0,1-age)*.08;}if(r.tail&&age<2)r.tail.rotation.y+=Math.sin(age*10)*.18*Math.sin(age/2*Math.PI);}}
}

function detailFace(head){
  const dark=new T.MeshPhysicalMaterial({color:'#24190f',roughness:.23,clearcoat:.55}),cream=new T.MeshStandardMaterial({color:'#fff0d6',roughness:.9}),amber=new T.MeshPhysicalMaterial({color:'#784220',roughness:.26}),white=new T.MeshBasicMaterial({color:'#fff9e8'}),eyes=[];
  const sphere=(parent,material,xyz,scale)=>{const m=new T.Mesh(faceGeometry,material);m.position.set(...xyz);m.scale.set(...scale);m.castShadow=false;parent.add(m);return m;};
  sphere(head,cream,[27,-.8,0],[3.0,1.35,2.8]);sphere(head,dark,[30.2,.65,0],[1.25,.90,1.35]);
  for(const side of [-1,1]){
    const eye=new T.Group();eye.position.set(17.0,3.8,side*7.85);head.add(eye);eyes.push(eye);
    sphere(eye,cream,[0,0,0],[1.6,1.85,.35]);sphere(eye,amber,[.25,.04,side*.29],[1.18,1.48,.28]);sphere(eye,dark,[.45,.03,side*.48],[.68,1.04,.14]);sphere(eye,white,[.10,.67,side*.61],[.28,.34,.12]);
    const ear=new T.BufferGeometry();ear.setAttribute('position',new T.Float32BufferAttribute([5.2,6.9,side*9.2,8.1,13.8,side*8.5,11.5,7.0,side*8.5],3));ear.computeVertexNormals();const e=new T.Mesh(ear,new T.MeshStandardMaterial({color:'#b77763',roughness:1,side:T.DoubleSide}));head.add(e);
    const brow=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(15.1,6.0,side*7.5),new T.Vector3(16.9,6.5,side*7.45),new T.Vector3(18.4,5.9,side*7.0)]),8,.19,5,false),dark);head.add(brow);
  }return eyes;
}
