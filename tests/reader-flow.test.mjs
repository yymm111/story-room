// DOM-level integration test; WebGL/audio are stubbed. This is NOT visual QA.
// Install jsdom and fake-indexeddb in a temporary directory and set STORY_QA_MODULES.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire((process.env.STORY_QA_MODULES||'/tmp/story-qa')+'/package.json');
const {JSDOM}=require('jsdom');const {indexedDB}=require('fake-indexeddb');
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost:8766/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;for(const k of ['window','document','localStorage','navigator','location','Image','history'])Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true});
w.matchMedia=()=>({matches:true});w.indexedDB=indexedDB;w.structuredClone=structuredClone;
w.fetch=async()=>({ok:false,json:async()=>({})});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
const utterances=[];w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};w.speechSynthesis={getVoices:()=>[{localService:true,lang:'zh-CN',voiceURI:'test',name:'test'}],addEventListener(){},cancel(){},pause(){},resume(){},speak(u){utterances.push(u);}};w.localStorage.setItem('story-garden-settings',JSON.stringify({animationsEnabled:true,autoNext:false,speechEngine:'system',narrationVersion:2}));
const {demoBooks}=await import('../stories.js');const souvenirs=await import('../souvenirs.js');const i18n=await import('../i18n.js');
const noop=()=>{};class Atmosphere{constructor(){this.audio={paused:true};}configure(){}start(){}stop(){}effect(){}chime(){}rustle(){}setDucking(){}}
class Narrator{constructor(){}configure(){}stop(){}prefetch(){}}
const pages=[],interactions=[],narration=[];let failLoad=false;class Stage{constructor(){this.room={setShelfTheme:noop};this.homeShelf={setBooks:noop,lift:async()=>{},scrollTo:noop,clearHover:noop,show:noop};this.ready=Promise.resolve();this.motion=false;this.paperState={};this.paperArt={actions:()=>[],interact:()=>false};}pause(){}async prepareReaderScene(){}refreshCover(){}resize(){}configure(){}start(){}showShelf(){}loadBookAssets(){return failLoad?Promise.reject(Error('test asset failure')):Promise.resolve();}open(){}close(){return Promise.resolve();}setPage(book,page,index){pages.push([book.id,index,page.scene]);this.paperState={adapter:this.paperArt};this.paperArt={resetNarration:p=>{const token={};this.paperArt.token=token;narration.push(['reset',p]);return token;},stopNarration:()=>{this.paperArt.token=null;},finishNarration:()=>{this.paperArt.token=null;},narrate:(p,token)=>{assert.equal(token,this.paperArt.token);narration.push(['progress',p]);},actions:({includeVerbs=false}={})=>[{key:book.theme,label:book.theme==='nia'?'妮娅':'芬恩',message:'你好'},...(includeVerbs?[{key:book.theme+'/wave',action:book.theme,verb:'wave',label:'挥挥手',message:'挥手'}]:[])],interact:key=>{interactions.push([book.id,key]);return true;}};}render(){}whenReady(){return Promise.resolve();}}
Object.assign(w,{demoBooks,...souvenirs,...i18n,Atmosphere,Narrator,StorybookStage:Stage,interactCarmela:noop,narrateCarmela:noop,carmelaActions:()=>[],carmelaPlayback:noop,mountScene:noop,importFiles:noop,splitPages:noop,guessLang:()=> 'zh-CN',recognizeImage:noop});
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('await init();','window.testReady=init();');w.eval(source);await w.testReady;
const $=id=>w.document.getElementById(id);assert.equal($('bookList').children.length,demoBooks.length);
const tick=()=>new Promise(r=>setTimeout(r,20));
for(const id of ['nia-runaway-kite','fin-glowing-sea']){
 const book=demoBooks.find(b=>b.id===id);const card=w.document.querySelector(`[data-book-id="${id}"] .shelf-select`);assert(card);card.click();await tick();
 assert.equal($('readerView').hidden,false);assert.equal($('readerBookTitle').textContent,book.title);
 for(let i=0;i<10;i++){
  assert.equal($('readerView').dataset.currentPage,String(i+1));assert.equal($('pageTitle').textContent,book.pages[i].title);
  assert.equal($('storyText').textContent,book.pages[i].text);
  assert.ok($('sceneHint').querySelector('[data-companion-action]'));const button=$('sceneHint').querySelector(`[data-companion-action="${book.theme}/wave"]`);assert(button,'original verb button');button.click();assert.deepEqual(interactions.at(-1),[book.id,book.theme+'/wave']);if(i<9){$('nextPage').click();await tick();}
 }
 assert.equal($('nextPage').disabled,true);$('readerFavorite').click();await tick();
 $('closeReader').click();await tick();assert.equal($('readerView').hidden,true);
 w.document.querySelector(`[data-book-id="${id}"] .shelf-select`).click();await tick();assert.equal($('readerView').dataset.currentPage,'10');
 $('previousPage').click();await tick();assert.equal($('readerView').dataset.currentPage,'9');
 $('closeReader').click();await tick();
}
assert.equal(new Set(pages.map(p=>p[0]+':'+p[1])).size,20);
// System voice without word events must advance cues BEFORE sentence end.
w.document.querySelector('[data-book-id="nia-runaway-kite"] .shelf-select').click();await tick();
$('playButton').click();await tick();const utterance=utterances.at(-1);assert(utterance);utterance.onstart();
const beforeFallback=narration.length;await new Promise(r=>setTimeout(r,850));assert(narration.length>beforeFallback,'no-boundary estimate progresses before onend');
const beforePause=narration.length;$('playButton').click();await new Promise(r=>setTimeout(r,260));assert.equal(narration.length,beforePause,'pause stops estimated progress');$('playButton').click();
utterance.onboundary({charIndex:2});const nativeCount=narration.length;await new Promise(r=>setTimeout(r,260));assert.equal(narration.length,nativeCount,'native boundary replaces estimate');
$('selfReadButton').click();const stopped=narration.length;utterance.onboundary({charIndex:20});utterance.onend();assert.equal(narration.length,stopped,'stale speech callbacks ignored');
const second=$('storyText').querySelectorAll('[data-sentence]')[1];if(second){second.click();await tick();assert(narration.filter(x=>x[0]==='reset').at(-1)[1]>0,'sentence seek resets after prefix');}
$('closeReader').click();await tick();const closed=narration.length;utterance.onboundary({charIndex:30});assert.equal(narration.length,closed,'closed-page boundary ignored');

// Asset failure must leave the shelf usable and permit a later retry.
failLoad=true;w.document.querySelector('[data-book-id="nia-runaway-kite"] .shelf-select').click();await tick();assert.equal($('readerView').hidden,true);assert.match($('toast').textContent,/没能加载/);
failLoad=false;w.document.querySelector('[data-book-id="nia-runaway-kite"] .shelf-select').click();await tick();assert.equal($('readerView').hidden,false);$('closeReader').click();await tick();
assert(interactions.length>=20);

console.log('PASS: actual app DOM catalog click → 20 complete page texts → actions → end bounds → favorite → close/reopen saved page → previous page. reference actions, no-boundary narration, native handoff, pause/seek/stale guards, and asset-failure retry. WebGL/audio stubbed.');
w.close();
