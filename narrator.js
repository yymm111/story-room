const STYLE = 'story-garden-serena-v3';
const normalize = text => text.replace(/\r\n/g,'\n').trim();
async function keyFor(text,voice) {
  const bytes = new TextEncoder().encode(STYLE+'\n'+voice.toLowerCase()+'\n'+normalize(text));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
const wait = (time,signal) => new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(new DOMException('Cancelled','AbortError'));
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},time);
  const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});
});

export class Narrator {
  constructor({onState,onProgress,onEnd,onError}) {
    this.audio=document.createElement('audio');
    this.audio.id='narrationAudio';
    this.audio.preload='auto';
    this.audio.preservesPitch=true;
    this.audio.hidden=true;
    this.audio.dataset.engine='Qwen3-TTS';
    document.body.append(this.audio);
    this.onState=onState;this.onProgress=onProgress;this.onEnd=onEnd;this.onError=onError;
    this.run=0;this.controller=null;this.rate=1;this.state='idle';this.pending=new Map();
    this.manifest=fetch('assets/audio/library.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    this.audio.addEventListener('timeupdate',()=>{
      if(!this.current||!this.audio.duration)return;
      let local=Math.min(1,this.audio.currentTime/this.audio.duration);const chunks=this.current.info?.parts;if(chunks?.length){let cursor=0;for(const part of chunks){const at=this.current.text.indexOf(part.text,cursor),start=at<0?cursor:at;if(this.audio.currentTime>=part.start){local=(start+part.text.length*Math.min(1,Math.max(0,(this.audio.currentTime-part.start)/part.duration)))/this.current.text.length;}cursor=start+part.text.length;}}
      const progress=(this.current.before+this.current.text.length*local)/this.totalLength;
      this.onProgress(progress);
    });
    this.audio.addEventListener('error',()=>{
      if(this.state!=='idle'&&this.audio.getAttribute('src'))this.fail(new Error('这一页的声音暂时没有播放成功，请再点一次。'));
    });
  }

  setState(state,message='') {this.state=state;this.onState(state,message);}
  configure(rate) {this.rate=rate;this.audio.playbackRate=rate;}

  async resolveAudio(text,voice,signal,onProgress=()=>{}) {
    const key=await keyFor(text,voice);
    const library=await this.manifest;
    if(library[key])return library[key];
    // The manifest may have gained a just-generated built-in page since this tab opened.
    const fresh=await fetch('assets/audio/library.json',{cache:'no-cache',signal}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    if(fresh[key]){this.manifest=Promise.resolve({...library,...fresh});return fresh[key];}
    const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:normalize(text),voice}),signal});
    let job=await response.json();
    if(!response.ok)throw new Error(job.error||'本机 AI 声音暂时没有准备好。');
    const start=Date.now();
    while(job.status!=='ready'){
      if(job.status==='error')throw new Error(job.error||'声音没有生成成功，请重试。');
      if(Date.now()-start>20*60*1000)throw new Error('这一页的文字较长，声音还在本机生成。稍后再点就会使用已准备好的声音。');
      onProgress(job.status==='queued'?'正在等上一页的声音准备好…':job.parts>1?`正在准备声音 · ${job.part} / ${job.parts}`:'正在为这一页准备温柔的声音…');
      await wait(900,signal);
      const poll=await fetch('/api/tts/jobs/'+job.jobId,{cache:'no-store',signal});
      job=await poll.json();if(!poll.ok)throw new Error(job.error||'语音服务暂时不可用，请重试。');
    }
    return job;
  }

  split(text) {
    if(text.length<=1500)return [text];
    const output=[];let current='';
    for(let sentence of text.match(/[^。！？!?]+[。！？!?]*/g)||[text]){
      if(current.length+sentence.length>1200&&current){output.push(current);current='';}
      while(sentence.length>1200){output.push(sentence.slice(0,1200));sentence=sentence.slice(1200);}
      current+=sentence;
    }
    if(current.trim())output.push(current);return output;
  }

  async play(text,voice='Serena',fromRatio=0) {
    this.stop();const run=this.run;const controller=new AbortController();this.controller=controller;
    const whole=normalize(text);this.totalLength=whole.length;this.audio.dataset.voice=voice;
    const parts=this.split(whole);let before=0;
    const plans=parts.map(part=>{const p={text:part,before};before+=part.length;return p;});
    const start=Math.max(0,Math.min(plans.length-1,plans.findIndex(p=>p.before+p.text.length>=fromRatio*this.totalLength)));
    const advance=async index=>{
      if(run!==this.run)return;
      if(index>=plans.length){this.setState('idle');this.onEnd();return;}
      this.setState('loading','正在给这一页准备声音…');
      try{
        const plan=plans[index];
        const info=await this.resolveAudio(plan.text,voice,controller.signal,message=>{if(run===this.run)this.setState('loading',message);});
        if(run!==this.run)return;
        this.current={...plan,info};
        this.audio.src=info.url;this.audio.playbackRate=this.rate;
        this.audio.onloadedmetadata=()=>{
          if(run!==this.run)return;
          const position=index===start?Math.max(0,(fromRatio*this.totalLength-plan.before)/plan.text.length):0;
          if(position>0&&this.audio.duration){let seconds=this.audio.duration*position;if(info.parts?.length){const target=position*plan.text.length;let cursor=0;for(const part of info.parts){const found=plan.text.indexOf(part.text,cursor),start=found<0?cursor:found;if(target>=start&&target<=start+part.text.length){seconds=part.start+part.duration*(target-start)/part.text.length;break;}cursor=start+part.text.length;}}this.audio.currentTime=Math.min(this.audio.duration-.05,seconds);}
        };
        this.audio.onended=()=>advance(index+1);
        try{await this.audio.play();if(run===this.run)this.setState('playing');}
        catch(error){if(error.name==='NotAllowedError'){this.setState('paused','声音准备好了，点一下继续听。');}else if(run===this.run)throw error;}
        if(plans[index+1])this.prefetch(plans[index+1].text,voice);
      }catch(error){if(error.name!=='AbortError'&&run===this.run)this.fail(error);}
    };
    await advance(start);
  }

  prefetch(text,voice='Serena') {
    if(!text||text.length>1500)return;
    const id=voice+'\n'+text;if(this.pending.has(id))return;
    const pending=this.resolveAudio(text,voice,undefined).catch(()=>null).finally(()=>this.pending.delete(id));
    this.pending.set(id,pending);
  }
  pause(){this.audio.pause();this.setState('paused');}
  async resume(){try{await this.audio.play();this.setState('playing');}catch{this.setState('paused','请再点一次播放。');}}
  stop(){this.run++;this.controller?.abort();this.controller=null;this.audio.pause();this.audio.onended=null;this.audio.onloadedmetadata=null;this.audio.removeAttribute('src');this.audio.load();this.current=null;this.setState('idle');}
  fail(error){this.stop();this.onError(error.message||'本机 AI 声音暂时不可用。');}
}
