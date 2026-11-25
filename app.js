import {feedbackMotion} from './motion.js?v=motion5';
import {interactCarmela,narrateCarmela,carmelaActions,carmelaPlayback} from './carmela-scene.js?v=local-paper5';
import {demoBooks} from './stories.js?v=mice5';
import {importFiles,splitPages,guessLang,recognizeImage} from './importers.js?v=otto9';
import {Atmosphere} from './atmosphere.js?v=motion5';
import {mountScene} from './scenes.js?v=otto9';
import {Narrator} from './narrator.js?v=tone5';
import {StorybookStage} from './storybook-3d.js?v=motion6';
import {collectPin,collectStar,pinsFor,collectedPins,collectedStars,totals} from './souvenirs.js?v=mice4';
import {LANGS,getLang,setLang,t,applyI18n} from './i18n.js?v=home10';

const $=id=>document.getElementById(id);
const STATIC_PREVIEW=location.hostname.endsWith('.github.io');
const icons={
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',settings:'<path d="m9 3 1-1h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z" transform="translate(1 0) scale(.92)"/><circle cx="12" cy="12" r="3.2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',feather:'<path d="M20 3C12 1 4 9 5 16l3 3C15 20 23 12 20 3Z"/><path d="m3 21 13-13M8 16h6M11 13V8"/>',shield:'<path d="M12 2 4 5v6c0 5 8 10 8 10s8-5 8-10V5z"/><path d="m8 11 3 3 5-5"/>',
 left:'<path d="m14.5 5-7 7 7 7"/>',right:'<path d="m9.5 5 7 7-7 7"/>',bookPlus:'<path d="M12 5C8 2 3 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-2-10 1v16"/><path d="M15 10h5m-2.5-2.5v5M5 8h4M5 12h4"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',heart:'<path d="M20.4 5.6c-2.4-2.4-6-1.8-8.4 1-2.4-2.8-6-3.4-8.4-1C.9 8.3 2.2 12.4 5 15l7 6 7-6c2.8-2.6 4.1-6.7 1.4-9.4Z"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',moon:'<path d="M20.5 14A9 9 0 0 1 10 3a9 9 0 1 0 10.5 11Z"/>',check:'<path d="m5 12 4 4L19 6"/>',play:'<path d="m8 4 12 8-12 8z"/>',pause:'<path d="M7 4h3v16H7zM15 4h3v16h-3z"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'};
icons.music='<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>';
icons.nextPage='<path d="M3 8h8V3l10 9-10 9v-5H3z"/>';icons.previousPage='<path d="M21 8h-8V3L3 12l10 9v-5h8z"/>';
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.plus}</svg>`;
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
paintIcons();
let seed=37;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
for(let i=0;i<105;i++){const star=document.createElement('span');star.className='star'+(i%19===0?' cross':'');if(i%19===0)star.textContent='✧';const size=random()*1.6+.6;Object.assign(star.style,{left:random()*100+'%',top:random()*92+'%',width:size+'px',height:size+'px',opacity:random()*.6+.2,animationDelay:random()*5+'s',animationDuration:random()*5+3+'s'});$('stars').append(star);}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionEnabled = () => settings.animationsEnabled && !reduceMotion.matches;
const defaults={rate:1,fontSize:26,voice:'',autoNext:true,sleep:0,nickname:'小朋友',speechEngine:'ai',narratorVoice:'Serena',narrationVersion:2,musicEnabled:true,musicVolume:.3,effectsEnabled:true,effectsVolume:.55,animationsEnabled:true};
let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem('story-garden-settings')||'{}')};}catch{}
if((settings.rhythmVersion||0)<3){if(settings.rate===.9)settings.rate=1;settings.rhythmVersion=3;try{localStorage.setItem('story-garden-settings',JSON.stringify(settings));}catch{}}
if((settings.narrationVersion||0)<2){settings.speechEngine='ai';settings.narratorVoice='Serena';settings.narrationVersion=2;}
const atmosphere = new Atmosphere();
let narrator,stage=null,stageTurn=null,preparing=false,prefetchedPage='',companionNarration=null,companionSpeechClock=null;
let db,books=[],filter='all',activeBook=null,pageIndex=0,sentences=[],voices=[],health={ocr:false},pendingFiles=[],importMode='files',importController=null,importBusy=false;
let speaking=false,paused=false,speechSession=0,sentenceIndex=0,currentUtterance=null,sleepDeadline=0,toastTimer,openVersion=0,bookOpenRequest=0,lastDeleted=null;
const synth=window.speechSynthesis;
function reveal(node){
 if(!motionEnabled()||typeof node.animate!=='function')return;
 node.getAnimations().find(animation=>animation.id==='content-reveal')?.cancel();
 node.animate([{opacity:.65},{opacity:1}],{id:'content-reveal',...feedbackMotion});
}
function setText(node,text){if(node.textContent!==String(text))node.textContent=text;}
function hideToast(){clearTimeout(toastTimer);$('toast').hidden=true;}
function toast(message,action){
 const el=$('toast');clearTimeout(toastTimer);el.replaceChildren(document.createTextNode(message));
 if(action){const b=document.createElement('button');b.textContent=action.label;b.onclick=()=>{hideToast();action.run();};el.append(b);}
 el.hidden=false;
 toastTimer=setTimeout(hideToast,action?9000:6000);
}
function persistSettings(){
 try{localStorage.setItem('story-garden-settings',JSON.stringify(settings));}catch{toast('浏览器暂时不能保存设置，请检查存储空间。');}
}
function saveSettings(){persistSettings();applySettings();}
function applyMotion(){
 const enabled=motionEnabled();
 document.body.dataset.animations=enabled?'on':'off';
 document.documentElement.dataset.motionOverride=enabled?'on':'off';
 if(!enabled)for(const animation of document.getAnimations?.()||[]){if(animation.id==='content-reveal')animation.cancel();}
 stage?.configure(enabled);
}
reduceMotion.addEventListener?.('change',applyMotion);
function applySettings(){
 document.documentElement.style.setProperty('--story-size',settings.fontSize+'px');$('profileName').textContent=`${settings.nickname}的书房`;
 $('rateInput').value=settings.rate;$('rateOutput').value=settings.rate.toFixed(1)+'×';$('speedButton').textContent=settings.rate.toFixed(1)+'× 语速';
 $('fontInput').value=settings.fontSize;$('fontOutput').value=settings.fontSize;$('autoNextInput').checked=settings.autoNext;$('autoNextButton').setAttribute('aria-pressed',String(settings.autoNext));
 $('sleepSelect').value=settings.sleep;updateSleepLabel();
 $('musicEnabledInput').checked=settings.musicEnabled;$('musicVolumeInput').value=Math.round(settings.musicVolume*100);$('musicVolumeOutput').value=Math.round(settings.musicVolume*100)+'%';$('animationsInput').checked=settings.animationsEnabled;$('effectsEnabledInput').checked=settings.effectsEnabled;$('effectsVolumeInput').value=Math.round(settings.effectsVolume*100);$('effectsVolumeOutput').value=Math.round(settings.effectsVolume*100)+'%';
 atmosphere.configure(settings);
 $('speechEngineSelect').value=currentSpeechEngine();$('speechEngineSelect').disabled=false;
 $('voiceHint').textContent=settings.speechEngine==='ai'?'真正用于每一页正文的声音；首次准备后会保存在本机。':'使用电脑自带的辅助朗读声音。';
 $('voiceBadge').textContent=currentSpeechEngine()==='ai'?(settings.narratorVoice==='Uncle_Fu'?'Uncle Fu · 温暖男声':'Serena · 温柔女声'):'系统朗读';
 narrator?.configure(settings.rate);applyMotion();
}
function openDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('story-garden',2);request.onupgradeneeded=()=>{const d=request.result;if(!d.objectStoreNames.contains('books'))d.createObjectStore('books',{keyPath:'id'});if(!d.objectStoreNames.contains('progress'))d.createObjectStore('progress',{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('请关闭其他正在使用这个书架的标签页后重试。'));});}
function getBooks(){return new Promise((resolve,reject)=>{const tx=db.transaction(['books','progress']);const req=tx.objectStore('books').getAll();const preq=tx.objectStore('progress').getAll();tx.oncomplete=()=>{const progress=new Map((preq.result||[]).map(p=>[p.id,p]));resolve((req.result||[]).map(b=>{const p=progress.get(b.id);return p&&(p.lastRead||0)>(b.lastRead||0)?{...b,page:p.page,lastRead:p.lastRead,completed:p.completed}:b;}));};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('读取书架失败'));});}
function putBooks(items){return new Promise((resolve,reject)=>{const tx=db.transaction('books','readwrite');items.forEach(book=>tx.objectStore('books').put(book));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存书籍失败'));});}
async function persist(book){try{await putBooks([book]);return true;}catch{toast('这次修改没有保存成功。请检查浏览器空间，并导出备份。');return false;}}
function saveProgress(book){try{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').put({id:book.id,page:book.page||0,lastRead:book.lastRead||0,completed:!!book.completed});tx.onerror=()=>toast('阅读进度没有保存成功。请检查浏览器空间。');}catch{}}
function deleteProgress(ids){return new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');ids.forEach(id=>tx.objectStore('progress').delete(id));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
let shelfEntries=[],shelfPage=0,shelfOpening=false;
const referenceId=book=>book.id==='demo-otto'?'otto-shy-moon':book.id;
const shelfLogo=book=>['demo-otto','nia-runaway-kite','fin-glowing-sea'].includes(book.id)?'assets/shelf-reference/'+referenceId(book)+'-logo-strip.webp':null;
const safeImage=value=>typeof value==='string'&&(/^(?:\.\/)?assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9._-]+\.(?:svg|png|jpe?g|webp|avif)$/.test(value)||/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z\d+/=\s]+$/i.test(value))?value:'';
function bookCover(book){
 const cover=safeImage(book.cover);
 if(book.id==='demo-mice-moving-home'&&cover==='assets/mice-art/cover.png')return 'assets/mice-art/cover.webp';
 return cover||`assets/${['moon','kite','ocean','prince'].includes(book.theme)?book.theme:'moon'}.svg`;
}
const formatSize=bytes=>bytes>1024*1024?(bytes/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1024))+' KB';
function shelfCatalog(){const local=books.filter(b=>!b.deleted);return [...local.filter(b=>b.id==='demo-otto'),...local.filter(b=>b.id==='nia-runaway-kite'),...local.filter(b=>b.id==='fin-glowing-sea'),...local.filter(b=>!['demo-otto','nia-runaway-kite','fin-glowing-sea'].includes(b.id))];}
function visibleBooks(){const search=$('searchInput').value.trim().toLocaleLowerCase();const local=books.filter(b=>!b.deleted).sort((a,b)=>a.id==='demo-otto'?-1:b.id==='demo-otto'?1:a.kind==='demo'&&b.kind==='demo'?demoBooks.findIndex(x=>x.id===a.id)-demoBooks.findIndex(x=>x.id===b.id):(a.added||0)-(b.added||0));let catalog=filter==='all'?[...local.filter(b=>b.id==='demo-otto'),...local.filter(b=>b.id==='nia-runaway-kite'),...local.filter(b=>b.id==='fin-glowing-sea'),...local.filter(b=>!['demo-otto','nia-runaway-kite','fin-glowing-sea'].includes(b.id))]:local.filter(b=>filter==='favorite'?b.favorite:filter==='imported'?b.kind!=='demo':filter==='recent'?b.lastRead:true);return catalog.filter(b=>!search||b.title.toLocaleLowerCase().includes(search));}
function renderShelf(){
 const list=$('bookList');list.replaceChildren();shelfEntries=visibleBooks().map(b=>({...b,shelfCover:b.id==='demo-otto'?'assets/otto-reference/cover.webp':b.id==='demo-little-prince'?'assets/prince-art/cover-v6.png':bookCover(b),status:b.preview?'preview':'ready'}));shelfPage=Math.min(shelfPage,Math.max(0,Math.ceil(shelfEntries.length/3)-1));
 $('bookCount').textContent=books.filter(b=>!b.deleted).length;document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el.dataset.filter===filter));
 $('homeReadingBadge').textContent=`✦ ${books.filter(b=>b.lastRead&&!b.completed&&!b.deleted).length} 本在读　·　${books.filter(b=>b.completed&&!b.deleted).length} 本读完`;
 for(const [i,book]of shelfEntries.entries()){
  const card=document.createElement('article');card.className='shelf-book-card';card.dataset.bookId=book.id;card.dataset.page=Math.floor(i/3);const select=document.createElement('button');select.className='shelf-select';select.setAttribute('aria-label',`${book.preview?'预览':'打开'}《${book.title}》`);
  const logo=shelfLogo(book);if(logo){const image=new Image();image.className='shelf-title-art';image.src=logo;image.alt=book.title;select.append(image);}else{const title=document.createElement('strong');title.className='shelf-written-title';title.textContent=book.shortTitle||book.title;if(book.id==='demo-carmela'){const sub=document.createElement('small');sub.textContent='风铃山的秘密 · 原创冒险';title.append(sub);}select.append(title);}
  const progress=document.createElement('span');progress.className='shelf-reading-track';const bar=document.createElement('i');const percent=book.completed?100:book.lastRead?Math.round(100*(book.page+1)/(book.pages?.length||10)):0;bar.style.setProperty('--reading-progress',percent/100);progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','阅读进度');progress.setAttribute('aria-valuenow',String(percent));progress.append(bar);select.append(progress);
  const status=document.createElement('span');status.className='shelf-reading-status';status.textContent=book.preview?t('catalog.preview'):book.completed?t('catalog.finished'):book.lastRead?`${t('catalog.continue')} · ${book.page+1}`:`${book.pages?.length||10} ${t('shelf.pages')}`;select.append(status);
  const marks=document.createElement('span');marks.className='shelf-page-marks';marks.setAttribute('aria-hidden','true');for(let p=0;p<5;p++){const mark=document.createElement('i');mark.className=percent>(p*20)?'read':'';marks.append(mark);}select.append(marks);const manifest=pinsFor(book.id);if(manifest.length){const row=document.createElement('span');row.className='shelf-pin-row';row.setAttribute('aria-hidden','true');const got=collectedPins(book.id);for(const pin of manifest){const s=document.createElement('span');s.className='pin'+(got.includes(pin.id)?' got':'');s.textContent=pin.icon;row.append(s);}select.append(row);}
  select.onclick=()=>openShelfBook(book.id);select.onpointerenter=()=>stage?.homeShelf.hoverBook(book.id);select.onpointerleave=()=>stage?.homeShelf.clearHover();select.onfocus=()=>stage?.homeShelf.hoverBook(book.id);select.onblur=()=>stage?.homeShelf.clearHover();card.append(select);
  if(!book.preview){const more=document.createElement('button');more.className='shelf-book-more';more.innerHTML=icon('more');more.setAttribute('aria-label',`管理《${book.title}》`);more.onclick=e=>{e.stopPropagation();showBookMenu(card,books.find(b=>b.id===book.id));};card.append(more);}list.append(card);
 }
 if(!shelfEntries.length){const empty=document.createElement('div');empty.className='shelf-empty';const message=document.createElement('p');message.textContent=t(filter==='favorite'?'shelf.noFavorites':filter==='imported'?'shelf.noImports':filter==='recent'?'shelf.noRecent':'catalog.empty');const reset=document.createElement('button');reset.className='empty-reset';reset.textContent=t('shelf.reset');reset.onclick=()=>setFilter('all');empty.append(message,reset);list.append(empty);}
 stage?.homeShelf.setBooks(shelfEntries);renderShelfPage();updateSouvenirs();
}
function syncPagination(container,start,end,current,kind,callback){
 const active=document.activeElement;
 const wasFocused=container.contains(active);
 const existing=new Map([...container.children].map(button=>[Number(button.dataset.page),button]));
 let slot=container.firstElementChild;
 for(let i=start;i<end;i++){
  const button=existing.get(i)||document.createElement('button');
  existing.delete(i);
  button.type='button';button.dataset.page=i;
  button.className=kind+(i===current?' active':kind==='page-dot'&&i<current?' past':'');
  button.setAttribute('aria-current',i===current?'page':'false');
  button.setAttribute('aria-label',kind==='page-dot'?`第 ${i+1} 页`:`书架第 ${i+1} 组`);
  button.onclick=()=>callback(i);
  if(button!==slot)container.insertBefore(button,slot);
  slot=button.nextElementSibling;
 }
 for(const button of existing.values())button.remove();
 if(wasFocused&&document.activeElement!==active){
  (container.contains(active)?active:container.querySelector('[aria-current=page]'))?.focus({preventScroll:true});
 }
}
function renderShelfPage(){
 const pages=Math.max(1,Math.ceil(shelfEntries.length/3));
 document.querySelectorAll('.shelf-book-card').forEach(card=>card.hidden=Number(card.dataset.page)!==shelfPage);
 $('scrollLeft').disabled=shelfPage===0;$('scrollRight').disabled=shelfPage>=pages-1;
 syncPagination($('shelfPagination'),0,pages,shelfPage,'shelf-page-dot',setShelfPage);
 setText($('shelfCount'),`${shelfPage+1} / ${pages}`);
}
function setShelfPage(page){const before=shelfPage;shelfPage=Math.max(0,Math.min(Math.max(0,Math.ceil(shelfEntries.length/3)-1),page));if(stage)stage.homeShelf.scrollTo(shelfPage);renderShelfPage();if(before!==shelfPage)reveal($('bookList'));}
async function openShelfBook(id){
 if(shelfOpening)return;
 const entry=shelfEntries.find(b=>b.id===id);if(!entry)return;
 const source=document.activeElement;
 stage?.room.setShelfTheme(id,{remember:true});
 if(entry.preview){atmosphere.effect('unavailable');toast('这本书目前可以看封面，正文还在制作。');return;}
 shelfOpening=true;
 source?.setAttribute('aria-busy','true');
 try{
  await openBook(id,undefined,{lift:true});
 }catch(error){
  console.warn('Could not open shelf book',error);toast('故事暂时打不开。请再试一次。');
  await stage?.homeShelf.returnBook?.(id);
 }finally{
  source?.removeAttribute('aria-busy');shelfOpening=false;
 }
}
function setFilter(value){filter=value;shelfPage=0;$('searchInput').value='';renderShelf();stage?.homeShelf.scrollTo(0);reveal($('bookList'));$('bookList').scrollLeft=0;}
async function toggleFavorite(book){const before=book.favorite;book.favorite=!before;if(!await persist(book)){book.favorite=before;return;}renderShelf();if(activeBook?.id===book.id){updateReaderFavorite();reveal($('readerFavorite'));}}
function showBookMenu(card,book){
 const existing=card.querySelector('.book-options-menu');document.querySelectorAll('.book-options-menu').forEach(n=>n.remove());if(existing)return;
 const menu=document.createElement('div');menu.className='book-options-menu';const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.stopPropagation();menu.remove();fn();};menu.append(b);};
 add('从第一页开始',()=>openBook(book.id,0));add('给这本书改个名字',()=>{renameTarget=book;$('renameInput').value=book.title;$('renameDialog').showModal();});add('导出这本书',()=>downloadJSON({format:'story-garden-backup',version:1,books:[book]},`${book.title}.story.json`));
 if(book.kind!=='demo')add('移出书架',async()=>{book.deleted=true;lastDeleted=book.id;await persist(book);renderShelf();toast('书已经移出书架，还可以找回来。',{label:'撤回',run:()=>restoreLastDeleted()});});card.append(menu);
}
document.addEventListener('click',()=>document.querySelectorAll('.book-options-menu').forEach(n=>n.remove()));
async function restoreLastDeleted(){const removed=books.filter(b=>b.deleted);const book=books.find(b=>b.id===lastDeleted)||removed.at(-1);if(!book)return;book.deleted=false;await persist(book);renderShelf();$('restoreDeleted').hidden=!books.some(b=>b.deleted);toast(`《${book.title}》回到书架了。`);}

function updateReaderFavorite(){$('readerFavorite').classList.toggle('is-favorite',!!activeBook?.favorite);$('readerFavorite').setAttribute('aria-pressed',String(!!activeBook?.favorite));$('readerFavorite').setAttribute('aria-label',activeBook?.favorite?'取消收藏这本书':'收藏这本书');}
function handleCollect(action){if(!activeBook)return;const pin=collectPin(activeBook.id,action);if(pin){updateSouvenirs();renderShelf();toast(`${pin.icon} ${getLang()==='en'?'Collected: '+pin.en:'收集到：'+pin.zh}！`);}}
function updateSouvenirs(){const summary=totals(books);for(const [id,count] of [['souvenirStars',summary.stars],['souvenirPins',summary.pins]]){const el=$(id);const changed=el.textContent!==String(count);setText(el,count);if(changed)reveal(el);}$('souvenirStarMax').textContent='/'+summary.starMax;$('souvenirPinMax').textContent='/'+summary.pinMax;$('souvenirFinished').textContent=books.filter(b=>!b.deleted&&b.completed).length;$('souvenirBookMax').textContent='/'+books.filter(b=>!b.deleted).length;}
function souvenirBookCover(b){return b.id==='demo-otto'?'assets/otto-reference/cover.webp':b.id==='demo-little-prince'?'assets/prince-art/cover-v6.png':bookCover(b);}
function renderSouvenirs(){
 const list=$('souvenirsList');list.replaceChildren();const summary=totals(books);
 $('souvenirStarsTotal').textContent=`${summary.stars} / ${summary.starMax}`;$('souvenirPinsTotal').textContent=`${summary.pins} / ${summary.pinMax}`;
 const relevant=books.filter(b=>!b.deleted&&(pinsFor(b.id).length||b.kind==='demo'));
 if(!relevant.length){const p=document.createElement('p');p.className='souvenir-empty';p.textContent=t('souvenirs.empty');list.append(p);return;}
 for(const book of relevant){
  const row=document.createElement('div');row.className='souvenir-book';
  const h=document.createElement('h3');h.textContent=book.title;row.append(h);
  const manifest=pinsFor(book.id);
  if(manifest.length){const pins=document.createElement('div');pins.className='souvenir-pins';const got=collectedPins(book.id);for(const pin of manifest){const span=document.createElement('span');span.className='pin'+(got.includes(pin.id)?' got':'');span.textContent=pin.icon;span.title=got.includes(pin.id)?(getLang()==='en'?pin.en:pin.zh):t('souvenirs.hiding');pins.append(span);}row.append(pins);}
  const stars=document.createElement('div');stars.className='souvenir-stars';stars.textContent=`★ ${collectedStars(book.id).length} / ${book.pages.length} ${t('souvenirs.stars')}`;row.append(stars);
  list.append(row);
 }
}
function renderAllStories(){
 const grid=$('allStoriesList');grid.replaceChildren();
 const query=$('catalogSearch').value.trim().toLocaleLowerCase();const catalog=shelfCatalog().filter(b=>!query||b.title.toLocaleLowerCase().includes(query));$('catalogEmpty').hidden=!!catalog.length;
 for(const book of catalog){
  const card=document.createElement('button');card.className='all-story-card';card.type='button';
  const img=document.createElement('img');img.src=souvenirBookCover(book);img.alt=book.title;img.loading='lazy';
  const name=document.createElement('div');name.className='all-story-name';name.textContent=book.title;
  const status=document.createElement('span');status.className='all-story-status';status.textContent=book.preview?t('catalog.preview'):book.completed?t('catalog.finished'):book.lastRead?t('catalog.continue'):t('catalog.read');card.append(img,name,status);card.setAttribute('aria-label',book.title+' · '+status.textContent);card.onclick=()=>{$('allStoriesDialog').close();setFilter('all');setShelfPage(Math.floor(shelfEntries.findIndex(b=>b.id===book.id)/3));openShelfBook(book.id);};grid.append(card);
 }
}
function renderLanguageOptions(){
 const box=$('languageOptions');box.replaceChildren();
 for(const lang of LANGS){const button=document.createElement('button');button.type='button';button.className=lang.id===getLang()?'active':'';const label=document.createElement('span');label.textContent=lang.label;button.append(label);if(lang.id===getLang()){const check=document.createElement('span');check.className='check';check.textContent='✓';button.append(check);}button.onclick=()=>{setLang(lang.id);refreshLang();renderSouvenirs();};box.append(button);}
}
function refreshLang(){$('languageFlag').textContent=getLang()==='zh'?'中':'EN';applyI18n();renderLanguageOptions();if(books.length){renderShelf();renderAllStories();}}
function sentenceParts(text){
 const raw=(text.match(/[^。！？!?\n]+(?:[。！？!?]+[”’」』"']*\n*|\n+|$)/g)||[text]).filter(s=>s.trim());
 const parts=[];
 for(let part of raw){while(part.length>120){const section=part.slice(0,120);let cut=Math.max(section.lastIndexOf('，'),section.lastIndexOf('；'),section.lastIndexOf('. '));if(cut<45)cut=section.lastIndexOf(' ');if(cut<45)cut=119;parts.push(part.slice(0,cut+1));part=part.slice(cut+1);}if(part.trim())parts.push(part);}
 return parts;
}
function ensureStage(){if(!stage){const host=$('story3d');host.classList.add('global-room');document.body.prepend(host);stage=new StorybookStage(host,{onSceneArrive:showReaderCard,onInteract:(message,{silent=false,storyReplay=false}={})=>{if(storyReplay)stopSpeech();toast(message);if(!silent)atmosphere.chime();},onShelfSound:(kind,options)=>atmosphere.effect(kind,options),onSceneSound:(name,args)=>atmosphere.sceneSound(name,args),onShelfPick:id=>openShelfBook(id),onCollect:action=>handleCollect(action),onShelfPage:page=>{shelfPage=page;renderShelfPage();},onPageTurn:()=>atmosphere.rustle()});stage.homeShelf.setBooks(shelfEntries);stage.coverBook=books.find(b=>b.id==='demo-otto');stage.refreshCover();document.body.classList.add('three-room');stage.resize();}return stage;}
function showReaderCard(){if(!$('readerView').inert&&!stage?.turn)reveal($('openBook'));}
async function openBook(id,at,{lift=false}={}){
 const request=++bookOpenRequest;const book=books.find(b=>b.id===id&&!b.deleted);if(!book)return;
 const scene=ensureStage();scene.room.setShelfTheme(id,{remember:true});
 const pending=$('bookOpeningStatus');
 pending.hidden=true;
 const delay=setTimeout(()=>{if(request===bookOpenRequest){setText(pending,`正在打开《${book.title}》…`);pending.hidden=false;}},180);
 try{
 if(scene.preparing){atmosphere.start();await scene.ready;}
 try{await scene.loadBookAssets(book);}catch(error){
  console.error('Book assets unavailable',error);
  if(request===bookOpenRequest)toast('画面没能加载。再点一次书本重试。');
  return;
 }
 if(request!==bookOpenRequest||book.deleted)return;
 if(lift){await scene.homeShelf.lift(id);if(request!==bookOpenRequest)return;}
 scene.readerWarmup=true;scene.pause();
 stopSpeech();activeBook=book;loadVoices();pageIndex=Math.max(0,Math.min(at??book.page??0,book.pages.length-1));
 atmosphere.start();
 stageTurn=null;
 document.body.dataset.view='reader';$('readerView').hidden=false;$('readerView').inert=false;$('shelfView').hidden=true;document.querySelector('.topbar').hidden=true;document.body.style.overflow='hidden';$('readerBookTitle').textContent=book.title;$('voiceBadge').textContent=settings.speechEngine==='system'?'系统朗读':settings.narratorVoice+' · AI 配音';$('readerSubtitle').textContent=book.theme==='mice'?book.subtitle:['nia','fin','mice'].includes(book.theme)?'中文重新讲述 · 10 幕立体冒险':book.theme==='carmela'?book.subtitle:book.theme==='otto'?'红气球 · 10 幕月光冒险':book.theme==='prince'?'儿童节选改编 · 12 幕立体故事':book.kind==='demo'?'属于你的睡前故事时光':'从你的书架，走进想象的世界';updateReaderFavorite();document.title=`${book.title} · 故事彗星`;
 try{ensureStage();$('readerView').classList.add('cinematic');stage.resize();stage.configure(motionEnabled());stage.start();}catch(error){console.error('3D scene unavailable',error);$('readerView').classList.remove('cinematic');}
 $('readerView').inert=true;$('readerView').classList.toggle('book-opening',motionEnabled());
 try{await renderPage();try{await scene.prepareReaderScene();}catch(error){console.warn('Reader warmup unavailable',error);}}finally{scene.readerWarmup=false;$('readerView').inert=false;}
 if(request!==bookOpenRequest)return;$('zoomSceneButton').setAttribute('aria-pressed','false');$('zoomSceneButton').setAttribute('aria-label','看近一点');stage?.open();$('playButton').focus({preventScroll:true});
 }finally{clearTimeout(delay);if(request===bookOpenRequest)pending.hidden=true;}
}
async function renderPage(){
 if(!activeBook)return;
 const version=++openVersion;
 const page=activeBook.pages[pageIndex];
 const turn=stageTurn;stageTurn=null;
 const animatedTurn=!!(!document.hidden&&stage?.motion&&turn?.turn);
 if(animatedTurn){
  stage.setPage(activeBook,page,pageIndex,turn);
  stage.start();
  const previousText=$('storyText');if(previousText.contains(document.activeElement))$('playButton').focus({preventScroll:true});previousText.inert=true;
  try{await stage.whenPageLands();}finally{previousText.inert=false;}
  if(version!==openVersion||!activeBook)return;
 }
 activeBook.page=pageIndex;activeBook.lastRead=Date.now();saveProgress(activeBook);
 $('readerView').dataset.currentPage=String(pageIndex+1);$('readerView').dataset.totalPages=String(activeBook.pages.length);$('pageEyebrow').textContent=getLang()==='en'?`PAGE ${pageIndex+1} OF ${activeBook.pages.length}`:`第 ${pageIndex+1} 页 / 共 ${activeBook.pages.length} 页`;$('readerContentsTrigger').textContent=getLang()==='en'?`Contents · ${activeBook.pages.length} pages`:`目录 · ${activeBook.pages.length} 页`;$('pageTitle').textContent=page.title||activeBook.title;
 sentences=sentenceParts(page.text||'');
 const text=$('storyText');
 clearSpeechHighlight();sentenceNodes=[];sentenceOffsets=[];manualStoryScroll=false;
 const segmentWords=!!page.text&&page.text.length<=3200&&typeof Intl.Segmenter==='function';
 const segmenter=segmentWords?new Intl.Segmenter(activeBook.lang||'zh',{granularity:'word'}):null;
 const fragment=document.createDocumentFragment();
 let offset=0;
 sentences.forEach((sentence,i)=>{
  const span=document.createElement('span');span.className='story-sentence';span.dataset.sentence=i;
  const words=[];
  if(segmenter){
   for(const {segment,index} of segmenter.segment(sentence)){
    if(/^[，。！？；：、）》”’…\s]+$/.test(segment)&&words.length){words.at(-1).node.textContent+=segment;continue;}
    const word=document.createElement('span');word.className='story-word';
    if(/奥托|小熊|月亮|气球|云朵|小镇|小王子|玫瑰|狐狸|星球|候鸟|星星|路灯|水井|卡梅拉|地图|小桥|风铃|妮娅|芬恩|风筝|海水|水母|宝箱|鲸鱼|珍珠|珊瑚|海草|乌鸦|小蟹/.test(segment))word.classList.add('magic-word');
    word.textContent=segment;span.append(word);words.push({start:index,node:word});
   }
  }else span.textContent=sentence;
  sentenceNodes.push({node:span,words});sentenceOffsets.push(offset);offset+=sentence.length;
  span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',`从这句开始听：${sentence.slice(0,35)}`);
  fragment.append(span);
 });
 text.replaceChildren(fragment);
 if(!$('readerView').inert)reveal(text);
 if(!sentences.length){const empty=document.createElement('span');empty.className='empty-text';empty.textContent='这一页还没有朗读文字。点右上角的羽毛，可以识别图片文字，或者为它写一个小故事。';text.append(empty);}
 text.scrollTop=0;$('readingTip').textContent=sentences.length?'点一句话，就从这里开始听':'点右上角的羽毛，为这一页补充文字';
 const image=safeImage(page.image)||bookCover(activeBook);$('pageImage').src=image;$('pictureMat').classList.toggle('carmela-page-art',activeBook.theme==='carmela');$('pictureMat').style.setProperty('--art-column',(page.artIndex||0)%2);$('pictureMat').style.setProperty('--art-row',Math.floor((page.artIndex||0)/2));$('pageImage').alt=page.title?`${page.title}的插画或书页`:'故事插画';$('pictureMat').classList.toggle('illustration',!!page.illustration||!safeImage(page.image));$('pictureCaption').textContent=page.caption||(activeBook.kind==='demo'?'每一个故事，都为你留了一盏灯':'让每一页，都变成听得见的故事');$('pageNumber').textContent=`— ${pageIndex+1} —`;
 const hasScene=!stage&&activeBook.kind==='demo'&&activeBook.theme!=='carmela'&&!!page.illustration;$('pictureMat').classList.toggle('has-scene',hasScene);$('animatedScene').hidden=!hasScene;if(hasScene)mountScene($('animatedScene'),activeBook.theme,pageIndex);else $('animatedScene').replaceChildren();
 $('previousPage').disabled=pageIndex===0;$('nextPage').disabled=pageIndex===activeBook.pages.length-1;
 const start=Math.max(0,Math.min(pageIndex-8,activeBook.pages.length-17));
 syncPagination($('pageDots'),start,Math.min(activeBook.pages.length,start+17),pageIndex,'page-dot',changePage);
 if(stage){if(!animatedTurn){stage.setPage(activeBook,page,pageIndex,document.hidden?{turn:false}:turn||{});if(document.hidden&&stage.busy&&!stage.preparing)stage.completeMotion();}stage.start();$('sceneHint').textContent=activeBook.kind!=='demo'?'拖动画面看原书书页 · 朗读文字可编辑':activeBook.theme==='carmela'?'点卡梅拉打招呼 · 点地图、小桥、风铃收集宝物':activeBook.theme==='otto'?'点小熊挥手 · 点气球乘风 · 点云朵让路':activeBook.theme==='prince'?'拖动画面 · 点点角色和桌面上的小物件':'拖动画面看一看 · 故事会从书页里长出来';}
 $('sceneHint').classList.toggle('carmela-actions',activeBook.theme==='carmela');$('sceneHint').classList.toggle('mice-actions',activeBook.theme==='mice');
 if(activeBook.theme==='otto'&&stage){const actions=[['otto','小熊挥手'],['balloon','乘风漂浮']];if(stage.paperState.clouds?.length)actions.push(['cloud','拨开云朵']);if(stage.paperState.moon?.visible)actions.push(['moon','点亮月光']);if(stage.paperState.starPath?.length)actions.push(['stars','点亮下一颗星']);if(stage.paperState.owl)actions.push(['owl','问问猫头鹰']);if(stage.paperState.cat)actions.push(['cat','和小猫打招呼']);if(stage.paperState.diorama?.objects.lamp)actions.push(['lamp','开关床头灯']);if(stage.paperState.diorama?.objects.window)actions.push(['window','点亮小窗']);const hint=$('sceneHint');hint.replaceChildren();hint.classList.add('otto-actions');for(const [action,label]of actions){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{if(stage.busy)return;stage.ottoArt.interact(action,stage.time);toast(stage.paperState.messages[action]);if(!stage.ottoArt.usesSceneSound)atmosphere.chime();};hint.append(button);}}else if(activeBook.theme==='carmela'&&stage){const hint=$('sceneHint');hint.replaceChildren();hint.classList.add('otto-actions');for(const [action,label]of carmelaActions(page.scene)){const button=document.createElement('button');button.textContent=label;button.dataset.carmelaAction=action;if(action!=='hen')button.title='重播本页动画，朗读会暂停';button.onclick=()=>{if(!stage.busy)interactCarmela(stage,'carmela-'+action);};hint.append(button);}}else if(['nia','fin','mice'].includes(activeBook.theme)&&stage){renderCompanionControls();}else $('sceneHint').classList.remove('otto-actions');sentenceIndex=0;updatePlayback();if(version!==openVersion)return;
}
// Every original reference verb remains available without covering the whole diorama.
function renderCompanionControls(){
 const hint=$('sceneHint');hint.replaceChildren();hint.classList.add('otto-actions');
 const actions=stage.paperArt.actions({includeVerbs:true});const primary=actions.filter(a=>!a.verb).slice(0,4),more=actions.filter(a=>!primary.includes(a));
 const add=(target,action)=>{const button=document.createElement('button');button.type='button';button.textContent=action.label;button.dataset.companionAction=action.key;button.onclick=()=>{if(stage.busy)return;if(stage.paperArt.interact(action.key,stage.time)){toast(stage.paperArt.message?.(action.key)||action.message);stage.start();}};target.append(button);};
 for(const action of primary)add(hint,action);
 if(activeBook.theme==='mice'){const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');summary.textContent='家人点名册';details.append(summary,list);for(const m of stage.paperState.mice){const button=document.createElement('button');button.type='button';button.textContent=m.name;button.dataset.mouseIndex=String(m.index);button.setAttribute('aria-pressed','false');button.onclick=()=>{if(!stage.busy){stage.paperArt.interact('mouse-'+m.index,stage.time);toast(stage.paperArt.message('mouse-'+m.index));}};list.append(button);}hint.append(details);}
 if(activeBook.theme==='mice'){const counter=document.createElement('span');counter.dataset.miceCounter='';counter.textContent='找到家人 0 / 14';counter.setAttribute('aria-live','polite');counter.style.cssText='display:block;padding:4px 8px;color:#725833;font-size:13px';hint.append(counter);}
 if(more.length){const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');summary.textContent='更多互动';summary.style.cursor='pointer';details.append(summary,list);Object.assign(list.style,{display:'flex',flexWrap:'wrap',gap:'5px',maxHeight:'180px',overflowY:'auto',paddingTop:'6px'});for(const action of more)add(list,action);hint.append(details);}
}
function companionWordAction(word){
 const actions=stage.paperArt.actions();const names={nia:/妮娅|兔子/,fin:/芬恩|海龟/,kite:/风筝/,wind:/风/,cloud:/云/,oak:/橡树|大树/,crow:/乌鸦/,ducks:/鸭/,sheep:/羊/,jar:/瓶/,jellies:/水母/,chest:/宝箱/,pearl:/珍珠/,whale:/鲸/,crab:/蟹/,fish:/鱼/,kelp:/海草/,reef:/珊瑚/,sea:/海水|海洋/};
 return actions.find(a=>word.includes(a.label))||actions.find(a=>names[a.key]?.test(word));
}
let pendingPage = null;
let navigating = false;

async function changePage(next,continueReading=false){
 if($('readerView').inert||!activeBook||next<0||next>=activeBook.pages.length)return;
 if(next===pageIndex&&!navigating)return;
 pendingPage={next,continueReading};
 if(navigating)return;
 const book=activeBook;
 let readNext=false;
 navigating=true;
 try{
  while(pendingPage&&activeBook===book&&!$('readerView').inert){
   if(stage?.busy){if(document.hidden&&!stage.preparing)stage.completeMotion();await stage.whenReady();}
   if(!pendingPage||activeBook!==book||$('readerView').inert)break;
   const request=pendingPage;pendingPage=null;
   if(request.next===pageIndex){readNext=request.continueReading;continue;}
   const forward=request.next>pageIndex;
   const adjacent=Math.abs(request.next-pageIndex)===1;
   stopSpeech();
   stageTurn={turn:adjacent,forward};
   pageIndex=request.next;
   await renderPage();
   readNext=request.continueReading;
  }
 }finally{navigating=false;}
 if(readNext&&activeBook===book&&!$('readerView').inert)startSpeech();
}

function stepPage(direction){
 changePage((pendingPage?.next??pageIndex)+direction);
}
async function closeReader(){if(!activeBook||$('readerView').inert)return;pendingPage=null;stopSpeech();atmosphere.effect('lift',{direction:-1});const version=++openVersion;$('readerView').inert=true;await stage?.close();if(version!==openVersion)return;activeBook=null;loadVoices();document.body.dataset.view='shelf';stage?.showShelf();$('readerView').hidden=true;$('readerView').inert=false;$('shelfView').hidden=false;document.querySelector('.topbar').hidden=false;document.body.style.overflow='';document.title='故事彗星 · 我的小小故事书房';const id=stage?.bookId;renderShelf();const entry=shelfEntries.findIndex(b=>b.id===id);if(entry>=0){setShelfPage(Math.floor(entry/3));document.querySelector(`.shelf-book-card[data-book-id="${id}"] .shelf-select`)?.focus({preventScroll:true});}}
function loadVoices(){
 voices=(synth?.getVoices()||[]).filter(v=>v.localService);const sel=$('voiceSelect');sel.replaceChildren();
 if(currentSpeechEngine()==='ai'){for(const [value,label]of [['Serena','Serena · 平稳中文女声'],['Uncle_Fu','Uncle Fu · 平稳中文男声']]){const option=document.createElement('option');option.value=value;option.textContent=label;sel.append(option);}sel.value=settings.narratorVoice;return;}
 const auto=document.createElement('option');auto.value='';auto.textContent='自动选择本机声音';sel.append(auto);voices.sort((a,b)=>Number(b.lang.startsWith('zh'))-Number(a.lang.startsWith('zh'))||a.lang.localeCompare(b.lang));voices.forEach(v=>{const option=document.createElement('option');option.value=v.voiceURI;option.textContent=`${v.name} · ${v.lang}`;sel.append(option);});sel.value=voices.some(v=>v.voiceURI===settings.voice)?settings.voice:'';
}
function currentSpeechEngine(){return settings.speechEngine;}
function chooseVoice(lang){return voices.find(v=>v.voiceURI===settings.voice)||voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>v.lang.split('-')[0]===lang.split('-')[0])||null;}
function beginCompanionNarration(from){
 companionNarration=null;if(!['nia','fin','mice'].includes(activeBook?.theme)||!stage?.paperArt.resetNarration)return;
 const progress=sentences.slice(0,from).join('').length/Math.max(1,activeBook.pages[pageIndex].text.length);
 const token=stage.paperArt.resetNarration(progress);companionNarration={token,session:speechSession,version:openVersion,book:activeBook.id,page:pageIndex,state:stage.paperState};
}
// Some system voices emit no word boundaries. Use a smooth character-rate estimate
// only until a real boundary arrives; this is explicitly approximate Chinese timing.
function startCompanionSpeechClock(index,session){
 stopCompanionSpeechClock();if(!companionNarration||!motionEnabled())return;
 const length=sentences[index].length,before=sentences.slice(0,index).join('').length,total=Math.max(1,activeBook.pages[pageIndex].text.length);
 const clock={index,session,length,before,total,elapsed:0,last:performance.now(),native:false,timer:null,context:companionNarration};
 clock.timer=setInterval(()=>{const now=performance.now(),dt=Math.max(0,(now-clock.last)/1000);clock.last=now;
   if(clock.session!==speechSession||clock.context!==companionNarration){stopCompanionSpeechClock();return;}if(paused||!speaking)return;
   clock.elapsed+=dt;if(clock.native||clock.elapsed<.65)return;
   const rate=clock.context.charactersPerSecond||4.5*settings.rate;
   const chars=Math.min(length*.96,clock.elapsed*rate);driveCompanionNarration((before+chars)/total);
 },120);companionSpeechClock=clock;
}
function stopCompanionSpeechClock(){if(companionSpeechClock)clearInterval(companionSpeechClock.timer);companionSpeechClock=null;}
function finishCompanionSpeechClock(){const clock=companionSpeechClock;if(clock&&clock.elapsed>.3&&clock.context===companionNarration){const measured=Math.max(2,Math.min(12,clock.length/clock.elapsed));clock.context.charactersPerSecond=clock.context.charactersPerSecond?clock.context.charactersPerSecond*.65+measured*.35:measured;}stopCompanionSpeechClock();}
function driveCompanionNarration(progress){
 const cue=companionNarration;
 if(!cue||!speaking||paused||preparing||cue.session!==speechSession||cue.version!==openVersion||cue.book!==activeBook?.id||cue.page!==pageIndex||cue.state!==stage?.paperState)return;
 stage.paperArt.narrate(progress,cue.token);
}
let sentenceNodes=[],sentenceOffsets=[],activeSentence=null,activeWord=null;
let manualStoryScroll=false;
function clearSpeechHighlight(){
 activeSentence?.classList.remove('speaking','word-guided');
 activeWord?.classList.remove('word-active');activeSentence=null;activeWord=null;
}
function indexAtOffset(items,offset,startOf){
 let low=0,high=items.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(startOf(items[mid])<=offset)low=mid;else high=mid-1;}
 return low;
}
function highlightSentence(index,boundary){
 const row=sentenceNodes[index];if(!row)return;
 const charIndex=boundary?.charIndex||0,changed=activeSentence!==row.node;
 const progress=((sentenceOffsets[index]||0)+charIndex)/Math.max(1,activeBook.pages[pageIndex].text.length);
 if(speaking){
  if(['nia','fin','mice'].includes(activeBook?.theme))driveCompanionNarration(progress);
  else if(activeBook.theme==='otto'&&motionEnabled())stage?.ottoArt.narrate(progress);
  else if(activeBook.theme==='carmela'&&motionEnabled())narrateCarmela(stage,progress);
 }
 if(changed){
  activeSentence?.classList.remove('speaking','word-guided');
  activeSentence=row.node;activeSentence.classList.add('speaking');
  if(!manualStoryScroll){
   const container=$('storyText'),bounds=container.getBoundingClientRect(),line=activeSentence.getBoundingClientRect();
   if(line.top<bounds.top||line.bottom>bounds.bottom)container.scrollTop+=line.top-bounds.top-12;
  }
 }
 const word=boundary&&row.words.length?row.words[indexAtOffset(row.words,charIndex,e=>e.start)].node:null;
 activeSentence.classList.toggle('word-guided',!!word);
 if(activeWord!==word){activeWord?.classList.remove('word-active');activeWord=word;activeWord?.classList.add('word-active');}
}
function stopSpeech({finish=false}={}){stopCompanionSpeechClock();companionNarration=null;if(finish)stage?.paperArt.finishNarration?.();else stage?.paperArt.stopNarration?.();speechSession++;narrator?.stop();preparing=false;if(synth)synth.cancel();speaking=false;paused=false;currentUtterance=null;$('readerView').classList.remove('is-speaking');clearSpeechHighlight();updatePlayback();}
function updatePlayback(){
 const playing=speaking&&!paused&&!preparing;
 if(activeBook?.theme==='carmela')carmelaPlayback(stage,playing);
 const button=$('playButton');
 const state=preparing?'loading':playing?'playing':paused?'paused':'idle';
 setText($('playLabel'),preparing?'取消准备':playing?'暂停':paused?'继续朗读':'读给我听');
 if(button.dataset.playback!==state){
  button.dataset.playback=state;
  button.querySelector('[data-icon]').innerHTML=icon(preparing?'close':playing?'pause':'play');
 }
$('readerView').classList.toggle('is-speaking',playing);
 setText($('speechStatus'),preparing?'正在准备本页配音…':playing?`正在朗读第 ${pageIndex+1} 页`:paused?'已暂停':'');atmosphere.setDucking(playing);
}
function finishPage(){
 if(!activeBook)return;driveCompanionNarration(1);
 if(collectStar(activeBook.id,pageIndex))updateSouvenirs();
 if(pageIndex===activeBook.pages.length-1){activeBook.completed=true;saveProgress(activeBook);stopSpeech({finish:true});$('speechStatus').textContent='故事听完了。把一颗星星，轻轻放进你的梦里。';toast('晚安，认真听故事的你 ✦');}
 else if(settings.autoNext)changePage(pageIndex+1,true);else{stopSpeech({finish:true});$('speechStatus').textContent='这一页听完了，翻一页继续吧。';}
}
async function startSpeech(from=0){
 manualStoryScroll=false;
 const version=openVersion,session=speechSession;
 if(stage?.busy){if(document.hidden)stage.completeMotion();await stage.whenReady();if(version!==openVersion||session!==speechSession||!activeBook||$('readerView').inert)return;}
 if(currentSpeechEngine()==='system')return startSystemSpeech(from);
 if(!activeBook)return;if(!sentences.length){toast('这一页还没有文字，点羽毛图标补充后就能听。');return;}
 stopSpeech();beginCompanionNarration(from);atmosphere.start();sentenceIndex=from;
 if(settings.sleep&&!sleepDeadline)sleepDeadline=Date.now()+settings.sleep*60000;
 const text=activeBook.pages[pageIndex].text;const prefix=sentences.slice(0,from).join('').length;
 narrator.configure(settings.rate);narrator.play(text,settings.narratorVoice,prefix/Math.max(1,text.length));
}
function startSystemSpeech(from=0){
 if(!activeBook)return;
 atmosphere.start();
 if(!synth||!window.SpeechSynthesisUtterance){toast('当前浏览器不支持朗读，请使用 Chrome。');return;}
 if(!voices.length)loadVoices();
 const lang=activeBook.lang||guessLang(activeBook.pages[pageIndex].text||'');const voice=chooseVoice(lang);
 if(!voice){toast(`没有找到${lang.startsWith('zh')?'中文':'对应语言的'}本机语音。请在 Mac 系统设置的“辅助功能 → 朗读内容”中添加声音，再重新打开网页。`);return;}
 if(!sentences.length){toast('这一页没有朗读文字，可以点羽毛图标补充。');return;}
 stopSpeech();beginCompanionNarration(from);speaking=true;paused=false;sentenceIndex=from;const session=speechSession;if(settings.sleep&&!sleepDeadline)sleepDeadline=Date.now()+settings.sleep*60000;updatePlayback();
 const sayNext=()=>{
  if(session!==speechSession||!speaking||!activeBook)return;
  if(sleepDeadline&&Date.now()>=sleepDeadline){stopSpeech();atmosphere.stop();sleepDeadline=0;settings.sleep=0;saveSettings();toast('时间到了，故事休息了。晚安。');return;}
  if(sentenceIndex>=sentences.length){
   if(collectStar(activeBook.id,pageIndex))updateSouvenirs();
   const last=pageIndex===activeBook.pages.length-1;
   if(last){activeBook.completed=true;saveProgress(activeBook);stopSpeech({finish:true});$('speechStatus').textContent='这个故事听完啦。愿你今晚做一个甜甜的梦。';toast('又听完一个小世界，送你一颗星星 ✦');}
   else if(settings.autoNext)changePage(pageIndex+1,true);else{stopSpeech({finish:true});$('speechStatus').textContent='这一页听完了，翻一页继续吧。';}return;
  }
  const utteranceIndex=sentenceIndex;const utterance=new SpeechSynthesisUtterance(sentences[utteranceIndex]);currentUtterance=utterance;utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=settings.rate;utterance.pitch=1;utterance.volume=1;
  utterance.onstart=()=>{if(session===speechSession&&currentUtterance===utterance){highlightSentence(utteranceIndex);startCompanionSpeechClock(utteranceIndex,session);}};
  utterance.onboundary=e=>{if(session===speechSession&&currentUtterance===utterance){if(companionSpeechClock)companionSpeechClock.native=true;highlightSentence(utteranceIndex,e);}};
  utterance.onend=()=>{if(session!==speechSession||currentUtterance!==utterance)return;finishCompanionSpeechClock();driveCompanionNarration(sentences.slice(0,utteranceIndex+1).join('').length/Math.max(1,activeBook.pages[pageIndex].text.length));sentenceIndex=utteranceIndex+1;sayNext();};
  utterance.onerror=e=>{if(session!==speechSession||['interrupted','canceled'].includes(e.error))return;stopSpeech();toast('本机声音暂时没有播放成功，请在设置里换一个声音再试。');};
  synth.speak(utterance);
 };
 sayNext();
}
function togglePlay(){if(!activeBook)return;$('readerView').dataset.mode='listen';$('selfReadButton').setAttribute('aria-pressed','false');$('listenModeButton').classList.add('active');if(preparing){stopSpeech();return;}if(currentSpeechEngine()==='ai'){if(speaking&&!paused)narrator.pause();else if(paused)narrator.resume();else startSpeech();return;}if(speaking&&!paused){synth.pause();paused=true;updatePlayback();}else if(paused){synth.resume();paused=false;updatePlayback();}else startSpeech();}
function updateSleepLabel(){const text=sleepDeadline?`${Math.max(1,Math.ceil((sleepDeadline-Date.now())/60000))} 分钟后休息`:settings.sleep?`${settings.sleep} 分钟后休息`:'睡眠定时';if($('sleepLabel').textContent!==text)$('sleepLabel').textContent=text;}
setInterval(()=>{if(sleepDeadline&&Date.now()>=sleepDeadline){stopSpeech();atmosphere.stop();sleepDeadline=0;settings.sleep=0;saveSettings();toast('时间到了，故事休息了。晚安。');}updateSleepLabel();},1000);

function showImport(mode='files') {if(importBusy)return;importMode=mode;pendingFiles=[];$('fileInput').value='';$('selectedFiles').replaceChildren();$('dropTitle').textContent='把书拖到这里，或点一下选择';$('importError').hidden=true;$('importStatus').hidden=true;$('confirmImport').disabled=false;switchImportMode(mode);if(!$('importDialog').open)$('importDialog').showModal();}
function switchImportMode(mode){importMode=mode;$('fileTab').setAttribute('aria-pressed',String(mode==='files'));$('textTab').setAttribute('aria-pressed',String(mode==='text'));$('fileTab').classList.toggle('active',mode==='files');$('textTab').classList.toggle('active',mode==='text');$('fileImportPane').hidden=mode!=='files';$('textImportPane').hidden=mode!=='text';reveal($(mode==='files'?'fileImportPane':'textImportPane'));}
function selectFiles(files){pendingFiles=[...files];const target=$('selectedFiles');target.replaceChildren();for(const file of pendingFiles){const row=document.createElement('div');row.className='selected-file';const name=document.createElement('span');name.textContent=file.name;const size=document.createElement('small');size.textContent=formatSize(file.size);row.append(name,size);target.append(row);}$('dropTitle').textContent=pendingFiles.length?`已经选好 ${pendingFiles.length} 个文件`:'把书拖到这里，或点一下选择';$('importError').hidden=true;}
function importProgress(message,pct){$('importStatus').hidden=false;setText($('importStatusText'),message);$('importProgress').value=Math.max(0,Math.min(100,pct*100));}
async function doImport(){
 if(importBusy)return;let result;
 $('importError').hidden=true;
 if(importMode==='text'){
  const title=$('storyTitleInput').value.trim(),text=$('storyContentInput').value.trim();if(!title||!text){$('importError').textContent='先给故事起个名字，再放入故事文字吧。';$('importError').hidden=false;return;}
  result={books:[{id:crypto.randomUUID(),title,kind:'text',author:'我写的小故事',subtitle:'A STORY OF MY OWN',theme:'moon',lang:guessLang(text),pages:splitPages(text,title),page:0,favorite:false,added:Date.now()}],errors:[]};
 }else if(!pendingFiles.length){$('importError').textContent='先选一本书，或者几张绘本图片吧。';$('importError').hidden=false;return;}
 importBusy=true;importController=new AbortController();importProgress('正在导入…',0);const warnings=new Set();$('confirmImport').disabled=true;$('fileTab').disabled=true;$('textTab').disabled=true;
 try{
  if(!result)result=await importFiles(pendingFiles,{ocr:health.ocr&&$('ocrEnabled').checked,signal:importController.signal,warnings,progress:importProgress,check:()=>{if(importController.signal.aborted)throw new DOMException('已取消导入','AbortError');}});
  if(importController.signal.aborted)throw new DOMException('已取消导入','AbortError');
  if(result.books.length){await putBooks(result.books);books.push(...result.books);filter='all';$('searchInput').value='';renderShelf();$('storyTitleInput').value='';$('storyContentInput').value='';
   if(result.errors.length){$('importError').textContent=`已导入 ${result.books.length} 本，其余文件：${result.errors.join('；')}`;$('importError').hidden=false;selectFiles([]);$('importError').hidden=false;}
   else{$('importDialog').close();toast(`${result.books.length} 本新故事已经放上书架。${[...warnings].join('')}`);}
   const entry=shelfEntries.findIndex(book=>book.id===result.books[0].id);if(entry>=0)setShelfPage(Math.floor(entry/3));
  }else{$('importError').textContent=result.errors.join('；')||'没有找到可以导入的内容。';$('importError').hidden=false;}
 }catch(e){if(e.name!=='AbortError'){$('importError').textContent=e.name==='QuotaExceededError'?'本机浏览器空间不足。请先导出备份、移走较大的书，或换一个有足够空间的浏览器。':`没有导入成功：${e.message}`;$('importError').hidden=false;}}
 finally{importBusy=false;importController=null;$('confirmImport').disabled=false;$('fileTab').disabled=false;$('textTab').disabled=false;$('importStatus').hidden=true;}
}
function openSettings(){loadVoices();applySettings();$('restoreDeleted').hidden=!books.some(b=>b.deleted);$('settingsDialog').showModal();if(navigator.storage?.estimate)navigator.storage.estimate().then(s=>{$('storageNote').textContent=`本机书架约占 ${formatSize(s.usage||0)} · 请定期导出备份`;}).catch(()=>{});}
function downloadJSON(data,name){const blob=new Blob([JSON.stringify(data)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function normalizedBook(input){
 if(!input||typeof input.id!=='string'||typeof input.title!=='string'||!Array.isArray(input.pages)||!input.pages.length||input.pages.length>4000)throw new Error('备份中的书籍格式有误。');
 if(!/^[a-zA-Z0-9-]{1,80}$/.test(input.id))throw new Error('备份中的书籍编号无效。');
 const pages=input.pages.map(p=>{if(!p||typeof p.text!=='string'||p.text.length>100000)throw new Error('备份中的页面格式有误。');return{title:String(p.title||'').slice(0,120),text:p.text,image:safeImage(p.image),caption:String(p.caption||'').slice(0,180),illustration:!!p.illustration,scene:typeof p.scene==='string'?p.scene.slice(0,40):undefined,art:Number.isInteger(p.art)&&p.art>=0&&p.art<4?p.art:undefined,cue:typeof p.cue==='string'?p.cue.slice(0,100):undefined,action:['count','carry','walk','cross','knock','arrange','lamp','sleep'].includes(p.action)?p.action:undefined};});
 return{id:input.id,title:input.title.slice(0,120),author:String(input.author||'我的故事收藏').slice(0,100),subtitle:String(input.subtitle||'').slice(0,100),kind:['demo','text','pdf','epub','images','txt'].includes(input.kind)?input.kind:'text',theme:['moon','kite','ocean','prince','otto','carmela','nia','fin','mice'].includes(input.theme)?input.theme:'moon',narration:input.narration==='system'?'system':undefined,cover:safeImage(input.cover),lang:typeof input.lang==='string'?input.lang.slice(0,20):guessLang(pages[0].text),pages,page:Math.min(pages.length-1,Math.max(0,Number(input.page)||0)),favorite:!!input.favorite,completed:!!input.completed,deleted:!!input.deleted,added:Number(input.added)||Date.now(),lastRead:Number(input.lastRead)||0};
}
async function restoreBackup(file){
 if(!file)return;try{if(file.size>300*1024*1024)throw new Error('备份超过 300 MB，请分册导入。');const data=JSON.parse(await file.text());if(data.format!=='story-garden-backup'||data.version!==1||!Array.isArray(data.books))throw new Error('请选择本书房导出的 JSON 备份。');const restored=data.books.map(normalizedBook);await putBooks(restored);await deleteProgress(restored.map(b=>b.id));books=await getBooks();if(data.settings){const s=data.settings;settings.rate=Math.min(1.5,Math.max(.5,Number(s.rate)||1));settings.fontSize=Math.min(38,Math.max(20,Number(s.fontSize)||26));settings.autoNext=typeof s.autoNext==='boolean'?s.autoNext:true;settings.nickname=String(s.nickname||'小朋友').slice(0,18);settings.voice=typeof s.voice==='string'?s.voice.slice(0,250):'';settings.speechEngine=s.speechEngine==='system'?'system':'ai';settings.narratorVoice=s.narratorVoice==='Uncle_Fu'?'Uncle_Fu':'Serena';settings.narrationVersion=2;loadVoices();settings.effectsEnabled=typeof s.effectsEnabled==='boolean'?s.effectsEnabled:true;settings.effectsVolume=Math.min(1,Math.max(0,Number.isFinite(Number(s.effectsVolume))?Number(s.effectsVolume):.55));settings.musicEnabled=typeof s.musicEnabled==='boolean'?s.musicEnabled:true;settings.musicVolume=Math.min(.6,Math.max(0,Number.isFinite(Number(s.musicVolume))?Number(s.musicVolume):.3));settings.animationsEnabled=typeof s.animationsEnabled==='boolean'?s.animationsEnabled:defaults.animationsEnabled;settings.sleep=[0,10,20,30,60].includes(Number(s.sleep))?Number(s.sleep):0;sleepDeadline=0;saveSettings();}if(activeBook){const restoredActive=books.find(b=>b.id===activeBook.id&&!b.deleted);if(restoredActive){activeBook=restoredActive;pageIndex=activeBook.page;stopSpeech();$('readerBookTitle').textContent=activeBook.title;await renderPage();}else closeReader();}renderShelf();toast(`已恢复 ${restored.length} 本书和它们的阅读进度。`);}catch(e){toast(`备份没有恢复：${e.message}`);}finally{$('backupInput').value='';}
}
function showContents(){if(!activeBook)return;const list=$('contentsList');list.replaceChildren();activeBook.pages.forEach((p,i)=>{const b=document.createElement('button');b.className='contents-item'+(i===pageIndex?' active':'');const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');b.append(n,document.createTextNode(p.title||`第 ${i+1} 页`));b.onclick=()=>{$('contentsDialog').close();changePage(i);};list.append(b);});$('contentsDialog').showModal();list.querySelector('.active')?.scrollIntoView({block:'nearest'});}
let editingPage=null;
function showEditor(){
 if(!activeBook)return;
 if(navigating){toast('等纸页落稳，就可以修改文字。');return;}
 stopSpeech();pendingPage=null;
 const page=activeBook.pages[pageIndex];
 editingPage={book:activeBook,page,index:pageIndex};
 $('editTitle').value=page.title||'';$('editText').value=page.text||'';
 setText($('editStatus'),'保存后会更新本页的朗读文字。');
 $('recognizePage').disabled=!health.ocr||!safeImage(page.image)?.startsWith('data:');
 $('editDialog').showModal();
}
async function recognizeCurrentPage(){
 const editing=editingPage;if(!editing)return;
 $('recognizePage').disabled=true;setText($('editStatus'),'正在识别本页文字…');
 try{
  const text=await recognizeImage(editing.page.image);
  if(editing!==editingPage||!$('editDialog').open)return;
  $('editText').value=text;
  setText($('editStatus'),text?'已识别文字，检查后保存。':'没有识别到文字，可以手动填写。');
 }catch(error){if(editing===editingPage)setText($('editStatus'),error.message);}
 finally{if(editing===editingPage)$('recognizePage').disabled=false;}
}
async function saveEditedPage(){
 const editing=editingPage;if(!editing||!books.includes(editing.book))return;
 const {book,page,index}=editing;
 const before={title:page.title,text:page.text};
 page.title=$('editTitle').value.trim()||`第 ${index+1} 页`;
 page.text=$('editText').value.trim();
 $('savePage').disabled=true;
 try{
  if(!await persist(book)){Object.assign(page,before);return;}
  if(editing!==editingPage)return;
  $('editDialog').close();
  if(activeBook===book&&pageIndex===index)await renderPage();
  toast('本页文字已保存。');
 }finally{$('savePage').disabled=false;}
}

narrator=new Narrator({
 onState(state,message){preparing=state==='loading';speaking=['loading','playing','paused'].includes(state);paused=state==='paused';updatePlayback();if(message)setText($('speechStatus'),message);if(state==='playing'&&activeBook){const id=activeBook.id+':'+pageIndex+':'+settings.narratorVoice;if(prefetchedPage!==id){prefetchedPage=id;const next=activeBook.pages[pageIndex+1];if(next)narrator.prefetch(next.text,settings.narratorVoice);}}},
 onProgress(progress){if(!activeBook||!sentences.length||!speaking||paused||currentSpeechEngine()!=='ai')return;const target=progress*activeBook.pages[pageIndex].text.length;const index=indexAtOffset(sentenceOffsets,target,v=>v);sentenceIndex=index;highlightSentence(index,{charIndex:Math.max(0,Math.floor(target-sentenceOffsets[index])),charLength:1});},
 onEnd:finishPage,onError(message){toast(message);$('speechStatus').textContent=message;}
});
$('speechEngineSelect').onchange=e=>{stopSpeech();settings.speechEngine=e.target.value;loadVoices();saveSettings();};
$('openPrinceButton').onclick=()=>openBook('demo-otto',0);
$('importButton').onclick=()=>showImport();$('writeButton').onclick=()=>showImport('text');$('helpButton').onclick=()=>showImport();$('brand').onclick=()=>activeBook?closeReader():setFilter('all');
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>setFilter(b.dataset.filter));
$('searchButton').setAttribute('aria-controls','searchBox');$('searchButton').setAttribute('aria-expanded',String(!$('searchBox').hidden));$('searchButton').onclick=()=>{$('searchBox').hidden=!$('searchBox').hidden;$('searchButton').setAttribute('aria-expanded',String(!$('searchBox').hidden));if(!$('searchBox').hidden){reveal($('searchBox'));$('searchInput').focus();}else{$('searchInput').value='';renderShelf();}};$('searchInput').oninput=renderShelf;
$('scrollLeft').onclick=()=>setShelfPage(shelfPage-1);$('scrollRight').onclick=()=>setShelfPage(shelfPage+1);$('homeImportButton').onclick=()=>{$('allStoriesDialog').close();showImport();};
$('fileTab').onclick=()=>switchImportMode('files');$('textTab').onclick=()=>switchImportMode('text');$('fileInput').onchange=e=>selectFiles(e.target.files);$('confirmImport').onclick=doImport;
$('importDialog').addEventListener('close',()=>{if(importBusy)importController?.abort();});$('importDialog').addEventListener('cancel',()=>{if(importBusy)importController?.abort();});
$('dropzone').onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();$('fileInput').click();}};
['dragenter','dragover'].forEach(type=>$('dropzone').addEventListener(type,e=>{e.preventDefault();e.stopPropagation();$('dropzone').classList.add('drag-over');}));$('dropzone').ondragleave=()=>$('dropzone').classList.remove('drag-over');$('dropzone').ondrop=e=>{e.preventDefault();e.stopPropagation();$('dropzone').classList.remove('drag-over');selectFiles(e.dataTransfer.files);};
let sliderSaveTimer;
function updateSlider(key,value){settings[key]=value;applySettings();clearTimeout(sliderSaveTimer);sliderSaveTimer=setTimeout(()=>{sliderSaveTimer=null;persistSettings();},200);}
let dragDepth=0;document.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types.includes('Files')||document.querySelector('dialog[open]'))return;e.preventDefault();dragDepth++;$('dropOverlay').hidden=false;});document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});document.addEventListener('dragleave',e=>{if(e.dataTransfer?.types.includes('Files')){dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('dropOverlay').hidden=true;}});document.addEventListener('drop',e=>{if(!e.dataTransfer?.files.length)return;e.preventDefault();dragDepth=0;$('dropOverlay').hidden=true;if(document.querySelector('dialog[open]'))return;showImport();selectFiles(e.dataTransfer.files);});
$('zoomSceneButton').onclick=()=>{const zoomed=stage?.toggleZoom();$('zoomSceneButton').setAttribute('aria-label',zoomed?'回到全景':'看近一点');$('zoomSceneButton').setAttribute('aria-pressed',String(!!zoomed));};
$('souvenirBadge').onclick=()=>{renderSouvenirs();$('souvenirsDialog').showModal();};
$('languageButton').onclick=()=>{renderLanguageOptions();$('languageDialog').showModal();};
$('allStoriesButton').onclick=()=>{$('catalogSearch').value='';renderAllStories();$('allStoriesDialog').showModal();};
$('catalogSearch').oninput=renderAllStories;
$('shelfPrinceButton').onclick=()=>openBook('demo-otto',0);$('shelfImportButton').onclick=()=>showImport();$('readerBrand').onclick=closeReader;$('readerLibrary').onclick=()=>showImport();$('readerProfile').onclick=()=>$('profileButton').click();$('selfReadButton').onclick=()=>{stopSpeech();$('readerView').dataset.mode='self';$('selfReadButton').setAttribute('aria-pressed','true');$('listenModeButton').classList.remove('active');};$('listenModeButton').onclick=()=>{$('readerView').dataset.mode='listen';$('selfReadButton').setAttribute('aria-pressed','false');$('listenModeButton').classList.add('active');togglePlay();};$('settingsButton').onclick=openSettings;$('readerSettings').onclick=openSettings;$('closeReader').onclick=closeReader;$('readerFavorite').onclick=()=>activeBook&&toggleFavorite(activeBook);$('previousPage').onclick=()=>stepPage(-1);$('nextPage').onclick=()=>stepPage(1);$('playButton').onclick=togglePlay;
for(const event of ['wheel','touchmove','pointerdown'])$('storyText').addEventListener(event,()=>{manualStoryScroll=true;},{passive:true});
$('storyText').onclick=e=>{const span=e.target.closest('[data-sentence]');if(activeBook?.theme==='otto'&&stage?.paperState&&!stage.busy){const word=e.target.closest('.story-word')?.textContent||'',action=/月亮/.test(word)?'moon':/云/.test(word)?'cloud':/气球/.test(word)?'balloon':/奥托|小熊/.test(word)?'otto':/猫头鹰/.test(word)?'owl':/星星/.test(word)?'stars':null;if(action)stage.ottoArt.interact(action,stage.time);}if(activeBook?.theme==='carmela'&&stage&&!stage.busy){const word=e.target.closest('.story-word')?.textContent||'';const action=/地图/.test(word)?'map':/小桥|木板/.test(word)?'bridge':/风铃|松果/.test(word)?'chime':/卡梅拉/.test(word)?'hen':null;if(action)interactCarmela(stage,'carmela-'+action);}if(['nia','fin','mice'].includes(activeBook?.theme)&&stage&&!stage.busy){const word=e.target.closest('.story-word')?.textContent||'';const action=companionWordAction(word);if(action){stage.paperArt.interact(action.key,stage.time);stage.start();}}if(span)startSpeech(Number(span.dataset.sentence));};$('storyText').onkeydown=e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-sentence]')){e.preventDefault();startSpeech(Number(e.target.dataset.sentence));}};
$('pictureMat').onclick=e=>{if(!motionEnabled())return;const mat=$('pictureMat');mat.classList.remove('popped');void mat.offsetWidth;mat.classList.add('popped');for(let i=0;i<7;i++){const p=document.createElement('span');p.className='sparkle-particle';p.textContent='✦';const rect=mat.getBoundingClientRect();p.style.left=(e.clientX-rect.left)+'px';p.style.top=(e.clientY-rect.top)+'px';p.style.setProperty('--dx',(Math.random()-.5)*180+'px');p.style.setProperty('--dy',-Math.random()*130-20+'px');mat.append(p);setTimeout(()=>p.remove(),1000);}};
$('rateInput').oninput=e=>{updateSlider('rate',Number(e.target.value));};$('rateInput').onchange=()=>{if(speaking&&currentSpeechEngine()==='system')startSpeech(sentenceIndex);};$('speedButton').onclick=()=>{const options=[.7,.8,.9,1,1.1,1.2];settings.rate=options[(options.indexOf(settings.rate)+1)%options.length];saveSettings();if(speaking&&currentSpeechEngine()==='system')startSpeech(sentenceIndex);};
$('fontInput').oninput=e=>{updateSlider('fontSize',Number(e.target.value));};$('voiceSelect').onchange=e=>{const wasPlaying=speaking;stopSpeech();if(currentSpeechEngine()==='ai')settings.narratorVoice=e.target.value;else settings.voice=e.target.value;saveSettings();if(wasPlaying)startSpeech(sentenceIndex);};
function toggleAuto(value){settings.autoNext=value;saveSettings();}$('autoNextInput').onchange=e=>toggleAuto(e.target.checked);$('autoNextButton').onclick=()=>toggleAuto(!settings.autoNext);
$('sleepSelect').onchange=e=>{settings.sleep=Number(e.target.value);sleepDeadline=settings.sleep?Date.now()+settings.sleep*60000:0;saveSettings();};$('sleepButton').onclick=()=>{openSettings();$('sleepSelect').focus();};
$('testVoice').onclick=async()=>{$('settingsDialog').close();if(!activeBook)await openBook('demo-little-prince',0);startSpeech();};
$('exportBackup').onclick=()=>downloadJSON({format:'story-garden-backup',version:1,created:new Date().toISOString(),books,settings},`我的故事书房-${new Date().toLocaleDateString('sv-SE')}.json`);$('restoreBackup').onclick=()=>$('backupInput').click();$('backupInput').onchange=e=>restoreBackup(e.target.files[0]);$('restoreDeleted').onclick=restoreLastDeleted;
$('contentsButton').onclick=showContents;$('readerContentsTrigger').onclick=showContents;$('editPageButton').onclick=showEditor;$('recognizePage').onclick=recognizeCurrentPage;$('savePage').onclick=saveEditedPage;$('editDialog').addEventListener('close',()=>{editingPage=null;});
$('fullscreenButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('readerView').requestFullscreen();}catch{toast('当前浏览器暂时不能全屏，请使用浏览器的全屏按钮。');}};
$('profileButton').onclick=()=>{$('nicknameInput').value=settings.nickname;$('profileDialog').showModal();};$('saveProfile').onclick=()=>{settings.nickname=$('nicknameInput').value.trim()||'小朋友';saveSettings();$('profileDialog').close();};
function toggleMusic(){if(settings.musicEnabled&&atmosphere.audio.paused){atmosphere.start();return;}settings.musicEnabled=!settings.musicEnabled;saveSettings();if(settings.musicEnabled)atmosphere.start();}
$('effectsEnabledInput').onchange=e=>{settings.effectsEnabled=e.target.checked;saveSettings();if(settings.effectsEnabled)atmosphere.effect('hover');};
$('effectsVolumeInput').oninput=e=>{updateSlider('effectsVolume',Number(e.target.value)/100);};
$('effectsVolumeInput').onchange=()=>atmosphere.effect('hover');
$('musicButton').onclick=toggleMusic;$('readerMusicButton').onclick=toggleMusic;
$('musicEnabledInput').onchange=e=>{settings.musicEnabled=e.target.checked;saveSettings();if(settings.musicEnabled)atmosphere.start();};
$('musicVolumeInput').oninput=e=>{updateSlider('musicVolume',Number(e.target.value)/100);};
$('animationsInput').onchange=e=>{settings.animationsEnabled=e.target.checked;saveSettings();};
let renameTarget=null;$('saveRename').onclick=async()=>{if(!renameTarget)return;const title=$('renameInput').value.trim();if(!title){$('renameInput').focus();return;}renameTarget.title=title;if(await persist(renameTarget)){if(activeBook?.id===renameTarget.id){$('readerBookTitle').textContent=title;document.title=`${title} · 故事彗星`;}$('renameDialog').close();renderShelf();toast('书的新名字已经记住了。');}};
document.addEventListener('keydown',e=>{if(!activeBook&&!document.querySelector('dialog[open]')&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){if(e.key==='ArrowRight'){e.preventDefault();setShelfPage(shelfPage+1);}if(e.key==='ArrowLeft'){e.preventDefault();setShelfPage(shelfPage-1);}if(e.key==='Escape'&&!$('searchBox').hidden){$('searchButton').click();}return;}if(!activeBook||$('readerView').inert||document.querySelector('dialog[open]')||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();stepPage(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepPage(-1);}if(e.code==='Space'&&e.target===document.body){e.preventDefault();togglePlay();}if(e.key==='Escape')closeReader();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(activeBook&&stage?.busy&&!stage.preparing)stage.completeMotion();stage?.pause();}else stage?.start();});window.addEventListener('pageshow',e=>{if(e.persisted&&activeBook)stage?.start();});window.addEventListener('pagehide',()=>{if(sliderSaveTimer){clearTimeout(sliderSaveTimer);persistSettings();}synth?.cancel();narrator?.stop();stage?.pause();atmosphere.stop();});if(synth)synth.addEventListener('voiceschanged',loadVoices);loadVoices();applySettings();
async function init(){
 try{db=await openDB();books=await getBooks();for(const id of ['demo-otto','nia-runaway-kite','fin-glowing-sea','demo-mice-moving-home']){const latest=demoBooks.find(b=>b.id===id),saved=books.find(b=>b.id===id);if(latest&&saved&&(saved.revision||0)<(latest.revision||0)){const progress=Object.fromEntries(['page','favorite','lastRead','completed','deleted'].filter(key=>Object.hasOwn(saved,key)).map(key=>[key,saved[key]]));Object.assign(saved,structuredClone(latest),progress);await putBooks([saved]);}}const missing=demoBooks.filter(d=>!books.some(b=>b.id===d.id)).map(b=>structuredClone(b));if(missing.length){await putBooks(missing);books.push(...missing);}refreshLang();await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));try{ensureStage().configure(motionEnabled());document.body.dataset.view='shelf';stage.showShelf();}catch(error){document.body.classList.remove('three-room','room-boot');$('roomLoading')?.remove();console.warn('Room preview unavailable',error);}const entry=new URL(location.href);if(entry.searchParams.has('book')){const requested=entry.searchParams.get('book');if(books.some(book=>book.id===requested&&!book.deleted))await openBook(requested);entry.searchParams.delete('book');history.replaceState(null,'',entry.pathname+entry.search+entry.hash);}}
 catch(e){document.body.classList.remove('three-room','room-boot');$('roomLoading')?.remove();$('bookList').innerHTML='<div class="empty-shelf"><span>☾</span><strong>书架暂时无法打开</strong><p>请允许当前浏览器保存本地数据，或退出无痕模式后重试。</p></div>';toast(e.message);$('importButton').disabled=true;$('writeButton').disabled=true;}
 if(!STATIC_PREVIEW){try{const response=await fetch('/api/health');if(response.ok)health=await response.json();}catch{}}
 $('ocrEnabled').disabled=!health.ocr;$('ocrEnabled').checked=!!health.ocr;$('ocrHint').textContent=health.ocr?'识别在这台 Mac 上完成，书页不会发送到外部网站':STATIC_PREVIEW?'在线预览可导入图片；请手动填写朗读文字，自动识别需使用本地书房。':'本机识别暂不可用；图片导入后可手动补充朗读文字';
}
await init();
