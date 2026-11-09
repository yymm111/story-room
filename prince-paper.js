import * as T from './vendor/three/build/three.module.js';
import {prepareAsset} from './asset-prep.js?v=otto9';

const TAU=Math.PI*2;
const lampOffColor=new T.Color('#7d8393'),lampOnColor=new T.Color('#ffffff');
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const spring=x=>{x=T.MathUtils.clamp(x,0,1)-1;return 1+2.7*x*x*x+1.7*x*x;};
const sheets={
  prince:{url:'assets/prince-art/prince-v5.png',cols:1,rows:1,items:['prince']},
  characters:{url:'assets/prince-art/characters-v3.png',cols:3,rows:2,items:[null,'fox','rose','plane','king','well']},
  props:{url:'assets/prince-art/props-v3-clean.png',cols:3,rows:2,items:['asteroid','lamp','wheat','bird','cloud','dune']},
  backgrounds:{url:'assets/prince-art/backgrounds-v3.png',cols:2,rows:2,items:['night','desert','meadow','cosmos'],opaque:true}
};

// Use the original atlas and UVs: no painted rectangles behind the paper silhouettes.
class PaperLibrary {
  constructor(onReady){
    this.regions=new Map();this.pending=new Map();this.onReady=onReady;
    this.ready=null;this.started=false;
  }
  start(){if(!this.started){this.started=true;this.ready=Promise.all(Object.values(sheets).map(spec=>this.load(spec)));}return this.ready;}
  async load(spec){
    try{
      let data=await prepareAsset('paper',spec).catch(()=>null);const map=data?new T.Texture(data.textureImage):await new T.TextureLoader().loadAsync(spec.url);if(data){map.flipY=false;map.needsUpdate=true;}else await map.image.decode?.();map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.userData.shared=true;const image=data?.image||map.image;
      if(!data){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);const pixels=x.getImageData(0,0,image.width,image.height).data,regions=[];spec.items.forEach((name,i)=>{if(!name)return;const cw=image.width/spec.cols,ch=image.height/spec.rows,x0=i%spec.cols*cw,y0=Math.floor(i/spec.cols)*ch;let left=x0+cw,right=x0,top=y0+ch,bottom=y0;if(spec.opaque){left=x0+2;right=x0+cw-3;top=y0+2;bottom=y0+ch-3;}else for(let y=y0+2;y<y0+ch-2;y++)for(let x=x0+2;x<x0+cw-2;x++)if(pixels[(y*image.width+x)*4+3]>130){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}let fl=right,fr=left;if(!spec.opaque)for(let y=Math.max(top,bottom-Math.round((bottom-top)*.09));y<=bottom;y++)for(let x=left;x<=right;x++)if(pixels[(y*image.width+x)*4+3]>180){fl=Math.min(fl,x);fr=Math.max(fr,x);}regions.push({name,left,right,top,bottom,anchor:fl<=fr?(fl+fr)/2:(left+right)/2});});data={pixels,regions};}
      const pixels=data.pixels;for(const {name,left,right,top,bottom,anchor}of data.regions){
        const texture=map.clone();texture.userData.shared=true;texture.userData.canvasImage=image;texture.offset.set(left/image.width,1-(bottom+1)/image.height);texture.repeat.set((right-left+1)/image.width,(bottom-top+1)/image.height);texture.needsUpdate=true;
        const hitTest=uv=>{if(!uv)return true;const x=Math.min(right,Math.max(left,Math.round(left+uv.x*(right-left)))),y=Math.min(bottom,Math.max(top,Math.round(bottom-uv.y*(bottom-top))));return pixels[(y*image.width+x)*4+3]>130;};
        const region={texture,ratio:(right-left+1)/(bottom-top+1),offset:((left+right)/2-anchor)/(bottom-top+1),opaque:!!spec.opaque,hitTest};this.regions.set(name,region);for(const apply of this.pending.get(name)||[])apply(region);this.pending.delete(name);
      }this.onReady();
    }catch(error){console.error('Paper illustration could not load',spec.url,error);}
  }

  card(name,height,{width,anchor=true,shadow=true}={}){
    const group=new T.Group();group.name=`paper-${name}`;group.userData.paper=true;
    const material=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,alphaTest:.35,alphaToCoverage:true,toneMapped:false});
    const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);mesh.visible=false;mesh.castShadow=shadow;mesh.receiveShadow=false;group.add(mesh);
    const apply=region=>{
      if(group.userData.disposed)return;
      const w=width||height*region.ratio;
      mesh.geometry.dispose();mesh.geometry=new T.PlaneGeometry(w,height,['prince','fox','bird','wheat'].includes(name)?24:1,['prince','fox','bird','wheat'].includes(name)?28:1);mesh.geometry.translate(anchor?region.offset*height:0,height/2,.018);
      mesh.geometry.userData.base=new Float32Array(mesh.geometry.attributes.position.array);
      material.map=region.texture;material.needsUpdate=true;mesh.visible=true;
      mesh.userData.hitTest=region.hitTest;
      mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:region.texture,alphaTest:.35,side:T.DoubleSide});
      group.userData.artReady=true;group.userData.artBounds={left:(anchor?region.offset*height:0)-w/2,right:(anchor?region.offset*height:0)+w/2,height};
    };
    if(this.regions.has(name))apply(this.regions.get(name));else this.pending.set(name,[...(this.pending.get(name)||[]),apply]);
    return group;
  }
}

export class PrincePaperScene {
  constructor(stage){this.stage=stage;this.art=new PaperLibrary(()=>{stage.refreshCover?.();stage.render();});}
  ensureLoaded(){return this.art.start();}
  build(page){
    const stage=this.stage,g=stage.props,kind=page.scene||'planet';
    const state={kind,hinges:[],characters:[],elapsed:0,landmarks:[],contacts:[],ready:false};stage.paperState=state;
    const add=(name,height,position,options={})=>{
      const node=this.art.card(name,height,options);node.position.set(...position);g.add(node);
      node.userData.rest=node.position.clone();node.userData.foldDelay=options.delay||0;node.userData.foldSign=options.foldSign||1;
      if(options.fold!==false)state.hinges.push(node);
      if(options.action){node.userData.action=options.action;state.characters.push(node);}
      state.landmarks.push(node);return node;
    };
    const day=['fox','desert','well'].includes(kind),sky=kind==='fox'?'meadow':day?'desert':['farewell','home'].includes(kind)?'cosmos':'night';state.day=day;
    state.backdrop=add(sky,6.3,[0,.02,-3.95],{width:9.05,anchor:false,shadow:false,delay:0});
    state.backdrop.rotation.x=-.035;
    const foot=(name,height,x,y,z,extra={})=>{
      const node=add(name,height,[x,y,z],{action:name==='king'?'prince':name,delay:.09,...extra});
      node.userData.rise=true;
      state.contacts.push({node,y});return node;
    };
    if(['planet','rose','journey','rose-return','home','king','stars','lamp'].includes(kind)){
      // All figures share a level paper stage; no spherical surface beneath the boots.
      state.ground=add('asteroid',kind==='king'?2.7:2.25,[0,.015,.08],{anchor:false,delay:.04});
      const level=kind==='king'?1.91:1.61;
      if(kind==='king'){
        state.king=foot('king',2.25,.93,level,.42,{delay:.17});
        state.prince=foot('prince',1.95,-1.18,level,.42,{delay:.26});
      }else if(kind==='lamp'){
        state.lamp=foot('lamp',2.65,1.03,level,.42,{delay:.15,anchor:false});
        state.prince=foot('prince',2.95,-.65,level,.42,{delay:.26});
        const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color:'#ffd293',transparent:true,opacity:.6,depthWrite:false}));glow.position.set(1.03,level+2.27,.48);glow.scale.set(1.15,1.15,1);glow.raycast=()=>{};g.add(glow);state.lampGlow=glow;state.lampOn=true;state.lampLevel=1;
        // Light the physical page without washing out the watercolor illustration.
        const light=new T.PointLight('#ffc879',16,7,2);light.position.copy(glow.position);light.position.z+=.3;g.add(light);state.lampLight=light;
        const pool=new T.Mesh(new T.PlaneGeometry(2.8,2),new T.MeshBasicMaterial({map:glowTexture(),color:'#ffc879',transparent:true,opacity:.16,depthWrite:false,toneMapped:false}));pool.rotation.x=-Math.PI/2;pool.position.set(1.03,.018,.72);pool.raycast=()=>{};g.add(pool);state.lampPool=pool;
      }else if(kind==='stars'){
        state.prince=foot('prince',2.95,-.8,level,.42);
        const stars=new T.Group();stars.position.set(1.15,3.25,.5);g.add(stars);state.orbitStars=stars;
        for(let i=0;i<7;i++){const star=starMesh(.13+i%3*.025);star.position.set(Math.cos(i*TAU/7)*.85,Math.sin(i*TAU/7)*.7,0);stars.add(star);}
      }else{
        state.prince=foot('prince',3.6,-.68,level,.42,{delay:.22});
        if(kind!=='journey'){
          state.rose=foot('rose',1.35,1.23,level,.42,{delay:.29});
          if(kind!=='planet')this.dome(g,state,[1.23,level,.42]);
        }else{
          state.birds=[];for(let i=0;i<5;i++){const bird=add('bird',.5,[-2.6+i*.96,5.35+i%2*.24,-1.2],{anchor:false,delay:.3+i*.04});state.birds.push(bird);}
        }
      }
    }else{
      state.ground=add(kind==='fox'?'wheat':'dune',kind==='fox'?1.5:.85,[.1,.025,1.95],{anchor:false,delay:.08});
      state.ground.userData.foreground=true;
      state.prince=foot('prince',3.25,kind==='fox'?-.9:kind==='well'?-1.25:1.55,.025,.62,{delay:.24});
      if(kind==='fox'){state.fox=foot('fox',1.68,1.64,.025,1.05,{delay:.32});stage.animatedActors?.fox(state.fox,1.85);}
      if(kind==='well')state.well=foot('well',3.05,1.32,.025,.3,{delay:.14,anchor:false});
      if(kind==='desert'||kind==='farewell')state.plane=foot('plane',1.78,-1.35,.025,.3,{delay:.14,anchor:false});
    }
    state.cloud=add('cloud',.54,[-1.72,4.10,.45],{anchor:false,shadow:false,delay:.08,fold:false});
    state.backdrop.add(state.cloud);state.cloud.position.set(-1.72,4.10,.45);state.cloud.userData.rest=state.cloud.position.clone();
    // Paper mounting tabs give the standing illustrations a readable physical hinge.
    for(const {node} of state.contacts){const tab=stage.box(node,'#ead6ad',[0,.006,.08],[.16,.012,.16]);tab.castShadow=false;}
    const motes=new T.Group();g.add(motes);state.motes=motes;
    for(let i=0;i<(day?9:18);i++){const star=day?new T.Mesh(new T.CircleGeometry(.012+i%3*.004,8),new T.MeshBasicMaterial({color:'#edcf8b',side:T.DoubleSide})):starMesh(.025+i%3*.008);star.material.transparent=true;star.material.depthWrite=false;star.material.opacity=day?.18:.45;star.raycast=()=>{};motes.add(star);}
    this.moveMotes(state,0);
    stage.canvas.dataset.content='watercolor-paper';stage.canvas.dataset.artVersion='6';
    return state;
  }
  dome(parent,state,position){
    const shell=new T.Group();shell.position.set(...position);shell.userData.rest=shell.position.clone();shell.userData.foldDelay=.3;parent.add(shell);state.hinges.push(shell);
    const points=[new T.Vector2(.49,.035),new T.Vector2(.49,.95),new T.Vector2(.475,1.14),new T.Vector2(.41,1.32),new T.Vector2(.29,1.46),new T.Vector2(.13,1.54),new T.Vector2(0,1.56)];
    const material=new T.MeshPhysicalMaterial({color:'#d8edf0',transparent:true,opacity:.13,roughness:.08,metalness:0,side:T.FrontSide,depthWrite:false});
    const glass=new T.Mesh(new T.LatheGeometry(points,40),material);glass.castShadow=false;shell.add(glass);
    const rim=new T.Mesh(new T.TorusGeometry(.49,.017,8,40),new T.MeshStandardMaterial({color:'#e4d0a0',roughness:.6}));rim.rotation.x=Math.PI/2;rim.position.y=.035;shell.add(rim);
    const shine=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.3,.28,.38),new T.Vector3(-.3,.8,.38),new T.Vector3(-.25,1.17,.34)]),14,.012,5,false),new T.MeshBasicMaterial({color:'#fff9df',transparent:true,opacity:.72}));shell.add(shine);
    shell.userData.action='rose';state.dome=shell;state.domeOpen=false;
    shell.userData.rise=true;
  }
  fold(state,progress,out=false){
    const p=T.MathUtils.clamp(progress,0,1);state.fold=p;
    for(const node of state.hinges){
      const delay=node===state.backdrop?0:node===state.ground ? .10 : node.userData.foldDelay||.22;
      const raw=T.MathUtils.clamp((p-delay)/.55,0,1),local=smooth(raw),settle=spring(raw);
      node.rotation.x=node.userData.rise?0:-(1-settle)*Math.PI/2+(node===state.backdrop?-.035*local:0);
      node.scale.setScalar(node.userData.rise?Math.max(.001,settle):1);node.position.y=node.userData.rest.y;node.visible=raw>.001;
      if(node===state.dome){node.visible=p>.82;node.children[0].material.opacity=.13*smooth((p-.82)/.18);if(p===1){node.position.y+=state.domeOpen?1.78:0;node.rotation.z=state.domeOpen?-.08:0;}}
    }
    if(state.lampGlow)this.lightLamp(state,0);
    if(state.orbitStars)state.orbitStars.visible=p>.97;
    state.motes.visible=p>.97;
  }
  animate(state,dt,time){
    if((state.fold??1)<.999)return;
    state.elapsed+=dt;const t=state.elapsed;
    state.ready=state.landmarks.every(n=>n.userData.artReady);
    const resting=node=>node?.userData.rest;
    // Keep the mounting point on the page; greetings happen above the feet.
    for(const node of state.characters)node.position.y=node.userData.rest.y;
    if(state.prince){const n=state.prince;n.userData.gaze=T.MathUtils.damp(n.userData.gaze||0,(this.stage.pointer.x||0)*.065,3,dt);n.rotation.z=Math.sin(t*1.3)*.008;const tap=time-(state.princeTap??-100);n.rotation.y=tap<1.2?Math.sin(tap*Math.PI/1.2)*.18:Math.sin(t*.4)*.025;paperFlex(n,'prince',t);headGaze(n,t);}
    if(state.cloud)state.cloud.position.x=resting(state.cloud).x+Math.sin(t*.22)*.17;
    if(state.rose)state.rose.rotation.z=Math.sin(t*.9)*.012;
    if(state.fox){const n=state.fox,tap=time-(state.foxTap??-100);n.rotation.z=n.userData.modelReady?0:tap<1.5?Math.sin(tap*TAU*1.5)*.055*Math.sin(tap/1.5*Math.PI):Math.sin(t*.7)*.009;n.rotation.y=n.userData.modelReady?0:Math.sin(t*.5)*.035;paperFlex(n,'fox',t);}
    if(state.birds)state.birds.forEach((bird,i)=>{const base=resting(bird),x=-2.8+(t*.34+i*1.12)%5.6;bird.position.set(x,base.y+Math.sin(t*2.1+i*.8)*.09,base.z);bird.rotation.z=Math.sin(t*2.1+i*.8)*.09;bird.rotation.y=Math.sin(t*2.1+i*.8)*.16;paperFlex(bird,'bird',t+i*.8);const material=bird.children[0].material;material.transparent=true;material.depthWrite=false;material.opacity=smooth((x+2.8)/.35)*smooth((2.8-x)/.35);});
    if(state.ground&&state.kind==='fox')paperFlex(state.ground,'wheat',t);
    if(state.dome){const d=state.dome,target=d.userData.rest.y+(state.domeOpen?1.78:0);d.position.y=T.MathUtils.damp(d.position.y,target,4,dt);d.rotation.z=T.MathUtils.damp(d.rotation.z,state.domeOpen?-.08:0,4,dt);}
    if(state.lampGlow){state.lampLevel=T.MathUtils.damp(state.lampLevel,state.lampOn?1:0,7,dt);this.lightLamp(state,t);}
    if(state.orbitStars){state.orbitStars.rotation.z=t*.14;state.orbitStars.children.forEach((star,i)=>star.rotation.z=Math.sin(t+i)*.1);}
    if(state.plane){const tap=time-(state.propBoost??-100);state.plane.rotation.z=tap<1.4?Math.sin(tap*12)*.014*Math.sin(tap/1.4*Math.PI):0;}
    if(state.well){const tap=time-(state.wellTap??-100);state.well.rotation.y=tap<1.4?Math.sin(tap*5)*.03:0;}
    this.moveMotes(state,t);
    const artReady=String(state.ready);if(this.stage.canvas.dataset.artReady!==artReady)this.stage.canvas.dataset.artReady=artReady;
  }
  lightLamp(s,t){
    if(!s.lampGlow)return;const unfold=smooth(((s.fold??1)-.72)/.28),level=s.lampLevel*unfold;
    s.lampGlow.visible=unfold>0;s.lampGlow.material.opacity=level*(.52+Math.sin(t*1.5)*.012);
    s.lampLight.intensity=16*level;s.lampPool.material.opacity=.16*level;s.lampPool.visible=unfold>0;
    s.lamp.children[0].material.color.copy(lampOffColor).lerp(lampOnColor,s.lampLevel);
  }
  moveMotes(s,t){s.motes.children.forEach((mote,i)=>{mote.position.set(-3+(i*.719)%6,.5+(i*.527+t*(s.day?.025:.065))%3.7,-1.5+Math.sin(i*1.7)*.6);mote.rotation.z=t*.12+i;mote.material.opacity=s.day?.12+Math.sin(t*.5+i)*.06:.35+Math.sin(t*.9+i)*.24;});}
  settleStatic(s){
    for(const n of s.characters){n.position.y=n.userData.rest.y;n.rotation.y=n.rotation.z=0;n.userData.gaze=0;}
    if(s.prince){paperFlex(s.prince,'prince',0);headGaze(s.prince,0);}
    if(s.fox)paperFlex(s.fox,'fox',0);
    if(s.rose)s.rose.rotation.z=0;
    if(s.cloud)s.cloud.position.copy(s.cloud.userData.rest);
    if(s.ground&&s.day)paperFlex(s.ground,'wheat',0);
    if(s.birds)s.birds.forEach(b=>{b.position.copy(b.userData.rest);b.rotation.y=b.rotation.z=0;paperFlex(b,'bird',0);b.children[0].material.opacity=1;});
    if(s.plane)s.plane.rotation.z=0;if(s.well)s.well.rotation.y=0;
    s.lampLevel=s.lampOn?1:0;this.fold(s,1);this.moveMotes(s,0);
  }
  interact(action,time){const s=this.stage.paperState;if(!s)return;this.stage.onCollect?.(action);
    const node=s.characters.find(n=>n.userData.action===action);if(node)node.userData.tap=time;
    if(action==='rose')s.domeOpen=!s.domeOpen;
    if(action==='fox')s.foxTap=time;
    if(action==='prince')s.princeTap=time;
    if(action==='lamp')s.lampOn=!s.lampOn;
    if(action==='plane')s.propBoost=time;
    if(action==='well')s.wellTap=time;
    if(!this.stage.motion)this.settleStatic(s);
  }
}

function starMesh(radius){const shape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?radius*.42:radius;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();return new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:'#f4d58a',side:T.DoubleSide}));}
function paperFlex(node,kind,t){const mesh=node.children[0],p=mesh?.geometry.attributes.position,b=mesh?.geometry.userData.base;if(!b||node.userData.modelReady)return;for(let i=0;i<p.count;i++){const x=b[i*3],y=b[i*3+1];let weight=0,z=0;if(kind==='prince'){const scale=(node.userData.artBounds?.height||2.25)/2.25,nx=x/scale,ny=y/scale;weight=smooth((-nx-.28)/.65)*smooth((ny-.9)/.22)*(1-smooth((ny-1.9)/.15));z=Math.sin(t*2.2+nx*4)*.12*scale*weight;}if(kind==='fox'){weight=smooth((x-.06)/.65)*(1-smooth((y-.65)/.3));z=Math.sin(t*1.9+x*3)*.09*weight;}if(kind==='bird')z=Math.sin(t*5+x*3)*.075*Math.abs(x);if(kind==='wheat')z=Math.sin(t*1.5+x*2.8)*.055*y;p.setZ(i,b[i*3+2]+z);}p.needsUpdate=true;}
let glow;
function glowTexture(){if(glow)return glow;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.18,'#ffffffe0');g.addColorStop(.55,'#ffffff22');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,128,128);glow=new T.CanvasTexture(c);glow.userData.shared=true;return glow;}

function headGaze(node,t){const mesh=node.children[0],p=mesh?.geometry.attributes.position,b=mesh?.geometry.userData.base;if(!b)return;const h=node.userData.artBounds?.height||3.6,angle=(node.userData.gaze||0)+Math.sin(t*.65)*.008,cy=h*.78,cx=h*.12;for(let i=0;i<p.count;i++){const x=b[i*3],y=b[i*3+1],w=smooth((y/h-.75)/.12),a=angle*w;p.setX(i,cx+(x-cx)*Math.cos(a)-(y-cy)*Math.sin(a));p.setY(i,cy+(x-cx)*Math.sin(a)+(y-cy)*Math.cos(a));}p.needsUpdate=true;}
