const DICT={
 zh:{
  'shelf.browse':'全部故事 ↗','catalog.search':'找找书名…','catalog.empty':'没有找到故事，换个名字试试。','catalog.preview':'封面预览 · 故事待制作','catalog.finished':'已经读完 ✦ 再读一次','catalog.continue':'继续阅读','catalog.read':'开始阅读','shelf.pages':'页 · 开始阅读','shelf.noFavorites':'还没有心爱的故事，在阅读时点一下爱心吧。','shelf.noImports':'把喜欢的绘本导入，放上自己的书架。','shelf.noRecent':'还没开始阅读，选一本故事试试吧。','shelf.reset':'看看全部故事',
  'nav.shelf':'我的书架','nav.favorite':'心爱的故事','header.import':'导入绘本','header.search':'找一本书','header.settings':'设置','header.profile':'给书房起个名字',
  'shelf.pick':'选一本故事书','shelf.all':'全部故事','shelf.imported':'我导入的','shelf.recent':'最近读过','shelf.hint':'点一本书，故事就开始了',
  'reader.close':'收起书本','reader.listen':'读给我听','reader.self':'我来读','reader.contents':'目录','reader.import':'导入我的书','reader.zoom':'看近一点','reader.fullscreen':'全屏阅读',
  'settings.title':'让故事更合心意','settings.voice':'讲述方式','settings.speed':'讲故事的速度','settings.font':'文字大小','settings.autonext':'这一页读完，自动翻到下一页','settings.ambience':'让故事有一点魔法',
  'souvenirs.title':'我的纪念品','souvenirs.desc':'读完每一页收获星星，在故事里找到藏起来的小物件。','souvenirs.stars':'星星','souvenirs.pins':'收集物','souvenirs.empty':'还没有纪念品，去故事里找找吧。','souvenirs.hiding':'还藏在故事里',
  'lang.title':'语言','learn.books':'Learn books','allstories.title':'全部故事','allstories.desc':'书架上的每一个故事。',
  'import.title':'把喜欢的书带进来','contents.title':'故事的每一页','edit.title':'这一页，讲什么呢？','profile.title':'这是谁的小书房？','rename.title':'给这本书起个名字'
 },
 en:{
  'shelf.browse':'All stories ↗','catalog.search':'Find a story…','catalog.empty':'No stories found. Try another title.','catalog.preview':'Cover preview · Story coming soon','catalog.finished':'Finished ✦ Read again','catalog.continue':'Continue reading','catalog.read':'Start reading','shelf.pages':'pages · Start reading','shelf.noFavorites':'No favorites yet. Tap the heart while reading.','shelf.noImports':'Import a book to make this shelf your own.','shelf.noRecent':'Your first adventure is waiting. Pick a story!','shelf.reset':'See all stories',
  'nav.shelf':'My shelf','nav.favorite':'Favorites','header.import':'Import book','header.search':'Find a book','header.settings':'Settings','header.profile':'Name your room',
  'shelf.pick':'Pick a book','shelf.all':'All stories','shelf.imported':'Imported','shelf.recent':'Recent','shelf.hint':'Tap a book to begin',
  'reader.close':'Close book','reader.listen':'Read to me','reader.self':"I'll read",'reader.contents':'Contents','reader.import':'Import my book','reader.zoom':'Zoom in','reader.fullscreen':'Fullscreen',
  'settings.title':'Make it yours','settings.voice':'Narration','settings.speed':'Reading speed','settings.font':'Text size','settings.autonext':'Turn the page automatically','settings.ambience':'A little magic',
  'souvenirs.title':'My souvenirs','souvenirs.desc':'Earn a star for each page you finish, and find the little treasures hiding in the stories.','souvenirs.stars':'Stars','souvenirs.pins':'Pins','souvenirs.empty':'No souvenirs yet — explore the stories!','souvenirs.hiding':'Still hiding in the story',
  'lang.title':'Language','learn.books':'Learn books','allstories.title':'All stories','allstories.desc':'Every story on your shelf.',
  'import.title':'Bring a story you love','contents.title':'Every page','edit.title':'What happens on this page?','profile.title':'Whose little room is this?','rename.title':'Name this book'
 }
};
const KEY='story-garden-lang';
let lang='zh';
try{const saved=localStorage.getItem(KEY);if(saved&&DICT[saved])lang=saved;}catch{}
export const LANGS=[{id:'zh',label:'中文'},{id:'en',label:'English'}];
export function getLang(){return lang;}
export function t(key){return DICT[lang][key]??DICT.zh[key]??key;}
export function applyI18n(root=document){
 root.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
 root.querySelectorAll('[data-i18n-title]').forEach(el=>{const v=t(el.dataset.i18nTitle);el.title=v;el.setAttribute('aria-label',v);});
 root.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder);});
 document.documentElement.lang=lang==='zh'?'zh-CN':'en';
}
export function setLang(next){
 lang=DICT[next]?next:'zh';
 try{localStorage.setItem(KEY,lang);}catch{}
 applyI18n();
 return lang;
}