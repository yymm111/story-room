import * as T from './vendor/three/build/three.module.js';

const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const MOUSE_FAMILY=[
  ['爷爷','#69796e',.90],['奶奶','#ac795d',.86],['爸爸','#53758a',.97],['妈妈','#bb8b5b',.91],
  ['大哥','#63805f',.79],['大姐','#bd7057',.78],['二哥','#d4a54e',.75],['二姐','#6a94a0',.74],
  ['小栗','#d39a38',.72],['小叶','#8ba15f',.69],['小米','#b98b98',.67],['小豆','#74958d',.65],
  ['小果','#c18359',.62],['小小','#b1a176',.59]
];
const LABELS={count:'找齐十四位家人',carry:'合作搬篮子',walk:'结伴走一段',cross:'慢慢过桥',knock:'敲敲新家的门',arrange:'布置新家',lamp:'点亮松果灯',sleep:'轻轻道晚安'};
const MESSAGES={carry:'一起抬，小篮子就稳稳当当了。',walk:'不用赶，等一等身边的家人。',cross:'一步一步，平安走到另一边。',knock:'你好，新家！橡树也在轻轻回答。',arrange:'篮子放窗边，毯子铺好了。',lamp:'暖暖的灯光，照见每一位家人。',sleep:'十四位家人，一个也没少。晚安。'};
const sphere=new T.SphereGeometry(1,16,12),box=new T.BoxGeometry(1,1,1);
sphere.userData.shared=box.userData.shared=true;
function group(parent,pos=[0,0,0]){const g=new T.Group();g.position.set(...pos);parent.add(g);return g;}
function mesh(parent,geometry,material,pos,scale){const n=new T.Mesh(geometry,material);n.position.set(...pos);n.scale.set(...scale);n.castShadow=n.receiveShadow=true;parent.add(n);return n;}

export class MiceScene {
  constructor(stage){this.stage=stage;this.materials=new Map();this.token=0;}
  mat(color){if(!this.materials.has(color)){const m=new T.MeshStandardMaterial({color,roughness:.95});m.userData.shared=true;this.materials.set(color,m);}return this.materials.get(color);}
  ball(p,c,pos,scale){return mesh(p,sphere,this.mat(c),pos,scale);}
  cube(p,c,pos,scale){return mesh(p,box,this.mat(c),pos,scale);}
  ensureLoaded(){return this.ready||(this.ready=new T.TextureLoader().loadAsync('assets/mice-art/environments.png').then(map=>{map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.userData.shared=true;this.atlas=map;}).catch(e=>{this.ready=null;throw e;}));}
  mouse(parent,index){
    const [name,color,size]=MOUSE_FAMILY[index],root=group(parent);root.scale.setScalar(size);root.userData.action='mouse-'+index;
    const fur=index<2?'#aa9277':index%3===0?'#a8784f':'#b98b62';
    const body=group(root,[0,.13,0]);this.ball(body,color,[0,.43,0],[.29,.40,.21]);
    this.ball(body,'#e2c49c',[0,.43,.175],[.18,.23,.06]);
    const head=group(body,[0,.92,.035]);this.ball(head,fur,[0,0,0],[.32,.28,.25]);
    for(const side of [-1,1]){this.ball(head,fur,[side*.24,.22,-.025],[.205,.22,.07]);this.ball(head,'#d49b8b',[side*.24,.22,.03],[.145,.16,.025]);}
    this.ball(head,'#ead1ad',[0,-.075,.22],[.23,.15,.14]);this.ball(head,'#bc8074',[0,-.015,.35],[.046,.035,.033]);
    const eyes=[];for(const side of [-1,1]){const e=this.ball(head,'#2e2823',[side*.135,.045,.235],[.037,.054,.025]);eyes.push(e);this.ball(head,'#fff6df',[side*.125,.065,.254],[.012,.016,.009]);}
    for(const side of [-1,1])for(let i=0;i<2;i++)this.line(head,[[side*.14,-.08,.33],[side*.36,-.06+i*.07,.32]],'#735b49',.006);
    if(index<2){for(const side of [-1,1]){const rim=new T.Mesh(new T.TorusGeometry(.078,.008,5,18),this.mat('#645d4e'));rim.position.set(side*.13,.045,.265);head.add(rim);}this.line(head,[[-.04,.045,.28],[.04,.045,.28]],'#645d4e',.007);}
    const arms=[],feet=[];for(const side of [-1,1]){
      const arm=group(body,[side*.27,.63,.02]);this.ball(arm,color,[0,-.13,0],[.08,.19,.09]);this.ball(arm,'#dab58e',[0,-.30,.025],[.085,.075,.07]);arms.push(arm);
      const foot=group(root,[side*.13,.13,.02]);this.ball(foot,'#b98b62',[0,-.06,.09],[.10,.08,.18]);feet.push(foot);
    }
    const tail=group(body,[0,.13,-.13]);this.line(tail,[[0,0,0],[.18,-.08,-.25],[.4,-.06,-.37],[.50,.06,-.32]],'#c89e8b',.026);
    // A small fabric collar and two buttons keep clothing readable at book scale.
    for(const side of [-1,1])this.ball(body,'#ead7af',[side*.08,.73,.18],[.10,.045,.05]);
    for(const y of [.35,.52])this.ball(body,'#735b43',[.03,y,.213],[.017,.017,.013]);
    return {root,body,head,arms,feet,tail,eyes,index,name,size,rest:new T.Vector3(),waveAt:-100,found:false};
  }
  line(parent,points,color,radius=.025){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const n=new T.Mesh(new T.TubeGeometry(path,12,radius,5,false),this.mat(color));n.castShadow=true;parent.add(n);return n;}
  build(page){
    const p=this.stage.props,s={adapter:this,kind:'mice-'+page.scene,page,elapsed:0,fold:0,found:new Set(),action:null,age:0,progress:0,completed:false,sleep:page.scene==='goodnight',lampOn:page.scene==='goodnight',lampLevel:page.scene==='goodnight'?.18:0};this.stage.paperState=s;
    const map=this.atlas.clone();map.repeat.set(.5-.001,.5-.001);map.offset.set((page.art%2)*.5+.0005,page.art<2?.5005:.0005);map.userData.shared=false;map.needsUpdate=true;
    const backdrop=new T.Mesh(new T.PlaneGeometry(8.8,4.4),new T.MeshBasicMaterial({map,side:T.DoubleSide,toneMapped:false}));backdrop.position.set(0,2.25,-2.8);p.add(backdrop);s.backdrop=backdrop;
    const floor=group(p,[0,.025,0]),groundMap=map.clone();groundMap.repeat.y*=.32;groundMap.userData.shared=false;groundMap.needsUpdate=true;
    const ground=new T.Mesh(new T.CircleGeometry(1,48),new T.MeshStandardMaterial({map:groundMap,roughness:1,color:'#e4d3ae'}));ground.rotation.x=-Math.PI/2;ground.scale.set(3.55,2.6,1);ground.receiveShadow=true;floor.add(ground);s.floor=floor;
    // A soft edge to the physical stage, separate from the painted scenery.
    for(let i=0;i<12;i++){const leaf=this.ball(p,i%2?'#9ca369':'#c4a56c',[-3.2+i*.58,.055,2.30+Math.sin(i)*.13],[.23,.025,.12]);leaf.rotation.y=i*.7;}
    s.mice=[];for(let i=0;i<14;i++){const m=this.mouse(p,i);const row=i<4?0:i<9?1:2,col=row===0?i:row===1?i-4:i-9,count=row===0?4:5;
      m.rest.set((col-(count-1)/2)*1.16,.055,-1.5+row*1.55);m.root.position.copy(m.rest);m.root.rotation.y=(col-(count-1)/2)*-.06;s.mice.push(m);
    }
    if(['pack','settle'].includes(page.scene)){
      const slots=[[-2.6,-1.6],[-1.3,-1.7],[1.3,-1.5],[2.6,-1.4],[-2.5,-.1],[-1.2,-.3],[1.3,-.3],[2.5,-.1],[-.55,1.75],[.55,1.75],[-2.2,1.5],[-1.3,1.7],[1.5,-1.1],[2.4,-.7]];
      s.mice.forEach((m,i)=>{m.rest.set(slots[i][0],.055,slots[i][1]);m.root.position.copy(m.rest);});
    }
    s.beds=group(p);s.beds.visible=s.sleep;
    for(const m of s.mice){this.ball(s.beds,'#99a17b',[m.rest.x,.065,m.rest.z-.43*m.size],[.40*m.size,.04,.72*m.size]);this.ball(s.beds,m.index%2?'#a99d68':'#85977a',[m.rest.x,.24,m.rest.z-.25*m.size],[.32*m.size,.11,.38*m.size]);}
    // The two carriers face the same basket; their paws remain attached to its handles.
    if(['pack','settle'].includes(page.scene)){for(const [i,x]of [[8,-.55],[9,.55]]){const m=s.mice[i];m.rest.set(x,.055,1.75);m.root.position.copy(m.rest);m.root.rotation.y=i===8?.55:-.55;}}
    s.basket=group(p,[0,.22,1.85]);s.basket.userData.action='carry';this.ball(s.basket,'#a77f4d',[0,0,0],[.42,.23,.27]);
    for(let i=0;i<4;i++){const hoop=new T.Mesh(new T.TorusGeometry(.31,.012,5,24),this.mat('#d8ba81'));hoop.rotation.x=Math.PI/2;hoop.position.y=-.1+i*.07;hoop.scale.set(1.2,.8,1);s.basket.add(hoop);}
    this.line(s.basket,[[-.38,.08,0],[-.23,.4,0],[.23,.4,0],[.38,.08,0]],'#795d3b',.027);this.ball(s.basket,'#e1d3a6',[.05,.14,0],[.25,.14,.21]);
    s.basket.visible=['pack','settle'].includes(page.scene);
    s.blanket=this.cube(p,'#8a9d90',[1.8,.06,.5],[.05,.025,1.15]);s.blanket.visible=page.scene==='settle';
    if(page.scene==='creek'){
      s.bridge=group(p,[-.2,.12,1.6]);for(let i=0;i<9;i++)this.cube(s.bridge,i%2?'#b18a54':'#cba66b',[(i-4)*.39,0,0],[.36,.07,.7]);
      for(const z of [-.35,.35]){this.line(s.bridge,[[-1.8,.45,z],[0,.35,z],[1.8,.45,z]],'#8a7450',.025);for(const x of [-1.8,1.8])this.cube(s.bridge,'#9b7947',[x,.23,z],[.055,.6,.055]);}
      const m=s.mice[8];m.rest.set(-1.65,.17,1.6);m.root.position.copy(m.rest);
      let n=0;for(const mouse of s.mice){if(mouse===m)continue;const row=n<7?0:1,col=row===0?n:n-7,count=row===0?7:6;mouse.rest.set((col-(count-1)/2)*.94,.055,row?-.05:-1.45);mouse.root.position.copy(mouse.rest);n++;}
    }
    s.door=group(p,[1.9,.05,-.5]);s.door.visible=page.scene==='oak';s.door.userData.action='knock';
    this.cube(s.door,'#957243',[0,.85,0],[.8,1.7,.09]);this.ball(s.door,'#e5c475',[-.23,.8,.07],[.055,.055,.055]);
    s.lantern=group(p,[2.4,2.1,-.8]);s.lantern.visible=page.art===3;s.lantern.userData.action='lamp';
    this.ball(s.lantern,'#745637',[0,.28,0],[.25,.1,.23]);this.ball(s.lantern,'#ad8350',[0,-.21,0],[.2,.06,.19]);
    s.bulb=this.ball(s.lantern,'#e4bf71',[0,0,0],[.17,.22,.16]);s.bulb.material=new T.MeshStandardMaterial({color:'#e4bf71',emissive:'#ffd17a',emissiveIntensity:0,roughness:.7});
    this.line(s.lantern,[[0,.3,0],[0,.52,0],[.2,.55,0]],'#755735',.024);
    s.light=new T.PointLight('#ffc878',0,7,2);s.lantern.add(s.light);
    const travelLamp=group(s.mice[8].arms[0],[0,-.40,.04]);travelLamp.visible=['gather','trail','creek','oak'].includes(page.scene);
    this.ball(travelLamp,'#b6a16d',[0,-.09,0],[.11,.13,.10]);this.ball(travelLamp,'#795d3c',[0,.03,0],[.13,.05,.12]);this.line(travelLamp,[[-.06,.03,0],[-.05,.13,0],[.05,.13,0],[.06,.03,0]],'#745b3b',.012);
    this.fold(s,1);this.pose(s,0,0);this.stage.canvas.dataset.content='mice-family-diorama';this.stage.canvas.dataset.artReady='true';this.stage.canvas.dataset.miceCount='14';this.stage.canvas.dataset.miceFound='0';
    return s;
  }
  fold(s,p){s.fold=clamp(p,0,1);const f=smooth((p-.12)/.78);s.backdrop.rotation.x=-(1-smooth(p))*Math.PI/2;s.backdrop.scale.y=Math.max(.001,smooth(p));
    s.mice.forEach((m,i)=>m.root.scale.setScalar(m.size*Math.max(.001,smooth((p-.12-i*.012)/.6))));
    for(const n of [s.floor,s.basket,s.blanket,s.bridge,s.door,s.lantern])if(n){n.userData.foldScaleY??=n.scale.y;n.scale.y=n.userData.foldScaleY*Math.max(.001,f);}
    s.light.intensity=s.lampLevel*11*f;
    s.beds.visible=s.sleep&&p>.75;
  }
  actions(){const s=this.stage.paperState;return [{key:s.page.action,label:LABELS[s.page.action],message:this.message(s.page.action)},...(s.page.action==='count'?[]:[{key:'count',label:'找齐十四位家人',message:this.message('count')}])];}
  message(key){const s=this.stage.paperState;if(key?.startsWith('mouse-')){const m=s.mice[Number(key.slice(6))];return m?`${m.name}在这里！已经找到 ${s.found.size} / 14 位家人。`:'';}return key==='count'?`已找到 ${s.found.size} / 14 位。点点每一位家人，同一位只算一次。`:MESSAGES[key]||'和家人一起把新家布置好。';}
  interact(key,time,{narration=false}={}){
    const s=this.stage.paperState;if(s?.adapter!==this||this.stage.busy)return false;
    if(key?.startsWith('mouse-')){const m=s.mice[Number(key.slice(6))];if(!m)return false;m.waveAt=s.elapsed;if(!narration){s.found.add(m.index);m.found=true;this.stage.canvas.dataset.miceFound=String(s.found.size);const counter=document.querySelector('[data-mice-counter]');if(counter)counter.textContent=`找到家人 ${s.found.size} / 14`;const button=document.querySelector(`[data-mouse-index="${m.index}"]`);button?.setAttribute('aria-pressed','true');if(s.found.size===14)this.stage.onCollect('family');}return true;}
    if(key==='count'){s.mice.forEach((m,i)=>m.waveAt=s.elapsed+i*.16);return true;}
    if(!LABELS[key])return false;
    if(key===s.action&&key!=='lamp'&&(!s.completed||['arrange','cross','walk','sleep'].includes(key)))return false;
    s.action=key;s.age=0;s.progress=0;s.completed=false;if(key==='lamp')s.lampOn=!s.lampOn;if(key==='sleep')s.sleep=true;
    if(!narration){if(['carry','cross','lamp'].includes(key))this.stage.onCollect(key);this.stage.onSceneSound?.('chime',[2,.3]);}
    if(!this.stage.motion){s.progress=1;s.completed=true;if(key==='lamp')s.lampLevel=s.lampOn?1:0;this.pose(s,0,0);this.fold(s,1);this.stage.render();}
    this.stage.start();return true;
  }
  animate(s,dt,time){if(s.fold<.999)return;s.elapsed+=dt;if(s.action&&!s.completed){s.age+=dt;s.progress=smooth(s.age/(s.action==='cross'?4.8:3.2));if(s.progress>=1)s.completed=true;}s.lampLevel=T.MathUtils.damp(s.lampLevel,s.lampOn?(s.sleep?.18:1):0,4,dt);this.pose(s,s.elapsed,dt);}
  pose(s,t,dt){
    const walking=['walk','cross'].includes(s.action)&&!s.completed&&!s.sleep,carrying=s.action==='carry'||(s.action==='arrange'&&!s.completed)||s.page.scene==='pack',p=s.progress;
    s.mice.forEach((m,i)=>{
      m.root.position.copy(m.rest);const lead=i===8;
      const sleeping=s.sleep?-Math.PI/2:0;m.root.rotation.x=this.stage.motion?T.MathUtils.damp(m.root.rotation.x,sleeping,3,dt):sleeping;if(s.sleep)m.root.position.y=.22;
      if(s.action==='walk')m.root.position.x+=p*.5;
      if(s.action==='cross'&&lead)m.root.position.x=lerp(-1.65,1.65,p);
      const moving=walking&&(s.action==='walk'||lead),gait=moving?Math.sin(t*7+i)*.35:0;
      m.feet[0].rotation.x=gait;m.feet[1].rotation.x=-gait;m.body.position.y=.13+(moving?Math.abs(Math.sin(t*7+i))*.025:0);
      const wave=t-m.waveAt,hello=wave>=0&&wave<1.5&&!s.sleep?Math.sin(wave/1.5*Math.PI):0;
      m.arms[0].rotation.set(moving?-gait*.65:0,0,hello*.8);m.arms[1].rotation.set(moving?gait*.65:0,0,-hello*(.8+Math.sin(wave*14)*.12));for(const arm of m.arms)arm.scale.y=1;
      if(carrying&&(i===8||i===9)){m.arms[0].rotation.x=m.arms[1].rotation.x=-.85;m.body.rotation.x=-.06;}else m.body.rotation.x=0;
      m.head.rotation.y=s.sleep?0:Math.sin(t*.6+i)*.06;m.head.rotation.z=hello*.07;
      const blink=(t+i*.43)%5.5<.15;for(const eye of m.eyes)eye.scale.y=s.sleep?.006:blink?.009:.054;
      m.tail.rotation.y=s.sleep?0:Math.sin(t*1.1+i)*.09;
      if(s.sleep){m.body.rotation.x=0;m.head.rotation.x=.1;}else m.head.rotation.x=0;
    });
    // Basket translation and the carriers use the same offsets, so the prop never drifts away.
    s.basket.position.set(s.action==='arrange'?lerp(0,1.65,p):0,.265+(s.action==='carry'?Math.sin(p*Math.PI)*.28:0),1.85-(s.action==='arrange'?p*.9:0));
    if(s.action==='carry')for(const i of [8,9])s.mice[i].root.position.y+=Math.sin(p*Math.PI)*.12;
    if(s.action==='arrange')for(const [i,offset]of [[8,-.55],[9,.55]]){s.mice[i].root.position.set(s.basket.position.x+offset,.055,s.basket.position.z-.1);}
    if(carrying){
      s.basket.updateWorldMatrix(true,false);
      for(const [i,side]of [[8,-1],[9,1]]){const m=s.mice[i],arm=m.arms[i===8?1:0];m.body.updateWorldMatrix(true,false);
        const target=m.body.worldToLocal(s.basket.localToWorld(new T.Vector3(side*.38,.08,0))).sub(arm.position);
        arm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),target.clone().normalize());arm.scale.y=target.length()/.30;
      }
    }
    s.blanket.scale.x=s.action==='arrange'?lerp(.05,1.9,p):.05;
    if(s.door)s.door.rotation.y=s.action==='knock'?Math.sin(p*Math.PI*4)*(1-p)*.08:0;
    s.light.intensity=s.lampLevel*11*smooth((s.fold-.12)/.78);s.bulb.material.emissiveIntensity=s.lampLevel*1.7;
    this.stage.canvas.dataset.miceAction=s.action||'idle';
  }
  settleStatic(s){if(s.action){s.progress=1;s.completed=true;}s.lampLevel=s.lampOn?(s.sleep?.18:1):0;this.pose(s,0,0);this.fold(s,1);}
  resetNarration(progress=0){const s=this.stage.paperState;this.token++;s.narrationDone=progress>s.page.text.indexOf(s.page.cue)/s.page.text.length;return this.token;}
  narrate(progress,token){const s=this.stage.paperState;if(s?.adapter!==this||token!==this.token||!this.stage.motion||s.narrationDone)return;const at=s.page.text.indexOf(s.page.cue)/s.page.text.length;if(progress>=at){s.narrationDone=true;this.interact(s.page.action,this.stage.time,{narration:true});}}
  stopNarration(){this.token++;}
  finishNarration(){this.stopNarration();}
}
