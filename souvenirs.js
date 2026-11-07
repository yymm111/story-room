const KEY='story-garden-souvenirs';
export const PIN_MANIFESTS={
 'demo-carmela':[{id:'map',icon:'🗺️',zh:'冒险地图',en:'Adventure map'},{id:'bridge',icon:'🌉',zh:'合作小桥',en:'Friendship bridge'},{id:'chime',icon:'🔔',zh:'松果风铃',en:'Pine-cone chime'}],
 'demo-otto':[
  {id:'owl',icon:'🦉',zh:'猫头鹰',en:'Owl'},
  {id:'cat',icon:'🐱',zh:'小猫',en:'Cat'},
  {id:'moon',icon:'🌙',zh:'月亮',en:'Moon'},
  {id:'balloon',icon:'🎈',zh:'红气球',en:'Balloon'},
  {id:'stars',icon:'⭐',zh:'星星小路',en:'Star path'}],
 'demo-little-prince':[
  {id:'rose',icon:'🌹',zh:'玫瑰',en:'Rose'},
  {id:'fox',icon:'🦊',zh:'小狐狸',en:'Fox'},
  {id:'well',icon:'🪣',zh:'水井',en:'Well'},
  {id:'plane',icon:'✈️',zh:'小飞机',en:'Plane'},
  {id:'prince',icon:'🤴',zh:'小王子',en:'Prince'}],
 'demo-moon':[{id:'prince',icon:'🐰',zh:'小兔子',en:'Bunny'}],
 'demo-kite':[{id:'fox',icon:'🦊',zh:'小狐狸',en:'Fox'}]
};
let state={stars:{},pins:{}};
try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');if(raw&&typeof raw==='object')state={stars:raw.stars||{},pins:raw.pins||{}};}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
export function pinsFor(bookId){return PIN_MANIFESTS[bookId]||[];}
export function collectedPins(bookId){return state.pins[bookId]||[];}
export function collectedStars(bookId){return state.stars[bookId]||[];}
export function hasPin(bookId,pinId){return collectedPins(bookId).includes(pinId);}
export function collectPin(bookId,pinId){
 if(!pinsFor(bookId).some(p=>p.id===pinId)||hasPin(bookId,pinId))return null;
 (state.pins[bookId]||(state.pins[bookId]=[])).push(pinId);save();
 return pinsFor(bookId).find(p=>p.id===pinId);
}
export function collectStar(bookId,pageIndex){
 const list=state.stars[bookId]||(state.stars[bookId]=[]);
 if(list.includes(pageIndex))return false;
 list.push(pageIndex);save();return true;
}
export function totals(books){
 let stars=0,starMax=0,pins=0,pinMax=0;
 for(const book of books){
  if(book.deleted)continue;
  stars+=collectedStars(book.id).length;starMax+=book.pages?.length||0;
  const manifest=pinsFor(book.id);pins+=collectedPins(book.id).length;pinMax+=manifest.length;
 }
 return {stars,starMax,pins,pinMax};
}