import * as T from './vendor/three/build/three.module.js';

const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
const cue=(p,a,b)=>{const n=clamp((p-a)/(b-a),0,1);return n*n*(3-2*n);};
const sheets=new Map(),crops=new Map();let ready;
const rigNames=['hen-body','hen-head','hen-wing','hen-foot','rabbit-body','rabbit-head','rabbit-arm','rabbit-foot','frog','mother-body','pinecone','map','ribbon','bottle','bell','chime-top'];
const sceneryNames=['farm','willow','ground','hills'];

// Frame the main painted cutout, ignoring disconnected pigment flecks in an atlas cell.
function cutoutBounds(data,canvasWidth,ox,oy,w,h){
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best={count:0,left:0,top:0,right:w-1,bottom:h-1};
  for(let i=0;i<seen.length;i++){
    if(seen[i])continue;seen[i]=1;const x=i%w,y=Math.floor(i/w);if(data[((oy+y)*canvasWidth+ox+x)*4+3]<64)continue;
    let head=0,tail=1,left=x,right=x,top=y,bottom=y;queue[0]=i;
    while(head<tail){const n=queue[head++],px=n%w,py=Math.floor(n/w);left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
      for(const j of [px>0?n-1:-1,px<w-1?n+1:-1,py>0?n-w:-1,py<h-1?n+w:-1]){if(j<0||seen[j])continue;seen[j]=1;const xx=j%w,yy=Math.floor(j/w);if(data[((oy+yy)*canvasWidth+ox+xx)*4+3]>=64)queue[tail++]=j;}
    }
    if(tail>best.count)best={count:tail,left,top,right,bottom};
  }return best;
}

export function loadPaperAssets(){
  return ready||(ready=Promise.all([
    ['rig','assets/carmela-art/puppet-rig-v1.png',4,rigNames],
    ['scenery','assets/carmela-art/paper-scenery-v1.png',2,sceneryNames]
  ].map(async([key,url,grid,names])=>{
    const texture=await new T.TextureLoader().loadAsync(url);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;texture.userData.shared=true;
    const canvas=document.createElement('canvas');canvas.width=texture.image.width;canvas.height=texture.image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    names.forEach((name,index)=>{
      const col=index%grid,row=Math.floor(index/grid),ox=Math.round(col*canvas.width/grid),oy=Math.round(row*canvas.height/grid);
      const w=Math.round((col+1)*canvas.width/grid)-ox,h=Math.round((row+1)*canvas.height/grid)-oy;
      let {left,top,right,bottom}=cutoutBounds(data,canvas.width,ox,oy,w,h);
      if(right<=left||bottom<=top)throw new Error('Missing paper asset: '+name);
      left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(w-1,right+2);bottom=Math.min(h-1,bottom+2);
      crops.set(name,{base:texture,x:ox+left,y:oy+top,width:right-left+1,height:bottom-top+1,data,canvasWidth:canvas.width,canvasHeight:canvas.height});
    });sheets.set(key,texture);
  })).catch(error=>{ready=null;throw error;}));
}

function paper(name,width,{height,anchor=.5,color='#ffffff',opacity=1}={}){
  const crop=crops.get(name);if(!crop)throw new Error('Paper assets not ready: '+name);
  if(!crop.texture){const map=crop.base.clone();map.repeat.set(crop.width/crop.canvasWidth,crop.height/crop.canvasHeight);map.offset.set(crop.x/crop.canvasWidth,1-(crop.y+crop.height)/crop.canvasHeight);map.userData.shared=true;map.needsUpdate=true;crop.texture=map;}
  const geometry=new T.PlaneGeometry(width,height||width*crop.height/crop.width);if(anchor!==.5)geometry.translate(0,(.5-anchor)*(height||width*crop.height/crop.width),0);
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({map:crop.texture,color,transparent:true,alphaTest:.22,side:T.DoubleSide,toneMapped:false,opacity}));mesh.castShadow=true;
  mesh.userData.hitTest=uv=>{const x=crop.x+Math.min(crop.width-1,Math.floor(uv.x*crop.width)),y=crop.y+Math.min(crop.height-1,Math.floor((1-uv.y)*crop.height));return crop.data[(y*crop.canvasWidth+x)*4+3]>48;};
  return mesh;
}
function group(parent,position=[0,0,0],action){const g=new T.Group();g.position.set(...position);if(action)g.userData.action='carmela-'+action;parent.add(g);return g;}
function put(parent,mesh,position){mesh.position.set(...position);parent.add(mesh);return mesh;}
function part(parent,name,width,position,options){return put(parent,paper(name,width,options),position);}
function opacity(root,value){root.traverse(o=>{if(o.isMesh)o.material.opacity=value;});}
function stroke(parent,points,color='#967b4b',radius=.025){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,32,radius,5,false),new T.MeshBasicMaterial({color,toneMapped:false}));parent.add(mesh);return mesh;}
function drawTexture(draw,width=512,height=256){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;}
function paintedCard(parent,width,height,position,draw){const map=drawTexture(draw),mesh=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,transparent:true,alphaTest:.04,side:T.DoubleSide,toneMapped:false}));return put(parent,mesh,position);}

function hen(parent,mother=false){
  const root=group(parent,[0,.18,1],'hen');root.name=mother?'carmela-mother-paper':'carmela-hen-paper';root.rotation.x=-.28;
  const body=group(root,[0,.73,0]);part(body,mother?'mother-body':'hen-body',1.18,[0,0,0]);
  const feet=[];for(let i=0;i<2;i++){const foot=group(root,[i?.22:-.18,.33,i?-.025:.04]);part(foot,'hen-foot',.35,[0,-.18,0]);feet.push(foot);}
  const head=group(root,[.13,1.12,.06]);part(head,'hen-head',.88,[.04,.34,0]);
  const wings=[];for(let i=0;i<2;i++){const wing=group(root,[i?.16:-.23,1.04,i?.12:-.04]);part(wing,'hen-wing',i?.66:.45,[.08,-.2,0]);wings.push(wing);}
  root.userData={...root.userData,body,head,wings,feet};return root;
}
function rabbit(parent){
  const root=group(parent,[1.9,.2,.8],'bridge');root.name='carmela-rabbit-paper';root.rotation.x=-.28;
  const body=group(root,[0,.67,0]);part(body,'rabbit-body',.87,[0,0,0]);
  const head=group(root,[-.03,1.03,.03]);part(head,'rabbit-head',.92,[0,.43,0]);
  const feet=[];for(let i=0;i<2;i++){const foot=group(root,[i?.18:-.18,.18,.05]);part(foot,'rabbit-foot',.34,[0,0,0]);feet.push(foot);}
  const arms=[];for(let i=0;i<2;i++){const arm=group(root,[i?.27:-.26,.93,.08]);part(arm,'rabbit-arm',.34,[0,-.2,0]);arms.push(arm);}
  root.userData={...root.userData,head,body,arms,feet};return root;
}
function chime(parent){
  const root=group(parent,[1.45,2.1,-.25],'chime');root.rotation.x=-.2;part(root,'chime-top',1.15,[0,1.1,0]);
  const bells=[];for(let i=0;i<4;i++){const pivot=group(root,[(i-1.5)*.23,.99,.025]);part(pivot,'bell',.13,[0,-.47,0],{height:i%2?.92:.78});bells.push(pivot);}
  const clapper=group(root,[0,0,.08]);stroke(clapper,[[0,1.08,0],[0,.22,0]],'#a38256',.013);part(clapper,'pinecone',.38,[0,.13,0]);
  return {root,bells,clapper};
}
function bridge(parent){
  const root=group(parent,[0,.35,.6],'bridge'),planks=[];
  const wood=drawTexture((c,w,h)=>{c.fillStyle='#c9a677';c.fillRect(0,0,w,h);for(let i=0;i<65;i++){c.strokeStyle=i%3?'#96794a66':'#f3d7a680';c.lineWidth=1+(i%3);c.beginPath();c.moveTo(0,i*4);c.bezierCurveTo(w*.3,i*4+Math.sin(i)*6,w*.7,i*4-4,w,i*4);c.stroke();}},512,256);wood.userData.shared=true;
  for(let i=0;i<7;i++){const pivot=group(root,[(i-3)*.44,0,0]);const plank=new T.Mesh(new T.BoxGeometry(.42,.075,1),new T.MeshStandardMaterial({map:wood,color:i%2?'#e8cfa8':'#d9bb8c',roughness:1}));plank.castShadow=plank.receiveShadow=true;pivot.add(plank);planks.push(pivot);}
  for(const z of [-.43,.43]){stroke(root,[[-1.6,.6,z],[-1,.64,z],[0,.55,z],[1,.64,z],[1.6,.6,z]],'#9b7951',.045);for(const x of [-1.6,1.6])stroke(root,[[x,-.15,z],[x,.65,z]],'#a98456',.065);}
  const ties=group(root),rope=group(root);for(const z of [-.28,.28])stroke(ties,[[-.22,.05,z],[0,.1,z],[.22,.05,z],[.19,-.09,z],[-.19,-.09,z],[-.22,.05,z]],'#8a9061',.023);
  stroke(rope,[[-.7,.65,.4],[-.5,.25,.65],[0,.1,.3],[.2,.04,.25]],'#8a9061',.025);ties.visible=rope.visible=false;
  return {root,planks,ties,rope};
}

function scenery(parent,kind){
  const hills=part(parent,'hills',8.5,[-.3,2.4,-2.35],{height:4.8,color:kind==='home'?'#ffddb6':'#ffffff'});hills.castShadow=false;
  const ground=part(parent,'ground',8,[-.3,.16,.15]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;ground.receiveShadow=true;
  let farm,tree;
  if(['farm','map','home'].includes(kind)){farm=part(parent,'farm',3.65,[-2.4,.18,-1.05],{anchor:0,color:kind==='home'?'#ffe1b8':'#ffffff'});farm.rotation.x=-.12;}
  if(['farm','willow','chime'].includes(kind)){tree=group(parent,[2.15,.15,-1.35]);part(tree,'willow',kind==='farm'?3:4.6,[0,0,0],{anchor:0});tree.rotation.x=-.1;}
  const river=group(parent,[0,.19,0]);river.visible=['stream','bridge','repair'].includes(kind);
  const water=paintedCard(river,1.9,4.5,[0,0,0],(c,w,h)=>{
    c.beginPath();c.moveTo(w*.26,0);c.bezierCurveTo(w*.1,h*.3,w*.3,h*.5,w*.16,h);c.lineTo(w*.85,h);c.bezierCurveTo(w*.7,h*.65,w*.96,h*.3,w*.72,0);c.closePath();c.save();c.clip();
    const wash=c.createLinearGradient(0,0,w,0);wash.addColorStop(0,'#91b5a7');wash.addColorStop(.5,'#b4d4cd');wash.addColorStop(1,'#7caaa9');c.fillStyle=wash;c.fillRect(0,0,w,h);
    for(let i=0;i<140;i++){const x=(Math.sin(i*17.1)*.5+.5)*w,y=(Math.cos(i*12.7)*.5+.5)*h;c.fillStyle=i%3?'#dce9d31c':'#438d9b17';c.beginPath();c.ellipse(x,y,20+i%19,2+i%5,0,0,Math.PI*2);c.fill();}
    c.strokeStyle='#e7eed8';c.lineWidth=1.5;for(let i=0;i<12;i++){c.beginPath();c.moveTo(w*.3+(i%3)*w*.15,i*h/12);c.quadraticCurveTo(w*.36+(i%3)*w*.15,i*h/12-3,w*.42+(i%3)*w*.15,i*h/12);c.stroke();}c.restore();
  });water.rotation.x=-Math.PI/2;
  const ripples=[];for(let i=0;i<5;i++){const wave=paintedCard(river,.25,.09,[0,.015,0],(c,w,h)=>{c.strokeStyle='#fff6d1';c.lineWidth=5;c.beginPath();c.moveTo(w*.1,h*.55);c.quadraticCurveTo(w*.5,h*.25,w*.9,h*.55);c.stroke();});wave.rotation.x=-Math.PI/2;wave.castShadow=false;ripples.push(wave);}
  const pollen=[];for(let i=0;i<7;i++){const speck=paintedCard(parent,.055,.055,[-3+i,.4+(i%3)*.75,.6],(c,w,h)=>{c.fillStyle='#ffe7a9';c.beginPath();c.arc(w/2,h/2,80,0,Math.PI*2);c.fill();});speck.castShadow=false;pollen.push(speck);}
  return {hills,ground,farm,tree,water,ripples,pollen};
}

const pageActions={farm:['discover','听听风铃的秘密'],map:['map','帮卡梅拉收拾背包'],stream:['frog','请阿滴指一条路'],bridge:['bridge','看看松动的木板'],repair:['bridge','和麦麦一起修桥'],willow:['chime','轻轻解开铃绳'],chime:['chime','让松果唱首歌'],home:['map','再走一遍回家的路']};
export function carmelaActions(kind){return [['hen','和卡梅拉打招呼'],pageActions[kind]||['replay','再演一遍']];}

export function buildCarmelaScene(stage,page){
  const parent=stage.props,kind=page.scene;
  const s={kind,progress:stage.motion?0:1,target:stage.motion?0:1,mode:'preview',elapsed:0,playing:false,advancing:false,tapAt:-100,lastTime:stage.time,completed:false,poseTime:0};stage.actors.carmela=s;
  Object.assign(s,scenery(parent,kind));s.hen=hen(parent);
  if(['farm','map','home'].includes(kind)){s.mother=hen(parent,true);s.mother.position.set(-2.65,.2,-.1);s.mother.scale.setScalar(.93);s.mother.visible=kind!=='farm';}
  if(['bridge','repair','willow','chime','home'].includes(kind))s.rabbit=rabbit(parent);
  if(['map','home'].includes(kind)){s.map=part(parent,'map',1.15,[-.8,.7,1.25]);s.map.userData.action='carmela-map';}
  if(kind==='map'){s.bottle=part(parent,'bottle',.35,[.2,.4,1.2]);s.packingRibbon=part(parent,'ribbon',.55,[.8,.3,1.25]);}
  if(kind==='stream'){
    s.frog=group(parent,[1,.2,.4],'frog');part(s.frog,'frog',.8,[0,.33,0]);s.frog.rotation.x=-.25;
    s.sign=group(parent,[1.9,.2,.6],'map');stroke(s.sign,[[0,0,0],[0,1.65,0]],'#8b7651',.035);s.ribbonTail=part(s.sign,'ribbon',.5,[0,1.35,.02]);
  }
  if(['bridge','repair'].includes(kind))s.bridge=bridge(parent);
  if(['farm','willow','chime'].includes(kind)){s.chime=chime(parent);s.chime.root.scale.setScalar(kind==='farm'?.65:1);s.chime.root.position.set(kind==='farm'?1.7:1.3,kind==='farm'?2.3:1.85,-.15);s.chime.clapper.visible=kind==='chime';}
  if(kind==='willow'){
    s.branch=group(parent,[1.3,2.65,-.05],'chime');stroke(s.branch,[[-.75,-.1,0],[0,0,0],[.6,.35,0]],'#977345',.04);stroke(s.branch,[[.1,.05,0],[.28,.4,0]],'#977345',.025);
    s.knot=group(parent,[1.3,2.6,.03]);stroke(s.knot,[[-.2,0,0],[0,.2,0],[.2,0,0],[0,-.13,0],[-.2,0,0]],'#ac965d',.018);
  }
  if(kind==='farm')s.question=paintedCard(parent,.48,.7,[.65,2.6,1.05],(c,w,h)=>{c.fillStyle='#b16b36';c.font='bold 220px Georgia';c.textAlign='center';c.fillText('?',w/2,h*.85);});
  stage.canvas.dataset.content='carmela-watercolor-puppets';stage.canvas.dataset.imageReady='true';stage.canvas.dataset.artIndex=String(page.artIndex);
  pose(stage,s,stage.time);
}

export function narrateCarmela(stage,progress){const s=stage?.actors.carmela;if(!s)return;s.mode='narration';s.target=clamp(progress,0,1);if(progress===0){s.progress=0;s.completed=false;}if(!stage.motion){s.progress=s.target;pose(stage,s,stage.time);stage.render();}}
export function carmelaPlayback(stage,playing){const s=stage?.actors.carmela;if(s)s.playing=playing;}
export function settleCarmela(stage){const s=stage?.actors.carmela;if(!s)return;s.progress=s.target;s.advancing=false;pose(stage,s,stage.time);}
export function interactCarmela(stage,action){
  const s=stage?.actors.carmela;if(!s||!action?.startsWith('carmela-'))return false;
  const primary=action!=='carmela-hen';s.tapAt=stage.time;
  if(primary){s.progress=s.target=s.elapsed=0;s.mode='replay';s.completed=false;}
  stage.onInteract(primary?'再看一遍，看看朋友们是怎样想出办法的。':'卡梅拉轻轻挥挥翅膀，和你打招呼。',{storyReplay:primary});
  if(!stage.motion){if(primary)s.progress=s.target=1;pose(stage,s,stage.time);stage.render();}stage.start();return true;
}

function pose(stage,s,time){
  const p=s.progress,kind=s.kind,active=stage.motion&&(s.mode!=='narration'||s.playing),t=stage.motion?time:0;
  if(active)s.poseTime=time;const actionTime=stage.motion?s.poseTime:0;
  const step=(a,b)=>s.advancing&&p>a&&p<b?Math.sin(actionTime*9):0;
  const actorScale=(stage.host?.clientWidth||innerWidth)<=900?1.2:1;
  const h=s.hen,r=s.rabbit;h.position.set(-1.55,.2,1);h.scale.setScalar(1.12*actorScale);h.rotation.set(-.28,0,0);opacity(h,1);
  if(s.mother)s.mother.scale.setScalar(.93*actorScale);
  let gait=0,reach=0,nod=0,lean=0,flip=1;
  if(r){r.position.set(1.9,.2,.8);r.rotation.set(-.28,0,0);r.scale.set(-1.02*actorScale,1.02*actorScale,1.02*actorScale);r.userData.arms.forEach(a=>a.rotation.set(0,0,0));}
  if(kind==='farm'){
    const listen=cue(p,.14,.4);nod=-Math.sin(listen*Math.PI)*.16;lean=Math.sin(listen*Math.PI)*.06;
    h.position.x=lerp(-.7,.15,cue(p,.65,.98));gait=step(.65,.98);reach=Math.sin(cue(p,.4,.62)*Math.PI)*.22;
    const wonder=cue(p,.34,.5)*(1-cue(p,.72,.9));s.question.scale.setScalar(Math.max(.001,wonder));s.question.position.y=2.55+wonder*.12;
  }else if(kind==='map'){
    const unfold=cue(p,.04,.16),pack=cue(p,.2,.46),leave=cue(p,.66,.98);h.position.x=lerp(-1.1,1.8,leave);gait=step(.66,.98);reach=Math.sin(pack*Math.PI)*.7;
    s.map.position.set(lerp(-.7,-.9,pack),.8+Math.sin(pack*Math.PI)*.25,1.22);s.map.scale.setScalar(Math.max(.001,unfold*(1-cue(p,.38,.5)*.97)));s.map.rotation.z=-pack*.25;
    for(const [object,start,x]of [[s.bottle,.26,.2],[s.packingRibbon,.4,.8]]){const v=cue(p,start,start+.2);object.position.set(lerp(x,-.85,v),.36+Math.sin(v*Math.PI)*.65+v*.3,1.24);object.scale.setScalar(1-v*.99);}
    s.mother.userData.wings[1].rotation.z=-.28+Math.sin(t*2.8)*.1;s.mother.userData.head.rotation.z=-.05;
  }else if(kind==='stream'){
    const jump=cue(p,.25,.48);h.position.x=lerp(-2.05,-1.2,cue(p,.02,.2));gait=step(.02,.2);nod=Math.sin(cue(p,.42,.64)*Math.PI)*.12;
    s.frog.position.set(lerp(1.35,.7,jump),.2+Math.sin(jump*Math.PI)*.85+jump*.17,.5);s.frog.scale.set(1+Math.sin(jump*Math.PI)*.12,1-Math.sin(jump*Math.PI)*.13,1);
    s.ribbonTail.scale.setScalar(Math.max(.001,cue(p,.67,.86)));s.ribbonTail.rotation.z=stage.motion?Math.sin(t*2)*.07:0;reach=cue(p,.65,.8)*.5;
  }else if(kind==='bridge'||kind==='repair'){
    const fix=kind==='repair'?cue(p,.22,.64):0,cross=kind==='repair'?cue(p,.76,.98):0;
    h.position.x=kind==='repair'?lerp(-1,1.9,cross):lerp(-2.4,-1.85,cue(p,.06,.28));gait=kind==='repair'?step(.76,.98):step(.06,.28);
    reach=kind==='repair'?Math.sin(fix*Math.PI)*.95:.12;nod=kind==='repair'?Math.sin(fix*Math.PI)*.17:.08;lean=kind==='repair'?-Math.sin(fix*Math.PI)*.12:0;
    s.bridge.planks[3].rotation.z=(1-fix)*(.27+Math.sin(actionTime*3)*.045);s.bridge.planks[3].position.y=(1-fix)*.09;
    s.bridge.ties.visible=kind==='repair'&&p>.46;s.bridge.ties.scale.setScalar(Math.max(.001,cue(p,.46,.64)));s.bridge.rope.visible=kind==='repair'&&p>.2&&p<.67;s.bridge.rope.scale.y=1-fix*.7;
    r.position.set(kind==='repair'?lerp(.85,2.7,cross):1.85,.2,.72);r.userData.arms[1].rotation.z=(1-cross)*fix*.95;r.userData.head.rotation.z=fix*(1-cross)*.14;
  }else if(kind==='willow'){
    const up=cue(p,.15,.34),free=cue(p,.43,.75);h.position.set(.6,.2+up*.14,1);reach=up*1.5;nod=-up*.16;
    r.position.set(2.05,.2,.85);r.userData.arms[1].rotation.z=1.1;r.userData.head.rotation.z=.1;
    s.branch.position.set(1.3-free*.65,2.65-free*free*2.3,-.05);s.branch.rotation.z=-free*.85;s.knot.scale.setScalar(Math.max(.001,1-free));s.knot.visible=free<1;
  }else if(kind==='chime'){
    const lift=cue(p,.22,.58),happy=cue(p,.7,.98);h.position.set(.1,.2+Math.sin(happy*Math.PI*2)**2*.12,1);reach=lift*1.35*(1-happy*.6);nod=-lift*.12;
    r.position.set(2.2,.2+Math.sin(happy*Math.PI*2+.5)**2*.1,.85);r.userData.arms[1].rotation.z=.4+Math.sin(happy*Math.PI)*.35;r.userData.head.rotation.z=Math.sin(happy*Math.PI)*-.1;
    s.chime.clapper.position.set(lerp(-.9,0,lift),lerp(-1.55,0,lift),lerp(1.15,0,lift));s.chime.clapper.rotation.z=lift===1?Math.sin(t*3.6)*.18:0;
  }else if(kind==='home'){
    const arrive=cue(p,.02,.36),draw=cue(p,.43,.66),sleep=cue(p,.85,1);flip=-1;h.position.set(lerp(1.5,-1.1,arrive)-sleep*.9,.2,1);gait=step(.02,.36);nod=sleep*.15;
    r.position.x=lerp(2.7,.55,arrive);s.map.position.set(-.9,.8-sleep*.5,1.3);s.map.scale.setScalar(Math.max(.001,draw*(1-sleep)*1.2));s.map.rotation.z=-.1;opacity(h,1-sleep);s.mother.userData.wings[1].rotation.z=-.35;
  }
  const wave=stage.motion&&time-s.tapAt<1.7?Math.sin((time-s.tapAt)*7)*Math.sin((time-s.tapAt)/1.7*Math.PI)*.5:0;
  h.scale.x*=flip;h.position.y+=Math.abs(gait)*.035;h.rotation.z=lean+gait*.018;h.userData.head.rotation.z=nod+(stage.motion?Math.sin(t*1.4)*.012:0);
  h.userData.body.rotation.z=-gait*.025;h.userData.wings[1].rotation.z=reach+wave+(stage.motion?Math.sin(t*1.6)*.015:0);h.userData.wings[0].rotation.z=reach*.12;
  h.userData.feet.forEach((foot,i)=>{const v=gait*(i?1:-1);foot.rotation.z=v*.18;foot.position.y=.33+Math.max(0,v)*.075;foot.position.x=(i?.22:-.18)+v*.04;});
  if(s.chime){const amplitude=kind==='chime'&&p>.6?.14:0;s.chime.bells.forEach((bell,i)=>bell.rotation.z=Math.sin(t*3.6-i*.65)*amplitude);}
  if(s.tree)s.tree.rotation.z=stage.motion?Math.sin(t*.75)*.008:0;
  s.ripples.forEach((wave,i)=>{const phase=((stage.motion?t*.12:0)+i*.2)%1;wave.position.set(Math.sin(i*2)*.28,.015,-2+phase*4);wave.material.opacity=Math.sin(phase*Math.PI)*.55;});
  s.pollen.forEach((speck,i)=>{speck.position.y=.4+(i%3)*.75+(stage.motion?Math.sin(t*.5+i)*.13:0);speck.material.opacity=stage.motion?.28+Math.sin(t*.7+i)**2*.25:.3;});
  if(p>.89&&!s.completed){s.completed=true;const pin={map:'map',repair:'bridge',chime:'chime'}[kind];if(pin)stage.onCollect(pin);}
  if(kind==='chime'&&p>.61&&!s.sounded){s.sounded=true;if(stage.motion)stage.onSceneSound('chime',[]);}else if(p<.2)s.sounded=false;
  Object.assign(stage.canvas.dataset,{carmelaScene:kind,carmelaProgress:p.toFixed(3),carmelaMode:s.mode});
}

export function animateCarmela(stage,time){
  const s=stage.actors.carmela;if(!s)return;const dt=Math.min(.05,Math.max(0,time-s.lastTime));s.lastTime=time;
  if(stage.view!=='reader'||stage.busy||!stage.props.visible)return;
  if(stage.motion){if(s.mode!=='narration'){s.elapsed+=dt;s.target=clamp((s.elapsed-1.1)/(s.mode==='replay'?10:15),0,1);}const previous=s.progress;if(s.mode!=='narration'||s.playing)s.progress=lerp(s.progress,s.target,1-Math.exp(-dt*8));if(Math.abs(s.progress-s.target)<.00005)s.progress=s.target;s.advancing=Math.abs(previous-s.progress)>.00001;}
  pose(stage,s,time);
}
