import assert from 'node:assert/strict';
import {Atmosphere} from '../atmosphere.js';
globalThis.document={hidden:false};
const methods=['quack','baa','caw','whale','giggle','boing','snap'];const calls=[];
const host={unlockEffects(){},effectsEnabled:true,effectsVolume:1,effects:{state:'running'},previewing:false,sound:Object.fromEntries(methods.map(name=>[name,(...args)=>calls.push([name,args])]))};
for(const name of methods){assert.equal(Atmosphere.prototype.sceneSound.call(host,name,[2,.4]),true);assert.deepEqual(calls.at(-1),[name,[2,.4]]);}
host.effectsEnabled=false;assert.equal(Atmosphere.prototype.sceneSound.call(host,'whale'),false);assert.equal(calls.length,7);
host.effectsEnabled=true;document.hidden=true;assert.equal(Atmosphere.prototype.sceneSound.call(host,'whale'),false);assert.equal(calls.length,7);
console.log('PASS 7 companion sound routes, original argument forwarding, mute and hidden-page guards. No audio output verification.');
