import * as T from './vendor/three/build/three.module.js';
import {Sparkles} from './reference-sparkles.js?v=otto9';

// The reference shader runs independently of the room's rendering rate.
export class CursorSparkles{
  constructor(stage){
    this.stage=stage;this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer=new T.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
    this.renderer.setClearColor(0,0);this.canvas=this.renderer.domElement;
    this.canvas.className='cursor-sparkles';this.canvas.setAttribute('aria-hidden','true');document.body.append(this.canvas);
    this.sparks=new Sparkles(this.renderer);
    this.hand=document.createElement('div');this.hand.className='magic-hand';this.hand.setAttribute('aria-hidden','true');document.body.append(this.hand);
    this.resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.25,Math.sqrt(2400000/(innerWidth*innerHeight)));this.renderer.setPixelRatio(dpr);this.renderer.setSize(innerWidth,innerHeight,false);this.sparks.resize(innerWidth,innerHeight,dpr);};this.resize();
    window.addEventListener('resize',this.resize);
    window.addEventListener('pointermove',event=>this.move(event),{passive:true});
    window.addEventListener('pointerdown',event=>{
      if(!this.allowed(event))return;
      this.pressed=true;this.hand.classList.add('is-pressed');this.sparks.spawn(event.clientX,event.clientY,16,3);this.start();
    },{passive:true});
    const release=()=>{this.pressed=false;this.hand.classList.remove('is-pressed');};
    window.addEventListener('pointerup',release,{passive:true});
    window.addEventListener('pointercancel',()=>{release();this.clear();},{passive:true});
    document.documentElement.addEventListener('pointerleave',()=>this.clear());
    window.addEventListener('blur',()=>this.clear());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
    document.addEventListener('focusin',event=>{if(event.target.closest?.('dialog,input,textarea,select,[contenteditable="true"]'))this.clear();});
    this.motionQuery.addEventListener('change',()=>this.clear());
  }
  get enabled(){return this.stage.motion&&!document.hidden&&!this.motionQuery.matches;}
  allowed(event){return this.enabled&&event.pointerType!=='touch'&&!this.stage.preparing&&!document.querySelector('dialog[open]')&&!event.target.closest?.('input,textarea,select,[contenteditable="true"]');}
  move(event){
    if(!this.allowed(event)){this.clear();return;}
    const x=event.clientX,y=event.clientY,now=performance.now(),old=this.pointer;
    this.pointer={x,y};this.hand.style.transform=`translate3d(${x-7}px,${y-4}px,0)`;
    this.sparks.setCursor(x,y,true);
    if(now-(this.lastEmit??-Infinity)>=8){
      const distance=old?Math.hypot(x-old.x,y-old.y):0,count=Math.min(7,Math.max(2,Math.ceil(distance/12)));
      for(let i=0;i<count;i++){const a=i/count;this.sparks.spawn(x+(old?old.x-x:0)*a,y+(old?old.y-y:0)*a,1,this.pressed?2:1);}
      this.lastEmit=now;
    }
    if(event.target!==this.stage.canvas)this.setTarget(null,event);
    this.start();
  }
  setTarget(target,event){
    this.hand.classList.toggle('is-visible',!!target&&this.enabled&&event?.pointerType!=='touch');
    if(event)this.hand.style.transform=`translate3d(${event.clientX-7}px,${event.clientY-4}px,0)`;
  }
  burst(x,y,count=24){if(this.enabled){this.sparks.spawn(x,y,count,3);this.start();}}
  start(){if(!this.raf&&this.enabled)this.raf=requestAnimationFrame(now=>this.frame(now));}
  frame(now){
    this.raf=0;if(!this.enabled){this.clear();return;}
    const dt=Math.min(.05,(now-(this.lastTime??now))/1000);this.lastTime=now;
    this.sparks.update(dt);this.renderer.clear();this.sparks.render();
    if(this.sparks.alive)this.start();else this.lastTime=null;
  }
  clear(){
    cancelAnimationFrame(this.raf);this.raf=0;this.lastTime=null;this.lastEmit=null;this.pointer=null;this.pressed=false;
    this.sparks.clear();this.renderer.clear();this.hand.classList.remove('is-visible','is-pressed');
    this.stage.cursor?.classList.remove('is-visible','is-pressed');this.stage.homeShelf?.clearHover();
    if(this.stage.canvas.style.cursor==='none')this.stage.canvas.style.cursor='grab';
  }
}
