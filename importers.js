const MAX_FILE=80*1024*1024;
const raster=/^image\/(?:png|jpe?g|webp|gif|avif)$/i;
let pdfModule;
export function splitPages(text, title='', limit=240) {
  text=text.replace(/\r\n?/g,'\n').replace(/\u0000/g,'').trim();
  const pages=[]; let current='',heading=title;
  const flush=()=>{if(current.trim()){pages.push({title:heading,text:current.trim()});current='';}};
  for(const para of text.split(/\n\s*\n|\n(?=第[一二三四五六七八九十百千万\d]+[章节回卷部])|\n(?=chapter\s+\w+)/i)){
    const line=para.trim();if(!line)continue;
    if(/^(?:第[一二三四五六七八九十百千万\d]+[章节回卷部].{0,40}|chapter\s+\w+.{0,60})$/i.test(line)){flush();heading=line;continue;}
    const parts=line.match(/[^。！？!?\n]+[。！？!?]*|\n/g)||[line];
    for(let part of parts){
      while(part.length>limit*1.7){if(current.length>limit/2)flush();const cut=part.lastIndexOf(' ',limit)>limit/2?part.lastIndexOf(' ',limit):limit;current+=part.slice(0,cut);flush();part=part.slice(cut);}
      if(current.length+part.length>limit&&current.length>limit*.4)flush();
      current+=part;
    }
    if(current&&!current.endsWith('\n'))current+='\n';
  }
  flush();return pages;
}
export function guessLang(text){return /[\u3400-\u9fff]/.test(text)?'zh-CN':'en-US';}
function basename(name){return name.replace(/\.[^.]+$/,'');}
function assertSize(file){if(file.size>MAX_FILE)throw new Error(`《${file.name}》超过 80 MB，请先缩小文件。`);}
function baseBook(title,kind){return {id:crypto.randomUUID(),title,author:'我的故事收藏',subtitle:'A STORY OF MY OWN',kind,theme:['moon','kite','ocean'][Math.floor(Math.random()*3)],added:Date.now(),page:0,favorite:false};}
function canvasDataURL(canvas,type,quality){
  if(!canvas.convertToBlob)return Promise.resolve(canvas.toDataURL(type,quality));
  return canvas.convertToBlob({type,quality}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);}));
}
export async function imageData(file,max=1800){
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvasDataURL(canvas,'image/jpeg',.87);
  }finally{URL.revokeObjectURL(url);}
}
export async function recognizeImage(image,signal){
  const blob=await (await fetch(image)).blob();
  const res=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':blob.type},body:blob,signal});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'本机文字识别暂时不可用');return data.text||'';
}
async function importText(file){
  const buffer=await file.arrayBuffer();let text=new TextDecoder('utf-8').decode(buffer);
  if((text.match(/\ufffd/g)||[]).length>2)text=new TextDecoder('gb18030').decode(buffer);
  const book=baseBook(basename(file.name),'txt');book.pages=splitPages(text,book.title);book.lang=guessLang(text);
  if(!book.pages.length)throw new Error('这本书里还没有文字。');return book;
}
async function getPdf(){
  if(!pdfModule){pdfModule=await import('./vendor/pdfjs-dist/build/pdf.mjs');pdfModule.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs-dist/build/pdf.worker.mjs',import.meta.url).href;}
  return pdfModule;
}
async function importPdf(file,opts){
  const pdfjs=await getPdf();const prefix=new URL('./vendor/pdfjs-dist/',import.meta.url).href;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:prefix+'cmaps/',cMapPacked:true,standardFontDataUrl:prefix+'standard_fonts/',wasmUrl:prefix+'wasm/',isEvalSupported:false});
  let doc;
  try{
    doc=await task.promise;
    if(doc.numPages>500)throw new Error('这本 PDF 超过 500 页，请分卷导入。');
    const book=baseBook(basename(file.name),'pdf');book.pages=[];
    try{const metadata=await doc.getMetadata();if(metadata.info?.Title&&metadata.info.Title!=='Untitled')book.title=metadata.info.Title;}catch{}
    for(let i=1;i<=doc.numPages;i++){
      opts.check();opts.progress(`正在翻开《${book.title}》· 第 ${i} / ${doc.numPages} 页`,(i-1)/doc.numPages);
      const page=await doc.getPage(i);const original=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(2,1600/Math.max(original.width,original.height))});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;
      const image=await canvasDataURL(canvas,'image/jpeg',.85);canvas.width=canvas.height=1;
      const content=await page.getTextContent();
      let text=content.items.filter(item=>'str'in item).map(item=>item.str+(item.hasEOL?'\n':' ')).join('').replace(/([\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g,'$1').replace(/[ \t]+\n/g,'\n').trim();
      if(!text&&opts.ocr){opts.progress(`正在本机识别文字 · 第 ${i} / ${doc.numPages} 页`,(i-1)/doc.numPages);try{text=await recognizeImage(image,opts.signal);}catch(e){if(e.name==='AbortError')throw e;opts.warnings.add('有些扫描页未能识别文字，可以打开后点“修改文字”补充。');}}
      book.pages.push({title:`第 ${i} 页`,text,image,sourcePage:i});page.cleanup();
    }
    book.cover=book.pages[0]?.image;book.lang=guessLang(book.pages.slice(0,10).map(p=>p.text).join(''));return book;
  }catch(e){if(e.name==='PasswordException')throw new Error('这本 PDF 有密码保护，请先在本机解锁后再导入。');throw e;}
  finally{await task.destroy();}
}
function xml(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('这本 EPUB 的目录或章节格式有误，请尝试重新导出。');return doc;}
function tags(node,name){return [...node.getElementsByTagNameNS('*',name)];}
function zipPath(base,href){if(!href||/^(?:https?:|javascript:|data:|\/\/)/i.test(href))return null;try{return decodeURIComponent(new URL(href,'https://epub.local/'+base).pathname.slice(1));}catch{return null;}}
async function getZip(){
  if(!window.JSZip)await import('./vendor/jszip/dist/jszip.min.js');
  return window.JSZip;
}
async function importEpub(file,opts){
  const JSZip=await getZip();
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  if(Object.keys(zip.files).length>6000)throw new Error('这本 EPUB 的文件数量过多，请分卷导入。');
  const container=zip.file('META-INF/container.xml');if(!container)throw new Error('文件缺少 EPUB 目录，请确认它是有效的 EPUB。');
  const rootfile=tags(xml(await container.async('string')),'rootfile')[0]?.getAttribute('full-path');
  if(!rootfile||!zip.file(rootfile))throw new Error('无法找到 EPUB 的书籍目录。');
  const opf=xml(await zip.file(rootfile).async('string'));const book=baseBook(tags(opf,'title')[0]?.textContent?.trim()||basename(file.name),'epub');
  book.author=tags(opf,'creator')[0]?.textContent?.trim()||'我的故事收藏';book.lang=tags(opf,'language')[0]?.textContent?.trim()||'';
  const manifest=new Map(tags(opf,'item').map(n=>[n.getAttribute('id'),{path:zipPath(rootfile,n.getAttribute('href')),mime:n.getAttribute('media-type'),properties:n.getAttribute('properties')||''}]));
  const images=new Map();
  const readImage=async path=>{
    if(!path)return null;if(images.has(path))return images.get(path);
    const entry=[...manifest.values()].find(m=>m.path===path);let mime=entry?.mime||({'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','webp':'image/webp','gif':'image/gif','avif':'image/avif'})[path.split('.').pop().toLowerCase()];
    const z=zip.file(path);if(!z||!raster.test(mime||''))return null;
    const bytes=await z.async('uint8array');if(bytes.length>20*1024*1024)return null;
    const image=await imageData(new Blob([bytes],{type:mime}));images.set(path,image);return image;
  };
  const coverId=tags(opf,'meta').find(m=>m.getAttribute('name')==='cover')?.getAttribute('content');
  const coverItem=[...manifest.values()].find(m=>m.properties.split(/\s+/).includes('cover-image'))||manifest.get(coverId);
  if(coverItem)book.cover=await readImage(coverItem.path);
  const spine=tags(opf,'itemref').map(n=>manifest.get(n.getAttribute('idref'))).filter(Boolean);book.pages=[];
  for(let i=0;i<spine.length;i++){
    opts.check();const item=spine[i];if(!item.path||!zip.file(item.path)||item.properties.includes('nav'))continue;
    opts.progress(`正在整理《${book.title}》· 章节 ${i+1} / ${spine.length}`,i/spine.length);
    const chapter=xml(await zip.file(item.path).async('string'));tags(chapter,'script').forEach(n=>n.remove());tags(chapter,'style').forEach(n=>n.remove());
    const body=tags(chapter,'body')[0];if(!body)continue;
    const heading=[...body.querySelectorAll('h1,h2,h3')][0]?.textContent?.trim()||book.title;
    const chapterPages=[];let text='',image=null;
    const flush=()=>{if(!text.trim()&&!image)return;const pieces=splitPages(text,heading);if(!pieces.length)pieces.push({title:heading,text:''});pieces.forEach((p,j)=>chapterPages.push({...p,image:j===0?image:null}));text='';image=null;};
    const visit=async n=>{
      if(n.nodeType===3){text+=n.textContent;return;}if(n.nodeType!==1)return;
      const name=n.localName.toLowerCase();if(['script','style','nav','head','svg'].includes(name)){if(name==='svg'){for(const im of tags(n,'image')){const href=im.getAttribute('href')||im.getAttribute('xlink:href');const img=await readImage(zipPath(item.path,href));if(img){if(image)flush();image=img;}}}return;}
      if(['h1','h2','h3'].includes(name)){text+='\n\n';return;}
      if(name==='img'){const img=await readImage(zipPath(item.path,n.getAttribute('src')));if(img){if(image)flush();image=img;}return;}
      for(const child of n.childNodes)await visit(child);
      if(['p','div','br','li','section'].includes(name))text+='\n';
    };
    await visit(body);flush();
    for(const p of chapterPages){if(!p.text&&p.image&&opts.ocr){try{p.text=await recognizeImage(p.image,opts.signal);}catch(e){if(e.name==='AbortError')throw e;opts.warnings.add('有些图片页未能识别文字，可以在阅读器中补充。');}}book.pages.push(p);}
    if(book.pages.length>4000)throw new Error('这本 EPUB 过长，请分卷导入。');
  }
  if(!book.pages.length)throw new Error('没有找到可阅读的 EPUB 页面；加密或 DRM 书籍请先用原阅读器导出。');
  book.cover||=book.pages.find(p=>p.image)?.image;book.lang||=guessLang(book.pages.slice(0,5).map(p=>p.text).join(''));return book;
}
export async function importFiles(files,opts){
  const books=[],errors=[];const images=[];files.forEach(assertSize);
  for(const file of files){
    opts.check();if(/\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)){images.push(file);continue;}
    try{opts.progress(`正在打开《${basename(file.name)}》`,0);let book;
      if(/\.epub$/i.test(file.name))book=await importEpub(file,opts);
      else if(/\.pdf$/i.test(file.name))book=await importPdf(file,opts);
      else if(/\.(txt|md)$/i.test(file.name))book=await importText(file);
      else throw new Error('暂不支持这个格式，请使用 EPUB、PDF、TXT 或图片。');
      books.push(book);
    }catch(e){if(e.name==='AbortError')throw e;errors.push(`${file.name}：${e.message}`);}
  }
  if(images.length){
    if(images.length>150)errors.push('一次最多导入 150 张图片，请分册导入。');
    else{
      const ordered=images.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN',{numeric:true}));const book=baseBook(images.length===1?basename(images[0].name):'我的图片绘本','images');book.pages=[];
      for(let i=0;i<ordered.length;i++){
        opts.check();opts.progress(`正在制作图片绘本 · 第 ${i+1} / ${ordered.length} 页`,i/ordered.length);
        try{const image=await imageData(ordered[i]);let text='';if(opts.ocr){try{text=await recognizeImage(image,opts.signal);}catch(e){if(e.name==='AbortError')throw e;opts.warnings.add('图片文字识别未完成，可在阅读器中补充文字。');}}book.pages.push({title:basename(ordered[i].name),text,image});}
        catch(e){if(e.name==='AbortError')throw e;errors.push(`${ordered[i].name}：${e.message}`);}
      }
      if(book.pages.length){book.cover=book.pages[0].image;book.lang=guessLang(book.pages.map(p=>p.text).join(''));books.push(book);}
    }
  }
  return {books,errors};
}
