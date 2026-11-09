// Original procedural dioramas. No third-party story text, audio, or artwork.
import * as T from './vendor/three/build/three.module.js';

const NIA = ['door','meadow','letgo','river','hill','cloud','oak','festival','choice','home'];
const FIN = ['reef','dive','kelp','crab','deep','ship','whale','plankton','light','home'];
const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;};
function action(node,key,label,message,state){node.userData.action=key;node.userData.label=label;state.messages[key]=message;(state.targets[key]||=[]).push(node);return node;}
function rod(s,p,color,a,b,r=.035){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const m=s.cylinder(p,color,av.clone().add(bv).multiplyScalar(.5).toArray(),r,r,d.length(),8);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
function line(s,p,points,color,r=.014){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return s.mesh(new T.TubeGeometry(curve,24,r,5,false),color,p);}
function rabbit(s,p){
  const g=group(p);s.sphere(g,'#e8bb5b',[0,.67,0],[.44,.59,.35]);
  for(const side of [-1,1]){s.sphere(g,'#a18a79',[side*.22,.12,.16],[.19,.12,.3]);const arm=s.sphere(g,'#e8bb5b',[side*.44,.7,0],[.13,.34,.15]);arm.rotation.z=side*.23;}
  s.sphere(g,'#c5b7a4',[0,.52,-.35],[.19,.19,.18]);
  const head=group(g,0,1.34,.08);s.sphere(head,'#a99583',[0,0,0],[.38,.38,.34]);
  for(const side of [-1,1]){const ear=group(head,side*.18,.3,0);ear.rotation.z=side*-.13;s.sphere(ear,'#a99583',[0,.35,0],[.13,.46,.11]);s.sphere(ear,'#d3afa2',[0,.36,.085],[.07,.34,.035]);s.sphere(head,'#343b36',[side*.13,.04,.31],[.036,.047,.023]);s.sphere(head,'#ffffff',[side*.12,.055,.33],[.011,.013,.008]);s.sphere(head,'#cbb9a3',[side*.09,-.12,.3],[.12,.1,.07]);}
  s.sphere(head,'#806759',[0,-.08,.38],[.055,.042,.025]);s.box(g,'#c85f4f',[0,1.04,.08],[.52,.16,.46]);const scarf=s.box(g,'#c85f4f',[.26,.86,.32],[.15,.4,.07]);scarf.rotation.z=.18;
  g.userData.head=head;return g;
}
function turtle(s,p,color='#70a68c',scale=1){
  const g=group(p);s.sphere(g,'#427d70',[0,0,0],[.64,.32,.77]);s.sphere(g,'#a6ba75',[0,.14,.02],[.51,.24,.63]);
  for(let i=0;i<5;i++)s.sphere(g,'#73995c',[Math.sin(i*2.4)*.26,.33,Math.cos(i*2.4)*.36],[.17,.055,.19]);
  s.sphere(g,color,[0,-.02,.88],[.3,.24,.32]);
  for(const side of [-1,1]){s.sphere(g,'#203d39',[side*.14,.07,1.13],[.035,.044,.025]);s.sphere(g,'#fff7db',[side*.13,.083,1.15],[.011,.012,.009]);}
  const fins=[];for(let i=0;i<4;i++){const side=i%2?1:-1;const fin=group(g,side*.48,-.06,i<2?.38:-.48);s.sphere(fin,color,[side*.12,0,0],[.34,.07,.19]);fins.push(fin);}g.userData.fins=fins;g.scale.setScalar(scale);return g;
}
function kite(s,p){const g=group(p);const points=[[0,.8],[.56,0],[0,-.68],[-.56,0]];for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(...a);shape.lineTo(...b);shape.closePath();s.mesh(new T.ShapeGeometry(shape),s.mat(['#e98661','#f3d185','#7eb9b0','#e9b47e'][i],{side:T.DoubleSide}),g);}
  rod(s,g,'#b79060',[0,-.68,.015],[0,.8,.015],.015);rod(s,g,'#b79060',[-.56,0,.015],[.56,0,.015],.015);
  line(s,g,[[0,-.68,0],[.18,-1.02,.04],[-.12,-1.35,0],[.08,-1.7,.02]],'#d69a76');for(let i=0;i<3;i++){const bow=s.mesh(new T.ConeGeometry(.12,.3,3),s.mat('#d78265',{side:T.DoubleSide}),g,[i%2?-.08:.09,-.95-i*.27,0],[1,.5,.15]);bow.rotation.z=Math.PI/2;}return g;}
function tree(s,p,x=2.2,z=-1.5){const g=group(p,x,0,z);rod(s,g,'#99704b',[0,0,0],[.08,2.8,0],.14);for(const side of [-1,1])rod(s,g,'#99704b',[0,1.5,0],[side*.75,2.4,0],.07);for(let i=0;i<6;i++)s.sphere(g,['#7d9c6b','#99b57d','#b3c28a'][i%3],[Math.sin(i*2.4)*.8,2.65+Math.cos(i*2.4)*.45,Math.cos(i*1.4)*.25],[.73,.6,.46]);return g;}
function cloud(s,p,x,y,z){const g=group(p,x,y,z);for(let i=0;i<4;i++)s.sphere(g,'#fff3df',[(i-1.5)*.38,Math.sin(i)*.13,0],[.44,.26+(i%2)*.1,.2]);return g;}
function flower(s,p,x,z,color){rod(s,p,'#718c5a',[x,.1,z],[x,.43,z],.015);for(let i=0;i<5;i++)s.sphere(p,color,[x+Math.sin(i*1.256)*.09,.45+Math.cos(i*1.256)*.09,z],[.06,.06,.04]);s.sphere(p,'#f0cf72',[x,.45,z+.03],[.045,.045,.03]);}
function coral(s,p,x,z,color,height=1){const g=group(p,x,0,z);for(let i=0;i<3;i++){const a=(i-1)*.3;rod(s,g,color,[0,.03,0],[a,height*(.65+i*.15),i%2*.16],.07);rod(s,g,color,[a*.5,height*.45,0],[a+.23,height*.7,-.12],.045);}return g;}
function fish(s,p,x,y,z,color){const g=group(p,x,y,z);s.sphere(g,color,[0,0,0],[.29,.16,.12]);const tail=s.mesh(new T.ConeGeometry(.18,.27,3),color,g,[-.34,0,0],[1,1,.45]);tail.rotation.z=-Math.PI/2;s.sphere(g,'#253e4d',[.17,.04,.11],[.025,.027,.015]);return g;}
function shell(s,p,x,z){const g=group(p,x,.16,z);for(let i=0;i<7;i++){const a=(i-3)*.23;const rib=s.sphere(g,i%2?'#e7bdad':'#f7d7bd',[Math.sin(a)*.25,.15,Math.cos(a)*-.22],[.12,.08,.42]);rib.rotation.y=a;}return g;}
function jelly(s,p,x,y,z){const g=group(p,x,y,z);s.sphere(g,'#c6b2db',[0,0,0],[.44,.25,.36]);s.sphere(g,'#f1d5ed',[0,-.06,.06],[.36,.12,.3]);for(let i=0;i<5;i++)line(s,g,[[(i-2)*.12,-.1,0],[(i-2)*.13+.06,-.45,.05],[(i-2)*.1,-.85,0]],'#c8b8df',.018);return g;}

function buildNia(s,state,index){const p=s.props;
  s.backdrop(p,index===9?'#dcb6a0':'#a3c8cb',true);s.actors.cloud=null;
  s.box(p,'#a5b77c',[0,.03,0],[7.4,.1,6.6]);
  for(let i=0;i<3;i++)s.sphere(p,['#94ac73','#b4c58b','#8da875'][i],[i*2.3-2.3,.05,-2.5],[1.8,.55+i*.12,.8]);
  state.clouds=[cloud(s,p,-2.3,4,-2.9),cloud(s,p,1.4,4.5,-3)];
  const hero=rabbit(s,p);hero.position.set([-1.7,-1.5,-2,-.9,-1.2,-1.8,-1.6,-.7,.8,-.8][index],.12,1.25);hero.rotation.y=.18;state.hero=hero;
  action(hero,'nia-hello','妮娅 · 打个招呼','妮娅竖起长耳朵，向你点点头。',state);
  const k=kite(s,p);k.position.set([.8,1.3,1.6,.9,1.1,1.8,2.2,1.1,.3,1][index],[2.7,3.5,3.1,3.4,3.7,4.1,2.9,2.4,2.8,3.1][index],-.6);state.kite=k;
  action(k,'nia-kite','风筝 · 轻轻拉一拉','彩色风筝转了一圈，长尾巴在风里画出弧线。',state);
  for(let i=0;i<11;i++)flower(s,p,-3.2+(i*.67)%6.4,.4+(i*1.3)%2.2,i%2?'#eab698':'#ece0aa');
  if([3].includes(index)){s.box(p,'#72b8bf',[.4,.11,.1],[1.65,.045,5.9]);for(let i=0;i<9;i++)s.box(p,'#b7e0d9',[.1+Math.sin(i)*.4,.14,i*.6-2.5],[.4,.012,.035]);}
  if(index===3){const bridge=group(p,.4,.35,.5);for(let i=0;i<9;i++)s.box(bridge,'#bb9367',[(i-4)*.3,.18*Math.sin(i/8*Math.PI),0],[.28,.11,1.3]);for(const z of [-.57,.57]){rod(s,bridge,'#9d794f',[-1.2,.48,z],[1.2,.48,z],.045);for(const x of [-1.2,1.2])rod(s,bridge,'#9d794f',[x,0,z],[x,.65,z],.045);}}
  if(index===4){s.sphere(p,'#92ad75',[1.4,.1,-.4],[1.8,1.35,1.7]);k.position.y=4;}
  if([0,6,9].includes(index)){const tr=tree(s,p);action(tr,'nia-tree','大树 · 听听叶子','树叶沙沙响，好像在鼓励妮娅再试一次。',state);}
  if(index===5)for(let i=0;i<4;i++)state.clouds.push(cloud(s,p,-2.4+i*1.6,2.3+(i%2)*.55,-1.4));
  if(index===7)for(let i=0;i<4;i++){const extra=kite(s,p);extra.position.set(-2.6+i*1.6,2.6+i%2,-1.3);extra.scale.setScalar(.6);action(extra,'nia-kite','风筝 · 一起飞','风筝们在风里跳起了轻快的舞。',state);}
  if(index===8){k.position.set(.7,1.5,.6);hero.position.x=-.65;}
  if(index===0||index===9){const house=group(p,-2.25,.1,-1.7);s.box(house,'#efcea1',[0,.62,0],[1.3,1.2,1]);const roof=s.mesh(new T.ConeGeometry(1.05,.65,4),'#bb7864',house,[0,1.5,0],[1,1,.85]);roof.rotation.y=Math.PI/4;s.box(house,'#8b9476',[0,.4,.51],[.35,.8,.03]);s.box(house,'#f8df9d',[.4,.85,.52],[.25,.3,.03]);}
  state.key=NIA[index];
}
function buildFin(s,state,index){const p=s.props;
  s.backdrop(p,['#458e9b','#418796','#3d8291','#367b8b','#386e85','#326779','#31596f','#386b7e','#438591','#53939b'][index],true);s.actors.cloud=null;
  s.box(p,'#d4c295',[0,.04,0],[7.4,.1,6.6]);
  for(let i=0;i<7;i++)s.sphere(p,'#c5b78e',[-3.1+i*.95,.11,-2.3+Math.sin(i)],[.65,.25,.5]);
  const hero=turtle(s,p);hero.position.set(-.85,1.2,1);hero.rotation.y=.35;state.hero=hero;
  action(hero,'fin-hello','芬恩 · 打个招呼','芬恩挥挥鳍，邀请你一起慢慢游。',state);
  for(let i=0;i<6;i++)coral(s,p,-3.1+i*1.2,-1.8+(i%2)*.65,['#d69591','#bb91b0','#d7b177'][i%3],.7+(i%3)*.35);
  state.fish=[];const count=[2,7,2,4,2,3,1,3,7,5][index];for(let i=0;i<count;i++){const f=fish(s,p,-2.7+(i*.9)%5.5,2.4+(i%3)*.5,-1.1+(i%2)*.5,i%2?'#e7ba77':'#93c5be');state.fish.push(f);action(f,'fin-fish','小鱼 · 一起游','小鱼排成弯弯的队伍，闪过一片温柔的光。',state);}
  const sh=shell(s,p,1.7,.9);state.shell=sh;action(sh,'fin-shell','贝壳 · 轻轻打开','贝壳里藏着一颗亮晶晶的小珍珠。',state);state.pearl=s.sphere(sh,'#f8edb9',[0,.24,-.1],[.13,.13,.13]);
  state.jellies=[];if([4,7,8].includes(index))for(let i=0;i<3;i++){const j=jelly(s,p,-2.4+i*2.1,3.2+i%2*.7,-1.4);state.jellies.push(j);action(j,'fin-jelly','水母 · 点亮微光','水母的小灯一闪一闪，照亮了前方。',state);}
  const lantern=group(p,1.2,1.1,-.25);state.lantern=lantern;
  s.cylinder(lantern,'#8eaa99',[0,0,0],.29,.32,.52,18);s.cylinder(lantern,'#c8b178',[0,.32,0],.31,.31,.1,18);
  const glow=s.sphere(lantern,'#ffe6a1',[0,.06,.25],[.19,.2,.08]);state.glow=glow;glow.material=s.mat('#ffe6a1',{emissive:'#ffd275',emissiveIntensity:.6});
  const handle=s.mesh(new T.TorusGeometry(.21,.025,6,18,Math.PI),'#c8b178',lantern,[0,.4,0]);handle.rotation.y=.2;
  action(lantern,'fin-light','小灯 · 点亮海洋','一点点光，也能陪朋友找到回家的方向。',state);
  if(index<5){lantern.visible=false;delete state.messages['fin-light'];}
  if(index===6){const whale=group(p,.5,2.7,-1.5);s.sphere(whale,'#7da8b5',[0,0,0],[1.7,.65,.6]);s.sphere(whale,'#b9d0c5',[.2,-.25,.12],[1.35,.32,.5]);for(const side of [-1,1]){const tail=s.sphere(whale,'#6b98ab',[-1.8,side*.22,0],[.5,.17,.25]);tail.rotation.z=side*.6;}s.sphere(whale,'#24414f',[1,.13,.5],[.06,.06,.03]);action(whale,'fin-whale','鲸鱼 · 听听歌声','鲸鱼轻轻哼唱，低低的声音传向远方。',state);}
  if(index===2)for(let i=0;i<7;i++){const x=-2.8+i*.85;line(s,p,[[x,.1,-1],[x+.2,1,-1],[x-.1,2,-1],[x+.1,2.8,-1]],'#6aab89',.065);}
  if(index===3){const crab=group(p,1.7,.3,1.1);s.sphere(crab,'#d58c76',[0,0,0],[.35,.19,.22]);for(const side of [-1,1]){for(let i=0;i<3;i++)rod(s,crab,'#c87e68',[side*.2,0,0],[side*.55,-.13,(i-1)*.2],.035);s.sphere(crab,'#d58c76',[side*.45,.22,.2],[.14,.17,.1]);s.sphere(crab,'#263f43',[side*.13,.21,.13],[.025,.04,.025]);}action(crab,'fin-crab','小蟹 · 打个招呼','小蟹举起钳子，指向海草后的小路。',state);}
  if(index===5){const boat=group(p,-.8,.4,-1.8);s.sphere(boat,'#8a7d68',[0,0,0],[1.5,.3,.65]);for(let i=0;i<6;i++)s.box(boat,'#a6987a',[(i-2.5)*.4,.24,0],[.34,.07,.9]);rod(s,boat,'#a6987a',[0,.2,0],[.3,2.2,0],.055);}
  if([7,8].includes(index))for(let i=0;i<24;i++)s.sphere(p,s.mat('#e4e7a7',{emissive:'#bfdc86',emissiveIntensity:.45}),[-3+(i*1.13)%6,.5+(i*.47)%3.8,-2+(i*.71)%3],[.035,.035,.035]);
  if(index===9){const friend=turtle(s,p,'#a7b582',.65);friend.position.set(1.9,.6,1.6);friend.rotation.y=-.6;action(friend,'fin-friend','朋友 · 欢迎回家','朋友们围在一起，海底的家亮了起来。',state);}
  state.bubbles=[];for(let i=0;i<12;i++){const b=s.sphere(p,'#afd5d5',[-3+(i*.73)%6,.6+(i*.37)%3.8,-2+(i%3)],[.045+(i%3)*.018,.06+(i%3)*.018,.045]);state.bubbles.push(b);}
  state.key=FIN[index];
}
export function buildCompanionScene(stage,book,index){
  const state={theme:book.theme,index:Math.max(0,Math.min(9,Math.trunc(index)||0)),messages:{},targets:{},taps:{},selected:{},tap:-Infinity,lightOn:true};
  stage.companionState=state;stage.canvas.dataset.content='scene';
  (book.theme==='nia'?buildNia:buildFin)(stage,state,state.index);
  for(const c of state.clouds||[])action(c,'nia-cloud','云朵 · 拖一拖','云朵慢慢让开，露出了明亮的天空。',state);
  stage.props.traverse(node=>{node.userData.rest=node.position.clone();node.userData.restRotation=node.rotation.clone();});
  for(const node of [...(state.targets['nia-kite']||[]),...(state.clouds||[])])node.userData.companionDraggable=true;
  stage.props.name=`${book.theme}-${state.key}`;settleCompanion(stage);return state;
}
export function interactCompanion(stage,key){const s=stage.companionState;if(!s||!s.messages[key])return false;
  s.taps[key]=stage.time;s.selected[key]=!s.selected[key];
  if(key==='fin-light')s.lightOn=!s.lightOn;
  if(key==='fin-shell')s.shellOpen=!s.shellOpen;
  settleCompanion(stage);stage.canvas.dataset.lastInteraction=key;stage.onCollect?.(key);stage.onInteract(s.messages[key]);stage.render();return true;
}
function paintJellies(stage,s){for(const jelly of s.jellies||[])jelly.traverse(node=>{if(node.isMesh)node.material=stage.mat(s.selected['fin-jelly']?'#e2d1f5':'#c6b2db',{emissive:s.selected['fin-jelly']?'#a18adb':'#000000',emissiveIntensity:s.selected['fin-jelly']?.75:0});});}
export function settleCompanion(stage){const s=stage.companionState;if(!s)return;
  for(const nodes of Object.values(s.targets))for(const node of nodes){node.position.copy(node.userData.rest);node.rotation.copy(node.userData.restRotation);}
  if(s.glow)s.glow.material=stage.mat(s.lightOn?'#ffe6a1':'#9aab9f',{emissive:s.lightOn?'#ffd275':'#000000',emissiveIntensity:s.lightOn?.6:0});
  if(s.pearl)s.pearl.position.y=s.shellOpen?.48:.24;
  if(s.hero?.userData.head)s.hero.userData.head.rotation.z=0;
  if(s.hero?.userData.fins)for(const f of s.hero.userData.fins)f.rotation.z=0;
  for(const j of s.jellies||[])j.scale.setScalar(1);
  paintJellies(stage,s);
  // With motion disabled every action still has an immediate, object-specific pose.
  if(!stage.motion)for(const [key,nodes]of Object.entries(s.targets)){if(!s.selected[key])continue;for(const node of nodes){if(key==='nia-hello')node.userData.head.rotation.z=.16;else if(key==='nia-kite')node.rotation.z=.25;else if(key==='nia-cloud')node.position.x+=.25;else if(key==='nia-tree')node.rotation.z=.045;else if(key==='fin-whale')node.rotation.z=.12;else if(key==='fin-crab')node.position.x+=.3;else if(key==='fin-fish')node.position.x+=.3;else if(key==='fin-hello'||key==='fin-friend')for(const f of node.userData.fins)f.rotation.z=.3;}}
}
export function animateCompanion(stage,t){const s=stage.companionState;if(!s||!stage.motion)return;
  const pulse=key=>{const age=t-(s.taps[key]??-Infinity);return age>=0&&age<1.4?Math.sin(age/1.4*Math.PI):0;};
  if(s.theme==='nia'){
    const hello=pulse('nia-hello');s.hero.rotation.z=Math.sin(t*1.4)*.025;s.hero.position.y=s.hero.userData.rest.y+hello*.22;s.hero.userData.head.rotation.z=Math.sin(t*.8)*.04+hello*.2;
    for(const k of s.targets['nia-kite']||[])if(!k.userData.dragging){k.position.y=k.userData.rest.y+Math.sin(t*.9)*.14+pulse('nia-kite')*.3;k.rotation.z=Math.sin(t*1.2)*.12+pulse('nia-kite')*.65;}
    for(const [i,c]of s.clouds.entries())if(!c.userData.dragging)c.position.x=c.userData.rest.x+Math.sin(t*.16+i)*.16+pulse('nia-cloud')*.45;
    for(const tree of s.targets['nia-tree']||[])tree.rotation.z=Math.sin(t*12)*pulse('nia-tree')*.055;
  }else{
    s.hero.position.y=s.hero.userData.rest.y+Math.sin(t*1.1)*.12;s.hero.rotation.z=Math.sin(t*.8)*.04;
    for(const [i,f]of s.hero.userData.fins.entries())f.rotation.z=Math.sin(t*(2+pulse('fin-hello')*7)+i)*(.16+pulse('fin-hello')*.3);
    for(const [i,f]of s.fish.entries()){f.position.x=f.userData.rest.x+Math.sin(t*.7+i)*.22+pulse('fin-fish')*.6;f.position.y=f.userData.rest.y+Math.sin(t+i)*.07;}
    for(const [i,j]of s.jellies.entries()){j.position.y=j.userData.rest.y+Math.sin(t*.8+i)*.16;j.scale.setScalar(1+pulse('fin-jelly')*.1);}
    for(const [i,b]of s.bubbles.entries())b.position.y=.3+((t*.18+i*.37)%4.1);
    for(const w of s.targets['fin-whale']||[]){w.position.y=w.userData.rest.y+pulse('fin-whale')*.35;w.rotation.z=Math.sin(t*5)*pulse('fin-whale')*.12;}
    for(const c of s.targets['fin-crab']||[]){c.position.x=c.userData.rest.x+pulse('fin-crab')*.45;c.rotation.z=Math.sin(t*18)*pulse('fin-crab')*.045;}
    for(const f of s.targets['fin-friend']||[])for(const fin of f.userData.fins)fin.rotation.z=Math.sin(t*6)*pulse('fin-friend')*.4;
  }
}
// The pointer plane is camera-facing; convert the world hit into book-local space.
// Store the grabbed offset so the kite does not jump to its center on pointerdown.
export function companionDragEntry(stage,object,point){let node=object;while(node&&!node.userData.companionDraggable)node=node.parent;if(!node)return null;
  const owner=stage.companionState,parent=node.parent;parent.updateWorldMatrix(true,false);
  const offset=node.position.clone().sub(parent.worldToLocal(point.clone()));let moved=false;
  return {companion:true,onDrag(world){if(stage.companionState!==owner)return;parent.updateWorldMatrix(true,false);const local=parent.worldToLocal(world.clone()).add(offset);node.position.x=T.MathUtils.clamp(local.x,-3,3);node.position.y=T.MathUtils.clamp(local.y,node.userData.action==='nia-cloud'?1.7:1.1,4.6);node.userData.rest.copy(node.position);node.userData.dragging=true;moved=true;stage.render();},onDragEnd(){node.userData.dragging=false;if(moved&&stage.companionState===owner){stage.onCollect?.(node.userData.action);stage.canvas.dataset.lastInteraction=node.userData.action;stage.onInteract(owner.messages[node.userData.action]);stage.render();}}};
}

export function companionActions(stage){const state=stage.companionState;return state?Object.entries(state.messages).map(([key,message])=>({key,action:key,label:({ 'nia-hello':'妮娅','nia-kite':'风筝','nia-tree':'大树','nia-cloud':'云朵','fin-hello':'芬恩','fin-fish':'小鱼','fin-shell':'贝壳','fin-jelly':'水母','fin-light':'小灯','fin-friend':'朋友','fin-whale':'鲸鱼','fin-crab':'小蟹'})[key]||key,message})):[];}
