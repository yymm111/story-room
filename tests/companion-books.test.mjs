import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {niaBook,finBook} from '../companion-books.js';
import {demoBooks} from '../stories.js';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {pinsFor,collectPin,collectedPins,collectStar,totals}=await import('../souvenirs.js');
for(const book of [niaBook,finBook]){
 assert.equal(book.pages.length,10);
 assert.equal(book.narration,'ai');
 assert.equal(new Set(book.pages.map(p=>p.scene)).size,10);
 assert.equal(demoBooks.filter(b=>b.id===book.id).length,1);
 for(const p of book.pages){assert.ok(p.title&&p.text&&p.caption);assert.ok(existsSync(fileURLToPath(new URL('../'+p.image,import.meta.url))));}
 assert.ok(existsSync(fileURLToPath(new URL('../'+book.cover,import.meta.url))));
 assert.ok(pinsFor(book.id).length>=3);
 const pin=pinsFor(book.id)[0];assert.ok(collectPin(book.id,pin.id));assert.equal(collectPin(book.id,pin.id),null);assert.equal(collectedPins(book.id).length,1);
 assert.equal(collectStar(book.id,0),true);assert.equal(collectStar(book.id,0),false);
}
assert.equal(totals([niaBook,finBook]).starMax,20);
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.ok(!app.includes('shelfPreviews'));
assert.ok(app.includes('currentSpeechEngine()'));assert.ok(app.includes('paperArt.actions({includeVerbs:true})'));
console.log('PASS: 20 pages, unique catalog entries, local images, narration routing and souvenir deduplication.');
