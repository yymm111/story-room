import * as T from './vendor/three/build/three.module.js';

const textureCache=new Map();
export function loadCarmelaArt(){
  const url='assets/carmela-art/scenes.jpg';
  if(!textureCache.has(url))textureCache.set(url,new T.TextureLoader().loadAsync(url).then(map=>{
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.userData.shared=true;return map;
  }).catch(error=>{textureCache.delete(url);throw error;}));
  return textureCache.get(url);
}
function material(color){return new T.MeshStandardMaterial({color,roughness:.86});}
function ball(group,color,position,scale){const m=new T.Mesh(new T.SphereGeometry(1,20,14),material(color));m.position.set(...position);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
function box(group,color,position,size){const m=new T.Mesh(new T.BoxGeometry(...size),material(color));m.position.set(...position);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
export function makeCarmelaHen(){
  const g=new T.Group();g.name='carmela-hen';
  ball(g,'#fff5d8',[0,.8,0],[.5,.62,.4]);ball(g,'#fff8e5',[0,1.45,.03],[.41,.43,.35]);
  const wings=[];for(const side of [-1,1]){
    const pivot=new T.Group();pivot.position.set(side*.43,1.0,.03);g.add(pivot);
    const wing=ball(pivot,'#f3e6c5',[side*.05,-.12,.04],[.16,.35,.28]);wing.rotation.z=side*.25;wings.push(pivot);
    ball(g,'#292d2a',[side*.17,1.52,.34],[.063,.083,.043]);ball(g,'#fffef5',[side*.155,1.55,.377],[.018,.024,.012]);
    const foot=ball(g,'#e4a33f',[side*.2,.11,.1],[.16,.08,.26]);foot.rotation.y=-side*.12;
  }
  for(let i=0;i<3;i++)ball(g,'#cb4c3b',[(i-1)*.14,1.86+Math.sin(i)*.045,.0],[.115,.18,.095]);
  const beak=new T.Mesh(new T.ConeGeometry(.13,.3,4),material('#e5a23b'));beak.rotation.x=Math.PI/2;beak.position.set(0,1.39,.43);g.add(beak);
  ball(g,'#c45440',[0,1.22,.31],[.08,.11,.065]);
  const satchel=box(g,'#3e817b',[.31,.72,.29],[.38,.35,.15]);satchel.rotation.z=-.15;
  box(g,'#d8bc71',[.3,.77,.38],[.06,.07,.025]);
  for(let i=0;i<3;i++){const tail=ball(g,'#f5e6c6',[(i-1)*.12,.9,-.4],[.1,.3,.16]);tail.rotation.x=-.5;}
  g.userData.wings=wings;return g;
}
export function makeCarmelaMap(){
  const g=new T.Group();g.name='carmela-map';
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;const c=canvas.getContext('2d');
  c.fillStyle='#f1deb0';c.fillRect(0,0,256,192);c.strokeStyle='#b9935d';c.lineWidth=5;c.strokeRect(9,9,238,174);
  c.strokeStyle='#528d98';c.lineWidth=16;c.beginPath();c.moveTo(15,155);c.bezierCurveTo(65,50,110,195,240,60);c.stroke();
  c.setLineDash([8,7]);c.strokeStyle='#ba5947';c.lineWidth=4;c.beginPath();c.moveTo(35,145);c.quadraticCurveTo(90,35,205,46);c.stroke();c.setLineDash([]);
  c.fillStyle='#6a935a';for(const [x,y]of [[70,62],[175,135],[210,40]]){c.beginPath();c.moveTo(x,y-18);c.lineTo(x-16,y+12);c.lineTo(x+16,y+12);c.closePath();c.fill();}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const face=new T.Mesh(new T.PlaneGeometry(.75,.56),new T.MeshStandardMaterial({map,side:T.DoubleSide,roughness:1}));face.rotation.x=-.25;face.position.y=.3;face.castShadow=true;g.add(face);return g;
}
export function makeCarmelaChime(){
  const g=new T.Group();g.name='carmela-chime';
  box(g,'#ab7c44',[0,1.12,0],[.72,.1,.32]);
  const bells=[];for(let i=0;i<4;i++){
    const pivot=new T.Group();pivot.position.set((i-1.5)*.17,1.08,0);g.add(pivot);
    const string=new T.Mesh(new T.CylinderGeometry(.008,.008,.28,5),material('#d4b67c'));string.position.y=-.14;pivot.add(string);
    const bell=new T.Mesh(new T.CylinderGeometry(.055,.06,.48+(i%2)*.13,9),material(i%2?'#cba263':'#a87a42'));bell.position.y=-.48;pivot.add(bell);bells.push(pivot);
  }
  const loop=new T.Mesh(new T.TorusGeometry(.12,.012,6,20,Math.PI),material('#b8925e'));loop.position.set(0,1.3,0);g.add(loop);
  g.userData.bells=bells;return g;
}
export function makeCarmelaWall(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#afbf94';c.fillRect(0,0,512,512);
  for(let y=56;y<512;y+=128)for(let x=48;x<512;x+=128){
    c.strokeStyle='#798f6f';c.lineWidth=3;c.beginPath();c.moveTo(x,y+26);c.quadraticCurveTo(x+20,y-8,x+6,y-26);c.stroke();
    c.fillStyle='#91a77f';for(const sign of [-1,1]){c.beginPath();c.ellipse(x+sign*10,y+sign*10,8,18,sign*.7,0,Math.PI*2);c.fill();}
    c.fillStyle='#e5ca83';c.beginPath();c.arc(x+55,y+37,5,0,Math.PI*2);c.fill();
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.MirroredRepeatWrapping;map.repeat.set(7,2.6);map.userData.shared=true;return map;
}
export function buildCarmelaScene(stage,page){
  const g=stage.props;const state={kind:page.scene,hen:makeCarmelaHen(),map:makeCarmelaMap(),chime:makeCarmelaChime(),bridge:new T.Group(),tapAt:-100};
  stage.actors.carmela=state;
  const frame=box(g,'#d3b275',[-.5,2.7,-2.05],[7.7,5.76,.14]);frame.castShadow=false;
  const face=new T.Mesh(new T.PlaneGeometry(7.5,5.625),new T.MeshBasicMaterial({color:'#f3e7ca',toneMapped:false}));face.position.set(-.5,2.7,-1.96);g.add(face);
  const owner=g;loadCarmelaArt().then(base=>{
    if(owner.userData.disposed)return;
    const map=base.clone();map.userData.shared=false;map.repeat.set(.5,.25);map.offset.set((page.artIndex%2)*.5,1-(Math.floor(page.artIndex/2)+1)*.25);map.needsUpdate=true;
    face.material.map=map;face.material.color.set('#ffffff');face.material.needsUpdate=true;stage.canvas.dataset.imageReady='true';stage.render();
  }).catch(error=>console.warn('Carmela illustration unavailable',error));
  state.hen.position.set(2.5,.02,.8);state.hen.scale.setScalar(1.25);state.hen.rotation.y=-.23;state.hen.userData.action='carmela-hen';g.add(state.hen);
  state.map.position.set(-2.65,.12,1.5);state.map.scale.setScalar(1.45);state.map.userData.action='carmela-map';g.add(state.map);
  state.chime.position.set(2.5,2.6,-.6);state.chime.scale.setScalar(1.45);state.chime.userData.action='carmela-chime';g.add(state.chime);
  state.bridge.position.set(-.45,.03,1.55);state.bridge.userData.action='carmela-bridge';g.add(state.bridge);
  for(let i=0;i<6;i++)box(state.bridge,i%2?'#cba977':'#b59060',[(i-2.5)*.29,0,0],[.27,.08,.65]);
  for(const x of [-.84,.84])box(state.bridge,'#9d7952',[x,-.03,0],[.08,.22,.74]);
  stage.canvas.dataset.content='carmela-illustrated-adventure';stage.canvas.dataset.artIndex=String(page.artIndex);
}
export function interactCarmela(stage,action){
  const state=stage.actors.carmela;if(!state||!action?.startsWith('carmela-'))return false;
  state.tapAt=stage.time;
  const pin=action.slice(8),messages={hen:'卡梅拉扇扇翅膀：一起去发现新故事吧！',map:'地图记住了小桥、柳树和回家的路。',bridge:'一个按住，一个绑紧。两个朋友就有办法！',chime:'叮，咚！风铃又有了新歌声。'};
  stage.onInteract(messages[pin]||messages.hen);
  if(pin!=='hen')stage.onCollect(pin);
  if(!stage.motion){state.hen.userData.wings.forEach((wing,i)=>wing.rotation.z=i?.35:-.35);stage.render();}
  stage.start();return true;
}
export function animateCarmela(stage,time){
  const state=stage.actors.carmela;if(!state)return;
  const age=time-state.tapAt,tap=age<1.1?Math.sin(age/1.1*Math.PI):0;
  state.hen.position.y=.02+Math.sin(time*2)*.018+tap*.17;
  state.hen.userData.wings.forEach((wing,i)=>wing.rotation.z=(i?1:-1)*(.07+Math.sin(time*2.6)*.04+tap*.65));
  state.chime.userData.bells.forEach((bell,i)=>bell.rotation.z=Math.sin(time*2+i*.8)*(.035+tap*.2));
}
