import {SoundKit} from './reference-soundkit.js?v=otto9';

const toySounds={owl:'hoot',moon:'shimmer',house:'thunk',kite:'gust',sheep:'baa',tree:'rustle',turtle:'bubbles',jar:'fizz',boat:'splash'};
// Local music and a separate, gesture-unlocked effects mixer.
export class Atmosphere {
  constructor() {
    this.audio = document.createElement('audio');
    this.audio.id = 'ambienceAudio';
    this.audio.src = 'assets/audio/bedtime-garden.mp3';
    this.audio.preload = 'none';
    this.audio.loop = true;
    this.audio.hidden = true;
    document.body.append(this.audio);
    this.enabled = true;
    this.volume = .3;
    this.ducked = false;
    this.unlocked = false;
    this.previewing = false;
    this.fade = 0;
    this.effectsEnabled = true;
    this.effectsVolume = .55;
    this.cooldowns = new Map();
    this.sampleData = Promise.all(Object.values(toySounds).map(async name => {
      try { const response=await fetch(`assets/audio/shelf/${name}.mp3`);return response.ok?[name,await response.arrayBuffer()]:null; }
      catch { return null; }
    }));
    // Capture runs before a button or the 3D canvas handles the first gesture.
    const activate=event=>{if(event.type==='keydown'&&(event.repeat||event.metaKey||event.ctrlKey||event.altKey||['Shift','Control','Alt','Meta'].includes(event.key)))return;this.unlockEffects();if(!this.unlocked&&!event.target.closest?.('#musicButton,#readerMusicButton'))this.start();};
    document.addEventListener('pointerdown',activate,{capture:true,passive:true});
    document.addEventListener('keydown',activate,{capture:true});
    document.addEventListener('click',event=>{if(event.target.closest('button:not(:disabled)')&&!event.target.closest('.shelf-select,#scrollLeft,#scrollRight,.shelf-page-dot'))this.effect('click');},{capture:true});
    this.audio.addEventListener('play', () => this.updateState());
    this.audio.addEventListener('pause', () => this.updateState());
    this.audio.addEventListener('error', () => this.updateState('unavailable'));
    document.addEventListener('visibilitychange', () => {
      // The sleep timer and reading continue in background, just like an audiobook.
      if (!document.hidden) this.updateState();
    });
  }

  configure({musicEnabled, musicVolume, animationsEnabled,effectsEnabled=true,effectsVolume=.55}) {
    this.enabled = musicEnabled;
    this.effectsEnabled = effectsEnabled;
    this.effectsVolume = Math.min(1,Math.max(0,Number(effectsVolume)||0));
    this.sound?.setSfxVolume(this.effectsEnabled?this.effectsVolume:0);
    this.sound?.setMuted(!this.effectsEnabled||!this.effectsVolume);
    if(this.sound)this.sound.reverbSend.gain.setTargetAtTime(this.effectsEnabled?this.effectsVolume*.35:0,this.effects.currentTime,.03);
    this.volume = Math.min(.6, Math.max(0, Number(musicVolume) || 0));
    document.body.dataset.animations = animationsEnabled ? 'on' : 'off';
    document.documentElement.dataset.motionOverride = animationsEnabled ? 'on' : 'off';
    if (!this.enabled) this.audio.pause();
    else if (this.unlocked && !this.previewing && this.audio.paused) this.start();
    this.setDucking(this.ducked);
    this.updateState();
  }

  async start() {
    this.unlocked = true;
    this.unlockEffects();
    if (!this.enabled || this.previewing) return;
    this.audio.volume = this.volume * (this.ducked ? .4 : 1);
    try { await this.audio.play(); }
    catch { this.updateState(this.enabled&&!this.previewing?'waiting':undefined); }
  }
  unlockEffects(){
    if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      if(!this.effects){
        this.effects=new Audio();this.sound=new SoundKit(this.effects);
        this.sound.setSfxVolume(this.effectsEnabled?this.effectsVolume:0);
        this.sound.setMuted(!this.effectsEnabled||!this.effectsVolume);
        this.sound.reverbSend.gain.value=this.effectsEnabled?this.effectsVolume*.35:0;
        this.effectsReady=this.sampleData.then(entries=>Promise.all(entries.filter(Boolean).map(async([name,data])=>{try{this.sound.bank[name]=await this.effects.decodeAudioData(data);}catch{}})));
      }
      if(this.effects.state==='suspended')this.effects.resume().catch(()=>{});
    }catch{}
  }
  effect(kind,{name,tapped=false,direction=1}={}){
    this.unlockEffects();
    if(!this.effectsEnabled||!this.effectsVolume||!this.sound||this.effects.state!=='running'||document.hidden||this.previewing)return false;
    const now=performance.now(),key=kind==='toy'?`toy:${name}:${tapped}`:kind;
    const interval=kind==='toy'?(tapped?220:1800):kind==='hover'?130:kind==='slide'?250:80;
    if(now-(this.cooldowns.get(key)??-Infinity)<interval)return false;
    this.cooldowns.set(key,now);
    const s=this.sound;
    if(kind==='toy'){
      const id=toySounds[name];
      if(!id||!s.sample(id,{volume:tapped?.8:.48,rate:.96+Math.random()*.08,reverb:.14,channel:`toy:${name}`})){
        if(id==='hoot')s.hoot();else s.chime(tapped?6:4,tapped?.22:.12);
      }
      if(tapped)s.sparkle();
    }else if(kind==='hover')s.chime(3,.12);
    else if(kind==='slide'||kind==='lift')s.whoosh(direction>0);
    else if(kind==='unavailable')s.pop(.7);
    else if(kind==='page')s.pageTurn();
    else if(kind==='click')s.click();
    else s.sparkle();
    return true;
  }
  rustle(){return this.effect('page');}
  chime(){return this.effect('sparkle');}
  sceneSound(method,args=[]){
    if(!['chime','whoosh','pop','click','sparkle','puff','glow','hoot','yawn','meow','lampSwitch'].includes(method))return false;
    this.unlockEffects();
    if(!this.effectsEnabled||!this.effectsVolume||!this.sound||this.effects.state!=='running'||document.hidden||this.previewing)return false;
    this.sound[method](...args);return true;
  }

  updateState(override) {
    const playing = !this.audio.paused && !this.audio.error;
    const state = override || (!this.enabled ? 'off' : playing ? 'playing' : 'waiting');
    document.body.dataset.music = state;
    for (const id of ['musicButton','readerMusicButton']) {
      const button = document.getElementById(id);
      if (!button) continue;
      const label = state === 'off' ? '开启背景音乐' : state === 'playing' ? '背景音乐正在播放，点击关闭' : state === 'unavailable' ? '背景音乐暂不可用' : '点击播放背景音乐';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(playing));
      button.classList.toggle('music-playing', playing);
    }
  }

  setDucking(ducked) {
    this.ducked = ducked;
    if(this.sound){const level=this.effectsEnabled?this.effectsVolume*(ducked?.6:1):0;this.sound.setSfxVolume(level);this.sound.reverbSend.gain.setTargetAtTime(level*.35,this.effects.currentTime,.1);}
    cancelAnimationFrame(this.fade);
    const from = this.audio.volume;
    const target = this.volume * (ducked ? .4 : 1);
    const start = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - start) / 500);
      this.audio.volume = Math.min(1, Math.max(0, from + (target - from) * progress));
      if (progress < 1) this.fade = requestAnimationFrame(step);
    };
    this.fade = requestAnimationFrame(step);
  }

  pauseForPreview() { this.previewing = true; this.audio.pause(); }
  resumeAfterPreview() { this.previewing = false; if(this.enabled && this.unlocked) this.start(); }
  stop() { this.audio.pause(); this.unlocked = false; }
}
