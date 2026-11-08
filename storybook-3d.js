import {loadCarmelaArt,buildCarmelaScene,interactCarmela,animateCarmela,settleCarmela} from './carmela-scene.js?v=local-paper5';
import {HomeShelf} from './home-shelf.js?v=local-paper5';
import * as T from './vendor/three/build/three.module.js';
import {EffectComposer} from './vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/three/examples/jsm/postprocessing/OutputPass.js';
import {CursorSparkles} from './cursor-sparkles.js?v=otto9';
import {OttoScene} from './otto-scene.js?v=otto9';
import {PrincePaperScene} from './prince-paper.js?v=otto9';
import {PhysicalBook} from './physical-book.js?v=otto9';
import {ReadingRoom} from './reading-room.js?v=home11';
import {StoryMaterials} from './story-materials.js?v=local-paper5';
import {AnimatedActors} from './animated-actors.js?v=otto9';
import {prepareAsset} from './asset-prep.js?v=otto9';

const clamp=T.MathUtils.clamp;
const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const timing={fold:.55,page:1.3,pop:1.45,open:2.1,close:1.6};

function texture(kind) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;
  const c=canvas.getContext('2d');let seed=173;
  const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  c.fillStyle=kind==='wood'?'#b77b43':kind==='sky'?'#233d69':kind==='lining'?'#305363':'#fff0c6';c.fillRect(0,0,1024,768);
  if(kind==='wood'){
    for(let i=0;i<430;i++){c.beginPath();const y=random()*768;c.strokeStyle=`rgba(${random()>.5?'87,45,21':'244,189,118'},${.05+random()*.14})`;c.lineWidth=.3+random()*2;for(let x=0;x<=1024;x+=8){const yy=y+Math.sin(x*.009+i)*4+Math.sin(x*.031+i)*1.5;if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy);}c.stroke();}
  }else if(kind==='sky'){
    const gradient=c.createRadialGradient(650,300,30,500,400,700);gradient.addColorStop(0,'#526386');gradient.addColorStop(.5,'#263f6a');gradient.addColorStop(1,'#15294d');c.fillStyle=gradient;c.fillRect(0,0,1024,768);
    for(let i=0;i<90;i++){c.fillStyle=`rgba(255,238,189,${random()*.7+.2})`;c.beginPath();c.arc(random()*1024,random()*768,.7+random()*2,0,Math.PI*2);c.fill();}
  }else if(kind==='lining'){
    for(let y=20;y<768;y+=33)for(let x=18;x<1024;x+=35){const xx=x+(Math.floor(y/33)%2)*15;c.fillStyle='#e3d6a578';c.beginPath();c.arc(xx,y,1.1,0,Math.PI*2);c.fill();if((Math.floor(x/35)+Math.floor(y/33))%5===0){c.strokeStyle='#c8b27988';c.lineWidth=.7;c.beginPath();c.moveTo(xx-3,y);c.lineTo(xx+3,y);c.moveTo(xx,y-3);c.lineTo(xx,y+3);c.stroke();}}
  }else{
    c.strokeStyle='#c7a35b';c.lineWidth=2;c.strokeRect(27,27,970,714);
    for(const [x,y] of [[45,45],[979,45],[45,723],[979,723]]){c.fillStyle='#c5a15b';c.font='24px Georgia';c.fillText('✦',x-10,y+8);}
  }
  for(let i=0;i<6000;i++){c.fillStyle=`rgba(${random()>.5?'255,247,210':'83,58,32'},${random()*.05})`;c.fillRect(random()*1024,random()*768,1+random()*2,1+random()*2);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.userData.shared=true;
  return map;
}

export class StorybookStage {
  constructor(host,{onInteract=()=>{},onPageTurn=()=>{},onSceneArrive=()=>{},onShelfPick=()=>{},onShelfPage=()=>{},onShelfSound=()=>{},onSceneSound=()=>{},onCollect=()=>{}}={}) {
    const bootStart=performance.now();this.bootPhases={};
    this.initializing=true;this.preparing=true;this.host=host;this.reader=document.getElementById('readerView');this.view='reader';this.onInteract=onInteract;this.onPageTurn=onPageTurn;this.onSceneArrive=onSceneArrive;this.onShelfPick=onShelfPick;this.onShelfPage=onShelfPage;this.onShelfSound=onShelfSound;this.onSceneSound=onSceneSound;this.onCollect=onCollect;this.active=false;this.motion=true;this.time=0;this.last=0;this.page=0;this.actors={};this.particles=[];this.pointer={x:0,y:0};this.orbit={x:0,y:0};
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.bootPhases.renderer=performance.now()-bootStart;
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.98;
    this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
    this.canvas=this.renderer.domElement;this.canvas.id='storybookCanvas';this.canvas.setAttribute('aria-label','可拖动和点击的立体故事书场景');this.canvas.setAttribute('role','img');host.append(this.canvas);
    this.scene=new T.Scene();this.scene.background=new T.Color('#c79760');this.scene.fog=null;
    this.camera=new T.PerspectiveCamera(33,1,.1,150);this.camera.position.set(0,12.7,18.4);this.target=new T.Vector3(.25,.8,-.25);this.camera.lookAt(this.target);
    this.cameraGoal=this.camera.position.clone();this.lookGoal=this.target.clone();
    this.materials=new Map();this.textures={};
    const placeholder=document.createElement('canvas');placeholder.width=placeholder.height=1;const context=placeholder.getContext('2d');context.fillStyle='#fff0c6';context.fillRect(0,0,1,1);
    this.textureReady=Promise.all(['paper','sky','lining'].map(async key=>{const map=new T.Texture(placeholder);map.colorSpace=T.SRGBColorSpace;map.userData.shared=true;this.textures[key]=map;try{const {image}=await prepareAsset('image',{url:new URL(`assets/room/${key}-v6.png`,location.href).href,flipY:true});map.image=image;map.flipY=false;}catch(error){map.image=texture(key).image;}map.needsUpdate=true;}));
    this.scene.add(new T.HemisphereLight('#8ea2e0','#5a3c22',.5));
    const light=new T.DirectionalLight('#ffe3bf',2.4);light.position.set(-20.8,28.8,17.6);light.target.position.set(1.6,0,-1.6);light.castShadow=true;this.keyLight=light;light.shadow.mapSize.set(2048,2048);light.shadow.radius=3;light.shadow.camera.left=-35.2;light.shadow.camera.right=35.2;light.shadow.camera.top=28.8;light.shadow.camera.bottom=-27.2;light.shadow.camera.near=8;light.shadow.camera.far=112;light.shadow.normalBias=.12;light.shadow.bias=-.0003;this.scene.add(light,light.target);
    const fill=new T.DirectionalLight('#8fb0ff',.75);fill.position.set(20.8,20.8,-19.2);this.scene.add(fill);const bounce=new T.PointLight('#ffd6ae',102,40,2);bounce.position.set(12.8,7.2,13.6);this.scene.add(bounce);
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new T.Vector2(640,400),.11,.45,1.4);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.book=new T.Group();this.scene.add(this.book);this.makeBook();this.bootPhases.book=performance.now()-bootStart;
    this.props=new T.Group();this.props.position.set(3.55,.85,-.4);this.scene.add(this.props);
    this.paperArt=new PrincePaperScene(this);this.bootPhases.paper=performance.now()-bootStart;this.princeArt=this.paperArt;this.ottoArt=new OttoScene(this);this.room=new ReadingRoom(this);this.bootPhases.room=performance.now()-bootStart;this.surfaceMaterials=new StoryMaterials(this);this.homeShelf=new HomeShelf(this);this.bootPhases.materials=performance.now()-bootStart;this.animatedActors=new AnimatedActors(this);this.bootPhases.actors=performance.now()-bootStart;
    this.coverArtReady=null;
    this.raycaster=new T.Raycaster();this.ndc=new T.Vector2();this.bindPointer();this.sparkles=new CursorSparkles(this);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.bootPhases.resize=performance.now()-bootStart;
    this.frame=this.frame.bind(this);
    this.loading=document.getElementById('roomLoading')||document.createElement('div');this.loading.className='room-loading';this.loading.setAttribute('role','status');this.loading.textContent='正在准备故事…';document.body.append(this.loading);this.host.classList.add('is-preparing');this.ready=this.prepare();
  }

  async prepare(){
    const begin=performance.now();this.bootTimings={};
    try{
      await Promise.all([this.surfaceMaterials.ready,this.animatedActors.ready,this.room.environmentReady,this.room.modelsReady,this.homeShelf.ready,this.textureReady]);
      const paperWarmup=this.paperArt.art.card('prince',3.6);paperWarmup.visible=false;paperWarmup.children[0].material.userData.shared=true;this.warmupMaterials=[paperWarmup.children[0].material];this.scene.add(paperWarmup);this.room.settle();this.updateFraming();this.settleCamera();this.bootTimings.assets=performance.now()-begin;this.bootTimings.environment=performance.now()-begin;
      const textures=new Set();this.scene.traverse(o=>{for(const m of o.material?[].concat(o.material):[])if(m.map)textures.add(m.map);});
      let uploaded=0;for(const map of textures){this.renderer.initTexture(map);if(++uploaded%4===0)await new Promise(resolve=>requestAnimationFrame(resolve));}this.bootTimings.upload=performance.now()-begin;
      await this.renderer.compileAsync(this.scene,this.camera);this.bootTimings.compile=performance.now()-begin;this.disposeGroup(paperWarmup);
    }catch(error){console.warn('Room warmup could not finish',error);}
    this.room.settle();this.updateFraming();this.settleCamera();this.initializing=false;
    // Keep the entry pose hidden through the initial shadow draw and compositor frames.
    for(let i=0;i<3;i++){this.render();await new Promise(resolve=>requestAnimationFrame(resolve));}
    this.canvas.dataset.startedAt=String(Math.round(performance.now()));this.loading.remove();this.host.classList.remove('is-preparing');document.body.classList.remove('room-boot');this.preparing=false;if(this.active)this.start();this.resolveReady();
    setTimeout(()=>{if(this.view==='shelf'&&!this.ottoArt.ready)this.ottoArt.ensureLoaded();},4000);
  }

  loadBookAssets(book){
    if(book.theme==='carmela')return loadCarmelaArt();
    if(book.theme==='otto')return this.ottoArt.ensureLoaded();
    if(book.theme==='prince'){this.coverArtReady||=prepareAsset('image',{url:new URL('assets/prince-art/cover-v6.png',location.href).href}).then(({image})=>{this.preparedCover=image;this.coverKey=null;this.refreshCover();}).catch(error=>console.warn('Cover preparation unavailable',error));return Promise.all([this.paperArt.ensureLoaded(),this.coverArtReady]);}
    return Promise.resolve();
  }

  mat(color,options={}) {
    const key=color+JSON.stringify(options);
    if(!this.materials.has(key)){const m=new T.MeshStandardMaterial({color,roughness:.8,...options});m.userData.shared=true;this.materials.set(key,m);}
    return this.materials.get(key);
  }
  mesh(geometry,color,parent,position=[0,0,0],scale=[1,1,1],options={}) {
    const object=new T.Mesh(geometry,typeof color==='string'?this.mat(color,options):color);object.position.set(...position);object.scale.set(...scale);object.castShadow=true;object.receiveShadow=true;if(parent)parent.add(object);return object;
  }
  sphere(parent,color,position,scale=[1,1,1],radius=1){return this.mesh(new T.SphereGeometry(radius,28,20),color,parent,position,scale);}
  box(parent,color,position,size,radius=0){return this.mesh(new T.BoxGeometry(...size),color,parent,position);}
  cylinder(parent,color,position,top,bottom,height,segments=24){return this.mesh(new T.CylinderGeometry(top,bottom,height,segments),color,parent,position);}

  leaf(side,flipping=false) {
    const geometry=new T.PlaneGeometry(7.75,10.75,30,30);geometry.rotateX(-Math.PI/2);geometry.translate(side*3.9,.77,0);
    const vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++){const x=Math.abs(vertices.getX(i));vertices.setY(i,.77+.21*Math.exp(-x*1.4)+.035*Math.pow(x/8,4));}geometry.computeVertexNormals();
    const material=new T.MeshStandardMaterial({map:this.textures.paper,color:'#fff5db',roughness:.96,side:T.DoubleSide});material.userData.shared=true;
    const page=new T.Mesh(geometry,material);page.receiveShadow=true;page.castShadow=true;page.userData.flipping=flipping;return page;
  }
  makeBook(){
    this.physical=new PhysicalBook(this);this.leftBoard=this.physical.frontPivot;this.leftPage=this.physical.leftSheet;
    this.coverCanvas=this.physical.coverCanvas;this.coverMap=this.physical.coverMap;this.bookOpen=1;this.applyBookPose();this.refreshCover();
  }
  refreshCover(){
    if(!this.coverCanvas||!this.coverBook)return;
    if(this.coverBook.theme==='carmela'){
      if(!this.carmelaCover){this.carmelaCover=new Image();this.carmelaCover.onload=()=>{if(this.coverBook?.theme==='carmela')this.refreshCover();};this.carmelaCover.src='assets/carmela-art/cover.jpg';}
      if(this.carmelaCover.complete&&this.carmelaCover.naturalWidth){this.coverCanvas.getContext('2d').drawImage(this.carmelaCover,0,0,900,1240);this.coverMap.needsUpdate=true;this.render();}
      return;
    }
if(this.coverBook.theme==='otto'){if(!this.ottoCover){this.ottoCover=new Image();this.ottoCover.onload=()=>this.refreshCover();this.ottoCover.src='assets/otto-reference/cover.webp';}if(this.ottoCover.complete&&this.ottoCover.naturalWidth){this.coverCanvas.getContext('2d').drawImage(this.ottoCover,0,0,900,1240);this.coverMap.needsUpdate=true;}return;}if(this.coverBook.id==='demo-little-prince'){if(this.preparedCover){const c=this.coverCanvas.getContext('2d');c.drawImage(this.preparedCover,0,0,900,1240);this.coverMap.needsUpdate=true;}return;}const coverKey=[this.coverBook?.id,this.coverBook?.title,this.paperArt?.art.regions.has('night'),this.paperArt?.art.regions.has('prince')].join('|');if(coverKey===this.coverKey)return;this.coverKey=coverKey;const generation=this.coverGeneration=(this.coverGeneration||0)+1;const c=this.coverCanvas.getContext('2d');c.fillStyle='#243b60';c.fillRect(0,0,900,1240);
    const sky=this.paperArt?.art.regions.get('night'),prince=this.paperArt?.art.regions.get('prince');
    if(sky){const map=sky.texture;const image=map.userData.canvasImage||map.image,x=map.offset.x*image.width,y=(1-map.offset.y-map.repeat.y)*image.height;c.drawImage(image,x,y,map.repeat.x*image.width,map.repeat.y*image.height,0,0,900,1240);}
    c.strokeStyle='#dec486';c.lineWidth=3;c.strokeRect(35,35,830,1170);c.strokeRect(47,47,806,1146);c.fillStyle='#fff0c5';c.textAlign='center';c.font='500 88px "Songti SC",serif';c.fillText(this.coverBook?.theme==='prince'?'小王子':(this.coverBook?.title||'小小故事书房').slice(0,9),450,205);c.font='25px "PingFang SC",sans-serif';c.fillText(this.coverBook?.theme==='prince'?'星 空 旅 程':'为 你 留 一 盏 灯',450,272);
    if(prince&&this.coverBook?.theme==='prince'){const map=prince.texture,image=map.userData.canvasImage||map.image,x=map.offset.x*image.width,y=(1-map.offset.y-map.repeat.y)*image.height,w=map.repeat.x*image.width,h=map.repeat.y*image.height,height=650;c.drawImage(image,x,y,w,h,450-height*w/h/2,400,height*w/h,height);}
    c.font='18px "PingFang SC",sans-serif';c.fillText('故 事 彗 星 · 立 体 书 房',450,1152);this.coverMap.needsUpdate=true;
    if(prince&&sky&&this.coverBook?.id==='demo-little-prince')this.coverCanvas.toBlob(blob=>{if(!blob||generation!==this.coverGeneration)return;if(this.princeCoverData?.startsWith('blob:'))URL.revokeObjectURL(this.princeCoverData);this.princeCoverData=URL.createObjectURL(blob);const card=document.querySelector('.book-card[data-book-id="demo-little-prince"] .book-cover');if(card){card.classList.add('generated-cover');card.querySelector('img').src=this.princeCoverData;}},'image/png');
  }

  backdrop(parent,color='#253f6b',day=false) {
    const panelMaterial=new T.MeshStandardMaterial({map:day?null:this.textures.sky,color:day?color:'#ffffff',roughness:1,side:T.DoubleSide});
    const panel=this.mesh(new T.PlaneGeometry(8.8,5.8,1,1),panelMaterial,parent,[0,2.85,-3.45]);panel.rotation.x=-.08;panel.receiveShadow=false;panel.castShadow=true;
    this.box(parent,'#cdbb8d',[0,.025,-3.4],[8.9,.045,.24]);
    const cloud=new T.Group();cloud.position.set(-2.1,3.9,-3.05);parent.add(cloud);
    for(const [x,y,s]of[[-.7,0,.6],[0,.3,.8],[.7,0,.65],[1.2,-.12,.4]])this.sphere(cloud,day?'#fff3d9':'#a5b6c8',[x,y,0],[s,.32+s*.2,.11]);
    this.actors.cloud=cloud;
    return panel;
  }
  stars(parent,count=42) {
    const geometry=new T.SphereGeometry(.035,7,6);const material=new T.MeshBasicMaterial({color:'#ffe6a2'});const mesh=new T.InstancedMesh(geometry,material,count);const temp=new T.Object3D();
    const positions=[];
    for(let i=0;i<count;i++){const x=((i*137)%811)/811*8-4;const y=1.3+((i*79)%367)/367*4.4;const z=-3.15+((i*37)%107)/107*.7;positions.push([x,y,z]);temp.position.set(x,y,z);const s=.7+i%4*.32;temp.scale.setScalar(s);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);}
    mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);this.actors.stars=mesh;this.actors.starPositions=positions;
  }
  planet(parent,small=false) {
    const group=new T.Group();parent.add(group);const r=small?1.25:1.55;group.position.y=r*.82;
    this.sphere(group,'#dfc797',[0,0,0],[1,.86,1],r);
    for(let i=0;i<15;i++){const a=i*2.39996;const y=.05+((i*37)%71)/100;const ring=Math.sqrt(1-y*y);const p=new T.Vector3(Math.cos(a)*ring,y,Math.sin(a)*ring).multiplyScalar(r*.98);const crater=new T.Mesh(new T.TorusGeometry(.11+i%3*.035,.025,6,16),this.mat('#bba16f'));crater.position.copy(p);crater.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),p.clone().normalize());group.add(crater);}
    for(const [x,z,h]of[[-.72,-.52,.5],[.55,-.55,.36]]){const cone=this.mesh(new T.ConeGeometry(.28,h,16), '#9d8570',group,[x,r*.62,z]);this.cylinder(cone,'#665a4e',[0,h/2-.04,0],.12,.1,.025);}
    this.actors.planet=group;return {group,r};
  }
  prince(parent,position=[0,0,0],size=1) {
    const person=new T.Group();person.position.set(...position);person.scale.setScalar(size);parent.add(person);
    const green='#6e9a75',gold='#f4cc65',skin='#f1ccaa';
    for(const side of [-1,1]){const leg=this.cylinder(person,green,[side*.16,.34,0],.12,.13,.65);leg.rotation.z=side*.03;this.sphere(person,'#785a3e',[side*.16,.055,.11],[.16,.08,.25]);}
    this.mesh(new T.ConeGeometry(.46,.9,24),'#6e9a75',person,[0,.95,0],[1,1,.65]);
    this.cylinder(person,gold,[0,.77,0],.35,.35,.09).scale.z=.67;
    this.sphere(person,skin,[0,1.67,.015],[.43,.46,.4]);
    const hair=new T.Mesh(new T.SphereGeometry(.445,28,16,0,Math.PI*2,0,Math.PI*.52),this.mat('#e5b74d'));hair.position.set(0,1.77,.015);hair.rotation.z=-.15;person.add(hair);
    for(let i=0;i<8;i++){const tuft=this.mesh(new T.ConeGeometry(.14,.35,7),'#ebc25b',person,[(i-3.5)*.095,2.12+Math.sin(i*1.4)*.035,.01-Math.abs(i-3.5)*.025]);tuft.rotation.z=(i-3.5)*-.13;}
    for(const side of [-1,1]){this.sphere(person,'#39382e',[side*.135,1.72,.377],[.035,.044,.018]);this.sphere(person,'#df9a85',[side*.26,1.59,.33],[.085,.035,.018]);const arm=this.cylinder(person,green,[side*.4,1.04,.02],.105,.12,.59);arm.rotation.z=side*.27;this.sphere(person,skin,[side*.48,.76,.035],[.105,.12,.1]);}
    this.sphere(person,skin,[0,1.63,.41],[.045,.045,.05]);
    const neck=this.mesh(new T.TorusGeometry(.19,.065,8,28),gold,person,[0,1.37,0]);neck.rotation.x=Math.PI/2;
    const scarf=this.mesh(new T.PlaneGeometry(1.7,.24,18,2),this.mat(gold,{side:T.DoubleSide}),person,[1.0,1.35,.04]);scarf.rotation.z=.12;scarf.geometry.userData.base=new Float32Array(scarf.geometry.attributes.position.array);this.actors.scarf=scarf;this.actors.prince=person;
    person.userData.action='prince';return person;
  }
  rose(parent,position=[0,0,0],dome=true) {
    const group=new T.Group();group.position.set(...position);parent.add(group);
    this.cylinder(group,'#e1ca9f',[0,.02,0],.64,.68,.12);
    const stem=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,.08,0),new T.Vector3(.03,.5,0),new T.Vector3(-.04,.95,0)]),12,.035,7,false),this.mat('#557d4f'));group.add(stem);
    for(const [x,y,angle]of[[-.18,.42,-.5],[.18,.64,.6]]){const leaf=this.sphere(group,'#668c55',[x,y,0],[.24,.085,.11]);leaf.rotation.z=angle;}
    const flower=new T.Group();flower.position.set(-.04,1.05,0);group.add(flower);
    for(let ring=0;ring<3;ring++)for(let i=0;i<6;i++){const a=i*Math.PI/3+ring*.45;const petal=this.sphere(flower,ring===2?'#d97079':ring===1?'#c84a61':'#e18488',[Math.cos(a)*(.18-ring*.045),ring*.07,Math.sin(a)*(.18-ring*.045)],[.23-ring*.035,.09,.18-ring*.025]);petal.rotation.z=Math.sin(a)*.45;petal.rotation.x=Math.cos(a)*.45;}
    this.actors.flower=flower;
    if(dome){const glassMaterial=new T.MeshPhysicalMaterial({color:'#f4f9ef',roughness:.04,metalness:0,transmission:.75,transparent:true,opacity:.28,thickness:.035,side:T.DoubleSide});const glass=new T.Mesh(new T.SphereGeometry(.65,32,24,0,Math.PI*2,0,Math.PI*.61),glassMaterial);glass.scale.y=1.4;glass.position.y=.72;group.add(glass);const ring=this.mesh(new T.TorusGeometry(.62,.025,8,32),'#e6c894',group,[0,.08,0]);ring.rotation.x=Math.PI/2;this.actors.dome=glass;this.actors.domeOpen=false;group.userData.action='rose';}
    return group;
  }
  fox(parent,position=[0,0,0],size=1) {
    const fox=new T.Group();fox.position.set(...position);fox.scale.setScalar(size);parent.add(fox);
    this.sphere(fox,'#c87f45',[0,.51,0],[.65,.37,.35]);
    for(const x of [-.36,.36])for(const z of [-.22,.22]){this.cylinder(fox,'#a9683d',[x,.22,z],.065,.055,.38);this.sphere(fox,'#6e543e',[x,.055,z+.025],[.09,.065,.12]);}
    const head=new T.Group();head.position.set(.48,.83,.06);head.rotation.y=.35;fox.add(head);
    this.sphere(head,'#d68a4c',[0,0,0],[.38,.34,.3]);
    for(const side of [-1,1]){const ear=this.mesh(new T.ConeGeometry(.17,.49,3),'#c77e46',head,[side*.23,.35,-.04]);ear.rotation.z=side*-.2;this.mesh(new T.ConeGeometry(.09,.27,3),'#e5b892',head,[side*.23,.36,.035]);this.sphere(head,'#f0daba',[side*.15,-.14,.22],[.21,.16,.16]);this.sphere(head,'#343b31',[side*.14,.03,.28],[.028,.035,.018]);}
    this.sphere(head,'#3d3e32',[0,-.1,.39],[.065,.045,.04]);
    const tail=new T.Group();tail.position.set(-.58,.55,-.04);tail.rotation.z=-.4;fox.add(tail);
    const orange=this.mesh(new T.ConeGeometry(.24,.94,20),'#d58b4c',tail,[-.32,.24,0],[1,1,.82]);orange.rotation.z=-.9;
    const tip=this.mesh(new T.ConeGeometry(.19,.5,20),'#f1dfc0',tail,[-.63,.53,0],[1,1,.8]);tip.rotation.z=-.9;
    fox.userData.action='fox';this.actors.fox=fox;this.actors.tail=tail;this.actors.foxHead=head;return fox;
  }
  dunes(parent,color='#d8b87c') {
    this.box(parent,color,[0,.035,0],[8.1,.08,6.6]);
    for(const [x,z,s]of[[-2,-1.8,1.6],[2,-2.4,2.2],[2.5,1.6,1.3],[-2.7,1.4,1.4]])this.sphere(parent,color,[x,-.05,z],[s,.38,s*.7]);
  }
  wheat(parent) {
    const count=90,temp=new T.Object3D();const stems=new T.InstancedMesh(new T.CylinderGeometry(.012,.018,1.1,5),this.mat('#b99a54'),count);const grains=new T.InstancedMesh(new T.SphereGeometry(.045,6,5),this.mat('#dfbc64'),count*6);
    for(let i=0;i<count;i++){const x=(i*1.71)%7.6-3.8,z=-2.5+((i*3.17)%2);temp.position.set(x,.56,z);temp.rotation.z=Math.sin(i)*.1;temp.scale.set(1,.75+(i%7)*.06,1);temp.updateMatrix();stems.setMatrixAt(i,temp.matrix);for(let j=0;j<6;j++){temp.position.set(x+(j%2?-.035:.035),1.02+j*.07,z);temp.rotation.z=j%2?-.5:.5;temp.scale.set(.7,1.7,.7);temp.updateMatrix();grains.setMatrixAt(i*6+j,temp.matrix);}}
    const group=new T.Group();group.add(stems,grains);parent.add(group);this.actors.wheat=group;
  }
  plane(parent,position=[0,0,0],size=1) {
    const plane=new T.Group();plane.position.set(...position);plane.scale.setScalar(size);parent.add(plane);
    this.sphere(plane,'#b98b59',[0,.45,0],[.37,.37,1.25]);
    this.box(plane,'#e1c793',[0,.45,.1],[2.9,.08,.65]);this.box(plane,'#e6cf9b',[0,1.14,.15],[2.8,.08,.65]);
    for(const x of [-1,1])for(const z of [-.05,.35]){const strut=this.cylinder(plane,'#825d39',[x,.8,z],.02,.02,.7,6);strut.rotation.z=x*.1;}
    this.box(plane,'#a26e49',[0,.6,-1.03],[1.1,.05,.4]);this.box(plane,'#a26e49',[0,.83,-1.05],[.055,.6,.4]);
    const prop=new T.Group();prop.position.set(0,.46,1.22);plane.add(prop);this.box(prop,'#634c38',[0,0,0],[.09,1.05,.05]);this.sphere(prop,'#b7ac8e',[0,0,.07],[.12,.12,.12]);
    for(const side of [-1,1]){const wheel=this.cylinder(plane,'#5b544b',[side*.5,.15,.43],.17,.17,.08,20);wheel.rotation.z=Math.PI/2;}
    plane.userData.action='plane';this.actors.planeProp=prop;return plane;
  }
  lamp(parent,position=[0,0,0]) {
    const group=new T.Group();group.position.set(...position);parent.add(group);
    this.cylinder(group,'#5e6769',[0,1.35,0],.07,.09,2.7);this.cylinder(group,'#7f7b69',[0,.09,0],.3,.35,.18);
    this.box(group,'#666b65',[0,2.86,0],[.65,.06,.6]);this.mesh(new T.ConeGeometry(.5,.32,4),'#62726e',group,[0,3.2,0]).rotation.y=Math.PI/4;
    const bulb=this.mesh(new T.SphereGeometry(.23,16,12),this.mat('#ffe4a2',{emissive:'#ffbc4a',emissiveIntensity:2.2}),group,[0,2.88,0]);
    for(const x of [-.27,.27])for(const z of [-.25,.25])this.cylinder(group,'#6c7268',[x,2.91,z],.022,.022,.5,6);
    const light=new T.PointLight('#ffd38c',4,8,2);light.position.set(0,2.85,0);group.add(light);
    group.userData.action='lamp';this.actors.lampLight=light;this.actors.lampBulb=bulb;this.actors.lampOn=true;return group;
  }
  well(parent,position=[0,0,0]) {
    const group=new T.Group();group.position.set(...position);parent.add(group);
    const wall=this.mesh(new T.CylinderGeometry(.8,.87,.75,24,1,true),'#baaa8b',group,[0,.39,0]);wall.material=this.mat('#baaa8b',{side:T.DoubleSide});
    for(let i=0;i<14;i++){const a=i*Math.PI/7;const stone=this.box(group,i%2?'#cbbc9d':'#af9f81',[Math.cos(a)*.78,.79,Math.sin(a)*.78],[.33,.22,.25]);stone.rotation.y=-a;}
    this.cylinder(group,'#2c5964',[0,.22,0],.72,.72,.04);
    for(const x of [-1,1])this.box(group,'#98744c',[x,1.45,0],[.13,2.5,.15]);this.box(group,'#9f7b51',[0,2.7,0],[2.3,.16,.22]);
    const wheel=this.mesh(new T.TorusGeometry(.28,.055,8,24),'#a48354',group,[.94,2.5,0]);wheel.rotation.y=Math.PI/2;
    const rope=this.cylinder(group,'#c6aa74',[0,1.7,.04],.018,.018,1.5,6);
    const bucket=this.mesh(new T.CylinderGeometry(.22,.18,.3,20,1,true),this.mat('#9c7f57',{side:T.DoubleSide}),group,[0,.9,.04]);
    const handle=this.mesh(new T.TorusGeometry(.2,.017,6,20,Math.PI),'#796d53',bucket,[0,.15,0]);
    group.userData.action='well';this.actors.bucket=bucket;this.actors.rope=rope;this.actors.wellWheel=wheel;this.actors.bucketUp=false;return group;
  }
  birds(parent) {
    const birds=[];for(let i=0;i<7;i++){const bird=new T.Group();parent.add(bird);this.sphere(bird,'#eee6cf',[0,0,0],[.08,.09,.22]);const wings=[];for(const side of [-1,1]){const wing=this.mesh(new T.ConeGeometry(.16,.65,3),'#d7d5c4',bird,[side*.19,0,0],[1,1,.2]);wing.rotation.z=side*Math.PI/2;wings.push(wing);}birds.push({bird,wings,phase:i*.8});}this.actors.birds=birds;
  }

  buildOtherScene(book,page) {
    const g=this.props,theme=book.theme;
    if(book.kind!=='demo'){
      this.backdrop(g);this.stars(g);this.canvas.dataset.content=page.image?'book-image':'text';this.canvas.dataset.imageReady='false';
      if(page.image){
        const owner=g;const material=new T.MeshStandardMaterial({color:'#fff5dd',side:T.DoubleSide,roughness:.95});
        const card=this.mesh(new T.PlaneGeometry(4,4.7),material,g,[.1,2.45,-.2]);card.rotation.x=-.08;
        new T.TextureLoader().load(page.image,map=>{
          if(owner!==this.props){map.dispose();return;}map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
          const ratio=map.image.width/map.image.height;const height=Math.min(4.8,6/ratio),width=height*ratio;
          card.geometry.dispose();card.geometry=new T.PlaneGeometry(width,height);material.map=map;material.color.set('#ffffff');material.needsUpdate=true;this.canvas.dataset.imageReady='true';this.render();
        });
      }else{this.planet(g);this.prince(g,[0,2.55,.1],.9);}return;
    }
    this.canvas.dataset.content='scene';
    if(theme==='moon'){
      this.backdrop(g);this.stars(g);this.dunes(g,'#8ba58a');
      const rabbit=new T.Group();rabbit.position.set(.1,.14,1);g.add(rabbit);this.sphere(rabbit,'#f4e6c5',[0,.55,0],[.47,.58,.36]);this.sphere(rabbit,'#f8ebcd',[0,1.1,.1],[.44,.42,.37]);for(const side of [-1,1]){const ear=this.sphere(rabbit,'#f0dfbf',[side*.2,1.76,0],[.12,.53,.1]);ear.rotation.z=side*-.12;this.sphere(rabbit,'#d8ad98',[side*.2,1.76,.08],[.06,.37,.035]);this.sphere(rabbit,'#363b31',[side*.14,1.14,.44],[.035,.045,.02]);}this.actors.rabbit=rabbit;rabbit.userData.action='prince';
      const moon=new T.Group();moon.position.set(1.9,3.8,-2.4);g.add(moon);this.sphere(moon,'#f4dca1',[0,0,0],[.91,.91,.19]);const cover=this.sphere(moon,'#30486c',[.36,.24,.18],[.83,.83,.18]);cover.castShadow=false;this.actors.moon=moon;
    }else if(theme==='kite'){
      this.backdrop(g,'#8cbbc6',true);this.dunes(g,'#8cae88');this.fox(g,[0,.18,1.1],1.6);const kite=new T.Group();kite.position.set(1.7,3.5,-.8);g.add(kite);const shape=new T.Shape();shape.moveTo(0,1);shape.lineTo(.65,0);shape.lineTo(0,-.85);shape.lineTo(-.65,0);shape.closePath();this.mesh(new T.ShapeGeometry(shape),this.mat('#e6b86f',{side:T.DoubleSide}),kite);const tail=this.mesh(new T.PlaneGeometry(.08,1.3,1,10),this.mat('#c37b5e',{side:T.DoubleSide}),kite,[0,-1.3,0]);this.actors.kite=kite;
    }else if(theme==='ocean'){
      this.backdrop(g,'#306875');this.dunes(g,'#598a85');const whale=new T.Group();whale.position.set(.15,2,.4);g.add(whale);this.sphere(whale,'#77aeb6',[0,0,0],[1.55,.83,.73]);this.sphere(whale,'#c4daca',[0,-.37,.12],[1.3,.34,.61]);for(const side of [-1,1]){const tail=this.mesh(new T.ConeGeometry(.5,1,3),'#689da8',whale,[-1.8,side*.22,0],[1,1,.3]);tail.rotation.z=side*1.1;}this.sphere(whale,'#283e40',[.83,.1,.61],[.065,.065,.035]);this.actors.whale=whale;const bubbles=[];for(let i=0;i<14;i++){const bubble=new T.Mesh(new T.SphereGeometry(.055+i%3*.035,12,9),new T.MeshPhysicalMaterial({color:'#c9e4db',transparent:true,opacity:.23,roughness:.1}));g.add(bubble);bubbles.push(bubble);}this.actors.bubbles=bubbles;
    }else{
      this.backdrop(g);this.stars(g);
      if(page.image){const imageMaterial=new T.MeshStandardMaterial({color:'#fff7e1',side:T.DoubleSide,roughness:.95});const card=this.mesh(new T.PlaneGeometry(4.8,4.4),imageMaterial,g,[.1,2.3,-.5]);card.rotation.x=-.08;new T.TextureLoader().load(page.image,map=>{map.colorSpace=T.SRGBColorSpace;imageMaterial.map=map;imageMaterial.color.set('#ffffff');imageMaterial.needsUpdate=true;if(!this.motion)this.render();});}
      else{this.planet(g);this.prince(g,[0,2.55,.1],.9);}
    }
  }

  disposeGroup(group) {
    if(!group)return;group.userData.disposed=true;
    group.traverse(object=>{object.userData.disposed=true;object.userData.release?.();if(object.geometry&&!object.geometry.userData.shared)object.geometry.dispose();if(object.isSkinnedMesh)object.skeleton?.boneTexture?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){if(material&&!material.userData.shared){for(const value of Object.values(material))if(value?.isTexture&&!value.userData.shared)value.dispose();material.dispose();}}});
    group.traverse(object=>object.customDepthMaterial?.dispose());
    group.removeFromParent();
  }
  setPage(book,page,index,{turn=false,forward=true}={}) {
    if(this.hoverNode)this.hoverNode.userData.hover=false;this.hoverNode=null;this.cursor?.classList.remove('is-visible');this.sparkles?.setTarget(null);this.ottoArt?.hover(null);this.canvas.style.cursor='grab';
    if(this.turn||this.enter)turn=false;
    if(this.turn){this.disposeGroup(this.turn.mesh);this.disposeGroup(this.turn.old);this.turn=null;}
    this.enter=null;this.reader?.classList.remove('is-turning');
    const oldPaper=this.paperState;this.paperState=null;this.bookId=book.id;this.coverBook=book;this.refreshCover();this.page=index;const previous=this.props;previous.visible=true;previous.rotation.x=0;previous.scale.setScalar(1);
    this.props=new T.Group();this.props.position.set(3.55,.85,-.4);this.scene.add(this.props);this.actors={};
    this.paperArt=book.theme==='otto'?this.ottoArt:this.princeArt;this.room.setTheme(book.theme==='otto');
    if(book.theme==='carmela'){this.props.position.set(3.9,this.physical.topY+.012,0);this.room.setWall(book.id);buildCarmelaScene(this,page);}else if(book.theme==='otto'){this.props.position.set(3.9,this.physical.topY+.012,0);this.ottoArt.build(page);}else if(book.theme==='prince'){this.props.position.set(3.9,this.physical.topY+.012,0);this.paperArt.build(page);}else this.buildOtherScene(book,page);
    this.updateFraming();
    if(turn&&this.motion){
      const leaf=this.turningLeaf(forward);leaf.visible=false;
      this.turn={mesh:leaf,start:this.time,forward,old:previous,oldPaper,phase:'fold',duration:timing.fold+timing.page+timing.pop};this.scene.add(leaf);this.props.visible=false;
      if(this.paperState)this.paperArt.fold(this.paperState,0);
      this.reader?.classList.add('is-turning');
    }else{
      this.disposeGroup(previous);
      this.updateLeftPage();
      if(this.paperState&&this.motion){this.enter={start:this.time,duration:timing.pop};this.onSceneArrive();this.paperArt.fold(this.paperState,0);}else if(this.paperState)this.paperArt.fold(this.paperState,1);
    }
    this.canvas.dataset.book=book.id;this.canvas.dataset.scene=page.scene||book.theme||'picture';this.render();
    if(!this.motion)this.settleCamera();
  }
  turningLeaf(forward){
    const pivot=new T.Group();pivot.position.y=.90;
    const geometry=new T.PlaneGeometry(7.75,10.75,36,12);geometry.rotateX(-Math.PI/2);geometry.translate((forward?1:-1)*3.9,.012,0);
    geometry.userData.base=new Float32Array(geometry.attributes.position.array);
    const material=new T.MeshStandardMaterial({map:this.textures.paper,color:'#fff2d0',roughness:1,side:T.DoubleSide});
    const sheet=new T.Mesh(geometry,material);sheet.castShadow=true;sheet.receiveShadow=true;sheet.frustumCulled=false;pivot.add(sheet);pivot.userData.sheet=sheet;pivot.userData.curveX=new Float32Array(37);pivot.userData.curveY=new Float32Array(37);return pivot;
  }
  updateLeftPage(){this.physical.setPage(this.page,(this.coverBook?.pages.length||12)+1);this.props.position.y=this.physical.topY+.012;}
  applyBookPose(){this.physical.setOpen(this.bookOpen);}
  updateFraming(open=this.bookOpen??1){
    if(!this.cameraGoal)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    if(this.view==='shelf'){const portrait=w<h*1.05;this.camera.setViewOffset(w,h,0,portrait?Math.round(h*.13):0,w,h);const hfov=2*Math.atan(Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect),d=clamp(1.9/Math.tan(hfov/2),3.4,portrait?10.2:8)*8;this.lookGoal.set(0,5.6,-20.96);this.cameraGoal.copy(this.lookGoal).addScaledVector(new T.Vector3(0,.42,1).normalize(),d);return;}
    const reader=this.reader,panel=this.bookMotion?this.framingRect:(this.framingRect=reader?.querySelector('.open-book')?.getBoundingClientRect()),portrait=w<h*1.05||w<=900;
    let x=0,freeW=w,freeH=h;
    if(portrait)freeH=Math.max(h*.4,(panel?.top||h*.43)-8);else{x=(panel?.right||w*.405)+12;freeW=Math.max(w*.4,w-x);}
    const y=60,bottom=portrait?24:150,fw=freeW,fh=Math.max(90,freeH-y-bottom),cx=(x+fw/2)/w,cy=(y+fh/2)/h,v=Math.tan(T.MathUtils.degToRad(this.camera.fov/2));
    let distance=Math.max(10.92/(2*v*this.camera.aspect*fw/w),9.36/(2*v*fh/h))*1.04;distance=clamp(distance,14.82,39)*(this.lookCloser ? .62 : 1);
    const k=smooth(open),target=new T.Vector3(3.9,T.MathUtils.lerp(.65,3.276,k),T.MathUtils.lerp(.1,-.78,k));
    const d=T.MathUtils.lerp(portrait?31:24,distance,k),direction=new T.Vector3(.06,.63,1).normalize();
    this.cameraGoal.copy(target).addScaledVector(direction,d);this.lookGoal.copy(target);
    this.camera.setViewOffset(w,h,Math.round(w*(.5-cx)*k),Math.round(h*(.5-cy)*k),w,h);
    const framing=JSON.stringify({free:[Math.round(x),Math.round(y),Math.round(fw),Math.round(fh)],distance:+distance.toFixed(2)});if(this.canvas.dataset.framing!==framing)this.canvas.dataset.framing=framing;
  }
  open(){
    const fromShelf=this.view==='shelf';this.view='reader';this.resize();this.homeShelf?.hide();this.room.setHome(false);if(!this.motion)this.room.settle();this.book.visible=true;this.room.bookDisplayGroup.visible=true;
    this.bookMotion?.resolve?.();this.bookMotion=null;this.finishTurn();this.bookOpen=this.motion?0:1;this.applyBookPose();this.updateFraming();
    this.reader?.classList.remove('book-closing');
    if(this.motion){this.props.visible=false;if(this.paperState)this.paperArt.fold(this.paperState,0);this.bookMotion={type:'open',start:this.time,startedAt:performance.now(),duration:timing.open};this.reader?.classList.add('book-opening');if(!fromShelf)this.settleCamera();this.start();}else this.settleCamera();
  }
  showShelf(){this.sparkles?.clear();this.view='shelf';this.resize();this.homeShelf?.show();this.room.setHome(true);this.room.setTheme(false);if(!this.motion)this.room.settle();this.book.visible=false;this.props.visible=false;this.room.bookDisplayGroup.visible=false;this.orbit={x:0,y:0};this.pointer={x:0,y:0};if(this.hoverNode)this.hoverNode.userData.hover=false;this.hoverNode=null;this.cursor?.classList.remove('is-visible');this.updateFraming();if(!this.motion)this.settleCamera();this.start();}
  close(){
    const wasOpening=this.bookMotion?.type==='open';this.bookMotion?.resolve?.();this.bookMotion=null;this.finishTurn();
    if(!this.motion){this.bookOpen=0;this.applyBookPose();this.props.visible=false;this.updateFraming();this.settleCamera();this.render();return Promise.resolve();}
    this.reader?.classList.remove('book-opening');this.reader?.classList.add('book-closing');this.framingRect=null;
    return new Promise(resolve=>{this.bookMotion={type:'close',start:this.time,startedAt:performance.now(),from:this.bookOpen,fold:wasOpening?0:timing.fold,duration:timing.close,resolve};this.start();});
  }
  finishTurn(){this.updateLeftPage();if(this.turn){this.disposeGroup(this.turn.mesh);this.disposeGroup(this.turn.old);this.turn=null;}this.enter=null;this.props.visible=true;this.props.scale.setScalar(1);this.props.rotation.x=0;if(this.paperState)this.paperArt.fold(this.paperState,1);this.reader?.classList.remove('is-turning');this.canvas.dataset.phase='rest';}
  completeMotion(){const closing=this.bookMotion?.type==='close';this.bookMotion?.resolve?.();this.bookMotion=null;this.bookOpen=closing?0:1;this.applyBookPose();this.reader?.classList.remove('book-opening','book-closing');this.finishTurn();this.props.visible=!closing;this.onSceneArrive();this.updateFraming();this.settleCamera();this.resolveReady();this.render();}
  configure(motion){this.motion=motion;if(!motion)settleCarmela(this);if(!motion)this.sparkles?.clear();this.updateFraming();if(!motion){cancelAnimationFrame(this.raf);for(const p of this.particles)this.disposeGroup(p.group);this.particles=[];this.room?.settle();this.homeShelf?.static();if(this.room?.dust)this.room.dust.visible=false;this.cursor?.classList.remove('is-visible');if(this.view==='shelf'){this.props.visible=false;this.settleCamera();this.render();}else this.completeMotion();}else if(this.active)this.start();}
  get busy(){return !!(this.preparing||this.bookMotion||this.turn||this.enter);}
  whenReady(){return this.busy?new Promise(resolve=>(this.readyWaiters||(this.readyWaiters=[])).push(resolve)):Promise.resolve();}
  resolveReady(){if(!this.busy)for(const resolve of (this.readyWaiters||[]).splice(0))resolve();}
  settleCamera(){this.camera.position.copy(this.cameraGoal);this.camera.position.x+=Math.sin(this.orbit.x)*5;this.camera.position.y+=this.orbit.y*5;this.target.copy(this.lookGoal);this.camera.lookAt(this.target);this.render();}
  start(){if(document.hidden){this.pause();return;}this.active=true;if(this.initializing||this.preparing)return;if(this.motion){cancelAnimationFrame(this.raf);this.last=0;this.raf=requestAnimationFrame(this.frame);}else this.render();}
  pause(){this.active=false;cancelAnimationFrame(this.raf);}
  toggleZoom(){this.lookCloser=!this.lookCloser;this.updateFraming();if(!this.motion)this.settleCamera();this.render();return this.lookCloser;}
  resize(){this.framingRect=null;const rect=this.host.getBoundingClientRect();if(!rect.width||!rect.height)return;const ratio=this.view==='shelf'?Math.min(devicePixelRatio,2,Math.sqrt(6000000/(rect.width*rect.height))):Math.min(devicePixelRatio,1.75,Math.sqrt(5000000/(rect.width*rect.height)));if(this.viewportWidth===rect.width&&this.viewportHeight===rect.height&&this.viewportRatio===ratio)return;this.viewportWidth=rect.width;this.viewportHeight=rect.height;this.viewportRatio=ratio;this.renderer.setDrawingBufferSize(rect.width,rect.height,ratio);this.composer?.setPixelRatio(ratio);this.composer?.setSize(rect.width,rect.height);this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix();this.updateFraming();if(!this.motion){this.room?.settle();this.settleCamera();}this.render();}
  render(){if(this.initializing)return;const now=performance.now(),shadowInterval=this.busy||this.particles.length?1000/60:1000/30;if(!this.shadowRenderedAt||now-this.shadowRenderedAt>=shadowInterval||!this.motion){this.renderer.shadowMap.needsUpdate=true;this.shadowRenderedAt=now;}this.composer?this.composer.render():this.renderer.render(this.scene,this.camera);}

  bindPointer(){
    let down=null;
    this.cursor=document.createElement('div');this.cursor.className='story-pointer';this.cursor.setAttribute('aria-hidden','true');this.cursor.innerHTML='<span>✧</span><small></small>';document.body.append(this.cursor);
    const clearHover=()=>{this.homeShelf?.clearHover();this.ottoArt?.hover(null);if(this.hoverNode)this.hoverNode.userData.hover=false;this.hoverNode=null;this.cursor.classList.remove('is-visible');this.sparkles?.setTarget(null);this.canvas.style.cursor='grab';};
    this.canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY,ox:this.orbit.x,oy:this.orbit.y,lastX:event.clientX};if(this.view==='reader'&&this.paperState?.kind?.startsWith('otto-')&&!this.busy){const hit=this.pick(event),entry=this.ottoArt.entry(hit?.object);if(entry?.onDrag)down.sceneDrag={entry,plane:new T.Plane().setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new T.Vector3()),hit.point)};}this.cursor.classList.add('is-pressed');try{this.canvas.setPointerCapture(event.pointerId);}catch{}});
    this.canvas.addEventListener('pointermove',event=>{
      const rect=this.canvas.getBoundingClientRect();this.pointer.over=true;this.pointer.x=(event.clientX-rect.left)/rect.width-.5;this.pointer.y=(event.clientY-rect.top)/rect.height-.5;
      if(down&&this.view==='shelf'&&this.homeShelf?.api){if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>7){clearHover();this.canvas.style.cursor='grabbing';}this.homeShelf.dragBy((event.clientX-down.lastX)/rect.width*5.6);down.lastX=event.clientX;return;}
      if(down?.sceneDrag){this.ndc.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.ndc,this.camera);const point=this.raycaster.ray.intersectPlane(down.sceneDrag.plane,new T.Vector3());if(point)down.sceneDrag.entry.onDrag(point);this.canvas.style.cursor='grabbing';if(!this.motion){this.ottoArt.animate(this.paperState,.08,this.time);this.render();}return;}
      if(down){const limit=this.view==='reader' ? .22 : .5;this.orbit.x=clamp(down.ox+(event.clientX-down.x)*.003,-limit,limit);this.orbit.y=clamp(down.oy+(event.clientY-down.y)*.002,-.12,.18);if(!this.motion)this.settleCamera();return;}
      if(this.busy){clearHover();return;}if(this.view==='shelf'&&this.homeShelf?.api){const shelfHoverNow=performance.now();if(shelfHoverNow-(this.lastShelfHoverAt||0)<32)return;this.lastShelfHoverAt=shelfHoverNow;const target=this.homeShelf.hover(event);this.sparkles?.setTarget(target,event);this.canvas.style.cursor=target?(this.sparkles?.enabled?'none':'pointer'):'grab';this.cursor.style.left=Math.min(innerWidth-190,event.clientX)+'px';this.cursor.style.top=Math.min(innerHeight-70,event.clientY)+'px';this.cursor.querySelector('small').textContent=target?.label||'';this.cursor.classList.toggle('is-visible',!!target&&event.pointerType!=='touch');if(!this.motion)this.render();return;}const hoverNow=performance.now();if(hoverNow-(this.lastHoverAt||0)<32)return;this.lastHoverAt=hoverNow;const hit=this.pick(event);let node=hit?.object;while(node&&!node.userData.action&&!node.userData.roomAction)node=node.parent;
      if(this.hoverNode&&this.hoverNode!==node)this.hoverNode.userData.hover=false;this.hoverNode=node||null;if(node)node.userData.hover=true;if(this.paperState?.kind?.startsWith('otto-'))this.ottoArt.hover(this.ottoArt.entry(node));
      this.sparkles?.setTarget(node,event);this.canvas.style.cursor=node?(this.sparkles?.enabled?'none':'pointer'):'grab';this.cursor.style.left=Math.min(innerWidth-170,Math.max(14,event.clientX))+'px';this.cursor.style.top=Math.min(innerHeight-70,event.clientY)+'px';
      const labels={prince:'小王子 · 打个招呼',rose:'玫瑰 · 打开玻璃罩',fox:'小狐狸 · 打个招呼',lamp:'路灯 · 轻点开关',well:'水井 · 看看星光',plane:'小飞机 · 准备起飞'};this.cursor.querySelector('small').textContent=node?.userData.label||labels[node?.userData.action]||'';this.cursor.classList.toggle('is-visible',!!node&&event.pointerType!=='touch');
    });
    this.canvas.addEventListener('pointerup',event=>{this.cursor.classList.remove('is-pressed');if(this.canvas.hasPointerCapture(event.pointerId))this.canvas.releasePointerCapture(event.pointerId);if(down){down.sceneDrag?.entry.onDragEnd?.();if(down.sceneDrag&&!this.motion&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>=7){this.ottoArt.settleStatic(this.paperState);this.render();}if(Math.hypot(event.clientX-down.x,event.clientY-down.y)<7)this.interact(event);else if(this.view==='shelf')this.homeShelf?.settle();}down=null;});
    this.canvas.addEventListener('pointercancel',()=>{down?.sceneDrag?.entry.onDragEnd?.();down=null;this.cursor.classList.remove('is-pressed');clearHover();});
    this.canvas.addEventListener('pointerleave',()=>{this.pointer.over=false;if(!down){this.pointer.x=0;this.pointer.y=0;}clearHover();});
    this.canvas.addEventListener('wheel',event=>{if(this.view!=='shelf'||this.busy)return;event.preventDefault();const now=performance.now();if(now-(this.lastShelfWheel||0)<500)return;const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;if(Math.abs(delta)<9)return;this.lastShelfWheel=now;this.homeShelf.scrollTo(this.homeShelf.page+(delta>0?1:-1));},{passive:false});
    // Keyboard access to the same small-object actions; controls reveal on focus.
    const keys=document.createElement('nav');keys.className='room-keys';keys.setAttribute('aria-label','书房里的小物件');for(const [key,g]of Object.entries(this.room.objects)){const button=document.createElement('button');button.textContent=g.userData.label.split(' · ')[0];button.onclick=()=>this.room.interact(key);keys.append(button);}document.body.append(keys);
  }
  pick(event){
    const rect=this.canvas.getBoundingClientRect();this.ndc.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.ndc,this.camera);
    return this.raycaster.intersectObjects([this.book,this.props,this.room.group].filter(o=>o.visible),true).find(hit=>{let node=hit.object;while(node){if(!node.visible)return false;node=node.parent;}return !hit.object.userData.hitTest||hit.object.userData.hitTest(hit.uv);});
  }
  interact(event){
    if(this.turn||this.enter||this.bookMotion)return;
    if(this.view==='shelf'&&this.homeShelf?.activate(event))return;
    const hit=this.pick(event);if(!hit)return;
    let object=hit.object;while(object&&!object.userData.action&&!object.userData.roomAction)object=object.parent;
    if(object?.userData.roomAction){if(object.userData.roomAction==='deskFox'){object.userData.tap=this.time;this.onInteract('小狐狸摇摇尾巴，和你说声你好。');this.canvas.dataset.lastInteraction='room-deskFox';}else this.room.interact(object.userData.roomAction);if(this.motion)this.burst(hit.point);return;}
    if(this.view==='shelf')return;
    const action=object?.userData.action;this.canvas.dataset.lastInteraction=action||'';if(action)this.onCollect(action);
    if(this.paperState){this.paperArt.interact(action,this.time,{point:hit.point});if(this.paperState.kind?.startsWith('otto-')){const message=this.paperState.messages[action];if(message){this.onInteract(message,{silent:!!this.paperArt.usesSceneSound});if(this.motion)this.burst(hit.point);}this.render();return;}const messages={rose:this.paperState.domeOpen?'给玫瑰一点新鲜空气。':'替玫瑰盖好罩子，轻轻说声晚安。',fox:'你好，小狐狸。今天也来陪你坐一会儿。',lamp:this.paperState.lampOn?'为夜晚留一盏灯。':'让路灯也休息一小会儿。',well:'井水里，也装着一路走来的星光。',plane:'小飞机准备好再一次出发。',prince:'小王子在和你打招呼。'};if(messages[action]){this.onInteract(messages[action]);if(this.motion)this.burst(hit.point);}this.render();return;}
    if(action==='rose'){this.actors.domeOpen=!this.actors.domeOpen;this.onInteract(this.actors.domeOpen?'给玫瑰一点新鲜空气。':'替玫瑰盖好罩子，轻轻说声晚安。');}
    if(interactCarmela(this,action)){if(this.motion)this.burst(hit.point);return;}
    if(action==='fox'){this.actors.foxTap=this.time;this.onInteract('你好，小狐狸。今天也来陪你坐一会儿。');}
    if(action==='lamp'){this.actors.lampOn=!this.actors.lampOn;this.onInteract(this.actors.lampOn?'为夜晚留一盏灯。':'让路灯也休息一小会儿。');}
    if(action==='well'){this.actors.bucketUp=!this.actors.bucketUp;this.onInteract('井水里，也装着一路走来的星光。');}
    if(action==='plane'){this.actors.propBoost=this.time;this.onInteract('小飞机准备好再一次出发。');}
    if(action==='prince'){this.actors.princeTap=this.time;this.onInteract('小王子在和你打招呼。');}
    this.burst(hit.point);if(!this.motion)this.render();
  }
  burst(point){const group=new T.Group();this.scene.add(group);for(let i=0;i<12;i++){const star=new T.Mesh(new T.OctahedronGeometry(.06,0),new T.MeshBasicMaterial({color:'#fbe39c',transparent:true,opacity:1}));star.position.copy(point);star.userData.velocity=new T.Vector3(Math.sin(i*2.4)*.9,.8+i%3*.3,Math.cos(i*2.4)*.7);group.add(star);}this.particles.push({group,start:this.time});}

  frame(now){
    if(!this.active||!this.motion)return;
    this.raf=requestAnimationFrame(this.frame);
    const dt=this.last?Math.min(.05,(now-this.last)/1000):.016;this.last=now;this.time+=dt;const t=this.time,a=this.actors;
    if(this.bookMotion){
      const motion=this.bookMotion,age=motion.startedAt===undefined?t-motion.start:Math.max(0,(now-motion.startedAt)/1000);
      if(motion.type==='open'){
        const p=clamp(age/motion.duration,0,1);this.bookOpen=smooth(p);this.props.visible=false;this.canvas.dataset.phase='book-open';
        if(p===1){this.bookMotion=null;this.props.visible=true;if(this.paperState)this.enter={start:t,duration:timing.pop};this.reader?.classList.remove('book-opening');this.onSceneArrive();}
      }else{
        if(age<motion.fold){if(this.paperState)this.paperArt.fold(this.paperState,Math.pow(1-age/motion.fold,2));else this.props.scale.y=Math.max(.001,1-age/motion.fold);}
        else{this.props.visible=false;const p=clamp((age-motion.fold)/motion.duration,0,1);this.bookOpen=motion.from*(1-smooth(p));if(p===1){this.bookMotion=null;this.reader?.classList.remove('book-closing');motion.resolve();}}
        this.canvas.dataset.phase='book-close';
      }
      this.applyBookPose();this.updateFraming();
    }
    const cameraPos=(this.cameraScratch||(this.cameraScratch=new T.Vector3())).copy(this.cameraGoal);cameraPos.x+=Math.sin(this.orbit.x)*5+this.pointer.x*1.87;cameraPos.y+=this.orbit.y*5+this.pointer.y*.94;
    if(this.turn?.phase==='page')cameraPos.y+=Math.sin(clamp((t-this.turn.start-timing.fold)/timing.page,0,1)*Math.PI)*.42;
    this.camera.position.lerp(cameraPos,1-Math.exp(-dt*1.6));this.target.lerp(this.lookGoal,1-Math.exp(-dt*1.6));this.camera.lookAt(this.target);
    if(a.cloud)a.cloud.position.x=-2.1+Math.sin(t*.18)*.45;
    if(a.planet)a.planet.rotation.y=Math.sin(t*.065)*.055;
    if(a.prince){a.prince.rotation.z=Math.sin(t*1.35)*.014;if(a.princeTap&&t-a.princeTap<.8)a.prince.position.y+=Math.sin((t-a.princeTap)*Math.PI/.8)*dt*.08;}
    if(a.scarf){const p=a.scarf.geometry.attributes.position,b=a.scarf.geometry.userData.base;for(let i=0;i<p.count;i++){const x=b[i*3],weight=(x+.85)/1.7;p.setY(i,b[i*3+1]+Math.sin(t*2.3+x*3)*.12*weight);p.setZ(i,Math.cos(t*1.8+x*4)*.13*weight);}p.needsUpdate=true;a.scarf.geometry.computeVertexNormals();}
    if(a.flower)a.flower.rotation.y=Math.sin(t*.7)*.07;
    if(a.dome){const goal=a.domeOpen?2.35:.72;a.dome.position.y=T.MathUtils.lerp(a.dome.position.y,goal,Math.min(1,dt*4));a.dome.rotation.z=T.MathUtils.lerp(a.dome.rotation.z,a.domeOpen ? .15 : 0,Math.min(1,dt*4));}
    if(a.tail)a.tail.rotation.z=-.4+Math.sin(t*2.2)*.12;
    if(a.foxHead)a.foxHead.rotation.z=a.foxTap&&t-a.foxTap<1.3?Math.sin((t-a.foxTap)*9)*.12:Math.sin(t*.8)*.025;
    if(a.wheat)a.wheat.rotation.z=Math.sin(t*.8)*.012;
    if(a.planeProp)a.planeProp.rotation.z+=dt*((a.propBoost&&t-a.propBoost<3)?26:2.2);
    if(a.lampLight){a.lampLight.intensity=a.lampOn?4+Math.sin(t*4)*.13:0;a.lampBulb.material=this.mat(a.lampOn?'#ffe4a2':'#a79a77',{emissive:a.lampOn?'#ffbc4a':'#000000',emissiveIntensity:a.lampOn?2.2:0});}
    if(a.bucket){a.bucket.position.y=T.MathUtils.lerp(a.bucket.position.y,a.bucketUp?2.15:.9,Math.min(1,dt*1.4));const length=2.58-a.bucket.position.y;a.rope.scale.y=Math.max(.1,length/1.5);a.rope.position.y=2.58-length/2;if(a.bucketUp)a.wellWheel.rotation.z+=dt*.7;}
    if(a.birds)for(const {bird,wings,phase}of a.birds){bird.position.set(Math.sin(t*.32+phase)*2.8,3.7+Math.sin(t*.5+phase)*.5,-1.3+Math.cos(t*.32+phase)*.7);wings.forEach((wing,i)=>wing.rotation.z=(i?1:-1)*(Math.PI/2+Math.sin(t*6+phase)*.45));}
    if(a.rabbit)a.rabbit.rotation.z=Math.sin(t*1.5)*.035;
    if(a.moon)a.moon.position.y=3.8+Math.sin(t*.6)*.12;
    if(a.kite){a.kite.rotation.z=Math.sin(t*.9)*.1;a.kite.position.y=3.5+Math.sin(t*.8)*.2;}
    if(a.whale){a.whale.position.y=2+Math.sin(t*.55)*.25;a.whale.rotation.z=Math.sin(t*.55)*.045;}
    if(a.bubbles)a.bubbles.forEach((bubble,i)=>{bubble.position.set(Math.sin(i*2.4+t*.2)*3,.2+((t*.34+i*.49)%4.8),.4+Math.cos(i*1.7)*1.7);});
    if(this.enter){const p=clamp((t-this.enter.start)/this.enter.duration,0,1);this.paperArt.fold(this.paperState,p);this.canvas.dataset.phase='unfold';if(p===1){this.enter=null;this.canvas.dataset.phase='rest';}}
    if(this.turn){
      const turn=this.turn,age=t-turn.start;
      if(age<timing.fold){
        turn.phase='fold';const p=Math.pow(1-clamp(age/timing.fold,0,1),2);
        if(turn.oldPaper)this.paperArt.fold(turn.oldPaper,p);else turn.old.scale.y=Math.max(.01,p);
      }else if(age<timing.fold+timing.page){
        if(turn.phase!=='page'){this.physical.prepareTurn(this.page,(this.coverBook?.pages.length||12)+1);turn.landX=new Float32Array(37);turn.landY=new Float32Array(37);for(let j=0;j<=36;j++){if(turn.forward){const p=this.physical.landing(j/36,this.page);turn.landX[j]=p.x;turn.landY[j]=p.y+.012;}else{turn.landX[j]=7.8*j/36;turn.landY[j]=this.physical.topY+.006;}}this.onPageTurn();}
        turn.phase='page';turn.old.visible=false;turn.mesh.visible=true;this.props.visible=false;
        const p=clamp((age-timing.fold)/timing.page,0,1),theta=Math.PI*smooth(p),curve=turn.mesh.userData,xx=curve.curveX,yy=curve.curveY;
        xx[0]=yy[0]=0;for(let i=1;i<=36;i++){const angle=theta+.65*Math.sin(theta)*Math.sin((i-.5)/36*Math.PI/2);xx[i]=xx[i-1]+7.8/36*Math.cos(angle);yy[i]=yy[i-1]+7.8/36*Math.sin(angle);}
        const geometry=turn.mesh.userData.sheet.geometry,position=geometry.attributes.position,base=geometry.userData.base;
        for(let i=0;i<position.count;i++){const u=clamp(Math.abs(base[i*3])/7.8*36,0,36),lo=Math.floor(u),hi=Math.min(36,lo+1),f=u-lo;let x=(turn.forward?1:-1)*T.MathUtils.lerp(xx[lo],xx[hi],f),y=.90+.012+T.MathUtils.lerp(yy[lo],yy[hi],f);const landX=T.MathUtils.lerp(turn.landX[lo],turn.landX[hi],f),landY=T.MathUtils.lerp(turn.landY[lo],turn.landY[hi],f),settle=Math.pow(clamp((p-.72)/.28,0,1),2);x=T.MathUtils.lerp(x,landX,settle);y=T.MathUtils.lerp(y,landY,settle);const support=this.physical.surfaceY(x);if(support!==null)y=Math.max(y,support+.012);position.setXYZ(i,x,y-.90,base[i*3+2]+Math.sin(p*Math.PI)*Math.sin(u/36*Math.PI)*.045);}
        position.needsUpdate=true;geometry.computeVertexNormals();
      }else{
        if(turn.phase!=='unfold'){this.updateLeftPage();this.onSceneArrive();}turn.phase='unfold';turn.mesh.visible=false;turn.old.visible=false;this.props.visible=true;
        const p=clamp((age-timing.fold-timing.page)/timing.pop,0,1);if(this.paperState)this.paperArt.fold(this.paperState,p);else this.props.scale.y=Math.max(.01,ease(p));
        if(p===1)this.finishTurn();
      }
      this.canvas.dataset.phase=this.turn?turn.phase:'rest';this.canvas.dataset.pageMoving=String(!!this.turn&&turn.mesh.visible);
      this.canvas.dataset.oldSceneVisible=String(turn.old.visible);this.canvas.dataset.newSceneVisible=String(this.props.visible);
    }
    if(this.view==='reader'&&this.paperState)this.paperArt.animate(this.paperState,dt,t);this.animatedActors?.update(dt);animateCarmela(this,t);this.room.update(dt,t);this.homeShelf?.update(dt,t);
    this.resolveReady();
    for(let i=this.particles.length-1;i>=0;i--){const item=this.particles[i],age=t-item.start;for(const star of item.group.children){star.position.addScaledVector(star.userData.velocity,dt);star.material.opacity=Math.max(0,1-age/1.2);star.rotation.y+=dt*2;}if(age>1.2){this.disposeGroup(item.group);this.particles.splice(i,1);}}
    this.canvas.dataset.frames=String((Number(this.canvas.dataset.frames)||0)+1);if(!this.frameStats)this.frameStats={start:now,count:0};this.frameStats.count++;if(now-this.frameStats.start>2000){this.canvas.dataset.fps=(this.frameStats.count*1000/(now-this.frameStats.start)).toFixed(1);this.frameStats={start:now,count:0};}this.render();
  }
}
