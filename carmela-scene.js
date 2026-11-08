import * as T from './vendor/three/build/three.module.js';

export {loadPaperAssets as loadCarmelaArt,buildCarmelaScene,interactCarmela,animateCarmela,narrateCarmela,carmelaPlayback,settleCarmela,carmelaActions} from './carmela-paper.js?v=local-paper5';

function material(color){return new T.MeshStandardMaterial({color,roughness:.86});}
function ball(group,color,position,scale){const m=new T.Mesh(new T.SphereGeometry(1,20,14),material(color));m.position.set(...position);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
function box(group,color,position,size){const m=new T.Mesh(new T.BoxGeometry(...size),material(color));m.position.set(...position);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
export function makeCarmelaHen(){
  const g=new T.Group();g.name='carmela-hen';
  ball(g,'#fff5d8',[0,.8,0],[.5,.62,.4]);ball(g,'#fff8e5',[0,1.45,.03],[.41,.43,.35]);
  const wings=[],feet=[];for(const side of [-1,1]){
    const pivot=new T.Group();pivot.position.set(side*.43,1.0,.03);g.add(pivot);
    const wing=ball(pivot,'#f3e6c5',[side*.05,-.12,.04],[.16,.35,.28]);wing.rotation.z=side*.25;wings.push(pivot);
    ball(g,'#292d2a',[side*.17,1.52,.34],[.063,.083,.043]);ball(g,'#fffef5',[side*.155,1.55,.377],[.018,.024,.012]);
    const foot=ball(g,'#e4a33f',[side*.2,.11,.1],[.16,.08,.26]);foot.rotation.y=-side*.12;feet.push(foot);
  }
  for(let i=0;i<3;i++)ball(g,'#cb4c3b',[(i-1)*.14,1.86+Math.sin(i)*.045,.0],[.115,.18,.095]);
  const beak=new T.Mesh(new T.ConeGeometry(.13,.3,4),material('#e5a23b'));beak.rotation.x=Math.PI/2;beak.position.set(0,1.39,.43);g.add(beak);
  ball(g,'#c45440',[0,1.22,.31],[.08,.11,.065]);
  const satchel=box(g,'#3e817b',[.31,.72,.29],[.38,.35,.15]);satchel.rotation.z=-.15;
  box(g,'#d8bc71',[.3,.77,.38],[.06,.07,.025]);
  for(let i=0;i<3;i++){const tail=ball(g,'#f5e6c6',[(i-1)*.12,.9,-.4],[.1,.3,.16]);tail.rotation.x=-.5;}
  g.userData.wings=wings;g.userData.feet=feet;return g;
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
