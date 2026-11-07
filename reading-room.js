import * as T from './vendor/three/build/three.module.js';
import {loadRoomModels} from './room-models.js?v=otto9';
import {prepareAsset} from './asset-prep.js?v=otto9';
const HOME_ANCHORS={lamp:[-12,0,-10.4],train:[5.6,0,-11.2],jar:[2.2,0,-14.4],blocks:[9.6,0,-13.0],magnifier:[10.24,0,4.4],ball:[12.96,0,-2.8],crayons:[-11.36,0,4.96],owl:[-2.8,0,-10.1],moon:[10.1,0,-8.8]};

// Furniture uses actual geometry and table contact points, rather than a backdrop screenshot.
export class ReadingRoom {
  constructor(stage){
    this.stage=stage;this.group=new T.Group();stage.scene.add(this.group);this.materials=new Map();this.geometryCache=new Map();this.objects={};this.wheels=[];this.blockParts=[];this.interactives=[];this.actions={};
    this.wood=new T.MeshPhysicalMaterial({color:'#fff0d5',roughness:.4,clearcoat:.42,clearcoatRoughness:.24});
    this.table=this.mesh(new T.PlaneGeometry(140,120),this.wood,this.group,[0,-.025,0]);this.table.rotation.x=-Math.PI/2;this.table.receiveShadow=true;this.table.castShadow=false;
    this.wallMaterial=new T.MeshStandardMaterial({color:'#536647',roughness:1});const wall=this.mesh(new T.PlaneGeometry(176,64),this.wallMaterial,this.group,[0,32,-23.68]);wall.receiveShadow=true;wall.castShadow=false;
    this.wallOverlay=new T.Mesh(wall.geometry,this.wallMaterial.clone());
    this.wallOverlay.position.copy(wall.position);this.wallOverlay.position.z+=.04;
    this.wallOverlay.receiveShadow=true;this.wallOverlay.visible=false;this.group.add(this.wallOverlay);
    this.box(this.group,'#f6ead0',[0,.64,-23.44],[176,1.28,.40]);
    this.lamp([-9.4,0,-7.6]);this.train([6.8,0,-9.2]);this.jar([2.2,0,-10.2]);this.blocks([11.4,0,-3.9]);this.magnifier([10.4,0,5.7]);this.ball([10.2,0,-5.2]);this.books();this.finishDetails();this.environmentReady=this.loadEnvironment();this.modelsReady=loadRoomModels(this);

  }
  mat(color,extra={}){const key=color+JSON.stringify(extra);if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness:.62,...extra}));return this.materials.get(key);}
  mesh(geo,mat,parent,pos=[0,0,0]){const m=new T.Mesh(geo,typeof mat==='string'?this.mat(mat):mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  geometry(key,create){if(!this.geometryCache.has(key))this.geometryCache.set(key,create());return this.geometryCache.get(key);}
  box(p,c,xyz,size){return this.mesh(this.geometry('box:'+size,()=>roundedBox(size)),c,p,xyz);}
  cylinder(p,c,xyz,rt,rb,h){return this.mesh(this.geometry('cylinder:'+rt+','+rb+','+h,()=>new T.CylinderGeometry(rt,rb,h,48)),c,p,xyz);}
  sphere(p,c,xyz,size){const m=this.mesh(this.geometry('sphere',()=>new T.SphereGeometry(1,32,24)),c,p,xyz);m.scale.set(...size);return m;}
  torus(p,c,xyz,r,t){const m=this.mesh(new T.TorusGeometry(r,t,10,64),c,p,xyz);m.rotation.x=Math.PI/2;return m;}
  lamp(position){
    const g=new T.Group();g.position.set(...position);this.group.add(g);this.tag(g,'lamp','台灯 · 轻点调暗或点亮');g.scale.setScalar(1.7);const brass=this.mat('#b89549',{metalness:.75,roughness:.3});
    this.cylinder(g,'#68452d',[0,.14,0],1.1,1.18,.28);this.cylinder(g,brass,[0,.33,0],.86,.98,.12);this.torus(g,brass,[0,.4,0],.58,.06);this.cylinder(g,brass,[0,1.72,0],.06,.10,2.65);this.sphere(g,brass,[0,2.9,0],[.17,.21,.17]);
    const points=[new T.Vector2(1.45,0),new T.Vector2(1.43,.08),new T.Vector2(.66,1.75),new T.Vector2(.64,1.82)],geo=new T.LatheGeometry(points,160),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),angle=Math.atan2(z,x),s=1+.019*Math.cos(angle*56);p.setX(i,x*s);p.setZ(i,z*s);}geo.computeVertexNormals();
    const shade=this.mesh(geo,new T.MeshPhysicalMaterial({color:'#fff4d6',side:T.DoubleSide,roughness:.92,sheen:.65,sheenColor:'#f8dfae',emissive:'#ffc36c',emissiveIntensity:.22}),g,[0,2.65,0]);shade.receiveShadow=false;
    this.torus(g,brass,[0,2.67,0],1.45,.022);this.torus(g,brass,[0,4.46,0],.65,.02);this.sphere(g,brass,[0,4.53,0],[.07,.10,.07]);
    this.lampShade=shade;const light=new T.PointLight('#ffda9a',65,28,2);this.lampLight=light;this.lampLevel=1;this.lampOn=true;light.position.set(0,2.7,0);g.add(light);
  }
  train(position){
    const g=new T.Group();g.position.set(...position);g.rotation.y=-.35;this.group.add(g);this.tag(g,'train','小火车 · 轻点开动');const red=this.mat('#bd4937',{roughness:.38}),gold=this.mat('#d1a44d',{metalness:.6,roughness:.34}),blue=this.mat('#548798',{roughness:.35});
    this.box(g,'#573c2b',[0,.32,0],[1.15,.22,2.7]);for(const x of [-.62,.62])for(const z of [-.83,.77]){const wheel=this.cylinder(g,'#393a36',[x,.35,z],.34,.34,.13);wheel.rotation.z=Math.PI/2;this.wheels.push(wheel);const hub=this.cylinder(g,gold,[x*1.12,.35,z],.13,.13,.16);hub.rotation.z=Math.PI/2;}
    const boiler=this.cylinder(g,blue,[0,.89,.49],.46,.46,1.38);boiler.rotation.x=Math.PI/2;this.torus(g,gold,[0,.89,1.19],.40,.035).rotation.x=0;
    this.cylinder(g,gold,[0,1.45,.7],.16,.13,.48);this.cylinder(g,'#3d3b33',[0,1.74,.7],.22,.17,.13);this.box(g,red,[0,1.02,-.76],[1.05,1.15,.84]);this.box(g,'#f3d9a3',[0,1.11,-.31],[.78,.55,.03]);this.box(g,'#314a50',[0,1.12,-.29],[.6,.39,.025]);const roof=this.box(g,red,[0,1.67,-.77],[1.35,.16,1.2]);roof.rotation.z=.02;
  }
  jar(position){
    const g=new T.Group();g.position.set(...position);this.group.add(g);this.tag(g,'jar','星光瓶 · 轻点打开');const glass=new T.MeshPhysicalMaterial({color:'#f4e8cc',transparent:true,opacity:.30,transmission:0,thickness:.08,ior:1.45,roughness:.08,metalness:0,side:T.FrontSide,depthWrite:false});
    this.cylinder(g,glass,[0,.81,0],.46,.47,1.48);this.torus(g,'#f0ddaf',[0,1.57,0],.39,.045);this.jarCap=this.cylinder(g,'#ae8760',[0,1.64,0],.39,.39,.15);this.jarOpen=false;
    for(const [x,z,a]of [[-.14,.1,.12],[.18,-.08,-.2],[.02,-.2,.2]]){const paper=this.cylinder(g,'#f6e9c9',[x,.73,z],.12,.12,1.16);paper.rotation.z=a;}
    this.torus(g,'#c1a16f',[0,1.38,0],.46,.018);
  }
  blocks(position){const g=new T.Group();g.position.set(...position);g.rotation.y=-.4;this.group.add(g);this.tag(g,'blocks','字母积木 · 轻点蹦一下');for(const [i,letter,color] of [[0,'B','#b85f4b'],[1,'6','#6e8da4'],[2,'12','#8eaa6a']]){const block=new T.Group();block.position.set(i===0?-.37:i===2?.37:0,i===1?1.08:.36,0);block.rotation.z=i===1?.06:0;g.add(block);this.blockParts.push(block);block.userData.rest=block.position.clone();this.box(block,'#f3e2bd',[0,0,0],[.72,.72,.72]);const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#fff4d8';x.fillRect(0,0,128,128);x.fillStyle=color;x.font='bold 75px sans-serif';x.textAlign='center';x.fillText(letter,64,92);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;this.mesh(new T.PlaneGeometry(.67,.67),new T.MeshBasicMaterial({map:t}),block,[0,0,.367]);}}
  magnifier(position){const g=new T.Group();g.position.set(...position);g.rotation.y=-.65;this.group.add(g);this.tag(g,'magnifier','放大镜 · 轻点转动');const brass=this.mat('#a49770',{metalness:.8,roughness:.24});this.torus(g,brass,[0,.14,0],.62,.085);const glass=new T.MeshPhysicalMaterial({color:'#d9e7e4',transparent:true,opacity:.25,transmission:0,thickness:.11,ior:1.52,clearcoat:1,roughness:.06,side:T.DoubleSide,depthWrite:false});const lens=this.mesh(new T.CircleGeometry(.55,48),glass,g,[0,.14,0]);lens.rotation.x=-Math.PI/2;const handle=this.cylinder(g,'#55422c',[0,.13,1.25],.14,.19,1.3);handle.rotation.x=Math.PI/2;this.torus(g,brass,[0,.14,.69],.14,.04).rotation.x=0;}
  ball(position){const g=new T.Group();g.position.set(...position);this.group.add(g);this.tag(g,'ball','小皮球 · 轻点滚一滚');const material=[this.mat('#b64e3a'),this.mat('#eddda9'),this.mat('#4d7c92')];for(let i=0;i<3;i++){const m=this.mesh(new T.SphereGeometry(.62,32,12,0,Math.PI*2,i*Math.PI/3,Math.PI/3),material[i],g,[0,.62,0]);}g.rotation.z=.12;g.userData.restRotation=g.rotation.clone();}
  books(){
    const g=new T.Group();this.bookDisplayGroup=g;g.position.set(0,0,-20.8);this.group.add(g);const colors=['#ad8455','#344e6d','#65938a','#a25b4e','#76698c'];
    for(let i=0;i<8;i++){const x=(i-3.5)*3.8,book=new T.Group();book.position.set(x,1.75,0);book.rotation.y=Math.sin(i)*.08;g.add(book);this.box(book,colors[i%5],[0,0,0],[2.4,3.5,.34]);this.box(book,'#e0c583',[0,0,.18],[2.12,3.25,.02]);const tex=this.stage.paperArt?.art.regions.get('night')?.texture;const art=this.mesh(new T.PlaneGeometry(2.04,3.14),new T.MeshBasicMaterial({color:colors[(i+1)%5]}),book,[0,0,.2]);this.coverTexture(['assets/otto-reference/cover.webp','assets/prince.svg','assets/kite.svg','assets/ocean.svg'][i%4]).then(map=>{art.material.map=map;art.material.color.set('#ffffff');art.material.needsUpdate=true;this.stage.render();});}
    this.box(g,'#a8753c',[0,.06,.1],[70,.12,2.0]);
  }
  coverTexture(url){this.coverTextures||(this.coverTextures=new Map());if(!this.coverTextures.has(url))this.coverTextures.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=512;c.height=704;c.getContext('2d').drawImage(image,0,0,512,704);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.userData.shared=true;resolve(map);};image.onerror=reject;image.src=url;}));return this.coverTextures.get(url);}
  async loadEnvironment(){
    try{
      const meta=await fetch('assets/room/environment-v6.json').then(r=>r.json()),{buffer}=await prepareAsset('environment',{url:new URL('assets/room/environment-v6.bin.gz',location.href).href});
      const levels=[];let offset=0;for(let lod=0;lod<meta.levels;lod++){const size=meta.size>>lod,faces=[];for(let face=0;face<6;face++){faces.push({width:size,height:size,data:new Uint16Array(buffer,offset,size*size*4)});offset+=size*size*8;}levels.push(faces);}
      const faces=Array.from({length:6},(_,face)=>({width:meta.size,height:meta.size,mipmaps:levels.map(l=>l[face])})),texture=new T.CompressedCubeTexture(faces,T.RGBAFormat,T.HalfFloatType);texture.isPMREMTexture=true;texture.isRenderTargetTexture=true;texture.colorSpace=T.LinearSRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;this.stage.scene.environment=texture;this.stage.scene.environmentIntensity=.38;this.stage.canvas.dataset.environment='baked';
    }catch(error){console.warn('Using generated environment fallback',error);this.makeEnvironment();}
  }
  makeEnvironment(){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#b4b9b6');g.addColorStop(.48,'#d6d0bb');g.addColorStop(1,'#5f594b');x.fillStyle=g;x.fillRect(0,0,1024,512);x.fillStyle='#fff7e4';x.fillRect(110,80,135,210);x.fillStyle='#f4efd9';x.fillRect(700,120,70,135);const texture=new T.CanvasTexture(c);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(this.stage.renderer),environment=pmrem.fromEquirectangular(texture);this.environmentTarget=environment;this.stage.scene.environment=environment.texture;this.stage.scene.environmentIntensity=.38;texture.dispose();pmrem.dispose();}

  tag(group,key,label){group.userData.roomAction=key;group.userData.label=label;group.userData.restPosition=group.position.clone();group.userData.restRotation=group.rotation.clone();this.objects[key]=group;this.interactives.push(group);return group;}
  finishDetails(){
    const shadowMap=radialTexture();
    for(const [key,g]of Object.entries(this.objects)){
      const size=key==='lamp'?4.0:key==='train'?2.1:key==='blocks'?1.9:key==='magnifier'?2.2:1.5;
      const shadow=new T.Mesh(new T.PlaneGeometry(size*1.5,size),new T.MeshBasicMaterial({map:shadowMap,color:'#45331e',transparent:true,opacity:key==='lamp'?.26:.21,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));shadow.rotation.x=-Math.PI/2;shadow.position.set(g.position.x,.001,g.position.z);shadow.raycast=()=>{};this.group.add(shadow);g.userData.contactShadow=shadow;
    }
    // Toy wheels have inset rims, polished hubs and connecting rods.
    const train=this.objects.train,metal=this.mat('#d8b365',{metalness:.75,roughness:.27});
    for(const side of [-1,1]){const rod=this.box(train,metal,[side*.76,.35,-.03],[.045,.065,1.65]);rod.userData.decoration=true;for(const z of [-.83,.77])this.sphere(train,metal,[side*.78,.35,z],[.055,.055,.055]);}
    this.cylinder(train,'#d7aa5e',[0,.87,1.22],.14,.14,.08).rotation.x=Math.PI/2;
    this.sphere(train,'#ffeab4',[0,.88,1.25],[.16,.16,.045]);
    this.puffs=[];for(let i=0;i<6;i++){const puff=new T.Sprite(new T.SpriteMaterial({map:shadowMap,color:'#fff4de',transparent:true,opacity:0,depthWrite:false}));puff.raycast=()=>{};train.add(puff);this.puffs.push(puff);}
    const jar=this.objects.jar;const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=192;const lc=labelCanvas.getContext('2d');lc.fillStyle='#f9efd9';lc.fillRect(0,0,256,192);lc.strokeStyle='#bd9756';lc.lineWidth=4;lc.strokeRect(10,10,236,172);lc.fillStyle='#ac874b';lc.font='62px Georgia';lc.textAlign='center';lc.fillText('✦',128,91);lc.font='19px Georgia';lc.fillText('STARDUST',128,137);const labelMap=new T.CanvasTexture(labelCanvas);labelMap.colorSpace=T.SRGBColorSpace;this.mesh(new T.PlaneGeometry(.64,.48),new T.MeshStandardMaterial({map:labelMap,roughness:1}),jar,[0,.87,.475]);
    const ball=this.objects.ball;this.mesh(new T.SphereGeometry(.626,40,12,0,Math.PI*2,Math.PI*.43,Math.PI*.24),this.mat('#436b89'),ball,[0,.62,0]);for(const xyz of [[-.40,-.08,.91],[.20,-.08,.98],[.73,-.08,.67]]){const n=new T.Vector3(...xyz).normalize(),star=new T.Mesh(starShape(.075),new T.MeshBasicMaterial({color:'#fff3ce'}));star.position.copy(n).multiplyScalar(.633);star.position.y+=.62;star.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);ball.add(star);}
    this.jarStars=[];for(let i=0;i<7;i++){const star=new T.Mesh(new T.OctahedronGeometry(.045,0),new T.MeshBasicMaterial({color:i%2?'#ffe08b':'#c6eff6',transparent:true,opacity:.45}));star.position.set(Math.sin(i*2.4)*.23,.35+i*.14,Math.cos(i*2.4)*.23);star.raycast=()=>{};jar.add(star);this.jarStars.push(star);}
    // A tied stack of notebooks and a ceramic pencil cup add scale cues.
    const notes=new T.Group();notes.position.set(-11.4,0,-2);notes.rotation.y=.3;this.group.add(notes);for(let i=0;i<3;i++){this.box(notes,['#a45342','#426c79','#b89854'][i],[i*.05,.10+i*.22,0],[1.75,.20,2.25]);this.box(notes,'#efdfbf',[.06,.12+i*.22,.015],[1.56,.12,2.13]);}this.box(notes,'#bb9258',[0,.77,0],[.15,.03,2.38]);
    const cup=new T.Group();cup.position.set(-6.6,0,-13.4);this.group.add(cup);this.tag(cup,'crayons','彩色蜡笔 · 点一点摇一摇');this.cylinder(cup,'#d9d1b7',[0,.40,0],.34,.31,.8);this.torus(cup,'#b48f50',[0,.8,0],.32,.025);for(let i=0;i<5;i++){const pencil=new T.Group();pencil.position.set(Math.cos(i*2.4)*.18,.4,Math.sin(i*2.4)*.18);pencil.rotation.z=(i-2)*.09;cup.add(pencil);this.cylinder(pencil,['#ae5e4a','#d2a648','#577f77','#5e7892','#8f6c96'][i],[0,.56,0],.035,.035,1.1);this.mesh(new T.ConeGeometry(.036,.15,8),this.mat('#dcb985'),pencil,[0,1.18,0]);}
    const n=48,geometry=new T.BufferGeometry(),positions=new Float32Array(n*3);this.dustBase=[];for(let i=0;i<n;i++){const p=[-13+(i*3.17)%27,.7+(i*1.37)%9,-16+(i*2.31)%21];this.dustBase.push(p);positions.set(p,i*3);}geometry.setAttribute('position',new T.BufferAttribute(positions,3));this.dust=new T.Points(geometry,new T.PointsMaterial({map:shadowMap,color:'#ffe5aa',size:.055,transparent:true,opacity:.34,depthWrite:false,sizeAttenuation:true}));this.dust.raycast=()=>{};this.group.add(this.dust);
    this.halo=new T.Mesh(new T.RingGeometry(.64,.68,64),new T.MeshBasicMaterial({color:'#fff0be',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));this.halo.rotation.x=-Math.PI/2;this.halo.raycast=()=>{};this.group.add(this.halo);
  }
  interact(key){
    if(!this.objects[key])return false;this.actions[key]=this.stage.time;
    if(key==='lamp')this.lampOn=!this.lampOn;if(key==='jar')this.jarOpen=!this.jarOpen;
    this.applyStatic();this.stage.canvas.dataset.lastInteraction='room-'+key;
    const messages={lamp:this.lampOn?'台灯亮起来了，暖暖地陪着你。':'把灯调暗一点，故事还在继续。',train:'呜——小火车出发，再轻轻停回来。',jar:this.jarOpen?'打开瓶盖，收集一路遇见的星光。':'把星光盖好，留给明天。',blocks:'B、6、1、2，小星球的名字藏在这里。',magnifier:'转一转，镜片里藏着一小块窗光。',ball:'轻轻一推，小皮球滚回来啦。',crayons:'彩色蜡笔也想为故事画一片星空。',owl:'咕咕，猫头鹰在安静地陪你读书。',moon:'把一小片月光放在书桌上。'};
    this.stage.onInteract(messages[key]);if(this.stage.motion)this.stage.start();else this.stage.render();return true;
  }
  setHome(on){for(const key of ['jar','owl','moon']){const g=this.objects[key];if(g){g.visible=!on;if(g.userData.contactShadow)g.userData.contactShadow.visible=!on;}}}
  homePosition(key,g){const v=g.userData.homeAnchor||(g.userData.homeAnchor=new T.Vector3());v.set(...HOME_ANCHORS[key]);if(this.stage.camera.aspect<.75)v.x*=.8;return v;}
  settle(){
    for(const [key,g]of Object.entries(this.objects)){g.position.copy(this.stage.view==='shelf'?this.homePosition(key,g):g.userData.restPosition);g.userData.anchor=g.position.clone();g.rotation.copy(g.userData.restRotation);g.userData.hover=false;if(g.userData.contactShadow){g.userData.contactShadow.position.x=g.position.x;g.userData.contactShadow.position.z=g.position.z;}}
    if(!this.stage.motion)this.finishWall();this.objects.lamp.scale.setScalar(1.7);for(const p of this.puffs)p.visible=false;for(const b of this.blockParts)b.position.copy(b.userData.rest);if(this.halo)this.halo.material.opacity=0;this.dust.visible=false;this.applyStatic();
  }
  applyStatic(){if(!this.stage.motion){this.lampLevel=this.lampOn?1:.12;this.jarCap.position.y=this.jarOpen?2.1:1.64;}const level=this.lampLevel??1;this.lampLight.intensity=65*level;this.lampShade.material.emissiveIntensity=.035+.22*level;if(this.lampMaterials)for(const m of this.lampMaterials)m.emissiveIntensity=.26*level;if(this.lampPool){this.lampPool.intensity=100*level;this.objects.lamp.updateWorldMatrix(true,false);this.lampPool.target.position.copy(this.objects.lamp.worldToLocal(new T.Vector3(1,.1,0)));}}
  update(dt,time){
    this.updateWall(dt);
    this.lampLevel=T.MathUtils.damp(this.lampLevel,this.lampOn?1:.12,4,dt);this.applyStatic();
    let hover=null;for(const [key,g]of Object.entries(this.objects)){const base=g.userData.restPosition,target=this.stage.view==='shelf'?this.homePosition(key,g):base,r=g.userData.anchor||(g.userData.anchor=base.clone());r.lerp(target,1-Math.exp(-dt*3));const rot=g.userData.restRotation,age=time-(this.actions[key]??-100),h=T.MathUtils.damp(g.userData.hoverAmount||0,g.userData.hover?1:0,8,dt);g.userData.hoverAmount=h;g.position.copy(r);g.rotation.copy(rot);if(g.userData.hover)hover=g;if(key==='lamp')g.scale.setScalar(T.MathUtils.damp(g.scale.x,1.7,3,dt));
      if(key==='train'){const travel=age<3?Math.sin(age/3*Math.PI)**2*1.25:0;g.position.z+=travel;g.position.y+=Math.sin(age*18)*.014*(age<3?1:0)+h*.025;for(const w of this.wheels)w.rotation.y=travel/.34;for(let i=0;i<this.puffs.length;i++){const p=this.puffs[i],a=(age+i*.32)%1.6;p.visible=age<3.8&&a>=0;p.position.set(Math.sin(i*2.4+a)*.11,1.9+a*.7,.70-a*.15);p.scale.setScalar(.20+a*.42);p.material.opacity=age<3.4?Math.sin(a/1.6*Math.PI)*.28:0;}}
      if(key==='ball'&&age<2.4){const roll=Math.sin(age/2.4*Math.PI)*.8;g.position.x+=roll;g.position.y+=Math.abs(Math.sin(age*5))*Math.max(0,1-age/2.4)*.10;g.rotation.z-=roll/.62;}
      if(key==='blocks')this.blockParts.forEach((b,i)=>{const a=age-i*.1;b.position.copy(b.userData.rest);b.position.y+=a>0&&a<.8?Math.sin(a/.8*Math.PI)*.16:0;b.rotation.z=(i===1?.06:0)+(a>0&&a<.8?Math.sin(a/.8*Math.PI)*.09:0);});
      if(g.userData.contactShadow){g.userData.contactShadow.position.x=g.position.x;g.userData.contactShadow.position.z=g.position.z;}
      if(['crayons','owl','moon'].includes(key)){const bounce=age<1.4?Math.sin(age/1.4*Math.PI):0;g.position.y+=bounce*.38+h*.045;g.rotation.y+=Math.sin(age*8)*bounce*.12+h*.10;g.rotation.z+=Math.sin(age*9)*bounce*.07;}
      if(key==='magnifier'){g.rotation.y+=h*.05+(age<1.4?Math.sin(age/1.4*Math.PI)*.18:0);g.rotation.x=age<1.4?Math.sin(age/1.4*Math.PI)*.14:0;}
    }
    this.jarCap.position.y=T.MathUtils.damp(this.jarCap.position.y,this.jarOpen?2.1:1.64,5,dt);this.jarCap.rotation.z=T.MathUtils.damp(this.jarCap.rotation.z,this.jarOpen?-.12:0,5,dt);
    this.jarStars.forEach((s,i)=>{s.position.y=.35+i*.14+(this.jarOpen?.12:0)+Math.sin(time*.6+i)*.045;s.rotation.y=time*.3+i;s.material.opacity=(this.jarOpen?.85:.4)+Math.sin(time+i)*.1;});
    this.halo.material.opacity=T.MathUtils.damp(this.halo.material.opacity,hover?.userData.roomAction? .45:0,8,dt);if(hover){this.halo.position.set(hover.position.x,.025,hover.position.z);this.halo.scale.setScalar(hover===this.objects.lamp?2.7:hover===this.objects.train?1.4:1);}
    const p=this.dust.geometry.attributes.position;this.dustBase.forEach((v,i)=>p.setXYZ(i,v[0]+Math.sin(time*.10+i)*.15,v[1]+Math.sin(time*.14+i*.8)*.25,v[2]));p.needsUpdate=true;this.dust.visible=this.stage.motion;
  }
  setWood(map){this.wood.map=map;this.wood.needsUpdate=true;}
  setShelfTheme(id,{remember=false}={}){
    if(remember)this.shelfWallBook=id||null;
    if(this.stage.view==='shelf')this.setWall(id||this.shelfWallBook||'default');
  }
  setTheme(otto){this.setWall(this.stage.view==='shelf'?(this.shelfWallBook||'default'):otto?'demo-otto':'default');}
  setWall(id){
    if(!this.surfaceMaps)return;
    const themes=this.surfaceMaps.wallThemes,key=themes[id]?id:'default',pair=themes[key];
    if(this.wallTarget===key)return;
    this.wallTarget=key;this.stage.canvas.dataset.wallTheme=key;
    if(this.wallMaterial.map===pair[0]||!this.stage.motion){
      this.wallMaterial.map=pair[0];this.wallMaterial.normalMap=pair[1];this.wallMaterial.needsUpdate=true;
      this.wallOverlay.visible=false;this.wallFade=null;this.stage.canvas.dataset.wallCurrent=key;this.stage.render();return;
    }
    const mat=this.wallOverlay.material;mat.copy(this.wallMaterial);mat.map=pair[0];mat.normalMap=pair[1];
    mat.transparent=true;mat.depthWrite=false;mat.opacity=0;mat.needsUpdate=true;
    this.wallOverlay.visible=true;this.wallFade=0;this.stage.start();
  }
  finishWall(){
    if(this.wallFade===null||this.wallFade===undefined)return;
    this.wallMaterial.map=this.wallOverlay.material.map;this.wallMaterial.normalMap=this.wallOverlay.material.normalMap;
    this.wallMaterial.needsUpdate=true;this.wallOverlay.visible=false;this.wallFade=null;this.stage.canvas.dataset.wallCurrent=this.wallTarget;
  }
  updateWall(dt){
    if(this.wallFade===null||this.wallFade===undefined)return;
    this.wallFade=Math.min(1,this.wallFade+dt*1.4);this.wallOverlay.material.opacity=this.wallFade;
    if(this.wallFade===1)this.finishWall();
  }

  setMaterials(maps){this.surfaceMaps=maps;this.wood.map=this.wood.roughnessMap=maps.wood;this.wood.color.set('#d9c4a4');this.wood.roughness=.6;this.wood.metalness=.02;this.wood.clearcoat=.08;this.wood.envMapIntensity=.6;this.wood.needsUpdate=true;this.wallMaterial.map=maps.wall;this.wallMaterial.normalMap=maps.wallNormal;this.wallMaterial.normalScale.set(.7,.7);this.wallMaterial.color.set('#e6dcc8');this.wallMaterial.roughness=.94;this.wallMaterial.needsUpdate=true;}

}

function roundedBox(size){const [w,h,d]=size,r=Math.min(.045,w*.15,h*.15,d*.15);if(r<.008)return new T.BoxGeometry(w,h,d);const s=new T.Shape(),x=-w/2+r,y=-h/2+r,W=w-2*r,H=h-2*r;s.moveTo(x,y);s.lineTo(x+W,y);s.lineTo(x+W,y+H);s.lineTo(x,y+H);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1});g.translate(0,0,-d/2+r);return g;}
function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,63);g.addColorStop(0,'#ffffffff');g.addColorStop(.26,'#ffffffb0');g.addColorStop(.65,'#ffffff30');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}

function starShape(r){const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,d=i%2?r*.45:r;i?s.lineTo(Math.cos(a)*d,Math.sin(a)*d):s.moveTo(Math.cos(a)*d,Math.sin(a)*d);}s.closePath();return new T.ShapeGeometry(s);}
