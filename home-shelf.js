import * as T from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {makeShelf} from './reference-shelf.js?v=otto9';

const referenceBooks=['otto-shy-moon','nia-runaway-kite','fin-glowing-sea'];
const groups={'demo-otto':['owl','moon','house'],'nia-runaway-kite':['kite','sheep','tree'],'fin-glowing-sea':['turtle','jar','boat'],'demo-little-prince':['moon','tree','house'],'demo-moon':['owl','moon','house'],'demo-kite':['kite','sheep','tree'],'demo-ocean':['turtle','jar','boat']};
const heights={owl:.26,moon:.28,house:.30,kite:.32,sheep:.20,tree:.34,turtle:.14,jar:.24,boat:.24};
const labels={owl:'猫头鹰',moon:'月亮',house:'小房子',kite:'红风筝',sheep:'小绵羊',tree:'大树',turtle:'小海龟',jar:'星光瓶',boat:'小帆船'};
const sounds={owl:'hoot',moon:'shimmer',house:'thunk',kite:'gust',sheep:'baa',tree:'rustle',turtle:'bubbles',jar:'fizz',boat:'splash'};
export class HomeShelf{
  constructor(stage){this.stage=stage;this.entries=[];this.coverCache=new Map();this.models=new Map();this.version=0;this.page=0;this.ready=this.load();}
  async load(){
    await this.stage.surfaceMaterials.ready;const loader=new T.TextureLoader(),gltf=new GLTFLoader();
    const [planks,normal]=await Promise.all(['textures-wood-planks.jpg','textures-wood-planks-normal.jpg'].map(n=>loader.loadAsync('assets/room-reference/'+n)));
    planks.colorSpace=T.SRGBColorSpace;normal.colorSpace=T.NoColorSpace;for(const map of [planks,normal]){map.anisotropy=8;map.userData.shared=true;}
    await Promise.all(Object.keys(heights).map(async name=>{const path=['owl','moon'].includes(name)?`assets/room-reference/models-toys-${name}.glb`:`assets/shelf-reference/${name}.glb`;const asset=await gltf.loadAsync(path);asset.scene.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;for(const m of o.material?[].concat(o.material):[]){m.userData.shared=true;for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key]){m[key].userData.shared=true;m[key].anisotropy=8;}}});this.models.set(name,asset.scene);}));
    const maps=this.stage.room.surfaceMaps;
    this.textures={wood:maps.wood,woodPlanks:planks,woodPlanksNormal:normal,cloth:maps.cloth,edges:maps.edges,covers:{},locked:()=>false,toyManifest:{heights,books:groups,labels,sounds},toyFor:name=>Promise.resolve(this.models.get(name)?.clone(true)||null)};
    this.baseReady=true;await this.rebuild();return this;
  }
  setBooks(entries){this.entries=entries;if(this.baseReady)return this.rebuild();}
  async cover(entry){const url=entry.shelfCover||entry.cover;if(!this.coverCache.has(url))this.coverCache.set(url,(url.endsWith('.svg')?this.stage.room.coverTexture(url):new T.TextureLoader().loadAsync(url).then(map=>{map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;map.userData.shared=true;return map;})).catch(()=>url.includes('-cover.webp')?new T.TextureLoader().loadAsync(url.replace('-cover.webp','-cover-shelf.webp')).then(map=>{map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;map.userData.shared=true;return map;}):null));return this.coverCache.get(url);}
  async rebuild(){
    const version=++this.version,entries=this.entries.slice();const covers=await Promise.all(entries.map(e=>this.cover(e)));if(version!==this.version)return;
    const ids=entries.map(e=>e.id).join('|');if(this.ids===ids){this.api?.setProgress(this.progress(entries));return;}
    this.ids=ids;const coversById={};entries.forEach((e,i)=>{if(covers[i])coversById[e.id]=covers[i];});const api=makeShelf({books:entries,textures:{...this.textures,covers:coversById}});
    api.group.position.set(0,0,-21.76);api.group.scale.setScalar(8);api.group.visible=this.stage.view==='shelf';api.group.traverse(o=>{if(o.isPointLight){o.intensity*=42;o.distance*=8;}});
    this.stage.scene.add(api.group);const old=this.api;this.api=api;this.page=Math.min(this.page,api.pages-1);api.scrollTo(this.page,true);api.setProgress(this.progress(entries));await Promise.resolve();await Promise.resolve();api.settleMotion(this.stage.time);if(old)this.stage.disposeGroup(old.group);
    this.stage.canvas.dataset.shelf='physical-double-plank';this.stage.renderer.shadowMap.needsUpdate=true;this.stage.render();
  }
  progress(entries){return Object.fromEntries(entries.filter(e=>e.lastRead).map(e=>[e.id,{percent:e.completed?100:Math.round(100*(e.page+1)/(e.pages?.length||10)),color:e.spine||'#284667'}]));}
  scrollTo(page){const before=this.page;this.page=Math.max(0,Math.min((this.api?.pages||1)-1,page));this.clearHover();this.api?.scrollTo(this.page,!this.stage.motion);if(this.page!==before)this.stage.onShelfSound('slide',{direction:this.page-before});if(!this.stage.motion){this.api?.settleMotion(this.stage.time);this.stage.render();}else this.stage.start();this.stage.onShelfPage(this.page);}
  dragBy(dx){this.api?.dragBy(dx);}
  settle(){if(this.api){const before=this.page;this.page=this.api.settle();this.clearHover();if(this.page!==before)this.stage.onShelfSound('slide',{direction:this.page-before});this.stage.onShelfPage(this.page);}}
  target(event){if(!this.api)return null;const stage=this.stage,r=stage.canvas.getBoundingClientRect();stage.ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);stage.raycaster.setFromCamera(stage.ndc,stage.camera);const toy=this.api.pickToy(stage.raycaster);if(toy)return{toy,label:labels[toy.name]+' · 点一点打招呼'};const id=this.api.pick(stage.raycaster);return id?{id,label:this.entries.find(e=>e.id===id)?.title||'打开故事'}:null;}
  hover(event){const target=this.target(event);this.setHover(target);return target;}
  hoverBook(id){this.setHover(id?{id}:null);}
  setHover(target){
    const previous=this.hoverTarget;this.hoverTarget=target;
    this.stage.room.setShelfTheme(target?.id||null);
    this.api?.setHover(target?.id||null);this.api?.setToyHover(target?.toy||null);
    if(target?.id&&target.id!==previous?.id)this.stage.onShelfSound('hover');
    if(target?.toy&&target.toy!==previous?.toy){
      if(this.stage.motion)this.api.toyNudge(target.toy);
      this.stage.onShelfSound('toy',{name:target.toy.name});
      const now=performance.now();if(now-(target.toy.lastSparkle??-Infinity)>1800){this.toySparkle(target.toy,6);target.toy.lastSparkle=now;}
    }
    document.querySelectorAll('.shelf-book-card').forEach(card=>card.classList.toggle('is-hovered',card.dataset.bookId===target?.id));
  }
  toySparkle(toy,count){const p=this.api.toyTop(toy).project(this.stage.camera),r=this.stage.canvas.getBoundingClientRect();this.stage.sparkles?.burst(r.left+(p.x+1)*r.width/2,r.top+(1-p.y)*r.height/2,count);}
  clearHover(){this.setHover(null);this.stage.sparkles?.setTarget(null);}
  activate(event){const target=this.target(event);if(!target)return false;if(target.toy){if(this.stage.motion)this.api.toyTap(target.toy);this.stage.onShelfSound('toy',{name:target.toy.name,tapped:true});this.toySparkle(target.toy,24);this.stage.onInteract(labels[target.toy.name]+'在和你打招呼。',{silent:true});this.stage.start();}else this.stage.onShelfPick(target.id);return true;}
  async lift(id){if(!this.api)return;this.clearHover();this.stage.onShelfSound('lift');if(!this.stage.motion)return;await this.api.flyTo(id,{position:new T.Vector3(.01,.07,2.72),rotation:new T.Euler(-Math.PI/2,0,0),scale:1},.85);}
  show(){if(!this.api)return;this.api.group.visible=true;for(const b of this.api.items){b.parked=false;b.flight?.resolve?.();b.flight=null;}this.clearHover();this.api.update(0,this.stage.time);this.api.setCastShadow(true);}
  hide(){if(this.api){this.api.group.visible=false;this.api.setCastShadow(false);}}
  update(dt,time){if(this.api&&this.stage.view==='shelf')this.api.update(dt,time);}
  static(){if(this.api){this.api.scrollTo(this.page,true);this.api.settleMotion(this.stage.time);}}
}
