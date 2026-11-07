import * as T from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';

// Original publicly served StoryComet toy models; provenance is recorded in REFERENCE_SOURCES.json.
function fit(model,{height,length,flat=false,keep=false}){
  model.updateMatrixWorld(true);let box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
  if(!keep){const axis=flat?Math.min(size.x,size.y,size.z):Math.max(size.x,size.y,size.z);if(size.y!==axis){if(size.z===axis)model.rotation.x=flat?-Math.PI/2:Math.PI/2;else model.rotation.z=flat?Math.PI/2:-Math.PI/2;}}
  model.updateMatrixWorld(true);box.setFromObject(model);size=box.getSize(size);model.scale.multiplyScalar(height?height/size.y:length/Math.max(size.x,size.z));model.updateMatrixWorld(true);box.setFromObject(model);const center=box.getCenter(new T.Vector3());model.position.sub(new T.Vector3(center.x,box.min.y,center.z));
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;for(const m of [].concat(o.material)){m.roughness=Math.max(.48,m.roughness);if(m.map)m.map.anisotropy=8;}});return model;
}
export async function loadRoomModels(room){
  const loader=new GLTFLoader();
  for(const [key,pos,label]of [['owl',[-2.8,0,-10.1],'猫头鹰摆件 · 点一点打招呼'],['moon',[10.1,0,-8.8],'月亮摆件 · 点亮一圈月光']]){const g=new T.Group();g.position.set(...pos);room.group.add(g);room.tag(g,key,label);}
  const specs={lamp:{height:4.2},train:{length:3.68,keep:true},magnifier:{length:2.88,flat:true},crayons:{height:1.76},owl:{height:1.7},moon:{height:1.9}};
  const results=await Promise.allSettled(Object.entries(specs).map(async([key,spec])=>{
    const {scene:model}=await loader.loadAsync(`assets/room-reference/models-toys-${key}.glb`),root=room.objects[key];
    for(const child of root.children)child.traverse(o=>{if(o.isMesh)o.visible=false;});
    root.add(fit(model,spec));root.userData.referenceModel=model;
    if(key==='train'){root.rotation.y=-.55;root.userData.restRotation.copy(root.rotation);}
    if(key==='lamp'){
      room.lampMaterials=[];model.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material)){m.emissiveMap=m.map;m.emissive.set('#ffd9a0');m.emissiveIntensity=.22;room.lampMaterials.push(m);}});
      room.lampLight.position.y=3.10;room.lampLight.distance=55;
      const pool=new T.SpotLight('#ffd39a',100,58,.62,.85,1.4);pool.position.y=2.94;root.add(pool,pool.target);room.lampPool=pool;
    }
  }));
  results.forEach((r,i)=>{if(r.status==='rejected')console.warn('Room model unavailable',Object.keys(specs)[i],r.reason);});
  room.stage.canvas.dataset.roomModels=results.filter(r=>r.status==='fulfilled').length+'/6';room.stage.renderer.shadowMap.needsUpdate=true;
}
